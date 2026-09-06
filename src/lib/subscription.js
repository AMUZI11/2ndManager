/**
 * 2ndManager Subscription & Feature Guard Configuration
 * Model: "Freemium Chokehold" & "Popcorn Pricing" (4 Tiers + Add-Ons)
 * Delegating Single Source of Truth to @/config/tiers
 */

import { 
  TIER_CONFIG, 
  normalizeTier, 
  getTierConfig, 
  calculateAdditiveCapacity, 
  getWIBStartOfMonth 
} from '@/config/tiers';

export { 
  TIER_CONFIG, 
  normalizeTier, 
  getTierConfig, 
  calculateAdditiveCapacity, 
  getWIBStartOfMonth 
};

export const ADD_ONS = {
  CASHIER: {
    id: 'CASHIER',
    name: 'Tambah Akun Kasir',
    price: 50000,
    price_formatted: 'Rp 50.000',
    unit: '/ Akun / Bulan',
    desc: 'Ekstensi akun kasir tambahan aktif',
  },
  BRANCH: {
    id: 'BRANCH',
    name: 'Tambah Cabang Toko',
    price: 150000,
    price_formatted: 'Rp 150.000',
    unit: '/ Cabang / Bulan',
    desc: 'Ekstensi cabang toko tambahan aktif',
  },
};

