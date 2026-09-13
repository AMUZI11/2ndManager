import { withAdminAuth, logAdminAudit } from '@/lib/admin-auth';
import { errorResponse, successResponse } from '@/lib/auth-helpers';
import { generateLicenseToken, getServerSecret } from '@/utils/licenseEngine';

export const GET = withAdminAuth(async (request, context, adminContext) => {
  const { supabaseAdmin } = adminContext;
  const { searchParams } = new URL(request.url);

  const statusFilter = searchParams.get('status') || 'ALL';
  const tierFilter = searchParams.get('tier') || 'ALL';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '30', 10);
  const offset = (page - 1) * limit;

  try {
    let query = supabaseAdmin
      .from('license_tokens')
      .select('*', { count: 'exact' });

    if (statusFilter !== 'ALL') {
      query = query.eq('status', statusFilter);
    }

    if (tierFilter !== 'ALL') {
      query = query.eq('tier_id', tierFilter);
    }

    const { data: tokens, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return successResponse({
      tokens: tokens || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    console.error('[GET /api/v1/admin/vouchers]', err);
    return errorResponse('Gagal memuat daftar voucher token.', 'SERVER_ERROR', 500);
  }
});

export const POST = withAdminAuth(async (request, context, adminContext) => {
  const { adminUser, supabaseAdmin } = adminContext;

  try {
    const body = await request.json().catch(() => ({}));
    const {
      tierId = 'SUPERVISOR',
      durationDays = 30,
      count = 1,
      notes = 'Pencetakan Lisensi via Admin Dashboard',
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
        notes: notes || null,
        created_at: new Date().toISOString(),
      });
    }

    const { data: inserted, error: dbError } = await supabaseAdmin
      .from('license_tokens')
      .insert(dbPayloads)
      .select('id, token_code, tier_id, duration_days, status, notes, created_at');

    if (dbError) {
      console.error('[Admin Voucher Minting DB Error]', dbError);
      return errorResponse(dbError.message || 'Gagal menyimpan voucher ke database.', 'DB_ERROR', 500);
    }

    // Catat ke immutable audit log
    await logAdminAudit({
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      actionType: 'VOUCHER_MINTED',
      reason: `Mencetak ${safeCount} token voucher tier ${normalizedTier} durasi ${safeDuration} hari. Notes: ${notes}`,
      metadata: {
        tier: normalizedTier,
        durationDays: safeDuration,
        count: safeCount,
        sampleToken: inserted?.[0]?.token_code,
      },
    });

    return successResponse({
      count: inserted?.length || generatedTokens.length,
      tier: normalizedTier,
      durationDays: safeDuration,
      tokens: inserted || generatedTokens,
    });
  } catch (err) {
    console.error('[POST /api/v1/admin/vouchers]', err);
    return errorResponse(err.message || 'Terjadi kesalahan saat mencetak token voucher.', 'INTERNAL_ERROR', 500);
  }
});
