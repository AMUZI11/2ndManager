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

async function runPhase7Migration() {
  console.log('🚀 [TAHAP 7 MIGRATION] Memulai migrasi database Supabase PostgreSQL...');
  
  const client = await getClient();

  try {
    await client.connect();
    console.log('✅ Terhubung ke database Supabase PostgreSQL Pooler.');

    const sqlPath = path.join(__dirname, 'multi_branch_transfers_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('⏳ Menjalankan script DDL & RPC multi_branch_transfers_schema.sql...');
    await client.query(sql);
    console.log('🎉 Migrasi Tahap 7 Berhasil dieksekusi tanpa error!');

    // Verifikasi tabel dan fungsi
    const checkTables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('organizations', 'branches', 'branch_product_stocks', 'stock_transfers', 'stock_transfer_items', 'transit_shrinkage_logs');
    `);
    console.log('📋 Tabel terdaftar:', checkTables.rows.map(r => r.table_name).join(', '));

    const checkRpcs = await client.query(`
      SELECT routine_name FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name IN ('dispatch_stock_transfer', 'receive_stock_transfer', 'cancel_stock_transfer');
    `);
    console.log('⚙️ Stored Procedures terdaftar:', checkRpcs.rows.map(r => r.routine_name).join(', '));

    const checkOrg = await client.query('SELECT count(*) FROM organizations;');
    const checkBranches = await client.query('SELECT count(*) FROM branches;');
    const checkStocks = await client.query('SELECT count(*) FROM branch_product_stocks;');
    console.log(`🏢 Organisasi: ${checkOrg.rows[0].count}, Cabang: ${checkBranches.rows[0].count}, Baris Stok Cabang: ${checkStocks.rows[0].count}`);

  } catch (err) {
    console.error('❌ Gagal menjalankan migrasi Tahap 7:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runPhase7Migration();
