// GET /api/v1/security/anomalies — Daftar Catatan Anomali Forensik Keamanan Toko
// PATCH /api/v1/security/anomalies — Tandai Anomali Dibaca oleh Pemilik Toko
import { withAuthSupabase, errorResponse, successResponse } from '@/lib/auth-helpers';

export const GET = withAuthSupabase(async (request, context, { profile, shopId, supabase }) => {
  try {
    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);

    if (profile?.role !== 'BOSS' && profile?.role !== 'ADMIN') {
      return errorResponse('Akses ditolak. Rekaman forensik hanya dapat diakses oleh Pemilik / Admin.', 'FORBIDDEN', 403);
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const severity = searchParams.get('severity');
    const unreadOnly = searchParams.get('unread_only') === 'true' || searchParams.get('unreadOnly') === 'true';

    let query = supabase
      .from('security_anomaly_events')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (severity) {
      query = query.eq('severity', severity.toUpperCase());
    }

    if (unreadOnly) {
      query = query.eq('is_read_by_owner', false);
    }

    const { data: anomalies, error } = await query;
    if (error) throw error;

    // Hitung unread count
    const { count: unreadCount } = await supabase
      .from('security_anomaly_events')
      .select('*', { count: 'exact', head: true })
      .eq('shop_id', shopId)
      .eq('is_read_by_owner', false);

    const formattedAnomalies = (anomalies || []).map((a) => ({
      ...a,
      is_read: Boolean(a.is_read_by_owner),
      is_read_by_owner: Boolean(a.is_read_by_owner),
    }));

    return successResponse({
      anomalies: formattedAnomalies,
      unread_count: unreadCount || 0,
    });
  } catch (err) {
    console.error('[GET /api/v1/security/anomalies error]', err);
    return errorResponse('Gagal memuat rekaman anomali keamanan: ' + err.message, 'INTERNAL_ERROR', 500);
  }
});

export const PATCH = withAuthSupabase(async (request, context, { profile, shopId, supabase }) => {
  try {
    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);

    if (profile?.role !== 'BOSS' && profile?.role !== 'ADMIN') {
      return errorResponse('Akses ditolak.', 'FORBIDDEN', 403);
    }

    let body = {};
    try {
      body = await request.json();
    } catch {}

    const targetId = body.event_id || body.anomaly_id;
    const isMarkAll = Boolean(body.mark_all_read || body.markAllRead);
    const readStatus = body.is_read !== undefined ? Boolean(body.is_read) : true;

    let updateQuery = supabase
      .from('security_anomaly_events')
      .update({ is_read_by_owner: readStatus })
      .eq('shop_id', shopId);

    if (isMarkAll) {
      updateQuery = updateQuery.eq('is_read_by_owner', false);
    } else if (targetId) {
      updateQuery = updateQuery.eq('id', targetId);
    } else {
      return errorResponse('ID anomali atau opsi mark_all_read wajib disertakan.', 'INVALID_INPUT', 400);
    }

    const { error: updateErr } = await updateQuery;
    if (updateErr) throw updateErr;

    return successResponse({ success: true, message: 'Status anomali berhasil diperbarui.' });
  } catch (err) {
    console.error('[PATCH /api/v1/security/anomalies error]', err);
    return errorResponse('Gagal memperbarui status anomali: ' + err.message, 'INTERNAL_ERROR', 500);
  }
});
