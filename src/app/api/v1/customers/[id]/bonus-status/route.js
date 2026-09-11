// GET /api/v1/customers/[id]/bonus-status — cek akumulasi bonus pelanggan
import { withAuthSupabase, errorResponse, successResponse } from '@/lib/auth-helpers';

export const GET = withAuthSupabase(async (request, { params }, { supabase }) => {
  try {
    const { id } = await params;
    const { data: customer, error } = await supabase
      .from('customers')
      .select('id, nama, bonus_threshold')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error || !customer) return errorResponse('Pelanggan tidak ditemukan.', 'NOT_FOUND', 404);

    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    const since = fiveYearsAgo.toISOString().split('T')[0];

    // Total omzet lunas
    const { data: txData } = await supabase
      .from('transactions')
      .select('omzet_total')
      .eq('customer_id', id)
      .eq('status', 'Lunas')
      .eq('is_bonus', false)
      .gte('tanggal', since);

    const totalOmzet = (txData || []).reduce((s, t) => s + Number(t.omzet_total), 0);

    // Total bonus sudah diberikan
    const { data: grantData } = await supabase
      .from('bonus_grants')
      .select('bonuses_granted')
      .eq('customer_id', id)
      .gte('granted_at', since);

    const totalGranted = (grantData || []).reduce((s, g) => s + Number(g.bonuses_granted), 0);

    const threshold = Number(customer.bonus_threshold || 0);
    const bonusesEarned = threshold > 0 ? Math.floor(totalOmzet / threshold) : 0;
    const bonusesAvailable = Math.max(0, bonusesEarned - totalGranted);

    return successResponse({
      customer_id: id,
      customer_nama: customer.nama,
      total_omzet_lunas: totalOmzet,
      bonus_threshold: threshold,
      bonuses_earned: bonusesEarned,
      bonuses_granted: totalGranted,
      bonuses_available: bonusesAvailable,
    });
  } catch (error) {
    console.error('[GET /customers/:id/bonus-status]', error);
    return errorResponse('Gagal menghitung status bonus.', 'SERVER_ERROR', 500);
  }
});
