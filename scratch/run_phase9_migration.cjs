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

async function runPhase9Migration() {
  console.log('🚀 [TAHAP 9 MIGRATION] Memulai migrasi database Supabase PostgreSQL...');

  const sqlPath = path.join(__dirname, 'pwa_push_sync_schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const separator = '-- 4. STORED PROCEDURE: remote_freeze_cashier';
  const idx = sql.indexOf(separator);

  let chunks = [];
  if (idx > -1) {
    chunks = [
      { name: 'DDL (Tabel push_subscriptions, remote_action_logs, kolom idempotensi)', sql: sql.substring(0, idx) },
      { name: 'RPC (remote_freeze_cashier)', sql: sql.substring(idx) },
    ];
  } else {
    chunks = [{ name: 'Semua DDL & RPC', sql }];
  }

  const portsToTry = [5432, 6543];

  for (const port of portsToTry) {
    console.log(`\n🔌 Mencoba koneksi ke port ${port}...`);
    let client = null;
    try {
      client = await getClient(port);
      await client.connect();
      console.log(`✅ Terhubung ke Supabase PostgreSQL via port ${port}`);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`⏳ Menjalankan Bagian ${i + 1}/${chunks.length}: ${chunk.name}...`);
        await client.query(chunk.sql);
        console.log(`✅ Bagian ${i + 1} Sukses.`);
      }

      // Verifikasi tabel baru
      console.log('\n🔍 Memverifikasi struktur tabel dan RPC...');
      const checkTables = await client.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_name IN ('push_subscriptions', 'remote_action_logs');
      `);
      console.log('📋 Tabel terverifikasi:', checkTables.rows.map(r => r.table_name));

      const checkCols = await client.query(`
        SELECT column_name, data_type FROM information_schema.columns
        WHERE table_name = 'transactions' AND column_name IN ('client_tx_uuid', 'synced_via', 'offline_created_at');
      `);
      console.log('📋 Kolom idempotensi transactions:', checkCols.rows.map(r => `${r.column_name} (${r.data_type})`));

      const checkRpc = await client.query(`
        SELECT routine_name FROM information_schema.routines
        WHERE routine_name = 'remote_freeze_cashier';
      `);
      console.log('📋 RPC terverifikasi:', checkRpc.rows.map(r => r.routine_name));

      await client.end();
      console.log('\n🎉 [TAHAP 9 MIGRATION COMPLETE] Semua skema & RPC berhasil diterapkan!');
      return;
    } catch (err) {
      console.error(`❌ Gagal di port ${port}:`, err.message);
      if (client) {
        try { await client.end(); } catch (_) {}
      }
    }
  }

  throw new Error('Semua port koneksi PostgreSQL gagal.');
}

runPhase9Migration().catch((err) => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
