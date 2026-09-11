const prisma = {};
import { withAuth, errorResponse, successResponse, comparePassword, hashPassword } from '@/lib/auth-helpers';
import { z } from 'zod';

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Kata sandi lama wajib diisi.'),
  newPassword: z.string().min(6, 'Kata sandi baru minimal 6 karakter.'),
});

export const POST = withAuth(async (request, context, user) => {
  try {
    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0].message, 'VALIDATION_ERROR', 422);
    }
    const { oldPassword, newPassword } = parsed.data;

    // Fetch user
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) {
      return errorResponse('Pengguna tidak ditemukan.', 'NOT_FOUND', 404);
    }

    // Verify old password
    const isMatch = await comparePassword(oldPassword, dbUser.password_hash);
    if (!isMatch) {
      return errorResponse('Kata sandi lama salah.', 'FORBIDDEN', 403);
    }

    // Hash new password
    const newHash = await hashPassword(newPassword);

    // Update password hash
    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash: newHash },
    });

    return successResponse({ message: 'Kata sandi berhasil diubah.' });
  } catch (error) {
    console.error('[POST /api/v1/auth/change-password]', error);
    return errorResponse('Gagal mengubah kata sandi.', 'SERVER_ERROR', 500);
  }
});
