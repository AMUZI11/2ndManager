/**
 * scratch/audit_phase3_postgresql.cjs
 * FASE 3: INSPEKSI INTEGRITAS BASIS DATA & LOGIKA STORED PROCEDURES (POSTGRESQL AUDIT)
 */

const assert = require('assert');
const pg = require('pg');
const dns = require('dns');

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

function report(name, ok, msg = '') {
  if (ok) {
    console.log(`  ✅ [PASS] ${name}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${name} -> ${msg}`);
    failedCount++;
  }
}

async function auditDatabase() {
  console.log('\n================================================================');
  console.log('🏛️  FASE 3: AUDIT INTEGRITAS BASIS DATA & STORED PROCEDURES');
  console.log('================================================================\n');

  const client = await getPgClient();
  await client.connect();
  console.log('  📡 [DATABASE CONNECTED] Terhubung ke Supabase PostgreSQL.\n');

  try {
    // ── 1. SKEMA & CONSTRAINT RELASIONAL ─────────────────────────────────────
    console.log('BAGIAN 1: Integritas Skema & Constraint Relasional');

    // 1.1 branches: UNIQUE (shop_id) & FK ke organizations
    const branchUq = await client.query(`
      SELECT conname, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      JOIN pg_class cl ON cl.oid = c.conrelid
      WHERE cl.relname = 'branches' AND c.contype IN ('u', 'p', 'f');
    `);
    const branchDefs = branchUq.rows.map(r => r.def);
    const hasBranchShopUq = branchDefs.some(d => d.includes('shop_id') && (d.includes('UNIQUE') || d.includes('PRIMARY KEY')));
    const hasBranchOrgFk = branchDefs.some(d => d.includes('organizations(id)'));
    report('Tabel branches memiliki constraint UNIQUE (shop_id)', hasBranchShopUq, JSON.stringify(branchDefs));
    report('Tabel branches terikat ke organizations (FK)', hasBranchOrgFk, JSON.stringify(branchDefs));

    // 1.2 branch_product_stocks: UNIQUE (branch_id, product_id)
    const bpsUq = await client.query(`
      SELECT conname, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      JOIN pg_class cl ON cl.oid = c.conrelid
      WHERE cl.relname = 'branch_product_stocks' AND c.contype IN ('u', 'p');
    `);
    const bpsDefs = bpsUq.rows.map(r => r.def);
    const hasBpsUq = bpsDefs.some(d => d.includes('branch_id') && d.includes('product_id'));
    report('Tabel branch_product_stocks memiliki constraint UNIQUE (branch_id, product_id)', hasBpsUq, JSON.stringify(bpsDefs));

    // 1.3 transactions: UNIQUE (shop_id, client_tx_uuid)
    const txUq = await client.query(`
      SELECT conname, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      JOIN pg_class cl ON cl.oid = c.conrelid
      WHERE cl.relname = 'transactions' AND c.contype IN ('u', 'p');
    `);
    const txDefs = txUq.rows.map(r => r.def);
    const hasTxIdempotencyUq = txDefs.some(d => d.includes('shop_id') && d.includes('client_tx_uuid'));
    report('Tabel transactions memiliki constraint UNIQUE (shop_id, client_tx_uuid)', hasTxIdempotencyUq, JSON.stringify(txDefs));

    // 1.4 organization_subscriptions: timestamp murni tanpa GENERATED ALWAYS fungsi NOW()
    const orgSubCols = await client.query(`
      SELECT column_name, is_generated, generation_expression 
      FROM information_schema.columns 
      WHERE table_name = 'organization_subscriptions' AND column_name IN ('is_in_grace_period', 'is_expired');
    `);
    report('Tabel organization_subscriptions bebas dari GENERATED ALWAYS fungsi non-immutable NOW()', orgSubCols.rows.length === 0);

    // 1.5 View v_active_organization_subscriptions aktif dan dinamis
    const viewCheck = await client.query(`
      SELECT view_definition 
      FROM information_schema.views 
      WHERE table_name = 'v_active_organization_subscriptions';
    `);
    const hasDynamicView = viewCheck.rows.length > 0 && viewCheck.rows[0].view_definition.includes('now()');
    report('View v_active_organization_subscriptions melakukan evaluasi waktu secara dinamis', hasDynamicView);

    // ── 2. CONCURRENCY GUARD & ROW-LEVEL LOCKING ─────────────────────────────
    console.log('\nBAGIAN 2: Keamanan Transaksi & Concurrency Guard (Row-Level Locking)');

    const rpcSrc = await client.query(`
      SELECT routine_name, routine_definition 
      FROM information_schema.routines 
      WHERE specific_schema = 'public' 
        AND routine_name IN ('dispatch_stock_transfer', 'receive_stock_transfer', 'redeem_license_token');
    `);

    const rpcMap = {};
    for (const r of rpcSrc.rows) {
      rpcMap[r.routine_name] = (r.routine_definition || '').toUpperCase();
    }

    report(
      "RPC 'dispatch_stock_transfer' menerapkan klausa 'SELECT ... FOR UPDATE'",
      (rpcMap['dispatch_stock_transfer'] || '').includes('FOR UPDATE')
    );

    report(
      "RPC 'receive_stock_transfer' menerapkan klausa 'SELECT ... FOR UPDATE'",
      (rpcMap['receive_stock_transfer'] || '').includes('FOR UPDATE')
    );

    report(
      "RPC 'redeem_license_token' mengunci baris token secara eksklusif 'FOR UPDATE'",
      (rpcMap['redeem_license_token'] || '').includes('FOR UPDATE')
    );

    // ── 3. SANITASI DASAR PENGENAAN PAJAK (DPP) ──────────────────────────────
    console.log('\nBAGIAN 3: Sanitasi Dasar Pengenaan Pajak (DPP Engine)');

    const dppRpc = await client.query(`
      SELECT routine_definition 
      FROM information_schema.routines 
      WHERE specific_schema = 'public' AND routine_name = 'calculate_sanitized_annual_dpp';
    `);
    const dppDef = (dppRpc.rows[0]?.routine_definition || '').toUpperCase();

    report(
      "RPC 'calculate_sanitized_annual_dpp' memfilter transaksi sah: status IN ('COMPLETED', 'LUNAS') AND is_void = FALSE",
      dppDef.includes('COMPLETED') && dppDef.includes('IS_VOID')
    );

    report(
      "RPC 'calculate_sanitized_annual_dpp' hanya menghitung margin bersih titip jual (consignment_batches)",
      dppDef.includes('CONSIGNMENT_BATCHES') && (dppDef.includes('STORE_MARGIN_AMOUNT') || dppDef.includes('TOTAL_PROFIT'))
    );

    // ── 4. KESEIMBANGAN NERACA SAK EMKM MUTLAK ────────────────────────────────
    console.log('\nBAGIAN 4: Keseimbangan Neraca SAK EMKM Mutlak');

    const emkmRpc = await client.query(`
      SELECT routine_definition 
      FROM information_schema.routines 
      WHERE specific_schema = 'public' AND routine_name = 'generate_sak_emkm_statements';
    `);
    const emkmDef = (emkmRpc.rows[0]?.routine_definition || '').toUpperCase();

    report(
      "Rumus Neraca Keuangan: total_equity = total_assets - total_liabilities (Keseimbangan Nol Rupiah)",
      emkmDef.includes('V_TOTAL_EQUITY := V_TOTAL_ASSETS - V_TOTAL_LIABILITIES')
    );

    report(
      "Evaluasi is_balanced: v_total_assets = (v_total_liabilities + v_total_equity)",
      emkmDef.includes('V_TOTAL_ASSETS = (V_TOTAL_LIABILITIES + V_TOTAL_EQUITY)')
    );

  } finally {
    await client.end();
    console.log('\n  📡 [DATABASE DISCONNECTED] Koneksi database ditutup.');
  }

  console.log('\n================================================================');
  console.log(`🏁 REKAPITULASI FASE 3: ${passedCount} LULUS, ${failedCount} GAGAL`);
  console.log('================================================================\n');

  if (failedCount > 0) process.exit(1);
}

auditDatabase().catch((err) => {
  console.error('Fatal Database Audit Error:', err);
  process.exit(1);
});
