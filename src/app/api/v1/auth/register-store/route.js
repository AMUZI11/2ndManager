import { createServerSupabaseClient } from '@/lib/supabase/server';
import { errorResponse, successResponse } from '@/lib/auth-helpers';
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limiter';

export async function POST(request) {
  const rateLimit = checkRateLimit(request, { limit: 5, windowMs: 10 * 60 * 1000, identifier: 'auth-register-store' });
  if (rateLimit.isRateLimited) {
    return createRateLimitResponse(rateLimit);
  }

  try {
    const bearerToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    const supabase = await createServerSupabaseClient(bearerToken);

    // Dapatkan sesi user aktif
    let user = null;
    if (bearerToken) {
      const { data: userData } = await supabase.auth.getUser(bearerToken);
      if (userData?.user) user = userData.user;
    }
    if (!user) {
      const { data: cookieUserData } = await supabase.auth.getUser();
      user = cookieUserData?.user;
    }

    const body = await request.json().catch(() => ({}));
    const { store_name, owner_name, phone, user_id } = body;

    const targetUserId = user?.id || user_id;

    if (!targetUserId) {
      return errorResponse('Sesi tidak valid atau user_id tidak ditemukan.', 'UNAUTHORIZED', 401);
    }

    if (!store_name || store_name.trim().length === 0) {
      return errorResponse('Nama toko wajib diisi.', 'VALIDATION_ERROR', 422);
    }

    const finalOwnerName = owner_name?.trim() || user?.user_metadata?.username || user?.email?.split('@')[0] || 'Owner';
    const finalStoreName = store_name.trim();
    const finalPhone = phone?.trim() || null;

    // Panggil RPC register_owner_with_store
    const { data: rpcResult, error: rpcError } = await supabase.rpc('register_owner_with_store', {
      p_user_id: targetUserId,
      p_owner_name: finalOwnerName,
      p_store_name: finalStoreName,
      p_phone: finalPhone,
    });

    if (rpcError) {
      console.error('[POST /api/v1/auth/register-store] RPC Error:', rpcError);
      return errorResponse(rpcError.message || 'Gagal mendaftarkan toko utama.', 'RPC_ERROR', 400);
    }

    return successResponse({
      ...rpcResult,
      redirect_url: '/admin',
    });
  } catch (error) {
    console.error('[POST /api/v1/auth/register-store]', error);
    return errorResponse(`Gagal memproses registrasi toko: ${error.message}`, 'SERVER_ERROR', 500);
  }
}
