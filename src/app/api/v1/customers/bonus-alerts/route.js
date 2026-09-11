// GET /api/v1/customers/bonus-alerts — pelanggan yang perlu diberikan bonus
import { withAuthSupabase, errorResponse, successResponse } from '@/lib/auth-helpers';

export const GET = withAuthSupabase(async (request, context, { user, profile, shopId, shopIds, isAllShops, supabase }) => {
  try {
    if (!shopId && !isAllShops) return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);

    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    const since = fiveYearsAgo.toISOString().split('T')[0];

    // Ambil semua pelanggan aktif
    let custQuery = supabase
      .from('customers')
      .select('id, nama, bonus_threshold')
      .eq('is_deleted', false);

    // Ambil total omzet lunas per pelanggan
    let txQuery = supabase
      .from('transactions')
      .select('customer_id, omzet_total')
      .eq('status', 'Lunas')
      .eq('is_bonus', false)
      .gte('tanggal', since);

    // Ambil total bonus granted per pelanggan
    let grantQuery = supabase
      .from('bonus_grants')
      .select('customer_id, bonuses_granted')
      .gte('granted_at', since);

    if (isAllShops && shopIds && shopIds.length > 0) {
      custQuery = custQuery.in('shop_id', shopIds);
      txQuery = txQuery.in('shop_id', shopIds);
      grantQuery = grantQuery.in('shop_id', shopIds);
    } else {
      custQuery = custQuery.eq('shop_id', shopId);
      txQuery = txQuery.eq('shop_id', shopId);
      grantQuery = grantQuery.eq('shop_id', shopId);
    }

    const [custRes, txRes, grantRes] = await Promise.all([
      custQuery,
      txQuery,
      grantQuery
    ]);

    const customers = custRes.data;
    const txData = txRes.data;
    const grantData = grantRes.data;

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
