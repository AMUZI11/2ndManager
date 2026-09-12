const { Client } = require('pg');
const client = new Client({
  host: '54.255.219.82',
  port: 5432,
  user: 'postgres.doaisnsdahepsxqaroru',
  password: 'ahzaganteng',
  database: 'postgres',
  ssl: { rejectUnauthorized: false, servername: 'aws-0-ap-southeast-1.pooler.supabase.com' }
});

async function main() {
  await client.connect();
  const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'consignment_batches'");
  console.log('Columns:', res.rows.map(r => r.column_name));
  await client.end();
}

main().catch(console.error);
