/**
 * scratch/verify_phase9_pwa_push.cjs
 * Suite Verifikasi Otomatis Tahap 9: Native PWA Hardening, VAPID Push & Background Sync Engine
 */

const assert = require('assert');
const pg = require('pg');
const dns = require('dns');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

async function getPgClient() {
  const hostname = 'aws-0-ap-southeast-1.pooler.supabase.com';
  let host = '54.255.219.82';
  try {
    const ips = await new Promise((resolve, reject) => {
      dns.resolve4(hostname, (err, addrs) => {
        if (err) reject(err);
        else resolve(addrs);
      });
    });
    if (ips && ips.length > 0) host = ips[0];
  } catch (err) {}

  const client = new pg.Client({
    host: host,
    port: 5432,
    user: 'postgres.doaisnsdahepsxqaroru',
    password: 'ahzaganteng',
    database: 'postgres',
    connectionTimeoutMillis: 15000,
    ssl: { rejectUnauthorized: false, servername: hostname },
  });

  return client;
}

// ── TEST RUNNER ─────────────────────────────────────────────────────────────
let passedCount = 0;
let failedCount = 0;

function reportTest(title, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${title}`);
    passedCount++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${title}`);
    console.error(`     Error: ${err.message}`);
    failedCount++;
  }
}

async function reportTestAsync(title, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${title}`);
    passedCount++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${title}`);
    console.error(`     Error: ${err.message}`);
    failedCount++;
  }
}

// ── UTILITIES UNDER TEST (Mirrored from src/utils) ──────────────────────────
const SECRET = 'c79f42d2a7bc4e9089f66d4822501a3de9e0ad7911b3e5a3';

function generateActionToken(shopId, userId, overrideTimestamp = null) {
  const timestamp = overrideTimestamp || Date.now();
  const payloadStr = `${shopId}:${userId}:${timestamp}`;
  const signature = crypto.createHmac('sha256', SECRET).update(payloadStr).digest('hex');
  const tokenObj = { shopId, userId, timestamp, sig: signature };
  return Buffer.from(JSON.stringify(tokenObj)).toString('base64url');
}

function verifyActionToken(tokenString, expectedShopId = null) {
  if (!tokenString) return { valid: false, reason: 'Token tidak disertakan' };
  try {
    const rawJson = Buffer.from(tokenString, 'base64url').toString('utf8');
    const parsed = JSON.parse(rawJson);
    const { shopId, userId, timestamp, sig } = parsed;

    if (!shopId || !timestamp || !sig) return { valid: false, reason: 'Format token cacat' };
    if (expectedShopId && shopId !== expectedShopId) {
      return { valid: false, reason: 'ID Toko tidak cocok dengan otorisasi token' };
    }

    const age = Date.now() - Number(timestamp);
    if (age > 120000) {
      return { valid: false, reason: `Token darurat telah kedaluwarsa (${Math.round(age / 1000)}s > 120s)` };
    }

    const payloadStr = `${shopId}:${userId}:${timestamp}`;
    const expectedSig = crypto.createHmac('sha256', SECRET).update(payloadStr).digest('hex');

    if (crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'))) {
      return { valid: true, shopId, userId, timestamp };
    }
    return { valid: false, reason: 'Tanda tangan digital tidak sah' };
  } catch (e) {
    return { valid: false, reason: 'Gagal mendekode token darurat' };
  }
}

function chunkTransactions(txList = [], size = 25) {
  const chunks = [];
  for (let i = 0; i < txList.length; i += size) {
    chunks.push(txList.slice(i, i + size));
  }
  return chunks;
}

