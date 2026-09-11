const pg = require('pg');

const client = new pg.Client({
  connectionString: 'postgresql://postgres.doaisnsdahepsxqaroru:ahzaganteng@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function inspect() {
  await client.connect();
  const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'transaction_items'");
  console.log('transaction_items columns:', res.rows.map(r => r.column_name + ' (' + r.data_type + ')').join(', '));
  await client.end();
}

inspect().catch(console.error);
