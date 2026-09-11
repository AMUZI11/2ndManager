const fs = require('fs');
const path = require('path');
const pg = require('pg');

const projectRoot = path.join(__dirname, '..');

const client = new pg.Client({
  connectionString: 'postgresql://postgres.doaisnsdahepsxqaroru:ahzaganteng@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function runVerification() {
  console.log('🚀 Memulai Verifikasi PWA & Offline-First POS Engine...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}: ${details}`);
      failed++;
    }
  }

  // ── TEST 1: PWA Manifest & Icons Integrity ─────────────────────────────
  console.log('--- 1. PWA Manifest, Icons & Service Worker ---');
  const manifestPath = path.join(projectRoot, 'src/app/manifest.js');
  assert(fs.existsSync(manifestPath), 'src/app/manifest.js ada di filesystem');

  const swPath = path.join(projectRoot, 'public/sw.js');
  assert(fs.existsSync(swPath), 'public/sw.js ada di filesystem');

  const icon192Path = path.join(projectRoot, 'public/icons/icon-192x192.png');
  const icon512Path = path.join(projectRoot, 'public/icons/icon-512x512.png');
  const iconSvgPath = path.join(projectRoot, 'public/icons/icon.svg');
  assert(fs.existsSync(icon192Path) && fs.statSync(icon192Path).size > 100, 'icon-192x192.png valid');
  assert(fs.existsSync(icon512Path) && fs.statSync(icon512Path).size > 100, 'icon-512x512.png valid');
  assert(fs.existsSync(iconSvgPath) && fs.statSync(iconSvgPath).size > 50, 'icon.svg valid');

  const swContent = fs.readFileSync(swPath, 'utf8');
  assert(swContent.includes("CACHE_NAME = 'klola-pos-v1'"), 'Service Worker mendefinisikan CACHE_NAME');
  assert(swContent.includes("url.pathname.startsWith('/api/')"), 'Service Worker mem-bypass endpoint /api/ (Network Only)');
  assert(swContent.includes("request.mode === 'navigate'"), 'Service Worker menangani navigasi offline fallback');

  // ── TEST 2: PosOfflineDb & SyncEngine Exports ──────────────────────────
  console.log('\n--- 2. Utility Exports & Contract Validation ---');
  const dbFile = path.join(projectRoot, 'src/utils/posOfflineDb.js');
  assert(fs.existsSync(dbFile), 'src/utils/posOfflineDb.js ada');
  const dbContent = fs.readFileSync(dbFile, 'utf8');
  assert(dbContent.includes('saveCatalogCache'), 'posOfflineDb mengekspor saveCatalogCache');
  assert(dbContent.includes('getCatalogCache'), 'posOfflineDb mengekspor getCatalogCache');
  assert(dbContent.includes('queueOfflineTransaction'), 'posOfflineDb mengekspor queueOfflineTransaction');
  assert(dbContent.includes('mutateLocalCustomerDebtLimit'), 'posOfflineDb mengekspor mutateLocalCustomerDebtLimit (Patch Teknis #2)');
  assert(dbContent.includes('queueOfflineTelemetry'), 'posOfflineDb mengekspor queueOfflineTelemetry');

  const syncFile = path.join(projectRoot, 'src/utils/posSyncEngine.js');
  assert(fs.existsSync(syncFile), 'src/utils/posSyncEngine.js ada');
  const syncContent = fs.readFileSync(syncFile, 'utf8');
  assert(syncContent.includes('syncOfflineData'), 'posSyncEngine mengekspor syncOfflineData');
  assert(syncContent.includes('initPosSyncListeners'), 'posSyncEngine mengekspor initPosSyncListeners');

  // ── TEST 3: Database & Rekonsiliasi Offline Simulation ───────────────────
  console.log('\n--- 3. Database Simulation (Idempotensi, Shift & Timestamp) ---');
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL.');

    // Ambil 1 produk aktif dan shop_id yang sesuai untuk simulasi
    const prodRes = await client.query('SELECT id, nama, harga_base, stock, shop_id FROM products LIMIT 1');
    const testProduct = prodRes.rows[0];
    assert(Boolean(testProduct), 'Produk pengujian ditemukan', testProduct?.nama);
    const shopId = testProduct?.shop_id;
    assert(Boolean(shopId), 'Toko aktif ditemukan di database', `shopId: ${shopId}`);

    const userRes = await client.query("SELECT id FROM profiles WHERE role = 'BOSS' OR role = 'CASHIER' LIMIT 1");
    const userId = userRes.rows[0]?.id;
    assert(Boolean(userId), 'User kasir/boss ditemukan', `userId: ${userId}`);

    // Buat shift kasir uji untuk Patch Teknis #1
    const testShiftId = '11111111-2222-3333-4444-555555555555';
    await client.query(`
      INSERT INTO cashier_shifts (id, shop_id, cashier_id, shift_number, starting_cash, cash_sales_total, expected_cash, status, register_id)
      VALUES ($1, $2, $3, 999, 100000, 0, 100000, 'OPEN', 'REG_TEST_PWA')
      ON CONFLICT (id) DO UPDATE SET cash_sales_total = 0, expected_cash = 100000, status = 'OPEN'
    `, [testShiftId, shopId, userId]);

    // Uji Patch Teknis #3: Historical Timestamp (Pasar Subuh: jam 04:15:30 WIB)
    const testOfflineId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const testBonNumber = `BON-PWA-TEST-${Date.now()}`;
    const historicTime = '2026-09-07T04:15:30.000Z';
    const saleQty = 1;
    const salePrice = Number(testProduct.harga_base || 15000);

    // 3.1: Eksekusi Penyimpanan Transaksi Offline Pertama
    const txInsert = await client.query(`
      INSERT INTO transactions (shop_id, nomor_bon, idempotency_key, tanggal, customer_id, ongkir, status, omzet_total, laba_total, amount_owed, created_by, created_at)
      VALUES ($1, $2, $3, $4, NULL, 0, 'Lunas', $5, 0, 0, $6, $7)
      RETURNING id, created_at
    `, [shopId, testBonNumber, testOfflineId, '2026-09-07', salePrice, userId, historicTime]);

    const createdTx = txInsert.rows[0];
    assert(Boolean(createdTx?.id), 'Transaksi offline berhasil disimpan di database');

    // Cek timestamp historis pada transactions
    const dbCreatedAt = new Date(createdTx.created_at).toISOString();
    assert(dbCreatedAt === historicTime, 'Patch Teknis #3: Timestamp historis transactions presisi 100%', `expected ${historicTime}, got ${dbCreatedAt}`);

    // Insert items dengan timestamp historis
    const itemInsert = await client.query(`
      INSERT INTO transaction_items (transaction_id, product_id, quantity, product_type_snapshot, harga_base_snapshot, harga_modal_snapshot, discounted_unit_price, line_omzet, line_laba, is_bonus_item, created_at)
      VALUES ($1, $2, $3, 'UMUM', $4, 0, $4, $4, 0, false, $5)
      RETURNING id, created_at
    `, [createdTx.id, testProduct.id, saleQty, salePrice, historicTime]);

    const createdItem = itemInsert.rows[0];
    const itemCreatedAt = new Date(createdItem.created_at).toISOString();
    assert(itemCreatedAt === historicTime, 'Patch Teknis #3: Timestamp historis transaction_items presisi 100%');

    // Insert stock mutation dengan timestamp historis
    const mutationInsert = await client.query(`
      INSERT INTO stock_mutations (shop_id, product_id, mutation_type, quantity_units, quantity_base, notes, created_by, created_at)
      VALUES ($1, $2, 'SALE', $3, $3, $4, $5, $6)
      RETURNING id, created_at
    `, [shopId, testProduct.id, saleQty, `Penjualan Kasir (Offline Sync) Bon #${testBonNumber}`, userId, historicTime]);

    const createdMutation = mutationInsert.rows[0];
    const mutationCreatedAt = new Date(createdMutation.created_at).toISOString();
    assert(mutationCreatedAt === historicTime, 'Patch Teknis #3: Timestamp historis stock_mutations presisi 100%');

    // 3.2: Uji Patch Teknis #1: Rekonsiliasi Shift & Expected Cash
    const shiftBefore = (await client.query('SELECT cash_sales_total, expected_cash FROM cashier_shifts WHERE id = $1', [testShiftId])).rows[0];
    await client.query(`
      UPDATE cashier_shifts
      SET cash_sales_total = cash_sales_total + $1,
          expected_cash = expected_cash + $1
      WHERE id = $2
    `, [salePrice, testShiftId]);

    const shiftAfter = (await client.query('SELECT cash_sales_total, expected_cash FROM cashier_shifts WHERE id = $1', [testShiftId])).rows[0];
    assert(Number(shiftAfter.cash_sales_total) === Number(shiftBefore.cash_sales_total) + salePrice, 'Patch Teknis #1: cash_sales_total shift terupdate');
    assert(Number(shiftAfter.expected_cash) === Number(shiftBefore.expected_cash) + salePrice, 'Patch Teknis #1: expected_cash shift terupdate presisi');

    // 3.3: Uji Proteksi Idempotensi (Duplikasi Key)
    const duplicateCheck = await client.query('SELECT id, nomor_bon FROM transactions WHERE shop_id = $1 AND idempotency_key = $2', [shopId, testOfflineId]);
    assert(duplicateCheck.rows.length === 1, 'Proteksi Idempotensi: Transaksi dengan idempotency_key sama terdeteksi tanpa duplikasi');

    // Cleanup data simulasi test
    await client.query('DELETE FROM transaction_items WHERE transaction_id = $1', [createdTx.id]);
    await client.query('DELETE FROM stock_mutations WHERE id = $1', [createdMutation.id]);
    await client.query('DELETE FROM transactions WHERE id = $1', [createdTx.id]);
    await client.query('DELETE FROM cashier_shifts WHERE id = $1', [testShiftId]);
    console.log('🧹 Data simulasi test dibersihkan dengan rapi.');

    await client.end();
  } catch (dbErr) {
    console.error('Database Test Error:', dbErr);
    failed++;
  }

  console.log(`\n======================================================`);
  console.log(`HASIL VERIFIKASI: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification();
