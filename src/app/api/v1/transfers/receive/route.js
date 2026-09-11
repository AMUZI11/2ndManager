import { withAuth, errorResponse, successResponse } from '@/lib/auth-helpers';

export const POST = withAuth(async (request, context, { user, supabase }) => {
  try {
    const body = await request.json();
    const { transfer_id, target_branch_id, raw_pin, received_items } = body;

    if (!transfer_id) {
      return errorResponse('ID transfer wajib disertakan.', 'VALIDATION_ERROR', 422);
    }

    if (!target_branch_id) {
      return errorResponse('ID cabang penerima wajib disertakan.', 'VALIDATION_ERROR', 422);
    }

    if (!raw_pin || String(raw_pin).trim().length !== 6) {
      return errorResponse('PIN verifikasi wajib 6 digit angka.', 'VALIDATION_ERROR', 422);
    }

    if (!received_items || !Array.isArray(received_items) || received_items.length === 0) {
      return errorResponse('Daftar item verifikasi fisik tidak boleh kosong.', 'VALIDATION_ERROR', 422);
    }

    // Panggil RPC PostgreSQL receive_stock_transfer
    const { data: rpcResult, error: rpcErr } = await supabase.rpc('receive_stock_transfer', {
      p_transfer_id: transfer_id,
      p_target_branch_id: target_branch_id,
      p_received_items: received_items,
      p_raw_pin: String(raw_pin).trim(),
      p_received_by: user.id,
    });

    if (rpcErr) {
      console.error('[POST /transfers/receive] RPC error:', rpcErr);
      const isPinError = rpcErr.message.includes('PIN_INVALID');
      const isLockedError = rpcErr.message.includes('TRANSFER_LOCKED');
      const status = isPinError ? 401 : isLockedError ? 423 : 400;
      return errorResponse(rpcErr.message, isPinError ? 'PIN_INVALID' : isLockedError ? 'TRANSFER_LOCKED' : 'RECEIVE_ERROR', status);
    }

    if (rpcResult && rpcResult.success === false) {
      const isPinError = rpcResult.error_code === 'PIN_INVALID' || rpcResult.error_code === 'PIN_INVALID_LOCKED';
      const isLockedError = rpcResult.is_locked || rpcResult.error_code === 'PIN_INVALID_LOCKED' || rpcResult.error_code === 'TRANSFER_LOCKED';
      const status = isLockedError ? 423 : isPinError ? 401 : 400;
      return errorResponse(rpcResult.message, rpcResult.error_code || 'RECEIVE_ERROR', status, {
        failed_attempts: rpcResult.failed_attempts,
        is_locked: rpcResult.is_locked,
      });
    }

    return successResponse(rpcResult);
  } catch (error) {
    console.error('[POST /transfers/receive]', error);
    return errorResponse(`Gagal memverifikasi penerimaan transfer: ${error.message}`, 'SERVER_ERROR', 500);
  }
});
