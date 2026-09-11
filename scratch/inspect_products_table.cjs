const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.doaisnsdahepsxqaroru:ahzaganteng@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});
async function main() {
  await client.connect();
  const res = await client.query(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'products'
    ORDER BY ordinal_position;
  `);
  console.log("PRODUCTS COLUMNS:");
  console.table(res.rows);
  await client.end();
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
