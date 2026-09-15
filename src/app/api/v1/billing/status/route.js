import { withAuthSupabase, errorResponse, resolveOrganization } from '@/lib/auth-helpers';

export const GET = withAuthSupabase(async (request, context, { user, profile, supabase }) => {
  try {
    // 1. Selesaikan organisasi secara terpadu melalui helper kanonikal resolveOrganization
    const org = await resolveOrganization(supabase, user, profile);
    const orgId = org?.id || null;
    const orgName = org?.name || 'Organisasi Anda';

    // Jika organisasi belum ada, fallback ke status dasar Magang
    if (!orgId) {
      return new Response(
        JSON.stringify({
          data: {
            tier: 'MAGANG',
            plan: 'MAGANG',
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

    let effectiveStatus = statusData;

    // Defense-in-depth: jika RPC mengembalikan status Magang/null namun profil/toko juragan memiliki tier berbayar aktif
    if (!effectiveStatus || effectiveStatus.tier === 'MAGANG') {
      const activeTier = (org?.tier_id || profile?.subscription_plan || '').toUpperCase();
      if (activeTier && activeTier !== 'MAGANG' && activeTier !== 'TRIAL') {
        effectiveStatus = {
          tier: activeTier,
          is_in_grace: false,
          is_expired: false,
          days_remaining: effectiveStatus?.days_remaining || 30,
          grace_seconds_remaining: 0,
          expires_at: effectiveStatus?.expires_at || null,
          active_branches_allowed: activeTier === 'EKSEKUTIF' ? 3 : (activeTier === 'MANAJER' ? 2 : 1),
        };
      }
    }

    if (!effectiveStatus) {
      effectiveStatus = {
        tier: org?.tier_id || 'MAGANG',
        is_in_grace: false,
        is_expired: false,
        days_remaining: 30,
        active_branches_allowed: (org?.tier_id === 'EKSEKUTIF') ? 3 : 1,
      };
    }

    return new Response(
      JSON.stringify({
        data: {
          ...effectiveStatus,
          plan: effectiveStatus.tier,
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
