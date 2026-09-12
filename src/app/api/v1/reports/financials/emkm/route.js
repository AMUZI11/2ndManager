import { withAuth, errorResponse, successResponse, resolveOrganization } from '@/lib/auth-helpers';
import { calculateBankRatios, validateBalanceSheet } from '@/utils/emkmEngine';

export const GET = withAuth(async (request, context, { user, profile, supabase }) => {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const year = parseInt(searchParams.get('year') || now.getFullYear().toString(), 10);
    const month = parseInt(searchParams.get('month') || (now.getMonth() + 1).toString(), 10);
    const branchId = searchParams.get('branch_id') || null;

    const org = await resolveOrganization(supabase, user, profile, branchId);
    if (!org) {
      return errorResponse('Organisasi tidak ditemukan', 'ORG_NOT_FOUND', 404);
    }

    // Ambil daftar cabang untuk filter dropdown
    const { data: branches } = await supabase
      .from('branches')
      .select('id, branch_name, branch_code, is_main_branch')
      .eq('organization_id', org.id)
      .eq('is_active', true)
      .order('is_main_branch', { ascending: false });

    // Eksekusi RPC SAK EMKM
    const { data: emkmResult, error: rpcError } = await supabase.rpc('generate_sak_emkm_statements', {
      p_org_id: org.id,
      p_branch_id: branchId && branchId !== 'ALL' ? branchId : null,
      p_year: year,
      p_month: month
    });

    if (rpcError) {
      console.error('[EMKM RPC Error]', rpcError);
      return errorResponse(rpcError.message || 'Gagal menghasilkan laporan SAK EMKM', 'EMKM_RPC_FAILED', 500);
    }

    // Validasi keseimbangan neraca
    const bs = emkmResult.balance_sheet || {};
    const balanceCheck = validateBalanceSheet({
      totalAssets: bs.total_assets || 0,
      totalLiabilities: bs.liabilities?.total_liabilities || 0,
      totalEquity: bs.equity?.total_equity || 0
    });

    // Rasio kelayakan perbankan
    const inc = emkmResult.income_statement || {};
    const bankRatios = calculateBankRatios({
      currentAssets: bs.current_assets?.total_current_assets || 0,
      currentLiabilities: bs.liabilities?.total_liabilities || 0,
      netSalesTurnover: inc.net_sales_turnover || 0,
      netOperatingProfit: inc.net_operating_profit || 0,
      totalAssets: bs.total_assets || 0,
      totalEquity: bs.equity?.total_equity || 0
    });

    // Ambil 12-bulan komparatif transaksi untuk visualisasi tren tahunan
    const startOfYear = new Date(year, 0, 1).toISOString();
    const endOfYear = new Date(year, 11, 31, 23, 59, 59).toISOString();

    const { data: yearTxData } = await supabase
      .from('transactions')
      .select('total_amount, created_at, status, is_void')
      .in('status', ['COMPLETED', 'LUNAS'])
      .gte('created_at', startOfYear)
      .lte('created_at', endOfYear);

    const validTx = (yearTxData || []).filter(t => !t.is_void);
    const monthlySeries = Array.from({ length: 12 }, (_, i) => {
      const mNum = i + 1;
      const mTx = validTx.filter(t => new Date(t.created_at).getMonth() === i);
      const revenue = mTx.reduce((acc, t) => acc + Number(t.total_amount || 0), 0);
      const estimatedCogs = Math.round(revenue * 0.75); // estimasi HPP wajar warung 75%
      const grossProfit = revenue - estimatedCogs;
      const estimatedOpex = Math.round(revenue * 0.12);
      const netProfit = grossProfit - estimatedOpex;

      return {
        month: mNum,
        revenue,
        cogs: estimatedCogs,
        grossProfit,
        netProfit,
        marginPct: revenue > 0 ? Number(((netProfit / revenue) * 100).toFixed(1)) : 0
      };
    });

    return successResponse({
      organization: org,
      branches: branches || [],
      selectedBranchId: branchId,
      period: { year, month },
      statements: emkmResult,
      balanceCheck,
      bankRatios,
      monthlySeries
    });
  } catch (err) {
    console.error('[GET /api/v1/reports/financials/emkm Error]', err);
    return errorResponse(err.message || 'Gagal memuat laporan keuangan EMKM', 'EMKM_FETCH_FAILED', 500);
  }
});
