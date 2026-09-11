// POST /api/v1/shifts/handover — Double-Blind Estafet Shift Handover
import { withAuthSupabase, errorResponse, successResponse } from '@/lib/auth-helpers';
import { logActivity } from '@/lib/audit';

export const POST = withAuthSupabase(async (request, context, { user, profile, supabase }) => {
  try {
    let shopId = profile.shop_id;
    if (!shopId && profile.role === 'BOSS') {
      const { data: userShop } = await supabase
        .from('user_shops')
        .select('shop_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      shopId = userShop?.shop_id;
    }

    if (!shopId) {
      return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);
    }

    const body = await request.json();
    const {
      shift_id,
      outgoing_cash_count,
      incoming_cash_count,
      incoming_cashier_id,
      incoming_pin,
      notes = '',
    } = body;

    if (!shift_id) {
      return errorResponse('ID shift aktif wajib disertakan.', 'VALIDATION_ERROR', 422);
    }
    if (!incoming_cashier_id) {
      return errorResponse('Kasir pengganti wajib dipilih.', 'VALIDATION_ERROR', 422);
    }
    if (outgoing_cash_count === undefined || outgoing_cash_count === null || isNaN(Number(outgoing_cash_count))) {
      return errorResponse('Hitungan uang kasir keluar tidak valid.', 'VALIDATION_ERROR', 422);
    }
    if (incoming_cash_count === undefined || incoming_cash_count === null || isNaN(Number(incoming_cash_count))) {
      return errorResponse('Hitungan uang modal kasir pengganti tidak valid.', 'VALIDATION_ERROR', 422);
    }

    // 1. Verifikasi kasir pengganti terdaftar pada toko yang sama
    const { data: incomingProfile, error: profErr } = await supabase
      .from('profiles')
      .select('id, username, full_name, role, shop_id, pin, is_active')
      .eq('id', incoming_cashier_id)
      .single();

    if (profErr || !incomingProfile) {
      return errorResponse('Kasir pengganti tidak ditemukan.', 'NOT_FOUND', 404);
    }

    if (incomingProfile.shop_id && incomingProfile.shop_id !== shopId) {
      return errorResponse('Kasir pengganti bukan staf dari toko ini.', 'FORBIDDEN', 403);
    }

    // 2. Eksekusi RPC Atomik PostgreSQL
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('execute_double_blind_handover', {
      p_shift_id: shift_id,
      p_outgoing_cash_count: Number(outgoing_cash_count),
      p_incoming_cash_count: Number(incoming_cash_count),
      p_incoming_cashier_id: incoming_cashier_id,
      p_incoming_pin: incoming_pin ? String(incoming_pin) : null,
      p_notes: notes?.trim() || null,
    });

    if (rpcErr) {
      console.error('[RPC execute_double_blind_handover Error]', rpcErr);
      return errorResponse(rpcErr.message || 'Gagal mengeksekusi serah terima shift.', 'RPC_ERROR', 500);
    }

    // 3. Ambil data nama toko untuk slip cetak
    const { data: shop } = await supabase
      .from('shops')
      .select('nama')
      .eq('id', shopId)
      .maybeSingle();

    const slipData = {
      shop_name: shop?.nama || 'KlolaWarung',
      old_shift_number: (rpcRes.new_shift_number || 2) - 1,
      new_shift_number: rpcRes.new_shift_number || 2,
      outgoing_cashier_name: profile.username || profile.full_name || 'Kasir Keluar',
      incoming_cashier_name: incomingProfile.username || incomingProfile.full_name || 'Kasir Pengganti',
      handover_time: new Date().toISOString(),
      outgoing_cash_count: Number(outgoing_cash_count),
      incoming_cash_count: Number(incoming_cash_count),
      diff_handoff: Number(rpcRes.diff_handoff || 0),
      diff_outgoing: Number(rpcRes.diff_outgoing || 0),
      requires_owner_review: Boolean(rpcRes.requires_owner_review),
      notes: notes?.trim() || null,
    };

    // 4. Catat ke audit log
    await logActivity({
      supabase,
      userId: user.id,
      shopId,
      action: 'DOUBLE_BLIND_HANDOVER',
      entityType: 'SHIFT',
      entityId: shift_id,
      metadata: {
        old_shift_id: shift_id,
        new_shift_id: rpcRes.new_shift_id,
        outgoing_cashier_id: profile.id,
        incoming_cashier_id: incoming_cashier_id,
        diff_outgoing: rpcRes.diff_outgoing,
        diff_handoff: rpcRes.diff_handoff,
        requires_owner_review: rpcRes.requires_owner_review,
      },
    });

    // 5. Jika terdapat selisih anomali, siarkan seketika via Realtime channel
    if (rpcRes.requires_owner_review) {
      try {
        const anomalyPayload = {
          shop_id: shopId,
          shift_id: shift_id,
          event_type: 'SHIFT_DISCREPANCY',
          severity: 'CRITICAL',
          cashier_name: profile.username || 'Kasir Keluar',
          metadata: {
            outgoing_cashier_name: profile.username,
            incoming_cashier_name: incomingProfile.username,
            diff_outgoing: rpcRes.diff_outgoing,
            diff_handoff: rpcRes.diff_handoff,
            timestamp: Date.now(),
          },
          created_at: new Date().toISOString(),
        };

        const channel = supabase.channel(`security_radar:${shopId}`);
        await channel.send({
          type: 'broadcast',
          event: 'ANOMALY_DETECTED',
          payload: anomalyPayload,
        });
      } catch (broadcastErr) {
        console.warn('[Handover Realtime Broadcast Error]', broadcastErr);
      }
    }

    return successResponse({
      ...rpcRes,
      print_slip: slipData,
    });
  } catch (err) {
    console.error('[POST /api/v1/shifts/handover Unexpected Error]', err);
    return errorResponse('Terjadi kesalahan internal pada server.', 'INTERNAL_ERROR', 500);
  }
});
