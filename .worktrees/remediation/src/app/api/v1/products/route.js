// GET  /api/v1/products   — list semua produk
// POST /api/v1/products   — tambah produk baru
const prisma = {};
import { withAuth, errorResponse, successResponse } from '@/lib/auth-helpers';
import { formatProduct } from '@/lib/calculations';
import { productSchema } from '@/lib/validation';
import { logActivity } from '@/lib/audit';

export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const tipe = searchParams.get('tipe');

    const where = { is_deleted: false };
    if (tipe && tipe.trim()) where.tipe = tipe.trim().toUpperCase();

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '50');
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const products = await prisma.product.findMany({
      where,
      skip,
      take,
      orderBy: [{ tipe: 'asc' }, { nama: 'asc' }],
    });

    return successResponse(products.map(formatProduct));
  } catch (error) {
    console.error('[GET /products]', error);
    return errorResponse('Gagal memuat daftar produk.', 'SERVER_ERROR', 500);
  }
});

export const POST = withAuth(async (request, context, user) => {
  try {
    const body = await request.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0].message, 'VALIDATION_ERROR', 422, parsed.error.format());
    }
    const { nama, harga_modal, harga_base, tipe } = parsed.data;

    const product = await prisma.product.create({
      data: {
        nama: nama.trim(),
        harga_modal: harga_modal,
        harga_base: harga_base,
        tipe,
      },
    });

    await logActivity(user.username, 'Tambah Produk', `Menambahkan produk "${product.nama}" (${tipe}) dengan harga jual dasar Rp${Number(harga_base).toLocaleString('id-ID')}`);

    return successResponse(formatProduct(product), 201);
  } catch (error) {
    console.error('[POST /products]', error);
    return errorResponse('Gagal menambahkan produk.', 'SERVER_ERROR', 500);
  }
});
