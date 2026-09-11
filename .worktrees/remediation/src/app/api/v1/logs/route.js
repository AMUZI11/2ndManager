const prisma = {};
import { withAuth, errorResponse, successResponse } from '@/lib/auth-helpers';

export const GET = withAuth(async () => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { created_at: 'desc' },
      take: 100,
    });
    return successResponse(logs);
  } catch (error) {
    console.error('[GET /logs]', error);
    return errorResponse('Gagal memuat log audit.', 'SERVER_ERROR', 500);
  }
});
