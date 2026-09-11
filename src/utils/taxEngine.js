// src/utils/taxEngine.js
// Mesin Regulasi Fiskal UMKM Indonesia sesuai PP 55 Tahun 2022
// Fasilitas Bebas Pajak Omzet hingga Rp 500 Juta / tahun takwim untuk Wajib Pajak Orang Pribadi (WPOP)
// Tarif PPh Final 0,5% untuk Badan Usaha (CV/PT) dari rupiah pertama, atau kelebihan omzet WPOP

export const PP55_RULES = {
  INDIVIDUAL_TAX_FREE_LIMIT: 500000000, // Rp 500.000.000
  CORPORATE_TAX_FREE_LIMIT: 0,          // Rp 0
  PPH_FINAL_RATE: 0.005,                // 0.5%
  TAX_CODES: {
    ACCOUNT_CODE: '411128',             // Kode Akun Pajak PPh Final
    DEPOSIT_CODE: '420',                // Kode Jenis Setoran Final UMKM PP 55/2022
    DESCRIPTION: 'PPh Final PP 55/2022 atas Penghasilan Usaha UMKM'
  }
};

/**
 * Sanitasi Dasar Pengenaan Pajak (DPP)
 * Memastikan omzet yang kena pajak bebas dari distorsi dana titipan/escrow dan mutasi cabang.
 * 
 * Aturan Sanitasi:
 * 1. Omzet penjualan produk reguler (COMPLETED & NOT VOID)
 * 2. + Margin bersih konsinyasi (Komisi warung atas barang titipan yang laku, BUKAN total omzet pemilik barang)
 * 3. - DANA TITIPAN/ESCROW WADAH (Deposit tabung gas & galon BUKAN omzet penjualan)
 * 4. - REFUND / PENGEMBALIAN DEPOSIT KE KONSUMEN (BUKAN pengurang laba kotor)
 * 5. - MUTASI ANTAR-CABANG (Perpindahan internal, BUKAN transaksi jual beli komersial)
 * 6. - PELUNASAN BON / PIUTANG KAS (Realisasi kas, omzetnya sudah diakui saat transaksi bon terjadi)
 */
export function sanitizeTurnover({
  grossSales = 0,
  consignmentMargin = 0,
  escrowDeposits = 0,
  debtRepayments = 0,
  branchTransfers = 0,
}) {
  // Dalam pembukuan 2ndManager, transaksi kasir reguler sudah tidak mencakup escrow (disimpan terpisah)
  // Namun jika ada raw ledger, formula sanitasi tegas adalah:
  const rawTotal = Number(grossSales || 0);
  const addOns = Number(consignmentMargin || 0);
  const deductions = Number(escrowDeposits || 0) + Number(debtRepayments || 0) + Number(branchTransfers || 0);
  
  const sanitizedDpp = Math.max(0, rawTotal + addOns - deductions);
  return {
    rawGross: rawTotal,
    consignmentMargin: addOns,
    deductionsTotal: deductions,
    sanitizedDpp
  };
}

/**
 * Evaluasi Kepatuhan & Kewajiban Pajak PP 55/2022
 * 
 * @param {Object} params
 * @param {number} params.annualSanitizedDpp - Total omzet tersanitasi tahun takwim berjalan
 * @param {boolean} params.isCorporate - True jika CV/PT, False jika WPOP (Perorangan)
 * @param {Array} [params.monthlyTurnovers] - Array rincian omzet 12 bulan
 */
export function evaluatePP55Compliance({
  annualSanitizedDpp = 0,
  isCorporate = false,
  monthlyTurnovers = []
}) {
  const dpp = Number(annualSanitizedDpp || 0);
  const taxFreeLimit = isCorporate ? PP55_RULES.CORPORATE_TAX_FREE_LIMIT : PP55_RULES.INDIVIDUAL_TAX_FREE_LIMIT;

  // Sisa kuota bebas pajak
  const remainingTaxFree = Math.max(0, taxFreeLimit - dpp);
  
  // DPP yang dikenakan pajak
  const taxableDpp = Math.max(0, dpp - taxFreeLimit);
  
  // PPh Final 0,5% Terutang
  const pphFinalDue = Math.round(taxableDpp * PP55_RULES.PPH_FINAL_RATE);

  // Tarif Efektif Riil
  const effectiveRate = dpp > 0 ? Number(((pphFinalDue / dpp) * 100).toFixed(2)) : 0;

  // Status Kepatuhan & Peringatan
  let complianceStatus = 'BEBAS_PAJAK_PENUH';
  let badgeLabel = 'BEBAS PAJAK (PP 55)';
  let alertMessage = 'Omzet tahunan Anda masih di bawah ambang batas Rp 500 Juta. Belum terutang PPh Final.';

  if (isCorporate) {
    complianceStatus = 'WAJIB_PPH_FINAL_BADAN';
    badgeLabel = 'PPH FINAL 0.5% (BADAN)';
    alertMessage = 'Sebagai Badan Usaha (CV/PT), Anda dikenakan PPh Final 0,5% sejak rupiah pertama omzet.';
  } else if (dpp >= taxFreeLimit) {
    complianceStatus = 'WAJIB_PPH_FINAL';
    badgeLabel = 'PPH FINAL TERUTANG';
    alertMessage = `Omzet telah melampaui Rp 500 Juta. Kelebihan omzet sebesar ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(taxableDpp)} wajib disetor PPh Final 0,5%.`;
  } else if (dpp >= taxFreeLimit * 0.8) {
    complianceStatus = 'MENDEKATI_AMBANG_BATAS';
    badgeLabel = 'WASPADA AMBANG BATAS';
    alertMessage = 'Omzet telah mencapai lebih dari 80% dari batas bebas pajak Rp 500 Juta. Persiapkan kode billing jika omzet tembus.';
  }

  // Rekomendasi Kode Billing DJP Online
  const billingCodeRecommendation = {
    accountCode: PP55_RULES.TAX_CODES.ACCOUNT_CODE,
    depositCode: PP55_RULES.TAX_CODES.DEPOSIT_CODE,
    description: PP55_RULES.TAX_CODES.DESCRIPTION,
    taxPeriod: 'Bulan berjalan / Masa Pajak',
    paymentDeadline: 'Tanggal 15 bulan berikutnya',
    amountDue: pphFinalDue
  };

  return {
    isCorporate,
    taxFreeLimit,
    annualSanitizedDpp: dpp,
    remainingTaxFree,
    taxableDpp,
    pphFinalDue,
    effectiveRate,
    complianceStatus,
    badgeLabel,
    alertMessage,
    billingCodeRecommendation,
    monthlyTurnovers
  };
}
