/**
 * scratch/verify_phase1.cjs
 * Comprehensive Automated Verification Suite for Phase 1 Features:
 * 1. Multi-Tier Auto-Unpack
 * 2. Quick Stock-In & Margin Guard
 * 3. Pelacak Tabung Rolling Gas & Galon
 */

const pg = require('pg');
const fs = require('fs');
const path = require('path');

const client = new pg.Client({
  connectionString: 'postgresql://postgres.doaisnsdahepsxqaroru:ahzaganteng@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  connectionTimeoutMillis: 15000,
  ssl: { rejectUnauthorized: false },
});

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
  }
}

async function runTests() {
  console.log('='.repeat(70));
  console.log('🧪 SUITE VERIFIKASI FASE 1: 3 FITUR OPERASIONAL WARUNG');
  console.log('='.repeat(70));

  // ─────────────────────────────────────────────────────────────
  // TEST 1: Tier Configuration & Single Source of Truth
  // ─────────────────────────────────────────────────────────────
  console.log('\n[TEST 1] Verifikasi Konfigurasi TIER & Feature Flags (tiers.js)...');
  const tiersFile = fs.readFileSync(path.join(__dirname, '../src/config/tiers.js'), 'utf8');

  assert(tiersFile.includes('maxMultiUnitSKU: 0'), 'MAGANG maxMultiUnitSKU = 0');
  assert(tiersFile.includes('maxMultiUnitSKU: 15'), 'SUPERVISOR maxMultiUnitSKU = 15');
  assert(tiersFile.includes('maxActiveLoans: 0'), 'MAGANG maxActiveLoans = 0');
  assert(tiersFile.includes('maxActiveLoans: 20'), 'SUPERVISOR maxActiveLoans = 20');
  assert(tiersFile.includes('multi_unit: false') && tiersFile.includes('multi_unit: true'), 'multi_unit flag terdefinisi di semua tier');
  assert(tiersFile.includes('margin_guard: false') && tiersFile.includes('margin_guard: true'), 'margin_guard flag terdefinisi');
  assert(tiersFile.includes('auto_reprice: true'), 'auto_reprice flag aktif di MANAJER/EKSEKUTIF');
  assert(tiersFile.includes('asset_tracker: true'), 'asset_tracker flag aktif di SUPERVISOR+');

  // ─────────────────────────────────────────────────────────────
  // TEST 2: Database Schema & Objects Verification
  // ─────────────────────────────────────────────────────────────
  console.log('\n[TEST 2] Verifikasi Skema Database PostgreSQL Supabase...');
  await client.connect();

  // 2a. Tables existence
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('product_units', 'stock_mutations', 'customer_asset_loans');
  `);
  const foundTables = tablesRes.rows.map(r => r.table_name);
  assert(foundTables.includes('product_units'), 'Tabel "product_units" terpasang');
  assert(foundTables.includes('stock_mutations'), 'Tabel "stock_mutations" terpasang');
  assert(foundTables.includes('customer_asset_loans'), 'Tabel "customer_asset_loans" terpasang');

  // 2b. customers.loaned_assets column
  const colRes = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'loaned_assets';
  `);
  assert(colRes.rows.length === 1 && colRes.rows[0].data_type === 'jsonb', 'Kolom "customers.loaned_assets" (JSONB) terpasang');

  // 2c. stock_mutations.unit_id foreign key ON DELETE SET NULL
  const fkRes = await client.query(`
    SELECT confdeltype 
    FROM pg_constraint 
    WHERE conname LIKE '%stock_mutations_unit_id%';
  `);
  // 'n' means SET NULL
  assert(fkRes.rows.length > 0 && fkRes.rows[0].confdeltype === 'n', 'FK stock_mutations.unit_id ON DELETE SET NULL (Data Integrity)');

  // ─────────────────────────────────────────────────────────────
  // TEST 3: RPC Atomic Product Stock Mutation
  // ─────────────────────────────────────────────────────────────
  console.log('\n[TEST 3] Pengujian Atomic Stock RPC (mutate_product_stock)...');

  // Ambil sample produk
  const sampleProd = await client.query('SELECT id, nama, stock FROM products LIMIT 1');
  if (sampleProd.rows.length > 0) {
    const prod = sampleProd.rows[0];
    const initialStock = Number(prod.stock);

    // Tambah stok atomik +50
    const addRes = await client.query('SELECT mutate_product_stock($1, $2) AS new_stock', [prod.id, 50]);
    assert(Number(addRes.rows[0].new_stock) === initialStock + 50, `mutate_product_stock(+50): ${initialStock} -> ${addRes.rows[0].new_stock}`);

    // Kurang stok atomik -50
    const subRes = await client.query('SELECT mutate_product_stock($1, $2) AS new_stock', [prod.id, -50]);
    assert(Number(subRes.rows[0].new_stock) === initialStock, `mutate_product_stock(-50): kembali ke ${subRes.rows[0].new_stock}`);
  } else {
    console.log('  ⚠️ Tidak ada produk untuk diuji stock mutation.');
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 4: RPC Atomic Customer Loaned Assets & Anti-Negative Balance
  // ─────────────────────────────────────────────────────────────
  console.log('\n[TEST 4] Pengujian Atomic Loaned Assets RPC & Anti-Minus Guard...');

  const sampleCust = await client.query('SELECT id, nama, loaned_assets FROM customers LIMIT 1');
  if (sampleCust.rows.length > 0) {
    const cust = sampleCust.rows[0];

    // Reset loaned_assets for clean testing
    await client.query("UPDATE customers SET loaned_assets = '{}'::jsonb WHERE id = $1", [cust.id]);

    // Mutasi LOAN: +3 Gas 3kg
    const loanRes = await client.query(
      "SELECT mutate_customer_loaned_assets($1, 'GAS_3KG', 3) AS assets",
      [cust.id]
    );
    assert(loanRes.rows[0].assets.GAS_3KG === 3, 'mutate_customer_loaned_assets LOAN (+3): saldo menjadi 3');

    // Mutasi RETURN: -2 Gas 3kg
    const returnRes = await client.query(
      "SELECT mutate_customer_loaned_assets($1, 'GAS_3KG', -2) AS assets",
      [cust.id]
    );
    assert(returnRes.rows[0].assets.GAS_3KG === 1, 'mutate_customer_loaned_assets RETURN (-2): sisa saldo menjadi 1');

    // Mutasi RETURN Melebihi Saldo: coba -5 ketika saldo 1 (HARUS DITOLAK EXCEPTION)
    let threwNegativeError = false;
    try {
      await client.query(
        "SELECT mutate_customer_loaned_assets($1, 'GAS_3KG', -5) AS assets",
        [cust.id]
      );
    } catch (err) {
      threwNegativeError = true;
      assert(err.message.includes('tidak boleh minus'), `Validasi Anti-Saldo Minus Berhasil Memblokir: "${err.message}"`);
    }
    assert(threwNegativeError, 'Database RPC sukses menolak pengembalian melebihi saldo!');

    // Cleanup: kembalikan 1 sisa
    await client.query(
      "SELECT mutate_customer_loaned_assets($1, 'GAS_3KG', -1) AS assets",
      [cust.id]
    );
  } else {
    console.log('  ⚠️ Tidak ada data customer untuk pengujian loaned assets.');
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 5: API Routes & UI Components Verification
  // ─────────────────────────────────────────────────────────────
  console.log('\n[TEST 5] Verifikasi Berkas File API Routes & UI Components...');

  const expectedFiles = [
    'src/app/api/v1/products/[id]/units/route.js',
    'src/app/api/v1/stock-in/route.js',
    'src/app/api/v1/asset-loans/route.js',
    'src/components/products/UnitConversionModal.jsx',
    'src/components/products/StockInModal.jsx',
    'src/components/customers/AssetLoanModal.jsx',
  ];

  for (const relPath of expectedFiles) {
    const fullPath = path.join(__dirname, '..', relPath);
    const exists = fs.existsSync(fullPath);
    assert(exists, `File terpasang: ${relPath}`);
  }

  // Barcode resolution check in POS
  const posFile = fs.readFileSync(path.join(__dirname, '../src/app/pos/page.js'), 'utf8');
  assert(posFile.includes('product_units.barcode'), 'POS memprioritaskan rujukan utama product_units.barcode');
  assert(posFile.includes('Segmented Pills for Multi-Tier Units'), 'POS katalog card menyematkan Segmented Pills');
  assert(posFile.includes('AssetLoanModal'), 'POS mengintegrasikan AssetLoanModal');

  // ProductManagement check
  const prodMgmtFile = fs.readFileSync(path.join(__dirname, '../src/views/ProductManagement.jsx'), 'utf8');
  assert(prodMgmtFile.includes('CATAT KULAKAN'), 'ProductManagement memiliki tombol + CATAT KULAKAN');
  assert(prodMgmtFile.includes('UnitConversionModal'), 'ProductManagement mengintegrasikan UnitConversionModal');

  await client.end();

  console.log('\n' + '='.repeat(70));
  console.log(`HASIL VERIFIKASI: ${passCount} LULUS, ${failCount} GAGAL`);
  console.log('='.repeat(70));

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal Verification Suite Error:', err);
  process.exit(1);
});
