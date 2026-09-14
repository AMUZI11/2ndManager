import { withAuthSupabase, errorResponse, successResponse, resolveOrganization } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limiter';

const TIER_PRICES = {
  SUPERVISOR: 49000,
  MANAJER: 149000,
  EKSEKUTIF: 399000,
};

export const POST = withAuthSupabase(async (request, context, { user, profile, supabase }) => {
  const rateLimit = checkRateLimit(request, { limit: 10, windowMs: 60 * 1000, identifier: 'promo-validate' });
  if (rateLimit.isRateLimited) {
    return createRateLimitResponse(rateLimit);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { code, tierId = 'MANAJER', durationMonths = 1, orgId: explicitOrgId } = body;

    if (!code || typeof code !== 'string') {
      return errorResponse('Kode promo wajib diisi.', 'VALIDATION_ERROR', 400);
    }

    const cleanCode = code.trim().toUpperCase();
    const cleanTier = (tierId || 'MANAJER').toUpperCase();
    const months = Math.max(1, parseInt(durationMonths) || 1);

    // 1. Selesaikan organisasi
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

    // 2. Ambil data kode promo
    const { data: promo, error: promoErr } = await supabaseAdmin
      .from('promo_codes')
      .select('*')
      .eq('code', cleanCode)
      .maybeSingle();

    if (promoErr || !promo) {
      return errorResponse('Kode promo tidak ditemukan.', 'PROMO_NOT_FOUND', 404);
    }

    // 3. Validasi status aktif
    if (!promo.is_active) {
      return errorResponse('Kode promo sudah tidak aktif atau dinonaktifkan.', 'PROMO_INACTIVE', 400);
    }

    // 4. Validasi tanggal kedaluwarsa
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      return errorResponse('Masa berlaku kode promo ini telah habis.', 'PROMO_EXPIRED', 400);
    }

    // 5. Validasi batas kuota klaim global
    if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
      return errorResponse('Kuota penggunaan kode promo ini sudah habis.', 'PROMO_QUOTA_EXCEEDED', 400);
    }

    // 6. Validasi kuota per organisasi jika org diketahui
    if (org?.id) {
      const { count, error: countErr } = await supabaseAdmin
        .from('promo_code_redemptions')
        .select('id', { count: 'exact', head: true })
        .eq('promo_code_id', promo.id)
        .eq('organization_id', org.id);

      if (!countErr && count !== null && count >= (promo.max_uses_per_org || 1)) {
        return errorResponse('Toko / Organisasi Anda sudah pernah menggunakan kode promo ini.', 'PROMO_ALREADY_USED', 400);
      }
    }

    // 7. Hitung harga dan diskon
    const unitPrice = TIER_PRICES[cleanTier] || TIER_PRICES.MANAJER;
    const basePrice = unitPrice * months;

    // Cek min_spend
    if (promo.min_spend && basePrice < Number(promo.min_spend)) {
      return errorResponse(
        `Pembelian minimal untuk kode promo ini adalah Rp ${Number(promo.min_spend).toLocaleString('id-ID')}.`,
        'MIN_SPEND_NOT_MET',
        400
      );
    }

    let discountAmount = 0;
    let finalPrice = basePrice;
    let bonusDays = 0;
    let targetTier = cleanTier;

    const discountValue = Number(promo.discount_value) || 0;

    switch (promo.discount_type) {
      case 'PERCENTAGE':
        discountAmount = Math.round(basePrice * (discountValue / 100));
        finalPrice = Math.max(0, basePrice - discountAmount);
        break;
      case 'FIXED_AMOUNT':
        discountAmount = Math.min(basePrice, discountValue);
        finalPrice = Math.max(0, basePrice - discountAmount);
        break;
      case 'BONUS_DAYS':
        bonusDays = Math.round(discountValue);
        finalPrice = basePrice;
        break;
      case 'TIER_OVERRIDE':
        if (promo.target_tier) {
          targetTier = promo.target_tier.toUpperCase();
        }
        finalPrice = basePrice;
        break;
      default:
        break;
    }

    return successResponse({
      valid: true,
      promoId: promo.id,
      code: promo.code,
      description: promo.description,
      discountType: promo.discount_type,
      discountValue: discountValue,
      discountAmount,
      basePrice,
      finalPrice,
      bonusDays,
      targetTier,
      unitPrice,
      durationMonths: months,
      message: `Kode promo ${promo.code} berhasil diterapkan!`,
    });
  } catch (error) {
    console.error('[POST /api/v1/billing/promo/validate]', error);
    return errorResponse('Terjadi kesalahan saat memvalidasi kode promo.', 'SERVER_ERROR', 500);
  }
});
