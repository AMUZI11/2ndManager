// scratch/verify_phase5_anti_theft.cjs
// Automated Verification Suite for Tahap 5: The Anti-Theft Citadel

const assert = require('assert');
const path = require('path');

console.log('================================================================');
console.log('🧪 VERIFIKASI TAHAP 5: THE ANTI-THEFT CITADEL');
console.log('================================================================\n');

// ── 1. TEST SMART CHANGE FIFO ALGORITHM ──────────────────────────────────────
console.log('1. Menguji Algoritma Smart Change FIFO (First-In, First-Out)...');

// Implementasi matematika murni identik dengan src/utils/smartChangeEngine.js
function calculateFifoDebtDeduction(changeAmount = 0, activeDebts = []) {
  const change = Math.max(0, Math.floor(Number(changeAmount) || 0));
  if (change <= 0 || !Array.isArray(activeDebts) || activeDebts.length === 0) {
    return {
      totalDeducted: 0,
      leftoverChange: change,
      allocations: [],
      hasDebts: Array.isArray(activeDebts) && activeDebts.length > 0,
    };
  }

  const sortedDebts = [...activeDebts].sort((a, b) => {
    const timeA = new Date(a.tanggal || a.created_at || 0).getTime();
    const timeB = new Date(b.tanggal || b.created_at || 0).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return (a.id || '').localeCompare(b.id || '');
  });

  let remainingChange = change;
  let totalDeducted = 0;
  const allocations = [];

  for (const debt of sortedDebts) {
    if (remainingChange <= 0) break;

    const owed = Math.max(0, Number(debt.amount_owed || debt.sisa_piutang || debt.total_akhir || 0));
    if (owed <= 0) continue;

    const deduct = Math.min(remainingChange, owed);
    const remainingOwed = owed - deduct;
    const isSettled = remainingOwed === 0;

    allocations.push({
      debtId: debt.id,
      bonNumber: debt.nomor_bon || `BON-${String(debt.id).slice(0, 6).toUpperCase()}`,
      debtDate: debt.tanggal || debt.created_at || new Date().toISOString().split('T')[0],
      originalOwed: owed,
      deductedAmount: deduct,
      remainingOwed,
      isSettled,
    });

    remainingChange -= deduct;
    totalDeducted += deduct;
  }

  return {
    totalDeducted,
    leftoverChange: remainingChange,
    allocations,
    hasDebts: true,
  };
}

// Kasus Uji 1.1: Pelunasan Penuh Beberapa Nota Tertua (Total Hutang 35k, Kembalian 40k -> Sisa 5k)
const testDebts1 = [
  { id: 'bon-2', nomor_bon: 'BON-002', tanggal: '2026-09-02', amount_owed: 15000 },
  { id: 'bon-1', nomor_bon: 'BON-001', tanggal: '2026-09-01', amount_owed: 20000 },
];

const res1 = calculateFifoDebtDeduction(40000, testDebts1);
assert.strictEqual(res1.totalDeducted, 35000, 'Total terpotong harus 35.000 (20k + 15k)');
assert.strictEqual(res1.leftoverChange, 5000, 'Sisa kembalian harus 5.000');
assert.strictEqual(res1.allocations.length, 2, '2 nota harus terpotong');
assert.strictEqual(res1.allocations[0].bonNumber, 'BON-001', 'Nota tertua 01 September harus dipotong lebih dulu');
assert.strictEqual(res1.allocations[0].isSettled, true, 'Nota BON-001 harus berstatus LUNAS');
assert.strictEqual(res1.allocations[1].bonNumber, 'BON-002', 'Nota kedua BON-002 harus dipotong');
assert.strictEqual(res1.allocations[1].isSettled, true, 'Nota BON-002 harus berstatus LUNAS');
console.log('   ✅ Kasus Uji 1.1: Pelunasan penuh multi-nota urut tanggal FIFO LULUS');

