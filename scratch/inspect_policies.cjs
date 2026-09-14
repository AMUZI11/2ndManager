const pg = require('pg');

async function run() {
  const client = new pg.Client({
    host: '54.255.219.82',
    port: 5432,
    user: 'postgres.doaisnsdahepsxqaroru',
    password: 'ahzaganteng',
    database: 'postgres',
    ssl: { rejectUnauthorized: false, servername: 'aws-0-ap-southeast-1.pooler.supabase.com' }
  });
  await client.connect();
  const tables = ['organizations', 'branches', 'branch_product_stocks', 'stock_transfers'];
  const resCols = await client.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = ANY($1)
    ORDER BY table_name, ordinal_position;
  `, [tables]);
  console.log('Columns:', resCols.rows);
  await client.end();
}
run().catch(console.error);
