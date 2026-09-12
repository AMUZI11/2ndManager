import { withAuth, errorResponse, successResponse, resolveOrganization } from '@/lib/auth-helpers';
import { evaluatePP55Compliance } from '@/utils/taxEngine';

export const GET = withAuth(async (request, context, { user, profile, supabase }) => {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString(), 10);

    const org = await resolveOrganization(supabase, user, profile);
    if (!org) {
      return errorResponse('Organisasi tidak ditemukan untuk pengguna ini', 'ORG_NOT_FOUND', 404);
    }

    // Ambil atau buat tax profile
    let { data: taxProfile } = await supabase
      .from('organization_tax_profiles')
      .select('*')
      .eq('organization_id', org.id)
      .eq('tax_year', year)
      .maybeSingle();

    if (!taxProfile) {
      const { data: newProfile } = await supabase
        .from('organization_tax_profiles')
        .insert({
          organization_id: org.id,
          tax_year: year,
          npwp_number: '00.000.000.0-000.000',
          npwp_name: org.name || 'Wajib Pajak Toko',
          is_corporate: false,
          initial_capital: 10000000,
          current_accumulated_turnover: 0
        })
        .select()
        .single();
      taxProfile = newProfile;
    }

    // Panggil RPC Stored Procedure
    const { data: rpcResult, error: rpcError } = await supabase.rpc('calculate_sanitized_annual_dpp', {
      p_org_id: org.id,
      p_year: year
    });

    if (rpcError) {
      console.error('[Tax RPC Error]', rpcError);
      // Fallback engine evaluation jika RPC error
      const compliance = evaluatePP55Compliance({
        annualSanitizedDpp: Number(taxProfile?.current_accumulated_turnover || 0),
        isCorporate: Boolean(taxProfile?.is_corporate),
        monthlyTurnovers: []
      });
      return successResponse({
        organization: org,
        taxProfile,
        report: compliance,
        isRpcFallback: true
      });
    }

    // Gabungkan dengan rekomendasi billing DJP dari taxEngine
    const compliance = evaluatePP55Compliance({
      annualSanitizedDpp: Number(rpcResult.sanitized_dpp || 0),
      isCorporate: Boolean(rpcResult.is_corporate),
      monthlyTurnovers: rpcResult.months || []
    });

    return successResponse({
      organization: org,
      taxProfile,
      report: {
        ...rpcResult,
        billingCodeRecommendation: compliance.billingCodeRecommendation,
        badgeLabel: compliance.badgeLabel,
        alertMessage: compliance.alertMessage
      }
    });
  } catch (err) {
    console.error('[GET /api/v1/reports/tax Error]', err);
    return errorResponse(err.message || 'Gagal memuat kalkulasi pajak', 'TAX_CALC_FAILED', 500);
  }
});

export const POST = withAuth(async (request, context, { user, profile, supabase }) => {
  try {
    const body = await request.json();
    const {
      tax_year = new Date().getFullYear(),
      npwp_number = '00.000.000.0-000.000',
      npwp_name = 'Wajib Pajak Toko',
      is_corporate = false,
      initial_capital = 10000000
    } = body;

    const org = await resolveOrganization(supabase, user, profile);
    if (!org) {
      return errorResponse('Organisasi tidak ditemukan', 'ORG_NOT_FOUND', 404);
    }

    const { data: updatedProfile, error: upsertError } = await supabase
      .from('organization_tax_profiles')
      .upsert(
        {
          organization_id: org.id,
          tax_year: parseInt(tax_year, 10),
          npwp_number: String(npwp_number).trim(),
          npwp_name: String(npwp_name).trim(),
          is_corporate: Boolean(is_corporate),
          initial_capital: Number(initial_capital) || 10000000,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'organization_id, tax_year' }
      )
      .select()
      .single();

    if (upsertError) {
      throw upsertError;
    }

    // Refresh kalkulasi pajak setelah update profil
    await supabase.rpc('calculate_sanitized_annual_dpp', {
      p_org_id: org.id,
      p_year: parseInt(tax_year, 10)
    });

    return successResponse({
      profile: updatedProfile,
      message: 'Profil perpajakan berhasil diperbarui.'
    });
  } catch (err) {
    console.error('[POST /api/v1/reports/tax Error]', err);
    return errorResponse(err.message || 'Gagal menyimpan profil pajak', 'TAX_SAVE_FAILED', 500);
  }
});
