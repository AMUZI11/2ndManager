// GET  /api/v1/customers/[id]/transactions  — daftar transaksi pelanggan
// POST /api/v1/customers/[id]/settle-month  — lunaskan semua bon bulan tertentu
const prisma = {};
import { withAuth, errorResponse, successResponse } from '@/lib/auth-helpers';
import { formatTransaction, getFiveYearsAgoDate } from '@/lib/calculations';

export const GET = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const status = searchParams.get('status');

    const fiveYearsAgo = getFiveYearsAgoDate();

    const where = { customer_id: id };
    if (status) where.status = status;
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      const effectiveStart = startDate > fiveYearsAgo ? startDate : fiveYearsAgo;
      where.tanggal = { gte: effectiveStart, lte: endDate };
    } else {
      where.tanggal = { gte: fiveYearsAgo };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: { items: { include: { product: true } } },
      orderBy: { tanggal: 'desc' },
    });

    // Hitung summary bulanan
    const piutangTx = transactions.filter(t => t.status === 'Piutang');
    const lunasTx = transactions.filter(t => t.status === 'Lunas');

    const summary = {
      total_piutang: piutangTx.reduce((s, t) => s + Number(t.amount_owed), 0),
      total_lunas: lunasTx.reduce((s, t) => s + Number(t.amount_owed), 0),
      omzet_lm_lunas: lunasTx.reduce((s, t) =>
        s + t.items.filter(i => i.product_type_snapshot === 'LM')
          .reduce((is, i) => is + Number(i.line_omzet), 0), 0),
      omzet_br_lunas: lunasTx.reduce((s, t) =>
        s + t.items.filter(i => i.product_type_snapshot === 'BR')
          .reduce((is, i) => is + Number(i.line_omzet), 0), 0),
      omzet_total_lunas: lunasTx.reduce((s, t) => s + Number(t.omzet_total), 0),
      laba_total_lunas: lunasTx.reduce((s, t) => s + Number(t.laba_total), 0),
    };

    return successResponse({ data: transactions.map(formatTransaction), summary });
  } catch (error) {
    console.error('[GET /customers/:id/transactions]', error);
    return errorResponse('Gagal memuat transaksi pelanggan.', 'SERVER_ERROR', 500);
  }
});
