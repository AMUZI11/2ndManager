// src/lib/calculations.js — Business Logic Calculation Engine
// Single Source of Truth untuk semua formula kalkulasi HL
// Sesuai petunjuk.md Bagian 8 — Section 8: Master Calculation Reference

/**
 * Kalkulasi harga diskon bertingkat (cascading discount)
 * Sesuai AC-2.9: B × Π(1 - dᵢ/100)
 * Contoh: 100 × 0.8 × 0.8 × 0.9 = 57.6 (BUKAN 100 × 0.5 = 50)
 *
 * @param {number} basePrice - Harga dasar produk
 * @param {number[]} discountSteps - Array persentase diskon [20, 10, 5]
 * @returns {number} Harga setelah semua diskon diterapkan (dibulatkan)
 */
export function calculateCascadingDiscount(basePrice, discountSteps) {
  const steps = (discountSteps || []).filter(pct => Number(pct) > 0);
  if (steps.length === 0) return Math.round(basePrice);
  let price = Number(basePrice);
  for (const pct of steps) {
    price = price * (1 - Number(pct) / 100);
  }
  return Math.round(price);
}

/**
 * Menghitung semua totals untuk sebuah transaksi
 * Sesuai Formula Kalkulasi di petunjuk.md:
 * - Line Omzet = Discounted Unit Price × Qty
 * - Transaction Omzet = Σ Line Omzet (ONGKIR EXCLUDED)
 * - Amount Owed = Transaction Omzet + Ongkir
 * - Line Laba = (Discounted Price - Harga Modal) × Qty
 * - Transaction Laba = Σ Line Laba (ONGKIR EXCLUDED)
 *
 * @param {Array} items - Array of transaction items dengan discounted_unit_price, quantity, harga_modal_snapshot, is_bonus_item
 * @param {number} ongkir - Ongkos kirim
 * @returns {{ omzet_total, laba_total, amount_owed, items_with_calcs }}
 */
export function calculateTransactionTotals(items, ongkir = 0) {
  const itemsWithCalcs = items.map(item => {
    const discounted = Number(item.discounted_unit_price);
    const qty = Number(item.quantity);
    const modal = Number(item.harga_modal_snapshot);
    const isBonus = item.is_bonus_item === true;

    const line_omzet = isBonus ? 0 : discounted * qty;
    const line_laba = isBonus ? 0 : (discounted - modal) * qty;

    return { ...item, line_omzet, line_laba };
  });

  const omzet_total = itemsWithCalcs.reduce((sum, i) => sum + i.line_omzet, 0);
  const laba_total = itemsWithCalcs.reduce((sum, i) => sum + i.line_laba, 0);
  const amount_owed = omzet_total + Number(ongkir);

  return { omzet_total, laba_total, amount_owed, items_with_calcs: itemsWithCalcs };
}

/**
 * Mendapatkan batas waktu 5 tahun ke belakang.
 * Digunakan untuk menyaring data transaksi/laporan aktif.
 * @returns {Date} Batas tanggal 5 tahun yang lalu pada pukul 00:00:00.
 */
export function getFiveYearsAgoDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 5);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Menghitung bonus status untuk seorang pelanggan
 * Sesuai AC-5.x:
 * - Bonus Accumulator = Σ omzet_total WHERE status='Lunas' AND is_bonus=false
 * - Bonuses Granted = jumlah total bonus yang pernah diberikan
 * - Bonuses Available = floor(accumulator / threshold) - bonuses_granted
 *
 * @param {string} customerId
 * @param {import('@prisma/client').PrismaClient} prismaClient
 * @returns {{ accumulator, threshold, total_consumed, bonuses_available, bonuses_granted }}
 */
export async function calculateBonusStatus(customerId, prismaClient) {
  const customer = await prismaClient.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    return { accumulator: 0, threshold: 0, total_consumed: 0, bonuses_available: 0, bonuses_granted: 0 };
  }

  const fiveYearsAgo = getFiveYearsAgoDate();

  // Akumulasi omzet Lunas dari transaksi normal (bukan bon bonus) dalam 5 tahun terakhir
  const accResult = await prismaClient.transaction.aggregate({
    where: {
      customer_id: customerId,
      status: 'Lunas',
      is_bonus: false,
      tanggal: { gte: fiveYearsAgo },
    },
    _sum: { omzet_total: true },
  });

  // Total bonus yang pernah diberikan (dari BonusGrant) dalam 5 tahun terakhir
  const grantResult = await prismaClient.bonusGrant.aggregate({
    where: {
      customer_id: customerId,
      granted_at: { gte: fiveYearsAgo },
    },
    _sum: { bonuses_granted: true, omzet_consumed: true },
  });

  const accumulator = Number(accResult._sum.omzet_total || 0n);
  const threshold = Number(customer.bonus_threshold || 0n);
  const bonuses_granted = Number(grantResult._sum.bonuses_granted || 0);
  const total_consumed = Number(grantResult._sum.omzet_consumed || 0n);

  const bonuses_available = threshold > 0
    ? Math.max(0, Math.floor(accumulator / threshold) - bonuses_granted)
    : 0;

  return {
    accumulator,
    threshold,
    total_consumed,
    bonuses_available,
    bonuses_granted,
  };
}

