// src/utils/escposPrinter.js
// Driver Perangkat Keras Printer Thermal ESC/POS (Web Bluetooth & Web Serial USB)
// Mendukung Dual-Width 58mm (32 kolom) & 80mm (48 kolom)
// Patch: Chunking buffer 50 byte dengan jeda 25ms & listener gattserverdisconnected

import { getPrinterConfig } from './printerConfig';

// Perintah byte kontrol ESC/POS
const ESC = 0x1B;
const GS = 0x1D;

const CMD = {
  INIT: new Uint8Array([ESC, 0x40]),
  ALIGN_LEFT: new Uint8Array([ESC, 0x61, 0x00]),
  ALIGN_CENTER: new Uint8Array([ESC, 0x61, 0x01]),
  ALIGN_RIGHT: new Uint8Array([ESC, 0x61, 0x02]),
  BOLD_ON: new Uint8Array([ESC, 0x45, 0x01]),
  BOLD_OFF: new Uint8Array([ESC, 0x45, 0x00]),
  DRAWER_KICK: new Uint8Array([ESC, 0x70, 0x00, 0x19, 0xFA]),
  PAPER_CUT: new Uint8Array([GS, 0x56, 0x41, 0x00]),
  FEED_2: new Uint8Array([0x0A, 0x0A]),
  FEED_4: new Uint8Array([0x0A, 0x0A, 0x0A, 0x0A]),
};

/**
 * Mengubah string teks menjadi Uint8Array dengan encoding ASCII/Windows-1252
 */
function textToBytes(text) {
  const encoder = new TextEncoder();
  return encoder.encode(text);
}

/**
 * Menggabungkan beberapa Uint8Array menjadi satu buffer
 */
function concatBuffers(buffers) {
  let totalLength = 0;
  for (const b of buffers) {
    totalLength += b.length;
  }
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const b of buffers) {
    result.set(b, offset);
    offset += b.length;
  }
  return result;
}

/**
 * Memformat dua kolom teks (kiri dan kanan) agar pas di jumlah kolom tertentu
 */
function formatTwoColumns(left, right, maxCols = 32) {
  const leftStr = String(left || '');
  const rightStr = String(right || '');
  const spaceNeeded = maxCols - leftStr.length - rightStr.length;

  if (spaceNeeded >= 1) {
    return leftStr + ' '.repeat(spaceNeeded) + rightStr + '\n';
  }

  // Jika terlalu panjang, pangkas string kiri
  const maxLeft = Math.max(1, maxCols - rightStr.length - 1);
  const truncatedLeft = leftStr.slice(0, maxLeft);
  const remainingSpaces = Math.max(1, maxCols - truncatedLeft.length - rightStr.length);
  return truncatedLeft + ' '.repeat(remainingSpaces) + rightStr + '\n';
}

const formatRupiah = (val) => `Rp ${Number(val || 0).toLocaleString('id-ID')}`;

/**
 * Membangun buffer byte ESC/POS untuk Struk Transaksi POS
 */
