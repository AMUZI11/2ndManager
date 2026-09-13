import { withAdminAuth, logAdminAudit } from '@/lib/admin-auth';
import { successResponse, errorResponse } from '@/lib/auth-helpers';
import { TIER_CONFIG, normalizeTier, getTierConfig, calculateAdditiveCapacity, getWIBStartOfMonth } from '@/config/tiers';

/**
 * GET /api/v1/admin/tenants/[id]
 * Mengambil detail lengkap toko sasaran beserta kalkulasi kapasitas aditif
 */
export const GET = withAdminAuth(async (request, context, adminContext) => {
  const { supabaseAdmin } = adminContext;
  const params = await context.params;
  const shopId = params.id;

  try {
    const { data: shop, error: shopErr } = await supabaseAdmin
      .from('shops')
      .select(`
        id,
        name,
        created_at,
        subscription_tier,
        operational_status,
        chokehold_active,
        grace_period_until,
        cashier_limit,
        active_cashiers_count,
        owner_id,
        subscriptions (
          id,
          plan,
          valid_until,
          max_cashiers,
          max_branches
        )
      `)
      .eq('id', shopId)
      .single();

    if (shopErr || !shop) {
      console.warn('[GET /api/v1/admin/tenants/:id] Shop not found or query error:', shopErr);
      return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);
    }

    // Enrich owner data from auth.admin
    let owner = null;
    if (shop.owner_id) {
      try {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(shop.owner_id);
        if (u?.user) {
          owner = {
            id: u.user.id,
            email: u.user.email,
            raw_user_meta_data: u.user.user_metadata || {},
          };
        }
      } catch {}
    }

    const tier = normalizeTier(shop.subscription_tier);
    const tierConfig = getTierConfig(tier);
    const baseLimit = tierConfig.maxCashiers;
    const currentLimit = shop.cashier_limit || baseLimit;
    const addOns = Math.max(0, currentLimit - baseLimit);

    // Hitung transaksi bulan ini (Asia/Jakarta WIB)
    const startOfMonth = getWIBStartOfMonth();
    const { count: monthlyTxCount } = await supabaseAdmin
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('shop_id', shopId)
      .gte('created_at', startOfMonth);

    return successResponse({
      shop: {
        ...shop,
        owner,
        subscription_tier: tier,
      },
      capacity: {
        tier,
        tier_name: tierConfig.name,
        base_limit: baseLimit,
        add_ons: addOns,
        total_allowed: currentLimit,
        active_cashiers: shop.active_cashiers_count || 1,
        is_overridden: currentLimit !== baseLimit,
        formula: `${baseLimit} (Paket ${tierConfig.name}) + ${addOns} (Add-on/Override) = ${currentLimit} Kasir Diizinkan`,
      },
      telemetry: {
        monthly_transactions: monthlyTxCount || 0,
        monthly_limit: tierConfig.maxMonthlyReceipts,
      },
    });
  } catch (err) {
    console.error('[GET /api/v1/admin/tenants/:id]', err);
    return errorResponse('Gagal mengambil data inspeksi tenant.', 'SERVER_ERROR', 500);
  }
});

/**
 * PATCH /api/v1/admin/tenants/[id]
 * Override kuota kasir (cashier_limit) secara manual dengan audit trail & realtime sync
 */
export const PATCH = withAdminAuth(async (request, context, adminContext) => {
  const { supabaseAdmin, adminId, adminEmail, ipAddress, userAgent } = adminContext;
  const params = await context.params;
  const shopId = params.id;

  try {
    const body = await request.json();
    const { cashier_limit, reason } = body;

    const newLimit = parseInt(cashier_limit, 10);
    if (isNaN(newLimit) || newLimit < 1 || newLimit > 99) {
      return errorResponse('Batas kasir (cashier_limit) harus berupa angka valid antara 1 hingga 99.', 'VALIDATION_ERROR', 422);
    }

    if (!reason || reason.trim().length < 10) {
      return errorResponse('Justifikasi / alasan override wajib diisi minimal 10 karakter untuk dicatat di audit log.', 'VALIDATION_ERROR', 422);
    }

    // 1. Ambil data toko lama
    const { data: shop, error: shopErr } = await supabaseAdmin
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single();

    if (shopErr || !shop) {
      return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);
    }

    const previousLimit = shop.cashier_limit || 1;
    const tier = normalizeTier(shop.subscription_tier);
    const tierConfig = getTierConfig(tier);

    // 2. Update cashier_limit di tabel shops
    const { data: updatedShop, error: updateErr } = await supabaseAdmin
      .from('shops')
      .update({
        cashier_limit: newLimit,
      })
      .eq('id', shopId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 3. Update tabel subscriptions jika ada row
    try {
      await supabaseAdmin
        .from('subscriptions')
        .update({ max_cashiers: newLimit, updated_at: new Date().toISOString() })
        .eq('shop_id', shopId);
    } catch (subErr) {
      console.warn('[Subscriptions update warning]', subErr);
    }

    // 4. Catat tindakan ke immutable admin audit log
    await logAdminAudit({
      adminId,
      adminEmail,
      actionType: 'TENANT_QUOTA_OVERRIDE',
      targetShopId: shopId,
      reason: reason.trim(),
      metadata: {
        tier,
        base_package_limit: tierConfig.maxCashiers,
        previous_limit: previousLimit,
        new_limit: newLimit,
        additive_formula: `${tierConfig.maxCashiers} (Pokok) + ${Math.max(0, newLimit - tierConfig.maxCashiers)} (Add-On) = ${newLimit}`,
      },
      ipAddress,
      userAgent,
    });

    // 5. Broadcast realtime event ke shop_control channel
    try {
      const channel = supabaseAdmin.channel(`shop_control:${shopId}`);
      await channel.send({
        type: 'broadcast',
        event: 'STATUS_LOCK_UPDATE',
        payload: {
          event: 'CAPACITY_OVERRIDE_UPDATE',
          shop_id: shopId,
          cashier_limit: newLimit,
          reason: reason.trim(),
          timestamp: new Date().toISOString(),
        },
      });
    } catch (realtimeErr) {
      console.warn('[Realtime Broadcast Warning]', realtimeErr);
    }

    return successResponse({
      shop: updatedShop,
      capacity: {
        tier,
        base_limit: tierConfig.maxCashiers,
        new_limit: newLimit,
        is_overridden: newLimit !== tierConfig.maxCashiers,
      },
      message: `Batas kasir untuk toko "${shop.name}" berhasil diubah dari ${previousLimit} menjadi ${newLimit} kasir.`,
    });
  } catch (err) {
    console.error('[PATCH /api/v1/admin/tenants/:id]', err);
    return errorResponse('Gagal memperbarui kuota kasir tenant.', 'SERVER_ERROR', 500);
  }
});
