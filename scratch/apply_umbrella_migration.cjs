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

  console.log('Executing updated addons_and_quotas_schema.sql...');
  await client.query(sql);
  console.log('SQL executed successfully!');

  // Test get_organization_feature_tier function
  const testFunc = await client.query(`
    SELECT proname FROM pg_proc WHERE proname = 'get_organization_feature_tier';
  `);
  console.log('Found function get_organization_feature_tier:', testFunc.rows);

  // Verify view and unit prices
  const resView = await client.query(`
    SELECT organization_id, current_tier, extra_branches_unit_price, extra_cashiers_unit_price,
           base_branches_quota, max_allowed_branches, base_cashiers_quota, max_allowed_cashiers
    FROM public.v_organization_effective_quotas
    LIMIT 3;
  `);
  console.log('Sample v_organization_effective_quotas rows:', resView.rows);

  await client.end();
  console.log('Umbrella migration complete.');
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
