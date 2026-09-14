const fs = require('fs');
const path = require('path');
const pg = require('pg');

async function applyRls() {
  const sqlPath = path.join(__dirname, 'enforce_rls_audit.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Connecting to Supabase PostgreSQL...');
  const client = new pg.Client({
    host: '54.255.219.82',
    port: 5432,
    user: 'postgres.doaisnsdahepsxqaroru',
    password: 'ahzaganteng',
    database: 'postgres',
    ssl: { rejectUnauthorized: false, servername: 'aws-0-ap-southeast-1.pooler.supabase.com' }
  });

  await client.connect();
  console.log('Connected! Executing RLS migration...');

  try {
    await client.query(sql);
    console.log('✅ RLS SQL executed successfully!');

    const tables = [
      'organizations',
      'branches',
      'branch_product_stocks',
      'transactions',
      'transaction_items',
      'stock_transfers',
      'payment_claims',
      'promo_codes'
    ];

    const checkRes = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = ANY($1)
      ORDER BY tablename;
    `, [tables]);

    console.log('\n📊 Status RLS Setelah Migrasi:');
    let allEnabled = true;
    for (const row of checkRes.rows) {
      console.log(`  - ${row.tablename}: ${row.rowsecurity ? '🔒 ENABLED' : '❌ DISABLED'}`);
      if (!row.rowsecurity) allEnabled = false;
    }

    if (allEnabled && checkRes.rows.length === 8) {
      console.log('\n🎉 SEMUA 8 TABEL BERHASIL TERKUNCI DENGAN RLS!');
    } else {
      console.error('\n⚠️ Beberapa tabel belum mengaktifkan RLS.');
    }
  } catch (err) {
    console.error('❌ Error executing RLS migration:', err);
  } finally {
    await client.end();
  }
}

applyRls().catch(console.error);
