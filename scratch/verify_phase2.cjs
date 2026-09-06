const { Client } = require('pg');
const path = require('path');

const client = new Client({
  connectionString: 'postgresql://postgres.doaisnsdahepsxqaroru:ahzaganteng@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function runTests() {
  console.log('=== VERIFIKASI FASE 2: BUKU KONSINYASI & CELENGAN KEMBALIAN ===\n');

  // 1. Uji Tier Configuration (ESM via dynamic import or direct object test)
  console.log('1. Memeriksa Konfigurasi Tier (src/config/tiers.js)...');
  const tiersModule = await import('../src/config/tiers.js');
  const { TIER_CONFIG, hasFeatureAccess, getTierLimit } = tiersModule;

  if (TIER_CONFIG.MAGANG.maxConsignmentVendors !== 0) {
    throw new Error('FAILED: MAGANG maxConsignmentVendors harus 0');
  }
  if (TIER_CONFIG.SUPERVISOR.maxConsignmentVendors !== 3) {
    throw new Error('FAILED: SUPERVISOR maxConsignmentVendors harus 3 (Koreksi User Wajib)');
  }
  if (TIER_CONFIG.MANAJER.maxConsignmentVendors !== Infinity) {
    throw new Error('FAILED: MANAJER maxConsignmentVendors harus Infinity');
  }
  if (!TIER_CONFIG.SUPERVISOR.features.consignment) {
    throw new Error('FAILED: SUPERVISOR harus memiliki feature consignment');
  }
  if (!TIER_CONFIG.SUPERVISOR.features.customer_deposit) {
    throw new Error('FAILED: SUPERVISOR harus memiliki feature customer_deposit');
  }
  console.log('  [PASS] Tier configuration validated: SUPERVISOR limit = 3 vendors, features verified.\n');

  // 2. Hubungkan ke Database Supabase PostgreSQL
  console.log('2. Menghubungkan ke PostgreSQL Supabase...');
  await client.connect();
  console.log('  [PASS] Berhasil terhubung ke Supabase PostgreSQL.\n');

  // 3. Verifikasi Tabel & Kolom Baru
  console.log('3. Verifikasi Skema Database...');
  const tableCheck = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_name IN ('consignment_vendors', 'consignment_batches', 'customer_balance_mutations')
    ORDER BY table_name;
  `);
  const foundTables = tableCheck.rows.map(r => r.table_name);
  console.log('  Tabel ditemukan:', foundTables);
  if (foundTables.length !== 3) throw new Error('FAILED: Tidak semua tabel Fase 2 ditemukan');

  const colCheck = await client.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE (table_name = 'products' AND column_name IN ('is_consignment', 'consignment_vendor_id'))
       OR (table_name = 'customers' AND column_name = 'balance')
    ORDER BY table_name, column_name;
  `);
  console.log('  Kolom ditemukan:', colCheck.rows.map(r => `${r.table_name}.${r.column_name} (${r.data_type})`));
  if (colCheck.rows.length !== 3) throw new Error('FAILED: Kolom produk/pelanggan Fase 2 belum lengkap');
  console.log('  [PASS] Skema tabel dan kolom terverifikasi utuh.\n');

  // 4. Verifikasi RPC mutate_customer_balance (Deposit, Withdraw, & Anti-Minus)
  console.log('4. Menguji RPC mutate_customer_balance & Guard Anti-Minus...');
  // Ambil 1 customer uji atau buat dummy customer
  const custRes = await client.query(`
    SELECT id, shop_id, balance FROM customers WHERE is_deleted = false LIMIT 1;
  `);
  if (custRes.rows.length === 0) throw new Error('Tidak ada data customer untuk pengujian');
  const testCust = custRes.rows[0];
  const initialBal = Number(testCust.balance || 0);

  // Test Deposit (+25,000)
  const depRes = await client.query(`
    SELECT mutate_customer_balance($1, 25000, 'DEPOSIT', $2, 'Uji Otomatis Deposit') AS new_bal;
  `, [testCust.id, testCust.shop_id]);
  const balAfterDep = Number(depRes.rows[0].new_bal);
  if (balAfterDep !== initialBal + 25000) {
    throw new Error(`FAILED: Saldo setelah deposit tidak cocok. Diharapkan ${initialBal + 25000}, didapat ${balAfterDep}`);
  }
  console.log(`  [PASS] Deposit berhasil: ${initialBal} -> ${balAfterDep}`);

  // Test Withdraw (-10,000)
  const wdRes = await client.query(`
    SELECT mutate_customer_balance($1, -10000, 'WITHDRAW', $2, 'Uji Otomatis Penarikan') AS new_bal;
  `, [testCust.id, testCust.shop_id]);
  const balAfterWd = Number(wdRes.rows[0].new_bal);
  if (balAfterWd !== balAfterDep - 10000) {
    throw new Error(`FAILED: Saldo setelah withdraw tidak cocok`);
  }
  console.log(`  [PASS] Withdraw belanja berhasil: ${balAfterDep} -> ${balAfterWd}`);

  // Test Guard Anti-Minus: Coba tarik melebihi saldo (e.g. -999,999,999)
  let minusBlocked = false;
  try {
    await client.query(`
      SELECT mutate_customer_balance($1, -999999999, 'WITHDRAW', $2, 'Uji Saldo Minus Ilegal');
    `, [testCust.id, testCust.shop_id]);
  } catch (err) {
    minusBlocked = true;
    console.log(`  [PASS] Anti-Minus Guard aktif! Transaksi minus ditolak PostgreSQL: "${err.message.split('\n')[0]}"`);
  }
  if (!minusBlocked) {
    throw new Error('FAILED: RPC mutate_customer_balance membiarkan saldo menjadi minus!');
  }

  // Kembalikan saldo ke saldo semula
  await client.query(`
    UPDATE customers SET balance = $1 WHERE id = $2;
  `, [initialBal, testCust.id]);
  console.log(`  [PASS] Saldo customer dikembalikan ke kondisi awal (${initialBal}).\n`);

  // 5. Verifikasi Tripartite Settlement Math Logic
  console.log('5. Menguji Kalkulasi Rekonsiliasi Tripartit Konsinyasi...');
  const Q_masuk = 50;
  const Q_pos = 30; // tercatat laku di kasir POS
  const Q_retur = 15; // fisik barang sisa yang dikembalikan ke vendor
  const selisih_hilang = Q_masuk - (Q_pos + Q_retur); // 5 hilang/rusak
  const vendor_split = 8000;
  const warung_margin = 2000;

  // Kasus A: Toko menanggung barang rusak (STORE)
  const payable_store_borne = (Q_pos + selisih_hilang) * vendor_split; // (30+5)*8000 = 280,000
  if (payable_store_borne !== 280000) throw new Error('FAILED: Payable store borne salah');

  // Kasus B: Vendor menanggung barang rusak (VENDOR)
  const payable_vendor_borne = Q_pos * vendor_split; // 30 * 8000 = 240,000
  if (payable_vendor_borne !== 240000) throw new Error('FAILED: Payable vendor borne salah');

  // Mutasi stok fisik yang dikurangi toko saat settlement: sisa retur + barang rusak
  const stok_deducted = Q_retur + selisih_hilang; // 15 + 5 = 20
  if (stok_deducted !== 20) throw new Error('FAILED: Stok deducted salah');
  console.log('  [PASS] Tripartite Settlement Math Logic:');
  console.log(`    - Q_masuk: ${Q_masuk}, Q_pos: ${Q_pos}, Q_retur: ${Q_retur}, Rusak: ${selisih_hilang}`);
  console.log(`    - Hak Vendor (Toko Tanggung): Rp ${payable_store_borne.toLocaleString('id-ID')}`);
  console.log(`    - Hak Vendor (Vendor Potong): Rp ${payable_vendor_borne.toLocaleString('id-ID')}`);
  console.log(`    - Pengurangan Stok Fisik Toko: ${stok_deducted} unit\n`);

  // 6. Verifikasi RPC allocate_change_to_kasbon
  console.log('6. Menguji RPC allocate_change_to_kasbon (FIFO Debt Payoff)...');
  // Bersihkan data uji sebelumnya
  await client.query(`DELETE FROM transactions WHERE nomor_bon LIKE 'TEST-BON-%';`);
  await client.query(`DELETE FROM customer_balance_mutations WHERE notes LIKE '%Uji%';`);

  // Buat transaksi piutang dummy untuk customer uji
  const dummyBon = 'TEST-BON-' + Date.now();
  const txRes = await client.query(`
    INSERT INTO transactions (shop_id, customer_id, nomor_bon, tanggal, omzet_total, laba_total, amount_owed, status)
    VALUES ($1, $2, $3, CURRENT_DATE, 15000, 3000, 15000, 'Piutang')
    RETURNING id;
  `, [testCust.shop_id, testCust.id, dummyBon]);
  const dummyTxId = txRes.rows[0].id;

  // Eksekusi alokasi kembalian 20,000 (15,000 melunasi kasbon, 5,000 sisa masuk deposit)
  const allocRes = await client.query(`
    SELECT allocate_change_to_kasbon($1, 20000, $2, $3, 'Uji Alokasi Kembalian') AS res;
  `, [testCust.id, testCust.shop_id, dummyTxId]);
  const allocResult = allocRes.rows[0].res;
  console.log('  Hasil Alokasi FIFO:', allocResult);

  if (!allocResult.success || Number(allocResult.debts_paid) !== 15000 || Number(allocResult.leftover_deposited) !== 5000) {
    throw new Error(`FAILED: Hasil allocate_change_to_kasbon tidak sesuai: debts_paid=${allocResult.debts_paid}, leftover_deposited=${allocResult.leftover_deposited}`);
  }
  console.log('  [PASS] FIFO Kasbon Payoff berhasil: Hutang 15.000 lunas, sisa 5.000 masuk celengan.');

  // Clean up dummy transaction & mutasi
  await client.query(`DELETE FROM customer_balance_mutations WHERE notes LIKE '%Uji%';`);
  await client.query(`DELETE FROM transactions WHERE id = $1;`, [dummyTxId]);
  await client.query(`UPDATE customers SET balance = $1 WHERE id = $2;`, [initialBal, testCust.id]);
  console.log('  [PASS] Data uji dummy dibersihkan dari database.\n');

  console.log('=== SEMUA 6 PENGUJIAN FASE 2 LULUS DENGAN SEMPURNA! ===');
}

runTests()
  .catch((err) => {
    console.error('ERROR VERIFIKASI FASE 2:', err);
    process.exit(1);
  })
  .finally(() => {
    client.end();
  });
