// src/app/api/v1/admin/vouchers/route.js
// Superadmin Authenticated Route for Cryptographic License Voucher Minting & History
import { withAdminAuth } from '@/lib/admin-auth';
import { successResponse, errorResponse } from '@/lib/auth-helpers';
import { generateLicenseToken, getServerSecret } from '@/utils/licenseEngine';

export const GET = withAdminAuth(async (request, context, adminContext) => {
  const { supabaseAdmin } = adminContext;

  try {
    const { data: tokens, error } = await supabaseAdmin
      .from('license_tokens')
      .select('id, token_code, tier_id, duration_days, status, redeemed_by, redeemed_at, notes, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    return successResponse({
      tokens: tokens || [],
    });
  } catch (err) {
    console.error('[GET /api/v1/admin/vouchers Error]', err);
    return errorResponse('Gagal memuat riwayat voucher lisensi: ' + err.message, 'DB_ERROR', 500);
  }
});

export const POST = withAdminAuth(async (request, context, adminContext) => {
  const { supabaseAdmin, user } = adminContext;

  try {
    const body = await request.json().catch(() => ({}));
    const {
      tierId = 'SUPERVISOR',
      durationDays = 30,
      count = 1,
      notes = 'Penerbitan Superadmin Console',
    } = body;

    const normalizedTier = (tierId || '').toUpperCase().trim();
    if (!['SUPERVISOR', 'MANAJER', 'EKSEKUTIF'].includes(normalizedTier)) {
      return errorResponse(
        `Tier ID '${tierId}' tidak valid. Pilihan: SUPERVISOR, MANAJER, EKSEKUTIF.`,
        'INVALID_TIER',
        400
      );
    }

    const safeCount = Math.min(Math.max(1, parseInt(count, 10) || 1), 50);
    const safeDuration = Math.max(1, parseInt(durationDays, 10) || 30);
    const serverSecret = getServerSecret();

    const generatedTokens = [];
    const dbPayloads = [];

    for (let i = 0; i < safeCount; i++) {
      const token = generateLicenseToken(normalizedTier, safeDuration, serverSecret);
      generatedTokens.push(token);
      dbPayloads.push({
        token_code: token.tokenCode,
        tier_id: token.tierId,
        duration_days: token.durationDays,
        hmac_signature: token.fullHmac,
        status: 'UNUSED',
        notes: `${notes} (Oleh: ${user.email})`,
        created_at: new Date().toISOString(),
      });
    }

    const { data: inserted, error: dbError } = await supabaseAdmin
      .from('license_tokens')
      .insert(dbPayloads)
      .select('id, token_code, tier_id, duration_days, status, notes, created_at');

    if (dbError) throw dbError;

    return successResponse({
      count: inserted?.length || generatedTokens.length,
      tier: normalizedTier,
      durationDays: safeDuration,
      tokens: inserted || generatedTokens,
    });
  } catch (err) {
    console.error('[POST /api/v1/admin/vouchers Error]', err);
    return errorResponse(err.message || 'Gagal menerbitkan voucher lisensi kriptografis.', 'INTERNAL_ERROR', 500);
  }
});
