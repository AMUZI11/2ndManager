import { withAdminAuth } from '@/lib/admin-auth';
import { successResponse, errorResponse } from '@/lib/auth-helpers';

export const GET = withAdminAuth(async (request, context, adminContext) => {
  const { supabaseAdmin } = adminContext;

  try {
    // 1. Total Tenants & Status counts
    const { count: totalShops } = await supabaseAdmin.from('shops').select('*', { count: 'exact', head: true });
    const { count: chokeholdCount } = await supabaseAdmin.from('shops').select('*', { count: 'exact', head: true }).eq('operational_status', 'CHOKEHOLD');
    const { count: graceCount } = await supabaseAdmin.from('shops').select('*', { count: 'exact', head: true }).eq('operational_status', 'GRACE_PERIOD');
    
    // 2. Open Panic Tickets & Pending Payment Proofs
    const { count: openTickets } = await supabaseAdmin.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'OPEN');
    const { count: pendingProofs } = await supabaseAdmin.from('payment_proofs').select('*', { count: 'exact', head: true }).eq('status', 'PENDING');

    // 3. Transactions Today & Total Volume
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayTxs } = await supabaseAdmin
      .from('transactions')
      .select('total_amount')
      .gte('created_at', today.toISOString());

    const todayGMV = (todayTxs || []).reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);
    const todayTxCount = todayTxs?.length || 0;

    // 4. Recent Platform Audit Activity
    const { data: recentAudits } = await supabaseAdmin
      .from('admin_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(6);

    return successResponse({
      metrics: {
        totalShops: totalShops || 0,
        activeShops: (totalShops || 0) - (chokeholdCount || 0),
        chokeholdCount: chokeholdCount || 0,
        graceCount: graceCount || 0,
        openTickets: openTickets || 0,
        pendingProofs: pendingProofs || 0,
        todayGMV,
        todayTxCount,
      },
      recentAudits: recentAudits || [],
    });
  } catch (err) {
    console.error('[GET /api/v1/admin/telemetry]', err);
    return errorResponse('Gagal memuat telemetri platform.', 'SERVER_ERROR', 500);
  }
});
