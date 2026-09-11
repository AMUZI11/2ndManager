-- ==============================================================================
-- TAHAP 6: ROLLING ASSET LOANS & CONTAINER ESCROW SCHEMA
-- ==============================================================================

-- 1. Perluas tabel customer_asset_loans jika kolom belum ada
ALTER TABLE customer_asset_loans 
  ADD COLUMN IF NOT EXISTS deposit_amount_per_unit NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_deposit_waived BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'BORROWED',
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS borrowed_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;

-- 2. Buat tabel pos penampungan dana titipan jaminan wadah (Escrow Non-Revenue)
CREATE TABLE IF NOT EXISTS customer_asset_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  loan_id UUID REFERENCES customer_asset_loans(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  deposit_amount NUMERIC NOT NULL CHECK (deposit_amount >= 0),
  status VARCHAR(20) DEFAULT 'HELD' CHECK (status IN ('HELD', 'REFUNDED', 'FORFEITED')),
  refunded_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeks performa query
CREATE INDEX IF NOT EXISTS idx_customer_asset_deposits_shop ON customer_asset_deposits(shop_id);
CREATE INDEX IF NOT EXISTS idx_customer_asset_deposits_customer ON customer_asset_deposits(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_asset_deposits_loan ON customer_asset_deposits(loan_id);
CREATE INDEX IF NOT EXISTS idx_customer_asset_deposits_status ON customer_asset_deposits(shop_id, status);

-- Row Level Security
ALTER TABLE customer_asset_deposits ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'customer_asset_deposits_shop_access'
  ) THEN
    CREATE POLICY customer_asset_deposits_shop_access ON customer_asset_deposits
      FOR ALL USING (
        shop_id IN (
          SELECT shop_id FROM user_shops WHERE user_id = auth.uid()
          UNION
          SELECT id FROM shops WHERE owner_id = auth.uid()
        )
      );
  END IF;
END $$;
