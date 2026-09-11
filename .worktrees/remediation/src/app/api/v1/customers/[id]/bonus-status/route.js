// GET /api/v1/customers/[id]/bonus-status
const prisma = {};
import { withAuth, errorResponse, successResponse } from '@/lib/auth-helpers';
import { calculateBonusStatus } from '@/lib/calculations';

export const GET = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    const customer = await prisma.customer.findUnique({ where: { id, is_deleted: false } });
    if (!customer) return errorResponse('Pelanggan tidak ditemukan.', 'NOT_FOUND', 404);

    const bonusStatus = await calculateBonusStatus(id, prisma);
    return successResponse(bonusStatus);
  } catch (error) {
    console.error('[GET /customers/:id/bonus-status]', error);
    return errorResponse('Gagal menghitung status bonus.', 'SERVER_ERROR', 500);
  }
});
