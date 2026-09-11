// GET    /api/v1/products/[id]  — detail produk
// PUT    /api/v1/products/[id]  — update produk
// DELETE /api/v1/products/[id]  — soft-delete produk
const prisma = {};
import { withAuth, errorResponse, successResponse } from '@/lib/auth-helpers';
import { formatProduct } from '@/lib/calculations';
import { productSchema } from '@/lib/validation';
import { logActivity } from '@/lib/audit';

export const GET = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({ where: { id, is_deleted: false } });
    if (!product) return errorResponse('Produk tidak ditemukan.', 'NOT_FOUND', 404);
    return successResponse(formatProduct(product));
  } catch (error) {
    console.error('[GET /products/:id]', error);
    return errorResponse('Gagal memuat data produk.', 'SERVER_ERROR', 500);
  }
});

export const PUT = withAuth(async (request, { params }, user) => {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = productSchema.partial().safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0].message, 'VALIDATION_ERROR', 422, parsed.error.format());
    }
    const { nama, harga_modal, harga_base, tipe } = parsed.data;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) {
      return errorResponse('Produk tidak ditemukan.', 'NOT_FOUND', 404);
    }

    const updateData = {};
    if (nama !== undefined) updateData.nama = nama.trim();
    if (tipe !== undefined) updateData.tipe = tipe;
    if (harga_modal !== undefined) updateData.harga_modal = harga_modal;
    if (harga_base !== undefined) updateData.harga_base = harga_base;

    const updated = await prisma.product.update({ where: { id }, data: updateData });

    await logActivity(user.username, 'Ubah Produk', `Mengubah produk "${existing.nama}" (Harga Dasar: Rp${Number(existing.harga_base).toLocaleString('id-ID')} -> Rp${Number(updated.harga_base).toLocaleString('id-ID')})`);

    return successResponse(formatProduct(updated));
  } catch (error) {
    console.error('[PUT /products/:id]', error);
    return errorResponse('Gagal mengubah data produk.', 'SERVER_ERROR', 500);
  }
});

export const DELETE = withAuth(async (request, { params }, user) => {
  try {
    const { id } = await params;
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) {
      return errorResponse('Produk tidak ditemukan.', 'NOT_FOUND', 404);
    }
    await prisma.product.update({ where: { id }, data: { is_deleted: true } });

    await logActivity(user.username, 'Hapus Produk', `Menghapus produk "${existing.nama}" (${existing.tipe})`);

    return Response.json({ success: true });
  } catch (error) {
    console.error('[DELETE /products/:id]', error);
    return errorResponse('Gagal menghapus produk.', 'SERVER_ERROR', 500);
  }
});
