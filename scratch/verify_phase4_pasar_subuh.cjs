/**
 * scratch/verify_phase4_pasar_subuh.cjs
 * Automated test suite for Tahap 4 implementation.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================');
console.log('  RUNNING TAHAP 4 AUTOMATED VERIFICATION SUITE');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         Error: ${err.message}`);
  }
}

// ---------------------------------------------------------
// 1. UNIT TEST: Stockout-Aware Sales Velocity & Anomaly Dampener
// ---------------------------------------------------------
console.log('[TEST GROUP 1: Stockout-Aware Velocity & Anomaly Dampener]');

const procurementEnginePath = path.join(__dirname, '../src/utils/procurementEngine.js');
const procurementCode = fs.readFileSync(procurementEnginePath, 'utf8');

const {
  calculateStockoutAwareVelocity,
  autoRoundToWholesaleUnits,
  calculateCashEnvelopeBreakdown,
} = (() => {
  const module = { exports: {} };
  const window = undefined;
  const self = {};
  const stripped = procurementCode
    .replace(/export\s+async\s+function/g, 'async function')
    .replace(/export\s+function/g, 'function')
    .replace(/export\s+const/g, 'const');
  eval(stripped + `
    module.exports = {
      calculateStockoutAwareVelocity,
      autoRoundToWholesaleUnits,
      calculateCashEnvelopeBreakdown,
    };
  `);
  return module.exports;
})();

runTest('Standard velocity without stockouts: 70 units over 7 days = 10 units/day', () => {
  const result = calculateStockoutAwareVelocity({
    totalQuantitySold: 70,
    inStockHoursTotal: 7 * 14,
    storeHoursPerDay: 14,
  });
  assert.strictEqual(result.velocityPerDay, 10);
});

runTest('Stockout-Aware velocity: 70 units sold, 49h stockout in 7 days -> 20 units/day', () => {
  // 70 units sold during 49 operating hours in-stock (3.5 active days) -> 20 units/day
  const result = calculateStockoutAwareVelocity({
    totalQuantitySold: 70,
    inStockHoursTotal: 49,
    storeHoursPerDay: 14,
  });
  assert.strictEqual(result.velocityPerDay, 20);
});

runTest('Velocity Anomaly Dampener: caps at 3x historical daily average (Patch 1)', () => {
  const result = calculateStockoutAwareVelocity({
    totalQuantitySold: 140,
    inStockHoursTotal: 7 * 14,
    storeHoursPerDay: 14,
    historicalAverageDaily: 4,
  });
  assert.strictEqual(result.velocityPerDay, 12);
  assert.strictEqual(result.isDampened, true);
});

// ---------------------------------------------------------
// 2. UNIT TEST: Multi-Tier Packaging Rounding (>= 60% Threshold)
// ---------------------------------------------------------
console.log('\n[TEST GROUP 2: Multi-Tier Packaging Rounding]');

runTest('Wholesale rounding: 7 pcs needed, box contains 10 -> rounded to 1 box (10 pcs) [70% >= 60%]', () => {
  const productUnits = [{ id: 'u1', unit_name: 'Dus', multiplier_to_base: 10, is_base_unit: false }];
  const result = autoRoundToWholesaleUnits(7, productUnits);
  assert.strictEqual(result.packageQty, 1);
  assert.strictEqual(result.totalBasePcs, 10);
  assert.strictEqual(result.primaryUnit, 'Dus');
  assert.strictEqual(result.loosePcs, 0);
});

runTest('Wholesale rounding: 3 pcs needed, box contains 10 -> keep 3 pcs [30% < 60%]', () => {
  const productUnits = [{ id: 'u1', unit_name: 'Dus', multiplier_to_base: 10, is_base_unit: false }];
  const result = autoRoundToWholesaleUnits(3, productUnits);
  assert.strictEqual(result.packageQty, 0);
  assert.strictEqual(result.totalBasePcs, 3);
  assert.strictEqual(result.loosePcs, 3);
});

runTest('Wholesale rounding multi-pack: 16 pcs needed, box contains 10 -> rounded to 2 boxes (20 pcs)', () => {
  const productUnits = [{ id: 'u1', unit_name: 'Dus', multiplier_to_base: 10, is_base_unit: false }];
  const result = autoRoundToWholesaleUnits(16, productUnits);
  assert.strictEqual(result.packageQty, 2);
  assert.strictEqual(result.totalBasePcs, 20);
  assert.strictEqual(result.primaryUnit, 'Dus');
  assert.strictEqual(result.loosePcs, 0);
});

// ---------------------------------------------------------
// 3. UNIT TEST: Cash Envelope Breakdown & Drawer Safe Comparison
// ---------------------------------------------------------
console.log('\n[TEST GROUP 3: Cash Envelope Breakdown]');

runTest('Cash envelope breakdown for Rp 387.500', () => {
  const breakdown = calculateCashEnvelopeBreakdown(387500, 400000);
  assert.strictEqual(breakdown.denominations[0].count, 3);
  assert.strictEqual(breakdown.denominations[1].count, 1);
  assert.strictEqual(breakdown.denominations[2].count, 1);
  assert.strictEqual(breakdown.denominations[3].count, 1);
  assert.strictEqual(breakdown.exactReceh, 7500);
  assert.strictEqual(breakdown.isDeficit, false);
});

runTest('Cash envelope detects drawer deficit when safe cash < total amount', () => {
  const breakdown = calculateCashEnvelopeBreakdown(500000, 350000);
  assert.strictEqual(breakdown.isDeficit, true);
  assert.strictEqual(breakdown.deficit, 150000);
});

// ---------------------------------------------------------
// 4. UNIT TEST: WhatsApp PO Formatter & URI Encoding Guard
// ---------------------------------------------------------
console.log('\n[TEST GROUP 4: WhatsApp PO Formatter & Safe URI]');

const whatsappPoPath = path.join(__dirname, '../src/utils/whatsappPoFormatter.js');
const whatsappCode = fs.readFileSync(whatsappPoPath, 'utf8');

const { generateSupplierWhatsAppUrl, formatWhatsAppPurchaseOrder } = (() => {
  const module = { exports: {} };
  const stripped = whatsappCode
    .replace(/import\s+[^;]+;/g, '')
    .replace(/export\s+async\s+function/g, 'async function')
    .replace(/export\s+function/g, 'function')
    .replace(/export\s+const/g, 'const');
  eval(stripped + `
    module.exports = {
      generateSupplierWhatsAppUrl,
      formatWhatsAppPurchaseOrder,
    };
  `);
  return module.exports;
})();

runTest('WhatsApp PO URL generated with proper schema wa.me', () => {
  const url = generateSupplierWhatsAppUrl({
    supplierName: 'Agen Sembako Makmur',
    supplierPhone: '081234567890',
    poNumber: 'PO-2026-001',
    shopName: 'Toko Berkah Mandiri',
    items: [
      { name: 'Beras Ramos 5kg', packs: 5, unit: 'Karung', subtotal: 350000 },
      { name: 'Minyak Goreng 2L', packs: 2, unit: 'Dus', subtotal: 360000 },
    ],
    totalCost: 710000,
  });

  assert.ok(url.startsWith('https://wa.me/6281234567890?text='));
  assert.ok(url.length < 2000, `URL length ${url.length} should be < 2000`);
});

runTest('WhatsApp PO URL strictly enforces < 2,000 characters even with 50 SKUs (Patch 3)', () => {
  const bigList = [];
  for (let i = 1; i <= 50; i++) {
    bigList.push({
      name: `Produk Super Panjang Nomor Seri ${i} Kemasan Pasar`,
      packs: i,
      unit: 'Dus',
      subtotal: i * 50000,
    });
  }

  const url = generateSupplierWhatsAppUrl({
    supplierName: 'Grosir Besar Induk Nusantara',
    supplierPhone: '081987654321',
    poNumber: 'PO-BIG-999',
    shopName: 'Warung Madura 24 Jam',
    items: bigList,
    totalCost: 5000000,
  });

  assert.ok(url.length < 2000, `Large PO encoded URL was ${url.length} chars, must be < 2000`);
});

// ---------------------------------------------------------
// 5. UNIT TEST: ESC/POS Direct Print Binary Buffer Construction
// ---------------------------------------------------------
console.log('\n[TEST GROUP 5: ESC/POS Binary Buffer Construction]');

const escposPath = path.join(__dirname, '../src/utils/escposPrinter.js');
const escposCode = fs.readFileSync(escposPath, 'utf8');

const {
  buildReceiptEscposBuffer,
  buildReorderSlipEscposBuffer,
  buildDrawerKickBuffer,
} = (() => {
  const module = { exports: {} };
  const getPrinterConfig = () => ({
    connectionType: 'BLUETOOTH',
    paperWidth: '58mm',
    columns: 32,
    autoKickDrawer: true,
    autoCutPaper: true,
  });
  const window = undefined;
  const navigator = undefined;
  const stripped = escposCode
    .replace(/import\s+[^;]+;/g, '')
    .replace(/export\s+async\s+function/g, 'async function')
    .replace(/export\s+function/g, 'function')
    .replace(/export\s+const/g, 'const');
  eval(stripped + `
    module.exports = {
      buildReceiptEscposBuffer,
      buildReorderSlipEscposBuffer,
      buildDrawerKickBuffer,
    };
  `);
  return module.exports;
})();

runTest('Drawer kick buffer sends standard ESC p 0 25 250 command (0x1B, 0x70, 0x00, 0x19, 0xFA)', () => {
  const buffer = buildDrawerKickBuffer();
  assert.strictEqual(buffer.length, 5);
  assert.strictEqual(buffer[0], 0x1B);
  assert.strictEqual(buffer[1], 0x70);
  assert.strictEqual(buffer[2], 0x00);
  assert.strictEqual(buffer[3], 0x19);
  assert.strictEqual(buffer[4], 0xFA);
});

runTest('ESC/POS receipt buffer generates non-empty binary Uint8Array with init and cut', () => {
  const tx = {
    nomor_bon: 'BON-101',
    shop_name: 'Warung Klontong 2ndManager',
    cashier_name: 'Budi',
    customer_name: 'Pak RT',
    payment_status: 'Lunas',
    total_final: 85000,
    cash_tendered: 100000,
    change_returned: 15000,
    cart_snapshot: [
      { nama: 'Beras 5kg', quantity: 1, discounted_unit_price: 70000 },
      { nama: 'Gula Pasir 1kg', quantity: 1, discounted_unit_price: 15000 },
    ],
  };

  const buffer = buildReceiptEscposBuffer(tx, { paperWidth: '58mm', autoCutPaper: true });
  assert.ok(buffer instanceof Uint8Array);
  assert.ok(buffer.length > 50, `Buffer length was ${buffer.length}`);
  assert.strictEqual(buffer[0], 0x1B);
  assert.strictEqual(buffer[1], 0x40);
});

runTest('ESC/POS reorder slip buffer generates properly formatted market checklist', () => {
  const slipData = {
    shopName: 'Warung Sembako Kita',
    dateStr: '07/09/2026',
    items: [
      { name: 'Minyak Goreng', packs: 3, unit: 'Dus', subtotal: 450000 },
      { name: 'Kopi Kapal Api', packs: 5, unit: 'Renceng', subtotal: 65000 },
    ],
    totalCost: 515000,
  };

  const buffer = buildReorderSlipEscposBuffer(slipData, { paperWidth: '58mm', autoCutPaper: true });
  assert.ok(buffer instanceof Uint8Array);
  assert.ok(buffer.length > 50, `Slip buffer length was ${buffer.length}`);
});

// ---------------------------------------------------------
// 6. CODE HYGIENE & AUDIT: No Raw Emojis, No Em-Dashes in Tahap 4 files
// ---------------------------------------------------------
console.log('\n[TEST GROUP 6: Production Code Hygiene]');

const tahap4Files = [
  'src/utils/procurementEngine.js',
  'src/utils/printerConfig.js',
  'src/utils/escposPrinter.js',
  'src/utils/whatsappPoFormatter.js',
  'src/components/reorder/CashEnvelopeCard.jsx',
  'src/components/reorder/MarketModeModal.jsx',
  'src/components/pos/PrinterSettingsModal.jsx',
  'src/config/tiers.js',
];

runTest('Zero raw emojis and zero em-dashes in Tahap 4 files', () => {
  const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  const emDashRegex = /—/;

  tahap4Files.forEach((rel) => {
    const fullPath = path.join(__dirname, '..', rel);
    if (!fs.existsSync(fullPath)) return;
    const content = fs.readFileSync(fullPath, 'utf8');

    const emDashMatch = content.match(emDashRegex);
    assert.ok(!emDashMatch, `File ${rel} contains prohibited em-dash (—)`);

    const emojiMatch = content.match(emojiRegex);
    assert.ok(!emojiMatch, `File ${rel} contains prohibited raw emoji: ${emojiMatch?.[0]}`);
  });
});

console.log('\n====================================================');
console.log(`  VERIFICATION RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
console.log('====================================================');

if (passedTests !== totalTests) {
  process.exit(1);
} else {
  process.exit(0);
}
