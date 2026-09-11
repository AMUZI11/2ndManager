const prisma = {};
import { withAuth, errorResponse, successResponse } from '@/lib/auth-helpers';
import { getFiveYearsAgoDate } from '@/lib/calculations';

export const GET = withAuth(async (request) => {
  try {
    const customers = await prisma.customer.findMany({
      where: { is_deleted: false },
      select: { id: true, nama: true, bonus_threshold: true }
    });

    const fiveYearsAgo = getFiveYearsAgoDate();

    const txSums = await prisma.transaction.groupBy({
      by: ['customer_id'],
      where: {
        status: 'Lunas',
        is_bonus: false,
        tanggal: { gte: fiveYearsAgo },
      },
      _sum: {
        omzet_total: true
      }
    });

    const grantSums = await prisma.bonusGrant.groupBy({
      by: ['customer_id'],
      where: {
        granted_at: { gte: fiveYearsAgo },
      },
      _sum: {
        bonuses_granted: true
      }
    });

    const txMap = {};
    for (const item of txSums) {
      txMap[item.customer_id] = Number(item._sum.omzet_total || 0n);
    }

    const grantMap = {};
    for (const item of grantSums) {
      grantMap[item.customer_id] = Number(item._sum.bonuses_granted || 0);
    }

    const alerts = [];
    for (const c of customers) {
      const accumulator = txMap[c.id] || 0;
      const threshold = Number(c.bonus_threshold || 0n);
      const bonuses_granted = grantMap[c.id] || 0;

      const bonuses_available = threshold > 0
        ? Math.max(0, Math.floor(accumulator / threshold) - bonuses_granted)
        : 0;

      if (bonuses_available > 0) {
        alerts.push({
          customer: { id: c.id, nama: c.nama },
          available: bonuses_available
        });
      }
    }

    return successResponse(alerts);
  } catch (error) {
    console.error('[GET /customers/bonus-alerts]', error);
    return errorResponse('Gagal mengambil pengingat bonus.', 'SERVER_ERROR', 500);
  }
});
