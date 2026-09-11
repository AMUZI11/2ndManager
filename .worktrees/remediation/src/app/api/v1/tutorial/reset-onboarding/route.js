// POST /api/v1/tutorial/reset-onboarding
const prisma = {};
import { withAuth, errorResponse } from '@/lib/auth-helpers';

export const POST = withAuth(async (request, context, user) => {
  try {
    await prisma.tutorialProgress.update({
      where: { user_id: user.id },
      data: { onboarding_completed: false, onboarding_last_step: 0 },
    });
    return Response.json({ success: true });
  } catch (error) {
    console.error('[POST /tutorial/reset-onboarding]', error);
    return errorResponse('Gagal mereset onboarding.', 'SERVER_ERROR', 500);
  }
});
