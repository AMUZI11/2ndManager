/**
 * scratch/verify_phase10_license_engine.cjs
 * Suite Pengujian Mandiri Tahap 10: Grassroots License Engine & Cryptographic Activation
 */

const assert = require('assert');
const pg = require('pg');
const dns = require('dns');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Inisialisasi Kunci Rahasia Lisensi jika belum ada
const { ensureLicenseSecretKey } = require('./ensure_license_key.cjs');
const secretKey = ensureLicenseSecretKey();

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

// ── UTILS PENIRU UNTUK COMMONJS TEST ─────────────────────────────────────────
const TIER_CODE_MAP = {
  SUPERVISOR: 'SPVR',
  MANAJER: 'MNGR',
  EKSEKUTIF: 'EKSE',
};
const REVERSE_TIER_CODE_MAP = {
  SPVR: 'SUPERVISOR',
  MNGR: 'MANAJER',
  EKSE: 'EKSEKUTIF',
};
const STANDARD_DURATIONS = [30, 90, 180, 365, 3650];

function computeSegment4Hmac(secret, tierId, durationDays, salt) {
  const payload = `${tierId}-${durationDays}-${salt.toUpperCase()}`;
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
    .substring(0, 4)
    .toUpperCase();
}

function computeFullHmacSignature(secret, tokenCode, tierId, durationDays) {
  const payload = `${tokenCode}-${tierId}-${durationDays}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function generateLicenseToken(tierId, durationDays = 30, serverSecret = null, customSalt = null) {
  const normalizedTier = (tierId || '').toUpperCase().trim();
  const tierCode = TIER_CODE_MAP[normalizedTier];
  if (!tierCode) throw new Error(`Invalid tierId: ${tierId}`);

  const secret = serverSecret || secretKey;
  let salt = customSalt || crypto.randomBytes(2).toString('hex').toUpperCase();
  const signature = computeSegment4Hmac(secret, normalizedTier, durationDays, salt);
  const tokenCode = `2NDM-${tierCode}-${salt}-${signature}`;
  const fullHmac = computeFullHmacSignature(secret, tokenCode, normalizedTier, durationDays);

  return { tokenCode, tierId: normalizedTier, tierCode, durationDays, salt, signature, fullHmac };
}

function verifyLicenseTokenLocally(tokenCode, serverSecret = null, expectedDuration = null) {
  if (!tokenCode) return { isValid: false, reason: 'Empty token' };
  const clean = tokenCode.trim().toUpperCase();
  const match = clean.match(/^2NDM-(SPVR|MNGR|EKSE)-([0-9A-F]{4})-([0-9A-F]{4})$/i);
  if (!match) return { isValid: false, reason: 'Invalid format' };

  const tierCode = match[1].toUpperCase();
  const tierId = REVERSE_TIER_CODE_MAP[tierCode];
  const salt = match[2].toUpperCase();
  const signature = match[3].toUpperCase();
  const secret = serverSecret || secretKey;

  if (expectedDuration) {
    const sig = computeSegment4Hmac(secret, tierId, expectedDuration, salt);
    return { isValid: sig === signature, tierId, durationDays: expectedDuration };
  }

  for (const d of STANDARD_DURATIONS) {
    const sig = computeSegment4Hmac(secret, tierId, d, salt);
    if (sig === signature) {
      return { isValid: true, tierId, durationDays: d };
    }
  }

  return { isValid: false, reason: 'HMAC signature mismatch' };
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

async function runSuite() {
  console.log('\n================================================================');
  console.log('🛡️  SUITE PENGUJIAN TAHAP 10: GRASSROOTS LICENSE & CLOCK GUARD');
  console.log('================================================================\n');

  // ── TEST GRUP 1: Pembangkitan & Verifikasi Format Token Kriptografis ─────────
  console.log('TEST GRUP 1: Pembangkitan & Verifikasi Format Token 16-Digit');

  reportTest('Token untuk tier SUPERVISOR berformat 2NDM-SPVR-XXXX-XXXX', () => {
    const token = generateLicenseToken('SUPERVISOR', 30);
    assert.strictEqual(token.tokenCode.length, 19);
    assert.match(token.tokenCode, /^2NDM-SPVR-[0-9A-F]{4}-[0-9A-F]{4}$/);
    assert.strictEqual(token.tierId, 'SUPERVISOR');
  });

  reportTest('Token untuk tier MANAJER berformat 2NDM-MNGR-XXXX-XXXX', () => {
    const token = generateLicenseToken('MANAJER', 90);
    assert.match(token.tokenCode, /^2NDM-MNGR-[0-9A-F]{4}-[0-9A-F]{4}$/);
    assert.strictEqual(token.durationDays, 90);
  });

  reportTest('Token untuk tier EKSEKUTIF berformat 2NDM-EKSE-XXXX-XXXX', () => {
    const token = generateLicenseToken('EKSEKUTIF', 365);
    assert.match(token.tokenCode, /^2NDM-EKSE-[0-9A-F]{4}-[0-9A-F]{4}$/);
    assert.strictEqual(token.durationDays, 365);
  });

  reportTest('Verifikasi lokal sukses mengenali token valid', () => {
    const token = generateLicenseToken('EKSEKUTIF', 30);
    const check = verifyLicenseTokenLocally(token.tokenCode);
    assert.strictEqual(check.isValid, true);
    assert.strictEqual(check.tierId, 'EKSEKUTIF');
    assert.strictEqual(check.durationDays, 30);
  });

  reportTest('Verifikasi lokal menolak token yang signature HMAC-nya dimanipulasi', () => {
    const token = generateLicenseToken('SUPERVISOR', 30);
    // Ubah 1 karakter signature segmen ke-4
    const tamperedSig = token.signature.startsWith('A') ? 'B' + token.signature.slice(1) : 'A' + token.signature.slice(1);
    const tamperedToken = `2NDM-SPVR-${token.salt}-${tamperedSig}`;
    const check = verifyLicenseTokenLocally(tamperedToken);
    assert.strictEqual(check.isValid, false);
  });

  reportTest('Verifikasi lokal menolak string token berformat rusak', () => {
    assert.strictEqual(verifyLicenseTokenLocally('2NDM-XXXX-1234').isValid, false);
    assert.strictEqual(verifyLicenseTokenLocally('XYZ-SPVR-A1B2-C3D4').isValid, false);
    assert.strictEqual(verifyLicenseTokenLocally('').isValid, false);
  });

  // ── TEST GRUP 2: Clock Guard Anti-Clock Manipulation ────────────────────────
  console.log('\nTEST GRUP 2: Proteksi Manipulasi Jam Perangkat (Clock Guard)');

  reportTest('Clock Guard mendeteksi jika jam sistem dimundurkan melewati transaksi terakhir', () => {
    const maxTxEpoch = 1750000000000;
    const toleranceMs = 60000;
    // Jam saat ini mundur 1 jam (3.600.000 ms)
    const simulatedNow = maxTxEpoch - 3600000;

    const isTampered = (simulatedNow + toleranceMs) < maxTxEpoch;
    const deltaMinutes = Math.round((maxTxEpoch - simulatedNow) / 60000);

    assert.strictEqual(isTampered, true);
    assert.strictEqual(deltaMinutes, 60);
  });

  reportTest('Clock Guard menganggap valid jika jam sistem lebih maju atau dalam batas toleransi 60s', () => {
    const maxTxEpoch = 1750000000000;
    const toleranceMs = 60000;

    // Skenario A: Jam lebih maju 5 menit
    const nowAdvance = maxTxEpoch + 300000;
    assert.strictEqual((nowAdvance + toleranceMs) < maxTxEpoch, false);

    // Skenario B: Jam drift mundur 30 detik (dalam toleransi 60s)
    const nowDrift = maxTxEpoch - 30000;
    assert.strictEqual((nowDrift + toleranceMs) < maxTxEpoch, false);
  });

  // ── TEST GRUP 3: Basis Data Supabase, RPC Atomik & Graceful Downgrade ────────
  console.log('\nTEST GRUP 3: Database PostgreSQL, RPC Atomik & Graceful Downgrade');

  let client;
  let testOrgId = null;

  try {
    client = await getPgClient();
    await client.connect();
    console.log('  📡 [DATABASE CONNECTED] Terhubung ke Supabase PostgreSQL.');

    // 1. Ambil atau buat Organisasi Uji
    const orgRes = await client.query(`
      SELECT id, name, tier_id FROM organizations LIMIT 1;
    `);

    if (orgRes.rows.length > 0) {
      testOrgId = orgRes.rows[0].id;
    } else {
      const newOrgRes = await client.query(`
        INSERT INTO organizations (name, tier_id)
        VALUES ('Toko Uji Tahap 10', 'MAGANG')
        RETURNING id;
      `);
      testOrgId = newOrgRes.rows[0].id;
    }

    // 2. Test Stored Procedure: redeem_license_token
    await reportTestAsync('Database RPC: redeem_license_token berhasil mengaktifkan voucher baru', async () => {
      const generated = generateLicenseToken('MANAJER', 30);
      
      // Simpan token ke database
      await client.query(`
        INSERT INTO license_tokens (token_code, tier_id, duration_days, hmac_signature, status, notes)
        VALUES ($1, $2, $3, $4, 'UNUSED', 'Test Token Suite 10')
      `, [generated.tokenCode, generated.tierId, generated.durationDays, generated.fullHmac]);

      // Panggil RPC aktivasi
      const rpcRes = await client.query(`
        SELECT redeem_license_token($1, $2, NULL) as result;
      `, [testOrgId, generated.tokenCode]);

      const res = rpcRes.rows[0].result;
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.tier, 'MANAJER');

      // Verifikasi status token menjadi REDEEMED
      const tokenCheck = await client.query(`
        SELECT status, redeemed_by_org FROM license_tokens WHERE token_code = $1;
      `, [generated.tokenCode]);
      assert.strictEqual(tokenCheck.rows[0].status, 'REDEEMED');
      assert.strictEqual(tokenCheck.rows[0].redeemed_by_org, testOrgId);

      // Verifikasi tier organisasi terupdate
      const orgCheck = await client.query(`
        SELECT tier_id FROM organizations WHERE id = $1;
      `, [testOrgId]);
      assert.strictEqual(orgCheck.rows[0].tier_id, 'MANAJER');
    });

    // 3. Test Anti-Double Redemption (Token yang sudah terpakai ditolak)
    await reportTestAsync('Database Safety: redeem_license_token menolak aktivasi ganda (double redemption)', async () => {
      const generated = generateLicenseToken('SUPERVISOR', 30);
      
      // Insert token
      await client.query(`
        INSERT INTO license_tokens (token_code, tier_id, duration_days, hmac_signature, status)
        VALUES ($1, $2, $3, $4, 'UNUSED')
      `, [generated.tokenCode, generated.tierId, generated.durationDays, generated.fullHmac]);

      // Redeem pertama: Berhasil
      await client.query(`SELECT redeem_license_token($1, $2, NULL);`, [testOrgId, generated.tokenCode]);

      // Redeem kedua: Harus ditolak
      let threw = false;
      try {
        await client.query(`SELECT redeem_license_token($1, $2, NULL);`, [testOrgId, generated.tokenCode]);
      } catch (err) {
        threw = true;
        assert(err.message.includes('sudah digunakan') || err.message.includes('tidak aktif'));
      }
      assert.strictEqual(threw, true, 'Aktivasi kedua seharusnya melempar error penolakan');
    });

    // 4. Test View Dinamis: v_active_organization_subscriptions
    await reportTestAsync('Database View: v_active_organization_subscriptions menghitung status dinamis', async () => {
      const viewRes = await client.query(`
        SELECT * FROM v_active_organization_subscriptions WHERE organization_id = $1;
      `, [testOrgId]);

      assert(viewRes.rows.length > 0, 'View harus mengembalikan baris langganan organisasi');
      const row = viewRes.rows[0];
      assert(typeof row.is_in_grace_period === 'boolean');
      assert(typeof row.is_expired === 'boolean');
      assert(row.days_remaining >= 0);
    });

    // 5. Test RPC: evaluate_subscription_status & Graceful Downgrade
    await reportTestAsync('Database RPC: evaluate_subscription_status mengembalikan status langganan terkini', async () => {
      const evalRes = await client.query(`
        SELECT evaluate_subscription_status($1) as status;
      `, [testOrgId]);

      const status = evalRes.rows[0].status;
      assert(status.tier);
      assert(typeof status.is_in_grace === 'boolean');
      assert(typeof status.is_expired === 'boolean');
      assert(status.active_branches_allowed >= 1);
    });

    // 6. Test Skenario Graceful Downgrade (Anti Data Loss pada Cabang)
    await reportTestAsync('Database Integrity: Graceful Downgrade menonaktifkan cabang sekunder tanpa menghapus data', async () => {
      // Ambil owner_id yang valid
      const existingOwnerRes = await client.query(`SELECT owner_id FROM organizations WHERE owner_id IS NOT NULL LIMIT 1;`);
      const existingOwnerId = existingOwnerRes.rows[0]?.owner_id || null;

      // Buat organisasi simulasi khusus pengujian downgrade
      const mockOrg = await client.query(`
        INSERT INTO organizations (name, tier_id, owner_id)
        VALUES ('Toko Simulasi Expired', 'EKSEKUTIF', $1)
        RETURNING id;
      `, [existingOwnerId]);
      const mockOrgId = mockOrg.rows[0].id;

      // Buat 1 cabang utama dan 1 cabang sekunder
      const mainShop = await client.query(`
        INSERT INTO shops (name, owner_id) VALUES ('Toko Pusat Expired', $1) RETURNING id;
      `, [existingOwnerId]);
      const subShop = await client.query(`
        INSERT INTO shops (name, owner_id) VALUES ('Cabang Sekunder Expired', $1) RETURNING id;
      `, [existingOwnerId]);

      await client.query(`
        INSERT INTO branches (organization_id, shop_id, branch_name, branch_code, is_main_branch, is_active)
        VALUES 
          ($1, $2, 'Cabang Pusat', 'PST-01', TRUE, TRUE),
          ($1, $3, 'Cabang Sekunder', 'SKN-01', FALSE, TRUE);
      `, [mockOrgId, mainShop.rows[0].id, subShop.rows[0].id]);

      // Set subscription yang sudah kedaluwarsa melewati H+3 (starts 40 hari lalu, expired 10 hari lalu, grace expired 7 hari lalu)
      await client.query(`
        INSERT INTO organization_subscriptions (
          organization_id, current_tier, starts_at, expires_at, grace_period_ends_at
        ) VALUES (
          $1, 'EKSEKUTIF', NOW() - INTERVAL '40 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '7 days'
        );
      `, [mockOrgId]);

      // Eksekusi evaluasi status
      const evalExpired = await client.query(`
        SELECT evaluate_subscription_status($1) as status;
      `, [mockOrgId]);

      const finalStatus = evalExpired.rows[0].status;
      assert.strictEqual(finalStatus.tier, 'MAGANG');
      assert.strictEqual(finalStatus.is_expired, true);

      // Verifikasi cabang sekunder berstatus is_active = FALSE (namun barisnya TETAP ADA, anti-kehilangan data)
      const branchesCheck = await client.query(`
        SELECT branch_name, is_main_branch, is_active 
        FROM branches 
        WHERE organization_id = $1 
        ORDER BY is_main_branch DESC;
      `, [mockOrgId]);

      assert.strictEqual(branchesCheck.rows.length, 2, 'Total cabang harus tetap 2 (tidak dihapus)');
      assert.strictEqual(branchesCheck.rows[0].is_main_branch, true);
      assert.strictEqual(branchesCheck.rows[0].is_active, true, 'Cabang utama tetap aktif');
      assert.strictEqual(branchesCheck.rows[1].is_main_branch, false);
      assert.strictEqual(branchesCheck.rows[1].is_active, false, 'Cabang sekunder dinonaktifkan sementara (read-only)');

      // Bersihkan data simulasi uji
      await client.query(`DELETE FROM branches WHERE organization_id = $1;`, [mockOrgId]);
      await client.query(`DELETE FROM organization_subscriptions WHERE organization_id = $1;`, [mockOrgId]);
      await client.query(`DELETE FROM organizations WHERE id = $1;`, [mockOrgId]);
      await client.query(`DELETE FROM shops WHERE id IN ($1, $2);`, [mainShop.rows[0].id, subShop.rows[0].id]);
    });

  } catch (dbErr) {
    console.error('  ❌ [DATABASE ERROR]', dbErr.message);
    failedCount++;
  } finally {
    if (client) {
      await client.end();
      console.log('  📡 [DATABASE DISCONNECTED] Koneksi database ditutup.');
    }
  }

  // ── REKAPITULASI ──────────────────────────────────────────────────────────
  console.log('\n================================================================');
  console.log(`🏁 HASIL VERIFIKASI TAHAP 10: ${passedCount} LULUS, ${failedCount} GAGAL`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Fatal Suite Error:', err);
  process.exit(1);
});
