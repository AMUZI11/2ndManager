/**
 * scratch/verify_phase8_tax_kur.cjs
 * Suite Verifikasi Otomatis Tahap 8: PP 55/2022 Tax Engine, SAK EMKM Triple-Statement & KUR Dossier
 */

const assert = require('assert');
const pg = require('pg');
const dns = require('dns');
const crypto = require('crypto');

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
  console.log('🏛️  SUITE PENGUJIAN TAHAP 8: PP 55/2022 TAX ENGINE & SAK EMKM');
  console.log('================================================================\n');

  let client;
  try {
    client = await getPgClient();
    await client.connect();
    console.log('  📡 [DATABASE CONNECTED] Terhubung ke Supabase PostgreSQL.');

    // Ambil organisasi aktif
    const orgRes = await client.query(`SELECT id, name FROM organizations LIMIT 1;`);
    assert(orgRes.rows.length > 0, 'Organisasi harus tersedia di basis data');
    const orgId = orgRes.rows[0].id;

    // ── TEST 1: Sanitasi DPP & Fasilitas Bebas Pajak Rp 500 Juta WPOP ───────────
    await reportTestAsync('PP 55/2022 WPOP: Bebas pajak hingga Rp 500 Juta/tahun takwim', async () => {
      // Set profil WPOP (is_corporate = FALSE)
      await client.query(`
        INSERT INTO organization_tax_profiles (organization_id, tax_year, is_corporate)
        VALUES ($1, 2026, FALSE)
        ON CONFLICT (organization_id, tax_year)
        DO UPDATE SET is_corporate = FALSE;
      `, [orgId]);

      const taxRes = await client.query(`
        SELECT calculate_sanitized_annual_dpp($1, 2026) as result;
      `, [orgId]);

      const res = taxRes.rows[0].result;
      assert.strictEqual(res.success, true);
      assert.strictEqual(Number(res.tax_free_limit), 500000000);
      assert.strictEqual(res.is_corporate, false);
      assert(Array.isArray(res.months) && res.months.length === 12);
    });

    // ── TEST 2: Tarif PPh Final 0,5% Badan Usaha (Tanpa Fasilitas Rp 500 Juta) ──
    await reportTestAsync('PP 55/2022 Badan Usaha (CV/PT): Tarif 0,5% sejak rupiah pertama', async () => {
      // Set profil Badan Usaha (is_corporate = TRUE)
      await client.query(`
        UPDATE organization_tax_profiles 
        SET is_corporate = TRUE 
        WHERE organization_id = $1 AND tax_year = 2026;
      `, [orgId]);

      const corpRes = await client.query(`
        SELECT calculate_sanitized_annual_dpp($1, 2026) as result;
      `, [orgId]);

      const res = corpRes.rows[0].result;
      assert.strictEqual(res.success, true);
      assert.strictEqual(Number(res.tax_free_limit), 0);
      assert.strictEqual(res.is_corporate, true);

      // Kembalikan ke WPOP untuk default
      await client.query(`
        UPDATE organization_tax_profiles 
        SET is_corporate = FALSE 
        WHERE organization_id = $1 AND tax_year = 2026;
      `, [orgId]);
    });

    // ── TEST 3: Neraca SAK EMKM Seimbang Mutlak (Total Aset = Liabilitas + Ekuitas)
    await reportTestAsync('SAK EMKM Neraca: Keseimbangan mutlak (Total Aset = Liabilitas + Ekuitas)', async () => {
      const emkmRes = await client.query(`
        SELECT generate_sak_emkm_statements($1, NULL, 2026, 9) as result;
      `, [orgId]);

      const res = emkmRes.rows[0].result;
      assert.strictEqual(res.success, true);
      const bs = res.balance_sheet;
      assert.strictEqual(bs.is_balanced, true);

      const totalAssets = Number(bs.total_assets);
      const totalLiab = Number(bs.liabilities.total_liabilities);
      const totalEq = Number(bs.equity.total_equity);

      assert.strictEqual(totalAssets, totalLiab + totalEq, 'Total Aset harus persis sama dengan Liabilitas + Ekuitas');
    });

    // ── TEST 4: Laba Rugi Komparatif, Arus Kas & Scoring KUR ───────────────────
    await reportTestAsync('SAK EMKM: Laba Rugi, Arus Kas Langsung & Rasio Kelayakan Bank Terhitung', async () => {
      const emkmRes = await client.query(`
        SELECT generate_sak_emkm_statements($1, NULL, 2026, 9) as result;
      `, [orgId]);

      const res = emkmRes.rows[0].result;
      assert(res.income_statement, 'Laporan Laba Rugi harus terdefinisi');
      assert(res.cash_flow_statement, 'Laporan Arus Kas harus terdefinisi');
      assert(res.bank_readiness, 'Skor kelayakan bank harus terdefinisi');
      assert(['HIJAU', 'KUNING', 'MERAH'].includes(res.bank_readiness.readiness_score));
      assert(Number(res.bank_readiness.recommended_kur_ceiling) >= 25000000);
    });

    // ── TEST 5: Digital Audit Verification Seal (SHA-256 Checksum) ────────────
    await reportTestAsync('Audit Seal: Checksum SHA-256 tersimpan dengan masa kedaluwarsa 90 hari', async () => {
      const samplePayload = {
        organization_id: orgId,
        period: '2026-09',
        score: 'HIJAU',
        kur_ceiling: 100000000,
      };

      const checksum = crypto
        .createHash('sha256')
        .update(JSON.stringify(samplePayload) + Date.now().toString())
        .digest('hex');

      await client.query(`
        INSERT INTO audit_verification_seals (organization_id, document_type, checksum_hash, payload_summary)
        VALUES ($1, 'KUR_DOSSIER', $2, $3);
      `, [orgId, checksum, JSON.stringify(samplePayload)]);

      const sealCheck = await client.query(`
        SELECT checksum_hash, document_type, expires_at 
        FROM audit_verification_seals 
        WHERE checksum_hash = $1;
      `, [checksum]);

      assert.strictEqual(sealCheck.rows.length, 1);
      assert.strictEqual(sealCheck.rows[0].checksum_hash, checksum);
      assert(new Date(sealCheck.rows[0].expires_at) > new Date());

      // Bersihkan seal uji
      await client.query(`DELETE FROM audit_verification_seals WHERE checksum_hash = $1;`, [checksum]);
    });

  } catch (err) {
    console.error('  ❌ [DATABASE ERROR]', err.message);
    failedCount++;
  } finally {
    if (client) {
      await client.end();
      console.log('  📡 [DATABASE DISCONNECTED] Koneksi database ditutup.');
    }
  }

  console.log('\n================================================================');
  console.log(`🏁 HASIL VERIFIKASI TAHAP 8: ${passedCount} LULUS, ${failedCount} GAGAL`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Fatal Suite Error:', err);
  process.exit(1);
});
