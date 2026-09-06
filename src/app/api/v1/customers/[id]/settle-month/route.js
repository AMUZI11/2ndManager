// POST /api/v1/customers/[id]/settle-month — Lunaskan semua bon piutang bulan tertentu
import { withAuthSupabase, errorResponse, successResponse } from '@/lib/auth-helpers';
import { logActivity } from '@/lib/audit';

export const POST = withAuthSupabase(async (request, { params }, { user, profile, shopId, supabase }) => {
  try {
    const { id } = await params;
    const body = await request.json();
    const { month, year, tanggal_lunas } = body;

    if (!month || !year || !tanggal_lunas) {
      return errorResponse('Bulan, tahun, dan tanggal pelunasan wajib diisi.', 'VALIDATION_ERROR', 422);
    }

    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString().split('T')[0];
    const endDate   = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

    // Cari semua bon Piutang di bulan ini
    const { data: toSettle } = await supabase
      .from('transactions')
      .select('id, nomor_bon, amount_owed')
      .eq('customer_id', id)
      .eq('shop_id', shopId)
      .eq('status', 'Piutang')
      .gte('tanggal', startDate)
      .lte('tanggal', endDate);

    if (!toSettle || toSettle.length === 0) {
      return successResponse({ settled_count: 0, transactions: [] });
    }

    const ids = toSettle.map(t => t.id);
    const tanggalLunasStr = new Date(tanggal_lunas).toISOString().split('T')[0];

    const { error } = await supabase
      .from('transactions')
      .update({ status: 'Lunas', tanggal_lunas: tanggalLunasStr, updated_at: new Date().toISOString() })
      .in('id', ids);

    if (error) throw error;

    const totalSettled = toSettle.reduce((s, t) => s + Number(t.amount_owed), 0);

    await logActivity(supabase, shopId, profile.username || user.email, 'Pelunasan Bulan',
      `Melunasi ${toSettle.length} bon bulan ${month}/${year}, total Rp${totalSettled.toLocaleString('id-ID')}`);

    const { data: updated } = await supabase
      .from('transactions')
      .select('*')
      .in('id', ids);

    return successResponse({ settled_count: updated.length, transactions: updated });
  } catch (error) {
    console.error('[POST /customers/:id/settle-month]', error);
    return errorResponse('Gagal melunaskan bon bulan ini.', 'SERVER_ERROR', 500);
  }
});
