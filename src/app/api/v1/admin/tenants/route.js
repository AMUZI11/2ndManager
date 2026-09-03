import { withAdminAuth, logAdminAudit } from '@/lib/admin-auth';
import { successResponse, errorResponse } from '@/lib/auth-helpers';

export const GET = withAdminAuth(async (request, context, adminContext) => {
  const { supabaseAdmin } = adminContext;
  const { searchParams } = new URL(request.url);

  const search = searchParams.get('search') || '';
  const statusFilter = searchParams.get('status') || 'ALL';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '25', 10);
  const offset = (page - 1) * limit;

  try {
    let query = supabaseAdmin
      .from('shops')
      .select(`
        id,
        name,
        created_at,
        subscription_tier,
        operational_status,
        chokehold_active,
        grace_period_until,
        cashier_limit,
        active_cashiers_count,
        owner:owner_id (
          id,
          email:email,
          raw_user_meta_data
        ),
        subscriptions (
          plan,
          valid_until,
          max_cashiers,
          max_branches
        )
      `, { count: 'exact' });

    if (statusFilter !== 'ALL') {
      query = query.eq('operational_status', statusFilter);
    }

    if (search.trim()) {
      query = query.ilike('name', `%${search.trim()}%`);
    }

    const { data: shops, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return successResponse({
      tenants: shops || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    console.error('[GET /api/v1/admin/tenants]', err);
    return errorResponse('Gagal mengambil daftar penyewa (tenants).', 'SERVER_ERROR', 500);
  }
});
