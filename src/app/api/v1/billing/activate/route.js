import { withBossOnly, errorResponse, successResponse } from '@/lib/auth-helpers';
import { verifyLicenseTokenLocally } from '@/utils/licenseEngine';

export const POST = withBossOnly(async (request, context, { user, profile, supabase }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const { tokenCode } = body;

    if (!tokenCode || typeof tokenCode !== 'string') {
      return errorResponse('Kode lisensi voucher wajib diisi.', 'INVALID_PAYLOAD', 400);
    }

    const cleanToken = tokenCode.trim().toUpperCase();

    // 1. Verifikasi lokal awal (format regex & struktur segmen)
    const localCheck = verifyLicenseTokenLocally(cleanToken);
    if (!localCheck.isValid) {
      return errorResponse(
        localCheck.reason || 'Kode voucher tidak valid atau tanda tangan kriptografis cacat.',
        'INVALID_TOKEN_FORMAT',
        400
      );
    }

    // 2. Ambil atau inisialisasi organisasi milik pemilik toko
    let { data: org } = await supabase
      .from('organizations')
      .select('id, name, tier_id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!org) {
      const { data: shop } = await supabase
        .from('shops')
        .select('id, name')
        .eq('owner_id', user.id)
        .maybeSingle();

      const orgName = shop?.name || `Organisasi ${profile?.username || 'Owner'}`;
      const { data: newOrg, error: orgErr } = await supabase
        .from('organizations')
        .insert({
          owner_id: user.id,
          name: orgName,
          tier_id: 'MAGANG',
        })
        .select('id, name, tier_id')
        .single();

      if (orgErr || !newOrg) {
        return errorResponse('Gagal menyiapkan profil organisasi pemilik.', 'ORG_INIT_ERROR', 500);
      }
      org = newOrg;
    }

    // 3. Eksekusi Stored Procedure Atomik (FOR UPDATE)
    const { data: redeemResult, error: rpcError } = await supabase.rpc('redeem_license_token', {
      p_org_id: org.id,
      p_token_code: cleanToken,
      p_user_id: user.id,
    });

    if (rpcError) {
      return errorResponse(rpcError.message || 'Gagal mengaktifkan voucher lisensi.', 'REDEEM_FAILED', 400);
    }

    // 4. Catat audit trail ke log sistem jika tabel logs tersedia
    try {
      await supabase.from('logs').insert({
        shop_id: profile.shop_id || null,
        user_id: user.id,
        action: 'LICENSE_REDEEMED',
        details: {
          token_code: cleanToken,
          tier: redeemResult?.tier,
          expires_at: redeemResult?.expires_at,
          organization_id: org.id,
        },
      });
    } catch {}

    return successResponse({
      ...redeemResult,
      organization_name: org.name,
    });
  } catch (err) {
    console.error('[Billing Activate Error]', err);
    return errorResponse(err.message || 'Terjadi kesalahan sistem saat aktivasi lisensi.', 'INTERNAL_ERROR', 500);
  }
});
