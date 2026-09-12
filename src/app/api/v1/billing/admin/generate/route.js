import { errorResponse, successResponse } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateLicenseToken, getServerSecret } from '@/utils/licenseEngine';

export const POST = async (request) => {
  try {
    const masterKeyHeader = request.headers.get('x-master-key');
    const serverSecret = getServerSecret();

    // Verifikasi otorisasi master key
    const isAuthorized =
      masterKeyHeader &&
      (masterKeyHeader === serverSecret ||
        masterKeyHeader === process.env.SUPABASE_SERVICE_ROLE_KEY ||
        masterKeyHeader === process.env.LICENSE_SECRET_KEY);

    if (!isAuthorized) {
      return errorResponse(
        'Akses ditolak. Header x-master-key tidak valid atau tidak disertakan.',
        'UNAUTHORIZED_ADMIN',
        401
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      tierId = 'SUPERVISOR',
      durationDays = 30,
      count = 1,
      notes = 'Batch Cetak Lisensi Mandiri',
    } = body;

    const normalizedTier = (tierId || '').toUpperCase().trim();
    if (!['SUPERVISOR', 'MANAJER', 'EKSEKUTIF'].includes(normalizedTier)) {
      return errorResponse(
        `Tier ID '${tierId}' tidak valid. Pilihan: SUPERVISOR, MANAJER, EKSEKUTIF.`,
        'INVALID_TIER',
        400
      );
    }

    const safeCount = Math.min(Math.max(1, parseInt(count, 10) || 1), 100);
    const safeDuration = Math.max(1, parseInt(durationDays, 10) || 30);

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
        notes: notes || null,
        created_at: new Date().toISOString(),
      });
    }

    // Insert ke tabel license_tokens via Supabase Admin
    const { data: inserted, error: dbError } = await supabaseAdmin
      .from('license_tokens')
      .insert(dbPayloads)
      .select('id, token_code, tier_id, duration_days, status, notes, created_at');

    if (dbError) {
      console.error('[Admin Generate DB Error]', dbError);
      return errorResponse(dbError.message || 'Gagal menyimpan voucher ke database.', 'DB_ERROR', 500);
    }

    return successResponse({
      count: inserted?.length || generatedTokens.length,
      tier: normalizedTier,
      durationDays: safeDuration,
      tokens: inserted || generatedTokens,
    });
  } catch (err) {
    console.error('[Admin Generate Token Error]', err);
    return errorResponse(err.message || 'Terjadi kesalahan saat memproduksi token voucher.', 'INTERNAL_ERROR', 500);
  }
};