export const SUBSCRIPTION_PLANS = {
  MAGANG: {
    id: 'MAGANG',
    name: TIER_CONFIG.MAGANG.name,
    tier_label: 'TIER 0: THE FREE TRAP',
    badge: '[ DRAFT MAGANG ]',
    price: TIER_CONFIG.MAGANG.price,
    price_formatted: 'Rp 0',
    period: '/bulan',
    desc: 'Uji coba terbatas untuk pembuktian sistem.',
    limits: {
      max_branches: TIER_CONFIG.MAGANG.maxBranches,
      max_cashiers: TIER_CONFIG.MAGANG.maxCashiers,
      max_transactions_monthly: TIER_CONFIG.MAGANG.maxMonthlyReceipts,
      max_report_days: TIER_CONFIG.MAGANG.historyDays,
      max_sku: TIER_CONFIG.MAGANG.maxProducts,
    },
    features: {
      pos_kiosk: true,
      sku_unlimited: false,
      allow_kasbon: TIER_CONFIG.MAGANG.features.allow_kasbon,
      wa_tagihan: TIER_CONFIG.MAGANG.features.wa_tagihan,
      print_receipt: true,
      price_override_lock: false,
      blind_closing_basic: false,
      void_log: TIER_CONFIG.MAGANG.features.void_log,
      diskon_bertingkat: false,
      stok_opname: false,
      laporan_kasir: false,
      export_csv: TIER_CONFIG.MAGANG.features.export_csv,
      audit_log: false,
      multi_branch: TIER_CONFIG.MAGANG.features.multi_branch,
      api_access: false,
      custom_receipt: false,
      auto_wa_report: TIER_CONFIG.MAGANG.features.auto_wa_report,
      vip_support: TIER_CONFIG.MAGANG.features.vip_support,
      multi_unit: TIER_CONFIG.MAGANG.features.multi_unit,
      margin_guard: TIER_CONFIG.MAGANG.features.margin_guard,
      auto_reprice: TIER_CONFIG.MAGANG.features.auto_reprice,
      print_label_queue: TIER_CONFIG.MAGANG.features.print_label_queue,
      asset_tracker: TIER_CONFIG.MAGANG.features.asset_tracker,
      wa_asset_recap: TIER_CONFIG.MAGANG.features.wa_asset_recap,
      consignment: TIER_CONFIG.MAGANG.features.consignment,
      customer_deposit: TIER_CONFIG.MAGANG.features.customer_deposit,
      wa_consignment_recap: TIER_CONFIG.MAGANG.features.wa_consignment_recap,
      negative_margin_guard: TIER_CONFIG.MAGANG.features.negative_margin_guard,
      shift_handover: TIER_CONFIG.MAGANG.features.shift_handover,
      owner_pin_override: TIER_CONFIG.MAGANG.features.owner_pin_override,
      wa_shift_recap: TIER_CONFIG.MAGANG.features.wa_shift_recap,
      smart_reorder: TIER_CONFIG.MAGANG.features.smart_reorder,
    },
    feature_list: [
      { text: 'Mesin Kasir POS Dasar', included: true },
      { text: '1 Cabang & 1 Akun Kasir', included: true },
      { text: 'Batas 50 Transaksi (Struk) / Bulan', included: true },
      { text: 'Sistem Terkunci Setelah 50 Struk', included: false },
      { text: 'Laporan Laba / Rugi Riil', included: false },
      { text: 'Radar Anti-Fraud Kasir Nakal', included: false },
    ],
    cta_text: 'REKRUT ANAK MAGANG',
  },

  SUPERVISOR: {
    id: 'SUPERVISOR',
    name: TIER_CONFIG.SUPERVISOR.name,
    tier_label: 'TIER 1: THE BASIC GATE',
    badge: '[ SUPERVISOR ]',
    price: TIER_CONFIG.SUPERVISOR.price,
    price_formatted: 'Rp 149.000',
    period: '/bulan',
    desc: 'Operasional toko dasar tanpa batas transaksi.',
    limits: {
      max_branches: TIER_CONFIG.SUPERVISOR.maxBranches,
      max_cashiers: TIER_CONFIG.SUPERVISOR.maxCashiers,
      max_transactions_monthly: TIER_CONFIG.SUPERVISOR.maxMonthlyReceipts,
      max_report_days: TIER_CONFIG.SUPERVISOR.historyDays,
      max_sku: TIER_CONFIG.SUPERVISOR.maxProducts,
    },
    features: {
      pos_kiosk: true,
      sku_unlimited: true,
      allow_kasbon: TIER_CONFIG.SUPERVISOR.features.allow_kasbon,
      wa_tagihan: TIER_CONFIG.SUPERVISOR.features.wa_tagihan,
      print_receipt: true,
      price_override_lock: true,
      blind_closing_basic: true,
      void_log: TIER_CONFIG.SUPERVISOR.features.void_log,
      diskon_bertingkat: true,
      stok_opname: true,
      laporan_kasir: true,
      export_csv: TIER_CONFIG.SUPERVISOR.features.export_csv,
      audit_log: false,
      multi_branch: TIER_CONFIG.SUPERVISOR.features.multi_branch,
      api_access: false,
      custom_receipt: false,
      auto_wa_report: TIER_CONFIG.SUPERVISOR.features.auto_wa_report,
      vip_support: TIER_CONFIG.SUPERVISOR.features.vip_support,
      multi_unit: TIER_CONFIG.SUPERVISOR.features.multi_unit,
      margin_guard: TIER_CONFIG.SUPERVISOR.features.margin_guard,
      auto_reprice: TIER_CONFIG.SUPERVISOR.features.auto_reprice,
      print_label_queue: TIER_CONFIG.SUPERVISOR.features.print_label_queue,
      asset_tracker: TIER_CONFIG.SUPERVISOR.features.asset_tracker,
      wa_asset_recap: TIER_CONFIG.SUPERVISOR.features.wa_asset_recap,
      consignment: TIER_CONFIG.SUPERVISOR.features.consignment,
      customer_deposit: TIER_CONFIG.SUPERVISOR.features.customer_deposit,
      wa_consignment_recap: TIER_CONFIG.SUPERVISOR.features.wa_consignment_recap,
      negative_margin_guard: TIER_CONFIG.SUPERVISOR.features.negative_margin_guard,
      shift_handover: TIER_CONFIG.SUPERVISOR.features.shift_handover,
      owner_pin_override: TIER_CONFIG.SUPERVISOR.features.owner_pin_override,
      wa_shift_recap: TIER_CONFIG.SUPERVISOR.features.wa_shift_recap,
      smart_reorder: TIER_CONFIG.SUPERVISOR.features.smart_reorder,
    },
    feature_list: [
      { text: 'Transaksi (Struk) Unlimited', included: true },
      { text: '1 Cabang & Maksimal 2 Kasir', included: true },
      { text: 'Laporan Laba/Rugi Dasar', included: true },
      { text: 'Pencatatan Kasbon Pelanggan', included: true },
      { text: 'Radar Kasir Nakal (Anti-Fraud)', included: false },
      { text: 'Multi-Cabang Konsolidasi', included: false },
    ],
    cta_text: 'REKRUT SUPERVISOR',
  },

  MANAJER: {
    id: 'MANAJER',
    name: TIER_CONFIG.MANAJER.name,
    tier_label: 'TIER 2: THE OVERPRICED DECOY',
    badge: '[ MANAJER OTONOM ]',
    price: TIER_CONFIG.MANAJER.price,
    price_formatted: 'Rp 349.000',
    period: '/bulan',
    desc: 'Pengawasan anti-fraud & audit stok otomatis.',
    limits: {
      max_branches: TIER_CONFIG.MANAJER.maxBranches,
      max_cashiers: TIER_CONFIG.MANAJER.maxCashiers,
      max_transactions_monthly: TIER_CONFIG.MANAJER.maxMonthlyReceipts,
      max_report_days: TIER_CONFIG.MANAJER.historyDays,
      max_sku: TIER_CONFIG.MANAJER.maxProducts,
    },
    features: {
      pos_kiosk: true,
      sku_unlimited: true,
      allow_kasbon: TIER_CONFIG.MANAJER.features.allow_kasbon,
      wa_tagihan: TIER_CONFIG.MANAJER.features.wa_tagihan,
      print_receipt: true,
      price_override_lock: true,
      blind_closing_basic: true,
      void_log: TIER_CONFIG.MANAJER.features.void_log,
      diskon_bertingkat: true,
      stok_opname: true,
      laporan_kasir: true,
      export_csv: TIER_CONFIG.MANAJER.features.export_csv,
      audit_log: true,
      multi_branch: TIER_CONFIG.MANAJER.features.multi_branch,
      api_access: false,
      custom_receipt: true,
      auto_wa_report: TIER_CONFIG.MANAJER.features.auto_wa_report,
      vip_support: TIER_CONFIG.MANAJER.features.vip_support,
      multi_unit: TIER_CONFIG.MANAJER.features.multi_unit,
      margin_guard: TIER_CONFIG.MANAJER.features.margin_guard,
      auto_reprice: TIER_CONFIG.MANAJER.features.auto_reprice,
      print_label_queue: TIER_CONFIG.MANAJER.features.print_label_queue,
      asset_tracker: TIER_CONFIG.MANAJER.features.asset_tracker,
      wa_asset_recap: TIER_CONFIG.MANAJER.features.wa_asset_recap,
      consignment: TIER_CONFIG.MANAJER.features.consignment,
      customer_deposit: TIER_CONFIG.MANAJER.features.customer_deposit,
      wa_consignment_recap: TIER_CONFIG.MANAJER.features.wa_consignment_recap,
      negative_margin_guard: TIER_CONFIG.MANAJER.features.negative_margin_guard,
      shift_handover: TIER_CONFIG.MANAJER.features.shift_handover,
      owner_pin_override: TIER_CONFIG.MANAJER.features.owner_pin_override,
      wa_shift_recap: TIER_CONFIG.MANAJER.features.wa_shift_recap,
      smart_reorder: TIER_CONFIG.MANAJER.features.smart_reorder,
    },
    feature_list: [
      { text: 'Radar Kasir Nakal (Void/Selisih Log)', included: true },
      { text: 'Audit Stok Real-Time & HPP Modal', included: true },
      { text: 'Daftar Belanja Pasar Subuh Otomatis', included: true },
      { text: '1 Cabang & Maksimal 5 Kasir', included: true },
      { text: 'Semua Fitur Paket Supervisor', included: true },
      { text: 'Auto-Report WA Tiap 06:00 Pagi', included: false },
    ],
    cta_text: 'AKTIFKAN MANAJER',
  },

  EKSEKUTIF: {
    id: 'EKSEKUTIF',
    name: TIER_CONFIG.EKSEKUTIF.name,
    tier_label: 'TIER 3: THE ULTIMATE TARGET',
    badge: 'REKOMENDASI MUTLAK',
    deal_header: 'CUMA +RP 50.000 DARI PAKET MANAJER',
    price: TIER_CONFIG.EKSEKUTIF.price,
    price_formatted: 'Rp 399.000',
    period: '/bulan',
    desc: 'Komando multi-cabang lengkap dengan asisten WhatsApp 24/7.',
    limits: {
      max_branches: TIER_CONFIG.EKSEKUTIF.maxBranches,
      max_cashiers: TIER_CONFIG.EKSEKUTIF.maxCashiers,
      max_transactions_monthly: TIER_CONFIG.EKSEKUTIF.maxMonthlyReceipts,
      max_report_days: TIER_CONFIG.EKSEKUTIF.historyDays,
      max_sku: TIER_CONFIG.EKSEKUTIF.maxProducts,
    },
    features: {
      pos_kiosk: true,
      sku_unlimited: true,
      allow_kasbon: TIER_CONFIG.EKSEKUTIF.features.allow_kasbon,
      wa_tagihan: TIER_CONFIG.EKSEKUTIF.features.wa_tagihan,
      print_receipt: true,
      price_override_lock: true,
      blind_closing_basic: true,
      void_log: TIER_CONFIG.EKSEKUTIF.features.void_log,
      diskon_bertingkat: true,
      stok_opname: true,
      laporan_kasir: true,
      export_csv: TIER_CONFIG.EKSEKUTIF.features.export_csv,
      audit_log: true,
      multi_branch: TIER_CONFIG.EKSEKUTIF.features.multi_branch,
      api_access: true,
      custom_receipt: true,
      auto_wa_report: TIER_CONFIG.EKSEKUTIF.features.auto_wa_report,
      vip_support: TIER_CONFIG.EKSEKUTIF.features.vip_support,
      multi_unit: TIER_CONFIG.EKSEKUTIF.features.multi_unit,
      margin_guard: TIER_CONFIG.EKSEKUTIF.features.margin_guard,
      auto_reprice: TIER_CONFIG.EKSEKUTIF.features.auto_reprice,
      print_label_queue: TIER_CONFIG.EKSEKUTIF.features.print_label_queue,
      asset_tracker: TIER_CONFIG.EKSEKUTIF.features.asset_tracker,
      wa_asset_recap: TIER_CONFIG.EKSEKUTIF.features.wa_asset_recap,
      consignment: TIER_CONFIG.EKSEKUTIF.features.consignment,
      customer_deposit: TIER_CONFIG.EKSEKUTIF.features.customer_deposit,
      wa_consignment_recap: TIER_CONFIG.EKSEKUTIF.features.wa_consignment_recap,
      negative_margin_guard: TIER_CONFIG.EKSEKUTIF.features.negative_margin_guard,
      shift_handover: TIER_CONFIG.EKSEKUTIF.features.shift_handover,
      owner_pin_override: TIER_CONFIG.EKSEKUTIF.features.owner_pin_override,
      wa_shift_recap: TIER_CONFIG.EKSEKUTIF.features.wa_shift_recap,
      smart_reorder: TIER_CONFIG.EKSEKUTIF.features.smart_reorder,
    },
    feature_list: [
      { text: 'Auto-Report WhatsApp Pukul 06:00 Pagi', included: true, star: true },
      { text: 'Multi-Cabang Aktif (Maks 3 Cabang)', included: true, star: true },
      { text: 'Maksimal 10 Akun Kasir', included: true, star: true },
      { text: 'Radar Kasir Nakal & Blind Closing Audit', included: true },
      { text: 'VIP Support (Jalur Prioritas Bos)', included: true, star: true },
      { text: 'Semua Fitur Manajer Otonom', included: true },
    ],
    cta_text: 'TANDA TANGANI KONTRAK EKSEKUTIF',
  },
};

