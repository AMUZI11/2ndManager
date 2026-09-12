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
  console.log('Adding UNIQUE constraint on branches(shop_id)...');
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uq_branches_shop_id' OR (conrelid = 'branches'::regclass AND contype = 'u' AND pg_get_constraintdef(oid) LIKE '%shop_id%')
      ) THEN
        ALTER TABLE branches ADD CONSTRAINT uq_branches_shop_id UNIQUE (shop_id);
      END IF;
    END $$;
  `);
  console.log('✅ UNIQUE constraint on branches(shop_id) added successfully.');
  await client.end();
}

main().catch(console.error);
