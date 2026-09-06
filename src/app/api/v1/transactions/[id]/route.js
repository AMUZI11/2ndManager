// GET    /api/v1/transactions/[id]  — detail bon
// PUT    /api/v1/transactions/[id]  — edit bon (recalculate items)
// DELETE /api/v1/transactions/[id]  — hapus bon
import { withAuthSupabase, withBossOnly, errorResponse, successResponse, resolveShopId } from '@/lib/auth-helpers';
import { calculateCascadingDiscount, calculateTransactionTotals } from '@/lib/calculations';

async function getShopId(user, profile, supabase) {
  return profile.shop_id || (await resolveShopId(supabase, user, profile));
}

export const GET = withAuthSupabase(async (request, { params }, { user, profile, supabase }) => {
  try {
    const { id } = await params;
    const { data: tx, error } = await supabase
      .from('transactions')
      .select('*, transaction_items(*, products(*)), customers(*, customer_discounts(*))')
      .eq('id', id)
      .single();

    if (error || !tx) return errorResponse('Transaksi tidak ditemukan.', 'NOT_FOUND', 404);
    return successResponse(tx);
  } catch (error) {
    console.error('[GET /transactions/:id]', error);
    return errorResponse('Gagal memuat detail transaksi.', 'SERVER_ERROR', 500);
  }
});

export const PUT = withBossOnly(async (request, { params }, { user, profile, supabase }) => {
  try {
    const { id } = await params;
    const body = await request.json();
    const { nomor_bon, tanggal, customer_id, ongkir, deskripsi, is_bonus, items } = body;

    const shopId = await getShopId(user, profile, supabase);
    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);

    const { data: existing } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .eq('shop_id', shopId)
      .single();
    if (!existing) return errorResponse('Transaksi tidak ditemukan.', 'NOT_FOUND', 404);

    // Cek duplikat nomor bon jika diubah
    if (nomor_bon && nomor_bon.trim() !== existing.nomor_bon) {
      const { data: dup } = await supabase
        .from('transactions')
        .select('id')
        .eq('shop_id', shopId)
        .eq('nomor_bon', nomor_bon.trim())
        .single();
      if (dup) return errorResponse(`Nomor bon "${nomor_bon}" sudah digunakan.`, 'CONFLICT', 409);
    }

    const updateData = { updated_at: new Date().toISOString() };
    if (nomor_bon !== undefined) updateData.nomor_bon = nomor_bon.trim();
    if (tanggal !== undefined) updateData.tanggal = new Date(tanggal).toISOString().split('T')[0];
    if (customer_id !== undefined) updateData.customer_id = customer_id;
    if (deskripsi !== undefined) updateData.deskripsi = deskripsi;
    if (is_bonus !== undefined) updateData.is_bonus = is_bonus;
    if (ongkir !== undefined) updateData.ongkir = parseInt(ongkir, 10);

    // Recalculate jika items dikirim
    if (items !== undefined) {
      const effectiveCustomerId = customer_id || existing.customer_id;
      const { data: customer } = await supabase
        .from('customers')
        .select('*, customer_discounts(*)')
        .eq('id', effectiveCustomerId)
        .single();

      const discountsMap = {};
      (customer?.customer_discounts || []).forEach(d => {
        if (!discountsMap[d.product_type]) discountsMap[d.product_type] = [];
        discountsMap[d.product_type].push({ step_order: d.step_order, pct: Number(d.percentage) });
      });
      for (const code of Object.keys(discountsMap)) {
        discountsMap[code] = discountsMap[code].sort((a, b) => a.step_order - b.step_order).map(s => s.pct);
      }

      const processedItems = await Promise.all(items.map(async (item) => {
        const { data: product } = await supabase.from('products').select('*').eq('id', item.product_id).single();
        const discountSteps = discountsMap[product.tipe] || [];
        const discounted_unit_price = item.is_bonus_item ? 0 : calculateCascadingDiscount(Number(product.harga_base), discountSteps);
        return { product_id: product.id, quantity: item.quantity, product_type_snapshot: product.tipe, harga_base_snapshot: product.harga_base, harga_modal_snapshot: product.harga_modal, discounted_unit_price, is_bonus_item: item.is_bonus_item || false };
      }));

      const effectiveOngkir = ongkir !== undefined ? Number(ongkir) : Number(existing.ongkir);
      const { omzet_total, laba_total, amount_owed, items_with_calcs } = calculateTransactionTotals(processedItems, effectiveOngkir);

      updateData.omzet_total = omzet_total;
      updateData.laba_total = laba_total;
      updateData.amount_owed = amount_owed;

      // Delete old items and recreate
      await supabase.from('transaction_items').delete().eq('transaction_id', id);
      await supabase.from('transaction_items').insert(
        items_with_calcs.map(i => ({
          transaction_id: id,
          product_id: i.product_id,
          quantity: i.quantity,
          product_type_snapshot: i.product_type_snapshot,
          harga_base_snapshot: Number(i.harga_base_snapshot),
          harga_modal_snapshot: Number(i.harga_modal_snapshot),
          discounted_unit_price: i.discounted_unit_price || 0,
          line_omzet: i.line_omzet,
          line_laba: i.line_laba,
          is_bonus_item: i.is_bonus_item,
        }))
      );
    }

    await supabase.from('transactions').update(updateData).eq('id', id);

    const { data: updated } = await supabase
      .from('transactions')
      .select('*, transaction_items(*, products(*)), customers(*)')
      .eq('id', id)
      .single();

    return successResponse(updated);
  } catch (error) {
    console.error('[PUT /transactions/:id]', error);
    return errorResponse('Gagal mengubah transaksi.', 'SERVER_ERROR', 500);
  }
});

export const DELETE = withBossOnly(async (request, { params }, { user, profile, supabase }) => {
  try {
    const { id } = await params;
    const shopId = await getShopId(user, profile, supabase);

    const { data: existing } = await supabase
      .from('transactions').select('id').eq('id', id).eq('shop_id', shopId).single();
    if (!existing) return errorResponse('Transaksi tidak ditemukan.', 'NOT_FOUND', 404);

    // CASCADE delete akan hapus transaction_items otomatis
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;

    return successResponse({ success: true });
  } catch (error) {
    console.error('[DELETE /transactions/:id]', error);
    return errorResponse('Gagal menghapus transaksi.', 'SERVER_ERROR', 500);
  }
});
