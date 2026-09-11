// DELETE /api/v1/categories/[code] — hapus kategori produk
// Hanya bisa dihapus jika tidak ada produk aktif yang menggunakan kategori ini
const prisma = {};
import { withAuth, errorResponse, successResponse } from '@/lib/auth-helpers';

export const DELETE = withAuth(async (request, { params }) => {
  try {
    const { code } = await params;

    // Cek keberadaan kategori
    const category = await prisma.productCategory.findUnique({ where: { code } });
    if (!category) {
      return errorResponse(`Kategori "${code}" tidak ditemukan.`, 'NOT_FOUND', 404);
    }

    // Cek apakah ada produk aktif yang menggunakan kategori ini
    const activeProductCount = await prisma.product.count({
      where: { tipe: code, is_deleted: false },
    });
    if (activeProductCount > 0) {
      return errorResponse(
        `Kategori "${code}" masih digunakan oleh ${activeProductCount} produk aktif. Hapus atau ubah tipe produk tersebut terlebih dahulu.`,
        'CONFLICT',
        422
      );
    }

    await prisma.productCategory.delete({ where: { code } });
    return successResponse({ message: `Kategori "${code}" berhasil dihapus.` });
  } catch (error) {
    console.error('[DELETE /categories/:code]', error);
    return errorResponse('Gagal menghapus kategori.', 'SERVER_ERROR', 500);
  }
});
