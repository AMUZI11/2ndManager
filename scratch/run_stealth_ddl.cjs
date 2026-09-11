const fs = require('fs');
const path = require('path');
const pg = require('pg');

const projectRef = 'doaisnsdahepsxqaroru';
const password = 'ahzaganteng';

const ddlPath = path.join(__dirname, 'stealth_security_ddl.sql');
const sql = fs.readFileSync(ddlPath, 'utf8');

const client = new pg.Client({
  connectionString: `postgresql://postgres.${projectRef}:${password}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
  connectionTimeoutMillis: 15000,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    console.log('⚡ Menghubungkan ke Supabase PostgreSQL...');
    await client.connect();
    console.log('Connected! Mengeksekusi stealth_security_ddl.sql...');
    
    await client.query(sql);
    console.log('✅ DDL & RPC berhasil dieksekusi tanpa error!');

    // Verifikasi kolom cashier_shifts
    const shiftCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'cashier_shifts' 
        AND column_name IN ('register_id', 'cash_drop_amount', 'leftover_cash', 'previous_shift_id', 'handover_difference', 'handover_status', 'handover_gap_minutes')
      ORDER BY column_name;
    `);
    console.log('📋 Kolom baru cashier_shifts terverifikasi:', shiftCols.rows.map(r => `${r.column_name} (${r.data_type})`));

    // Verifikasi tabel security_anomaly_events
    const anomalyCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'security_anomaly_events'
      ORDER BY ordinal_position;
    `);
    console.log('🛡️ Kolom security_anomaly_events terverifikasi:', anomalyCols.rows.map(r => r.column_name));

    // Verifikasi RPC functions
    const rpcList = await client.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
        AND routine_name IN ('close_cashier_shift_with_skim', 'start_shift_with_estafet_audit');
    `);
    console.log('⚙️ RPC Functions terverifikasi:', rpcList.rows.map(r => r.routine_name));

    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Gagal menjalankan migrasi DDL:', err);
    try { await client.end(); } catch (e) {}
    process.exit(1);
  }
}

runMigration();
