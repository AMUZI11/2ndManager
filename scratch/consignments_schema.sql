-- ==============================================================================
-- TAHAP 6: TRIPARTITE CONSIGNMENT SCHEMA ENHANCEMENT
-- ==============================================================================

-- 1. Perluas tabel consignment_vendors
ALTER TABLE consignment_vendors
  ADD COLUMN IF NOT EXISTS stale_policy VARCHAR(20) DEFAULT 'VENDOR_BORNE',
  ADD COLUMN IF NOT EXISTS phone_number VARCHAR(30);

-- Validasi konsistensi stale_policy jika kolom constraint belum ada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_stale_policy'
  ) THEN
    ALTER TABLE consignment_vendors
      ADD CONSTRAINT check_stale_policy 
      CHECK (stale_policy IN ('VENDOR_BORNE', 'STORE_BORNE', 'SHARED_50_50'));
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 2. Perluas tabel consignment_batches
ALTER TABLE consignment_batches
  ADD COLUMN IF NOT EXISTS total_items_returned_good INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_items_returned_stale INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vendor_payout_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS store_margin_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stale_policy VARCHAR(20) DEFAULT 'VENDOR_BORNE';

-- 3. Indeks pendukung
CREATE INDEX IF NOT EXISTS idx_consignment_batches_stale ON consignment_batches(shop_id, stale_policy);