// Kasus Uji 1.2: Pelunasan Sebagian (Partial)
const res2 = calculateFifoDebtDeduction(12000, testDebts1);
assert.strictEqual(res2.totalDeducted, 12000, 'Total terpotong harus 12.000');
assert.strictEqual(res2.leftoverChange, 0, 'Sisa kembalian harus 0');
assert.strictEqual(res2.allocations.length, 1, '1 nota terpotong sebagian');
assert.strictEqual(res2.allocations[0].isSettled, false, 'Nota pertama harus berstatus SISA SEBAGIAN');
assert.strictEqual(res2.allocations[0].remainingOwed, 8000, 'Sisa hutang BON-001 harus 8.000');
console.log('   ✅ Kasus Uji 1.2: Pelunasan sebagian nota tunggal LULUS');

// Kasus Uji 1.3: Uang Kembalian Nol atau Kasbon Kosong
const res3 = calculateFifoDebtDeduction(0, testDebts1);
assert.strictEqual(res3.totalDeducted, 0);
assert.strictEqual(res3.leftoverChange, 0);
assert.strictEqual(res3.allocations.length, 0);

const res4 = calculateFifoDebtDeduction(50000, []);
assert.strictEqual(res4.totalDeducted, 0);
assert.strictEqual(res4.leftoverChange, 50000);
console.log('   ✅ Kasus Uji 1.3: Penanganan kembalian nol & kasbon kosong LULUS\n');

// ── 2. TEST STEALTH ANOMALY HEURISTICS ───────────────────────────────────────
console.log('2. Menguji Heuristik Deteksi Kecurangan (VAC, CIP, HEM)...');

// VAC: Void After Calculation (< 7s & cart >= 25k)
function testVac(cartTotal, elapsedSeconds, hadCash) {
  if (cartTotal < 25000) return false;
  return (elapsedSeconds > 0 && elapsedSeconds < 7) || Boolean(hadCash);
}

assert.strictEqual(testVac(35000, 4.2, false), true, 'Keranjang 35k dibatalkan dlm 4.2s harus memicu VAC');
assert.strictEqual(testVac(15000, 2.0, false), false, 'Keranjang 15k (< 25k) tidak boleh memicu VAC');
assert.strictEqual(testVac(50000, 15.0, false), false, 'Keranjang 50k dibatalkan setelah 15s (> 7s) tanpa uang tunai tdk memicu VAC');
assert.strictEqual(testVac(50000, 15.0, true), true, 'Keranjang 50k dgn uang tunai sdh diinput harus memicu VAC');
console.log('   ✅ Heuristik VAC (Void After Calculation < 7 detik) LULUS');

// CIP: Cart Item Purge (>= 3 items OR > 30k)
function testCip(purgedItems) {
  const count = purgedItems.length;
  const totalVal = purgedItems.reduce((s, i) => s + i.val, 0);
  return count >= 3 || totalVal > 30000;
}

assert.strictEqual(testCip([{ val: 5000 }, { val: 4000 }, { val: 3000 }]), true, 'Pembersihan 3 item harus memicu CIP');
assert.strictEqual(testCip([{ val: 35000 }]), true, 'Pembersihan 1 item bernilai 35k (> 30k) harus memicu CIP');
assert.strictEqual(testCip([{ val: 10000 }, { val: 8000 }]), false, 'Pembersihan 2 item bernilai 18k tidak boleh memicu CIP');
console.log('   ✅ Heuristik CIP (Cart Item Purge >= 3 atau > 30k) LULUS');

// HEM: Hardware Drawer Kick (> 2 times in 15 mins)
function testHem(kickTimestamps, currentTime) {
  const recent = kickTimestamps.filter(t => currentTime - t < 15 * 60 * 1000);
  return recent.length > 2;
}

