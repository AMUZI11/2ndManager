/**
 * 2ndManager Subscription & Feature Guard Configuration
 * Model: "Freemium Chokehold" & "Popcorn Pricing" (4 Tiers + Add-Ons)
 */

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
    name: 'Kontrak Magang',
    tier_label: 'TIER 0: THE FREE TRAP',
    badge: '[ DRAFT MAGANG ]',
    price: 0,
    price_formatted: 'Rp 0',
    period: '/bulan',
    desc: 'Uji coba terbatas untuk pembuktian sistem.',
    limits: {
      max_branches: 1,
      max_cashiers: 1,
      max_transactions_monthly: 50,
      max_report_days: 7,
      max_sku: 50,
    },
    features: {
      pos_kiosk: true,
      sku_unlimited: false,
      allow_kasbon: false,
      wa_tagihan: false,
      print_receipt: true,
      price_override_lock: false,
      blind_closing_basic: false,
      void_log: false,
      diskon_bertingkat: false,
      stok_opname: false,
      laporan_kasir: false,
      export_csv: false,
      audit_log: false,
      multi_branch: false,
      api_access: false,
      custom_receipt: false,
      auto_wa_report: false,
      vip_support: false,
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
    name: 'Kontrak Supervisor',
    tier_label: 'TIER 1: THE BASIC GATE',
    badge: '[ SUPERVISOR ]',
    price: 149000,
    price_formatted: 'Rp 149.000',
    period: '/bulan',
    desc: 'Operasional toko dasar tanpa batas transaksi.',
    limits: {
      max_branches: 1,
      max_cashiers: 2,
      max_transactions_monthly: 9999999, // Unlimited
      max_report_days: 30,
      max_sku: 999999,
    },
    features: {
      pos_kiosk: true,
      sku_unlimited: true,
      allow_kasbon: true,
      wa_tagihan: true,
      print_receipt: true,
      price_override_lock: true,
      blind_closing_basic: true,
      void_log: false,
      diskon_bertingkat: true,
      stok_opname: true,
      laporan_kasir: true,
      export_csv: false,
      audit_log: false,
      multi_branch: false,
      api_access: false,
      custom_receipt: false,
      auto_wa_report: false,
      vip_support: false,
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
    name: 'Kontrak Manajer Otonom',
    tier_label: 'TIER 2: THE OVERPRICED DECOY',
    badge: '[ MANAJER OTONOM ]',
    price: 349000,
    price_formatted: 'Rp 349.000',
    period: '/bulan',
    desc: 'Pengawasan anti-fraud & audit stok otomatis.',
    limits: {
      max_branches: 1,
      max_cashiers: 5,
      max_transactions_monthly: 9999999,
      max_report_days: 365,
      max_sku: 999999,
    },
    features: {
      pos_kiosk: true,
      sku_unlimited: true,
      allow_kasbon: true,
      wa_tagihan: true,
      print_receipt: true,
      price_override_lock: true,
      blind_closing_basic: true,
      void_log: true,
      diskon_bertingkat: true,
      stok_opname: true,
      laporan_kasir: true,
      export_csv: true,
      audit_log: true,
      multi_branch: false,
      api_access: false,
      custom_receipt: true,
      auto_wa_report: false,
      vip_support: false,
    },
    feature_list: [
      { text: 'Radar Kasir Nakal (Void/Selisih Log)', included: true },
      { text: 'Audit Stok Real-Time & HPP Modal', included: true },
      { text: '1 Cabang & Maksimal 5 Kasir', included: true },
      { text: 'Semua Fitur Paket Supervisor', included: true },
      { text: 'Multi-Cabang Terhubung', included: false },
      { text: 'Auto-Report WA Tiap 06:00 Pagi', included: false },
    ],
    cta_text: 'AKTIFKAN MANAJER',
  },

  EKSEKUTIF: {
    id: 'EKSEKUTIF',
    name: 'Kontrak Eksekutif',
    tier_label: 'TIER 3: THE ULTIMATE TARGET',
    badge: 'REKOMENDASI MUTLAK',
    deal_header: 'CUMA +RP 50.000 DARI PAKET MANAJER',
    price: 399000,
    price_formatted: 'Rp 399.000',
    period: '/bulan',
    desc: 'Komando multi-cabang lengkap dengan asisten WhatsApp 24/7.',
    limits: {
      max_branches: 3,
      max_cashiers: 10,
      max_transactions_monthly: 9999999,
      max_report_days: 3650,
      max_sku: 999999,
    },
    features: {
      pos_kiosk: true,
      sku_unlimited: true,
      allow_kasbon: true,
      wa_tagihan: true,
      print_receipt: true,
      price_override_lock: true,
      blind_closing_basic: true,
      void_log: true,
      diskon_bertingkat: true,
      stok_opname: true,
      laporan_kasir: true,
      export_csv: true,
      audit_log: true,
      multi_branch: true,
      api_access: true,
      custom_receipt: true,
      auto_wa_report: true,
      vip_support: true,
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
 * Normalisasi nama plan ke format uppercase standar:
 * - MAGANG (Tier 0: FREE / TRIAL)
 * - SUPERVISOR (Tier 1: STARTER / STANDARD)
 * - MANAJER (Tier 2: JURAGAN / PLUS)
 * - EKSEKUTIF (Tier 3: PRO)
 */
export function normalizePlan(plan) {
  if (!plan) return 'MAGANG';
  const uppercase = String(plan).trim().toUpperCase();
  if (uppercase === 'FREE' || uppercase === 'TRIAL' || uppercase === 'MAGANG') return 'MAGANG';
  if (uppercase === 'STANDARD' || uppercase === 'STARTER' || uppercase === 'SUPERVISOR') return 'SUPERVISOR';
  if (uppercase === 'JURAGAN' || uppercase === 'PLUS' || uppercase === 'MANAJER') return 'MANAJER';
  if (uppercase === 'PRO' || uppercase === 'EKSEKUTIF') return 'EKSEKUTIF';
  return SUBSCRIPTION_PLANS[uppercase] ? uppercase : 'MAGANG';
}

/**
 * Mengambil konfigurasi lengkap suatu paket (selalu valid, tidak pernah undefined)
 */
export function getPlanConfig(userPlan) {
  const planKey = normalizePlan(userPlan);
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
