/**
 * src/utils/posEngine.js
 * Mesin Utilitas POS: Auto-Unpack Detection, Optimistic Local Stock, & Offline Guard
 */

/**
 * Deteksi kelayakan dan kebutuhan auto-unpack untuk produk eceran di keranjang POS
 * @param {Object} item - Item di keranjang (quantity, unit_id, product_id, dll)
 * @param {Object} product - Data produk master dari cache/state (stok_saat_ini, product_units, dll)
 * @returns {Object} Hasil evaluasi auto-unpack
 */
export function checkAutoUnpackEligibility(item, product) {
  if (!product || !item) {
    return { eligible: false, message: 'Data produk tidak lengkap' };
  }

  const requestedQty = parseInt(item.quantity, 10) || 1;
  const currentStock = parseInt(product.stok_saat_ini, 10) || 0;

  // Jika stok eceran saat ini sudah mencukupi, tidak perlu auto-unpack
  if (currentStock >= requestedQty) {
    return {
      eligible: false,
      needed: false,
      currentStock,
      requestedQty,
      message: 'Stok eceran mencukupi',
    };
  }

  // Cari kemasan induk bertingkat (Dus, Pak, Slop) dengan multiplier > 1 yang memiliki stok
  const availableUnits = (product.product_units || [])
    .filter((u) => !u.is_base_unit && Number(u.multiplier_to_base || 1) > 1 && Number(u.stock || 0) > 0)
    .sort((a, b) => Number(a.multiplier_to_base) - Number(b.multiplier_to_base));

  if (availableUnits.length === 0) {
    return {
      eligible: false,
      needed: true,
      currentStock,
      requestedQty,
      deficit: requestedQty - currentStock,
      message: 'Stok kemasan induk kosong atau tidak memiliki satuan bertingkat',
    };
  }

  // Pilih kemasan induk terkecil yang cukup atau terdekat
  const selectedParentUnit = availableUnits[0];
  const multiplier = Number(selectedParentUnit.multiplier_to_base);
  const deficit = requestedQty - currentStock;
  const unpacksNeeded = Math.ceil(deficit / multiplier);

  const isParentStockSufficient = Number(selectedParentUnit.stock || 0) >= unpacksNeeded;

  return {
    eligible: isParentStockSufficient,
    needed: true,
    currentStock,
    requestedQty,
    deficit,
    parentUnit: selectedParentUnit,
    unpacksNeeded,
    addedPcs: unpacksNeeded * multiplier,
    newExpectedStock: currentStock + (unpacksNeeded * multiplier),
    badgeText: `⚡ AUTO-UNPACK: ${unpacksNeeded} ${selectedParentUnit.unit_name} dipecah jadi ${unpacksNeeded * multiplier} Pcs`,
  };
}

/**
 * Terapkan auto-unpack secara optimistik di state/cache produk lokal (untuk operasional offline)
 * @param {Array} productsList - Daftar produk terkini
 * @param {string} productId - ID produk yang di-unpack
 * @param {number} requiredPcs - Jumlah pcs eceran yang dibutuhkan
 * @returns {Object} { updatedProducts, actionPayload }
 */
export function applyOptimisticAutoUnpack(productsList, productId, requiredPcs) {
  if (!Array.isArray(productsList)) return { updatedProducts: productsList, actionPayload: null };

  let actionPayload = null;

  const updatedProducts = productsList.map((prod) => {
    if (prod.id !== productId) return prod;

    const evalResult = checkAutoUnpackEligibility({ quantity: requiredPcs }, prod);
    if (!evalResult.eligible || !evalResult.parentUnit) return prod;

    const parentId = evalResult.parentUnit.id;
    const unpacksCount = evalResult.unpacksNeeded;
    const addedPcs = evalResult.addedPcs;

    // Mutasi stok kemasan induk & eceran di memori lokal
    const updatedUnits = (prod.product_units || []).map((u) => {
      if (u.id === parentId) {
        return { ...u, stock: Math.max(0, (Number(u.stock) || 0) - unpacksCount) };
      }
      return u;
    });

    actionPayload = {
      product_id: productId,
      required_pcs: requiredPcs,
      parent_unit_id: parentId,
      unpacks_count: unpacksCount,
      timestamp: Date.now(),
    };

    return {
      ...prod,
      stok_saat_ini: (Number(prod.stok_saat_ini) || 0) + addedPcs,
      product_units: updatedUnits,
    };
  });

  return {
    updatedProducts,
    actionPayload,
  };
}