export function buildReceiptEscposBuffer(tx, config = {}) {
  const cols = config.columns || (config.paperWidth === '80MM' ? 48 : 32);
  const divider = '-'.repeat(cols) + '\n';
  const doubleDivider = '='.repeat(cols) + '\n';

  const parts = [
    CMD.INIT,
    CMD.ALIGN_CENTER,
    CMD.BOLD_ON,
    textToBytes(`${tx.shop_name || '2ndManager Warung'}\n`),
    CMD.BOLD_OFF,
    textToBytes('Sistem Kasir Operasional Anti-Bocor\n'),
    textToBytes(`${tx.shop_address || 'Sentra Sembako Indonesia'}\n`),
    textToBytes(divider),
    CMD.ALIGN_LEFT,
    textToBytes(formatTwoColumns(`No. Bon: ${tx.nomor_bon || '-'}`, tx.tanggal || new Date().toLocaleDateString('id-ID'), cols)),
    textToBytes(formatTwoColumns(`Kasir: ${tx.cashier_name || 'Kasir'}`, `Term: ${tx.register_id || 'REG-01'}`, cols)),
    textToBytes(formatTwoColumns(`Pelanggan: ${tx.customer_name || 'Umum'}`, tx.payment_status || 'LUNAS', cols)),
    textToBytes(doubleDivider),
  ];

  // Daftar Item Belanja
  const items = tx.cart_snapshot || tx.items || [];
  for (const item of items) {
    const itemName = item.nama || 'Produk';
    const qtyPrice = `${item.quantity || 1} x ${formatRupiah(item.discounted_unit_price || item.harga_jual || item.harga_base)}`;
    const subtotal = formatRupiah((item.quantity || 1) * (item.discounted_unit_price || item.harga_jual || item.harga_base));

    if (cols >= 48) {
      // Tampilan 80mm: Muat 1 baris lebar
      parts.push(textToBytes(formatTwoColumns(`${itemName.slice(0, 24)} (${qtyPrice})`, subtotal, cols)));
    } else {
      // Tampilan 58mm: Baris 1 nama, Baris 2 qty x harga & subtotal
      parts.push(textToBytes(`${itemName.slice(0, 32)}\n`));
      parts.push(textToBytes(formatTwoColumns(`  ${qtyPrice}`, subtotal, cols)));
    }
  }

  parts.push(textToBytes(divider));

  // Rincian Pembayaran
  parts.push(textToBytes(formatTwoColumns('Total Omzet:', formatRupiah(tx.total_final || tx.total_omzet || 0), cols)));

  if (Number(tx.use_customer_balance || 0) > 0) {
    parts.push(textToBytes(formatTwoColumns('Potong Saldo Celengan:', `-${formatRupiah(tx.use_customer_balance)}`, cols)));
  }

  parts.push(CMD.BOLD_ON);
  parts.push(textToBytes(formatTwoColumns('Total Bayar:', formatRupiah(tx.net_payable || tx.total_final || 0), cols)));
  parts.push(CMD.BOLD_OFF);

  if (Number(tx.cash_tendered || 0) > 0) {
    parts.push(textToBytes(formatTwoColumns('Tunai Diterima:', formatRupiah(tx.cash_tendered), cols)));
    parts.push(textToBytes(formatTwoColumns('Kembalian:', formatRupiah(tx.change_returned || 0), cols)));
  }

  // Alokasi Kembalian (Smart Change)
  if (tx.change_allocation && tx.change_allocation !== 'NONE') {
    const allocLabel = tx.change_allocation === 'KASBON' ? 'Potong Kasbon' : 'Masuk Celengan';
    parts.push(textToBytes(formatTwoColumns(`Alokasi Kembalian (${allocLabel}):`, formatRupiah(tx.change_returned || 0), cols)));
  }

  parts.push(textToBytes(doubleDivider));
  parts.push(CMD.ALIGN_CENTER);
  parts.push(textToBytes('Terima kasih atas kunjungan Anda!\n'));
  parts.push(textToBytes('Barang yang sudah dibeli tidak dapat ditukar\n'));
  parts.push(textToBytes('Simpan struk ini sebagai bukti sah\n'));
  parts.push(CMD.FEED_4);

  // Auto Kick Drawer (jika diaktifkan)
  if (config.autoKickDrawer) {
    parts.push(CMD.DRAWER_KICK);
  }

  // Auto Cut Paper (khusus 80mm)
  if (config.paperWidth === '80MM' && config.autoCutPaper) {
    parts.push(CMD.PAPER_CUT);
  }

  return concatBuffers(parts);
}

/**
 * Membangun buffer byte ESC/POS untuk Slip Belanja Pasar Subuh Fisik
 */
