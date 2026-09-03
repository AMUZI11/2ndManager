import { withAdminAuth } from '@/lib/admin-auth';
import { successResponse, errorResponse } from '@/lib/auth-helpers';

export const GET = withAdminAuth(async (request, context, adminContext) => {
  const { supabaseAdmin } = adminContext;

  try {
    // Detect Anomalies:
    // 1. High-value voids / cancellations in audit/void logs
    // 2. High discount / negative margin transactions
    const { data: voidLogs } = await supabaseAdmin
      .from('void_logs')
      .select('*, shops(name)')
      .order('created_at', { ascending: false })
      .limit(20);

    // 3. Transactions with abnormal discount or large round numbers
    const { data: highTransactions } = await supabaseAdmin
      .from('transactions')
      .select('id, total_amount, payment_method, created_at, shops(id, name)')
      .gt('total_amount', 1000000)
      .order('created_at', { ascending: false })
      .limit(20);

    const anomalies = [];

    (voidLogs || []).forEach((v) => {
      anomalies.push({
        id: `VOID-${v.id}`,
        type: 'VOID_CANCELLATION',
        severity: 'HIGH',
        shopName: v.shops?.name || 'Toko',
        shopId: v.shop_id,
        description: `Pembatalan nota senilai Rp ${Number(v.total_amount || 0).toLocaleString('id-ID')}. Alasan: ${v.reason || 'Tanpa keterangan'}`,
        timestamp: v.created_at,
      });
    });

    (highTransactions || []).forEach((tx) => {
      anomalies.push({
        id: `TX-${tx.id.slice(0, 8)}`,
        type: 'HIGH_VALUE_TX',
        severity: 'MEDIUM',
        shopName: tx.shops?.name || 'Toko',
        shopId: tx.shops?.id,
        description: `Transaksi jumbo di atas ambang batas: Rp ${Number(tx.total_amount || 0).toLocaleString('id-ID')} via ${tx.payment_method}`,
        timestamp: tx.created_at,
      });
    });

    // Sort by timestamp desc
    anomalies.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return successResponse({ anomalies });
  } catch (err) {
    console.error('[GET /api/v1/admin/fraud-radar]', err);
    return errorResponse('Gagal memuat radar anomali kasir.', 'SERVER_ERROR', 500);
  }
});
