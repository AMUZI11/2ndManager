import { withAuth, errorResponse, successResponse, resolveOrganization } from '@/lib/auth-helpers';
import { generateDocumentSealHash, buildVerificationUrl } from '@/utils/sealSecurity';
import { calculateBankRatios } from '@/utils/emkmEngine';

export const POST = withAuth(async (request, context, { user, profile, supabase }) => {
  try {
    const body = await request.json();
    const now = new Date();
    const year = parseInt(body.year || now.getFullYear().toString(), 10);
    const month = parseInt(body.month || (now.getMonth() + 1).toString(), 10);
    const branchId = body.branch_id || null;

    // Ambil organisasi
    const org = await resolveOrganization(supabase, user, profile, branchId);

    if (!org) {
      return errorResponse('Organisasi tidak ditemukan', 'ORG_NOT_FOUND', 404);
    }

    // Ambil profil pajak
    const { data: taxProfile } = await supabase
      .from('organization_tax_profiles')
      .select('*')
      .eq('organization_id', org.id)
      .eq('tax_year', year)
      .maybeSingle();

    // Ambil laporan SAK EMKM
    const { data: emkmData, error: emkmError } = await supabase.rpc('generate_sak_emkm_statements', {
      p_org_id: org.id,
      p_branch_id: branchId,
      p_year: year,
      p_month: month
    });

    if (emkmError) {
      throw emkmError;
    }

    // Ambil detail cabang jika ada
    let branchInfo = null;
    if (branchId) {
      const { data: br } = await supabase
        .from('branches')
        .select('*')
        .eq('id', branchId)
        .maybeSingle();
      branchInfo = br;
    }

    // Ambil data profil pemilik tanpa mengakses tabel users yang tidak ada
    const userProfile = {
      name: user?.user_metadata?.name || user?.user_metadata?.full_name || profile?.username || taxProfile?.npwp_name || 'Juragan Pemilik Toko',
      email: user?.email || '',
      phone: user?.user_metadata?.phone || user?.phone || ''
    };

    // Susun ringkasan integritas untuk stempel digital
    const bs = emkmData.balance_sheet || {};
    const inc = emkmData.income_statement || {};
    const bankRatios = calculateBankRatios({
      currentAssets: bs.current_assets?.total_current_assets || 0,
      currentLiabilities: bs.liabilities?.total_liabilities || 0,
      netSalesTurnover: inc.net_sales_turnover || 0,
      netOperatingProfit: inc.net_operating_profit || 0,
      totalAssets: bs.total_assets || 0,
      totalEquity: bs.equity?.total_equity || 0
    });

    const summaryPayload = {
      organization_id: org.id,
      organization_name: org.name,
      owner_name: userProfile?.name || 'Juragan Pemilik Toko',
      npwp: taxProfile?.npwp_number || '00.000.000.0-000.000',
      is_corporate: Boolean(taxProfile?.is_corporate),
      fiscal_year: year,
      reporting_month: month,
      branch_name: branchInfo?.branch_name || 'Konsolidasi Seluruh Cabang',
      net_turnover: inc.net_sales_turnover || 0,
      net_operating_profit: inc.net_operating_profit || 0,
      total_assets: bs.total_assets || 0,
      total_liabilities: bs.liabilities?.total_liabilities || 0,
      total_equity: bs.equity?.total_equity || 0,
      is_balanced: Boolean(bs.is_balanced),
      kur_readiness_score: bankRatios.kurScore,
      recommended_ceiling: bankRatios.recommendedCeiling,
      kur_tier: bankRatios.kurTier,
      timestamp: new Date().toISOString()
    };

    // Hitung SHA-256 Checksum Hash
    const checksumHash = await generateDocumentSealHash(summaryPayload);

    // Simpan ke audit_verification_seals
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: sealRecord, error: sealError } = await supabase
      .from('audit_verification_seals')
      .upsert(
        {
          organization_id: org.id,
          document_type: 'KUR_DOSSIER',
          checksum_hash: checksumHash,
          payload_summary: summaryPayload,
          expires_at: expiresAt
        },
        { onConflict: 'checksum_hash' }
      )
      .select()
      .single();

    if (sealError) {
      console.warn('[Seal Insert Warning]', sealError);
    }

    const verificationUrl = buildVerificationUrl(checksumHash);

    return successResponse({
      seal: {
        checksumHash,
        verificationUrl,
        expiresAt,
        generatedAt: sealRecord?.generated_at || new Date().toISOString()
      },
      dossierPayload: {
        organization: org,
        owner: userProfile,
        taxProfile,
        branch: branchInfo,
        emkmData,
        bankRatios,
        summaryPayload
      }
    });
  } catch (err) {
    console.error('[POST /api/v1/reports/kur-dossier/export Error]', err);
    return errorResponse(err.message || 'Gagal menerbitkan stempel berkas KUR', 'KUR_EXPORT_FAILED', 500);
  }
});
