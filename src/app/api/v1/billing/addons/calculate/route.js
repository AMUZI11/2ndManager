import { withAuthSupabase, errorResponse, successResponse, resolveOrganization } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const POST = withAuthSupabase(async (request, context, { user, profile, supabase }) => {
  try {
    const body = await request.json();
    const { organizationId, additionalBranches = 0, additionalCashiers = 0 } = body;

    const branchesCount = Math.max(0, parseInt(additionalBranches, 10) || 0);
    const cashiersCount = Math.max(0, parseInt(additionalCashiers, 10) || 0);

    // 1. Resolve organization
    let orgId = organizationId;
    if (!orgId) {
      const org = await resolveOrganization(supabase, user, profile);
      orgId = org?.id;
    }

    if (!orgId) {
      return errorResponse('Identitas organisasi tidak ditemukan.', 'ORG_NOT_FOUND', 404);
    }

    // 2. Fetch active subscription
    const { data: sub, error: subErr } = await supabaseAdmin
      .from('organization_subscriptions')
      .select('current_tier, expires_at, grace_period_ends_at, extra_branches_unit_price, extra_cashiers_unit_price')
      .eq('organization_id', orgId)
      .maybeSingle();

    if (subErr || !sub) {
      return errorResponse('Langganan organisasi tidak ditemukan.', 'SUBSCRIPTION_NOT_FOUND', 404);
    }

    const branchUnitPrice = parseFloat(sub.extra_branches_unit_price) || 100000;
    const cashierUnitPrice = parseFloat(sub.extra_cashiers_unit_price) || 20000;

    // 3. Co-Termination Proration Formula
    const expiresAt = new Date(sub.expires_at || Date.now());
    const now = new Date();
    const msDiff = expiresAt.getTime() - now.getTime();
    const sisaHari = Math.max(0, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));

    let proratedBranchPrice = branchUnitPrice;
    let proratedCashierPrice = cashierUnitPrice;

    if (sisaHari > 0) {
      // Dibulatkan ke ribuan terdekat
      proratedBranchPrice = Math.round(((branchUnitPrice / 30) * sisaHari) / 1000) * 1000;
      proratedCashierPrice = Math.round(((cashierUnitPrice / 30) * sisaHari) / 1000) * 1000;
    }

    const totalBranchCost = branchesCount * proratedBranchPrice;
    const totalCashierCost = cashiersCount * proratedCashierPrice;
    const grandTotal = totalBranchCost + totalCashierCost;

    return successResponse({
      sisaHari,
      branchUnitPrice,
      cashierUnitPrice,
      proratedBranchPrice,
      proratedCashierPrice,
      totalBranchCost,
      totalCashierCost,
      grandTotal,
      coTerminationDate: sub.expires_at,
      currentTier: sub.current_tier,
    });
  } catch (error) {
    console.error('[POST /api/v1/billing/addons/calculate]', error);
    return errorResponse(`Gagal menghitung prorasi add-on: ${error.message}`, 'SERVER_ERROR', 500);
  }
});
