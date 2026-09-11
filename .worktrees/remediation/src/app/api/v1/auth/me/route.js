// GET /api/v1/auth/me
import { withAuth, successResponse } from '@/lib/auth-helpers';

export const GET = withAuth(async (request, context, user) => {
  return successResponse({ id: user.id, username: user.username });
});
