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
  const resCols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'security_anomaly_events'
    ORDER BY ordinal_position;
  `);
  console.log('Columns:', resCols.rows);
  await client.end();
}
run().catch(console.error);
