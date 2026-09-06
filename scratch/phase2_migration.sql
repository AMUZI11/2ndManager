-- ==============================================================================
-- PHASE 2 MIGRATION: BUKU KONSINYASI & CELENGAN KEMBALIAN KE KASBON
-- ==============================================================================

-- 1. Consignment Vendors
CREATE TABLE IF NOT EXISTS consignment_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  nama_vendor TEXT NOT NULL,
  phone TEXT,
  alamat TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consignment_vendors_shop_active 
  ON consignment_vendors(shop_id, is_active);

-- 2. Products Extension for Consignment
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS is_consignment BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS consignment_vendor_id UUID REFERENCES consignment_vendors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_consignment 
  ON products(shop_id, is_consignment) WHERE is_consignment = TRUE;

-- 3. Consignment Batches (Penerimaan, Penjualan POS, Retur & Settlement)
CREATE TABLE IF NOT EXISTS consignment_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES consignment_vendors(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  received_qty INT NOT NULL CHECK (received_qty > 0),
  returned_qty INT NOT NULL DEFAULT 0 CHECK (returned_qty >= 0),
  sold_qty INT NOT NULL DEFAULT 0 CHECK (sold_qty >= 0),
  lost_qty INT NOT NULL DEFAULT 0 CHECK (lost_qty >= 0),
  vendor_price_per_unit BIGINT NOT NULL CHECK (vendor_price_per_unit >= 0),
  selling_price_per_unit BIGINT NOT NULL CHECK (selling_price_per_unit >= vendor_price_per_unit),
  total_payout BIGINT NOT NULL DEFAULT 0,
  total_profit BIGINT NOT NULL DEFAULT 0,
  loss_borne_by TEXT DEFAULT 'STORE' CHECK (loss_borne_by IN ('STORE', 'VENDOR')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SETTLED')),
  settled_at TIMESTAMPTZ,
  settled_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consignment_batches_shop_status 
  ON consignment_batches(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_consignment_batches_vendor 
  ON consignment_batches(vendor_id, status);

-- 4. Customer Balance (Celengan / Tabungan Pelanggan)
ALTER TABLE customers 
  ADD COLUMN IF NOT EXISTS balance BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0);

-- 5. Customer Balance Mutations Ledger
CREATE TABLE IF NOT EXISTS customer_balance_mutations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  mutation_type TEXT NOT NULL CHECK (mutation_type IN ('DEPOSIT', 'WITHDRAW', 'KASBON_PAYMENT', 'ADJUSTMENT')),
  amount BIGINT NOT NULL CHECK (amount > 0),
  previous_balance BIGINT NOT NULL,
  current_balance BIGINT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_balance_mutations_cust 
  ON customer_balance_mutations(customer_id, created_at DESC);

-- 6. RPC: allocate_change_to_kasbon
-- Concurrency lock: SELECT ... FOR UPDATE on transactions and customers
CREATE OR REPLACE FUNCTION allocate_change_to_kasbon(
  p_customer_id UUID,
  p_amount BIGINT,
  p_shop_id UUID,
  p_transaction_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT 'Alokasi kembalian POS'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_remaining BIGINT := p_amount;
  v_debt_rec RECORD;
  v_deduct BIGINT;
  v_debts_settled_count INT := 0;
  v_total_paid_to_debt BIGINT := 0;
  v_prev_bal BIGINT;
  v_new_bal BIGINT;
  v_deposited_leftover BIGINT := 0;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Nominal alokasi kembalian harus lebih besar dari 0';
  END IF;

  -- 1. FIFO Debt Payoff: Lock unpaid transactions with FOR UPDATE
  FOR v_debt_rec IN 
    SELECT id, nomor_bon, amount_owed
    FROM transactions
    WHERE customer_id = p_customer_id
      AND shop_id = p_shop_id
      AND status = 'Piutang'
      AND amount_owed > 0
    ORDER BY tanggal ASC, created_at ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;

    IF v_debt_rec.amount_owed <= v_remaining THEN
      v_deduct := v_debt_rec.amount_owed;
      UPDATE transactions
      SET amount_owed = 0,
          status = 'Lunas',
          tanggal_lunas = CURRENT_DATE,
          updated_at = NOW()
      WHERE id = v_debt_rec.id;

      v_remaining := v_remaining - v_deduct;
      v_total_paid_to_debt := v_total_paid_to_debt + v_deduct;
      v_debts_settled_count := v_debts_settled_count + 1;
    ELSE
      v_deduct := v_remaining;
      UPDATE transactions
      SET amount_owed = amount_owed - v_deduct,
          updated_at = NOW()
      WHERE id = v_debt_rec.id;

      v_total_paid_to_debt := v_total_paid_to_debt + v_deduct;
      v_remaining := 0;
    END IF;
  END LOOP;

  -- 2. If there was any debt payment, record mutation or balance ledger
  IF v_total_paid_to_debt > 0 THEN
    SELECT balance INTO v_prev_bal FROM customers WHERE id = p_customer_id FOR UPDATE;
    INSERT INTO customer_balance_mutations (
      shop_id, customer_id, transaction_id, mutation_type, amount,
      previous_balance, current_balance, notes
    ) VALUES (
      p_shop_id, p_customer_id, p_transaction_id, 'KASBON_PAYMENT', v_total_paid_to_debt,
      v_prev_bal, v_prev_bal, p_notes || ' (Pelunasan ' || v_debts_settled_count || ' bon)'
    );
  END IF;

  -- 3. If there is leftover change after all debts are cleared, deposit into customer balance
  IF v_remaining > 0 THEN
    SELECT balance INTO v_prev_bal FROM customers WHERE id = p_customer_id FOR UPDATE;
    v_new_bal := v_prev_bal + v_remaining;

    UPDATE customers
    SET balance = v_new_bal,
        updated_at = NOW()
    WHERE id = p_customer_id;

    INSERT INTO customer_balance_mutations (
      shop_id, customer_id, transaction_id, mutation_type, amount,
      previous_balance, current_balance, notes
    ) VALUES (
      p_shop_id, p_customer_id, p_transaction_id, 'DEPOSIT', v_remaining,
      v_prev_bal, v_new_bal, p_notes || ' (Sisa kembalian masuk celengan)'
    );

    v_deposited_leftover := v_remaining;
  ELSE
    SELECT balance INTO v_new_bal FROM customers WHERE id = p_customer_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'total_allocated', p_amount,
    'debts_paid', v_total_paid_to_debt,
    'debts_settled_count', v_debts_settled_count,
    'leftover_deposited', v_deposited_leftover,
    'current_balance', v_new_bal
  );
END;
$$;

-- 7. RPC: mutate_customer_balance
-- Atomic balance update with SELECT ... FOR UPDATE and anti-negative balance check
CREATE OR REPLACE FUNCTION mutate_customer_balance(
  p_customer_id UUID,
  p_delta BIGINT,
  p_mutation_type TEXT,
  p_shop_id UUID,
  p_notes TEXT DEFAULT NULL,
  p_transaction_id UUID DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prev_bal BIGINT;
  v_new_bal BIGINT;
  v_abs_amount BIGINT := ABS(p_delta);
BEGIN
  IF p_delta = 0 THEN
    RAISE EXCEPTION 'Delta mutasi saldo tidak boleh 0';
  END IF;

  SELECT balance INTO v_prev_bal 
  FROM customers 
  WHERE id = p_customer_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pelanggan tidak ditemukan';
  END IF;

  v_new_bal := v_prev_bal + p_delta;
  IF v_new_bal < 0 THEN
    RAISE EXCEPTION 'Saldo celengan tidak mencukupi (Saldo saat ini: Rp%, Diminta: Rp%)', v_prev_bal, v_abs_amount;
  END IF;

  UPDATE customers
  SET balance = v_new_bal,
      updated_at = NOW()
  WHERE id = p_customer_id;

  INSERT INTO customer_balance_mutations (
    shop_id, customer_id, transaction_id, mutation_type, amount,
    previous_balance, current_balance, notes
  ) VALUES (
    p_shop_id, p_customer_id, p_transaction_id, p_mutation_type, v_abs_amount,
    v_prev_bal, v_new_bal, p_notes
  );

  RETURN v_new_bal;
END;
$$;
