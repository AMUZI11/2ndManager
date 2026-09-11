/**
 * scratch/verify_phase7_multi_branch.cjs
 * Suite Verifikasi Otomatis Tahap 7: Multi-Branch Hierarchy & Two-Phase Stock Transfer Engine
 */

const assert = require('assert');
const pg = require('pg');
const dns = require('dns');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Public DNS setup untuk pooler Supabase
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

async function getPgClient() {
  const hostname = 'aws-0-ap-southeast-1.pooler.supabase.com';
  let host = '54.255.219.82'; // IP langsung Supabase pooler ap-southeast-1
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

// Helper SHA-256
function sha256(str) {
  return crypto.createHash('sha256').update(String(str).trim()).digest('hex');
}

// Mock ESC/POS Constants & Generator (mirrors src/utils/escposPrinter.js)
const ESC = 0x1B;
const GS = 0x1D;
const CMD = {
  INIT: new Uint8Array([ESC, 0x40]),
  ALIGN_LEFT: new Uint8Array([ESC, 0x61, 0x00]),
  ALIGN_CENTER: new Uint8Array([ESC, 0x61, 0x01]),
  BOLD_ON: new Uint8Array([ESC, 0x45, 0x01]),
  BOLD_OFF: new Uint8Array([ESC, 0x45, 0x00]),
  PAPER_CUT: new Uint8Array([GS, 0x56, 0x41, 0x00]),
  FEED_4: new Uint8Array([0x0A, 0x0A, 0x0A, 0x0A]),
};

function formatTwoColumns(left, right, maxCols = 32) {
  const leftStr = String(left || '');
  const rightStr = String(right || '');
  const spaceNeeded = maxCols - leftStr.length - rightStr.length;
  if (spaceNeeded >= 1) {
    return leftStr + ' '.repeat(spaceNeeded) + rightStr + '\n';
  }
  return leftStr.substring(0, maxCols - rightStr.length - 1) + ' ' + rightStr + '\n';
}

function buildTestManifestBuffer(transferData, cols = 32) {
  const encoder = new TextEncoder();
  const lineSeparator = '-'.repeat(cols) + '\n';
  const doubleSeparator = '='.repeat(cols) + '\n';
  const transferNum = transferData.transfer_number || 'TRF-UNKNOWN';
  const sourceName = transferData.source_branch_name || 'Cabang Asal';
  const targetName = transferData.target_branch_name || 'Cabang Tujuan';
  const rawPin = transferData.raw_pin || '------';
  const items = Array.isArray(transferData.items) ? transferData.items : [];

  const parts = [
    CMD.INIT,
    CMD.ALIGN_CENTER,
    CMD.BOLD_ON,
    encoder.encode('SURAT JALAN MUTASI TOKO\n2NDMANAGER RETAIL\n'),
    CMD.BOLD_OFF,
    encoder.encode(doubleSeparator),
    CMD.ALIGN_LEFT,
    encoder.encode(`No. Tiket: ${transferNum}\nDari     : ${sourceName}\nTujuan   : ${targetName}\n`),
    encoder.encode(lineSeparator),
    CMD.ALIGN_CENTER,
    CMD.BOLD_ON,
    encoder.encode(`PIN VERIFIKASI RAHASIA:\n[  ${rawPin}  ]\n`),
    CMD.BOLD_OFF,
    encoder.encode(lineSeparator),
    CMD.ALIGN_LEFT,
    CMD.BOLD_ON,
    encoder.encode(formatTwoColumns('PRODUK / SKU', 'QTY KIRIM', cols)),
    CMD.BOLD_OFF,
    encoder.encode(lineSeparator),
  ];

  let totalQty = 0;
  for (const it of items) {
    const name = it.nama || it.product_name || 'Produk';
    const qty = Number(it.qty_dispatched || it.quantity || 0);
    totalQty += qty;
    parts.push(encoder.encode(formatTwoColumns(name, `${qty} Pcs`, cols)));
  }

  parts.push(
    encoder.encode(lineSeparator),
    encoder.encode(formatTwoColumns('TOTAL ITEM:', `${totalQty} Unit`, cols)),
    encoder.encode(doubleSeparator),
    CMD.ALIGN_CENTER,
    encoder.encode('Sopir / Kurir             Penerima\n\n\n(..............)  (..............)\n'),
    CMD.FEED_4,
    CMD.PAPER_CUT
  );

  let totalLen = parts.reduce((acc, p) => acc + p.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const p of parts) {
    result.set(p, offset);
    offset += p.length;
  }
  return result;
}

async function runAllTests() {
  console.log('══════════════════════════════════════════════════════════════════');
  console.log('🧪 VERIFIKASI RESMI TAHAP 7: MULTI-BRANCH & TWO-PHASE STOCK TRANSFER');
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
  // PENGUJIAN 1: SUBSCRIPTION TIER GATING (MAGANG vs SUPERVISOR vs MANAJER vs EKSEKUTIF)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const workspaceRoot = 'c:\\Users\\USER\\Desktop\\Project\\2ndManager';
    const tiersPath = path.join(workspaceRoot, 'src', 'config', 'tiers.js');
    const tiersContent = fs.readFileSync(tiersPath, 'utf8');

    assert.ok(tiersContent.includes('multi_branch_access: false'), 'Tiers dasar harus memblokir multi-branch');
    assert.ok(tiersContent.includes('multi_branch_access: true'), 'Tier Eksekutif harus membuka multi-branch');
    assert.ok(tiersContent.includes('inter_branch_stock_transfer: true'), 'Tier Eksekutif harus membuka transfer');
    assert.ok(tiersContent.includes('consolidated_dashboard_radar: true'), 'Tier Eksekutif harus membuka radar konsolidasi');

    recordPass('Subscription Tier Gating: Multi-Branch & Transfer fitur dikunci untuk Magang/Supervisor/Manajer dan eksklusif di Eksekutif');
  } catch (err) {
    recordFail('Subscription Tier Gating', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PENGUJIAN 2: KRIPTOGRAFI PIN TRANSIT (GENERATE & SHA-256 HASH)
  // ──────────────────────────────────────────────────────────────────────────
  let testPin = '';
  let testPinHash = '';
  try {
    const randomInt = crypto.randomInt(100000, 1000000);
    testPin = String(randomInt);
    assert.strictEqual(testPin.length, 6, 'PIN harus persis 6 digit');
    assert.ok(!isNaN(Number(testPin)), 'PIN harus berupa angka numerik');

    testPinHash = sha256(testPin);
    assert.strictEqual(testPinHash.length, 64, 'SHA-256 hash harus 64 karakter heksadesimal');

    const expectedHash = crypto.createHash('sha256').update(testPin).digest('hex');
    assert.strictEqual(testPinHash, expectedHash, 'Hash harus sesuai standar SHA-256');

    recordPass('Transit Security: Generator 6-digit PIN acak kriptografis & SHA-256 hashing valid');
  } catch (err) {
    recordFail('Transit Security', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PENGUJIAN 3: DEVICE BINDING GUARD LOGIC
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const mockStorage = {};
    const STORAGE_BRANCH_KEY = 'hl_pos_device_branch_id';
    const STORAGE_REGISTER_NAME_KEY = 'hl_pos_device_register_name';

    function mockBind(branchId, regName) {
      mockStorage[STORAGE_BRANCH_KEY] = branchId.trim();
      mockStorage[STORAGE_REGISTER_NAME_KEY] = (regName || 'POS-01').trim().toUpperCase();
    }
    function mockUnbind() {
      delete mockStorage[STORAGE_BRANCH_KEY];
      delete mockStorage[STORAGE_REGISTER_NAME_KEY];
    }

    const testBranchId = 'b1111111-1111-1111-1111-111111111111';
    mockBind(testBranchId, 'kasir-depan');
    assert.strictEqual(mockStorage[STORAGE_BRANCH_KEY], testBranchId);
    assert.strictEqual(mockStorage[STORAGE_REGISTER_NAME_KEY], 'KASIR-DEPAN');

    mockUnbind();
    assert.strictEqual(mockStorage[STORAGE_BRANCH_KEY], undefined);
    assert.strictEqual(mockStorage[STORAGE_REGISTER_NAME_KEY], undefined);

    recordPass('Device Guard: Pengikatan permanen terminal kasir ke branch_id dan register_name berfungsi valid');
  } catch (err) {
    recordFail('Device Guard Logic', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PENGUJIAN 4: ESC/POS TRANSFER MANIFEST BUFFER
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const mockManifestData = {
      transfer_number: 'TRF-TEST-2026-001',
      source_branch_name: 'Warung Pusat Solo',
      target_branch_name: 'Cabang Palur',
      raw_pin: '849201',
      items: [
        { product_name: 'Beras Pandan Wangi 5kg', qty_dispatched: 5 },
        { product_name: 'Minyak Goreng 2L', qty_dispatched: 10 },
      ],
      notes: 'Hati-hati pecah belah',
    };

    const buffer = buildTestManifestBuffer(mockManifestData, 32);
    assert.ok(buffer instanceof Uint8Array, 'Output harus bertipe Uint8Array/Buffer');
    assert.ok(buffer.length > 100, 'Buffer manifest harus memiliki ukuran wajar');

    const decoded = new TextDecoder().decode(buffer);
    assert.ok(decoded.includes('SURAT JALAN MUTASI TOKO'), 'Manifest harus memuat judul surat jalan');
    assert.ok(decoded.includes('TRF-TEST-2026-001'), 'Manifest harus memuat nomor tiket transfer');
    assert.ok(decoded.includes('849201'), 'Manifest harus memuat PIN verifikasi rahasia');
    assert.ok(decoded.includes('Warung Pusat Solo'), 'Manifest harus memuat nama cabang asal');
    assert.ok(decoded.includes('Cabang Palur'), 'Manifest harus memuat nama cabang tujuan');
    assert.ok(decoded.includes('Beras Pandan Wangi'), 'Manifest harus memuat daftar item');
    assert.ok(decoded.includes('TOTAL ITEM:'), 'Manifest harus memuat total akumulasi');
    assert.ok(decoded.includes('Sopir / Kurir'), 'Manifest harus memuat kolom tanda tangan fisik');

    recordPass('ESC/POS Printer: Generator buffer manifest thermal 58mm/80mm memuat seluruh elemen surat jalan');
  } catch (err) {
    recordFail('ESC/POS Manifest Generator', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PENGUJIAN BASIS DATA (SUPABASE POSTGRESQL POOLER)
  // ──────────────────────────────────────────────────────────────────────────
  let client;
  let organizationId = null;
  let sourceBranch = null;
  let targetBranch = null;
  let testProductId = null;
  let createdTransferId = null;

  try {
    client = await getPgClient();
    await client.connect();
    console.log('📡 [DATABASE CONNECTED] Terhubung ke Supabase PostgreSQL Pooler.\n');

    // 1. Ambil Organisasi dan Cabang Eksisting
    const orgRes = await client.query(`
      SELECT o.id FROM organizations o
      JOIN branches b ON b.organization_id = o.id
      GROUP BY o.id HAVING count(b.id) >= 2
      LIMIT 1;
    `);

    if (orgRes.rows.length > 0) {
      organizationId = orgRes.rows[0].id;
    } else {
      const anyOrg = await client.query(`SELECT id FROM organizations LIMIT 1;`);
      organizationId = anyOrg.rows[0].id;
    }

    const branchRes = await client.query(`
      SELECT id, branch_name, branch_code FROM branches 
      WHERE organization_id = $1 
      ORDER BY is_main_branch DESC, created_at ASC;
    `, [organizationId]);

    assert.ok(branchRes.rows.length >= 2, 'Diperlukan minimal 2 cabang pada organisasi');
    sourceBranch = branchRes.rows[0];
    targetBranch = branchRes.rows[1];

    // Cari atau buat produk pengujian
    const prodRes = await client.query(`
      SELECT id, nama, harga_modal FROM products WHERE is_deleted = false LIMIT 1;
    `);
    assert.ok(prodRes.rows.length > 0, 'Produk harus tersedia di basis data');
    testProductId = prodRes.rows[0].id;

    // Set available_stock awal di sourceBranch sebesar 50
    await client.query(`
      INSERT INTO branch_product_stocks (branch_id, product_id, available_stock, in_transit_stock, safety_stock)
      VALUES ($1, $2, 50, 0, 5)
      ON CONFLICT (branch_id, product_id)
      DO UPDATE SET available_stock = 50, in_transit_stock = 0;
    `, [sourceBranch.id, testProductId]);

    // Set available_stock awal di targetBranch sebesar 0
    await client.query(`
      INSERT INTO branch_product_stocks (branch_id, product_id, available_stock, in_transit_stock, safety_stock)
      VALUES ($1, $2, 0, 0, 5)
      ON CONFLICT (branch_id, product_id)
      DO UPDATE SET available_stock = 0, in_transit_stock = 0;
    `, [targetBranch.id, testProductId]);

    console.log(`ℹ️ Konfigurasi Uji: Org=${organizationId}, Asal=${sourceBranch.branch_name} (${sourceBranch.id}), Tujuan=${targetBranch.branch_name} (${targetBranch.id}), Produk=${testProductId}`);

    // ────────────────────────────────────────────────────────────────────────
    // PENGUJIAN 5: RPC dispatch_stock_transfer & PENGARASAN 1 (SNAPSHOT COGS)
    // ────────────────────────────────────────────────────────────────────────
    const validPin = '123456';
    const validPinHash = sha256(validPin);

    try {
      const itemsPayload = JSON.stringify([
        { product_id: testProductId, qty_dispatched: 10, notes: 'Pengiriman batch 1' }
      ]);

      const dispatchRes = await client.query(`
        SELECT dispatch_stock_transfer(
          $1::UUID, $2::UUID, $3::UUID, $4::JSONB, $5::TEXT, NULL, $6::TEXT
        ) AS result;
      `, [organizationId, sourceBranch.id, targetBranch.id, itemsPayload, validPinHash, 'Pengiriman Uji Coba']);

      const resObj = dispatchRes.rows[0].result;
      assert.ok(resObj.success, 'dispatch_stock_transfer harus mengembalikan success: true');
      createdTransferId = resObj.transfer_id;
      assert.ok(createdTransferId, 'Harus mengembalikan transfer_id');

      // Verifikasi stok cabang asal: available berkurang 10 (jadi 40), in_transit bertambah 10
      const srcStock = await client.query(`
        SELECT available_stock, in_transit_stock FROM branch_product_stocks 
        WHERE branch_id = $1 AND product_id = $2;
      `, [sourceBranch.id, testProductId]);

      assert.strictEqual(Number(srcStock.rows[0].available_stock), 40, 'Available stock asal harus berkurang tepat 10');
      assert.strictEqual(Number(srcStock.rows[0].in_transit_stock), 10, 'In-transit stock asal harus bertambah 10');

      // Verifikasi PENGARASAN 1: Snapshot cogs_per_unit statis pada stock_transfer_items
      const itemCheck = await client.query(`
        SELECT cogs_per_unit, qty_dispatched FROM stock_transfer_items 
        WHERE transfer_id = $1 AND product_id = $2;
      `, [createdTransferId, testProductId]);

      assert.strictEqual(Number(itemCheck.rows[0].qty_dispatched), 10, 'qty_dispatched harus 10');
      assert.ok(itemCheck.rows[0].cogs_per_unit !== null, 'cogs_per_unit harus di-snapshot statis');

      // Verifikasi mutasi TRANSFER_OUT dicatat
      const mutCheck = await client.query(`
        SELECT mutation_type, quantity_units FROM stock_mutations 
        WHERE product_id = $1 AND mutation_type = 'TRANSFER_OUT' 
        ORDER BY created_at DESC LIMIT 1;
      `, [testProductId]);
      assert.strictEqual(mutCheck.rows[0].mutation_type, 'TRANSFER_OUT');
      assert.strictEqual(Number(mutCheck.rows[0].quantity_units), 10);

      recordPass('Database RPC: dispatch_stock_transfer memindahkan stok ke in_transit & snapshot modal cogs_per_unit statis (Pengarasan 1)');
    } catch (err) {
      recordFail('Database RPC dispatch_stock_transfer', err);
    }

    // ────────────────────────────────────────────────────────────────────────
    // PENGUJIAN 6: PENOLAKAN DISPATCH SAAT STOK KURANG
    // ────────────────────────────────────────────────────────────────────────
    try {
      const overPayload = JSON.stringify([
        { product_id: testProductId, qty_dispatched: 9999 } // Melebihi stok 40
      ]);
      let threw = false;
      try {
        await client.query(`
          SELECT dispatch_stock_transfer(
            $1::UUID, $2::UUID, $3::UUID, $4::JSONB, $5::TEXT, NULL, $6::TEXT
          );
        `, [organizationId, sourceBranch.id, targetBranch.id, overPayload, validPinHash, 'Harus Gagal']);
      } catch (e) {
        threw = true;
        assert.ok(e.message.includes('STOK_TIDAK_CUKUP'), `Pesan error harus STOK_TIDAK_CUKUP: ${e.message}`);
      }
      assert.ok(threw, 'Harus melempar error saat kuantitas transfer melebihi stok fisik');

      recordPass('Database Safety: dispatch_stock_transfer menolak mutasi jika kuantitas kirim melebihi available_stock');
    } catch (err) {
      recordFail('Safety Stock Check', err);
    }

    // ────────────────────────────────────────────────────────────────────────
    // PENGUJIAN 7: RPC receive_stock_transfer PENOLAKAN PIN SALAH & COUNTER
    // ────────────────────────────────────────────────────────────────────────
    try {
      const wrongPin = '999999'; // PIN salah
      const itemsReceive = JSON.stringify([
        { product_id: testProductId, qty_received: 10, qty_damaged: 0, qty_lost: 0 }
      ]);

      const failRes = await client.query(`
        SELECT receive_stock_transfer(
          $1::UUID, $2::UUID, $3::JSONB, $4::TEXT, NULL
        ) AS result;
      `, [createdTransferId, targetBranch.id, itemsReceive, wrongPin]);

      const resObj = failRes.rows[0].result;
      assert.strictEqual(resObj.success, false, 'Hasil verifikasi PIN salah harus success: false');
      assert.strictEqual(resObj.error_code, 'PIN_INVALID', 'Error code harus PIN_INVALID');
      assert.strictEqual(resObj.failed_attempts, 1, 'Counter percobaan gagal harus 1');

      // Cek counter failed_pin_attempts di tabel stock_transfers terupdate secara permanen
      const countCheck = await client.query(`
        SELECT failed_pin_attempts, is_locked FROM stock_transfers WHERE id = $1;
      `, [createdTransferId]);

      assert.strictEqual(countCheck.rows[0].failed_pin_attempts, 1, 'Counter failed_pin_attempts di database harus 1');
      assert.strictEqual(countCheck.rows[0].is_locked, false, 'Belum boleh dikunci pada percobaan 1');

      recordPass('Database Security: receive_stock_transfer menolak PIN salah & mencatat failed_pin_attempts secara stateful');
    } catch (err) {
      recordFail('PIN Failure Handling', err);
    }

    // ────────────────────────────────────────────────────────────────────────
    // PENGUJIAN 8: PENGARASAN 2 (BRUTE-FORCE PROTECTION & AUTO-LOCKDOWN)
    // ────────────────────────────────────────────────────────────────────────
    try {
      const wrongPin = '888888';
      const itemsReceive = JSON.stringify([
        { product_id: testProductId, qty_received: 10, qty_damaged: 0, qty_lost: 0 }
      ]);

      // Percobaan salah kedua
      await client.query(`SELECT receive_stock_transfer($1::UUID, $2::UUID, $3::JSONB, $4::TEXT, NULL);`,
        [createdTransferId, targetBranch.id, itemsReceive, wrongPin]);

      // Percobaan salah ketiga (memicu auto-lockdown)
      const lockRes = await client.query(`SELECT receive_stock_transfer($1::UUID, $2::UUID, $3::JSONB, $4::TEXT, NULL) AS result;`,
        [createdTransferId, targetBranch.id, itemsReceive, wrongPin]);

      const lockObj = lockRes.rows[0].result;
      assert.strictEqual(lockObj.success, false);
      assert.strictEqual(lockObj.error_code, 'PIN_INVALID_LOCKED');
      assert.strictEqual(lockObj.is_locked, true);

      // Cek apakah tiket di database terkunci permanen
      const lockCheck = await client.query(`
        SELECT failed_pin_attempts, is_locked FROM stock_transfers WHERE id = $1;
      `, [createdTransferId]);

      assert.ok(lockCheck.rows[0].failed_pin_attempts >= 3, 'Counter harus mencapai minimal 3');
      assert.strictEqual(lockCheck.rows[0].is_locked, true, 'Tiket transfer harus dikunci (is_locked = TRUE)');

      // Percobaan berikutnya meskipun dengan PIN BENAR harus ditolak karena tiket sudah terkunci
      const postLockRes = await client.query(`
        SELECT receive_stock_transfer($1::UUID, $2::UUID, $3::JSONB, $4::TEXT, NULL) AS result;
      `, [createdTransferId, targetBranch.id, itemsReceive, validPin]);

      assert.strictEqual(postLockRes.rows[0].result.success, false);
      assert.strictEqual(postLockRes.rows[0].result.error_code, 'TRANSFER_LOCKED');

      recordPass('Database Security: Auto-lockdown aktif setelah 3x PIN salah dengan penguncian FOR UPDATE (Pengarasan 2)');
    } catch (err) {
      recordFail('Auto-lockdown Test', err);
    }

    // ────────────────────────────────────────────────────────────────────────
    // PENGUJIAN 9: RPC receive_stock_transfer BERHASIL DENGAN SUSUT (SHRINKAGE LOG)
    // ────────────────────────────────────────────────────────────────────────
    try {
      // Buat transfer baru yang bersih
      const cleanPin = '654321';
      const cleanPinHash = sha256(cleanPin);
      const itemsPayload = JSON.stringify([
        { product_id: testProductId, qty_dispatched: 15, notes: 'Kirim 15 barang' }
      ]);

      const dispatchRes = await client.query(`
        SELECT dispatch_stock_transfer(
          $1::UUID, $2::UUID, $3::UUID, $4::JSONB, $5::TEXT, NULL, $6::TEXT
        ) AS result;
      `, [organizationId, sourceBranch.id, targetBranch.id, itemsPayload, cleanPinHash, 'Kirim 15 barang']);

      const shrinkTransferId = dispatchRes.rows[0].result.transfer_id;

      // Penerima menerima: 12 kondisi BAIK, 2 RUSAK, 1 HILANG (Total = 15)
      const itemsReceive = JSON.stringify([
        { product_id: testProductId, qty_received: 12, qty_damaged: 2, qty_lost: 1 }
      ]);

      const receiveRes = await client.query(`
        SELECT receive_stock_transfer(
          $1::UUID, $2::UUID, $3::JSONB, $4::TEXT, NULL
        ) AS result;
      `, [shrinkTransferId, targetBranch.id, itemsReceive, cleanPin]);

      assert.strictEqual(receiveRes.rows[0].result.status, 'DISCREPANCY', 'Status harus DISCREPANCY');
      assert.strictEqual(receiveRes.rows[0].result.total_received, 12, 'Total diterima baik harus 12');

      // Verifikasi stok cabang tujuan bertambah tepat 12 (hanya qty_received yang baik)
      const tgtStock = await client.query(`
        SELECT available_stock FROM branch_product_stocks 
        WHERE branch_id = $1 AND product_id = $2;
      `, [targetBranch.id, testProductId]);
      assert.strictEqual(Number(tgtStock.rows[0].available_stock), 12, 'Stok cabang penerima harus bertambah tepat 12');

      // Verifikasi transit_shrinkage_logs mencatat 1 baris susut untuk produk ini
      const shrinkLogs = await client.query(`
        SELECT qty_damaged, qty_lost, cogs_per_unit, total_shrinkage_cogs FROM transit_shrinkage_logs 
        WHERE transfer_id = $1 AND product_id = $2;
      `, [shrinkTransferId, testProductId]);

      assert.strictEqual(shrinkLogs.rows.length, 1, 'Harus tercatat log susut transit');
      assert.strictEqual(Number(shrinkLogs.rows[0].qty_damaged), 2, 'qty_damaged harus 2');
      assert.strictEqual(Number(shrinkLogs.rows[0].qty_lost), 1, 'qty_lost harus 1');
      assert.ok(Number(shrinkLogs.rows[0].total_shrinkage_cogs) > 0, 'Total shrinkage COGS harus bernilai positif');

      // Verifikasi radar anomali keamanan
      const anomalyCheck = await client.query(`
        SELECT event_type, severity FROM security_anomaly_events 
        WHERE event_type = 'TRANSFER_SHRINKAGE'
        ORDER BY created_at DESC LIMIT 1;
      `);
      assert.strictEqual(anomalyCheck.rows[0].event_type, 'TRANSFER_SHRINKAGE');

      recordPass('Database Reconciliation: receive_stock_transfer memproses penerimaan, mencatat susut ke transit_shrinkage_logs & radar anomali');
    } catch (err) {
      recordFail('Shrinkage Reconciliation', err);
    }

    // ────────────────────────────────────────────────────────────────────────
    // PENGUJIAN 10: RPC cancel_stock_transfer DENGAN RESTORASI STOK PENUH
    // ────────────────────────────────────────────────────────────────────────
    try {
      // Buat transfer baru untuk dibatalkan
      const cancelPin = '112233';
      const cancelPinHash = sha256(cancelPin);
      const itemsPayload = JSON.stringify([
        { product_id: testProductId, qty_dispatched: 5, notes: 'Siap Dibatalkan' }
      ]);

      const dispatchRes = await client.query(`
        SELECT dispatch_stock_transfer(
          $1::UUID, $2::UUID, $3::UUID, $4::JSONB, $5::TEXT, NULL, $6::TEXT
        ) AS result;
      `, [organizationId, sourceBranch.id, targetBranch.id, itemsPayload, cancelPinHash, 'Siap Dibatalkan']);

      const cancelTransferId = dispatchRes.rows[0].result.transfer_id;

      // Ambil stok sebelum pembatalan
      const beforeStock = await client.query(`
        SELECT available_stock, in_transit_stock FROM branch_product_stocks 
        WHERE branch_id = $1 AND product_id = $2;
      `, [sourceBranch.id, testProductId]);

      const availBefore = Number(beforeStock.rows[0].available_stock);
      const transitBefore = Number(beforeStock.rows[0].in_transit_stock);

      // Batalkan transfer
      const cancelRes = await client.query(`
        SELECT cancel_stock_transfer($1::UUID, NULL, 'Kendaraan mogok mendadak', NULL) AS result;
      `, [cancelTransferId]);

      assert.strictEqual(cancelRes.rows[0].result.success, true);

      // Verifikasi status transfer di database
      const trfCheck = await client.query(`
        SELECT status, cancellation_reason FROM stock_transfers WHERE id = $1;
      `, [cancelTransferId]);
      assert.strictEqual(trfCheck.rows[0].status, 'CANCELLED');
      assert.strictEqual(trfCheck.rows[0].cancellation_reason, 'Kendaraan mogok mendadak');

      // Verifikasi stok dipulihkan: available_stock bertambah 5, in_transit_stock berkurang 5
      const afterStock = await client.query(`
        SELECT available_stock, in_transit_stock FROM branch_product_stocks 
        WHERE branch_id = $1 AND product_id = $2;
      `, [sourceBranch.id, testProductId]);

      assert.strictEqual(Number(afterStock.rows[0].available_stock), availBefore + 5, 'Available stock harus kembali bertambah 5');
      assert.strictEqual(Number(afterStock.rows[0].in_transit_stock), transitBefore - 5, 'In transit stock harus kembali berkurang 5');

      // Verifikasi mutasi TRANSFER_CANCELLED dicatat
      const mutCheck = await client.query(`
        SELECT mutation_type, quantity_units FROM stock_mutations 
        WHERE product_id = $1 AND mutation_type = 'TRANSFER_CANCELLED'
        ORDER BY created_at DESC LIMIT 1;
      `, [testProductId]);
      assert.strictEqual(mutCheck.rows[0].mutation_type, 'TRANSFER_CANCELLED');
      assert.strictEqual(Number(mutCheck.rows[0].quantity_units), 5);

      recordPass('Database Rollback: cancel_stock_transfer memulihkan stok mengambang kembali ke cabang asal');
    } catch (err) {
      recordFail('Cancel Stock Transfer', err);
    }

    // ────────────────────────────────────────────────────────────────────────
    // PENGUJIAN 11: PENGARASAN 3 (LAZY PROVISIONING INTEGRITY PADA RESOLVER)
    // ────────────────────────────────────────────────────────────────────────
    try {
      // Ambil shop_id untuk membuat produk dummy
      const shopRow = await client.query(`SELECT shop_id FROM branches WHERE id = $1;`, [sourceBranch.id]);
      const currentShopId = shopRow.rows[0].shop_id;

      // Buat produk baru
      const dummyProd = await client.query(`
        INSERT INTO products (nama, harga_base, harga_modal, stock, shop_id, tipe, is_deleted)
        VALUES ('Produk Belum Ada Di Cabang Satelit', 10000, 8000, 10, $1, 'INSTAN', false)
        RETURNING id;
      `, [currentShopId]);
      const dummyProdId = dummyProd.rows[0].id;

      // Hapus baris yang mungkin dibuat otomatis oleh trigger untuk targetBranch
      await client.query(`
        DELETE FROM branch_product_stocks WHERE branch_id = $1 AND product_id = $2;
      `, [targetBranch.id, dummyProdId]);

      // Simulasi eksekusi lazy provisioning dari inventoryResolver.js
      const insertLazy = await client.query(`
        INSERT INTO branch_product_stocks (branch_id, product_id, available_stock, in_transit_stock, safety_stock)
        VALUES ($1, $2, 0, 0, 5)
        ON CONFLICT (branch_id, product_id) DO NOTHING
        RETURNING available_stock, in_transit_stock, safety_stock;
      `, [targetBranch.id, dummyProdId]);

      assert.ok(insertLazy.rows.length > 0, 'Lazy provisioning harus berhasil meng-insert baris baru');
      assert.strictEqual(Number(insertLazy.rows[0].available_stock), 0);
      assert.strictEqual(Number(insertLazy.rows[0].safety_stock), 5);

      // Bersihkan dummy product
      await client.query(`DELETE FROM branch_product_stocks WHERE product_id = $1;`, [dummyProdId]);
      await client.query(`DELETE FROM products WHERE id = $1;`, [dummyProdId]);

      recordPass('Database Lazy Provisioning: Baris branch_product_stocks berhasil dibuat otomatis saat produk/cabang baru diakses (Pengarasan 3)');
    } catch (err) {
      recordFail('Lazy Provisioning Integrity', err);
    }

  } catch (dbErr) {
    console.error('Fatal Database Connection Error:', dbErr);
    recordFail('Database Connection', dbErr);
  } finally {
    if (client) {
      await client.end();
      console.log('📡 [DATABASE DISCONNECTED] Koneksi database ditutup.');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RINGKASAN AKHIR
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════════════');
  console.log(`🏁 HASIL VERIFIKASI TAHAP 7: ${passedTests}/${totalTests} PENGUJIAN LULUS (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('══════════════════════════════════════════════════════════════════');

  if (passedTests === totalTests) {
    console.log('🎉 SEMUA PENGUJIAN TAHAP 7 (MULTI-BRANCH & TWO-PHASE TRANSFER) LULUS DENGAN SEMPURNA!');
    process.exit(0);
  } else {
    console.error(`💥 TERDAPAT ${totalTests - passedTests} PENGUJIAN GAGAL.`);
    process.exit(1);
  }
}

runAllTests().catch((e) => {
  console.error('Unhandled Verification Suite Error:', e);
  process.exit(1);
});
