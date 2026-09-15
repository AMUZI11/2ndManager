const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: 'postgresql://postgres.doaisnsdahepsxqaroru:ahzaganteng@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres'
});

async function run() {
  await client.connect();
  console.log('Connected to PostgreSQL Supabase pooler.');

  const sqlPath = path.join(__dirname, 'addons_and_quotas_schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Executing addons_and_quotas_schema.sql...');
  await client.query(sql);
  console.log('SQL executed successfully!');

  // Verify view
  const resView = await client.query('SELECT * FROM public.v_organization_effective_quotas LIMIT 5;');
  console.log('Sample v_organization_effective_quotas rows:', resView.rows);

  await client.end();
  console.log('Migration complete.');
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
