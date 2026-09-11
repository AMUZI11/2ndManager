// POST /api/v1/products/unpack — Eksekusi Atomik Multi-Tier Auto-Unpack Kemasan Induk ke Pcs
import { withAuthSupabase, errorResponse, successResponse } from '@/lib/auth-helpers';
import { logActivity } from '@/lib/audit';

export const POST = withAuthSupabase(async (request, context, { user, profile, supabase }) => {
  try {
    const body = await request.json();
    const { product_id, required_pcs = 1 } = body;

    if (!product_id) {
      return errorResponse('ID produk wajib diisi.', 'VALIDATION_ERROR', 422);
    }

    const reqPcs = parseInt(required_pcs, 10);
    if (isNaN(reqPcs) || reqPcs <= 0) {
      return errorResponse('Jumlah pcs yang dibutuhkan harus lebih dari 0.', 'VALIDATION_ERROR', 422);
    }

    let shopId = profile.shop_id;
    if (!shopId && profile.role === 'BOSS') {
      const { data: userShop } = await supabase
        .from('user_shops')
        .select('shop_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      shopId = userShop?.shop_id;
    }

    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);

    // Verifikasi produk ada dan milik toko
    const { data: product, error: prodErr } = await supabase
      .from('products')
      .select('id, nama, shop_id, stok_saat_ini')
      .eq('id', product_id)
      .eq('shop_id', shopId)
      .eq('is_deleted', false)
      .single();

    if (prodErr || !product) {
      return errorResponse('Produk tidak ditemukan.', 'NOT_FOUND', 404);
    }

    // Panggil Stored Procedure Atomik execute_atomic_unit_unpack
    const { data: unpackResult, error: rpcErr } = await supabase.rpc('execute_atomic_unit_unpack', {
      p_product_id: product_id,
      p_required_pcs: reqPcs,
    });

    if (rpcErr) {
      console.error('[POST /products/unpack] RPC execute_atomic_unit_unpack error:', rpcErr);
      return errorResponse(`Gagal memecah satuan kemasan: ${rpcErr.message}`, 'UNPACK_ERROR', 400);
    }

    if (unpackResult?.needed_unpack) {
      await logActivity(
        supabase,
        shopId,
        profile.username || user.email,
        'Auto-Unpack Satuan',
        `Memecah ${unpackResult.unpacks_count} unit kemasan ${unpackResult.unpacked_unit_name} menjadi ${unpackResult.added_pcs} Pcs eceran produk "${product.nama}" (HPP proporsional: Rp ${unpackResult.unit_cogs}/pcs)`
      );
    }

    return successResponse({
      success: true,
      data: unpackResult,
    });
  } catch (error) {
    console.error('[POST /products/unpack]', error);
    return errorResponse(`Gagal mengeksekusi auto-unpack: ${error.message}`, 'SERVER_ERROR', 500);
  }
});
