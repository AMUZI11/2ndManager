// POST /api/v1/transactions/[id]/settle — Lunaskan 1 bon
const prisma = {};
import { withAuth, errorResponse, successResponse } from '@/lib/auth-helpers';
import { formatTransaction, checkAndGrantBonuses } from '@/lib/calculations';
import { logActivity } from '@/lib/audit';

export const POST = withAuth(async (request, { params }, user) => {
  try {
    const { id } = await params;
    const body = await request.json();
    const { tanggal_lunas } = body;

    if (!tanggal_lunas) {
      return errorResponse('Tanggal pelunasan wajib diisi.', 'VALIDATION_ERROR', 422);
    }

    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) return errorResponse('Transaksi tidak ditemukan.', 'NOT_FOUND', 404);
    if (existing.status === 'Lunas') {
      return errorResponse('Transaksi sudah berstatus Lunas.', 'CONFLICT', 409);
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: { status: 'Lunas', tanggal_lunas: new Date(tanggal_lunas) },
      include: { items: { include: { product: true } }, customer: true },
    });

    if (updated.customer_id) {
      await checkAndGrantBonuses(updated.customer_id, updated.id, prisma);
    }

    await logActivity(user.username, 'Pelunasan Bon', `Melunasi bon "${updated.nomor_bon}" (Total: Rp${Number(updated.amount_owed).toLocaleString('id-ID')})`);

    return successResponse(formatTransaction(updated));
  } catch (error) {
    console.error('[POST /transactions/:id/settle]', error);
    return errorResponse('Gagal melunaskan transaksi.', 'SERVER_ERROR', 500);
  }
});
