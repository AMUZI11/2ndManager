import { withAuth, withBossOnly, errorResponse, successResponse, resolveOrganization } from '@/lib/auth-helpers';

export const GET = withAuth(async (request, context, { user, profile, supabase }) => {
  try {
    // 1. Selesaikan organisasi aktif menggunakan helper yang tahan crash multi-org & cashier
    let org = await resolveOrganization(supabase, user, profile);

    // 2. Jika organisasi ditemukan, ambil seluruh cabang di bawah organisasi ini
    let branches = [];
    if (org?.id) {
      const { data: orgBranches, error: bErr } = await supabase
        .from('branches')
        .select(`
          id,
          organization_id,
          shop_id,
          name,
          branch_name,
          branch_code,
          is_main_branch,
          parent_branch_id,
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

      if (bErr) throw bErr;
      branches = orgBranches || [];
    }

    // 3. Fallback jika cabang masih kosong: cari langsung berdasarkan shop_id user/profil
    if (branches.length === 0) {
      const targetShopId = profile?.shop_id;
      if (targetShopId) {
        const { data: directBranches } = await supabase
          .from('branches')
          .select(`
            id,
            organization_id,
            shop_id,
            name,
            branch_name,
            branch_code,
            is_main_branch,
            parent_branch_id,
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
          .eq('shop_id', targetShopId)
          .eq('is_active', true);
        if (directBranches && directBranches.length > 0) {
          branches = directBranches;
        }
      }
    }

    // 4. Fallback jika masih kosong dan user adalah owner: cari dari seluruh toko yang dimiliki
    if (branches.length === 0 && user?.id) {
      const { data: ownedShops } = await supabase
        .from('shops')
        .select('id')
        .eq('owner_id', user.id);

      if (ownedShops && ownedShops.length > 0) {
        const shopIds = ownedShops.map((s) => s.id);
        const { data: ownedBranches } = await supabase
          .from('branches')
          .select(`
            id,
            organization_id,
            shop_id,
            name,
            branch_name,
            branch_code,
            is_main_branch,
            parent_branch_id,
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
          .in('shop_id', shopIds)
          .eq('is_active', true);
        if (ownedBranches && ownedBranches.length > 0) {
          branches = ownedBranches;
        }
      }
    }

    // Dapatkan nama Toko Utama (Root Genesis Toko A)
    const rootStore = branches.find((b) => b.is_main_branch === true);
    const rootStoreName = rootStore ? (rootStore.branch_name || rootStore.name || 'Toko Utama (Pusat)') : 'Toko Utama';

    // Normalisasi struktur output hierarki
    const formatted = branches.map((b) => ({
      id: b.id,
      shop_id: b.shop_id,
      organization_id: b.organization_id,
      name: b.branch_name || b.name,
      branch_name: b.branch_name || b.name,
      branch_code: b.branch_code,
      is_main_branch: Boolean(b.is_main_branch),
      parent_branch_id: b.parent_branch_id,
      parent_store_name: b.is_main_branch ? null : rootStoreName,
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

export const POST = withBossOnly(async (request, context, { user, profile, supabase }) => {
  try {
    const body = await request.json();
    const branchName = body.branch_name || body.name;
    const address = body.address || null;
    const phone = body.phone || body.phone_number || null;

    if (!branchName || branchName.trim().length === 0) {
      return errorResponse('Nama cabang wajib diisi.', 'VALIDATION_ERROR', 422);
    }

    // 1. Dapatkan organisasi aktif
    let org = await resolveOrganization(supabase, user, profile);
    if (!org?.id) {
      return errorResponse('Organisasi bisnis tidak ditemukan.', 'ORGANIZATION_NOT_FOUND', 404);
    }

    // 2. Gunakan Stored Procedure atomik create_child_branch untuk validasi kuota tier & relasi root Toko A
    const { data: rpcResult, error: rpcErr } = await supabase.rpc('create_child_branch', {
      p_org_id: org.id,
      p_branch_name: branchName.trim(),
      p_address: address ? address.trim() : null,
      p_phone: phone ? phone.trim() : null,
    });

    if (rpcErr) {
      return errorResponse(rpcErr.message, 'BRANCH_CREATION_FAILED', 400);
    }

    // 3. Inisialisasi baris stok di branch_product_stocks untuk seluruh produk toko induk
    if (rpcResult?.branch_id && rpcResult?.shop_id) {
      const { data: rootBranch } = await supabase
        .from('branches')
        .select('shop_id')
        .eq('organization_id', org.id)
        .eq('is_main_branch', true)
        .maybeSingle();

      const mainShopId = rootBranch?.shop_id;
      if (mainShopId) {
        const { data: existingProducts } = await supabase
          .from('products')
          .select('id, reorder_threshold')
          .eq('shop_id', mainShopId);

        if (existingProducts && existingProducts.length > 0) {
          const initRows = existingProducts.map((p) => ({
            branch_id: rpcResult.branch_id,
            product_id: p.id,
            available_stock: 0,
            in_transit_stock: 0,
            safety_stock: Number(p.reorder_threshold || 5),
          }));

          await supabase.from('branch_product_stocks').upsert(initRows, { onConflict: 'branch_id,product_id' });
        }
      }
    }

    return successResponse(rpcResult, 201);
  } catch (error) {
    console.error('[POST /branches]', error);
    return errorResponse(`Gagal membuat cabang baru: ${error.message}`, 'SERVER_ERROR', 500);
  }
});

export const DELETE = withBossOnly(async (request, context, { supabase }) => {
  try {
    const url = new URL(request.url);
    const branchId = url.searchParams.get('id');

    if (!branchId) {
      return errorResponse('Parameter branch ID wajib disertakan.', 'VALIDATION_ERROR', 422);
    }

    // Upaya menghapus cabang dari tabel branches
    const { error: delErr } = await supabase
      .from('branches')
      .delete()
      .eq('id', branchId);

    if (delErr) {
      if (delErr.message?.includes('2NDM-40301')) {
        return errorResponse(delErr.message, 'FORBIDDEN_IMMUTABLE_ROOT', 403);
      }
      return errorResponse(delErr.message, 'DELETE_ERROR', 400);
    }

    return successResponse({ success: true, message: 'Cabang berhasil dihapus.' });
  } catch (error) {
    console.error('[DELETE /branches]', error);
    return errorResponse(`Gagal menghapus cabang: ${error.message}`, 'SERVER_ERROR', 500);
  }
});
