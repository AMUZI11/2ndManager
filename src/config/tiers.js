/**
 * src/config/tiers.js
 * Single Source of Truth for Subscription Tiers & Feature Gates
 * Canonical 4 Tiers: MAGANG (0), SUPERVISOR (1), MANAJER (2), EKSEKUTIF (3)
 *
 * Fase 1 Additions:
 * - maxMultiUnitSKU: jumlah produk yang boleh punya multi-satuan
 * - maxActiveLoans: jumlah pinjaman aset fisik aktif per toko
 * - features.multi_unit: akses fitur konversi satuan
 * - features.margin_guard: alarm kenaikan HPP saat kulakan
 * - features.auto_reprice: tombol 1-klik adjust harga saat HPP naik
 * - features.print_label_queue: antrean cetak label rak
 * - features.asset_tracker: pelacakan tabung gas & galon
 * - features.wa_asset_recap: kirim rekap pinjaman via WhatsApp
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
    maxMultiUnitSKU: 0,
    maxActiveLoans: 0,
    maxConsignmentVendors: 0,
    historyDays: 7,
    features: {
      allow_kasbon: false,
      wa_tagihan: false,
      void_log: false,
      export_csv: false,
      multi_branch: false,
      vip_support: false,
      multi_unit: false,
      margin_guard: false,
      auto_reprice: false,
      print_label_queue: false,
      asset_tracker: false,
      wa_asset_recap: false,
      consignment: false,
      customer_deposit: false,
      wa_consignment_recap: false,
      negative_margin_guard: 'VISUAL_ONLY', // VISUAL_ONLY | CONFIRM_ONLY | HARD_BLOCK
      shift_handover: false, // false | 'BASIC' | 'ADVANCED'
      owner_pin_override: false,
      wa_shift_recap: false,
      smart_reorder: false,
      smart_reorder_basic: false,
      stockout_aware_velocity: false,
      pasar_subuh_mobile_mode: false,
      escpos_direct_print: false,
      multi_branch_centralized_procurement: false,
      stealth_telemetry_logging: false,
      realtime_security_alerts: false,
      double_blind_estafet: false,
      cash_skim_management: false,
      forensic_cart_drawer: false,
      multi_branch_security_radar: false,
      remote_panic_dispatch: false,
      smart_change_reconciler: false,
      asset_loan_tracker_basic: false,
      asset_loan_tracker_unlimited: false,
      atomic_multi_tier_unpack: false,
      consignment_management: false,
      consignment_whatsapp_receipt: false,
      multi_branch_access: false,
      inter_branch_stock_transfer: false,
      consolidated_dashboard_radar: false,
      tax_engine_basic: false,
      sak_emkm_financials: false,
      kur_bank_dossier_generator: false,
      qr_verification_seal: false,
      consolidated_multi_branch_reports: false,
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
    maxMultiUnitSKU: 15,
    maxActiveLoans: 20,
    maxConsignmentVendors: 5,
    historyDays: 30,
    features: {
      allow_kasbon: true,
      wa_tagihan: true,
      void_log: false,
      export_csv: false,
      multi_branch: false,
      vip_support: false,
      multi_unit: true,
      margin_guard: true,
      auto_reprice: false,
      print_label_queue: false,
      asset_tracker: true,
      wa_asset_recap: false,
      consignment: true,
      customer_deposit: true,
      wa_consignment_recap: false,
      negative_margin_guard: 'CONFIRM_ONLY',
      shift_handover: 'BASIC',
      owner_pin_override: false,
      wa_shift_recap: false,
      smart_reorder: false,
      smart_reorder_basic: true,
      stockout_aware_velocity: false,
      pasar_subuh_mobile_mode: false,
      escpos_direct_print: true,
      multi_branch_centralized_procurement: false,
      stealth_telemetry_logging: true,
      realtime_security_alerts: false,
      double_blind_estafet: false,
      cash_skim_management: true,
      forensic_cart_drawer: false,
      multi_branch_security_radar: false,
      remote_panic_dispatch: false,
      smart_change_reconciler: false,
      asset_loan_tracker_basic: true,
      asset_loan_tracker_unlimited: false,
      atomic_multi_tier_unpack: true,
      consignment_management: true,
      consignment_whatsapp_receipt: false,
      multi_branch_access: false,
      inter_branch_stock_transfer: false,
      consolidated_dashboard_radar: false,
      tax_engine_basic: true,
      sak_emkm_financials: false,
      kur_bank_dossier_generator: false,
      qr_verification_seal: false,
      consolidated_multi_branch_reports: false,
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
    maxMultiUnitSKU: Infinity,
    maxActiveLoans: Infinity,
    maxConsignmentVendors: Infinity,
    historyDays: 365,
    features: {
      allow_kasbon: true,
      wa_tagihan: true,
      void_log: true,
      export_csv: true,
      multi_branch: false,
      vip_support: false,
      multi_unit: true,
      margin_guard: true,
      auto_reprice: true,
      print_label_queue: true,
      asset_tracker: true,
      wa_asset_recap: true,
      consignment: true,
      customer_deposit: true,
      wa_consignment_recap: true,
      negative_margin_guard: 'HARD_BLOCK',
      shift_handover: 'ADVANCED',
      owner_pin_override: true,
      wa_shift_recap: true,
      smart_reorder: true,
      smart_reorder_basic: true,
      stockout_aware_velocity: true,
      pasar_subuh_mobile_mode: true,
      escpos_direct_print: true,
      multi_branch_centralized_procurement: false,
      stealth_telemetry_logging: true,
      realtime_security_alerts: true,
      double_blind_estafet: true,
      cash_skim_management: true,
      forensic_cart_drawer: true,
      multi_branch_security_radar: false,
      remote_panic_dispatch: true,
      smart_change_reconciler: true,
      asset_loan_tracker_basic: true,
      asset_loan_tracker_unlimited: true,
      atomic_multi_tier_unpack: true,
      consignment_management: true,
      consignment_whatsapp_receipt: true,
      multi_branch_access: false,
      inter_branch_stock_transfer: false,
      consolidated_dashboard_radar: false,
      tax_engine_basic: true,
      sak_emkm_financials: true,
      kur_bank_dossier_generator: true,
      qr_verification_seal: true,
      consolidated_multi_branch_reports: false,
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
    maxMultiUnitSKU: Infinity,
    maxActiveLoans: Infinity,
    maxConsignmentVendors: Infinity,
    historyDays: 3650,
    features: {
      allow_kasbon: true,
      wa_tagihan: true,
      void_log: true,
      export_csv: true,
      multi_branch: true,
      vip_support: true,
      multi_unit: true,
      margin_guard: true,
      auto_reprice: true,
      print_label_queue: true,
      asset_tracker: true,
      wa_asset_recap: true,
      consignment: true,
      customer_deposit: true,
      wa_consignment_recap: true,
      negative_margin_guard: 'HARD_BLOCK',
      shift_handover: 'ADVANCED',
      owner_pin_override: true,
      wa_shift_recap: true,
      smart_reorder: true,
      smart_reorder_basic: true,
      stockout_aware_velocity: true,
      pasar_subuh_mobile_mode: true,
      escpos_direct_print: true,
      multi_branch_centralized_procurement: true,
      stealth_telemetry_logging: true,
      realtime_security_alerts: true,
      double_blind_estafet: true,
      cash_skim_management: true,
      forensic_cart_drawer: true,
      multi_branch_security_radar: true,
      remote_panic_dispatch: true,
      smart_change_reconciler: true,
      asset_loan_tracker_basic: true,
      asset_loan_tracker_unlimited: true,
      atomic_multi_tier_unpack: true,
      consignment_management: true,
      consignment_whatsapp_receipt: true,
      multi_branch_access: true,
      inter_branch_stock_transfer: true,
      consolidated_dashboard_radar: true,
      tax_engine_basic: true,
      sak_emkm_financials: true,
      kur_bank_dossier_generator: true,
      qr_verification_seal: true,
      consolidated_multi_branch_reports: true,
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