/**
 * Helper: format customer dari Prisma menjadi format yang diharapkan frontend
 * Mengubah relasi CustomerDiscount[] menjadi:
 * - discounts: { [categoryCode]: number[] }  — generic (supports any category)
 * - discounts_lm / discounts_br — legacy shortcuts for backward compatibility
 */
export function formatCustomer(customer) {
  const rawDiscounts = customer.discounts || [];

  // Build generic discounts map: { 'LM': [20, 10], 'BR': [15], 'XY': [...] }
  const discountsMap = {};
  rawDiscounts.forEach(d => {
    if (!discountsMap[d.product_type]) {
      discountsMap[d.product_type] = [];
    }
    discountsMap[d.product_type].push({ step_order: d.step_order, percentage: Number(d.percentage) });
  });

  // Sort each category's steps and extract percentages
  const discounts = {};
  for (const [type, steps] of Object.entries(discountsMap)) {
    discounts[type] = steps
      .sort((a, b) => a.step_order - b.step_order)
      .map(s => s.percentage);
  }

  return {
    id: customer.id,
    nama: customer.nama,
    bonus_threshold: Number(customer.bonus_threshold),
    is_deleted: customer.is_deleted,
    discounts,                          // full generic map (new)
    discounts_lm: discounts['LM'] || [], // legacy shortcut
    discounts_br: discounts['BR'] || [], // legacy shortcut
    created_at: customer.created_at,
    updated_at: customer.updated_at,
  };
}

/**
 * Helper: format transaction dari Prisma menjadi format yang diharapkan frontend
 * Mengubah BigInt fields menjadi Number
 */
export function formatTransaction(tx) {
  return {
    id: tx.id,
    nomor_bon: tx.nomor_bon,
    tanggal: tx.tanggal instanceof Date ? tx.tanggal.toISOString().split('T')[0] : tx.tanggal,
    customer_id: tx.customer_id,
    ongkir: Number(tx.ongkir),
    deskripsi: tx.deskripsi,
    is_bonus: tx.is_bonus,
    status: tx.status,
    tanggal_lunas: tx.tanggal_lunas
      ? (tx.tanggal_lunas instanceof Date ? tx.tanggal_lunas.toISOString().split('T')[0] : tx.tanggal_lunas)
      : null,
    omzet_total: Number(tx.omzet_total),
    laba_total: Number(tx.laba_total),
    amount_owed: Number(tx.amount_owed),
    created_at: tx.created_at,
    updated_at: tx.updated_at,
    items: tx.items ? tx.items.map(formatTransactionItem) : undefined,
    customer: tx.customer ? formatCustomer({ ...tx.customer, discounts: [] }) : undefined,
  };
}

/**
 * Helper: format transaction item dari Prisma (BigInt → Number)
 */
export function formatTransactionItem(item) {
  return {
    id: item.id,
    transaction_id: item.transaction_id,
    product_id: item.product_id,
    quantity: item.quantity,
    product_type_snapshot: item.product_type_snapshot,
    harga_base_snapshot: Number(item.harga_base_snapshot),
    harga_modal_snapshot: Number(item.harga_modal_snapshot),
    discounted_unit_price: Number(item.discounted_unit_price),
    line_omzet: Number(item.line_omzet),
    line_laba: Number(item.line_laba),
    is_bonus_item: item.is_bonus_item,
    product: item.product ? {
      id: item.product.id,
      nama: item.product.nama,
      tipe: item.product.tipe,
      harga_base: Number(item.product.harga_base),
    } : undefined,
  };
}

/**
 * Helper: format produk dari Prisma (BigInt → Number)
 */
export function formatProduct(product) {
  return {
    id: product.id,
    nama: product.nama,
    harga_modal: Number(product.harga_modal),
    harga_base: Number(product.harga_base),
    tipe: product.tipe,
    is_deleted: product.is_deleted,
    created_at: product.created_at,
    updated_at: product.updated_at,
  };
}

/**
 * Memeriksa akumulasi omzet Lunas pelanggan dan membuat BonusGrant jika berhak
 */
export async function checkAndGrantBonuses(customerId, transactionId, prismaClient) {
  const customer = await prismaClient.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer || !customer.bonus_threshold || customer.bonus_threshold <= 0n) {
    return null;
  }

  // Calculate current bonus status before granting new ones
  const status = await calculateBonusStatus(customerId, prismaClient);
  
  if (status.bonuses_available > 0) {
    // Create a new BonusGrant record
    const newGrant = await prismaClient.bonusGrant.create({
      data: {
        customer_id: customerId,
        transaction_id: transactionId,
        bonuses_granted: status.bonuses_available,
        omzet_consumed: BigInt(status.bonuses_available) * customer.bonus_threshold,
      },
    });
    return newGrant;
  }
  return null;
}
