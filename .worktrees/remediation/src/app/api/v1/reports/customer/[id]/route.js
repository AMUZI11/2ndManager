// GET /api/v1/reports/customer/[id] — Laporan per pelanggan
const prisma = {};
import { withAuth, errorResponse, successResponse } from '@/lib/auth-helpers';
import { calculateBonusStatus, formatCustomer, getFiveYearsAgoDate } from '@/lib/calculations';

export const GET = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const customer = await prisma.customer.findUnique({
      where: { id, is_deleted: false },
      include: { discounts: true },
    });
    if (!customer) return errorResponse('Pelanggan tidak ditemukan.', 'NOT_FOUND', 404);

    const fiveYearsAgo = getFiveYearsAgoDate();

    const where = { customer_id: id };
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      const effectiveStart = startDate > fiveYearsAgo ? startDate : fiveYearsAgo;
      where.tanggal = { gte: effectiveStart, lte: endDate };
    } else {
      where.tanggal = { gte: fiveYearsAgo };
    }

    const lunasAgg = await prisma.transaction.aggregate({
      where: { ...where, status: 'Lunas', is_bonus: false },
      _sum: { omzet_total: true, laba_total: true, amount_owed: true }
    });

    const piutangAgg = await prisma.transaction.aggregate({
      where: { ...where, status: 'Piutang' },
      _sum: { amount_owed: true }
    });

    const itemsAgg = await prisma.transactionItem.groupBy({
      by: ['product_type_snapshot'],
      where: {
        transaction: { ...where, status: 'Lunas', is_bonus: false },
        is_bonus_item: false,
      },
      _sum: { line_omzet: true }
    });

    const omzet_lm = Number(itemsAgg.find(i => i.product_type_snapshot === 'LM')?._sum?.line_omzet || 0n);
    const omzet_br = Number(itemsAgg.find(i => i.product_type_snapshot === 'BR')?._sum?.line_omzet || 0n);
    const omzet_total = Number(lunasAgg._sum.omzet_total || 0n);
    const laba_total = Number(lunasAgg._sum.laba_total || 0n);
    const total_paid = Number(lunasAgg._sum.amount_owed || 0n);
    const total_piutang = Number(piutangAgg._sum.amount_owed || 0n);

    const bonusWhere = { customer_id: id };
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      const effectiveStart = startDate > fiveYearsAgo ? startDate : fiveYearsAgo;
      bonusWhere.granted_at = { gte: effectiveStart, lte: endDate };
    } else {
      bonusWhere.granted_at = { gte: fiveYearsAgo };
    }

    const bonusLog = await prisma.bonusGrant.findMany({
      where: bonusWhere,
      include: { transaction: true },
      orderBy: { granted_at: 'desc' },
    });

    return successResponse({
      customer: formatCustomer(customer),
      period: { month: month ? parseInt(month) : null, year: year ? parseInt(year) : null },
      omzet_lunas: {
        lm: omzet_lm,
        br: omzet_br,
        total: omzet_total,
      },
      laba_lunas: laba_total,
      piutang_outstanding: total_piutang,
      total_paid,
      bonus_log: bonusLog.map(g => ({
        id: g.id,
        bonuses_granted: g.bonuses_granted,
        omzet_consumed: Number(g.omzet_consumed),
        granted_at: g.granted_at,
        nomor_bon: g.transaction.nomor_bon,
      })),
    });
  } catch (error) {
    console.error('[GET /reports/customer/:id]', error);
    return errorResponse('Gagal memuat laporan pelanggan.', 'SERVER_ERROR', 500);
  }
});
