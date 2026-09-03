import { withAuthSupabase, errorResponse, successResponse } from '@/lib/auth-helpers';
import { logActivity } from '@/lib/audit';

export const GET = withAuthSupabase(async (request, context, { user, profile, supabase }) => {
  try {
    let shopId = profile.shop_id;
    if (!shopId) {
      const { data: userShop } = await supabase
        .from('user_shops')
        .select('shop_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      shopId = userShop?.shop_id;
    }
    if (!shopId) {
      const { data: ownedShop } = await supabase
        .from('shops')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle();
      shopId = ownedShop?.id;
    }

    let shop = null;
    if (shopId) {
      const { data } = await supabase
        .from('shops')
        .select('id, name, subscription_tier, operational_status, cashier_limit')
        .eq('id', shopId)
        .maybeSingle();
      shop = data;
    }

    const metadata = user.user_metadata || {};
    const tier = shop?.subscription_tier && shop.subscription_tier !== 'TRIAL' ? shop.subscription_tier : 'MAGANG';

    return successResponse({
      id: shopId || user.id,
      name: shop?.name || metadata.shop_name || 'Toko Utama',
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

export const PUT = withAuthSupabase(async (request, context, { user, profile, supabase }) => {
  try {
    const body = await request.json();
    const { name, address, phone } = body;

    if (!name || name.trim().length === 0) {
      return errorResponse('Nama toko/warung wajib diisi.', 'VALIDATION_ERROR', 422);
    }

    const cleanName = name.trim();
    const cleanAddress = address ? address.trim() : '';
    const cleanPhone = phone ? phone.trim() : '';

    let shopId = profile.shop_id;
    if (!shopId) {
      const { data: userShop } = await supabase
        .from('user_shops')
        .select('shop_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      shopId = userShop?.shop_id;
    }
    if (!shopId) {
      const { data: ownedShop } = await supabase
        .from('shops')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle();
      shopId = ownedShop?.id;
    }

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