export function buildReorderSlipEscposBuffer(reorderData, config = {}) {
  const cols = config.columns || (config.paperWidth === '80MM' ? 48 : 32);
  const divider = '-'.repeat(cols) + '\n';
  const doubleDivider = '='.repeat(cols) + '\n';

  const parts = [
    CMD.INIT,
    CMD.ALIGN_CENTER,
    CMD.BOLD_ON,
    textToBytes('SLIP KULAKAN PASAR SUBUH\n'),
    textToBytes(`${reorderData.shop_name || reorderData.shopName || '2ndManager'}\n`),
    CMD.BOLD_OFF,
    textToBytes(`Waktu: ${reorderData.dateStr || new Date().toLocaleString('id-ID')}\n`),
    textToBytes(doubleDivider),
    CMD.ALIGN_LEFT,
  ];

  const items = reorderData.items || [];
  let calculatedTotal = 0;

  items.forEach((it, idx) => {
    const sub = Number(it.estimated_cost || it.subtotal || 0);
    calculatedTotal += sub;
    const itemName = String(it.nama || it.name || 'Barang');
    const packs = it.packs || it.suggested_packs || it.suggested_pcs || 1;
    const unit = it.unit || it.pack_unit_name || 'Pcs';
    const packaging = it.packaging_display || `${packs} ${unit}`;

    parts.push(CMD.BOLD_ON);
    parts.push(textToBytes(`${idx + 1}. [ ] ${itemName.slice(0, cols - 6)}\n`));
    parts.push(CMD.BOLD_OFF);
    parts.push(textToBytes(formatTwoColumns(`   Beli: ${packaging}`, formatRupiah(sub), cols)));
  });

  const finalTotal = reorderData.totalCost !== undefined ? Number(reorderData.totalCost) : calculatedTotal;

  parts.push(textToBytes(divider));
  parts.push(CMD.BOLD_ON);
  parts.push(textToBytes(formatTwoColumns('TOTAL ESTIMASI MODAL:', formatRupiah(finalTotal), cols)));
  parts.push(CMD.BOLD_OFF);
  parts.push(textToBytes(doubleDivider));
  parts.push(CMD.ALIGN_CENTER);
  parts.push(textToBytes('Bawa amplop tunai pas & periksa kemasan grosir\n'));
  parts.push(CMD.FEED_4);

  if (config.paperWidth === '80MM' && config.autoCutPaper) {
    parts.push(CMD.PAPER_CUT);
  }

  return concatBuffers(parts);
}

/**
 * Mengirim buffer byte ke printer Web Bluetooth dengan chunking 50 byte dan jeda 25ms
 */
async function sendViaBluetooth(buffer, onDisconnectFallback) {
  if (typeof navigator === 'undefined' || !navigator.bluetooth) {
    throw new Error('Web Bluetooth API tidak didukung pada browser ini.');
  }

  const device = await navigator.bluetooth.requestDevice({
    filters: [
      { services: ['000018f0-0000-1000-8000-00805f9b34fb'] },
      { services: ['e7810a71-73ae-499d-8c15-faa9aef0c3f2'] },
      { services: ['49535343-fe7d-4ae5-8fa9-9fafd205e455'] },
    ],
    optionalServices: [
      '000018f0-0000-1000-8000-00805f9b34fb',
      'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
      '49535343-fe7d-4ae5-8fa9-9fafd205e455',
    ],
  });

  // Patch 2: Daftarkan listener gattserverdisconnected untuk fallback otomatis jika koneksi putus
  const disconnectHandler = () => {
    console.warn('[Web Bluetooth] Sambungan terputus di tengah proses');
    if (typeof onDisconnectFallback === 'function') {
      onDisconnectFallback();
    }
  };

  device.addEventListener('gattserverdisconnected', disconnectHandler);

  const server = await device.gatt.connect();
  const services = await server.getPrimaryServices();
  let writeChar = null;

  for (const s of services) {
    const chars = await s.getCharacteristics();
    const writable = chars.find((c) => c.properties.write || c.properties.writeWithoutResponse);
    if (writable) {
      writeChar = writable;
      break;
    }
  }

  if (!writeChar) {
    throw new Error('Karakteristik writable printer Bluetooth tidak ditemukan.');
  }

  // Patch 2: Potong buffer biner menjadi 50 byte per chunk dengan jeda 25ms
  const CHUNK_SIZE = 50;
  const DELAY_MS = 25;

  for (let offset = 0; offset < buffer.length; offset += CHUNK_SIZE) {
    const slice = buffer.slice(offset, offset + CHUNK_SIZE);
    if (writeChar.properties.writeWithoutResponse) {
      await writeChar.writeValueWithoutResponse(slice);
    } else {
      await writeChar.writeValue(slice);
    }
    // Jeda 25ms antar-chunk
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
  }

  device.removeEventListener('gattserverdisconnected', disconnectHandler);
  return true;
}

