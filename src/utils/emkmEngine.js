// src/utils/emkmEngine.js
// Mesin Standar Akuntansi Keuangan Entitas Mikro, Kecil, dan Menengah (SAK EMKM)
// & Kalkulator Rasio Kelayakan Perbankan (Bank-Grade KUR Dossier Engine)

/**
 * Format Angka Akuntansi Standar SAK EMKM
 * Menampilkan tanda kurung (Rp ...) untuk saldo defisit / negatif
 */
export function formatAccountingRupiah(amount) {
  const num = Number(amount || 0);
  const formatted = Math.abs(num).toLocaleString('id-ID');
  if (num < 0) {
    return `(Rp ${formatted})`;
  }
  return `Rp ${formatted}`;
}

/**
 * Memvalidasi Keseimbangan Neraca SAK EMKM
 * Aset = Liabilitas + Ekuitas
 */
export function validateBalanceSheet({
  totalAssets = 0,
  totalLiabilities = 0,
  totalEquity = 0
}) {
  const assets = Math.round(Number(totalAssets || 0));
  const liabilitiesAndEquity = Math.round(Number(totalLiabilities || 0) + Number(totalEquity || 0));
  const diff = Math.abs(assets - liabilitiesAndEquity);
  const isBalanced = diff <= 1; // toleransi pembulatan pecahan desimal 1 rupiah

  return {
    isBalanced,
    totalAssets: assets,
    totalLiabilities: Math.round(Number(totalLiabilities || 0)),
    totalEquity: Math.round(Number(totalEquity || 0)),
    discrepancy: diff,
    statusText: isBalanced ? 'NERACA SEIMBANG (100% BALANCE)' : `NERACA TIDAK SEIMBANG (Selisih: Rp ${diff.toLocaleString('id-ID')})`
  };
}

/**
 * Kalkulasi Rasio Kelayakan Kredit Perbankan (KUR BRI/Mandiri/BNI/BSI)
 * 
 * Parameter Standar Analis Kredit UMKM:
 * 1. Likuiditas: Current Ratio (Rasio Lancar) >= 1.2x
 * 2. Rentabilitas: Net Profit Margin (NPM) >= 8%
 * 3. Solvabilitas / Kapasitas Bayar: Debt Service Coverage Ratio (DSCR) >= 1.3x
 */
export function calculateBankRatios({
  currentAssets = 0,
  currentLiabilities = 0,
  netSalesTurnover = 0,
  netOperatingProfit = 0,
  annualDebtService = 0, // Estimasi cicilan pinjaman tahunan
  totalAssets = 0,
  totalEquity = 0
}) {
  const ca = Number(currentAssets || 0);
  const cl = Number(currentLiabilities || 0);
  const turnover = Number(netSalesTurnover || 0);
  const netProfit = Number(netOperatingProfit || 0);

  // 1. Current Ratio
  let currentRatio = 1.0;
  if (cl > 0) {
    currentRatio = Number((ca / cl).toFixed(2));
  } else if (ca > 0) {
    currentRatio = 99.9; // Tidak ada kewajiban lancar = Sangat Likuid
  }

  // 2. Net Profit Margin (%)
  let netMarginPct = 0;
  if (turnover > 0) {
    netMarginPct = Number(((netProfit / turnover) * 100).toFixed(2));
  }

  // 3. Debt Service Coverage Ratio (DSCR)
  // Jika belum ada utang bank, simulasikan kapasitas angsuran wajar (maks 35% dari laba bersih)
  let dscrRatio = 2.0;
  if (annualDebtService > 0) {
    dscrRatio = Number((netProfit / annualDebtService).toFixed(2));
  } else if (netProfit > 0) {
    dscrRatio = 3.5; // Kapasitas bayar prima
  } else {
    dscrRatio = 0.5; // Usaha rugi
  }

  // 4. Scoring KUR & Evaluasi
  let kurScore = 'HIJAU';
  let bankabilityStatus = 'SANGAT LAYAK (PRIMA)';
  let assessmentSummary = 'Performa finansial memenuhi seluruh kriteria kelayakan fasilitas KUR komersial.';

  if (currentRatio >= 1.2 && netMarginPct >= 8.0 && dscrRatio >= 1.3) {
    kurScore = 'HIJAU';
    bankabilityStatus = 'SANGAT LAYAK (PRIMA)';
    assessmentSummary = 'Likuiditas sehat, profitabilitas kuat, dan rasio cakupan pelunasan utang sangat aman bagi perbankan.';
  } else if (currentRatio >= 1.0 && netMarginPct >= 3.0 && dscrRatio >= 1.0) {
    kurScore = 'KUNING';
    bankabilityStatus = 'CUKUP LAYAK (AGUNAN TAMBAHAN)';
    assessmentSummary = 'Arus kas stabil namun margin tipis atau likuiditas pas-pasan. Bank mungkin meminta jaminan tambahan atau agunan fisik.';
  } else {
    kurScore = 'MERAH';
    bankabilityStatus = 'PERLU PERBAIKAN FINANSIAL';
    assessmentSummary = 'Terdapat defisit laba atau kewajiban lancar melampaui aset lancar. Perlu efisiensi biaya sebelum pengajuan kredit.';
  }

  // 5. Rekomendasi Plafon KUR Berdasarkan Omzet & Kapasitas Bayar
  // Plafon dihitung aman = maks 30% omzet tahunan atau 3x laba bersih tahunan
  let recommendedCeiling = 0;
  let kurTier = 'KUR SUPER MIKRO';

  if (netProfit > 0) {
    const rawCeiling = Math.min(turnover * 0.3, netProfit * 3);
    if (rawCeiling <= 10000000) {
      recommendedCeiling = Math.max(5000000, Math.round(rawCeiling));
      kurTier = 'KUR SUPER MIKRO (s.d. Rp 10 Juta - Suku Bunga 3%)';
    } else if (rawCeiling <= 100000000) {
      recommendedCeiling = Math.round(rawCeiling / 5000000) * 5000000;
      kurTier = 'KUR MIKRO (Rp 10 Juta - Rp 100 Juta - Suku Bunga 6%)';
    } else {
      recommendedCeiling = Math.min(500000000, Math.round(rawCeiling / 10000000) * 10000000);
      kurTier = 'KUR KECIL (Rp 100 Juta - Rp 500 Juta - Suku Bunga 6%)';
    }
  }

  return {
    currentRatio,
    netMarginPct,
    dscrRatio,
    kurScore,
    bankabilityStatus,
    assessmentSummary,
    recommendedCeiling,
    kurTier,
    metrics: {
      currentAssets: ca,
      currentLiabilities: cl,
      netSalesTurnover: turnover,
      netOperatingProfit: netProfit,
      totalAssets: Number(totalAssets || 0),
      totalEquity: Number(totalEquity || 0)
    }
  };
}