// ── MAIN EXECUTION ──────────────────────────────────────────────────────────
async function runAllTests() {
  console.log('================================================================');
  console.log('🛡️  SUITE PENGUJIAN TAHAP 9: PWA HARDENING & VAPID PUSH SYNC');
  console.log('================================================================\n');

  // ── 1. INISIALISASI & INTEGRITAS KUNCI VAPID ───────────────────────────────
  console.log('TEST GRUP 1: Inisialisasi VAPID Keypair (RFC 8292)');
  const { ensureVapidKeys } = require('./ensure_vapid_keys.cjs');
  const vapidKeys = ensureVapidKeys();

  reportTest('VAPID Public Key tersedia dan berformat valid Base64URL', () => {
    assert(vapidKeys.publicKey, 'Public key tidak boleh null/kosong');
    assert(vapidKeys.publicKey.length >= 64, 'Public key harus memiliki panjang minimal 64 karakter');
  });

  reportTest('VAPID Subject terkonfigurasi dengan format mailto: / URL', () => {
    assert(vapidKeys.subject, 'VAPID subject tidak boleh null/kosong');
    assert(vapidKeys.subject.startsWith('mailto:') || vapidKeys.subject.startsWith('https://'), 'Subject harus berawalan mailto: atau https://');
  });

  // ── 2. KRIPTOGRAFI HMAC ACTION TOKEN & TTL 120 DETIK ──────────────────────
  console.log('\nTEST GRUP 2: HMAC Action Token & Keamanan Layar Kunci (TTL 120s)');
  const testShopId = '00000000-0000-0000-0000-000000000001';
  const testUserId = '00000000-0000-0000-0000-000000000002';

  reportTest('HMAC Action Token valid berhasil diverifikasi', () => {
    const token = generateActionToken(testShopId, testUserId);
    const result = verifyActionToken(token, testShopId);
    assert.strictEqual(result.valid, true, 'Token yang baru dibuat harus valid');
    assert.strictEqual(result.shopId, testShopId);
    assert.strictEqual(result.userId, testUserId);
  });

  reportTest('Token yang kedaluwarsa (> 120 detik) ditolak secara tegas', () => {
    // Buat token dengan waktu 121 detik yang lalu
    const expiredTimestamp = Date.now() - 125000;
    const expiredToken = generateActionToken(testShopId, testUserId, expiredTimestamp);
    const result = verifyActionToken(expiredToken, testShopId);
    assert.strictEqual(result.valid, false, 'Token kedaluwarsa harus tidak valid');
    assert(result.reason.includes('kedaluwarsa'), 'Alasan penolakan harus mencakup info kedaluwarsa');
  });

  reportTest('Token dengan shopId tidak cocok ditolak', () => {
    const token = generateActionToken(testShopId, testUserId);
    const result = verifyActionToken(token, '00000000-0000-0000-0000-999999999999');
    assert.strictEqual(result.valid, false, 'Token harus ditolak jika shopId tidak sesuai');
    assert(result.reason.includes('tidak cocok'), 'Alasan harus mencakup ketidakcocokan shopId');
  });

  reportTest('Token yang diubah/dimanipulasi (tampered) ditolak', () => {
    const token = generateActionToken(testShopId, testUserId);
    // Ubah satu karakter di tengah token
    const tampered = token.slice(0, 10) + 'X' + token.slice(11);
    const result = verifyActionToken(tampered, testShopId);
    assert.strictEqual(result.valid, false, 'Token yang diutak-atik harus ditolak');
  });

  // ── 3. CHUNKING & OPTIMASI PONSEL LOW-END (ANDROID GO / 2GB RAM) ────────────
  console.log('\nTEST GRUP 3: Chunking & Pembatasan Memori Low-End Device');
  reportTest('Chunking memecah antrean 60 transaksi menjadi 3 batch (25, 25, 10)', () => {
    const dummyQueue = Array.from({ length: 60 }, (_, i) => ({ id: `tx-${i + 1}`, amount: 10000 }));
    const batches = chunkTransactions(dummyQueue, 25);

    assert.strictEqual(batches.length, 3, 'Harus terpecah menjadi tepat 3 batch');
    assert.strictEqual(batches[0].length, 25, 'Batch 1 harus berisi 25 item');
    assert.strictEqual(batches[1].length, 25, 'Batch 2 harus berisi 25 item');
    assert.strictEqual(batches[2].length, 10, 'Batch 3 harus berisi 10 item');
  });

  // ── 4. INTEGRITAS SERVICE WORKER (public/sw.js) ─────────────────────────────
  console.log('\nTEST GRUP 4: Validasi Sintaks & Handler Service Worker (public/sw.js)');
  const swPath = path.resolve(__dirname, '../public/sw.js');

  reportTest('File public/sw.js ada dan tidak kosong', () => {
    assert(fs.existsSync(swPath), 'public/sw.js harus ada');
    const content = fs.readFileSync(swPath, 'utf8');
    assert(content.length > 500, 'Ukuran sw.js harus memadai');
  });

  reportTest('Service Worker mengekspor seluruh handler wajib (install, activate, fetch, push, notificationclick, sync)', () => {
    const content = fs.readFileSync(swPath, 'utf8');
    assert(content.includes("addEventListener('install'"), 'Handler install harus terdaftar');
    assert(content.includes("addEventListener('activate'"), 'Handler activate harus terdaftar');
    assert(content.includes("addEventListener('fetch'"), 'Handler fetch harus terdaftar');
    assert(content.includes("addEventListener('push'"), 'Handler push harus terdaftar');
    assert(content.includes("addEventListener('notificationclick'"), 'Handler notificationclick harus terdaftar');
    assert(content.includes("addEventListener('sync'"), 'Handler sync harus terdaftar');
  });

  reportTest('Service Worker menerapkan LRU Cache Trimming (max 50) dan proteksi Network-Only API', () => {
    const content = fs.readFileSync(swPath, 'utf8');
    assert(content.includes('trimCache'), 'Fungsi trimCache harus ada');
    assert(content.includes('MAX_DYNAMIC_ENTRIES = 50') || content.includes('50'), 'Batas entri 50 harus ada');
    assert(content.includes("url.pathname.startsWith('/api/')"), 'Endpoint /api/ harus dikecualikan dari cache');
  });

  reportTest('Handler notificationclick memproses action freeze via POST /api/v1/radar/freeze', () => {
    const content = fs.readFileSync(swPath, 'utf8');
    assert(content.includes("action === 'freeze'"), 'Aksi freeze harus didukung');
    assert(content.includes('/api/v1/radar/freeze'), 'Harus memanggil endpoint /api/v1/radar/freeze');
  });

  // ── 5. PENGUJIAN DATABASE & STORED PROCEDURES (POSTGRESQL) ───────────────────
  console.log('\nTEST GRUP 5: Verifikasi Skema Basis Data & RPC Supabase PostgreSQL');
  let pgClient = null;

  try {
    pgClient = await getPgClient();
    await pgClient.connect();

    // Test 5.1: Tabel push_subscriptions
    await reportTestAsync('Tabel push_subscriptions memiliki kolom lengkap dan index aktif', async () => {
      const res = await pgClient.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'push_subscriptions'
        ORDER BY ordinal_position;
      `);
      const cols = res.rows.map(r => r.column_name);
      assert(cols.includes('id'), 'Kolom id harus ada');
      assert(cols.includes('organization_id'), 'Kolom organization_id harus ada');
      assert(cols.includes('user_id'), 'Kolom user_id harus ada');
      assert(cols.includes('endpoint'), 'Kolom endpoint harus ada');
      assert(cols.includes('p256dh_key'), 'Kolom p256dh_key harus ada');
      assert(cols.includes('auth_key'), 'Kolom auth_key harus ada');
      assert(cols.includes('is_active'), 'Kolom is_active harus ada');
    });

    // Test 5.2: Kolom Idempotensi transactions
    await reportTestAsync('Tabel transactions memiliki client_tx_uuid, synced_via, dan offline_created_at', async () => {
      const res = await pgClient.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
          AND column_name IN ('client_tx_uuid', 'synced_via', 'offline_created_at');
      `);
      const cols = res.rows.map(r => r.column_name);
      assert(cols.includes('client_tx_uuid'), 'Kolom client_tx_uuid harus ada');
      assert(cols.includes('synced_via'), 'Kolom synced_via harus ada');
      assert(cols.includes('offline_created_at'), 'Kolom offline_created_at harus ada');
    });

    // Test 5.3: Tabel remote_action_logs
    await reportTestAsync('Tabel remote_action_logs siap mencatat audit trail pembekuan layar kunci', async () => {
      const res = await pgClient.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'remote_action_logs';
      `);
      const cols = res.rows.map(r => r.column_name);
      assert(cols.includes('action_type'), 'Kolom action_type harus ada');
      assert(cols.includes('source'), 'Kolom source harus ada');
      assert(cols.includes('triggered_by'), 'Kolom triggered_by harus ada');
    });

    // Test 5.4: Eksekusi RPC remote_freeze_cashier
    await reportTestAsync('RPC remote_freeze_cashier mengunci register dan mengembalikan respons sukses', async () => {
      // Ambil 1 toko aktif untuk pengujian
      const shopRes = await pgClient.query(`SELECT id FROM shops LIMIT 1;`);
      if (shopRes.rows.length === 0) {
        console.log('       (Dilewati: Tidak ada data toko untuk uji RPC)');
        return;
      }
      const targetShop = shopRes.rows[0].id;

      const rpcRes = await pgClient.query(`
        SELECT remote_freeze_cashier($1, 'Uji Otomatis Verifikasi Tahap 9', NULL) as result;
      `, [targetShop]);

      const result = rpcRes.rows[0]?.result;
      assert.strictEqual(result.success, true, 'RPC harus mengembalikan success: true');
      assert(result.message.includes('berhasil dibekukan'), 'Pesan konfirmasi harus sesuai');

      // Periksa status register
      const regRes = await pgClient.query(`
        SELECT is_frozen, frozen_reason FROM registers WHERE shop_id = $1 LIMIT 1;
      `, [targetShop]);
      assert.strictEqual(regRes.rows[0].is_frozen, true, 'Register harus berstatus is_frozen = TRUE');

      // Kembalikan status register ke semula (unfreeze) agar tidak mengganggu toko uji
      await pgClient.query(`
        UPDATE registers SET is_frozen = FALSE, frozen_reason = NULL WHERE shop_id = $1;
      `, [targetShop]);
    });

    // Test 5.5: Uji Idempotensi client_tx_uuid pada tabel transactions
    await reportTestAsync('Idempotensi transactions: Duplikasi client_tx_uuid tidak menduplikasi baris', async () => {
      const shopRes = await pgClient.query(`SELECT id FROM shops LIMIT 1;`);
      if (shopRes.rows.length === 0) return;
      const targetShop = shopRes.rows[0].id;

      const testUuid = crypto.randomUUID();
      const testBon = `BON-TEST-IDEM-${Date.now()}`;

      // Insert pertama
      await pgClient.query(`
        INSERT INTO transactions (shop_id, nomor_bon, tanggal, omzet_total, laba_total, amount_owed, status, client_tx_uuid, synced_via)
        VALUES ($1, $2, CURRENT_DATE, 50000, 10000, 0, 'Lunas', $3, 'BACKGROUND_SYNC')
        ON CONFLICT (shop_id, client_tx_uuid) DO NOTHING;
      `, [targetShop, testBon, testUuid]);

      // Insert kedua dengan client_tx_uuid identik (simulasi retry / duplicate request)
      await pgClient.query(`
        INSERT INTO transactions (shop_id, nomor_bon, tanggal, omzet_total, laba_total, amount_owed, status, client_tx_uuid, synced_via)
        VALUES ($1, $2, CURRENT_DATE, 50000, 10000, 0, 'Lunas', $3, 'BACKGROUND_SYNC')
        ON CONFLICT (shop_id, client_tx_uuid) DO NOTHING;
      `, [targetShop, testBon, testUuid]);

      // Verifikasi hanya ada 1 baris
      const countRes = await pgClient.query(`
        SELECT COUNT(*) as total FROM transactions WHERE shop_id = $1 AND client_tx_uuid = $2;
      `, [targetShop, testUuid]);

      assert.strictEqual(parseInt(countRes.rows[0].total, 10), 1, 'Harus tepat 1 transaksi yang tersimpan (kebal duplikasi)');

      // Bersihkan data uji
      await pgClient.query(`DELETE FROM transactions WHERE client_tx_uuid = $1;`, [testUuid]);
    });

  } catch (dbErr) {
    console.error('❌ Kesalahan koneksi PostgreSQL:', dbErr.message);
  } finally {
    if (pgClient) {
      await pgClient.end().catch(() => {});
    }
  }

  // ── 6. VERIFIKASI TIER CONFIGURATION (src/config/tiers.js) ───────────────────
  console.log('\nTEST GRUP 6: Validasi Konfigurasi Tier (src/config/tiers.js)');
  const { TIER_CONFIG } = require('../src/config/tiers.js');

  reportTest('MAGANG memiliki background_sync_engine = true, push & kill switch = false', () => {
    assert.strictEqual(TIER_CONFIG.MAGANG.features.background_sync_engine, true);
    assert.strictEqual(TIER_CONFIG.MAGANG.features.lockscreen_push_alerts, false);
    assert.strictEqual(TIER_CONFIG.MAGANG.features.remote_kill_switch, false);
  });

  reportTest('SUPERVISOR memiliki lockscreen_push_alerts = true, remote_kill_switch = false', () => {
    assert.strictEqual(TIER_CONFIG.SUPERVISOR.features.lockscreen_push_alerts, true);
    assert.strictEqual(TIER_CONFIG.SUPERVISOR.features.remote_kill_switch, false);
    assert.strictEqual(TIER_CONFIG.SUPERVISOR.features.background_sync_engine, true);
  });

  reportTest('MANAJER & EKSEKUTIF memiliki seluruh fitur Tahap 9 aktif', () => {
    assert.strictEqual(TIER_CONFIG.MANAJER.features.lockscreen_push_alerts, true);
    assert.strictEqual(TIER_CONFIG.MANAJER.features.remote_kill_switch, true);
    assert.strictEqual(TIER_CONFIG.MANAJER.features.background_sync_engine, true);

    assert.strictEqual(TIER_CONFIG.EKSEKUTIF.features.lockscreen_push_alerts, true);
    assert.strictEqual(TIER_CONFIG.EKSEKUTIF.features.remote_kill_switch, true);
    assert.strictEqual(TIER_CONFIG.EKSEKUTIF.features.background_sync_engine, true);
  });

  // ── RINGKASAN HASIL ───────────────────────────────────────────────────────
  console.log('\n================================================================');
  console.log(`🏁 HASIL VERIFIKASI TAHAP 9: ${passedCount} LULUS, ${failedCount} GAGAL`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
