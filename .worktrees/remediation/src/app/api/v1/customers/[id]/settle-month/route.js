// POST /api/v1/customers/[id]/settle-month — Lunaskan semua bon piutang bulan tertentu
const prisma = {};
import { withAuth, errorResponse, successResponse } from '@/lib/auth-helpers';
import { formatTransaction, checkAndGrantBonuses } from '@/lib/calculations';

export const POST = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    const body = await request.json();
    const { month, year, tanggal_lunas } = body;

    if (!month || !year || !tanggal_lunas) {
      return errorResponse('Bulan, tahun, dan tanggal pelunasan wajib diisi.', 'VALIDATION_ERROR', 422);
    }

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

    // Cari semua transaksi Piutang di bulan ini
    const toSettle = await prisma.transaction.findMany({
      where: {
        customer_id: id,
        status: 'Piutang',
        tanggal: { gte: startDate, lte: endDate },
      },
    });

    if (toSettle.length === 0) {
      return successResponse({ settled_count: 0, transactions: [] });
    }

    // Update semua menjadi Lunas
    const tanggalLunasDate = new Date(tanggal_lunas);
    await prisma.transaction.updateMany({
      where: { id: { in: toSettle.map(t => t.id) } },
      data: { status: 'Lunas', tanggal_lunas: tanggalLunasDate },
    });

    const lastSettleId = toSettle[toSettle.length - 1].id;
    await checkAndGrantBonuses(id, lastSettleId, prisma);

    const updated = await prisma.transaction.findMany({
      where: { id: { in: toSettle.map(t => t.id) } },
      include: { items: true },
    });

    return successResponse({
      settled_count: updated.length,
      transactions: updated.map(formatTransaction),
    });
  } catch (error) {
    console.error('[POST /customers/:id/settle-month]', error);
    return errorResponse('Gagal melunaskan bon bulan ini.', 'SERVER_ERROR', 500);
  }
});
