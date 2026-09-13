import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { errorResponse, successResponse } from '@/lib/auth-helpers';

export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return errorResponse('Sesi tidak valid.', 'UNAUTHORIZED', 401);
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isAdmin = 
      user.email === process.env.ADMIN_EMAIL || 
      profile?.role === 'SUPERADMIN' || 
      profile?.role === 'BOSS';

    if (!isAdmin) {
      return errorResponse('Akses ditolak. Fitur pencabutan lisensi khusus Administrator.', 'FORBIDDEN', 403);
    }

    const body = await request.json().catch(() => ({}));
    const { claimId, reason } = body;

    if (!claimId) {
      return errorResponse('ID klaim (claimId) wajib disertakan.', 'VALIDATION_ERROR', 400);
    }

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return errorResponse('Alasan pencabutan (reason) wajib diisi.', 'VALIDATION_ERROR', 400);
    }

    // Eksekusi Stored Procedure revoke_fraudulent_claim
    const { data: rpcResult, error: rpcErr } = await supabaseAdmin.rpc('revoke_fraudulent_claim', {
      p_claim_id: claimId,
      p_reason: reason.trim(),
      p_admin_id: user.id,
    });

    if (rpcErr) {
      console.error('[RPC revoke_fraudulent_claim Error]', rpcErr);
      return errorResponse(rpcErr.message || 'Gagal mengeksekusi pencabutan lisensi.', 'RPC_ERROR', 500);
    }

    // Catat log keamanan audit trail
    try {
      await supabaseAdmin.from('logs').insert({
        user_id: user.id,
        action: 'FRAUD_CLAIM_REVOKED',
        details: {
          claim_id: claimId,
          reason: reason.trim(),
          result: rpcResult,
        },
      });
    } catch (e) {}

    return successResponse({
      ...rpcResult,
      message: 'Lisensi berhasil dicabut, organisasi ditandai penipuan dan seluruh cabang non-utama telah dinonaktifkan.',
    });
  } catch (error) {
    console.error('[POST /api/v1/admin/claims/revoke]', error);
    return errorResponse('Terjadi kesalahan internal saat mencabut lisensi klaim.', 'SERVER_ERROR', 500);
  }
}
