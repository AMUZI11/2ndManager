import { withAuthSupabase, errorResponse, resolveOrganization } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { resolveHighestTier, getTierLevel } from '@/config/tiers';

export const GET = withAuthSupabase(async (request, context, { user, profile, supabase }) => {
  try {
    // 1. Selesaikan organisasi secara terpadu melalui helper kanonikal resolveOrganization
    const org = await resolveOrganization(supabase, user, profile);
    const orgId = org?.id || null;
    const orgName = org?.name || 'Organisasi Anda';

    // Ambil tier dari profil dan toko milik user sebagai kandidat SSOT
    let shopTier = null;
    try {
      const targetShopId = profile?.shop_id;
      if (targetShopId) {
        const { data: s } = await supabase
          .from('shops')
          .select('subscription_tier')
          .eq('id', targetShopId)
          .maybeSingle();
        if (s?.subscription_tier && s.subscription_tier !== 'TRIAL') {
          shopTier = s.subscription_tier;
        }
      }
      if (!shopTier && user?.id) {
        const { data: ownedShops } = await supabase
          .from('shops')
          .select('subscription_tier')
          .eq('owner_id', user.id)
          .is('parent_shop_id', null)
          .limit(1);
        if (ownedShops?.[0]?.subscription_tier && ownedShops[0].subscription_tier !== 'TRIAL') {
          shopTier = ownedShops[0].subscription_tier;
        }
      }
    } catch (err) {
      console.warn('[Billing Status Shop Tier Lookup Warning]', err);
    }

    const profileTier = (profile?.subscription_plan && profile.subscription_plan !== 'TRIAL') 
      ? profile.subscription_plan 
      : null;

    // Jika organisasi belum ada, tentukan tier efektif dari shop/profile
    if (!orgId) {
      const fallbackTier = resolveHighestTier(profileTier, shopTier, 'MAGANG');
      const maxBranches = fallbackTier === 'EKSEKUTIF' ? 3 : 1;
      const maxCashiers = fallbackTier === 'EKSEKUTIF' ? 8 : (fallbackTier === 'MANAJER' ? 4 : (fallbackTier === 'SUPERVISOR' ? 2 : 1));
      return new Response(
        JSON.stringify({
          data: {
            tier: fallbackTier,
            plan: fallbackTier,
            is_in_grace: false,
            is_expired: false,
            days_remaining: 30,
            grace_seconds_remaining: 0,
            expires_at: null,
            active_branches_allowed: maxBranches,
            max_allowed_branches: maxBranches,
            max_allowed_cashiers: maxCashiers,
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

    // Evaluasi Single Source of Truth tertinggi
    const rpcTier = effectiveStatus?.tier;
    const orgTier = org?.tier_id;
    const resolvedTier = resolveHighestTier(rpcTier, orgTier, shopTier, profileTier);

    // Jika resolvedTier lebih tinggi daripada yang dikembalikan oleh RPC atau org di DB:
    if (!effectiveStatus || effectiveStatus.is_expired || getTierLevel(resolvedTier) > getTierLevel(rpcTier)) {
      effectiveStatus = {
        tier: resolvedTier,
        is_in_grace: false,
        is_expired: false,
        days_remaining: (effectiveStatus?.days_remaining && effectiveStatus.days_remaining > 0) ? effectiveStatus.days_remaining : 30,
        grace_seconds_remaining: 0,
        expires_at: effectiveStatus?.expires_at || null,
        active_branches_allowed: resolvedTier === 'EKSEKUTIF' ? 3 : (resolvedTier === 'MANAJER' ? 2 : 1),
      };

      // Sinkronisasi permanen ke tabel organizations dan organization_subscriptions
      if (orgId && (org?.tier_id !== resolvedTier)) {
        try {
          await supabaseAdmin
            .from('organizations')
            .update({ tier_id: resolvedTier, updated_at: new Date().toISOString() })
            .eq('id', orgId);

          const { data: existingSub } = await supabaseAdmin
            .from('organization_subscriptions')
            .select('id')
            .eq('organization_id', orgId)
            .maybeSingle();

          if (existingSub) {
            await supabaseAdmin
              .from('organization_subscriptions')
              .update({ current_tier: resolvedTier, updated_at: new Date().toISOString() })
              .eq('organization_id', orgId);
          } else {
            const now = new Date();
            const exp = new Date(now.getTime() + 30 * 86400000);
            const grace = new Date(exp.getTime() + 3 * 86400000);
            await supabaseAdmin
              .from('organization_subscriptions')
              .insert({
                organization_id: orgId,
                current_tier: resolvedTier,
                starts_at: now.toISOString(),
                expires_at: exp.toISOString(),
                grace_period_ends_at: grace.toISOString(),
              });
          }
        } catch (syncErr) {
          console.warn('[Billing Status Org Sync Warning]', syncErr);
        }
      }
    }

    if (!effectiveStatus) {
      effectiveStatus = {
        tier: resolvedTier || org?.tier_id || 'MAGANG',
        is_in_grace: false,
        is_expired: false,
        days_remaining: 30,
        active_branches_allowed: (resolvedTier === 'EKSEKUTIF') ? 3 : 1,
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

    const finalTier = effectiveStatus?.tier || resolvedTier || 'MAGANG';
    const baseBranchLimit = finalTier === 'EKSEKUTIF' ? 3 : 1;
    const baseCashierLimit = (
      finalTier === 'EKSEKUTIF' ? 8 :
      finalTier === 'MANAJER' ? 4 :
      finalTier === 'SUPERVISOR' ? 2 : 1
    );

    const extraBranches = quotaData?.extra_branches_quota || 0;
    const extraCashiers = quotaData?.extra_cashiers_quota || 0;

    const maxBranches = quotaData?.max_allowed_branches 
      ? Math.max(quotaData.max_allowed_branches, baseBranchLimit + extraBranches) 
      : (baseBranchLimit + extraBranches);
    const maxCashiers = quotaData?.max_allowed_cashiers 
      ? Math.max(quotaData.max_allowed_cashiers, baseCashierLimit + extraCashiers) 
      : (baseCashierLimit + extraCashiers);

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
