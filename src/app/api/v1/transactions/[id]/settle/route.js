// POST /api/v1/transactions/[id]/settle — Lunaskan 1 bon
import { withAuthSupabase, errorResponse, successResponse } from '@/lib/auth-helpers';
import { logActivity } from '@/lib/audit';

export const POST = withAuthSupabase(async (request, { params }, { user, profile, shopId, supabase }) => {
  try {
    const { id } = await params;
    const body = await request.json();
    const { tanggal_lunas } = body;

    if (!tanggal_lunas) {
      return errorResponse('Tanggal pelunasan wajib diisi.', 'VALIDATION_ERROR', 422);
    }

    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);

    const { data: existing } = await supabase
      .from('transactions')
      .select('id, nomor_bon, status, amount_owed, customer_id, shop_id')
      .eq('id', id)
      .eq('shop_id', shopId)
      .single();

    if (!existing) return errorResponse('Transaksi tidak ditemukan.', 'NOT_FOUND', 404);
    if (existing.status === 'Lunas') {
      return errorResponse('Transaksi sudah berstatus Lunas.', 'CONFLICT', 409);
    }

    const { error } = await supabase
      .from('transactions')
      .update({
        status: 'Lunas',
        tanggal_lunas: new Date(tanggal_lunas).toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    await logActivity(supabase, existing.shop_id, profile.username || user.email, 'Pelunasan Bon',
      `Melunasi bon "${existing.nomor_bon}" total Rp${Number(existing.amount_owed).toLocaleString('id-ID')}`);

    const { data: updated } = await supabase
      .from('transactions')
      .select('*, transaction_items(*, products(*)), customers(*)')
      .eq('id', id)
      .single();

    return successResponse(updated);
  } catch (error) {
    console.error('[POST /transactions/:id/settle]', error);
    return errorResponse('Gagal melunaskan transaksi.', 'SERVER_ERROR', 500);
  }
});
