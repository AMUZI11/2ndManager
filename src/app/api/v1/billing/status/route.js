import { withAuthSupabase, errorResponse } from '@/lib/auth-helpers';

export const GET = withAuthSupabase(async (request, context, { user, profile, supabase }) => {
  try {
    let orgId = null;
    let orgName = 'Toko';

    // 1. Selesaikan organisasi berdasarkan peran akun (Boss vs Kasir)
    if (profile?.role === 'BOSS' || !profile?.role) {
      const { data: org } = await supabase
        .from('organizations')
        .select('id, name, tier_id')
        .eq('owner_id', user.id)
        .maybeSingle();

      orgId = org?.id || null;
      orgName = org?.name || 'Organisasi Anda';
    } else {
      // Kasir / Staff: cari organisasi pemilik dari toko kasir tersebut
      if (profile?.shop_id) {
        const { data: shop } = await supabase
          .from('shops')
          .select('id, name, owner_id')
          .eq('id', profile.shop_id)
          .maybeSingle();

        if (shop?.owner_id) {
          const { data: org } = await supabase
            .from('organizations')
            .select('id, name, tier_id')
            .eq('owner_id', shop.owner_id)
            .maybeSingle();

          orgId = org?.id || null;
          orgName = org?.name || shop.name;
        }
      }
    }

    // Jika organisasi belum ada, fallback ke status dasar Magang
    if (!orgId) {
      return new Response(
        JSON.stringify({
          data: {
            tier: 'MAGANG',
            is_in_grace: false,
            is_expired: false,
            days_remaining: 30,
            grace_seconds_remaining: 0,
            expires_at: null,
            active_branches_allowed: 1,
            organization_name: orgName,
            history: [],
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            Date: new Date().toUTCString(),
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      );
    }

    // 2. Evaluasi status langganan via RPC
    const { data: statusData, error: statusErr } = await supabase.rpc(
      'evaluate_subscription_status',
      { p_org_id: orgId }
    );

    if (statusErr) {
      console.warn('[Billing Status RPC Warning]', statusErr);
    }

    // 3. Ambil riwayat token voucher yang pernah di-redeem oleh organisasi ini
    const { data: historyData } = await supabase
      .from('license_tokens')
      .select('id, token_code, tier_id, duration_days, redeemed_at, notes')
      .eq('redeemed_by_org', orgId)
      .order('redeemed_at', { ascending: false })
      .limit(10);

    const effectiveStatus = statusData || {
      tier: 'MAGANG',
      is_in_grace: false,
      is_expired: false,
      days_remaining: 30,
      active_branches_allowed: 1,
    };

    return new Response(
      JSON.stringify({
        data: {
          ...effectiveStatus,
          organization_id: orgId,
          organization_name: orgName,
          history: historyData || [],
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          Date: new Date().toUTCString(),
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err) {
    console.error('[Billing Status Error]', err);
    return errorResponse(err.message || 'Gagal memeriksa status langganan.', 'INTERNAL_ERROR', 500);
  }
});