/**
 * Mengirim buffer byte ke printer Web Serial (USB)
 */
async function sendViaSerial(buffer) {
  if (typeof navigator === 'undefined' || !navigator.serial) {
    throw new Error('Web Serial API tidak didukung pada browser ini.');
  }

  const port = await navigator.serial.requestPort();
  await port.open({ baudRate: 9600 });

  const writer = port.writable.getWriter();
  await writer.write(buffer);
  writer.releaseLock();
  await port.close();
  return true;
}

/**
 * Fallback cetak browser standar (window.print)
 */
function fallbackBrowserPrint() {
  if (typeof window !== 'undefined') {
    window.print();
  }
}

/**
 * Mencetak Struk Transaksi Kasir secara Langsung ke Hardware Printer Thermal
 */
export async function printReceiptDirect(txData, userConfig = null) {
  const config = userConfig || getPrinterConfig();
  const buffer = buildReceiptEscposBuffer(txData, config);

  if (config.connectionType === 'BROWSER_FALLBACK') {
    fallbackBrowserPrint();
    return { success: true, mode: 'FALLBACK' };
  }

  try {
    if (config.connectionType === 'USB_SERIAL') {
      await sendViaSerial(buffer);
      return { success: true, mode: 'USB_SERIAL' };
    } else {
      // Default: BLUETOOTH
      await sendViaBluetooth(buffer, fallbackBrowserPrint);
      return { success: true, mode: 'BLUETOOTH' };
    }
  } catch (err) {
    console.warn('[Direct Print Error - Mengalihkan ke Browser Print Fallback]', err);
    fallbackBrowserPrint();
    return { success: false, fallback: true, error: err.message };
  }
}

/**
 * Mencetak Slip Belanja Pasar Subuh secara Langsung ke Hardware Printer
 */
export async function printReorderSlipDirect(reorderData, userConfig = null) {
  const config = userConfig || getPrinterConfig();
  const buffer = buildReorderSlipEscposBuffer(reorderData, config);

  if (config.connectionType === 'BROWSER_FALLBACK') {
    fallbackBrowserPrint();
    return { success: true, mode: 'FALLBACK' };
  }

  try {
    if (config.connectionType === 'USB_SERIAL') {
      await sendViaSerial(buffer);
      return { success: true, mode: 'USB_SERIAL' };
    } else {
      await sendViaBluetooth(buffer, fallbackBrowserPrint);
      return { success: true, mode: 'BLUETOOTH' };
    }
  } catch (err) {
    console.warn('[Reorder Print Error - Fallback]', err);
    fallbackBrowserPrint();
    return { success: false, fallback: true, error: err.message };
  }
}

/**
 * Membangun buffer perintah hentak laci kasir (Kick Cash Drawer)
 */
export function buildDrawerKickBuffer() {
  return CMD.DRAWER_KICK;
}

/**
 * Mengirim perintah hentak laci kasir (Kick Cash Drawer) secara langsung
 */
export async function kickCashDrawerDirect(userConfig = null) {
  const config = userConfig || getPrinterConfig();
  const buffer = buildDrawerKickBuffer();

  try {
    if (config.connectionType === 'USB_SERIAL') {
      await sendViaSerial(buffer);
    } else if (config.connectionType === 'BLUETOOTH') {
      await sendViaBluetooth(buffer, () => {});
    }
    return true;
  } catch (err) {
    console.warn('[Drawer Kick Error]', err);
    return false;
  }
}

/**
 * Mengirim cetak teks pengujian untuk verifikasi koneksi printer thermal
 */
