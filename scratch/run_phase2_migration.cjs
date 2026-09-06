const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  connectionString: 'postgresql://postgres.doaisnsdahepsxqaroru:ahzaganteng@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function main() {
  console.log('Connecting to PostgreSQL Supabase...');
  await client.connect();
  console.log('Connected.');

  const sql = fs.readFileSync(path.join(__dirname, 'phase2_migration.sql'), 'utf-8');
  console.log('Executing phase2_migration.sql...');
  await client.query(sql);
  console.log('Migration phase 2 executed successfully!');

  // Verify tables created
  const resTables = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_name IN ('consignment_vendors', 'consignment_batches', 'customer_balance_mutations')
    ORDER BY table_name;
  `);
  console.log('Verified Tables:', resTables.rows.map(r => r.table_name));

  // Verify columns in products and customers
  const resCols = await client.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE (table_name = 'products' AND column_name IN ('is_consignment', 'consignment_vendor_id'))
       OR (table_name = 'customers' AND column_name = 'balance');
  `);
  console.log('Verified Columns:');
  console.table(resCols.rows);

  // Verify RPC functions
  const resRpc = await client.query(`
    SELECT routine_name 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
      AND routine_name IN ('allocate_change_to_kasbon', 'mutate_customer_balance');
  `);
  console.log('Verified RPC Functions:', resRpc.rows.map(r => r.routine_name));

  await client.end();
  process.exit(0);
}

main().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
