/**
 * src/utils/inventoryResolver.js
 * Resolver Inventaris Fisik Cabang dengan Fail-Safe Lazy Provisioning
 * Menjamin pembacaan stok selalu terikat ke branch_id spesifik dan tidak pernah crash jika baris stok belum ada.
 */

/**
 * Mengambil stok fisik produk pada cabang tertentu dengan fail-safe lazy provisioning.
 * @param {Object} supabase - Supabase Client
 * @param {string} productId - UUID Produk Master
 * @param {string} branchId - UUID Cabang
 * @returns {Promise<{ available_stock: number, in_transit_stock: number, safety_stock: number }>}
 */
export async function getBranchStock(supabase, productId, branchId) {
  if (!supabase || !productId || !branchId) {
    return { available_stock: 0, in_transit_stock: 0, safety_stock: 0 };
  }

  try {
    const { data: stockRow, error } = await supabase
      .from('branch_product_stocks')
      .select('available_stock, in_transit_stock, safety_stock')
      .eq('branch_id', branchId)
      .eq('product_id', productId)
      .maybeSingle();

    if (error) {
      console.warn('[inventoryResolver] Error query branch_product_stocks:', error.message);
    }

    if (stockRow) {
      return {
        available_stock: Number(stockRow.available_stock || 0),
        in_transit_stock: Number(stockRow.in_transit_stock || 0),
        safety_stock: Number(stockRow.safety_stock || 0),
      };
    }

    // PENGARASAN TEKNIS 3: Fail-safe lazy provisioning jika baris stok belum terbuat
    try {
      const { data: inserted, error: insertErr } = await supabase
        .from('branch_product_stocks')
        .insert({
          branch_id: branchId,
          product_id: productId,
          available_stock: 0,
          in_transit_stock: 0,
          safety_stock: 5,
        })
        .select('available_stock, in_transit_stock, safety_stock')
        .single();

      if (!insertErr && inserted) {
        return {
          available_stock: Number(inserted.available_stock || 0),
          in_transit_stock: Number(inserted.in_transit_stock || 0),
          safety_stock: Number(inserted.safety_stock || 5),
        };
      }
    } catch (lazyErr) {
      console.warn('[inventoryResolver] Lazy provisioning fallback caught:', lazyErr);
    }

    return { available_stock: 0, in_transit_stock: 0, safety_stock: 5 };
  } catch (err) {
    console.error('[inventoryResolver] Gagal resolve stok cabang:', err);
    return { available_stock: 0, in_transit_stock: 0, safety_stock: 0 };
  }
}

/**
 * Mengambil katalog produk lengkap digabungkan dengan stok fisik cabang yang bersangkutan.
 * @param {Object} supabase - Supabase Client
 * @param {string} branchId - UUID Cabang
 * @returns {Promise<Array>}
 */
export async function getBranchProductCatalog(supabase, branchId) {
  if (!supabase || !branchId) return [];

  try {
    // 1. Ambil seluruh produk aktif
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('*')
      .eq('is_deleted', false)
      .order('nama', { ascending: true });

    if (prodErr) throw prodErr;
    if (!products || products.length === 0) return [];

    // 2. Ambil seluruh stok untuk branchId ini
    const { data: branchStocks, error: stockErr } = await supabase
      .from('branch_product_stocks')
      .select('product_id, available_stock, in_transit_stock, safety_stock')
      .eq('branch_id', branchId);

    if (stockErr) {
      console.warn('[inventoryResolver] Gagal load branch_product_stocks, fallback stok 0:', stockErr.message);
    }

    const stockMap = new Map();
    if (branchStocks && Array.isArray(branchStocks)) {
      branchStocks.forEach((s) => {
        stockMap.set(s.product_id, s);
      });
    }

    // 3. Gabungkan metadata produk dengan stok fisik cabang
    return products.map((p) => {
      const bStock = stockMap.get(p.id);
      return {
        ...p,
        // Override stock dengan available_stock cabang terkait
        stock: bStock ? Number(bStock.available_stock || 0) : 0,
        in_transit_stock: bStock ? Number(bStock.in_transit_stock || 0) : 0,
        safety_stock: bStock ? Number(bStock.safety_stock || 0) : Number(p.reorder_threshold || 5),
      };
    });
  } catch (err) {
    console.error('[inventoryResolver] Gagal load katalog produk cabang:', err);
    return [];
  }
}
