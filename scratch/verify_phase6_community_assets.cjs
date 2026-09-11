/**
 * scratch/verify_phase6_community_assets.cjs
 * Suite Verifikasi Otomatis Tahap 6: Community Commerce & Physical Asset Citadel
 */

const assert = require('assert');
const pg = require('pg');
const dns = require('dns');

// Public DNS setup
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

async function getPgClient() {
  const hostname = 'aws-0-ap-southeast-1.pooler.supabase.com';
  let host = hostname;
  try {
    const ips = await new Promise((resolve, reject) => {
      dns.resolve4(hostname, (err, addrs) => {
        if (err) reject(err);
        else resolve(addrs);
      });
    });
    if (ips && ips.length > 0) host = ips[0];
  } catch (err) {}

  return new pg.Client({
    host: host,
    port: 6543,
    user: 'postgres.doaisnsdahepsxqaroru',
    password: 'ahzaganteng',
    database: 'postgres',
    connectionTimeoutMillis: 15000,
    ssl: { rejectUnauthorized: false, servername: hostname },
  });
}

async function runAllTests() {
  console.log('══════════════════════════════════════════════════════════════════');
  console.log('🧪 VERIFIKASI RESMI TAHAP 6: COMMUNITY COMMERCE & PHYSICAL ASSETS');
  console.log('══════════════════════════════════════════════════════════════════\n');

  let passedTests = 0;
  let totalTests = 0;

  function recordPass(testName) {
    totalTests++;
    passedTests++;
    console.log(`✅ [PASS] Test ${totalTests}: ${testName}`);
  }

  function recordFail(testName, err) {
    totalTests++;
    console.error(`❌ [FAIL] Test ${totalTests}: ${testName}\n`, err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PENGUJIAN 1: TRIPARTITE CONSIGNMENT MATH ENGINE (3 STALE POLICIES)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('▶ UJI 1: Tripartite Consignment Math Engine & Spoilage Policies');
  try {
    const { calculateTripartiteSettlement } = await import('../src/utils/consignmentEngine.js');

    // Skenario: 50 Kue Masuk, 40 Terjual di Kasir, 5 Sisa Baik, 5 Sisa Basi.
    // Harga Titip: Rp 2.000/pcs. Harga Jual: Rp 3.000/pcs.

    // 1A. Kebijakan VENDOR_BORNE
    const resVendor = calculateTripartiteSettlement({
      qReceived: 50,
      qSoldPos: 40,
      qReturnedGood: 5,
      qReturnedStale: 5,
      vendorPrice: 2000,
      sellingPrice: 3000,
      stalePolicy: 'VENDOR_BORNE',
    });

    assert.strictEqual(resVendor.vendorPaidQty, 40, 'VENDOR_BORNE harus membayar hanya barang laku');
    assert.strictEqual(resVendor.vendorPayout, 80000, 'Vendor payout harus Rp 80.000');
    assert.strictEqual(resVendor.storeNetMargin, 40000, 'Laba warung harus Rp 40.000');
    assert.strictEqual(resVendor.staleLossCompensated, 0, 'Kompensasi basi ke vendor harus Rp 0');
    recordPass('Consignment Spoilage: VENDOR_BORNE Formula');

    // 1B. Kebijakan STORE_BORNE
    const resStore = calculateTripartiteSettlement({
      qReceived: 50,
      qSoldPos: 40,
      qReturnedGood: 5,
      qReturnedStale: 5,
      vendorPrice: 2000,
      sellingPrice: 3000,
      stalePolicy: 'STORE_BORNE',
    });

    assert.strictEqual(resStore.vendorPaidQty, 45, 'STORE_BORNE harus membayar 40 laku + 5 basi');
    assert.strictEqual(resStore.vendorPayout, 90000, 'Vendor payout harus Rp 90.000');
    assert.strictEqual(resStore.staleLossCompensated, 10000, 'Kompensasi basi harus Rp 10.000');
    assert.strictEqual(resStore.storeNetMargin, 30000, 'Laba bersih warung harus Rp 30.000 (Rp 40k gross - Rp 10k basi)');
    recordPass('Consignment Spoilage: STORE_BORNE Formula');

    // 1C. Kebijakan SHARED_50_50
    const resShared = calculateTripartiteSettlement({
      qReceived: 50,
      qSoldPos: 40,
      qReturnedGood: 5,
      qReturnedStale: 5,
      vendorPrice: 2000,
      sellingPrice: 3000,
      stalePolicy: 'SHARED_50_50',
    });

    assert.strictEqual(resShared.vendorPaidQty, 42.5, 'SHARED_50_50 harus membayar 40 laku + 2.5 (50% dari 5)');
    assert.strictEqual(resShared.vendorPayout, 85000, 'Vendor payout harus Rp 85.000');
    assert.strictEqual(resShared.staleLossCompensated, 5000, 'Kompensasi basi harus Rp 5.000');
    assert.strictEqual(resShared.storeNetMargin, 35000, 'Laba bersih warung harus Rp 35.000 (Rp 40k gross - Rp 5k basi)');
    recordPass('Consignment Spoilage: SHARED_50_50 Formula');
  } catch (err) {
    recordFail('Tripartite Consignment Engine Tests', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PENGUJIAN 2: WHATSAPP RECEIPT GENERATORS
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n▶ UJI 2: WhatsApp Receipt Generators (Consignment & Asset Loan)');
  try {
    const { 
      generateConsignmentWhatsAppReceipt, 
      generateAssetLoanWhatsAppReceipt 
    } = await import('../src/utils/consignmentEngine.js');

    // 2A. Consignment WhatsApp Receipt
    const waConsign = generateConsignmentWhatsAppReceipt({
      vendorName: 'Ibu Fatimah (Kue Basah)',
      vendorPhone: '081234567890',
      productName: 'Lemper Bakar Spesial',
      qReceived: 30,
      qSold: 25,
      qReturnedGood: 3,
      qReturnedStale: 2,
      stalePolicy: 'SHARED_50_50',
      vendorPayout: 52000,
      vendorPrice: 2000,
      storeName: 'Warung Berkah 2ndManager',
    });

    assert.ok(waConsign.rawMessage.includes('*REKAP SETTLEMENT KONSINYASI*'), 'Teks harus memiliki header settlement');
    assert.ok(waConsign.rawMessage.includes('Lemper Bakar Spesial'), 'Teks harus menyertakan nama produk');
    assert.ok(waConsign.rawMessage.includes('Rp 52.000'), 'Teks harus mencantumkan total setoran vendor');
    assert.ok(waConsign.encodedUrl.includes('https://wa.me/6281234567890'), 'URL WhatsApp harus diformat ke kode negara 62');
    recordPass('Consignment WhatsApp Receipt Generator');

    // 2B. Asset Loan WhatsApp Receipt
    const waLoan = generateAssetLoanWhatsAppReceipt({
      customerName: 'Pak RT Bambang',
      customerPhone: '085712345678',
      assetType: 'GAS_3KG',
      quantity: 2,
      depositAmount: 300000,
      isDepositWaived: false,
      storeName: 'Warung Berkah 2ndManager',
    });

    assert.ok(waLoan.rawMessage.includes('*BUKTI TITIPAN JAMINAN / PINJAMAN WADAH*'), 'Teks harus memiliki header pinjaman aset');
    assert.ok(waLoan.rawMessage.includes('Tabung Gas LPG 3kg'), 'Teks harus memetakan nama aset resmi');
    assert.ok(waLoan.rawMessage.includes('Rp 300.000'), 'Teks harus menyertakan nominal jaminan');
    assert.ok(waLoan.encodedUrl.includes('https://wa.me/6285712345678'), 'URL WhatsApp pinjaman aset valid');
    recordPass('Asset Loan WhatsApp Receipt Generator');
  } catch (err) {
    recordFail('WhatsApp Generator Tests', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PENGUJIAN 3: POS ENGINE (AUTO-UNPACK & OPTIMISTIC OFFLINE GUARD)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n▶ UJI 3: POS Engine Auto-Unpack Detection & Optimistic Offline Guard');
  try {
    const { checkAutoUnpackEligibility, applyOptimisticAutoUnpack } = await import('../src/utils/posEngine.js');

    const dummyProduct = {
      id: 'prod-indomie-123',
      nama: 'Indomie Goreng Original',
      stok_saat_ini: 2, // hanya ada 2 Pcs eceran
      product_units: [
        { id: 'unit-pcs', unit_name: 'Pcs', multiplier_to_base: 1, is_base_unit: true, stock: 2 },
        { id: 'unit-dus', unit_name: 'Dus', multiplier_to_base: 40, is_base_unit: false, stock: 5 }, // ada 5 Dus
      ],
    };

    // 3A. Pembeli beli 5 Pcs (stok eceran 2 -> kurang 3 pcs -> butuh auto-unpack 1 Dus)
    const evalRes = checkAutoUnpackEligibility({ quantity: 5 }, dummyProduct);
    assert.strictEqual(evalRes.needed, true, 'Harus mendeteksi kebutuhan auto-unpack');
    assert.strictEqual(evalRes.eligible, true, 'Harus eligible karena stok Dus = 5');
    assert.strictEqual(evalRes.unpacksNeeded, 1, 'Cukup unpack 1 Dus (40 Pcs)');
    assert.strictEqual(evalRes.addedPcs, 40, 'Unit pecah harus menghasilkan 40 Pcs');
    assert.strictEqual(evalRes.newExpectedStock, 42, 'Ekspektasi stok eceran baru: 2 + 40 = 42');
    recordPass('Auto-Unpack Eligibility Detection (1 Dus -> 40 Pcs)');

    // 3B. Eksekusi Optimistik Offline pada memori lokal
    const { updatedProducts, actionPayload } = applyOptimisticAutoUnpack([dummyProduct], 'prod-indomie-123', 5);
    const updatedProd = updatedProducts[0];

    assert.strictEqual(updatedProd.stok_saat_ini, 42, 'Stok eceran lokal harus naik menjadi 42');
    const updatedDus = updatedProd.product_units.find(u => u.unit_name === 'Dus');
    assert.strictEqual(updatedDus.stock, 4, 'Stok Dus lokal harus berkurang 1 (dari 5 jadi 4)');
    assert.ok(actionPayload, 'Action payload harus terbuat untuk antrean sync offline');
    assert.strictEqual(actionPayload.unpacks_count, 1);
    recordPass('Optimistic Offline Auto-Unpack State Mutation');
  } catch (err) {
    recordFail('POS Engine Auto-Unpack Tests', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PENGUJIAN 4: SUBSCRIPTION TIERS ENFORCEMENT
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n▶ UJI 4: Subscription Tier Feature Gates (Tahap 6 Flags)');
  try {
    const { TIER_CONFIG } = await import('../src/config/tiers.js');

    // MAGANG (Gratis)
    assert.strictEqual(TIER_CONFIG.MAGANG.features.asset_loan_tracker_basic, false);
    assert.strictEqual(TIER_CONFIG.MAGANG.features.atomic_multi_tier_unpack, false);
    assert.strictEqual(TIER_CONFIG.MAGANG.features.consignment_management, false);
    recordPass('Tier MAGANG: Seluruh fitur Tahap 6 terkunci');

    // SUPERVISOR
    assert.strictEqual(TIER_CONFIG.SUPERVISOR.features.asset_loan_tracker_basic, true);
    assert.strictEqual(TIER_CONFIG.SUPERVISOR.features.asset_loan_tracker_unlimited, false);
    assert.strictEqual(TIER_CONFIG.SUPERVISOR.features.atomic_multi_tier_unpack, true);
    assert.strictEqual(TIER_CONFIG.SUPERVISOR.features.consignment_management, true);
    assert.strictEqual(TIER_CONFIG.SUPERVISOR.features.consignment_whatsapp_receipt, false);
    assert.strictEqual(TIER_CONFIG.SUPERVISOR.maxActiveLoans, 20);
    recordPass('Tier SUPERVISOR: Kuota basic pinjaman (20 unit) & unpack aktif');

    // MANAJER & EKSEKUTIF
    assert.strictEqual(TIER_CONFIG.MANAJER.features.asset_loan_tracker_unlimited, true);
    assert.strictEqual(TIER_CONFIG.MANAJER.features.consignment_whatsapp_receipt, true);
    assert.strictEqual(TIER_CONFIG.EKSEKUTIF.features.asset_loan_tracker_unlimited, true);
    assert.strictEqual(TIER_CONFIG.EKSEKUTIF.features.consignment_whatsapp_receipt, true);
    recordPass('Tier MANAJER & EKSEKUTIF: Fitur Tahap 6 tanpa batas (Unlimited)');
  } catch (err) {
    recordFail('Tier Config Verification Tests', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PENGUJIAN 5: SUPABASE POSTGRESQL DDL & STORED PROCEDURE VERIFICATION
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n▶ UJI 5: Supabase PostgreSQL DDL, RPC & Escrow Schema Verification');
  let client;
  try {
    client = await getPgClient();
    await client.connect();

    // 5A. Check customer_asset_deposits structure
    const depRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'customer_asset_deposits'
    `);
    const depCols = depRes.rows.map(r => r.column_name);
    assert.ok(depCols.includes('deposit_amount'), 'Tabel customer_asset_deposits harus memiliki deposit_amount');
    assert.ok(depCols.includes('status'), 'Tabel customer_asset_deposits harus memiliki status');
    assert.ok(depCols.includes('refunded_at'), 'Tabel customer_asset_deposits harus memiliki refunded_at');
    recordPass('Database: Tabel customer_asset_deposits (Escrow Vault) Terverifikasi');

    // 5B. Check execute_atomic_unit_unpack stored procedure
    const rpcRes = await client.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_name = 'execute_atomic_unit_unpack'
    `);
    assert.ok(rpcRes.rows.length > 0, 'Stored Procedure execute_atomic_unit_unpack harus ada di database');
    recordPass('Database: Stored Procedure execute_atomic_unit_unpack Terverifikasi');

    // 5C. Check consignment_vendors.stale_policy & audit columns
    const vendRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'consignment_vendors' AND column_name = 'stale_policy'
    `);
    assert.ok(vendRes.rows.length > 0, 'consignment_vendors harus memiliki kolom stale_policy');

    const batchRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'consignment_batches' AND column_name IN ('total_items_returned_good', 'total_items_returned_stale', 'stale_policy')
    `);
    assert.strictEqual(batchRes.rows.length, 3, 'consignment_batches harus memiliki kolom audit retur baik & basi');
    recordPass('Database: Skema Tripartite Consignment & Spoilage Audit Terverifikasi');
  } catch (err) {
    recordFail('Supabase PostgreSQL Verification', err);
  } finally {
    if (client) await client.end();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // HASIL AKHIR
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════════════');
  console.log(`🏁 HASIL AKHIR PENGUJIAN TAHAP 6: ${passedTests}/${totalTests} UJI LULUS`);
  console.log('══════════════════════════════════════════════════════════════════');

  if (passedTests === totalTests) {
    console.log('🎉 SELURUH 5 PILAR & 3 PATCH TEKNIS TAHAP 6 BERHASIL DIVALIDASI 100%!\n');
    process.exit(0);
  } else {
    console.error(`⚠️ Ditemukan ${totalTests - passedTests} kegagalan pada pengujian.\n`);
    process.exit(1);
  }
}

runAllTests();
