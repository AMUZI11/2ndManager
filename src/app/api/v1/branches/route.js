import { withBossOnly, errorResponse, successResponse, checkSubscriptionActive } from '@/lib/auth-helpers';
import { checkQuotaLimit } from '@/lib/subscription';

export const GET = withBossOnly(async (request, context, { user, supabase }) => {
  try {
    // 1. Cari organisasi milik owner
    let { data: org } = await supabase
      .from('organizations')
      .select('id, name, tier_id, max_branches')
      .eq('owner_id', user.id)
      .maybeSingle();

    // Jika belum ada organisasi, cari main shop dan buat organisasi
    if (!org) {
      const { data: mainShop } = await supabase
        .from('shops')
        .select('id, name, created_at')
        .eq('owner_id', user.id)
        .is('parent_shop_id', null)
        .maybeSingle();

      if (mainShop) {
        const { data: newOrg } = await supabase
          .from('organizations')
          .insert({
            owner_id: user.id,
            name: `${mainShop.name} Group`,
            tier_id: 'EKSEKUTIF',
            max_branches: 3,
          })
          .select()
          .single();

        org = newOrg;

        // Daftarkan main shop sebagai Cabang 1 (Pusat)
        await supabase
          .from('branches')
          .insert({
            organization_id: newOrg.id,
            shop_id: mainShop.id,
            branch_name: mainShop.name,
            branch_code: 'CBG-01',
            is_main_branch: true,
          })
          .select()
          .maybeSingle();
      }
    }

    if (!org) {
      return successResponse([]);
    }

    // 2. Ambil seluruh cabang di bawah organisasi ini
    const { data: branches, error } = await supabase
      .from('branches')
      .select(`
        id,
        organization_id,
        shop_id,
        branch_name,
        branch_code,
        is_main_branch,
        address,
        phone_number,
        is_active,
        created_at,
        shops (
          id,
          name,
          subscription_tier,
          operational_status
        )
      `)
      .eq('organization_id', org.id)
      .eq('is_active', true)
      .order('is_main_branch', { ascending: false })
      .order('branch_code', { ascending: true });

    if (error) throw error;

    // Normalisasi struktur output
    const formatted = (branches || []).map((b) => ({
      id: b.id,
      shop_id: b.shop_id,
      organization_id: b.organization_id,
      name: b.branch_name,
      branch_name: b.branch_name,
      branch_code: b.branch_code,
      is_main_branch: b.is_main_branch,
      address: b.address,
      phone_number: b.phone_number,
      is_active: b.is_active,
      created_at: b.created_at,
      shop: b.shops,
    }));

    return successResponse(formatted);
  } catch (error) {
    console.error('[GET /branches]', error);
    return errorResponse(`Gagal mengambil data cabang: ${error.message}`, 'SERVER_ERROR', 500);
  }
});

export const POST = withBossOnly(async (request, context, { user, supabase }) => {
  try {
    const body = await request.json();
    const { name, address, phone_number } = body;

    if (!name || name.trim().length === 0) {
      return errorResponse('Nama cabang wajib diisi.', 'VALIDATION_ERROR', 422);
    }

    // 1. Get main shop owned by user
    const { data: mainShop } = await supabase
      .from('shops')
      .select('id, name')
      .eq('owner_id', user.id)
      .is('parent_shop_id', null)
      .single();

    const mainShopId = mainShop ? mainShop.id : user.id;

    // 2. Check max_branches limit
    const { plan } = await checkSubscriptionActive(supabase, mainShopId);

    // Hitung cabang yang sudah terdaftar
    const { count } = await supabase
      .from('shops')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id);

    const currentCount = (count || 0) + 1;
    const quotaCheck = checkQuotaLimit(plan, currentCount, 'max_branches');

    if (!quotaCheck.allowed) {
      return errorResponse(quotaCheck.message, 'LIMIT_EXCEEDED', 403);
    }

    // 3. Pastikan Organisasi ada
    let { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!org) {
      const { data: newOrg } = await supabase
        .from('organizations')
        .insert({
          owner_id: user.id,
          name: `${mainShop?.name || name} Group`,
          tier_id: 'EKSEKUTIF',
          max_branches: 3,
        })
        .select()
        .single();
      org = newOrg;
    }

    // 4. Create branch shop di tabel shops
    const { data: newShop, error: createShopErr } = await supabase
      .from('shops')
      .insert({
        name: name.trim(),
        owner_id: user.id,
        parent_shop_id: mainShopId,
        subscription_tier: plan,
      })
      .select()
      .single();

    if (createShopErr) throw createShopErr;

    // 5. Add boss to user_shops for this branch
    await supabase.from('user_shops').insert({
      user_id: user.id,
      shop_id: newShop.id,
    });

    // 6. Daftarkan di tabel branches
    const nextBranchCode = `CBG-0${currentCount}`;
    const { data: newBranch, error: createBranchErr } = await supabase
      .from('branches')
      .insert({
        organization_id: org.id,
        shop_id: newShop.id,
        branch_name: name.trim(),
        branch_code: nextBranchCode,
        is_main_branch: false,
        address: address ? address.trim() : null,
        phone_number: phone_number ? phone_number.trim() : null,
      })
      .select()
      .single();

    if (createBranchErr) throw createBranchErr;

    // 7. Inisialisasi baris stok di branch_product_stocks untuk seluruh produk organisasi
    const { data: existingProducts } = await supabase
      .from('products')
      .select('id, reorder_threshold')
      .or(`shop_id.eq.${mainShopId},shop_id.eq.${newShop.id}`);

    if (existingProducts && existingProducts.length > 0) {
      const initRows = existingProducts.map((p) => ({
        branch_id: newBranch.id,
        product_id: p.id,
        available_stock: 0,
        in_transit_stock: 0,
        safety_stock: Number(p.reorder_threshold || 5),
      }));

      await supabase.from('branch_product_stocks').upsert(initRows, { onConflict: 'branch_id,product_id' });
    }

    return successResponse({
      ...newBranch,
      shop: newShop,
    }, 201);
  } catch (error) {
    console.error('[POST /branches]', error);
    return errorResponse(`Gagal membuat cabang baru: ${error.message}`, 'SERVER_ERROR', 500);
  }
});
