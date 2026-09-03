import { withBossOnly, errorResponse, successResponse, checkSubscriptionActive } from '@/lib/auth-helpers';
import { canAccessFeature, checkQuotaLimit } from '@/lib/subscription';

export const GET = withBossOnly(async (request, context, { user, profile, supabase }) => {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const { data: userShop } = await supabase
      .from('user_shops').select('shop_id').eq('user_id', user.id).single();
    const shopId = userShop?.shop_id;
    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);

    // Date range filter
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    let startDate = fiveYearsAgo.toISOString().split('T')[0];
    let endDate = new Date().toISOString().split('T')[0];

    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    if (startDateParam && endDateParam) {
      startDate = startDateParam;
      endDate = endDateParam;
    } else if (month && year) {
      const s = new Date(parseInt(year), parseInt(month) - 1, 1);
      const e = new Date(parseInt(year), parseInt(month), 0);
      startDate = (s > fiveYearsAgo ? s : fiveYearsAgo).toISOString().split('T')[0];
      endDate = e.toISOString().split('T')[0];
    }

    // Fetch user subscription plan
    const { plan } = await checkSubscriptionActive(supabase, shopId);

    // Server-side date validation & reporting gating
    const diffDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 3600 * 24));
    const dayCheck = checkQuotaLimit(plan, diffDays, 'max_report_days');
    if (!dayCheck.allowed) {
      return errorResponse(
        `Rentang tanggal (${diffDays} hari) melebihi batas ${dayCheck.message}`,
        'LIMIT_EXCEEDED',
        403
      );
    }

    if (searchParams.get('export') === 'csv') {
      if (!canAccessFeature(plan, 'export_csv')) {
        return errorResponse(
          'Fitur Ekspor CSV Historis Tanpa Batas hanya tersedia untuk Paket PRO. Silakan upgrade paket Anda.',
          'LIMIT_EXCEEDED',
          403
        );
      }
    }

    // All transactions in range for this shop
    const { data: transactions, error: txErr } = await supabase
      .from('transactions')
      .select(`
        id, status, is_bonus, omzet_total, laba_total, amount_owed, customer_id, tanggal,
        transaction_items (product_type_snapshot, line_omzet, is_bonus_item)
      `)
      .eq('shop_id', shopId)
      .gte('tanggal', startDate)
      .lte('tanggal', endDate);

    if (txErr) throw txErr;

    // Aggregate
    let totalOmzetLunas = 0, totalLabaLunas = 0, totalPaid = 0, totalPiutang = 0;
    let omzetLM = 0, omzetBR = 0;
    const customerLunasMap = {}, customerPiutangMap = {};

    for (const tx of transactions) {
      if (tx.status === 'Lunas' && !tx.is_bonus) {
        totalOmzetLunas += Number(tx.omzet_total);
        totalLabaLunas += Number(tx.laba_total);
        totalPaid += Number(tx.amount_owed);
        if (tx.customer_id) {
          if (!customerLunasMap[tx.customer_id]) customerLunasMap[tx.customer_id] = { omzet: 0, laba: 0, paid: 0 };
          customerLunasMap[tx.customer_id].omzet += Number(tx.omzet_total);
          customerLunasMap[tx.customer_id].laba += Number(tx.laba_total);
          customerLunasMap[tx.customer_id].paid += Number(tx.amount_owed);
        }
        for (const item of tx.transaction_items || []) {
          if (!item.is_bonus_item) {
            if (item.product_type_snapshot === 'LM') omzetLM += Number(item.line_omzet);
            else if (item.product_type_snapshot === 'BR') omzetBR += Number(item.line_omzet);
          }
        }
      } else if (tx.status === 'Piutang') {
        totalPiutang += Number(tx.amount_owed);
        if (tx.customer_id) {
          if (!customerPiutangMap[tx.customer_id]) customerPiutangMap[tx.customer_id] = { piutang: 0 };
          customerPiutangMap[tx.customer_id].piutang += Number(tx.amount_owed);
        }
      }
    }

    // Customer list
    const { data: customers } = await supabase
      .from('customers')
      .select('id, nama')
      .eq('shop_id', shopId)
      .eq('is_deleted', false)
      .order('nama', { ascending: true });

    const by_customer = (customers || []).map(c => ({
      customer_id: c.id,
      nama: c.nama,
      omzet_lunas: customerLunasMap[c.id]?.omzet || 0,
      laba_lunas: customerLunasMap[c.id]?.laba || 0,
      piutang: customerPiutangMap[c.id]?.piutang || 0,
      paid: customerLunasMap[c.id]?.paid || 0,
    })).filter(c => c.omzet_lunas > 0 || c.piutang > 0);

    // Bonus log
    const { data: bonusGrants } = await supabase
      .from('bonus_grants')
      .select('*, customers(nama), transactions(nomor_bon)')
      .eq('shop_id', shopId)
      .gte('granted_at', startDate)
      .lte('granted_at', endDate)
      .order('granted_at', { ascending: false });

    return successResponse({
      period: { month: month ? parseInt(month) : null, year: year ? parseInt(year) : null },
      total_omzet_lunas: { lm: omzetLM, br: omzetBR, total: totalOmzetLunas },
      total_laba_lunas: totalLabaLunas,
      total_piutang_outstanding: totalPiutang,
      total_paid: totalPaid,
      by_customer,
      bonus_log: (bonusGrants || []).map(g => ({
        id: g.id,
        customer_nama: g.customers?.nama || 'Unknown',
        bonuses_granted: g.bonuses_granted,
        omzet_consumed: Number(g.omzet_consumed),
        granted_at: g.granted_at,
      })),
    });
  } catch (error) {
    console.error('[GET /reports/overall]', error);
    return errorResponse('Gagal memuat laporan keseluruhan.', 'SERVER_ERROR', 500);
  }
});
