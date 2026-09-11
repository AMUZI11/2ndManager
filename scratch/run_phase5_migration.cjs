const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  connectionString: 'postgresql://postgres.doaisnsdahepsxqaroru:ahzaganteng@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
});

async function main() {
  console.log('Connecting to PostgreSQL Supabase...');
  await client.connect();
  console.log('Connected.');

  const sql = fs.readFileSync(path.join(__dirname, 'double_blind_handover_rpc.sql'), 'utf-8');
  console.log('Executing double_blind_handover_rpc.sql...');
  await client.query(sql);
  console.log('Migration Tahap 5 executed successfully!');

  // Verify registers table
  const resTables = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_name IN ('registers', 'security_anomaly_events')
    ORDER BY table_name;
  `);
  console.log('Verified Tables:', resTables.rows.map(r => r.table_name));

  // Verify RPC function
  const resRpc = await client.query(`
    SELECT routine_name 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
      AND routine_name = 'execute_double_blind_handover';
  `);
  console.log('Verified RPC Functions:', resRpc.rows.map(r => r.routine_name));

  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
