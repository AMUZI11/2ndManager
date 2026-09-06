// GET  /api/v1/suppliers  — Daftar agen / supplier kulakan
// POST /api/v1/suppliers  — Tambah agen / supplier kulakan baru
import { withAuthSupabase, errorResponse, successResponse } from '@/lib/auth-helpers';
import { normalizeIndonesianPhone } from '@/lib/phone';
import { logActivity } from '@/lib/audit';

export const GET = withAuthSupabase(async (request, { params }, { user, profile, supabase }) => {
  try {
    let shopId = profile.shop_id;
    if (profile.role === 'BOSS') {
      const { data: userShop } = await supabase
        .from('user_shops').select('shop_id').eq('user_id', user.id).single();
      shopId = userShop?.shop_id || shopId;
    }

    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NO_SHOP', 400);

    const { data: suppliers, error } = await supabase
      .from('suppliers')
      .select('*, products(id)')
      .eq('shop_id', shopId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;

    const enriched = (suppliers || []).map(s => ({
      ...s,
      product_count: (s.products || []).length,
    }));

    return successResponse(enriched);
  } catch (error) {
    console.error('[GET /suppliers]', error);
    return errorResponse('Gagal memuat daftar supplier.', 'SERVER_ERROR', 500);
  }
});

export const POST = withAuthSupabase(async (request, { params }, { user, profile, supabase }) => {
  try {
    let shopId = profile.shop_id;
    if (profile.role === 'BOSS') {
      const { data: userShop } = await supabase
        .from('user_shops').select('shop_id').eq('user_id', user.id).single();
      shopId = userShop?.shop_id || shopId;
    }

    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NO_SHOP', 400);

    const body = await request.json();
    const { name, phone, contact_person, address, lead_time_days, notes } = body;

    if (!name || !name.trim()) {
      return errorResponse('Nama supplier / agen wajib diisi.', 'VALIDATION_ERROR', 422);
    }

    const cleanPhone = normalizeIndonesianPhone(phone);
    const parsedLeadTime = Math.max(1, parseInt(lead_time_days, 10) || 1);

    const { data: newSupplier, error: insertError } = await supabase
      .from('suppliers')
      .insert({
        shop_id: shopId,
        name: name.trim(),
        phone: cleanPhone || null,
        contact_person: contact_person?.trim() || null,
        address: address?.trim() || null,
        lead_time_days: parsedLeadTime,
        notes: notes?.trim() || null,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    await logActivity({
      shopId,
      operator: profile.username || user.email,
      action: 'ADD_SUPPLIER',
      details: `Menambahkan supplier kulakan: ${name.trim()} (Lead time: ${parsedLeadTime} hari, WA: ${cleanPhone || '-'})`,
    });

    return successResponse(newSupplier, 201);
  } catch (error) {
    console.error('[POST /suppliers]', error);
    return errorResponse('Gagal menambahkan supplier.', 'SERVER_ERROR', 500);
  }
});
