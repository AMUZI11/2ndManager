const pg = require('pg');

async function checkRls() {
  const client = new pg.Client({
    host: '54.255.219.82',
    port: 5432,
    user: 'postgres.doaisnsdahepsxqaroru',
    password: 'ahzaganteng',
    database: 'postgres',
    ssl: { rejectUnauthorized: false, servername: 'aws-0-ap-southeast-1.pooler.supabase.com' }
  });
  await client.connect();
  const tables = ['organizations', 'branches', 'branch_product_stocks', 'transactions', 'transaction_items', 'stock_transfers', 'payment_claims', 'promo_codes'];
  const res = await client.query(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = ANY($1::text[])
  `, [tables]);
  console.log('RLS Status:', res.rows);
  await client.end();
}
checkRls().catch(console.error);
