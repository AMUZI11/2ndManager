import { withAuthSupabase, errorResponse, successResponse, resolveOrganization } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limiter';
import { normalizeTierKey, toDbTierKey, getCanonicalTier, ADDON_PRICING } from '@/config/tierMapping';

export const POST = withAuthSupabase(async (request, context, { user, profile, supabase }) => {
  const rateLimit = checkRateLimit(request, { limit: 30, windowMs: 60 * 1000, identifier: 'billing-calculate' });
  if (rateLimit.isRateLimited) {
    return createRateLimitResponse(rateLimit);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const {
      orgId: explicitOrgId,
      targetTier = 'USAHA_BERKEMBANG',
      extraBranchesCount = 0,
      extraCashiersCount = 0,
      promoCode = '',
      durationMonths = 1,
      isPureAddon = false,
    } = body;

    const branchesCount = Math.max(0, parseInt(extraBranchesCount, 10) || 0);
    const cashiersCount = Math.max(0, parseInt(extraCashiersCount, 10) || 0);
    const months = Math.max(1, parseInt(durationMonths, 10) || 1);

    // 1. Resolve organization
    let org = null;
    if (explicitOrgId) {
      const { data: explicitOrg } = await supabaseAdmin
        .from('organizations')
        .select('id, name')
        .eq('id', explicitOrgId)
        .maybeSingle();
      org = explicitOrg;
    }
    if (!org) {
      org = await resolveOrganization(supabase, user, profile);
    }

    const orgId = org?.id;

    // 2. Fetch active subscription for proration and status
    let currentSub = null;
    if (orgId) {
      const { data: sub } = await supabaseAdmin
        .from('organization_subscriptions')
        .select('current_tier, expires_at, grace_period_ends_at, extra_branches_unit_price, extra_cashiers_unit_price')
        .eq('organization_id', orgId)
        .maybeSingle();
      currentSub = sub;
    }

    const branchMonthlyRate = ADDON_PRICING.BRANCH.monthlyUnitPrice; // 150000
    const cashierMonthlyRate = ADDON_PRICING.CASHIER.monthlyUnitPrice; // 40000

    // 3. Sisa hari siklus untuk Prorasi Co-Termination
    let sisaHari = 0;
    let coTerminationDate = null;
    if (currentSub?.expires_at) {
      coTerminationDate = currentSub.expires_at;
      const expiresAt = new Date(currentSub.expires_at);
      const now = new Date();
      const msDiff = expiresAt.getTime() - now.getTime();
      sisaHari = Math.max(0, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));
    }

    const pureAddonMode = isPureAddon || targetTier === 'ADDON' || targetTier === 'ADD-ON' || durationMonths === 0;

    // CASE A: Pembelian Add-On Murni di Tengah Siklus (Prorasi Co-Termination)
    if (pureAddonMode) {
      const effectiveSisaHari = sisaHari > 0 ? sisaHari : 30;
      const dailyBranchRate = branchMonthlyRate / 30; // 5000
      const dailyCashierRate = cashierMonthlyRate / 30; // 1333.33

      // Dibulatkan ke ribuan terdekat
      const proratedBranchUnitPrice = Math.round((dailyBranchRate * effectiveSisaHari) / 1000) * 1000;
      const proratedCashierUnitPrice = Math.round((dailyCashierRate * effectiveSisaHari) / 1000) * 1000;

      const totalBranchCost = branchesCount * proratedBranchUnitPrice;
      const totalCashierCost = cashiersCount * proratedCashierUnitPrice;
      const grandTotal = totalBranchCost + totalCashierCost;

      return successResponse({
        mode: 'PURE_ADDON',
        targetTier: 'ADDON',
        canonicalTier: normalizeTierKey(currentSub?.current_tier || 'RINTISAN'),
        legacyTier: toDbTierKey(currentSub?.current_tier || 'MAGANG'),
        durationMonths: 0,
        sisaHari: effectiveSisaHari,
        coTerminationDate,
        branchUnitPrice: branchMonthlyRate,
        cashierUnitPrice: cashierMonthlyRate,
        proratedBranchUnitPrice,
        proratedCashierUnitPrice,
        extraBranchesCount: branchesCount,
        extraCashiersCount: cashiersCount,
        branchCost: totalBranchCost,
        cashierCost: totalCashierCost,
        baseTierMonthly: 0,
        baseTierPrice: 0,
        subtotal: grandTotal,
        discountAmount: 0,
        grandTotal,
        appliedPromo: null,
      });
    }

    // CASE B: Perpanjangan Penuh / Paket Baru + Add-on Konsolidasi
    const canonicalKey = normalizeTierKey(targetTier);
    const tierDef = getCanonicalTier(canonicalKey);
    const baseTierMonthly = tierDef.price; // 0, 50000, 150000, 350000
    const baseTierPrice = baseTierMonthly * months;

    const totalBranchCost = branchesCount * branchMonthlyRate * months;
    const totalCashierCost = cashiersCount * cashierMonthlyRate * months;
    const totalAddonCost = totalBranchCost + totalCashierCost;

    const subtotal = baseTierPrice + totalAddonCost;

    // Evaluasi Promo Code jika tersedia
    let discountAmount = 0;
    let appliedPromo = null;

    if (promoCode && typeof promoCode === 'string' && promoCode.trim()) {
      const cleanCode = promoCode.trim().toUpperCase();
      const { data: promo } = await supabaseAdmin
        .from('promo_codes')
        .select('*')
        .eq('code', cleanCode)
        .eq('is_active', true)
        .maybeSingle();

      if (promo) {
        const isNotExpired = !promo.expires_at || new Date(promo.expires_at) >= new Date();
        const hasGlobalQuota = promo.max_uses === null || promo.current_uses < promo.max_uses;
        const meetsMinSpend = !promo.min_spend || subtotal >= Number(promo.min_spend);

        if (isNotExpired && hasGlobalQuota && meetsMinSpend) {
          const discountVal = Number(promo.discount_value) || 0;
          if (promo.discount_type === 'PERCENTAGE') {
            discountAmount = Math.round((subtotal * discountVal) / 100);
            if (promo.max_discount_amount) {
              discountAmount = Math.min(discountAmount, Number(promo.max_discount_amount));
            }
          } else if (promo.discount_type === 'FIXED_AMOUNT') {
            discountAmount = Math.min(discountVal, subtotal);
          }

          appliedPromo = {
            promoId: promo.id,
            code: promo.code,
            discountType: promo.discount_type,
            discountValue: discountVal,
            bonusDays: promo.bonus_days || 0,
            description: promo.description || '',
          };
        }
      }
    }

    const grandTotal = Math.max(0, subtotal - discountAmount);

    return successResponse({
      mode: 'FULL_PACKAGE',
      canonicalTier: canonicalKey,
      legacyTier: toDbTierKey(canonicalKey),
      tierDisplayName: tierDef.displayName,
      durationMonths: months,
      baseTierMonthly,
      baseTierPrice,
      branchUnitPrice: branchMonthlyRate,
      cashierUnitPrice: cashierMonthlyRate,
      extraBranchesCount: branchesCount,
      extraCashiersCount: cashiersCount,
      branchCost: totalBranchCost,
      cashierCost: totalCashierCost,
      addonTotalCost: totalAddonCost,
      subtotal,
      discountAmount,
      appliedPromo,
      grandTotal,
    });
  } catch (error) {
    console.error('[POST /api/v1/billing/calculate]', error);
    return errorResponse(`Gagal menghitung billing konsolidasi: ${error.message}`, 'SERVER_ERROR', 500);
  }
});
