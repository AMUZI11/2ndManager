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
        owner_id,
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
      const s = search.trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
      if (isUuid) {
        query = query.or(`id.eq.${s},name.ilike.%${s}%`);
      } else {
        query = query.ilike('name', `%${s}%`);
      }
    }

    const { data: shops, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Enrich owner information via auth admin
    const ownerIds = [...new Set((shops || []).map((s) => s.owner_id).filter(Boolean))];
    const userMap = {};

    await Promise.all(
      ownerIds.map(async (oid) => {
        try {
          const { data: u } = await supabaseAdmin.auth.admin.getUserById(oid);
          if (u?.user) {
            userMap[oid] = {
              id: u.user.id,
              email: u.user.email,
              raw_user_meta_data: u.user.user_metadata || {},
            };
          }
        } catch {}
      })
    );

    const enrichedShops = (shops || []).map((s) => ({
      ...s,
      owner: userMap[s.owner_id] || null,
    }));

    return successResponse({
      tenants: enrichedShops,
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
