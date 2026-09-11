// GET /api/v1/tutorial/progress
// PUT /api/v1/tutorial/progress
const prisma = {};
import { withAuth, errorResponse, successResponse } from '@/lib/auth-helpers';
import { tutorialProgressSchema } from '@/lib/validation';

export const GET = withAuth(async (request, context, user) => {
  try {
    const progress = await prisma.tutorialProgress.findUnique({ where: { user_id: user.id } });
    if (!progress) return errorResponse('Tutorial progress tidak ditemukan.', 'NOT_FOUND', 404);
    return successResponse(progress);
  } catch (error) {
    console.error('[GET /tutorial/progress]', error);
    return errorResponse('Gagal memuat tutorial progress.', 'SERVER_ERROR', 500);
  }
});

export const PUT = withAuth(async (request, context, user) => {
  try {
    const body = await request.json();
    const parsed = tutorialProgressSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0].message, 'VALIDATION_ERROR', 422, parsed.error.format());
    }
    const {
      onboarding_completed,
      onboarding_last_step,
      tutorial_id,
      tutorial_status,
      tutorial_last_step,
    } = parsed.data;

    const progress = await prisma.tutorialProgress.findUnique({ where: { user_id: user.id } });

    if (!progress) return errorResponse('Tutorial progress tidak ditemukan.', 'NOT_FOUND', 404);

    const updateData = {};
    if (onboarding_completed !== undefined) updateData.onboarding_completed = onboarding_completed;
    if (onboarding_last_step !== undefined) updateData.onboarding_last_step = onboarding_last_step;

    // Update tutorial individual
    if (tutorial_id) {
      let completedList = [...(progress.tutorials_completed || [])];
      let inProgressList = [...(progress.tutorials_in_progress || [])];

      if (tutorial_status === 'completed') {
        if (!completedList.includes(tutorial_id)) completedList.push(tutorial_id);
        inProgressList = inProgressList.filter(t => t.id !== tutorial_id);
      } else if (tutorial_status === 'in_progress') {
        const idx = inProgressList.findIndex(t => t.id === tutorial_id);
        if (idx >= 0) {
          inProgressList[idx] = { id: tutorial_id, last_step: tutorial_last_step || 0 };
        } else {
          inProgressList.push({ id: tutorial_id, last_step: tutorial_last_step || 0 });
        }
      }

      updateData.tutorials_completed = completedList;
      updateData.tutorials_in_progress = inProgressList;
    }

    const updated = await prisma.tutorialProgress.update({
      where: { user_id: user.id },
      data: updateData,
    });

    return successResponse(updated);
  } catch (error) {
    console.error('[PUT /tutorial/progress]', error);
    return errorResponse('Gagal menyimpan tutorial progress.', 'SERVER_ERROR', 500);
  }
});
