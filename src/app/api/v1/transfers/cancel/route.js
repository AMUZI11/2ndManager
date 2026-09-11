import { withBossOnly, errorResponse, successResponse } from '@/lib/auth-helpers';
import { hashTransferPin } from '@/utils/transitSecurity';

export const POST = withBossOnly(async (request, context, { user, supabase }) => {
  try {
    const body = await request.json();
    const { transfer_id, owner_pin, reason } = body;

    if (!transfer_id) {
      return errorResponse('ID transfer wajib disertakan.', 'VALIDATION_ERROR', 422);
    }

    if (!owner_pin) {
      return errorResponse('PIN Owner wajib dimasukkan untuk membatalkan pengiriman.', 'VALIDATION_ERROR', 422);
    }

    // Hash PIN Owner
    const ownerPinHash = await hashTransferPin(owner_pin);

    // Panggil RPC PostgreSQL cancel_stock_transfer
    const { data: rpcResult, error: rpcErr } = await supabase.rpc('cancel_stock_transfer', {
      p_transfer_id: transfer_id,
      p_owner_pin_hash: ownerPinHash,
      p_reason: reason ? String(reason).trim() : 'Dibatalkan oleh Pemilik Toko',
      p_owner_id: user.id,
    });

    if (rpcErr) {
      console.error('[POST /transfers/cancel] RPC error:', rpcErr);
      return errorResponse(rpcErr.message, 'CANCEL_ERROR', 400);
    }

    return successResponse(rpcResult);
  } catch (error) {
    console.error('[POST /transfers/cancel]', error);
    return errorResponse(`Gagal membatalkan tiket mutasi: ${error.message}`, 'SERVER_ERROR', 500);
  }
});
