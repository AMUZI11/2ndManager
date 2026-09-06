// GET /api/v1/logs — audit log toko (BOSS only, Pro tier)
import { withBossOnly, errorResponse, successResponse } from '@/lib/auth-helpers';

export const GET = withBossOnly(async (request, context, { user, profile, shopId, supabase }) => {
  try {
    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);

    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;
    return successResponse(logs);
  } catch (error) {
    console.error('[GET /logs]', error);
    return errorResponse('Gagal memuat log audit.', 'SERVER_ERROR', 500);
  }
});