export async function testPrinterDirect(userConfig = null) {
  const config = userConfig || getPrinterConfig();
  const cols = config.columns || 32;

  const testBuffer = concatBuffers([
    CMD.INIT,
    CMD.ALIGN_CENTER,
    CMD.BOLD_ON,
    textToBytes('TES PRINTER 2ndManager\n'),
    CMD.BOLD_OFF,
    textToBytes(`Koneksi: ${config.connectionType}\n`),
    textToBytes(`Lebar Kertas: ${config.paperWidth} (${cols} Kolom)\n`),
    textToBytes('-'.repeat(cols) + '\n'),
    CMD.ALIGN_LEFT,
    textToBytes('12345678901234567890123456789012\n'),
    textToBytes(formatTwoColumns('Status Driver:', 'SIAP CETAK', cols)),
    CMD.FEED_2,
    CMD.DRAWER_KICK,
    CMD.FEED_2,
  ]);

  if (config.connectionType === 'USB_SERIAL') {
    await sendViaSerial(testBuffer);
  } else {
    await sendViaBluetooth(testBuffer, fallbackBrowserPrint);
  }
  return true;
}

/**
 * Membangun buffer cetak surat jalan mutasi toko (58mm / 80mm ESC/POS)
 */
export function buildTransferManifestBuffer(transferData, cols = 32) {
  const lineSeparator = '-'.repeat(cols) + '\n';
  const doubleSeparator = '='.repeat(cols) + '\n';

  const transferNum = transferData.transfer_number || 'TRF-UNKNOWN';
  const sourceName = transferData.source_branch_name || 'Cabang Asal';
  const targetName = transferData.target_branch_name || 'Cabang Tujuan';
  const rawPin = transferData.raw_pin || transferData.pin || '------';
  const items = Array.isArray(transferData.items) ? transferData.items : [];
  const dateStr = transferData.dispatched_at 
    ? new Date(transferData.dispatched_at).toLocaleString('id-ID')
    : new Date().toLocaleString('id-ID');
  const driverNotes = transferData.notes || '-';

  const headerBuffers = [
    CMD.INIT,
    CMD.ALIGN_CENTER,
    CMD.BOLD_ON,
    textToBytes('SURAT JALAN MUTASI TOKO\n'),
    textToBytes('2NDMANAGER RETAIL\n'),
    CMD.BOLD_OFF,
    textToBytes(doubleSeparator),
    CMD.ALIGN_LEFT,
    textToBytes(`No. Tiket: ${transferNum}\n`),
    textToBytes(`Waktu    : ${dateStr}\n`),
    textToBytes(`Dari     : ${sourceName}\n`),
    textToBytes(`Tujuan   : ${targetName}\n`),
    textToBytes(`Catatan  : ${driverNotes}\n`),
    textToBytes(lineSeparator),
    CMD.ALIGN_CENTER,
    CMD.BOLD_ON,
    textToBytes('PIN VERIFIKASI RAHASIA:\n'),
    textToBytes(`[  ${rawPin}  ]\n`),
    CMD.BOLD_OFF,
    textToBytes('(Serahkan ke kasir cabang tujuan)\n'),
    textToBytes(lineSeparator),
    CMD.ALIGN_LEFT,
    CMD.BOLD_ON,
    textToBytes(formatTwoColumns('PRODUK / SKU', 'QTY KIRIM', cols)),
    CMD.BOLD_OFF,
    textToBytes(lineSeparator),
  ];

  const itemBuffers = [];
  let totalQty = 0;
  for (const it of items) {
    const name = it.nama || it.product_name || 'Produk';
    const qty = Number(it.qty_dispatched || it.quantity || 0);
    totalQty += qty;
    const unit = it.unit_name ? ` (${it.unit_name})` : ' Pcs';
    itemBuffers.push(textToBytes(formatTwoColumns(name, `${qty}${unit}`, cols)));
  }

  const signCols = Math.floor((cols - 2) / 2);
  const leftSign = 'Sopir / Kurir'.padEnd(signCols, ' ');
  const rightSign = 'Penerima'.padStart(signCols, ' ');

  const footerBuffers = [
    textToBytes(lineSeparator),
    textToBytes(formatTwoColumns('TOTAL ITEM:', `${totalQty} Unit`, cols)),
    textToBytes(doubleSeparator),
    CMD.ALIGN_CENTER,
    textToBytes('\n'),
    textToBytes(`${leftSign}  ${rightSign}\n`),
    textToBytes('\n\n\n'),
    textToBytes(`(..............)  (..............)\n`),
    textToBytes('\n'),
    textToBytes('Simpan slip ini hingga verifikasi selesai.\n'),
    CMD.FEED_4,
    CMD.PAPER_CUT,
  ];

  return concatBuffers([
    ...headerBuffers,
    ...itemBuffers,
    ...footerBuffers,
  ]);
}

