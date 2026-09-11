// POST /api/v1/admin/reset
const prisma = {};
import { withSuperAdminOnly, errorResponse, successResponse } from '@/lib/auth-helpers';
import { logActivity } from '@/lib/audit';

export const POST = withSuperAdminOnly(async (request, context, user) => {
  try {
    await prisma.$transaction([
      prisma.bonusGrant.deleteMany({}),
      prisma.transactionItem.deleteMany({}),
      prisma.transaction.deleteMany({}),
      prisma.customerDiscount.deleteMany({}),
      prisma.customer.deleteMany({}),
      prisma.product.deleteMany({}),
      prisma.productCategory.deleteMany({
        where: {
          code: {
            notIn: ['LM', 'BR']
          }
        }
      }),
      prisma.tutorialProgress.upsert({
        where: { user_id: user.id },
        update: {
          onboarding_completed: false,
          onboarding_last_step: 0,
          tutorials_completed: [],
          tutorials_in_progress: [],
        },
        create: {
          user_id: user.id,
          onboarding_completed: false,
          onboarding_last_step: 0,
          tutorials_completed: [],
          tutorials_in_progress: [],
        }
      })
    ], {
      timeout: 20000 // 20 seconds timeout to allow for Supabase network latency
    });

    await logActivity(user.username, 'Reset Data', 'Mereset seluruh data transaksi, pelanggan, barang, dan progress latihan');

    return successResponse({ message: 'Semua data berhasil direset dari awal.' });
  } catch (error) {
    console.error('[POST /api/v1/admin/reset]', error);
    return errorResponse(`Gagal mereset data sistem: ${error.message}`, 'SERVER_ERROR', 500);
  }
});
