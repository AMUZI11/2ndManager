const pg = require('pg');
const client = new pg.Client({
  connectionString: 'postgresql://postgres.doaisnsdahepsxqaroru:ahzaganteng@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  const prods = await client.query('SELECT id, shop_id, nama, barcode, harga_base FROM products');
  console.log('Total products:', prods.rows.length);
  for (const p of prods.rows) {
    await client.query(`
      INSERT INTO product_units (product_id, shop_id, unit_name, multiplier_to_base, barcode, price, is_base_unit, sort_order)
      VALUES ($1, $2, 'Pcs', 1, $3, $4, true, 1)
      ON CONFLICT (product_id, unit_name) DO UPDATE 
      SET barcode = EXCLUDED.barcode, price = EXCLUDED.price;
    `, [p.id, p.shop_id, p.barcode || null, p.harga_base || 0]);
  }
  const units = await client.query('SELECT id, product_id, unit_name, multiplier_to_base, price, barcode FROM product_units');
  console.log('Total product_units now:', units.rows.length);
  console.table(units.rows);
  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
