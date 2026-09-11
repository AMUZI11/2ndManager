import { withBossOnly, errorResponse, successResponse, checkSubscriptionActive } from '@/lib/auth-helpers';
import { checkQuotaLimit } from '@/lib/subscription';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const GET = withBossOnly(async (request, context, { user, supabase }) => {
  try {
    const { data: bossShops } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', user.id);

    const shopIds = bossShops ? bossShops.map((s) => s.id) : [];
    if (shopIds.length === 0) return successResponse([]);

    const { data: cashiers, error } = await supabase
      .from('profiles')
      .select('id, username, role, shop_id, created_at, shops(name)')
      .eq('role', 'CASHIER')
      .in('shop_id', shopIds);

    if (error) throw error;
    return successResponse(cashiers || []);
  } catch (error) {
    console.error('[GET /cashiers]', error);
    return errorResponse(`Gagal mengambil data kasir: ${error.message}`, 'SERVER_ERROR', 500);
  }
});

export const POST = withBossOnly(async (request, context, { user, profile, supabase }) => {
  try {
    const body = await request.json();
    const { username, email, password, branch_id, cashier_name } = body;
    const cashierName = cashier_name || username;

    if (!email || !password || !branch_id || !cashierName) {
      return errorResponse('Email, password, cabang, dan nama kasir wajib diisi.', 'VALIDATION_ERROR', 422);
    }

    if (password.length < 8) {
      return errorResponse('Kata sandi kasir minimal 8 karakter.', 'VALIDATION_ERROR', 422);
    }

    // Check subscription max_cashiers limit
    // Find the boss's main shop
    const { data: mainShop } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', user.id)
      .is('parent_shop_id', null)
      .single();

    if (!mainShop) return errorResponse('Toko utama tidak ditemukan.', 'NOT_FOUND', 404);

    const mainShopId = mainShop.id;
    const { plan } = await checkSubscriptionActive(supabase, mainShopId);

    // Count existing cashiers under shops owned by this boss
    const { data: bossShops } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', user.id);

    const shopIds = (bossShops && bossShops.length > 0) ? bossShops.map((s) => s.id) : [mainShopId];

    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'CASHIER')
      .in('shop_id', shopIds);

    const currentCount = (count || 0) + 1;
    const quotaCheck = checkQuotaLimit(plan, currentCount, 'max_cashiers');

    if (!quotaCheck.allowed) {
      return errorResponse(quotaCheck.message, 'LIMIT_EXCEEDED', 403);
    }

    // Create auth user with role CASHIER metadata
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username: cashierName,
        role: 'CASHIER',
        shop_id: branch_id,
        is_cashier: true,
      },
    });

    if (createErr) {
      console.error('[POST /cashiers] createUser error:', createErr);
      return errorResponse(createErr.message || 'Gagal mendaftarkan akun kasir.', 'AUTH_ERROR', 400);
    }

    if (!newUser?.user) {
      return errorResponse('Gagal membuat akun kasir di sistem otentikasi.', 'AUTH_ERROR', 500);
    }

    // Upsert profile for cashier (wariskan plan toko)
    const { error: profileErr } = await supabaseAdmin.from('profiles').upsert({
      id: newUser.user.id,
      username: cashierName,
      role: 'CASHIER',
      shop_id: branch_id,
      subscription_plan: plan || 'EKSEKUTIF',
    });

    if (profileErr) {
      console.error('[POST /cashiers] profileErr:', profileErr);
    }

    // Insert user_shops junction
    const { error: shopErr } = await supabaseAdmin.from('user_shops').upsert({
      user_id: newUser.user.id,
      shop_id: branch_id,
    });

    if (shopErr) {
      console.error('[POST /cashiers] shopErr:', shopErr);
    }

    return successResponse({ success: true, user: newUser.user }, 201);
  } catch (error) {
    console.error('[POST /cashiers]', error);
    const msg = error?.message && error.message !== '{}' 
      ? error.message 
      : (error?.error_description || 'Terjadi kesalahan sistem saat mendaftarkan kasir.');
    return errorResponse(`Gagal mendaftarkan kasir: ${msg}`, 'SERVER_ERROR', 500);
  }
});
