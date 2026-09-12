// src/app/api/v1/admin/summary/route.js
// Arcade Brutalist Mission Control Central Telemetry & KPIs
import { withAuthSupabase, errorResponse, successResponse } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const GET = withAuthSupabase(async (request, context, { user, profile, shopId, shopIds, isAllShops, supabase }) => {
  try {
    const adminEmails = (process.env.SUPERADMIN_EMAILS || process.env.ADMIN_EMAIL || 'ahza201111@gmail.com')
      .split(',')
      .map((e) => e.trim().toLowerCase());
    const isSuperadmin = adminEmails.includes(user.email?.toLowerCase()) || profile?.role === 'SUPERADMIN';

    // Kasir dilarang mengakses ringkasan admin
    if (profile?.role === 'CASHIER' && !isSuperadmin) {
      return errorResponse('Akses ditolak. Kasir tidak memiliki akses ke ringkasan Mission Control.', 'FORBIDDEN', 403);
    }

    const client = supabaseAdmin || supabase;
    const targetShopIds = (isAllShops || !shopId) 
      ? (shopIds && shopIds.length > 0 ? shopIds : [profile?.shop_id].filter(Boolean)) 
      : [shopId];

    // 1. Ambil daftar cabang (Shops) yang dikelola
    let shopsQuery = client
      .from('shops')
      .select('id, name, address, subscription_tier, operational_status, cashier_limit, created_at, parent_shop_id')
      .order('created_at', { ascending: true });

    if (!isSuperadmin) {
      if (targetShopIds.length > 0) {
        shopsQuery = shopsQuery.in('id', targetShopIds);
      } else {
        shopsQuery = shopsQuery.eq('owner_id', user.id);
      }
    }
    const { data: shopsList } = await shopsQuery;
    const activeShops = shopsList || [];
    const effectiveShopIds = activeShops.map((s) => s.id);

    // 2. Transaksi Hari Ini (Today's Transactions)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    let txQuery = client
      .from('transactions')
      .select('id, shop_id, total_amount, omzet_total, status, payment_method, amount_owed, created_at')
      .gte('created_at', todayIso);

    if (effectiveShopIds.length > 0) {
      txQuery = txQuery.in('shop_id', effectiveShopIds);
    }

    const { data: todayTxs, error: txErr } = await txQuery;
    if (txErr) console.warn('[Admin Summary] Tx fetch error:', txErr);

    const txs = todayTxs || [];

    let todayRevenue = 0;
    let todayTransactionsCount = 0;
    let todayVoidCount = 0;
    let todayVoidAmount = 0;
    let todayCashRevenue = 0;
    let todayQrisRevenue = 0;
    let todayTransferRevenue = 0;
    let todayKasbonRevenue = 0;

    txs.forEach((tx) => {
      const status = (tx.status || 'LUNAS').toUpperCase();
      const amount = Number(tx.omzet_total ?? tx.total_amount ?? 0);
      const method = (tx.payment_method || 'CASH').toUpperCase();

      if (status === 'VOID') {
        todayVoidCount += 1;
        todayVoidAmount += amount;
      } else {
        todayRevenue += amount;
        todayTransactionsCount += 1;

        if (status === 'PIUTANG' || method === 'KASBON') {
          todayKasbonRevenue += Number(tx.amount_owed || amount);
        } else if (method.includes('QRIS')) {
          todayQrisRevenue += amount;
        } else if (method.includes('TRANSFER') || method.includes('DEBIT') || method.includes('EDC')) {
          todayTransferRevenue += amount;
        } else {
          todayCashRevenue += amount;
        }
      }
    });

    // 3. Inventaris & Nilai Stok
    let prodQuery = client
      .from('products')
      .select('id, shop_id, nama, stok, harga_jual, harga_modal, min_stok');

    if (effectiveShopIds.length > 0) {
      prodQuery = prodQuery.in('shop_id', effectiveShopIds);
    }

    const { data: productsList } = await prodQuery;
    const prods = productsList || [];

    let totalInventoryValue = 0;
    let totalStockUnits = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    prods.forEach((p) => {
      const stock = Number(p.stok || 0);
      const cost = Number(p.harga_modal || 0);
      const minStock = Number(p.min_stok || 5);

      if (stock <= 0) {
        outOfStockCount += 1;
      } else if (stock <= minStock) {
        lowStockCount += 1;
      }

      totalStockUnits += Math.max(0, stock);
      totalInventoryValue += Math.max(0, stock) * cost;
    });

    // Estimasi Laba Operasional Hari Ini (~25% margin kotor jika hpp belum spesifik per item)
    const todayEstimatedProfit = Math.round(todayRevenue * 0.25);

    // 4. Kas di Laci dari Shift Aktif (Cash in Drawer)
    let shiftsQuery = client
      .from('shifts')
      .select('id, shop_id, cashier_name, initial_cash, current_cash, cash_sales, status')
      .eq('status', 'OPEN');

    if (effectiveShopIds.length > 0) {
      shiftsQuery = shiftsQuery.in('shop_id', effectiveShopIds);
    }
    const { data: openShifts } = await shiftsQuery;
    const activeOpenShifts = openShifts || [];
    const cashInDrawer = activeOpenShifts.reduce((acc, s) => {
      const current = Number(s.current_cash || (Number(s.initial_cash || 0) + Number(s.cash_sales || 0)));
      return acc + current;
    }, 0);

    // 5. Total Kasbon / Piutang Belum Lunas Keseluruhan
    let piutangQuery = client
      .from('transactions')
      .select('amount_owed')
      .eq('status', 'PIUTANG')
      .gt('amount_owed', 0);

    if (effectiveShopIds.length > 0) {
      piutangQuery = piutangQuery.in('shop_id', effectiveShopIds);
    }
    const { data: piutangTxs } = await piutangQuery;
    const totalOutstandingKasbon = (piutangTxs || []).reduce((acc, t) => acc + Number(t.amount_owed || 0), 0);

    // 6. Rincian Per Cabang (Max 3 Cabang Utama / Aktif)
    const branchBreakdown = activeShops.slice(0, 3).map((branch) => {
      const branchTxs = txs.filter((t) => t.shop_id === branch.id && (t.status || '').toUpperCase() !== 'VOID');
      const branchRevenue = branchTxs.reduce((acc, t) => acc + Number(t.omzet_total ?? t.total_amount ?? 0), 0);
      const branchStock = prods.filter((p) => p.shop_id === branch.id);
      const branchStockVal = branchStock.reduce((acc, p) => acc + Math.max(0, Number(p.stok || 0)) * Number(p.harga_modal || 0), 0);
      const activeShift = activeOpenShifts.find((s) => s.shop_id === branch.id);

      return {
        id: branch.id,
        name: branch.name,
        address: branch.address || 'Alamat Toko',
        tier: branch.subscription_tier || 'MAGANG',
        status: branch.operational_status || 'OPERATIONAL',
        todayRevenue: branchRevenue,
        txCount: branchTxs.length,
        stockItemsCount: branchStock.length,
        stockVal: branchStockVal,
        activeCashier: activeShift ? activeShift.cashier_name || 'Kasir' : null,
      };
    });

    // 7. Radar Anomali Keamanan Terbaru (Top 6)
    let anomaliesQuery = client
      .from('security_anomaly_events')
      .select('id, shop_id, event_type, severity, description, created_at, is_read_by_owner')
      .order('created_at', { ascending: false })
      .limit(6);

    if (effectiveShopIds.length > 0) {
      anomaliesQuery = anomaliesQuery.in('shop_id', effectiveShopIds);
    }
    const { data: anomaliesData } = await anomaliesQuery;

    // 8. Langganan & Lisensi
    const mainShop = activeShops.find((s) => !s.parent_shop_id) || activeShops[0];
    const licenseTier = mainShop?.subscription_tier || profile?.subscription_plan || 'MAGANG';

    return successResponse({
      timestamp: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        username: profile?.username || user.email.split('@')[0],
        role: profile?.role || 'BOSS',
        isSuperadmin,
      },
      metrics: {
        todayRevenue,
        todayEstimatedProfit,
        todayTransactionsCount,
        todayVoidCount,
        todayVoidAmount,
        todayCashRevenue,
        todayQrisRevenue,
        todayTransferRevenue,
        todayKasbonRevenue,
        totalInventoryValue,
        totalStockUnits,
        lowStockCount,
        outOfStockCount,
        cashInDrawer,
        totalOutstandingKasbon,
      },
      branches: branchBreakdown,
      anomalies: anomaliesData || [],
      license: {
        tier: licenseTier,
        status: mainShop?.operational_status || 'OPERATIONAL',
        branchCount: activeShops.length,
        maxBranches: 3,
        cashierLimit: mainShop?.cashier_limit || 2,
      },
    });
  } catch (err) {
    console.error('[Admin Summary Route Error]', err);
    return errorResponse('Gagal mengompilasi ringkasan Mission Control: ' + err.message, 'INTERNAL_ERROR', 500);
  }
});