// Plan Aliases for backward & cross-version compatibility
SUBSCRIPTION_PLANS.JURAGAN = SUBSCRIPTION_PLANS.MANAJER;
SUBSCRIPTION_PLANS.PRO = SUBSCRIPTION_PLANS.EKSEKUTIF;
SUBSCRIPTION_PLANS.STARTER = SUBSCRIPTION_PLANS.SUPERVISOR;
SUBSCRIPTION_PLANS.STANDARD = SUBSCRIPTION_PLANS.SUPERVISOR;
SUBSCRIPTION_PLANS.FREE = SUBSCRIPTION_PLANS.MAGANG;
SUBSCRIPTION_PLANS.TRIAL = SUBSCRIPTION_PLANS.MAGANG;

/**
 * Normalisasi nama plan ke format uppercase standar
 */
export function normalizePlan(plan) {
  return normalizeTier(plan);
}

/**
 * Mengambil konfigurasi lengkap suatu paket (selalu valid, tidak pernah undefined)
 */
export function getPlanConfig(userPlan) {
  const planKey = normalizeTier(userPlan);
  return SUBSCRIPTION_PLANS[planKey] || SUBSCRIPTION_PLANS.MAGANG;
}

/**
 * Validation Helper Feature Gating (Frontend & Backend)
 */