/**
 * Mencetak surat jalan kurir / manifest transfer ke printer thermal fisik
 */
export async function printTransferManifestSlip(transferData, userConfig = null) {
  const config = userConfig || getPrinterConfig();
  const cols = config.columns || 32;
  const manifestBuffer = buildTransferManifestBuffer(transferData, cols);

  try {
    if (config.connectionType === 'USB_SERIAL') {
      await sendViaSerial(manifestBuffer);
    } else {
      await sendViaBluetooth(manifestBuffer, fallbackBrowserPrint);
    }
    return true;
  } catch (err) {
    console.warn('[printTransferManifestSlip Error]', err);
    fallbackBrowserPrint(manifestBuffer);
    return false;
  }
}

/**
 * Membangun buffer cetak ESC/POS untuk Slip Ringkasan Audit Finansial & Pajak PP 55 / SAK EMKM
 */
export function buildFinancialSummaryBuffer(summaryData, cols = 32) {
  const lineSeparator = '-'.repeat(cols) + '\n';
  const doubleSeparator = '='.repeat(cols) + '\n';

  const orgName = summaryData.orgName || summaryData.organizationName || '2ndManager Warung';
  const branchName = summaryData.branchName || 'Konsolidasi Seluruh Cabang';
  const taxYear = summaryData.taxYear || summaryData.year || new Date().getFullYear();
  const periodText = summaryData.periodText || `Tahun Fiskal ${taxYear}`;
  const npwp = summaryData.npwp || '00.000.000.0-000.000';
  const entityType = summaryData.isCorporate ? 'Badan Usaha (CV/PT)' : 'Wajib Pajak Orang Pribadi';

  const fmt = (val) => {
    const num = Number(val || 0);
    return `Rp ${Math.abs(num).toLocaleString('id-ID')}`;
  };

  const headerBuffers = [
    CMD.INIT,
    CMD.ALIGN_CENTER,
    CMD.BOLD_ON,
    textToBytes(`${orgName.toUpperCase()}\n`),
    CMD.BOLD_OFF,
    textToBytes(`${branchName}\n`),
    textToBytes(`NPWP: ${npwp}\n`),
    textToBytes(`Entitas: ${entityType}\n`),
    textToBytes(doubleSeparator),
    CMD.BOLD_ON,
    textToBytes('RINGKASAN AUDIT FISKAL & SAK EMKM\n'),
    textToBytes(`${periodText}\n`),
    CMD.BOLD_OFF,
    textToBytes(lineSeparator),
  ];

  // Section 1: PP 55/2022 Tax
  const taxBuffers = [
    CMD.ALIGN_LEFT,
    CMD.BOLD_ON,
    textToBytes('1. REKONSILIASI PAJAK PP 55/2022\n'),
    CMD.BOLD_OFF,
    textToBytes(formatTwoColumns('Omzet Bruto', fmt(summaryData.grossRevenue), cols)),
    textToBytes(formatTwoColumns('DPP Tersanitasi', fmt(summaryData.sanitizedDpp), cols)),
    textToBytes(formatTwoColumns('Batas Bebas Pajak', fmt(summaryData.taxFreeLimit), cols)),
    textToBytes(formatTwoColumns('DPP Kena Pajak', fmt(summaryData.taxableDpp), cols)),
    CMD.BOLD_ON,
    textToBytes(formatTwoColumns('PPh Final 0.5%', fmt(summaryData.pphFinalDue), cols)),
    CMD.BOLD_OFF,
    textToBytes(formatTwoColumns('Kode Akun / Setor', '411128 / 420', cols)),
    textToBytes(lineSeparator),
  ];

  // Section 2: Income Statement
  const incomeBuffers = [
    CMD.ALIGN_LEFT,
    CMD.BOLD_ON,
    textToBytes('2. LABA RUGI SAK EMKM\n'),
    CMD.BOLD_OFF,
    textToBytes(formatTwoColumns('Penjualan Bersih', fmt(summaryData.netTurnover), cols)),
    textToBytes(formatTwoColumns('Beban Pokok (HPP)', fmt(summaryData.cogs), cols)),
    textToBytes(formatTwoColumns('Laba Kotor', fmt(summaryData.grossProfit), cols)),
    textToBytes(formatTwoColumns('Beban Operasional', fmt(summaryData.operatingExpenses), cols)),
    CMD.BOLD_ON,
    textToBytes(formatTwoColumns('Laba Bersih Operasi', fmt(summaryData.netProfit), cols)),
    textToBytes(formatTwoColumns('Net Margin (NPM)', `${Number(summaryData.netMargin || 0).toFixed(1)}%`, cols)),
    CMD.BOLD_OFF,
    textToBytes(lineSeparator),
  ];

  // Section 3: Balance Sheet
  const balanceSheetBuffers = [
    CMD.ALIGN_LEFT,
    CMD.BOLD_ON,
    textToBytes('3. POSISI KEUANGAN (NERACA)\n'),
    CMD.BOLD_OFF,
    textToBytes(formatTwoColumns('Total Aset Lancar', fmt(summaryData.currentAssets), cols)),
    textToBytes(formatTwoColumns('Total Aset Tetap', fmt(summaryData.nonCurrentAssets), cols)),
    CMD.BOLD_ON,
    textToBytes(formatTwoColumns('TOTAL ASET', fmt(summaryData.totalAssets), cols)),
    CMD.BOLD_OFF,
    textToBytes(formatTwoColumns('Total Liabilitas', fmt(summaryData.totalLiabilities), cols)),
    textToBytes(formatTwoColumns('Total Ekuitas/Modal', fmt(summaryData.totalEquity), cols)),
    CMD.BOLD_ON,
    textToBytes(formatTwoColumns('STATUS NERACA', summaryData.isBalanced ? 'SEIMBANG (100%)' : 'SELISIH', cols)),
    CMD.BOLD_OFF,
    textToBytes(lineSeparator),
  ];

  // Section 4: Bank Readiness & Seal
  const checksumSnippet = (summaryData.checksumHash || 'VERIFIED-SEAL').substring(0, 16);
  const kurScore = summaryData.kurScore || 'HIJAU';
  const footerBuffers = [
    CMD.ALIGN_CENTER,
    CMD.BOLD_ON,
    textToBytes(`SKOR KELAYAKAN KUR: [ ${kurScore} ]\n`),
    CMD.BOLD_OFF,
    textToBytes(`Rekomendasi: ${summaryData.kurTier || 'KUR Mikro 6%'}\n`),
    textToBytes(doubleSeparator),
    CMD.ALIGN_CENTER,
    textToBytes('QR DIGITAL CHECKSUM SEAL:\n'),
    CMD.BOLD_ON,
    textToBytes(`[ ${checksumSnippet}... ]\n`),
    CMD.BOLD_OFF,
    textToBytes('Verifikasi di: 2ndmanager.vercel.app\n'),
    textToBytes(lineSeparator),
    textToBytes(`Dicetak pada: ${new Date().toLocaleString('id-ID')}\n`),
    textToBytes('Arsip Sah Pembukuan Warung\n'),
    CMD.FEED_4,
    CMD.PAPER_CUT,
  ];

  return concatBuffers([
    ...headerBuffers,
    ...taxBuffers,
    ...incomeBuffers,
    ...balanceSheetBuffers,
    ...footerBuffers,
  ]);
}

/**
 * Mencetak slip ringkasan finansial ke printer thermal fisik
 */
export async function printFinancialSummarySlip(summaryData, userConfig = null) {
  const config = userConfig || getPrinterConfig();
  const cols = config.columns || 32;
  const buffer = buildFinancialSummaryBuffer(summaryData, cols);

  try {
    if (config.connectionType === 'USB_SERIAL') {
      await sendViaSerial(buffer);
    } else {
      await sendViaBluetooth(buffer, fallbackBrowserPrint);
    }
    return true;
  } catch (err) {
    console.warn('[printFinancialSummarySlip Error]', err);
    fallbackBrowserPrint(buffer);
    return false;
  }
}


