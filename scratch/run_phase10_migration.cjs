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

async function runPhase10Migration() {
  console.log('🚀 [TAHAP 10 MIGRATION] Memulai migrasi basis data License Engine & Subscriptions...');

  const sqlPath = path.join(__dirname, 'license_engine_schema.sql');
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
      console.error('❌ Gagal terhubung ke database di port 5432 maupun 6543:', err6543.message);
      process.exit(1);
    }
  }

  try {
    console.log('📜 Menjalankan skrip migrasi SQL...');
    await client.query(sql);
    console.log('✅ Eksekusi skrip license_engine_schema.sql selesai.');

    // Verifikasi objek yang terbuat
    console.log('🔍 Memverifikasi struktur tabel dan objek baru...');
    const resTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('license_tokens', 'organization_subscriptions')
    `);
    console.log('📋 Tabel terverifikasi:', resTables.rows.map(r => r.table_name));

    const resView = await client.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
        AND table_name = 'v_active_organization_subscriptions'
    `);
    console.log('📋 View terverifikasi:', resView.rows.map(r => r.table_name));

    const resRpcs = await client.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
        AND routine_name IN ('redeem_license_token', 'evaluate_subscription_status')
    `);
    console.log('📋 Stored Procedures terverifikasi:', resRpcs.rows.map(r => r.routine_name));

    const resOrgSubs = await client.query(`
      SELECT count(*) as count FROM organization_subscriptions
    `);
    console.log(`📋 Total baris organization_subscriptions: ${resOrgSubs.rows[0].count}`);

    console.log('\n🎉 [MIGRASI TAHAP 10 SUKSES] Seluruh skema basis data & RPC siap digunakan!');
  } catch (err) {
    console.error('❌ Error saat mengeksekusi migrasi:', err);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Koneksi database ditutup.');
  }
}

runPhase10Migration();
