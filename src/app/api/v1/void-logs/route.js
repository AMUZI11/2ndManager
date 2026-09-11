// POST /api/v1/void-logs — Catat pembatalan item keranjang oleh kasir
import { withAuthSupabase, errorResponse, successResponse } from '@/lib/auth-helpers';

export const POST = withAuthSupabase(async (request, context, { user, profile, supabase }) => {
  try {
    const body = await request.json();
    const { product_name, quantity } = body;

    if (!product_name || !quantity) {
      return errorResponse('Nama produk dan jumlah wajib diisi.', 'VALIDATION_ERROR', 422);
    }

    // Ambil shop_id
    let shopId = profile.shop_id;
    if (profile.role === 'BOSS') {
      const { data: userShop } = await supabase
        .from('user_shops')
        .select('shop_id')
        .eq('user_id', user.id)
        .single();
      shopId = userShop?.shop_id;
    }

    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);

    const cashierName = profile.username || user.email.split('@')[0];

    const { data: voidLog, error } = await supabase
      .from('void_logs')
      .insert({
        shop_id: shopId,
        cashier_id: user.id,
        cashier_name: cashierName,
        product_name,
        quantity: parseInt(quantity, 10),
      })
      .select()
      .single();

    if (error) throw error;

    return successResponse(voidLog, 201);
  } catch (error) {
    console.error('[POST /void-logs]', error);
    return errorResponse('Gagal mencatat log void.', 'SERVER_ERROR', 500);
  }
});

export const GET = withAuthSupabase(async (request, context, { user, profile, supabase }) => {
  try {
    let shopId = profile.shop_id;
    if (profile.role === 'BOSS') {
      const { data: userShop } = await supabase
        .from('user_shops')
        .select('shop_id')
        .eq('user_id', user.id)
        .single();
      shopId = userShop?.shop_id;
    }

    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);

    const { data: logs, error } = await supabase
      .from('void_logs')
      .select('*')
      .eq('shop_id', shopId)
      .order('voided_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    return successResponse(logs);
  } catch (error) {
    console.error('[GET /void-logs]', error);
    return errorResponse('Gagal mengambil log void.', 'SERVER_ERROR', 500);
  }
});
