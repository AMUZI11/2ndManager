const pg = require('pg');
const fs = require('fs');
const path = require('path');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

async function getClient(port = 5432) {
  const hostname = 'aws-0-ap-southeast-1.pooler.supabase.com';
  let host = hostname;

  try {
    const ips = await new Promise((resolve, reject) => {
      dns.resolve4(hostname, (err, addrs) => {
        if (err) reject(err);
        else resolve(addrs);
      });
    });
    if (ips && ips.length > 0) host = ips[0];
  } catch (err) {
    host = '54.255.219.82';
  }

  const client = new pg.Client({
    host: host,
    port: port,
    user: 'postgres.doaisnsdahepsxqaroru',
    password: 'ahzaganteng',
    database: 'postgres',
    connectionTimeoutMillis: 20000,
    ssl: { 
      rejectUnauthorized: false,
      servername: hostname
    },
  });

  client.on('error', (err) => {
    console.error(`[PG Client Warning] ${err.message}`);
  });

  return client;
}

async function runMigration() {
  console.log('🚀 [ROOT STORE HIERARCHY MIGRATION] Memulai migrasi Root Anchor Store (Toko A) & Multi-Branch Hierarchy...');

  const sqlPath = path.join(__dirname, 'root_store_hierarchy_schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  let client;
  try {
    console.log('🔌 Menghubungkan ke Supabase PostgreSQL pooler port 5432...');
    client = await getClient(5432);
    await client.connect();
    console.log('✅ Terhubung ke Supabase PostgreSQL (port 5432).');
  } catch (err5432) {
    console.warn(`⚠️ Port 5432 gagal (${err5432.message}), mencoba port 6543...`);
    try {
      client = await getClient(6543);
      await client.connect();
      console.log('✅ Terhubung ke Supabase PostgreSQL (port 6543).');
    } catch (err6543) {
      console.error('❌ Gagal terhubung ke database:', err6543.message);
      process.exit(1);
    }
  }

  try {
    console.log('⏳ Menjalankan SQL DDL & Stored Procedures...');
    await client.query(sql);
    console.log('✅ Migrasi skema & trigger berhasil dieksekusi 100%!');

    // Verifikasi kolom & trigger
    const colCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'branches' AND column_name IN ('is_main_branch', 'parent_branch_id', 'name', 'branch_name');
    `);
    console.log('📋 Kolom branches:', colCheck.rows);

    const trgCheck = await client.query(`
      SELECT trigger_name, event_manipulation, event_object_table
      FROM information_schema.triggers
      WHERE trigger_name = 'trg_prevent_main_branch_deletion';
    `);
    console.log('🛡️ Trigger status:', trgCheck.rows);

    const rpcCheck = await client.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_name IN ('register_owner_with_store', 'create_child_branch');
    `);
    console.log('⚙️ Stored Procedures:', rpcCheck.rows);

  } catch (err) {
    console.error('❌ Terjadi kesalahan saat menjalankan migrasi:', err);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔒 Koneksi PostgreSQL ditutup.');
  }
}

runMigration();
