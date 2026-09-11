import { withAuthSupabase, errorResponse, successResponse } from '@/lib/auth-helpers';
import { logActivity } from '@/lib/audit';

export const GET = withAuthSupabase(async (request, context, { user, profile, shopId, isAllShops, supabase }) => {
  try {
    if (isAllShops) {
      const metadata = user.user_metadata || {};
      const { data: mainShop } = await supabase
        .from('shops')
        .select('subscription_tier, operational_status')
        .eq('owner_id', user.id)
        .is('parent_shop_id', null)
        .maybeSingle();

      const tier = mainShop?.subscription_tier || profile?.subscription_plan || 'MAGANG';

      return successResponse({
        id: 'ALL',
        name: 'Semua Cabang',
        parent_shop_id: 'ALL',
        address: metadata.shop_address || '',
        phone: metadata.shop_phone || '',
        subscription_tier: tier,
        plan: tier,
        operational_status: mainShop?.operational_status || 'ACTIVE',
        cashier_limit: 99,
      });
    }

    let shop = null;
    if (shopId) {
      const { data } = await supabase
        .from('shops')
        .select('id, name, subscription_tier, operational_status, cashier_limit, parent_shop_id')
        .eq('id', shopId)
        .maybeSingle();
      shop = data;
    }

    const metadata = user.user_metadata || {};
    let tier = shop?.subscription_tier && shop.subscription_tier !== 'TRIAL' ? shop.subscription_tier : null;

    // Jika cabang, wariskan subscription_tier dari Toko Utama
    if (!tier && shop?.parent_shop_id) {
      const { data: parentShop } = await supabase
        .from('shops')
        .select('subscription_tier')
        .eq('id', shop.parent_shop_id)
        .maybeSingle();
      if (parentShop?.subscription_tier && parentShop.subscription_tier !== 'TRIAL') {
        tier = parentShop.subscription_tier;
      }
    }

    if (!tier) {
      tier = profile?.subscription_plan && profile.subscription_plan !== 'TRIAL' ? profile.subscription_plan : 'MAGANG';
    }

    return successResponse({
      id: shopId || user.id,
      name: shop?.name || metadata.shop_name || 'Toko Utama',
      parent_shop_id: shop?.parent_shop_id || null,
      address: metadata.shop_address || '',
      phone: metadata.shop_phone || '',
      subscription_tier: tier,
      plan: tier,
      operational_status: shop?.operational_status || 'ACTIVE',
      cashier_limit: shop?.cashier_limit || 1,
    });
  } catch (error) {
    console.error('[GET /shops/profile]', error);
    return errorResponse('Gagal memuat profil toko.', 'SERVER_ERROR', 500);
  }
});

export const PUT = withAuthSupabase(async (request, context, { user, profile, shopId, supabase }) => {
  try {
    const body = await request.json();
    const { name, address, phone } = body;

    if (!name || name.trim().length === 0) {
      return errorResponse('Nama toko/warung wajib diisi.', 'VALIDATION_ERROR', 422);
    }

    const cleanName = name.trim();
    const cleanAddress = address ? address.trim() : '';
    const cleanPhone = phone ? phone.trim() : '';

    // 1. Update shop name in shops table if shop exists
    if (shopId) {
      const { error: shopErr } = await supabase
        .from('shops')
        .update({ name: cleanName })
        .eq('id', shopId);

      if (shopErr) {
        console.error('[PUT /shops/profile] Supabase update error:', shopErr);
      }
    } else {
      // Create shop if not found
      const { data: newShop, error: createErr } = await supabase
        .from('shops')
        .insert({
          name: cleanName,
          owner_id: user.id
        })
        .select()
        .single();
      
      if (!createErr && newShop) {
        shopId = newShop.id;
        await supabase.from('profiles').update({ shop_id: newShop.id }).eq('id', user.id);
        await supabase.from('user_shops').insert({ user_id: user.id, shop_id: newShop.id });
      }
    }

    // 2. Also save to user metadata for persistence of address & phone
    try {
      await supabase.auth.updateUser({
        data: {
          shop_name: cleanName,
          shop_address: cleanAddress,
          shop_phone: cleanPhone,
        }
      });
    } catch (metaErr) {
      console.warn('[PUT /shops/profile] Metadata update warning:', metaErr);
    }

    // 3. Log audit activity
    if (shopId) {
      await logActivity(
        supabase,
        shopId,
        profile.username || user.email,
        'Ubah Profil Toko',
        `Mengubah nama toko menjadi "${cleanName}"`
      );
    }

    return successResponse({
      id: shopId,
      name: cleanName,
      address: cleanAddress,
      phone: cleanPhone,
    });
  } catch (error) {
    console.error('[PUT /shops/profile]', error);
    return errorResponse('Gagal memperbarui profil toko.', 'SERVER_ERROR', 500);
  }
});
