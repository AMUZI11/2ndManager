// POST /api/v1/shifts/start — Buka sesi shift kasir baru dengan evaluasi serah terima estafet laci
import { withAuthSupabase, errorResponse } from '@/lib/auth-helpers';
import { getTierConfig } from '@/config/tiers';
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

    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);

    const body = await request.json();
    const { starting_cash = 0, register_id = 'REGISTER_MAIN', denominations = {} } = body;

    const initialCash = parseInt(starting_cash, 10);
    if (isNaN(initialCash) || initialCash < 0) {
      return errorResponse('Modal awal laci kasir (starting_cash) tidak valid.', 'INVALID_INPUT', 400);
    }

    const registerId = (typeof register_id === 'string' && register_id.trim()) 
      ? register_id.trim().toUpperCase() 
      : 'REGISTER_MAIN';

    // Eksekusi RPC Database Atomic untuk pembukaan shift & audit estafet
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('start_shift_with_estafet_audit', {
      p_shop_id: shopId,
      p_cashier_id: profile.id,
      p_register_id: registerId,
      p_starting_cash: initialCash,
      p_denominations: denominations || {},
    });

    if (rpcErr) {
      console.error('[start_shift_with_estafet_audit error]', rpcErr);
      return errorResponse(rpcErr.message || 'Gagal membuka sesi shift kasir.', 'SHIFT_START_FAILED', 400);
    }

    // Ambil tier toko untuk pengecekan notifikasi realtime
    const { data: shop } = await supabase
      .from('shops')
      .select('subscription_tier')
      .eq('id', shopId)
      .maybeSingle();

    const tierConfig = getTierConfig(shop?.subscription_tier || 'MAGANG');
    const features = tierConfig?.features || {};

    // Jika terjadi selisih serah terima (DISCREPANCY / HEM) dan tier mengizinkan alert realtime
    if (rpcRes?.handover_status === 'DISCREPANCY' && features.realtime_security_alerts) {
      try {
        // Ambil anomali HEM terbaru yang baru dibuat
        const { data: hemEvent } = await supabase
          .from('security_anomaly_events')
          .select('*')
          .eq('shop_id', shopId)
          .eq('event_type', 'HEM')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (hemEvent) {
          const channel = supabase.channel(`shop_security:${shopId}`);
          await channel.send({
            type: 'broadcast',
            event: 'ANOMALY_TRIGGERED',
            payload: hemEvent,
          });
        }
      } catch (broadcastErr) {
        console.warn('[Estafet alert broadcast error]', broadcastErr);
      }
    }

    await logActivity({
      user_id: user.id,
      action: 'START_CASHIER_SHIFT',
      entity: 'cashier_shifts',
      entity_id: rpcRes.shift_id,
      metadata: { register_id: registerId, starting_cash: initialCash, handover_status: rpcRes.handover_status },
    });

    // Respons ke kasir: Dilarang menyertakan selisih nominal laci (Zero Bocoran)
    return Response.json(
      {
        success: true,
        shift_id: rpcRes.shift_id,
        register_id: rpcRes.register_id,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Error POST /api/v1/shifts/start:', err);
    return errorResponse('Gagal memulai shift kasir: ' + err.message, 'INTERNAL_ERROR', 500);
  }
});
