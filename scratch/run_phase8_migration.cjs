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

async function runPhase8Migration() {
  console.log('🚀 [TAHAP 8 MIGRATION] Memulai migrasi database Supabase PostgreSQL...');

  const sqlPath = path.join(__dirname, 'tax_and_financials_schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const separator1 = '-- STORED PROCEDURES (RPCs)';
  const separator2 = '-- RPC 2: generate_sak_emkm_statements';

  const idx1 = sql.indexOf(separator1);
  const idx2 = sql.indexOf(separator2);

  const chunkDdl = sql.substring(0, idx1);
  const chunkRpc1 = sql.substring(idx1, idx2);
  const chunkRpc2 = sql.substring(idx2);

  const chunks = [
    { name: 'DDL (Tabel & Indeks)', sql: chunkDdl },
    { name: 'RPC 1 (calculate_sanitized_annual_dpp)', sql: chunkRpc1 },
    { name: 'RPC 2 (generate_sak_emkm_statements)', sql: chunkRpc2 }
  ];

  const portsToTry = [5432, 6543];

  for (const port of portsToTry) {
    console.log(`\n🔌 Mencoba koneksi ke port ${port}...`);
    let client;
    try {
      client = await getClient(port);
      await client.connect();
      console.log(`✅ Berhasil terhubung ke Supabase pooler di port ${port}!`);

      for (const chunk of chunks) {
        console.log(`⏳ Menjalankan: ${chunk.name}...`);
        await client.query(chunk.sql);
        console.log(`✅ Selesai: ${chunk.name}`);
      }

      console.log('\n🎉 Seluruh skema & RPC Tahap 8 Berhasil dieksekusi!');

      // Verifikasi tabel
      const checkTables = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('organization_tax_profiles', 'monthly_financial_snapshots', 'audit_verification_seals');
      `);
      console.log('📋 Tabel terdaftar:', checkTables.rows.map(r => r.table_name).join(', '));

      // Verifikasi RPC
      const checkRpcs = await client.query(`
        SELECT routine_name FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND routine_name IN ('calculate_sanitized_annual_dpp', 'generate_sak_emkm_statements');
      `);
      console.log('⚡ RPC Stored Procedures terdaftar:', checkRpcs.rows.map(r => r.routine_name).join(', '));

      await client.end();
      return;
    } catch (err) {
      console.warn(`⚠️ Gagal pada port ${port}: ${err.message}`);
      if (client) {
        try { await client.end(); } catch (e) {}
      }
    }
  }

  throw new Error('Semua opsi port pooler gagal dieksekusi.');
}

runPhase8Migration();
