/**
 * src/utils/consignmentEngine.js
 * Mesin kalkulasi murni Rekonsiliasi Konsinyasi Tripartit & Generator Pesan WhatsApp
 * Mendukung 3 Kebijakan Barang Basi:
 * 1. VENDOR_BORNE: Vendor menanggung kerugian basi (Toko hanya bayar barang laku di kasir)
 * 2. STORE_BORNE: Toko menanggung kerugian basi (Vendor dibayar penuh seolah laku)
 * 3. SHARED_50_50: Kerugian barang basi dibagi dua sama rata (Vendor & Toko masing-masing 50%)
 */

/**
 * Hitung kalkulasi rekonsiliasi tripartit settlement konsinyasi
 * @param {Object} params
 * @param {number} params.qReceived - Total unit barang dititipkan
 * @param {number} [params.qSoldPos] - Unit tercatat laku di POS
 * @param {number} params.qReturnedGood - Sisa fisik baik yang ditarik kembali
 * @param {number} params.qReturnedStale - Sisa fisik rusak/basi/kadaluarsa
 * @param {number} params.vendorPrice - Harga pokok titip per unit (HPP konsinyasi)
 * @param {number} params.sellingPrice - Harga jual eceran di kasir per unit
 * @param {string} [params.stalePolicy='VENDOR_BORNE'] - 'VENDOR_BORNE' | 'STORE_BORNE' | 'SHARED_50_50'
 * @returns {Object} Rincian rekonsiliasi matematis
 */
export function calculateTripartiteSettlement({
  qReceived = 0,
  qSoldPos = null,
  qReturnedGood = 0,
  qReturnedStale = 0,
  vendorPrice = 0,
  sellingPrice = 0,
  stalePolicy = 'VENDOR_BORNE',
}) {
  const received = Math.max(0, parseInt(qReceived, 10) || 0);
  const retGood = Math.max(0, parseInt(qReturnedGood, 10) || 0);
  const retStale = Math.max(0, parseInt(qReturnedStale, 10) || 0);
  const vPrice = Math.max(0, Number(vendorPrice) || 0);
  const sPrice = Math.max(0, Number(sellingPrice) || 0);

  // Estimasi barang laku berdasarkan sisa fisik jika qSoldPos tidak dispesifikasikan
  const estimatedSoldFromPhysical = Math.max(0, received - retGood - retStale);
  const sold = qSoldPos !== null && qSoldPos !== undefined 
    ? Math.min(received, Math.max(0, parseInt(qSoldPos, 10) || 0))
    : estimatedSoldFromPhysical;

  // Selisih hilang fisik tak tercatat (shrinkage)
  const unaccountedLoss = Math.max(0, received - sold - retGood - retStale);

  // Hitung kuantitas yang dibayarkan ke vendor berdasarkan kebijakan basi
  let vendorPaidQty = 0;
  let staleLossCompensated = 0;
  let storeStaleLoss = 0;

  const normalizedPolicy = ['VENDOR_BORNE', 'STORE_BORNE', 'SHARED_50_50'].includes(stalePolicy)
    ? stalePolicy
    : 'VENDOR_BORNE';

  if (normalizedPolicy === 'STORE_BORNE') {
    // Toko menanggung seluruh barang basi
    vendorPaidQty = sold + retStale;
    staleLossCompensated = retStale * vPrice;
    storeStaleLoss = retStale * vPrice;
  } else if (normalizedPolicy === 'SHARED_50_50') {
    // Kerugian basi dibagi 50% toko, 50% vendor
    vendorPaidQty = sold + (retStale * 0.5);
    staleLossCompensated = (retStale * 0.5) * vPrice;
    storeStaleLoss = (retStale * 0.5) * vPrice;
  } else {
    // VENDOR_BORNE: Vendor menanggung seluruh barang basi, warung hanya bayar barang laku
    vendorPaidQty = sold;
    staleLossCompensated = 0;
    storeStaleLoss = 0;
  }

  const vendorPayout = Math.round(vendorPaidQty * vPrice);
  const storeRevenue = Math.round(sold * sPrice);
  const storeGrossMargin = Math.round(sold * (sPrice - vPrice));
  const storeNetMargin = Math.round(storeGrossMargin - storeStaleLoss);

  return {
    qReceived: received,
    qSold: sold,
    qReturnedGood: retGood,
    qReturnedStale: retStale,
    unaccountedLoss,
    stalePolicy: normalizedPolicy,
    vendorPaidQty,
    vendorPrice: vPrice,
    sellingPrice: sPrice,
    vendorPayout,
    storeRevenue,
    storeGrossMargin,
    staleLossCompensated,
    storeStaleLoss,
    storeNetMargin,
  };
}

/**
 * Format teks tanda terima rekap settlement konsinyasi untuk dikirim via WhatsApp
 * @param {Object} params
 * @returns {string} Pesan WhatsApp terformat
 */
