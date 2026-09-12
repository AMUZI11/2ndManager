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
  const tables = ['customer_asset_deposits', 'customer_asset_loans', 'transit_shrinkage_logs'];
  for (const t of tables) {
    const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = $1", [t]);
    console.log(`Table ${t}:`, res.rows.map(r => r.column_name));
  }
  await client.end();
}

main().catch(console.error);
