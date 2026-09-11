// GET  /api/v1/customers  — list semua pelanggan aktif
// POST /api/v1/customers  — tambah pelanggan baru (BOSS only)
import { withAuthSupabase, withBossOnly, errorResponse, successResponse } from '@/lib/auth-helpers';
import { logActivity } from '@/lib/audit';

export const GET = withAuthSupabase(async (request, context, { user, profile, shopId, shopIds, isAllShops, supabase }) => {
  try {
    if (!shopId && !isAllShops) return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);

    let query = supabase
      .from('customers')
      .select('*, customer_discounts(*)')
      .eq('is_deleted', false)
      .order('nama', { ascending: true });

    if (isAllShops && shopIds && shopIds.length > 0) {
      query = query.in('shop_id', shopIds);
    } else {
      query = query.eq('shop_id', shopId);
    }

    const { data: customers, error } = await query;
    if (error) throw error;

    return successResponse(customers);
  } catch (error) {
    console.error('[GET /customers]', error);
    return errorResponse('Gagal memuat daftar pelanggan.', 'SERVER_ERROR', 500);
  }
});

export const POST = withBossOnly(async (request, context, { user, profile, shopId, supabase }) => {
  try {
    const body = await request.json();
    const { nama, phone, bonus_threshold, discounts_lm, discounts_br, discounts } = body;

    if (!nama?.trim()) {
      return errorResponse('Nama pelanggan wajib diisi.', 'VALIDATION_ERROR', 422);
    }

    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);

    // Buat customer
    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .insert({
        shop_id: shopId,
        nama: nama.trim(),
        phone: phone?.trim() || null,
        bonus_threshold: parseInt(bonus_threshold || 0, 10),
      })
      .select()
      .single();

    if (custErr) throw custErr;

    // Build discount entries
    const discountEntries = [];
    (discounts_lm || []).filter(v => v >= 0 && v <= 100).forEach((pct, i) => {
      discountEntries.push({ shop_id: shopId, customer_id: customer.id, product_type: 'LM', step_order: i + 1, percentage: pct });
    });
    (discounts_br || []).filter(v => v >= 0 && v <= 100).forEach((pct, i) => {
      discountEntries.push({ shop_id: shopId, customer_id: customer.id, product_type: 'BR', step_order: i + 1, percentage: pct });
    });
    if (discounts) {
      for (const [catCode, steps] of Object.entries(discounts)) {
        const code = catCode.toUpperCase();
        // Remove duplicates from legacy fields
        discountEntries.filter(e => e.product_type !== code);
        (steps || []).filter(v => v >= 0 && v <= 100).forEach((pct, i) => {
          discountEntries.push({ shop_id: shopId, customer_id: customer.id, product_type: code, step_order: i + 1, percentage: pct });
        });
      }
    }

    if (discountEntries.length > 0) {
      const { error: discErr } = await supabase.from('customer_discounts').insert(discountEntries);
      if (discErr) throw discErr;
    }

    // Fetch full customer with discounts
    const { data: fullCustomer } = await supabase
      .from('customers')
      .select('*, customer_discounts(*)')
      .eq('id', customer.id)
      .single();

    await logActivity(supabase, shopId, profile.username || user.email, 'Tambah Pelanggan',
      `Menambahkan pelanggan "${customer.nama}" batas bonus Rp${Number(bonus_threshold || 0).toLocaleString('id-ID')}`);

    return successResponse(fullCustomer, 201);
  } catch (error) {
    console.error('[POST /customers]', error);
    return errorResponse('Gagal menambahkan pelanggan.', 'SERVER_ERROR', 500);
  }
});