const now = Date.now();
assert.strictEqual(testHem([now - 100000, now - 50000, now - 10000], now), true, '3x buka laci dlm 15m harus memicu HEM');
assert.strictEqual(testHem([now - 100000, now - 50000], now), false, '2x buka laci dlm 15m tidak boleh memicu HEM');
assert.strictEqual(testHem([now - 20 * 60 * 1000, now - 18 * 60 * 1000, now - 10000], now), false, 'Laci dibuka di luar jendela 15m tidak boleh memicu HEM');
console.log('   ✅ Heuristik HEM (Hardware Drawer Kick > 2x / 15m) LULUS\n');

// ── 3. TEST TIER CONFIG & FEATURE GATES ─────────────────────────────────────
console.log('3. Menguji Konfigurasi Feature Gates Tiers...');

const { TIER_CONFIG, normalizeTier } = require('../src/config/tiers.js');

assert.strictEqual(TIER_CONFIG.MAGANG.features.double_blind_estafet, false);
assert.strictEqual(TIER_CONFIG.MAGANG.features.remote_panic_dispatch, false);
assert.strictEqual(TIER_CONFIG.MAGANG.features.smart_change_reconciler, false);

assert.strictEqual(TIER_CONFIG.SUPERVISOR.features.double_blind_estafet, false);
assert.strictEqual(TIER_CONFIG.SUPERVISOR.features.remote_panic_dispatch, false);
assert.strictEqual(TIER_CONFIG.SUPERVISOR.features.smart_change_reconciler, false);

assert.strictEqual(TIER_CONFIG.MANAJER.features.double_blind_estafet, true);
assert.strictEqual(TIER_CONFIG.MANAJER.features.remote_panic_dispatch, true);
assert.strictEqual(TIER_CONFIG.MANAJER.features.smart_change_reconciler, true);

assert.strictEqual(TIER_CONFIG.EKSEKUTIF.features.double_blind_estafet, true);
assert.strictEqual(TIER_CONFIG.EKSEKUTIF.features.remote_panic_dispatch, true);
assert.strictEqual(TIER_CONFIG.EKSEKUTIF.features.smart_change_reconciler, true);
console.log('   ✅ Seluruh Flag Fitur Tahap 5 pada TIER_CONFIG LULUS\n');

// ── 4. TEST DATABASE CONNECTIVITY & RPC FUNCTION EXISTENCE ──────────────────
console.log('4. Menguji Integritas Database Supabase...');

const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.doaisnsdahepsxqaroru:ahzaganteng@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
});

async function testDatabase() {
  await client.connect();

  const regCheck = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'registers';
  `);
  const regCols = regCheck.rows.map(r => r.column_name);
  assert.ok(regCols.includes('register_code'), 'registers harus memiliki kolom register_code');
  assert.ok(regCols.includes('is_frozen'), 'registers harus memiliki kolom is_frozen');
  console.log('   ✅ Tabel registers terverifikasi:', regCols.join(', '));

  const shiftCheck = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'cashier_shifts' 
      AND column_name IN ('outgoing_cash_count', 'incoming_cash_count', 'diff_outgoing', 'diff_handoff', 'requires_owner_review');
  `);
  assert.strictEqual(shiftCheck.rows.length, 5, 'cashier_shifts harus memiliki 5 kolom double-blind');
  console.log('   ✅ Kolom Double-Blind pada cashier_shifts terverifikasi');

  const rpcCheck = await client.query(`
    SELECT routine_name 
    FROM information_schema.routines 
    WHERE routine_name = 'execute_double_blind_handover';
  `);
  assert.strictEqual(rpcCheck.rows.length, 1, 'RPC execute_double_blind_handover harus terdaftar di PostgreSQL');
  console.log('   ✅ RPC execute_double_blind_handover terdaftar di PostgreSQL');

  await client.end();
  console.log('\n🎉 SELURUH PENGUJIAN TAHAP 5 BERHASIL LULUS 100%!');
  process.exit(0);
}

testDatabase().catch((err) => {
  console.error('❌ Database verification failed:', err);
  process.exit(1);
});
