// GET /api/v1/customers/bonus-alerts — pelanggan yang perlu diberikan bonus
import { withAuthSupabase, errorResponse, successResponse } from '@/lib/auth-helpers';

export const GET = withAuthSupabase(async (request, context, { user, profile, shopId, supabase }) => {
  try {
    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);

    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    const since = fiveYearsAgo.toISOString().split('T')[0];

    // Ambil semua pelanggan aktif
    const { data: customers } = await supabase
      .from('customers')
      .select('id, nama, bonus_threshold')
      .eq('shop_id', shopId)
      .eq('is_deleted', false);

    // Ambil total omzet lunas per pelanggan
    const { data: txData } = await supabase
      .from('transactions')
      .select('customer_id, omzet_total')
      .eq('shop_id', shopId)
      .eq('status', 'Lunas')
      .eq('is_bonus', false)
      .gte('tanggal', since);

    // Ambil total bonus granted per pelanggan
    const { data: grantData } = await supabase
      .from('bonus_grants')
      .select('customer_id, bonuses_granted')
      .eq('shop_id', shopId)
      .gte('granted_at', since);

    // Aggregate omzet per customer
    const omzetMap = {};
    for (const tx of txData || []) {
      omzetMap[tx.customer_id] = (omzetMap[tx.customer_id] || 0) + Number(tx.omzet_total);
    }

    // Aggregate grants per customer
    const grantMap = {};
    for (const g of grantData || []) {
      grantMap[g.customer_id] = (grantMap[g.customer_id] || 0) + Number(g.bonuses_granted);
    }

    const alerts = [];
    for (const c of customers || []) {
      const threshold = Number(c.bonus_threshold || 0);
      if (threshold <= 0) continue;
      const totalOmzet = omzetMap[c.id] || 0;
      const granted = grantMap[c.id] || 0;
      const earned = Math.floor(totalOmzet / threshold);
      const available = Math.max(0, earned - granted);
      if (available > 0) {
        alerts.push({ customer: { id: c.id, nama: c.nama }, available });
      }
    }

    return successResponse(alerts);
  } catch (error) {
    console.error('[GET /customers/bonus-alerts]', error);
    return errorResponse('Gagal mengambil pengingat bonus.', 'SERVER_ERROR', 500);
  }
});
