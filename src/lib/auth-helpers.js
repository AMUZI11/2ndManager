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
 * Resolusi konteks toko & cabang aktif untuk user/profile yang tahan multi-cabang
 * Mendukung filter per-cabang (x-shop-id) atau konsolidasi semua cabang (ALL)
 */
export async function resolveShopContext(supabase, user, profile, requestedShopId = null) {
  let isAllShops = false;
  let shopIds = [];
  let activeShopId = null;

  // 1. Jika user adalah BOSS (atau Superadmin/tanpa role khusus)
  if (profile?.role === 'BOSS' || !profile?.role) {
    // Ambil seluruh toko yang dimiliki boss ini (termasuk semua cabang)
    const { data: ownedShops } = await supabase
      .from('shops')
      .select('id, name, parent_shop_id')
      .eq('owner_id', user.id);

    const allOwned = ownedShops || [];
    const mainShop = allOwned.find(s => s.parent_shop_id === null) || allOwned[0];
    shopIds = allOwned.map(s => s.id);

    if (requestedShopId === 'ALL') {
      isAllShops = true;
      activeShopId = mainShop?.id || profile?.shop_id || null;
    } else if (requestedShopId && allOwned.some(s => s.id === requestedShopId)) {
      activeShopId = requestedShopId;
    } else {
      // Default: Toko Utama yang dimiliki Boss
      activeShopId = mainShop?.id || profile?.shop_id || null;
    }
  } else {
    // 2. KASIR / STAFF: Hanya boleh mengakses cabang yang terdaftar untuk akunnya
    const { data: userShops } = await supabase
      .from('user_shops')
      .select('shop_id')
      .eq('user_id', user.id);

    const allowedShopIds = (userShops || []).map(us => us.shop_id);
    if (profile?.shop_id && !allowedShopIds.includes(profile.shop_id)) {
      allowedShopIds.push(profile.shop_id);
    }

    if (requestedShopId && allowedShopIds.includes(requestedShopId)) {
      activeShopId = requestedShopId;
    } else {
      activeShopId = profile?.shop_id || allowedShopIds[0] || null;
    }
    shopIds = [activeShopId].filter(Boolean);
  }

  // Fallback darurat jika database belum memiliki baris toko
  if (!activeShopId) {
    activeShopId = profile?.shop_id || null;
    if (activeShopId && !shopIds.includes(activeShopId)) {
      shopIds.push(activeShopId);
    }
  }

  return {
    shopId: activeShopId,
    shopIds,
    isAllShops,
  };
}

export async function resolveShopId(supabase, user, profile, requestedShopId = null) {
  const ctx = await resolveShopContext(supabase, user, profile, requestedShopId);
  return ctx.shopId;
}

/**
 * Higher-order function untuk proteksi API route dengan Supabase Auth session
 * Mengekstrak user dan profile (termasuk shopId, shopIds, & isAllShops) dari session & header aktif
 *
 * Usage:
 *   export const GET = withAuthSupabase(async (request, context, { user, profile, shopId, shopIds, isAllShops, supabase }) => { ... });
 */
export function withAuthSupabase(handler) {
  return async function (request, context) {
    // 1. Ekstrak Bearer token dari Authorization header jika tersedia
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    let bearerToken = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      bearerToken = authHeader.substring(7).trim();
    }

    const supabase = await createServerSupabaseClient(bearerToken);

    let user = null;

    // Cek user via Bearer token
    if (bearerToken) {
      const { data: userData, error: tokenErr } = await supabase.auth.getUser(bearerToken);
      if (!tokenErr && userData?.user) {
        user = userData.user;
      }
    }

    // 2. Fallback ke session cookies dari browser (@supabase/ssr)
    if (!user) {
      const { data: cookieUserData } = await supabase.auth.getUser();
      user = cookieUserData?.user;
    }

    if (!user) {
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

    // Ekstrak requested shop_id dari header, query param, atau cookie (BranchSwitcher)
    let requestedShopId = request.headers.get('x-shop-id') || null;
    if (!requestedShopId) {
      try {
        const url = new URL(request.url);
        requestedShopId = url.searchParams.get('shop_id');
      } catch {}
    }
    if (!requestedShopId && typeof request.cookies?.get === 'function') {
      requestedShopId = request.cookies.get('hl_active_branch')?.value || null;
    }

    // Selesaikan shop_id aktif dan daftar cabang (tahan multi-cabang tanpa risiko data tercampur)
    const { shopId, shopIds, isAllShops } = await resolveShopContext(supabase, user, profile, requestedShopId);

    return handler(request, context, { user, profile, shopId, shopIds, isAllShops, supabase });
  };
}

/**
 * Alias standar untuk withAuthSupabase
 */
export const withAuth = withAuthSupabase;

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

  // Handle 'ALL' mode by checking the main shop
  let targetShopId = shopId;
  if (targetShopId === 'ALL') {
    const { data: mainShop } = await supabase
      .from('shops')
      .select('id')
      .is('parent_shop_id', null)
      .limit(1)
      .maybeSingle();
    if (mainShop?.id) {
      targetShopId = mainShop.id;
    } else {
      return { active: false, plan: 'MAGANG', sub: null, shop: null };
    }
  }

  const { data: shop } = await supabase
    .from('shops')
    .select('id, name, subscription_tier, operational_status, cashier_limit, parent_shop_id')
    .eq('id', targetShopId)
    .maybeSingle();

  // If this shop is a branch, inherit subscription from the parent (main) shop
  if (shop?.parent_shop_id) {
    const parentRes = await checkSubscriptionActive(supabase, shop.parent_shop_id);
    return {
      ...parentRes,
      shop: {
        ...shop,
        subscription_tier: parentRes.plan,
      },
    };
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan, valid_until, max_cashiers, max_branches')
    .eq('shop_id', targetShopId)
    .maybeSingle();

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
