// POST /api/v1/metrics/sync — Penyamaran Telemetri Anomali Kasir (Silent Stealth Telemetry)
import { withAuthSupabase } from '@/lib/auth-helpers';
import { getTierConfig } from '@/config/tiers';

const SEVERITY_MAP = {
  VAC: 'CRITICAL',
  FPA: 'CRITICAL',
  DFO: 'CRITICAL',
  HEM: 'CRITICAL',
  CIP: 'HIGH',
  ACD: 'HIGH',
  SDC: 'HIGH',
  RPC: 'MEDIUM',
};

export const POST = withAuthSupabase(async (request, context, { user, profile, shopId, supabase }) => {
  try {
    if (!shopId || !profile) {
      return new Response(null, { status: 204 });
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      return new Response(null, { status: 204 });
    }

    const { t, e, m = {} } = body;
    if (!e || !SEVERITY_MAP[e]) {
      return new Response(null, { status: 204 });
    }

    // Ambil tier toko
    const { data: shop } = await supabase
      .from('shops')
      .select('subscription_tier')
      .eq('id', shopId)
      .maybeSingle();

    const tierConfig = getTierConfig(shop?.subscription_tier || 'MAGANG');
    const features = tierConfig?.features || {};

    // 1. Simpan ke database jika tier mendukung pencatatan telemetri
    let insertedEvent = null;
    if (features.stealth_telemetry_logging) {
      const severity = SEVERITY_MAP[e] || 'MEDIUM';
      const cashierName = profile.username || profile.full_name || 'Kasir';

      const { data: eventData, error: insertErr } = await supabase
        .from('security_anomaly_events')
        .insert({
          shop_id: shopId,
          cashier_id: profile.id,
          cashier_name: cashierName,
          event_type: e,
          severity,
          metadata: {
            ...m,
            client_timestamp: t || Date.now(),
          },
          is_read_by_owner: false,
        })
        .select()
        .single();

      if (!insertErr) {
        insertedEvent = eventData;
      } else {
        console.warn('[Telemetry insert error]', insertErr.message);
      }
    }

    // 2. Siarkan via Supabase Realtime jika tier mengizinkan alert seketika
    if (features.realtime_security_alerts) {
      try {
        const realtimePayload = {
          id: insertedEvent?.id || crypto.randomUUID(),
          shop_id: shopId,
          cashier_id: profile.id,
          cashier_name: profile.username || profile.full_name || 'Kasir',
          event_type: e,
          severity: SEVERITY_MAP[e] || 'MEDIUM',
          metadata: m,
          created_at: new Date().toISOString(),
        };

        const channel = supabase.channel(`shop_security:${shopId}`);
        await channel.send({
          type: 'broadcast',
          event: 'ANOMALY_TRIGGERED',
          payload: realtimePayload,
        });
      } catch (broadcastErr) {
        console.warn('[Telemetry broadcast error]', broadcastErr);
      }
    }

    // Return 204 No Content seketika (<40ms)
    return new Response(null, { status: 204 });
  } catch (err) {
    console.warn('[POST /api/v1/metrics/sync silent fail]', err);
    return new Response(null, { status: 204 });
  }
});
