/**
 * src/config/tiers.js
 * Single Source of Truth for Subscription Tiers & Feature Gates
 * Canonical 4 Tiers: MAGANG (0), SUPERVISOR (1), MANAJER (2), EKSEKUTIF (3)
 */

export const TIER_CONFIG = {
  MAGANG: {
    name: 'Kontrak Magang',
    tierCode: 'MAGANG',
    tierLevel: 0,
    price: 0,
    maxBranches: 1,
    maxCashiers: 1,
    maxMonthlyReceipts: 50,
    maxProducts: 50,
    historyDays: 7,
    features: {
      allow_kasbon: false,
      wa_tagihan: false,
      void_log: false,
      auto_wa_report: false,
      export_csv: false,
      multi_branch: false,
      vip_support: false,
    },
  },
  SUPERVISOR: {
    name: 'Supervisor Shift',
    tierCode: 'SUPERVISOR',
    tierLevel: 1,
    price: 149000,
    maxBranches: 1,
    maxCashiers: 2,
    maxMonthlyReceipts: Infinity,
    maxProducts: Infinity,
    historyDays: 30,
    features: {
      allow_kasbon: true,
      wa_tagihan: true,
      void_log: false,
      auto_wa_report: false,
      export_csv: false,
      multi_branch: false,
      vip_support: false,
    },
  },
  MANAJER: {
    name: 'Manajer Operasional',
    tierCode: 'MANAJER',
    tierLevel: 2,
    price: 349000,
    maxBranches: 1,
    maxCashiers: 5,
    maxMonthlyReceipts: Infinity,
    maxProducts: Infinity,
    historyDays: 365,
    features: {
      allow_kasbon: true,
      wa_tagihan: true,
      void_log: true,
      auto_wa_report: false,
      export_csv: true,
      multi_branch: false,
      vip_support: false,
    },
  },
  EKSEKUTIF: {
    name: 'Direktur Eksekutif',
    tierCode: 'EKSEKUTIF',
    tierLevel: 3,
    price: 399000,
    maxBranches: 3,
    maxCashiers: 10,
    maxMonthlyReceipts: Infinity,
    maxProducts: Infinity,
    historyDays: 3650,
    features: {
      allow_kasbon: true,
      wa_tagihan: true,
      void_log: true,
      auto_wa_report: true,
      export_csv: true,
      multi_branch: true,
      vip_support: true,
    },
  },
};

/**
 * Normalisasi nama plan ke format uppercase standar (MAGANG, SUPERVISOR, MANAJER, EKSEKUTIF)
 */
export function normalizeTier(plan) {
  if (!plan) return 'MAGANG';
  const uppercase = String(plan).trim().toUpperCase();
  if (uppercase === 'FREE' || uppercase === 'TRIAL' || uppercase === 'MAGANG') return 'MAGANG';
  if (uppercase === 'STANDARD' || uppercase === 'STARTER' || uppercase === 'SUPERVISOR') return 'SUPERVISOR';
  if (uppercase === 'JURAGAN' || uppercase === 'PLUS' || uppercase === 'MANAJER') return 'MANAJER';
  if (uppercase === 'PRO' || uppercase === 'EKSEKUTIF') return 'EKSEKUTIF';
  return TIER_CONFIG[uppercase] ? uppercase : 'MAGANG';
}

/**
 * Mengambil konfigurasi lengkap tier (selalu mengembalikan config valid)
 */
export function getTierConfig(plan) {
  const tierKey = normalizeTier(plan);
  return TIER_CONFIG[tierKey] || TIER_CONFIG.MAGANG;
}

/**
 * Kalkulasi Kapasitas Aditif:
 * Kapasitas Diizinkan = Batas Paket Pokok + Add-On Aktif
 */
export function calculateAdditiveCapacity({ tier, addOnCashiers = 0 }) {
  const config = getTierConfig(tier);
  const baseLimit = config.maxCashiers;
  const numericAddons = Math.max(0, parseInt(addOnCashiers, 10) || 0);
  const totalAllowed = baseLimit + numericAddons;
  return {
    tier: config.tierCode,
    tierName: config.name,
    baseLimit,
    addOns: numericAddons,
    totalAllowed,
  };
}

/**
 * Menghasilkan ISO String tanggal awal bulan berjalan dalam zona waktu Asia/Jakarta (WIB: UTC+7)
 * Menjamin reset kuota bulanan tepat pada pukul 00:00:00 WIB tanggal 1
 */
export function getWIBStartOfMonth(date = new Date()) {
  const jakartaStr = date.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  const jakartaDate = new Date(jakartaStr);
  const year = jakartaDate.getFullYear();
  const month = String(jakartaDate.getMonth() + 1).padStart(2, '0');
  
  // 00:00:00 WIB (UTC+7)
  const startOfMonthWIB = `${year}-${month}-01T00:00:00+07:00`;
  return new Date(startOfMonthWIB).toISOString();
}
