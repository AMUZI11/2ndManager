// GET /api/v1/customers/[id]/transactions — daftar transaksi pelanggan
import { withAuthSupabase, errorResponse, successResponse } from '@/lib/auth-helpers';

export const GET = withAuthSupabase(async (request, { params }, { user, profile, supabase }) => {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const status = searchParams.get('status');

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

    let query = supabase
      .from('transactions')
      .select('*, transaction_items(product_type_snapshot, line_omzet, quantity, discounted_unit_price)')
      .eq('customer_id', id)
      .gte('tanggal', startDate)
      .lte('tanggal', endDate)
      .order('tanggal', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data: transactions, error } = await query;
    if (error) throw error;

    const piutangTx = transactions.filter(t => t.status === 'Piutang');
    const lunasTx   = transactions.filter(t => t.status === 'Lunas');

    const summary = {
      total_piutang: piutangTx.reduce((s, t) => s + Number(t.amount_owed), 0),
      total_lunas:   lunasTx.reduce((s, t) => s + Number(t.amount_owed), 0),
      omzet_lm_lunas: lunasTx.reduce((s, t) =>
        s + (t.transaction_items || []).filter(i => i.product_type_snapshot === 'LM')
          .reduce((is, i) => is + Number(i.line_omzet), 0), 0),
      omzet_br_lunas: lunasTx.reduce((s, t) =>
        s + (t.transaction_items || []).filter(i => i.product_type_snapshot === 'BR')
          .reduce((is, i) => is + Number(i.line_omzet), 0), 0),
      omzet_total_lunas: lunasTx.reduce((s, t) => s + Number(t.omzet_total), 0),
      laba_total_lunas:  lunasTx.reduce((s, t) => s + Number(t.laba_total), 0),
    };

    return successResponse({ data: transactions, summary });
  } catch (error) {
    console.error('[GET /customers/:id/transactions]', error);
    return errorResponse('Gagal memuat transaksi pelanggan.', 'SERVER_ERROR', 500);
  }
});
