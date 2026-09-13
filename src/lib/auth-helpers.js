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

  // 1. Jika user adalah BOSS atau OWNER (atau Superadmin/tanpa role khusus)
  if (profile?.role === 'BOSS' || profile?.role === 'OWNER' || !profile?.role) {
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
 * Resolusi organisasi aktif yang tangguh untuk multi-cabang, multi-organisasi, dan akun kasir/staff.
 * Mencegah error PGRST116 (multiple rows) dan mendukung lookup via branch_id, profile.shop_id, atau owned shops.
 */
export async function resolveOrganization(supabase, user, profile = null, explicitBranchId = null) {
  if (!user && !profile) return null;

  // 1. Jika ada explicitBranchId, cari dari tabel branches
  if (explicitBranchId && explicitBranchId !== 'ALL') {
    const { data: branch } = await supabase
      .from('branches')
      .select('organization_id, organizations(*)')
      .eq('id', explicitBranchId)
      .maybeSingle();
    if (branch?.organizations) return branch.organizations;
  }

  // 2. Cari dari shop_id aktif (dari profile.shop_id)
  const targetShopId = profile?.shop_id;
  if (targetShopId) {
    const { data: branch } = await supabase
      .from('branches')
      .select('organization_id, organizations(*)')
      .eq('shop_id', targetShopId)
      .maybeSingle();
    if (branch?.organizations) return branch.organizations;
  }

  // 3. Jika user adalah owner toko, cari cabang dari toko yang dimiliki user
  if (user?.id) {
    const { data: ownedShops } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', user.id);

    if (ownedShops && ownedShops.length > 0) {
      const shopIds = ownedShops.map((s) => s.id);
      const { data: branchList } = await supabase
        .from('branches')
        .select('organization_id, organizations(*)')
        .in('shop_id', shopIds)
        .limit(1);
      if (branchList && branchList.length > 0 && branchList[0].organizations) {
        return branchList[0].organizations;
      }
    }

    // 4. Cari langsung di tabel organizations berdasarkan owner_id
    // Gunakan .limit(1) untuk mencegah crash PGRST116 jika ada multiple organisasi
    const { data: orgList } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (orgList && orgList.length > 0) {
      return orgList[0];
    }

    // 5. Fallback auto-provisioning: jika toko ada tapi belum ada org / branch, buat organisasi otomatis
    if (ownedShops && ownedShops.length > 0) {
      const mainShopId = ownedShops[0].id;
      const { data: shopInfo } = await supabase
        .from('shops')
        .select('name')
        .eq('id', mainShopId)
        .maybeSingle();

      const { data: newOrg } = await supabase
        .from('organizations')
        .insert({
          owner_id: user.id,
          name: shopInfo?.name || 'Organisasi Toko',
          tier_id: 'EKSEKUTIF',
        })
        .select()
        .single();

      if (newOrg) {
        await supabase.from('branches').insert({
          organization_id: newOrg.id,
          shop_id: mainShopId,
          branch_name: shopInfo?.name || 'Cabang Utama',
          branch_code: 'CBG-01',
          is_main_branch: true,
        });
        return newOrg;
      }
    }
  }

  return null;
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
    const role = authContext.profile?.role;
    if (role !== 'BOSS' && role !== 'OWNER') {
      return errorResponse('Akses ditolak. Hanya Bos/Owner yang dapat mengakses fitur ini.', 'FORBIDDEN', 403);
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
