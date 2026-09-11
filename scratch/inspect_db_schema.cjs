const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.doaisnsdahepsxqaroru:ahzaganteng@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});
async function main() {
  await client.connect();
  const res = await client.query(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'customers'
    ORDER BY ordinal_position;
  `);
  console.log("CUSTOMERS COLUMNS:");
  console.table(res.rows);
  
  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);
  console.log("ALL PUBLIC TABLES:");
  console.table(tables.rows);
  await client.end();
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