export function canAccessFeature(userPlan, featureName) {
  const config = getPlanConfig(userPlan);
  if (!config || !config.features) return false;
  return Boolean(config.features[featureName]);
}

/**
 * Mengambil nilai spesifik dari konfigurasi fitur (misal: 'VISUAL_ONLY', 'CONFIRM_ONLY', 'HARD_BLOCK', 'BASIC', 'ADVANCED')
 */
export function getFeatureValue(userPlan, featureName) {
  const config = getPlanConfig(userPlan);
  if (!config || !config.features) return null;
  return config.features[featureName] ?? null;
}


/**
 * Validation Helper Capacity Limits with Add-Ons Formula:
 * (Total Aktif) <= (Batas Paket + Add-On Dibeli)
 */
export function checkCapacityLimit(userPlan, currentCount, entityType, addOnsPurchased = 0) {
  const config = getPlanConfig(userPlan);
  const baseLimit = entityType === 'branch' 
    ? config.limits.max_branches 
    : entityType === 'cashier' 
    ? config.limits.max_cashiers 
    : config.limits.max_transactions_monthly;

  const totalAllowed = baseLimit + addOnsPurchased;

  if (currentCount > totalAllowed) {
    const entityLabel = entityType === 'branch' ? 'cabang toko' : entityType === 'cashier' ? 'akun kasir' : 'transaksi';
    return {
      allowed: false,
      baseLimit,
      addOnsPurchased,
      totalAllowed,
      current: currentCount,
      message: `Batas Kapasitas Tercapai. Batas paket ${config.name} (${totalAllowed} ${entityLabel}) telah penuh. Beli Add-On atau Upgrade Kontrak Anda.`,
    };
  }

  return {
    allowed: true,
    baseLimit,
    addOnsPurchased,
    totalAllowed,
    current: currentCount,
    message: 'OK',
  };
}

// Alias for backward compatibility (some API routes use this name)
export const checkQuotaLimit = checkCapacityLimit;
