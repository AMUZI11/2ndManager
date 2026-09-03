import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Format error response standar untuk API routes
 */
export function errorResponse(message, code = 'ERROR', status = 400, details = null) {
  return Response.json(
    { error: true, code, message, ...(details && { details }) },
    { status }
  );
}

/**
 * Format success response standar
 */
export function successResponse(data, status = 200) {
  return Response.json({ data }, { status });
}

/**
 * Higher-order function untuk proteksi API route dengan Supabase Auth session
 * Mengekstrak user dan profile (termasuk shop_id & role) dari session
 *
 * Usage:
 *   export const GET = withAuthSupabase(async (request, context, { user, profile }) => { ... });
 */
export function withAuthSupabase(handler) {
  return async function (request, context) {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return errorResponse('Sesi tidak valid. Silakan masuk kembali.', 'UNAUTHORIZED', 401);
    }

    // Ambil profile untuk mendapatkan role, shop_id, username
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, role, shop_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return errorResponse('Profil pengguna tidak ditemukan.', 'PROFILE_NOT_FOUND', 403);
    }

    return handler(request, context, { user, profile, supabase });
  };
}

/**
 * Proteksi khusus BOSS — tolak akses kasir ke endpoint manajemen
 */
export function withBossOnly(handler) {
  return withAuthSupabase(async (request, context, authContext) => {
    if (authContext.profile.role !== 'BOSS') {
      return errorResponse('Akses ditolak. Hanya Bos yang dapat mengakses fitur ini.', 'FORBIDDEN', 403);
    }
    return handler(request, context, authContext);
  });
}

/**
 * Cek apakah subscription shop masih aktif (tidak expired)
 * Membaca dari tabel shops (subscription_tier, operational_status) dan subscriptions
 */
export async function checkSubscriptionActive(supabase, shopId) {
  if (!shopId) return { active: false, plan: 'MAGANG', sub: null, shop: null };

  const [subRes, shopRes] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('plan, valid_until, max_cashiers, max_branches')
      .eq('shop_id', shopId)
      .maybeSingle(),
    supabase
      .from('shops')
      .select('subscription_tier, operational_status, cashier_limit')
      .eq('id', shopId)
      .maybeSingle(),
  ]);

  const sub = subRes.data;
  const shop = shopRes.data;

  // Determine active plan (prioritize verified shop tier if not TRIAL)
  let plan = 'MAGANG';
  if (shop?.subscription_tier && shop.subscription_tier !== 'TRIAL') {
    plan = shop.subscription_tier;
  } else if (sub?.plan && sub.plan !== 'FREE') {
    plan = sub.plan;
  }

  // If sub has valid_until, check expiry
  let isExpired = false;
  if (sub?.valid_until) {
    isExpired = new Date(sub.valid_until) < new Date();
    if (isExpired && plan !== 'MAGANG') {
      plan = 'MAGANG';
    }
  }

  return { 
    active: !isExpired, 
    plan, 
    sub,
    shop 
  };
}
