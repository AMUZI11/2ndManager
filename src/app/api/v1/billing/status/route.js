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
            max_allowed_branches: 1,
            max_allowed_cashiers: 1,
            current_active_branches: 0,
            current_active_cashiers: 0,
            extra_branches_quota: 0,
            extra_cashiers_quota: 0,
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

    // 4. Ambil kuota efektif dan status add-on organisasi dari view v_organization_effective_quotas
    let quotaData = null;
    try {
      const { data: qData } = await supabase
        .from('v_organization_effective_quotas')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();
      quotaData = qData;
    } catch (qe) {
      console.warn('[Billing Status Quota View Warning]', qe);
    }

    const maxBranches = quotaData?.max_allowed_branches || (effectiveStatus.tier === 'EKSEKUTIF' ? 3 : 1);
    const maxCashiers = quotaData?.max_allowed_cashiers || (
      effectiveStatus.tier === 'EKSEKUTIF' ? 8 :
      effectiveStatus.tier === 'MANAJER' ? 4 :
      effectiveStatus.tier === 'SUPERVISOR' ? 2 : 1
    );

    return new Response(
      JSON.stringify({
        data: {
          ...effectiveStatus,
          plan: effectiveStatus.tier,
          organization_id: orgId,
          organization_name: orgName,
          history: historyData || [],
          extra_branches_quota: quotaData?.extra_branches_quota || 0,
          extra_cashiers_quota: quotaData?.extra_cashiers_quota || 0,
          max_allowed_branches: maxBranches,
          max_allowed_cashiers: maxCashiers,
          current_active_branches: parseInt(quotaData?.current_active_branches || '0', 10),
          current_active_cashiers: parseInt(quotaData?.current_active_cashiers || '0', 10),
          expires_at: quotaData?.expires_at || effectiveStatus?.expires_at || null,
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
  } catch (error) {
    console.error('[GET /api/v1/billing/status]', error);
    return errorResponse('Gagal mengambil status langganan organisasi.', 'SERVER_ERROR', 500);
  }
});
