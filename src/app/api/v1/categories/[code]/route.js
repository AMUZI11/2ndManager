// DELETE /api/v1/categories/[code] — hapus kategori
// Hanya bisa dihapus jika tidak ada produk aktif yang menggunakan kategori ini
import { withBossOnly, errorResponse, successResponse } from '@/lib/auth-helpers';

export const DELETE = withBossOnly(async (request, { params }, { user, profile, shopId, supabase }) => {
  try {
    const { code } = await params;
    const upperCode = code.toUpperCase();

    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);

    // Cek kategori ada di toko ini
    const { data: category } = await supabase
      .from('product_categories')
      .select('id, code, name')
      .eq('shop_id', shopId)
      .eq('code', upperCode)
      .single();

    if (!category) return errorResponse(`Kategori "${upperCode}" tidak ditemukan.`, 'NOT_FOUND', 404);

    // Cek produk aktif yang masih pakai kategori ini
    const { count } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('shop_id', shopId)
      .eq('tipe', upperCode)
      .eq('is_deleted', false);

    if (count > 0) {
      return errorResponse(
        `Kategori "${upperCode}" masih digunakan oleh ${count} produk aktif. Hapus atau ubah tipe produk terlebih dahulu.`,
        'CONFLICT', 422
      );
    }

    await supabase.from('product_categories').delete().eq('id', category.id);
    return successResponse({ message: `Kategori "${upperCode}" berhasil dihapus.` });
  } catch (error) {
    console.error('[DELETE /categories/:code]', error);
    return errorResponse('Gagal menghapus kategori.', 'SERVER_ERROR', 500);
  }
});
