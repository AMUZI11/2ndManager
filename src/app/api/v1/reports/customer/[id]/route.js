// GET /api/v1/reports/customer/[id] — Laporan per pelanggan
import { withAuthSupabase, errorResponse, successResponse } from '@/lib/auth-helpers';

export const GET = withAuthSupabase(async (request, { params }, { user, profile, supabase }) => {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .select('*, customer_discounts(*)')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();
    if (custErr || !customer) return errorResponse('Pelanggan tidak ditemukan.', 'NOT_FOUND', 404);

    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    let startDate = fiveYearsAgo.toISOString().split('T')[0];
    let endDate = new Date().toISOString().split('T')[0];

    if (month && year) {
      const s = new Date(parseInt(year), parseInt(month) - 1, 1);
      const e = new Date(parseInt(year), parseInt(month), 0);
      startDate = (s > fiveYearsAgo ? s : fiveYearsAgo).toISOString().split('T')[0];
      endDate = e.toISOString().split('T')[0];
    }

    // All transactions in period for this customer
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id, status, is_bonus, omzet_total, laba_total, amount_owed, transaction_items(product_type_snapshot, line_omzet, is_bonus_item)')
      .eq('customer_id', id)
      .gte('tanggal', startDate)
      .lte('tanggal', endDate);

    let omzetLM = 0, omzetBR = 0, omzetTotal = 0, labaTotal = 0, totalPaid = 0, totalPiutang = 0;
    for (const tx of transactions || []) {
      if (tx.status === 'Lunas' && !tx.is_bonus) {
        omzetTotal += Number(tx.omzet_total);
        labaTotal  += Number(tx.laba_total);
        totalPaid  += Number(tx.amount_owed);
        for (const item of tx.transaction_items || []) {
          if (!item.is_bonus_item) {
            if (item.product_type_snapshot === 'LM') omzetLM += Number(item.line_omzet);
            else if (item.product_type_snapshot === 'BR') omzetBR += Number(item.line_omzet);
          }
        }
      } else if (tx.status === 'Piutang') {
        totalPiutang += Number(tx.amount_owed);
      }
    }

    // Bonus log
    const { data: bonusLog } = await supabase
      .from('bonus_grants')
      .select('id, bonuses_granted, omzet_consumed, granted_at, transactions(nomor_bon)')
      .eq('customer_id', id)
      .gte('granted_at', startDate)
      .lte('granted_at', endDate)
      .order('granted_at', { ascending: false });

    return successResponse({
      customer,
      period: { month: month ? parseInt(month) : null, year: year ? parseInt(year) : null },
      omzet_lunas: { lm: omzetLM, br: omzetBR, total: omzetTotal },
      laba_lunas: labaTotal,
      piutang_outstanding: totalPiutang,
      total_paid: totalPaid,
      bonus_log: (bonusLog || []).map(g => ({
        id: g.id,
        bonuses_granted: g.bonuses_granted,
        omzet_consumed: Number(g.omzet_consumed),
        granted_at: g.granted_at,
        nomor_bon: g.transactions?.nomor_bon || null,
      })),
    });
  } catch (error) {
    console.error('[GET /reports/customer/:id]', error);
    return errorResponse('Gagal memuat laporan pelanggan.', 'SERVER_ERROR', 500);
  }
});
