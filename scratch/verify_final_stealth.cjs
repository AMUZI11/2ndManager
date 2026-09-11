// scratch/verify_final_stealth.cjs
// Automated verification for Stealth Telemetry & Double-Blind Cashier Handover (Estafet)

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.doaisnsdahepsxqaroru:ahzaganteng@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
});

async function main() {
  console.log('================================================================');
  console.log('🔬 VERIFIKASI RESMI: SISTEM TELEMETRI SILUMAN & SERAH TERIMA ESTAFET');
  console.log('================================================================\n');

  const client = await pool.connect();
  let testsPassed = 0;
  let testsTotal = 0;

  try {
    const recordResult = (name, passed, detail = '') => {
      testsTotal++;
      if (passed) {
        testsPassed++;
        console.log(`✅ [PASS] ${name}`);
      } else {
        console.log(`❌ [FAIL] ${name}`);
      }
      if (detail) console.log(`   └─ ${detail}`);
    };

    // 0. Setup test users and shop
    const shopRes = await client.query('SELECT id, owner_id FROM shops LIMIT 1');
    if (shopRes.rows.length === 0) throw new Error('No shop found');
    const shopId = shopRes.rows[0].id;

    const userRes = await client.query('SELECT id, role, username FROM profiles WHERE shop_id = $1 LIMIT 3', [shopId]);
    const bossUser = userRes.rows.find(u => u.role === 'BOSS') || userRes.rows[0];
    const cashierA = userRes.rows.find(u => u.id !== bossUser.id) || bossUser;
    const cashierB = userRes.rows.find(u => u.id !== bossUser.id && u.id !== cashierA.id) || cashierA;

    console.log(`ℹ️ Test Context: Shop ID: ${shopId}, Boss: ${bossUser.username}, Kasir A: ${cashierA.username}, Kasir B: ${cashierB.username}\n`);

    // Clean up previous test artifacts
    await client.query("DELETE FROM cashier_shifts WHERE register_id LIKE 'REG_TEST_%'");
    await client.query("DELETE FROM security_anomaly_events WHERE metadata->>'register_id' LIKE 'REG_TEST_%'");

    // ── TEST 1: Database Columns & Functions Integrity ──
    console.log('--- Test 1: Verifikasi Schema Kolom & RPC Functions ---');
    const colCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'cashier_shifts' 
      AND column_name IN ('register_id', 'cash_drop_amount', 'leftover_cash', 'previous_shift_id', 'handover_difference', 'handover_status', 'handover_gap_minutes')
    `);
    const foundCols = colCheck.rows.map(r => r.column_name);
    const expectedCols = ['register_id', 'cash_drop_amount', 'leftover_cash', 'previous_shift_id', 'handover_difference', 'handover_status', 'handover_gap_minutes'];
    const allColsPresent = expectedCols.every(c => foundCols.includes(c));
    recordResult('Semua 7 kolom estafet & skim terpasang di cashier_shifts', allColsPresent, `Ditemukan: ${foundCols.join(', ')}`);

    const fnCheck = await client.query(`
      SELECT proname, prosecdef 
      FROM pg_proc 
      WHERE proname IN ('close_cashier_shift_with_skim', 'start_shift_with_estafet_audit')
    `);
    const allFnsSecDef = fnCheck.rows.length === 2 && fnCheck.rows.every(r => r.prosecdef === true);
    recordResult('RPC Functions terpasang dengan atribut SECURITY DEFINER', allFnsSecDef, `Functions: ${fnCheck.rows.map(r => `${r.proname}(secdef=${r.prosecdef})`).join(', ')}`);

    // ── TEST 2: RLS Protection pada security_anomaly_events ──
    console.log('\n--- Test 2: Verifikasi Kebijakan RLS security_anomaly_events ---');
    const rlsCheck = await client.query(`
      SELECT relname, relrowsecurity 
      FROM pg_class 
      WHERE relname = 'security_anomaly_events'
    `);
    const rlsActive = rlsCheck.rows[0]?.relrowsecurity === true;
    recordResult('RLS aktif pada tabel security_anomaly_events', rlsActive);

    const polCheck = await client.query(`
      SELECT polname, polcmd, polroles::regrole[] as roles
      FROM pg_policy
      WHERE polrelid = 'security_anomaly_events'::regclass
    `);
    const policyNames = polCheck.rows.map(r => r.polname);
    recordResult('Kebijakan RLS Boss/Admin & System terkonfigurasi', policyNames.length >= 2, `Policies: ${policyNames.join(', ')}`);

    // ── TEST 3: Estafet Shift Serah Terima MATCH (Selisih = 0) ──
    console.log('\n--- Test 3: Skenario Estafet MATCH (Kasir A -> Kasir B Sempurna) ---');
    const regMatch = 'REG_TEST_MATCH';

    // 1. Kasir A buka shift
    const startA = await client.query(`
      SELECT start_shift_with_estafet_audit($1, $2, $3, $4, $5) as res
    `, [shopId, cashierA.id, regMatch, 500000, JSON.stringify({})]);
    const shiftAId = startA.rows[0].res.shift_id;

    // 2. Kasir A tutup shift: Kas fisik = 2.500.000, Setoran bos = 2.000.000 -> Sisa ditinggal = 500.000
    const closeA = await client.query(`
      SELECT close_cashier_shift_with_skim($1, $2, $3, $4, $5, $6) as res
    `, [shiftAId, shopId, 2500000, 2000000, JSON.stringify({}), 'Kasir A Tutup']);
    const shiftACloseData = closeA.rows[0].res;

    const leftoverMatch = Number(shiftACloseData.leftover_cash) === 500000;
    recordResult('Kasir A closing: uang ditinggal di laci = Rp 500.000', leftoverMatch, `leftover_cash: ${shiftACloseData.leftover_cash}`);

    // 3. Kasir B buka shift estafet: hitung fisik blind = 500.000 (MATCH)
    const startB = await client.query(`
      SELECT start_shift_with_estafet_audit($1, $2, $3, $4, $5) as res
    `, [shopId, cashierB.id, regMatch, 500000, JSON.stringify({})]);
    const shiftBRes = startB.rows[0].res;

    // Zero discrepancy leakage verification: handover_difference MUST NOT be in start shift response
    const zeroLeakage = shiftBRes.handover_difference === undefined;
    recordResult('Zero leakage ke Kasir B (angka selisih tidak dikirim ke kasir)', zeroLeakage);

    // Verify row in cashier_shifts
    const shiftBRow = await client.query('SELECT * FROM cashier_shifts WHERE id = $1', [shiftBRes.shift_id]);
    const isMatch = shiftBRow.rows[0].handover_status === 'MATCH' && Number(shiftBRow.rows[0].handover_difference) === 0;
    recordResult('Kasir B estafet status = MATCH, handover_difference = 0', isMatch, `Status: ${shiftBRow.rows[0].handover_status}, Diff: ${shiftBRow.rows[0].handover_difference}`);

    const hemMatchCheck = await client.query(`
      SELECT * FROM security_anomaly_events 
      WHERE metadata->>'register_id' = $1 AND event_type = 'HEM'
    `, [regMatch]);
    recordResult('Nol anomali HEM untuk serah terima yang cocok (MATCH)', hemMatchCheck.rows.length === 0);

    // ── TEST 4: Estafet Shift Serah Terima DISCREPANCY / HEM (Kasir B Kurang Rp 50.000) ──
    console.log('\n--- Test 4: Skenario Estafet DISCREPANCY / HEM (Kasir B Selisih Rp 50.000) ---');
    const regMismatch = 'REG_TEST_MISMATCH';

    // 1. Kasir A buka & tutup
    const startA2 = await client.query(`
      SELECT start_shift_with_estafet_audit($1, $2, $3, $4, $5) as res
    `, [shopId, cashierA.id, regMismatch, 500000, JSON.stringify({})]);
    const shiftA2Id = startA2.rows[0].res.shift_id;

    await client.query(`
      SELECT close_cashier_shift_with_skim($1, $2, $3, $4, $5, $6) as res
    `, [shiftA2Id, shopId, 3000000, 2400000, JSON.stringify({}), 'Kasir A Tutup']); // leftover = 600.000

    // 2. Kasir B datang buka shift: hitung fisik blind = 550.000 (Kurang Rp 50.000!)
    const startB2 = await client.query(`
      SELECT start_shift_with_estafet_audit($1, $2, $3, $4, $5) as res
    `, [shopId, cashierB.id, regMismatch, 550000, JSON.stringify({})]);
    const shiftB2Res = startB2.rows[0].res;

    // Verify row in cashier_shifts
    const shiftB2Row = await client.query('SELECT * FROM cashier_shifts WHERE id = $1', [shiftB2Res.shift_id]);
    const isMismatch = shiftB2Row.rows[0].handover_status === 'DISCREPANCY' && Number(shiftB2Row.rows[0].handover_difference) === -50000;
    recordResult('Kasir B estafet terdeteksi DISCREPANCY dengan selisih -Rp 50.000', isMismatch, `Diff: ${shiftB2Row.rows[0].handover_difference}, Status: ${shiftB2Row.rows[0].handover_status}`);

    // 3. Periksa anomali HEM tercatat di security_anomaly_events
    const hemAnomaly = await client.query(`
      SELECT * FROM security_anomaly_events 
      WHERE metadata->>'register_id' = $1 AND event_type = 'HEM'
    `, [regMismatch]);
    const hemLogged = hemAnomaly.rows.length === 1 && hemAnomaly.rows[0].severity === 'CRITICAL';
    recordResult('Log Anomali HEM (CRITICAL) otomatis dicatat di security_anomaly_events', hemLogged, `Event: ${hemAnomaly.rows[0]?.event_type}, Severity: ${hemAnomaly.rows[0]?.severity}, Meta: ${JSON.stringify(hemAnomaly.rows[0]?.metadata)}`);

    // ── TEST 5: Multi-Terminal Register Isolation ──
    console.log('\n--- Test 5: Isolasi Register Multi-Terminal (REG_TEST_01 vs REG_TEST_02) ---');
    const reg01 = 'REG_TEST_01';
    const reg02 = 'REG_TEST_02';

    // Start & close on REG_01
    const sReg1 = await client.query(`
      SELECT start_shift_with_estafet_audit($1, $2, $3, $4, $5) as res
    `, [shopId, cashierA.id, reg01, 200000, JSON.stringify({})]);
    await client.query(`
      SELECT close_cashier_shift_with_skim($1, $2, $3, $4, $5, $6) as res
    `, [sReg1.rows[0].res.shift_id, shopId, 1000000, 700000, JSON.stringify({}), 'Close Reg 1']); // leftover = 300.000

    // Start on REG_02 (Harus STANDALONE karena belum ada shift sebelumnya di REG_02)
    const sReg2 = await client.query(`
      SELECT start_shift_with_estafet_audit($1, $2, $3, $4, $5) as res
    `, [shopId, cashierB.id, reg02, 150000, JSON.stringify({})]);
    
    const sReg2Row = await client.query('SELECT * FROM cashier_shifts WHERE id = $1', [sReg2.rows[0].res.shift_id]);
    const isIsolated = sReg2Row.rows[0].previous_shift_id === null && sReg2Row.rows[0].handover_status === 'STANDALONE';
    recordResult('Register 2 terisolasi dari Register 1 (Status: STANDALONE)', isIsolated, `Status: ${sReg2Row.rows[0].handover_status}, PrevShift: ${sReg2Row.rows[0].previous_shift_id}`);

    // ── TEST 6: Kadaluarsa Gap Estafet > 12 Jam (720 Menit) ──
    console.log('\n--- Test 6: Verifikasi Kadaluarsa Gap Estafet (>12 Jam) ---');
    const regExpired = 'REG_TEST_EXP';

    // Buat shift lalu close dengan timestamp 13 jam yang lalu
    const sExp = await client.query(`
      INSERT INTO cashier_shifts (shop_id, cashier_id, shift_number, start_time, starting_cash, status, register_id)
      VALUES ($1, $2, 999, NOW() - INTERVAL '14 HOURS', 300000, 'OPEN', $3)
      RETURNING id
    `, [shopId, cashierA.id, regExpired]);
    const expShiftId = sExp.rows[0].id;

    await client.query(`
      UPDATE cashier_shifts
      SET end_time = NOW() - INTERVAL '13 HOURS',
          actual_cash = 1000000,
          cash_drop_amount = 700000,
          leftover_cash = 300000,
          status = 'CLOSED'
      WHERE id = $1
    `, [expShiftId]);

    // Buka shift baru sekarang di REG_TEST_EXP: karena gap > 720 menit, harus diabaikan (STANDALONE)
    const sNewAfterGap = await client.query(`
      SELECT start_shift_with_estafet_audit($1, $2, $3, $4, $5) as res
    `, [shopId, cashierB.id, regExpired, 500000, JSON.stringify({})]);

    const sNewAfterGapRow = await client.query('SELECT * FROM cashier_shifts WHERE id = $1', [sNewAfterGap.rows[0].res.shift_id]);
    const isGapExpired = sNewAfterGapRow.rows[0].handover_status === 'STANDALONE';
    recordResult('Shift setelah gap > 12 jam otomatis dilabeli STANDALONE (tidak menghukum kasir baru)', isGapExpired, `Status: ${sNewAfterGapRow.rows[0].handover_status}, Gap: ${sNewAfterGapRow.rows[0].handover_gap_minutes}`);

    // ── CLEANUP TEST DATA ──
    await client.query("DELETE FROM cashier_shifts WHERE register_id LIKE 'REG_TEST_%'");
    await client.query("DELETE FROM security_anomaly_events WHERE metadata->>'register_id' LIKE 'REG_TEST_%'");

    console.log('\n================================================================');
    console.log(`🎯 RINGKASAN HASIL: ${testsPassed} DARI ${testsTotal} PENGUJIAN BERHASIL.`);
    console.log('================================================================\n');

    if (testsPassed === testsTotal) {
      process.exit(0);
    } else {
      process.exit(1);
    }

  } catch (err) {
    console.error('❌ Error executing verification script:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
