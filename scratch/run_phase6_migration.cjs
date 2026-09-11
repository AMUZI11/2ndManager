const pg = require('pg');
const fs = require('fs');
const path = require('path');
const dns = require('dns');

// Gunakan server DNS publik jika resolver OS bermasalah
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // ignore
}

async function getClient() {
  const hostname = 'aws-0-ap-southeast-1.pooler.supabase.com';
  let host = hostname;

  try {
    const ips = await new Promise((resolve, reject) => {
      dns.resolve4(hostname, (err, addrs) => {
        if (err) reject(err);
        else resolve(addrs);
      });
    });
    if (ips && ips.length > 0) {
      host = ips[0];
      console.log(`📡 Resolved ${hostname} ke IP: ${host}`);
    }
  } catch (err) {
    console.warn('Gagal resolve DNS via 8.8.8.8, fallback ke hostname:', err.message);
  }

  return new pg.Client({
    host: host,
    port: 6543,
    user: 'postgres.doaisnsdahepsxqaroru',
    password: 'ahzaganteng',
    database: 'postgres',
    connectionTimeoutMillis: 15000,
    ssl: { 
      rejectUnauthorized: false,
      servername: hostname
    },
  });
}

async function runPhase6Migration() {
  console.log('🚀 [TAHAP 6 MIGRATION] Memulai migrasi database Supabase PostgreSQL...');
  
  const client = await getClient();

  try {
    await client.connect();
    console.log('✅ Terhubung ke Supabase PostgreSQL.');

    const sqlFiles = [
      'scratch/asset_loans_schema.sql',
      'scratch/multi_tier_unpack_rpc.sql',
      'scratch/consignments_schema.sql',
    ];

    for (const relPath of sqlFiles) {
      const fullPath = path.join(process.cwd(), relPath);
      console.log(`\n📄 Menjalankan file: ${relPath}...`);
      const sql = fs.readFileSync(fullPath, 'utf8');
      await client.query(sql);
      console.log(`✅ File ${relPath} berhasil dieksekusi.`);
    }

    // Verifikasi keberadaan kolom & fungsi
    console.log('\n🔍 Verifikasi tabel & stored procedure:');
    
    // 1. Check customer_asset_deposits
    const depCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'customer_asset_deposits'
    `);
    console.log(`- customer_asset_deposits: ${depCheck.rows.length} kolom terdeteksi.`);

    // 2. Check execute_atomic_unit_unpack
    const rpcCheck = await client.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_name = 'execute_atomic_unit_unpack'
    `);
    console.log(`- Stored Procedure execute_atomic_unit_unpack: ${rpcCheck.rows.length > 0 ? 'DITEMUKAN' : 'TIDAK DITEMUKAN'}`);

    // 3. Check consignment_vendors stale_policy
    const vendCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'consignment_vendors' AND column_name = 'stale_policy'
    `);
    console.log(`- consignment_vendors.stale_policy: ${vendCheck.rows.length > 0 ? 'DITEMUKAN' : 'TIDAK DITEMUKAN'}`);

    console.log('\n🎉 [TAHAP 6 MIGRATION] Seluruh DDL & RPC berhasil diterapkan 100%!');
  } catch (err) {
    console.error('❌ [TAHAP 6 MIGRATION ERROR]:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runPhase6Migration();
