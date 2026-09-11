// GET /api/v1/reports/overall — Laporan keseluruhan semua pelanggan
const prisma = {};
import { withAuth, errorResponse, successResponse } from '@/lib/auth-helpers';
import { formatTransaction, getFiveYearsAgoDate } from '@/lib/calculations';

export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const fiveYearsAgo = getFiveYearsAgoDate();

    const where = {};
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      const effectiveStart = startDate > fiveYearsAgo ? startDate : fiveYearsAgo;
      where.tanggal = { gte: effectiveStart, lte: endDate };
    } else {
      where.tanggal = { gte: fiveYearsAgo };
    }

    // 1. Setup date ranges
    const bonusWhere = {};
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      const effectiveStart = startDate > fiveYearsAgo ? startDate : fiveYearsAgo;
      bonusWhere.granted_at = { gte: effectiveStart, lte: endDate };
    } else {
      bonusWhere.granted_at = { gte: fiveYearsAgo };
    }

    // 2. Aggregate transactions
    const lunasAgg = await prisma.transaction.aggregate({
      where: { ...where, status: 'Lunas', is_bonus: false },
      _sum: { omzet_total: true, laba_total: true, amount_owed: true }
    });

    const piutangAgg = await prisma.transaction.aggregate({
      where: { ...where, status: 'Piutang' },
      _sum: { amount_owed: true }
    });

    const omzet_total = Number(lunasAgg._sum.omzet_total || 0n);
    const laba_total = Number(lunasAgg._sum.laba_total || 0n);
    const total_paid = Number(lunasAgg._sum.amount_owed || 0n);
    const total_piutang = Number(piutangAgg._sum.amount_owed || 0n);

    // 3. Aggregate line item omzet grouped by product type (LM vs BR)
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

    // 4. Calculate stats per customer
    const customerLunas = await prisma.transaction.groupBy({
      by: ['customer_id'],
      where: { ...where, status: 'Lunas', is_bonus: false, customer_id: { not: null } },
      _sum: { omzet_total: true, laba_total: true, amount_owed: true }
    });

    const customerPiutang = await prisma.transaction.groupBy({
      by: ['customer_id'],
      where: { ...where, status: 'Piutang', customer_id: { not: null } },
      _sum: { amount_owed: true }
    });

    const customers = await prisma.customer.findMany({
      where: { is_deleted: false },
      orderBy: { nama: 'asc' },
    });

    const lunasMap = Object.fromEntries(customerLunas.map(c => [c.customer_id, c._sum]));
    const piutangMap = Object.fromEntries(customerPiutang.map(c => [c.customer_id, c._sum]));

    const by_customer = customers.map(c => {
      const lSum = lunasMap[c.id] || { omzet_total: 0n, laba_total: 0n, amount_owed: 0n };
      const pSum = piutangMap[c.id] || { amount_owed: 0n };

      return {
        customer_id: c.id,
        nama: c.nama,
        omzet_lunas: Number(lSum.omzet_total || 0n),
        laba_lunas: Number(lSum.laba_total || 0n),
        piutang: Number(pSum.amount_owed || 0n),
        paid: Number(lSum.amount_owed || 0n),
      };
    }).filter(c => c.omzet_lunas > 0 || c.piutang > 0);

    // Bonus log
    const bonusGrants = await prisma.bonusGrant.findMany({
      where: bonusWhere,
      include: { customer: true, transaction: true },
      orderBy: { granted_at: 'desc' },
    });

    return successResponse({
      period: { month: month ? parseInt(month) : null, year: year ? parseInt(year) : null },
      total_omzet_lunas: { lm: omzet_lm, br: omzet_br, total: omzet_total },
      total_laba_lunas: laba_total,
      total_piutang_outstanding: total_piutang,
      total_paid,
      by_customer,
      bonus_log: bonusGrants.map(g => ({
        id: g.id,
        customer_nama: g.customer.nama,
        bonuses_granted: g.bonuses_granted,
        omzet_consumed: Number(g.omzet_consumed),
        granted_at: g.granted_at,
      })),
    });
  } catch (error) {
    console.error('[GET /reports/overall]', error);
    return errorResponse('Gagal memuat laporan keseluruhan.', 'SERVER_ERROR', 500);
  }
});
