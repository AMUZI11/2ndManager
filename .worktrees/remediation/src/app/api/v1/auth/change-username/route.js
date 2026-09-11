const prisma = {};
import { withAuth, errorResponse, successResponse } from '@/lib/auth-helpers';
import { logActivity } from '@/lib/audit';
import { z } from 'zod';

const changeUsernameSchema = z.object({
  newUsername: z.string()
    .min(3, 'Username minimal 3 karakter.')
    .max(50, 'Username maksimal 50 karakter.')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username hanya boleh berisi huruf, angka, dan underscore.')
});

export const POST = withAuth(async (request, context, user) => {
  try {
    const body = await request.json();
    const parsed = changeUsernameSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0].message, 'VALIDATION_ERROR', 422);
    }
    const { newUsername } = parsed.data;

    // Ambil detail user saat ini untuk validasi
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id }
    });

    if (!currentUser) {
      return errorResponse('Pengguna tidak ditemukan.', 'NOT_FOUND', 404);
    }

    if (currentUser.username === newUsername) {
      return errorResponse('Username baru tidak boleh sama dengan username saat ini.', 'VALIDATION_ERROR', 422);
    }

    // Periksa apakah username baru sudah digunakan oleh user lain
    const existingUser = await prisma.user.findUnique({
      where: { username: newUsername }
    });

    if (existingUser) {
      return errorResponse('Username sudah digunakan oleh pengguna lain.', 'CONFLICT', 409);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { username: newUsername }
    });

    await logActivity(currentUser.username, 'Ubah Username', `Mengubah username dari "${currentUser.username}" menjadi "${newUsername}"`);

    return successResponse({
      message: 'Username berhasil diubah.',
      username: newUsername
    });
  } catch (error) {
    console.error('[POST /api/v1/auth/change-username]', error);
    return errorResponse('Gagal mengubah username.', 'SERVER_ERROR', 500);
  }
});
