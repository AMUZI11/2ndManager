// src/utils/whatsappPoFormatter.js
// Generator Teks Pemesanan Kulakan (Purchase Order) WhatsApp untuk Supplier / Agen
// Dilengkapi Patch 3: WhatsApp URI Encoding Safety (< 2.000 karakter) & Compact Compression

const formatRupiah = (val) => `Rp ${Number(val || 0).toLocaleString('id-ID')}`;

/**
 * Membersihkan nomor telepon Indonesia ke format internasional 628xxx
 */
function sanitizePhoneNumber(phone) {
  if (!phone) return '';
  let cleaned = String(phone).replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

/**
 * Memformat teks pesanan kulakan (Purchase Order) untuk WhatsApp
 */
export function formatWhatsAppPurchaseOrder(arg1, maybeShopName, maybeItems, maybeNotes) {
  let supplierPhone, shopName, items, notes, poNumber, totalCost;
  if (typeof arg1 === 'object' && arg1 !== null) {
    supplierPhone = arg1.supplierPhone;
    shopName = arg1.shopName || '2ndManager';
    items = arg1.items || [];
    notes = arg1.notes || '';
    poNumber = arg1.poNumber;
    totalCost = arg1.totalCost;
  } else {
    supplierPhone = arg1;
    shopName = maybeShopName || '2ndManager';
    items = maybeItems || [];
    notes = maybeNotes || '';
  }

  const dateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const totalEstimated = totalCost !== undefined
    ? Number(totalCost)
    : items.reduce((acc, it) => acc + Number(it.estimated_cost || it.subtotal || 0), 0);

  // Cek apakah perlu compact mode (item > 25 SKU atau panjang melebihi batas)
  const isLargeOrder = items.length > 25;

  let messageLines = [];

  if (isLargeOrder) {
    // ─── COMPACT MODE (Untuk Order Besar > 25 SKU) ──────────────────────────
    messageLines.push(`*PO KULAKAN PASAR SUBUH - ${shopName.toUpperCase()}*`);
    if (poNumber) messageLines.push(`No PO: #${poNumber}`);
    messageLines.push(`Tgl: ${dateStr} | Total SKU: ${items.length}`);
    messageLines.push('--------------------------------');

    items.forEach((it, idx) => {
      const name = it.nama || it.name || 'Produk';
      const packs = it.packs || it.quantity_packs || it.suggested_packs || it.suggested_pcs || 1;
      const unit = it.unit || it.pack_unit_name || 'Pcs';
      const packaging = it.packaging_display || `${packs} ${unit}`;
      messageLines.push(`${idx + 1}. ${name}: ${packaging}`);
    });

    messageLines.push('--------------------------------');
    messageLines.push(`*Est. Total: ${formatRupiah(totalEstimated)}*`);
    if (notes) messageLines.push(`Catatan: ${notes}`);
    messageLines.push('Mohon info ketersediaan barang & total faktur. Terima kasih!');
  } else {
    // ─── STANDARD DETAILED MODE (< 25 SKU) ──────────────────────────────────
    messageLines.push(`*SURAT PESANAN KULAKAN (PO)*`);
    messageLines.push(`*Warung: ${shopName}*`);
    if (poNumber) messageLines.push(`No PO: #${poNumber}`);
    messageLines.push(`Tanggal: ${dateStr}`);
    messageLines.push('');
    messageLines.push('Halo Agen/Supplier, kami ingin memesan barang berikut:');
    messageLines.push('');

    items.forEach((it, idx) => {
      const name = it.nama || it.name || 'Produk';
      const packs = it.packs || it.quantity_packs || it.suggested_packs || it.suggested_pcs || 1;
      const unit = it.unit || it.pack_unit_name || 'Pcs';
      const packaging = it.packaging_display || `${packs} ${unit}`;
      const sub = it.estimated_cost || it.subtotal;
      const costStr = sub ? ` (Est. ${formatRupiah(sub)})` : '';
      messageLines.push(`${idx + 1}. *${name}*`);
      messageLines.push(`   Jumlah: ${packaging}${costStr}`);
    });

    messageLines.push('');
    messageLines.push(`*Estimasi Total Belanja: ${formatRupiah(totalEstimated)}*`);
    if (notes) {
      messageLines.push(`Catatan: ${notes}`);
    }
    messageLines.push('');
    messageLines.push('Mohon konfirmasi kesiapan barang & total nota tagihan.');
    messageLines.push('Terima kasih!');
  }

  let fullText = messageLines.join('\n');

  // Patch 3: Batasi total panjang karakter URL encoding maksimal 1.700 karakter
  const MAX_URI_LENGTH = 1700;

  if (encodeURIComponent(fullText).length > MAX_URI_LENGTH) {
    const truncatedLines = [
      `*PO KULAKAN - ${shopName.toUpperCase()}* (${dateStr})`,
      poNumber ? `No PO: #${poNumber}` : '',
      `Total: ${items.length} SKU (Est. ${formatRupiah(totalEstimated)})`,
      '--------------------------------',
    ].filter(Boolean);

    let currentItemsCount = 0;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const name = (it.nama || it.name || 'Produk').slice(0, 20);
      const packs = it.packs || it.quantity_packs || it.suggested_packs || it.suggested_pcs || 1;
      const unit = it.unit || it.pack_unit_name || 'Pcs';
      const packaging = it.packaging_display || `${packs} ${unit}`;
      const line = `${i + 1}. ${name}: ${packaging}`;
      
      const testText = [
        ...truncatedLines,
        line,
        `... (+${items.length - i} barang lainnya)`,
        '--------------------------------',
        `*Total Estimasi: ${formatRupiah(totalEstimated)}*`,
        'Mohon konfirmasi ketersediaan barang.'
      ].join('\n');

      if (encodeURIComponent(testText).length > MAX_URI_LENGTH) {
        truncatedLines.push(`... (+${items.length - currentItemsCount} barang lainnya terlampir di slip cetak)`);
        break;
      }
      truncatedLines.push(line);
      currentItemsCount++;
    }

    truncatedLines.push('--------------------------------');
    truncatedLines.push(`*Total Estimasi: ${formatRupiah(totalEstimated)}*`);
    truncatedLines.push('Mohon konfirmasi ketersediaan barang.');
    fullText = truncatedLines.join('\n');
  }

  return { fullText, supplierPhone };
}

/**
 * Membangun URL deep-link WhatsApp untuk mengirim pesanan kulakan ke agen
 */
export function generateSupplierWhatsAppUrl(arg1, maybeShopName, maybeItems, maybeNotes) {
  const { fullText, supplierPhone } = formatWhatsAppPurchaseOrder(arg1, maybeShopName, maybeItems, maybeNotes);
  const phone = sanitizePhoneNumber(supplierPhone);
  const baseUrl = phone ? `https://wa.me/${phone}?text=` : 'https://wa.me/?text=';

  let encoded = encodeURIComponent(fullText);
  // Garansi mutlak: total panjang URL tidak pernah melampaui 1.950 karakter (< 2.000)
  const maxEncoded = 1950 - baseUrl.length;
  if (encoded.length > maxEncoded) {
    encoded = encoded.slice(0, maxEncoded);
  }

  return `${baseUrl}${encoded}`;
}
