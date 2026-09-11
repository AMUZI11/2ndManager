import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request, { params }) {
  try {
    const { checksum } = await params;
    if (!checksum || checksum.length < 10) {
      return NextResponse.json(
        { verified: false, message: 'Format kode verifikasi tidak valid' },
        { status: 400 }
      );
    }

    const normalizedHash = checksum.toUpperCase().trim();
    const supabase = await createServerSupabaseClient();

    const { data: seal, error } = await supabase
      .from('audit_verification_seals')
      .select(`
        id,
        document_type,
        checksum_hash,
        payload_summary,
        generated_at,
        expires_at,
        organizations (
          id,
          name,
          tier_id
        )
      `)
      .eq('checksum_hash', normalizedHash)
      .maybeSingle();

    if (error || !seal) {
      return NextResponse.json(
        {
          verified: false,
          checksum: normalizedHash,
          message: 'Stempel verifikasi digital tidak ditemukan dalam basis data audit 2ndManager. Dokumen ini mungkin palsu atau belum pernah diverifikasi.'
        },
        { status: 404 }
      );
    }

    const now = new Date();
    const expiresDate = new Date(seal.expires_at);
    const isExpired = now > expiresDate;

    return NextResponse.json({
      verified: true,
      checksum: seal.checksum_hash,
      documentType: seal.document_type,
      organizationName: seal.organizations?.name || seal.payload_summary?.organization_name || 'Organisasi Terdaftar',
      generatedAt: seal.generated_at,
      expiresAt: seal.expires_at,
      isExpired,
      summary: {
        fiscalYear: seal.payload_summary?.fiscal_year,
        reportingMonth: seal.payload_summary?.reporting_month,
        branchName: seal.payload_summary?.branch_name,
        isBalanced: seal.payload_summary?.is_balanced,
        netTurnover: seal.payload_summary?.net_turnover,
        netOperatingProfit: seal.payload_summary?.net_operating_profit,
        totalAssets: seal.payload_summary?.total_assets,
        kurScore: seal.payload_summary?.kur_readiness_score,
        recommendedCeiling: seal.payload_summary?.recommended_ceiling,
        kurTier: seal.payload_summary?.kur_tier
      },
      auditNotice: 'Dokumen ini telah divalidasi keabsahannya oleh Sistem Audit 2ndManager sesuai regulasi PP 55/2022 & SAK EMKM.'
    });
  } catch (err) {
    console.error('[Public Verify Seal API Error]', err);
    return NextResponse.json(
      { verified: false, message: 'Terjadi kesalahan sistem saat memvalidasi stempel' },
      { status: 500 }
    );
  }
}
