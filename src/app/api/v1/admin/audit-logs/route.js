import { withAdminAuth } from '@/lib/admin-auth';
import { successResponse, errorResponse } from '@/lib/auth-helpers';

export const GET = withAdminAuth(async (request, context, adminContext) => {
  const { supabaseAdmin } = adminContext;
  const { searchParams } = new URL(request.url);

  const actionFilter = searchParams.get('action') || 'ALL';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '30', 10);
  const offset = (page - 1) * limit;

  try {
    let query = supabaseAdmin
      .from('admin_audit_logs')
      .select('*, shops(name)', { count: 'exact' });

    if (actionFilter !== 'ALL') {
      query = query.eq('action_type', actionFilter);
    }

    const { data: logs, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return successResponse({
      logs: logs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    console.error('[GET /api/v1/admin/audit-logs]', err);
    return errorResponse('Gagal memuat riwayat audit trail.', 'SERVER_ERROR', 500);
  }
});
