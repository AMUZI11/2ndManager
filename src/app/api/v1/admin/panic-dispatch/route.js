import { withAdminAuth } from '@/lib/admin-auth';
import { successResponse, errorResponse } from '@/lib/auth-helpers';

export const GET = withAdminAuth(async (request, context, adminContext) => {
  const { supabaseAdmin } = adminContext;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'OPEN';

  try {
    let query = supabaseAdmin
      .from('support_tickets')
      .select(`
        *,
        shops (
          id,
          name,
          subscription_tier,
          operational_status
        )
      `);

    if (status !== 'ALL') {
      query = query.eq('status', status);
    }

    const { data: tickets, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return successResponse({ tickets: tickets || [] });
  } catch (err) {
    console.error('[GET /api/v1/admin/panic-dispatch]', err);
    return errorResponse('Gagal mengambil daftar tiket darurat.', 'SERVER_ERROR', 500);
  }
});
