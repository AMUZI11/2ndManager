// GET  /api/v1/categories   — daftar semua kategori produk
// POST /api/v1/categories   — tambah kategori produk baru
const prisma = {};
import { withAuth, errorResponse, successResponse } from '@/lib/auth-helpers';
import { z } from 'zod';

const categorySchema = z.object({
  code: z.string().min(1, 'Kode kategori wajib diisi.').max(50, 'Kode kategori maksimal 50 karakter.').transform(v => v.toUpperCase().trim()),
  name: z.string().min(1, 'Nama kategori wajib diisi.').max(100, 'Nama kategori maksimal 100 karakter.').transform(v => v.trim()),
});

export const GET = withAuth(async () => {
  try {
    const categories = await prisma.productCategory.findMany({
      orderBy: { code: 'asc' },
    });
    return successResponse(categories.map(c => ({
      code: c.code,
      name: c.name,
      created_at: c.created_at,
      updated_at: c.updated_at,
    })));
  } catch (error) {
    console.error('[GET /categories]', error);
    return errorResponse('Gagal memuat daftar kategori.', 'SERVER_ERROR', 500);
  }
});

export const POST = withAuth(async (request) => {
  try {
    const body = await request.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0].message, 'VALIDATION_ERROR', 422);
    }
    const { code, name } = parsed.data;

    // Cek duplikat kode
    const existing = await prisma.productCategory.findUnique({ where: { code } });
    if (existing) {
      return errorResponse(`Kode kategori "${code}" sudah ada.`, 'CONFLICT', 409);
    }

    const category = await prisma.productCategory.create({
      data: { code, name },
    });

    return successResponse({ code: category.code, name: category.name, created_at: category.created_at }, 201);
  } catch (error) {
    console.error('[POST /categories]', error);
    return errorResponse('Gagal menambahkan kategori.', 'SERVER_ERROR', 500);
  }
});
