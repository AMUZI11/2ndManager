const pg = require('pg');

const client = new pg.Client({
  connectionString: 'postgresql://postgres.doaisnsdahepsxqaroru:ahzaganteng@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  connectionTimeoutMillis: 15000,
  ssl: { rejectUnauthorized: false },
});

const DDL_STATEMENTS = [
  // 1. product_units table
  `CREATE TABLE IF NOT EXISTS product_units (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    unit_name VARCHAR(50) NOT NULL,
    multiplier_to_base INT NOT NULL DEFAULT 1,
    barcode VARCHAR(100),
    price BIGINT NOT NULL DEFAULT 0,
    is_base_unit BOOLEAN NOT NULL DEFAULT false,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT positive_multiplier CHECK (multiplier_to_base > 0),
    CONSTRAINT unique_unit_per_product UNIQUE (product_id, unit_name)
  );`,

  `CREATE UNIQUE INDEX IF NOT EXISTS idx_product_units_barcode_unique 
    ON product_units(shop_id, barcode) WHERE barcode IS NOT NULL;`,

  `CREATE INDEX IF NOT EXISTS idx_product_units_product ON product_units(product_id);`,

  // 2. stock_mutations table
  `CREATE TABLE IF NOT EXISTS stock_mutations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    mutation_type VARCHAR(30) NOT NULL,
    unit_id UUID REFERENCES product_units(id) ON DELETE SET NULL,
    unit_name VARCHAR(50),
    quantity_units INT NOT NULL DEFAULT 0,
    quantity_base INT NOT NULL DEFAULT 0,
    previous_cost BIGINT DEFAULT 0,
    new_cost BIGINT DEFAULT 0,
    total_spend BIGINT DEFAULT 0,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );`,

  `CREATE INDEX IF NOT EXISTS idx_stock_mutations_product ON stock_mutations(product_id, created_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_stock_mutations_shop ON stock_mutations(shop_id, created_at DESC);`,

  // 3. customer_asset_loans table
  `CREATE TABLE IF NOT EXISTS customer_asset_loans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id),
    asset_type VARCHAR(30) NOT NULL,
    mutation_type VARCHAR(10) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT positive_loan_quantity CHECK (quantity > 0),
    CONSTRAINT valid_loan_mutation CHECK (mutation_type IN ('LOAN', 'RETURN'))
  );`,

  `CREATE INDEX IF NOT EXISTS idx_asset_loans_customer ON customer_asset_loans(customer_id, created_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_asset_loans_shop ON customer_asset_loans(shop_id, asset_type);`,

  // 4. customers.loaned_assets column
  `ALTER TABLE customers ADD COLUMN IF NOT EXISTS loaned_assets JSONB DEFAULT '{}'::jsonb;`,

  // 5. RLS
  `ALTER TABLE product_units ENABLE ROW LEVEL SECURITY;`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'product_units_shop_access') THEN
      CREATE POLICY product_units_shop_access ON product_units FOR ALL USING (
        shop_id IN (SELECT shop_id FROM user_shops WHERE user_id = auth.uid())
        OR shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())
      );
    END IF;
  END $$;`,

  `ALTER TABLE stock_mutations ENABLE ROW LEVEL SECURITY;`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'stock_mutations_shop_access') THEN
      CREATE POLICY stock_mutations_shop_access ON stock_mutations FOR ALL USING (
        shop_id IN (SELECT shop_id FROM user_shops WHERE user_id = auth.uid())
        OR shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())
      );
    END IF;
  END $$;`,

  `ALTER TABLE customer_asset_loans ENABLE ROW LEVEL SECURITY;`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'customer_asset_loans_shop_access') THEN
      CREATE POLICY customer_asset_loans_shop_access ON customer_asset_loans FOR ALL USING (
        shop_id IN (SELECT shop_id FROM user_shops WHERE user_id = auth.uid())
        OR shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())
      );
    END IF;
  END $$;`,

  // 6. RPC: mutate_product_stock
  `CREATE OR REPLACE FUNCTION mutate_product_stock(p_product_id UUID, p_qty INT)
  RETURNS INT
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  DECLARE
    v_new_stock INT;
  BEGIN
    UPDATE products 
    SET stock = stock + p_qty,
        updated_at = NOW()
    WHERE id = p_product_id
    RETURNING stock INTO v_new_stock;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % not found', p_product_id;
    END IF;
    
    RETURN v_new_stock;
  END;
  $$;`,

  // 7. RPC: mutate_customer_loaned_assets
  `CREATE OR REPLACE FUNCTION mutate_customer_loaned_assets(
    p_customer_id UUID, 
    p_asset_type TEXT, 
    p_delta INT
  )
  RETURNS JSONB
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  DECLARE
    v_current INT;
    v_new_val INT;
    v_result JSONB;
  BEGIN
    SELECT COALESCE((loaned_assets->>p_asset_type)::INT, 0)
    INTO v_current
    FROM customers
    WHERE id = p_customer_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Customer % not found', p_customer_id;
    END IF;
    
    v_new_val := v_current + p_delta;
    
    IF v_new_val < 0 THEN
      RAISE EXCEPTION 'Saldo pinjaman tidak boleh minus. Saat ini: %, dicoba: %', v_current, p_delta;
    END IF;
    
    IF v_new_val = 0 THEN
      UPDATE customers
      SET loaned_assets = loaned_assets - p_asset_type
      WHERE id = p_customer_id
      RETURNING loaned_assets INTO v_result;
    ELSE
      UPDATE customers
      SET loaned_assets = jsonb_set(
        COALESCE(loaned_assets, '{}'::jsonb),
        ARRAY[p_asset_type],
        to_jsonb(v_new_val)
      )
      WHERE id = p_customer_id
      RETURNING loaned_assets INTO v_result;
    END IF;
    
    RETURN v_result;
  END;
  $$;`
];

async function main() {
  console.log('Connecting to Supabase PostgreSQL direct pooler...');
  await client.connect();
  console.log('Connected! Executing DDL statements...');

  for (let i = 0; i < DDL_STATEMENTS.length; i++) {
    const stmt = DDL_STATEMENTS[i];
    const preview = stmt.trim().slice(0, 60).replace(/\s+/g, ' ');
    try {
      await client.query(stmt);
      console.log(`[${i + 1}/${DDL_STATEMENTS.length}] OK: ${preview}...`);
    } catch (err) {
      console.error(`[${i + 1}/${DDL_STATEMENTS.length}] ERROR on: ${preview}`, err.message);
      throw err;
    }
  }

  console.log('\nVerifying newly created tables and RPCs...');
  const tableCheck = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('product_units', 'stock_mutations', 'customer_asset_loans');
  `);
  console.log('Tables found:', tableCheck.rows.map(r => r.table_name));

  const colCheck = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'loaned_assets';
  `);
  console.log('Column customers.loaned_assets:', colCheck.rows);

  const rpcCheck = await client.query(`
    SELECT routine_name 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
      AND routine_name IN ('mutate_product_stock', 'mutate_customer_loaned_assets');
  `);
  console.log('RPCs found:', rpcCheck.rows.map(r => r.routine_name));

  await client.end();
  console.log('\nDDL Migration and RPC Creation SUCCESSFUL!');
}

main().catch(err => {
  console.error('Fatal Migration Error:', err);
  process.exit(1);
});