export function generateConsignmentWhatsAppReceipt({
  vendorName = 'Bapak/Ibu Vendor',
  vendorPhone = '',
  productName = 'Produk Titipan',
  qReceived = 0,
  qSold = 0,
  qReturnedGood = 0,
  qReturnedStale = 0,
  stalePolicy = 'VENDOR_BORNE',
  vendorPayout = 0,
  vendorPrice = 0,
  storeName = '2ndManager Warung',
  date = new Date().toLocaleDateString('id-ID', { dateStyle: 'medium' }),
}) {
  const policyLabel = {
    VENDOR_BORNE: 'Tanggungan Vendor (Hanya Laku)',
    STORE_BORNE: 'Tanggungan Toko (Basi Diganti)',
    SHARED_50_50: 'Bagi Rata (50% Toko : 50% Vendor)',
  }[stalePolicy] || 'Tanggungan Vendor';

  const formatRp = (num) => `Rp ${Number(num || 0).toLocaleString('id-ID')}`;

  const message = [
    `*REKAP SETTLEMENT KONSINYASI* 🧾`,
    `Toko: *${storeName}*`,
    `Tanggal: ${date}`,
    `--------------------------------`,
    `Yth. *${vendorName}*`,
    `Produk: *${productName}*`,
    `Harga Titip: ${formatRp(vendorPrice)}/pcs`,
    ``,
    `*Rincian Barang:*`,
    `• Masuk (Drop-In): ${qReceived} pcs`,
    `• Terjual di Kasir: *${qSold} pcs*`,
    `• Sisa Retur Baik: ${qReturnedGood} pcs`,
    `• Sisa Basi/Rusak: ${qReturnedStale} pcs`,
    `• Kebijakan Basi: _${policyLabel}_`,
    `--------------------------------`,
    `*TOTAL SETORAN VENDOR:*`,
    `💰 *${formatRp(vendorPayout)}*`,
    `--------------------------------`,
    `_Terima kasih atas kerja samanya. Laporan ini dibuat otomatis oleh sistem kasir ${storeName}._`
  ].join('\n');

  const cleanPhone = String(vendorPhone || '').replace(/[^0-9]/g, '');
  const targetPhone = cleanPhone.startsWith('0') 
    ? '62' + cleanPhone.slice(1) 
    : cleanPhone;

  return {
    rawMessage: message,
    encodedUrl: targetPhone ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}` : null,
  };
}

/**
 * Format teks konfirmasi penerimaan pinjaman wadah aset fisik (Gas/Galon) via WhatsApp
 * @param {Object} params
 * @returns {string} Pesan WhatsApp terformat
 */
export function generateAssetLoanWhatsAppReceipt({
  customerName = 'Pelanggan Setia',
  customerPhone = '',
  assetType = 'GAS_3KG',
  quantity = 1,
  depositAmount = 0,
  isDepositWaived = false,
  storeName = '2ndManager Warung',
  date = new Date().toLocaleDateString('id-ID', { dateStyle: 'medium' }),
}) {
  const assetNameMap = {
    GAS_3KG: 'Tabung Gas LPG 3kg (Melon)',
    GAS_12KG: 'Tabung Gas LPG 12kg',
    GALON_AQUA: 'Galon Air Aqua / Sejenis',
    KRAT_BOTOL: 'Krat Botol Kaca',
    CUSTOM: 'Wadah / Aset Khusus',
  };
  const assetName = assetNameMap[assetType] || assetType;
  const formatRp = (num) => `Rp ${Number(num || 0).toLocaleString('id-ID')}`;

  const message = [
    `*BUKTI TITIPAN JAMINAN / PINJAMAN WADAH* 📦`,
    `Toko: *${storeName}*`,
    `Tanggal: ${date}`,
    `--------------------------------`,
    `Pelanggan: *${customerName}*`,
    `Aset Fisik: *${quantity} unit ${assetName}*`,
    isDepositWaived 
      ? `Status Jaminan: *Kasbon Wadah (Deposit Ditiadakan)*` 
      : `Uang Jaminan (Escrow): *${formatRp(depositAmount)}*`,
    `--------------------------------`,
    `*Catatan Penting:*`,
    isDepositWaived 
      ? `• Mohon kembalikan wadah fisik saat penukaran isi ulang berikutnya.`
      : `• Uang jaminan sebesar ${formatRp(depositAmount)} akan dikembalikan penuh (100% tunai) saat wadah dikembalikan dalam kondisi baik.`,
    `--------------------------------`,
    `_Terima kasih atas kepercayaan Anda berbelanja di ${storeName}._`
  ].join('\n');

  const cleanPhone = String(customerPhone || '').replace(/[^0-9]/g, '');
  const targetPhone = cleanPhone.startsWith('0') 
    ? '62' + cleanPhone.slice(1) 
    : cleanPhone;

  return {
    rawMessage: message,
    encodedUrl: targetPhone ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}` : null,
  };
}
