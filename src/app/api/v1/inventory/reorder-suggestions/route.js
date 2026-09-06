// GET /api/v1/inventory/reorder-suggestions
// Menghitung rekomendasi pesanan ulang kulakan pasar subuh dengan:
// 1. Stockout-aware sales velocity 7 hari (pembagian hari stok aktif > 0)
// 2. Pembulatan kemasan grosir terbesar (Dus/Bal/Slop/Karton) dari product_units Fase 1
// 3. Pengelompokan supplier / pasar umum & kalkulasi estimasi uang kas fisik
import { withAuthSupabase, errorResponse, successResponse, checkSubscriptionActive } from '@/lib/auth-helpers';
import { canAccessFeature } from '@/lib/subscription';

export const GET = withAuthSupabase(async (request, { params }, { user, profile, supabase }) => {
  try {
    let shopId = profile.shop_id;
    if (profile.role === 'BOSS') {
      const { data: userShop } = await supabase
        .from('user_shops').select('shop_id').eq('user_id', user.id).single();
      shopId = userShop?.shop_id || shopId;
    }

    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NO_SHOP', 400);

    // ─── TIER CHECK (Tier 2 Manajer & Tier 3 Eksekutif) ──────────────────────
    const { plan: currentTier } = await checkSubscriptionActive(supabase, shopId);
    if (!canAccessFeature(currentTier, 'smart_reorder')) {
      return errorResponse(
        'Fitur Radar Belanja Pasar Subuh Otomatis (Smart Re-Order) hanya aktif di Paket Manajer & Eksekutif.',
        'TIER_LOCKED',
        403
      );
    }

    // 1. Ambil seluruh produk toko aktif non-konsinyasi
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select(`
        id, nama, barcode, harga_modal, harga_base, stock, reorder_threshold, tipe,
        supplier_id, lead_time_days, min_reorder_qty, target_stock_days, created_at,
        suppliers (id, name, phone, contact_person, lead_time_days),
        product_units (id, unit_name, multiplier_to_base, price, is_base_unit, barcode)
      `)
      .eq('shop_id', shopId)
      .eq('is_deleted', false)
      .eq('is_consignment', false)
      .eq('is_active', true)
      .order('nama', { ascending: true });

    if (prodErr) throw prodErr;

    // 2. Ambil transaksi lunas dalam 7 hari terakhir
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const { data: transactions, error: txErr } = await supabase
      .from('transactions')
      .select(`
        id, tanggal, created_at,
        transaction_items (product_id, quantity, is_bonus_item)
      `)
      .eq('shop_id', shopId)
      .eq('status', 'Lunas')
      .gte('tanggal', sevenDaysAgoStr);

    if (txErr) throw txErr;

    // 3. Hitung penjualan & hari transaksi per produk
    const salesStats = {}; // { [productId]: { totalSold: number, saleDays: Set<string> } }

    for (const tx of transactions || []) {
      const txDate = tx.tanggal || tx.created_at?.split('T')[0] || '';
      for (const item of tx.transaction_items || []) {
        if (item.is_bonus_item) continue;
        const pid = item.product_id;
        if (!salesStats[pid]) {
          salesStats[pid] = { totalSold: 0, saleDays: new Set() };
        }
        salesStats[pid].totalSold += Number(item.quantity || 0);
        if (txDate) salesStats[pid].saleDays.add(txDate);
      }
    }

    // 4. Proses kalkulasi stockout-aware reorder per SKU
    const analyzedProducts = (products || []).map(p => {
      const stats = salesStats[p.id] || { totalSold: 0, saleDays: new Set() };
      const currentStock = Number(p.stock || 0);
      const hargaModal = Number(p.harga_modal || 0);
      const safetyStock = Math.max(0, Number(p.reorder_threshold ?? 5));
      const leadTime = Math.max(1, Number(p.lead_time_days || p.suppliers?.lead_time_days || 1));
      const targetDays = Math.max(1, Number(p.target_stock_days || 7));
      const minOrderQty = Math.max(1, Number(p.min_reorder_qty || 1));

      // ─── STOCKOUT-AWARE VELOCITY (Patch 1) ──────────────────────────────────
      // Jika stok habis (0), jangan bagi rata 7 hari kalender karena barang laku habis lebih awal.
      // Gunakan jumlah hari aktif penjualan, minimum 1 hari, maksimum 7 hari.
      let daysInStock = 7;
      if (currentStock <= 0) {
        daysInStock = Math.max(1, stats.saleDays.size);
      } else {
        // Jika stok masih ada, hari aktif = hari penjualan + 1 hari hari ini
        daysInStock = Math.min(7, Math.max(1, stats.saleDays.size + 1));
      }

      const dailyVelocity = parseFloat((stats.totalSold / daysInStock).toFixed(2));
      const reorderPoint = Math.ceil((dailyVelocity * leadTime) + safetyStock);
      const isUrgent = currentStock <= 0;
      const needsReorder = currentStock <= reorderPoint || currentStock <= safetyStock;

      // Target stok ideal & kuantitas dasar yang dibutuhkan
      const targetStockLevel = Math.ceil(dailyVelocity * targetDays) + safetyStock;
      const rawNeededBase = Math.max(targetStockLevel - currentStock, minOrderQty, 1);

      // ─── WHOLESALE PACKAGE ROUNDING (Patch 1) ──────────────────────────────
      // Cari kemasan bertingkat terbesar (Dus/Bal/Slop/Karton) dengan multiplier > 1
      const availableUnits = (p.product_units || []).sort(
        (a, b) => Number(b.multiplier_to_base || 1) - Number(a.multiplier_to_base || 1)
      );
      const wholesaleUnit = availableUnits.find(u => !u.is_base_unit && Number(u.multiplier_to_base || 1) > 1);

      let suggestedPacks = rawNeededBase;
      let suggestedQtyBase = rawNeededBase;
      let packUnitName = 'Pcs';
      let packMultiplier = 1;
      let packagingDisplay = `${rawNeededBase} Pcs`;

      if (wholesaleUnit) {
        packMultiplier = Number(wholesaleUnit.multiplier_to_base);
        packUnitName = wholesaleUnit.unit_name;
        // Bulatkan ke atas ke kelipatan kemasan grosir terdekat
        suggestedPacks = Math.ceil(rawNeededBase / packMultiplier);
        suggestedQtyBase = suggestedPacks * packMultiplier;
        packagingDisplay = `${suggestedPacks} ${packUnitName} (${suggestedQtyBase} Pcs)`;
      }

      const estimatedCost = suggestedQtyBase * hargaModal;

      return {
        id: p.id,
        nama: p.nama,
        barcode: p.barcode,
        tipe: p.tipe,
        current_stock: currentStock,
        safety_stock: safetyStock,
        lead_time_days: leadTime,
        daily_velocity: dailyVelocity,
        days_in_stock: daysInStock,
        reorder_point: reorderPoint,
        needs_reorder: needsReorder,
        is_urgent: isUrgent,
        harga_modal: hargaModal,
        harga_base: Number(p.harga_base || 0),
        raw_needed_base: rawNeededBase,
        suggested_packs: suggestedPacks,
        suggested_qty_base: suggestedQtyBase,
        pack_unit_name: packUnitName,
        pack_multiplier: packMultiplier,
        packaging_display: packagingDisplay,
        estimated_cost: estimatedCost,
        available_units: availableUnits,
        supplier: p.suppliers ? {
          id: p.suppliers.id,
          name: p.suppliers.name,
          phone: p.suppliers.phone,
          contact_person: p.suppliers.contact_person,
          lead_time_days: p.suppliers.lead_time_days,
        } : null,
      };
    });

    // 5. Filter & Grouping berdasarkan Supplier
    const reorderItems = analyzedProducts.filter(p => p.needs_reorder);

    const supplierGroups = {};
    for (const item of reorderItems) {
      const sKey = item.supplier?.id || 'unassigned';
      if (!supplierGroups[sKey]) {
        supplierGroups[sKey] = {
          supplier_id: item.supplier?.id || null,
          supplier_name: item.supplier?.name || 'Pasar Induk Subuh / Belanja Umum',
          supplier_phone: item.supplier?.phone || null,
          contact_person: item.supplier?.contact_person || null,
          is_general_market: !item.supplier,
          items: [],
          total_estimated_cost: 0,
          urgent_items_count: 0,
        };
      }
      supplierGroups[sKey].items.push(item);
      supplierGroups[sKey].total_estimated_cost += item.estimated_cost;
      if (item.is_urgent) supplierGroups[sKey].urgent_items_count += 1;
    }

    const groupsList = Object.values(supplierGroups).sort((a, b) => {
      // Prioritaskan agen dengan barang mendesak
      if (b.urgent_items_count !== a.urgent_items_count) {
        return b.urgent_items_count - a.urgent_items_count;
      }
      return b.total_estimated_cost - a.total_estimated_cost;
    });

    const totalSkusNeeded = reorderItems.length;
    const totalEstimatedCash = reorderItems.reduce((acc, it) => acc + it.estimated_cost, 0);
    const outOfStockCount = reorderItems.filter(it => it.is_urgent).length;
    const lowStockCount = totalSkusNeeded - outOfStockCount;

    return successResponse({
      summary: {
        total_skus_needed: totalSkusNeeded,
        total_estimated_cash: totalEstimatedCash,
        out_of_stock_count: outOfStockCount,
        low_stock_count: lowStockCount,
        supplier_count: groupsList.length,
      },
      supplier_groups: groupsList,
      all_reorder_items: reorderItems,
      all_products_evaluated: analyzedProducts,
    });
  } catch (error) {
    console.error('[GET /inventory/reorder-suggestions]', error);
    return errorResponse('Gagal menghitung rekomendasi pesanan belanja pasar.', 'SERVER_ERROR', 500);
  }
});
