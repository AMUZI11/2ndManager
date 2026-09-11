import { withAuth, errorResponse, successResponse, checkSubscriptionActive } from '@/lib/auth-helpers';
import { canAccessFeature } from '@/lib/subscription';
import { generateSecureTransferPin, hashTransferPin } from '@/utils/transitSecurity';

export const POST = withAuth(async (request, context, { user, supabase }) => {
  try {
    const body = await request.json();
    const { source_branch_id, target_branch_id, items, notes } = body;

    if (!source_branch_id || !target_branch_id) {
      return errorResponse('Cabang asal dan cabang tujuan wajib dipilih.', 'VALIDATION_ERROR', 422);
    }

    if (source_branch_id === target_branch_id) {
      return errorResponse('Cabang asal dan cabang tujuan tidak boleh sama.', 'VALIDATION_ERROR', 422);
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse('Daftar item mutasi tidak boleh kosong.', 'VALIDATION_ERROR', 422);
    }

    // 1. Dapatkan detail cabang asal & validasi organisasi
    const { data: sourceBranch, error: srcErr } = await supabase
      .from('branches')
      .select('id, organization_id, shop_id, branch_name')
      .eq('id', source_branch_id)
      .single();

    if (srcErr || !sourceBranch) {
      return errorResponse('Cabang asal tidak ditemukan.', 'NOT_FOUND', 404);
    }

    // 2. Validasi tier langganan (Wajib Tier yang memiliki inter_branch_stock_transfer)
    const { plan } = await checkSubscriptionActive(supabase, sourceBranch.shop_id);
    if (!canAccessFeature(plan, 'inter_branch_stock_transfer') && !canAccessFeature(plan, 'multi_branch')) {
      return errorResponse(
        'Fitur Mutasi Antar-Cabang eksklusif untuk paket Direktur Eksekutif. Silakan upgrade paket Anda.',
        'FORBIDDEN',
        403
      );
    }

    // 3. Generate PIN 6-digit rahasia & Hash SHA-256
    const rawPin = generateSecureTransferPin();
    const pinHash = await hashTransferPin(rawPin);

    // 4. Panggil RPC PostgreSQL dispatch_stock_transfer
    const { data: rpcResult, error: rpcErr } = await supabase.rpc('dispatch_stock_transfer', {
      p_org_id: sourceBranch.organization_id,
      p_source_branch_id: source_branch_id,
      p_target_branch_id: target_branch_id,
      p_items: items,
      p_pin_hash: pinHash,
      p_dispatched_by: user.id,
      p_notes: notes ? String(notes).trim() : null,
    });

    if (rpcErr) {
      console.error('[POST /transfers/dispatch] RPC error:', rpcErr);
      return errorResponse(rpcErr.message, 'DISPATCH_ERROR', 400);
    }

    return successResponse({
      ...rpcResult,
      pin: rawPin,
    }, 201);
  } catch (error) {
    console.error('[POST /transfers/dispatch]', error);
    return errorResponse(`Gagal membuat tiket mutasi: ${error.message}`, 'SERVER_ERROR', 500);
  }
});
