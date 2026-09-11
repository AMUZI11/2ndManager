// GET    /api/v1/customers/[id]   — detail pelanggan
// PUT    /api/v1/customers/[id]   — update pelanggan (BOSS only)
// DELETE /api/v1/customers/[id]   — soft-delete pelanggan (BOSS only)
import { withAuthSupabase, withBossOnly, errorResponse, successResponse } from '@/lib/auth-helpers';
import { logActivity } from '@/lib/audit';

export const GET = withAuthSupabase(async (request, { params }, { supabase }) => {
  try {
    const { id } = await params;
    const { data: customer, error } = await supabase
      .from('customers')
      .select('*, customer_discounts(*)')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error || !customer) return errorResponse('Pelanggan tidak ditemukan.', 'NOT_FOUND', 404);
    return successResponse(customer);
  } catch (error) {
    console.error('[GET /customers/:id]', error);
    return errorResponse('Gagal memuat data pelanggan.', 'SERVER_ERROR', 500);
  }
});

export const PUT = withBossOnly(async (request, { params }, { user, profile, supabase }) => {
  try {
    const { id } = await params;
    const body = await request.json();
    const { nama, phone, bonus_threshold, discounts_lm, discounts_br, discounts } = body;

    const { data: existing } = await supabase
      .from('customers')
      .select('id, nama, bonus_threshold, shop_id')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (!existing) return errorResponse('Pelanggan tidak ditemukan.', 'NOT_FOUND', 404);

    const updateData = { updated_at: new Date().toISOString() };
    if (nama !== undefined) updateData.nama = nama.trim();
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (bonus_threshold !== undefined) updateData.bonus_threshold = parseInt(bonus_threshold, 10);

    // Update discounts
    const hasDiscountUpdate = discounts_lm !== undefined || discounts_br !== undefined || discounts !== undefined;
    if (hasDiscountUpdate) {
      const incomingMap = {};
      if (discounts && typeof discounts === 'object') {
        for (const [catCode, steps] of Object.entries(discounts)) {
          incomingMap[catCode.toUpperCase()] = (steps || []).filter(v => v >= 0 && v <= 100);
        }
      } else {
        if (discounts_lm !== undefined) incomingMap['LM'] = discounts_lm.filter(v => v >= 0 && v <= 100);
        if (discounts_br !== undefined) incomingMap['BR'] = discounts_br.filter(v => v >= 0 && v <= 100);
      }

      // Delete all existing discounts for this customer to ensure clean state
      await supabase.from('customer_discounts')
        .delete()
        .eq('customer_id', id);

      // Insert new discount rows
      const newDiscounts = [];
      for (const [code, steps] of Object.entries(incomingMap)) {
        steps.forEach((pct, i) => {
          newDiscounts.push({
            shop_id: existing.shop_id,
            customer_id: id,
            product_type: code,
            step_order: i + 1,
            percentage: pct,
          });
        });
      }
      if (newDiscounts.length > 0) {
        await supabase.from('customer_discounts').insert(newDiscounts);
      }
    }

    await supabase.from('customers').update(updateData).eq('id', id);

    const { data: updated } = await supabase
      .from('customers')
      .select('*, customer_discounts(*)')
      .eq('id', id)
      .single();

    await logActivity(supabase, existing.shop_id, profile.username || user.email, 'Ubah Pelanggan',
      `Mengubah pelanggan "${existing.nama}" batas bonus Rp${Number(existing.bonus_threshold).toLocaleString('id-ID')} → Rp${Number(bonus_threshold || existing.bonus_threshold).toLocaleString('id-ID')}`);

    return successResponse(updated);
  } catch (error) {
    console.error('[PUT /customers/:id]', error);
    return errorResponse('Gagal mengubah data pelanggan.', 'SERVER_ERROR', 500);
  }
});

export const DELETE = withBossOnly(async (request, { params }, { user, profile, supabase }) => {
  try {
    const { id } = await params;
    const { data: existing } = await supabase
      .from('customers')
      .select('id, nama, shop_id')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (!existing) return errorResponse('Pelanggan tidak ditemukan.', 'NOT_FOUND', 404);

    await supabase.from('customers').update({ is_deleted: true, updated_at: new Date().toISOString() }).eq('id', id);

    await logActivity(supabase, existing.shop_id, profile.username || user.email, 'Hapus Pelanggan',
      `Menghapus pelanggan "${existing.nama}"`);

    return successResponse({ success: true });
  } catch (error) {
    console.error('[DELETE /customers/:id]', error);
    return errorResponse('Gagal menghapus pelanggan.', 'SERVER_ERROR', 500);
  }
});
