/**
 * src/config/tierMapping.js
 * Canonical Tier Mapping & Realistic Add-On Pricing for 2ndManager
 * Provides bidirectional translation between user-facing friendly names and database legacy keys.
 */

export const ADDON_PRICING = {
  BRANCH: {
    monthlyUnitPrice: 150000,
    dailyRate: 5000, // 150.000 / 30 hari
    label: '+ Rp 150.000 / cabang / bulan (~Rp 5.000/hari)',
  },
  CASHIER: {
    monthlyUnitPrice: 40000,
    dailyRate: 40000 / 30, // ~1333.33 / hari
    label: '+ Rp 40.000 / kasir / bulan (~Rp 1.300/hari)',
  },
};

export const TIER_DEFINITIONS = {
  RINTISAN: {
    canonicalKey: 'RINTISAN',
    legacyKey: 'MAGANG',
    name: 'Rintisan',
    displayName: 'Rintisan',
    badgeLabel: '🌱 RINTISAN',
    price: 0,
    priceLabel: 'Rp 0 (Gratis)',
    baseBranches: 1,
    baseCashiers: 1,
    description: 'Pondasi operasional kasir mandiri bebas biaya untuk warung pemula.',
    features: [
      '1 Cabang Toko Utama (Toko A)',
      '1 Akun Kasir Aktif',
      'Pencatatan Penjualan & Cetak Struk',
      'Riwayat Laporan Keuangan 7 Hari',
      'Katalog Produk Maksimal 50 SKU',
      'Mode Kasir Cepat (Keyboard POS Ergonomis)',
    ],
    popular: false,
    color: 'border-slate-800',
  },
  MANDIRI: {
    canonicalKey: 'MANDIRI',
    legacyKey: 'SUPERVISOR',
    name: 'Mandiri',
    displayName: 'Mandiri',
    badgeLabel: '🛡️ MANDIRI',
    price: 50000,
    priceLabel: 'Rp 50.000',
    baseBranches: 1,
    baseCashiers: 2,
    description: 'Pengamanan penuh laci kas dari kecurangan dan radar anomali nota.',
    features: [
      'Semua Fitur Rintisan',
      'Maksimal 2 Kasir Aktif',
      'Laporan Keuangan 90 Hari',
      'Manajemen Kasbon & WhatsApp Tagihan',
      'Log Void & Pembatalan Transaksi',
      'Ekspor Laporan ke CSV / Excel',
      'Dukungan Teknis Standar',
    ],
    popular: false,
    color: 'border-slate-800',
  },
  USAHA_BERKEMBANG: {
    canonicalKey: 'USAHA_BERKEMBANG',
    legacyKey: 'MANAJER',
    name: 'Usaha Berkembang',
    displayName: 'Usaha Berkembang',
    badgeLabel: '📈 USAHA BERKEMBANG',
    price: 150000,
    priceLabel: 'Rp 150.000',
    baseBranches: 1,
    baseCashiers: 4,
    description: 'Kepatuhan pajak PP 55, akuntansi SAK EMKM, dan berkas KUR Bank resmi.',
    features: [
      'Semua Fitur Mandiri',
      'Maksimal 4 Kasir Aktif',
      'Riwayat Laporan Tanpa Batas (Unlimited)',
      'Multi-Satuan Barang (Pcs, Dus, Renceng)',
      'Margin Guard (Peringatan Jual Rugi)',
      'Manajemen Konsinyasi & Rekap Vendor',
      'Sistem Titipan Saldo Pelanggan',
      'Pergantian Shift Kasir & Rekap WA',
      'Smart Reorder (Saran Belanja Otomatis)',
    ],
    popular: true,
    color: 'border-amber-500 bg-amber-50/20',
  },
  JURAGAN_CABANG: {
    canonicalKey: 'JURAGAN_CABANG',
    legacyKey: 'EKSEKUTIF',
    name: 'Juragan Cabang',
    displayName: 'Juragan Cabang',
    badgeLabel: '👑 JURAGAN CABANG',
    price: 350000,
    priceLabel: 'Rp 350.000',
    baseBranches: 3,
    baseCashiers: 8,
    description: 'Kendali multi-cabang terpadu, transfer stok transit PIN, dan kontrol sentral.',
    features: [
      'Semua Fitur Usaha Berkembang',
      'Hingga 3 Cabang Toko Terhubung (Toko A + 2 Cabang)',
      'Maksimal 8 Kasir Aktif',
      'Transfer Stok Antar Cabang dengan Validasi PIN',
      'Laporan Konsolidasi Multi-Cabang',
      'Audit Forensik Fraud Kasir Tingkat Lanjut',
      'Pemisahan Akses Supervisor & Staf Kasir',
      'Prioritas Fitur Baru & VIP Support 24/7',
    ],
    popular: false,
    color: 'border-slate-800',
  },
};

/**
 * Normalisasi variasi input string ke key kanonikal:
 * 'MAGANG' / 'RINTISAN' -> 'RINTISAN'
 * 'SUPERVISOR' / 'MANDIRI' -> 'MANDIRI'
 * 'MANAJER' / 'USAHA_BERKEMBANG' -> 'USAHA_BERKEMBANG'
 * 'EKSEKUTIF' / 'JURAGAN_CABANG' -> 'JURAGAN_CABANG'
 */
export function normalizeTierKey(tierInput) {
  if (!tierInput) return 'RINTISAN';
  const upper = String(tierInput).trim().toUpperCase();
  if (upper === 'MAGANG' || upper === 'RINTISAN' || upper === 'FREE' || upper === 'TRIAL') {
    return 'RINTISAN';
  }
  if (upper === 'SUPERVISOR' || upper === 'MANDIRI' || upper === 'STANDARD' || upper === 'STARTER') {
    return 'MANDIRI';
  }
  if (upper === 'MANAJER' || upper === 'USAHA_BERKEMBANG' || upper === 'PLUS' || upper === 'JURAGAN') {
    return 'USAHA_BERKEMBANG';
  }
  if (upper === 'EKSEKUTIF' || upper === 'JURAGAN_CABANG' || upper === 'PRO') {
    return 'JURAGAN_CABANG';
  }
  return TIER_DEFINITIONS[upper] ? upper : 'RINTISAN';
}

/**
 * Mengambil key representasi database yang kompatibel dengan skema legacy Supabase
 */
export function toDbTierKey(tierInput) {
  const normalized = normalizeTierKey(tierInput);
  return TIER_DEFINITIONS[normalized]?.legacyKey || 'MAGANG';
}

/**
 * Mengambil konfigurasi tier kanonikal lengkap
 */
export function getCanonicalTier(tierInput) {
  const normalized = normalizeTierKey(tierInput);
  return TIER_DEFINITIONS[normalized] || TIER_DEFINITIONS.RINTISAN;
}
