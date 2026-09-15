const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: 'postgresql://postgres.doaisnsdahepsxqaroru:ahzaganteng@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres'
});

async function run() {
  await client.connect();
  const res = await client.query("SELECT id, username, role, organization_id, shop_id FROM profiles WHERE role = 'CASHIER'");
  console.log('Cashiers count:', res.rows.length);
  console.log('Cashiers rows:', res.rows);

  const resBranches = await client.query("SELECT id, name, organization_id, shop_id, is_active, is_main_branch FROM branches");
  console.log('Branches count:', resBranches.rows.length);
  console.log('Branches rows:', resBranches.rows);

  await client.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
