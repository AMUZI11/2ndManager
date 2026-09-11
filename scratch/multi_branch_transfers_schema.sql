-- ==============================================================================
-- TAHAP 7: MULTI-BRANCH HIERARCHY & TWO-PHASE STOCK TRANSFER ENGINE
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABEL ORGANISASI INDUK
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  tier_id VARCHAR(30) DEFAULT 'EKSEKUTIF',
  max_branches INT DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABEL CABANG (Menautkan ke shops.id eksisting)
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shop_id UUID UNIQUE NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  branch_name VARCHAR(100) NOT NULL,
  branch_code VARCHAR(10) NOT NULL,
  is_main_branch BOOLEAN DEFAULT FALSE,
  address TEXT,
  phone_number VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, branch_code)
);

-- 3. TABEL STOK TERISOLASI PER CABANG
CREATE TABLE IF NOT EXISTS branch_product_stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  available_stock INT DEFAULT 0 CHECK (available_stock >= 0),
  in_transit_stock INT DEFAULT 0 CHECK (in_transit_stock >= 0),
  safety_stock INT DEFAULT 0 CHECK (safety_stock >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(branch_id, product_id)
);

ALTER TABLE branches ADD COLUMN IF NOT EXISTS is_main_branch BOOLEAN DEFAULT FALSE;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

ALTER TABLE branch_product_stocks ADD COLUMN IF NOT EXISTS available_stock INT DEFAULT 0;
ALTER TABLE branch_product_stocks ADD COLUMN IF NOT EXISTS in_transit_stock INT DEFAULT 0;
ALTER TABLE branch_product_stocks ADD COLUMN IF NOT EXISTS safety_stock INT DEFAULT 0;
ALTER TABLE branch_product_stocks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. TABEL MUTASI PENGIRIMAN ANTAR-CABANG
CREATE TABLE IF NOT EXISTS stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number VARCHAR(30) UNIQUE NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  target_branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  status VARCHAR(20) DEFAULT 'DISPATCHED' CHECK (status IN ('DISPATCHED', 'RECEIVED', 'DISCREPANCY', 'CANCELLED')),
  pin_hash VARCHAR(64) NOT NULL,
  dispatched_by UUID,
  received_by UUID,
  notes TEXT,
  dispatched_at TIMESTAMPTZ DEFAULT NOW(),
  received_at TIMESTAMPTZ,
  failed_pin_attempts INT DEFAULT 0,
  is_locked BOOLEAN DEFAULT FALSE,
  locked_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS failed_pin_attempts INT DEFAULT 0;
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS cancelled_by UUID;
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 5. TABEL RINCIAN ITEM MUTASI ANTAR-CABANG
CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  qty_dispatched INT NOT NULL CHECK (qty_dispatched > 0),
  qty_received INT DEFAULT 0 CHECK (qty_received >= 0),
  qty_damaged INT DEFAULT 0 CHECK (qty_damaged >= 0),
  qty_lost INT DEFAULT 0 CHECK (qty_lost >= 0),
  cogs_per_unit NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABEL LOG SUSUT PERJALANAN (TRANSIT SHRINKAGE)
CREATE TABLE IF NOT EXISTS transit_shrinkage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  qty_damaged INT DEFAULT 0,
  qty_lost INT DEFAULT 0,
  cogs_per_unit NUMERIC DEFAULT 0,
  total_shrinkage_cogs NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES UNTUK PERFORMA QUERY
CREATE INDEX IF NOT EXISTS idx_branches_org_id ON branches(organization_id);
CREATE INDEX IF NOT EXISTS idx_branches_shop_id ON branches(shop_id);
CREATE INDEX IF NOT EXISTS idx_branch_product_stocks_branch ON branch_product_stocks(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_product_stocks_product ON branch_product_stocks(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_org ON stock_transfers(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_status ON stock_transfers(status);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_source ON stock_transfers(source_branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_target ON stock_transfers(target_branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfer_items_transfer ON stock_transfer_items(transfer_id);

-- ==============================================================================
-- MIGRASI DATA IDEMPOTEN (BACKFILL TOKO EKSISTING SEBAGAI CABANG 1 PUSAT)
-- ==============================================================================
DO $$
DECLARE
  r RECORD;
  v_org_id UUID;
  v_branch_id UUID;
  p RECORD;
BEGIN
  -- 1. Bungkus setiap toko mandiri (parent_shop_id IS NULL) yang belum berorganisasi
  FOR r IN SELECT id, name, owner_id, created_at FROM shops WHERE parent_shop_id IS NULL LOOP
    SELECT id INTO v_org_id FROM organizations WHERE owner_id = r.owner_id LIMIT 1;
    
    IF v_org_id IS NULL THEN
      INSERT INTO organizations (owner_id, name, tier_id, created_at)
      VALUES (r.owner_id, r.name || ' Group', 'EKSEKUTIF', r.created_at)
      RETURNING id INTO v_org_id;
    END IF;

    -- Pastikan toko utama terdaftar sebagai Cabang Utama di branches
    SELECT id INTO v_branch_id FROM branches WHERE shop_id = r.id;
    IF v_branch_id IS NULL THEN
      INSERT INTO branches (organization_id, shop_id, branch_name, branch_code, is_main_branch, created_at)
      VALUES (v_org_id, r.id, r.name, 'CBG-01', TRUE, r.created_at)
      RETURNING id INTO v_branch_id;
    END IF;

    -- Backfill stok produk toko utama ke branch_product_stocks
    FOR p IN SELECT id, COALESCE(stock, 0) as current_stock FROM products WHERE shop_id = r.id LOOP
      INSERT INTO branch_product_stocks (branch_id, product_id, available_stock, in_transit_stock, safety_stock)
      VALUES (v_branch_id, p.id, p.current_stock, 0, 5)
      ON CONFLICT (branch_id, product_id) DO UPDATE
      SET available_stock = EXCLUDED.available_stock;
    END LOOP;
  END LOOP;

  -- 2. Daftarkan juga sub-toko (parent_shop_id IS NOT NULL) sebagai cabang anak
  FOR r IN SELECT s.id, s.name, s.owner_id, s.parent_shop_id, s.created_at, o.id as org_id 
           FROM shops s
           JOIN branches b ON b.shop_id = s.parent_shop_id
           JOIN organizations o ON o.id = b.organization_id
           WHERE s.parent_shop_id IS NOT NULL LOOP
    
    SELECT id INTO v_branch_id FROM branches WHERE shop_id = r.id;
    IF v_branch_id IS NULL THEN
      INSERT INTO branches (organization_id, shop_id, branch_name, branch_code, is_main_branch, created_at)
      VALUES (r.org_id, r.id, r.name, 'CBG-0' || ((SELECT count(*) FROM branches WHERE organization_id = r.org_id) + 1), FALSE, r.created_at)
      RETURNING id INTO v_branch_id;

      -- Inisialisasi stok produk untuk cabang anak
      FOR p IN SELECT id FROM products WHERE shop_id = r.parent_shop_id OR shop_id = r.id LOOP
        INSERT INTO branch_product_stocks (branch_id, product_id, available_stock, in_transit_stock, safety_stock)
        VALUES (v_branch_id, p.id, 0, 0, 5)
        ON CONFLICT (branch_id, product_id) DO NOTHING;
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- ==============================================================================
-- TRIGGERS AUTO-PROVISIONING STOK PRODUK & CABANG
-- ==============================================================================

-- Trigger saat produk baru dibuat di products:
CREATE OR REPLACE FUNCTION trg_provision_product_branch_stocks()
RETURNS TRIGGER AS $$
DECLARE
  b RECORD;
  v_org_id UUID;
BEGIN
  -- Cari organisasi pemilik toko produk ini
  SELECT organization_id INTO v_org_id FROM branches WHERE shop_id = NEW.shop_id LIMIT 1;
  
  IF v_org_id IS NOT NULL THEN
    FOR b IN SELECT id, is_main_branch FROM branches WHERE organization_id = v_org_id LOOP
      INSERT INTO branch_product_stocks (branch_id, product_id, available_stock, in_transit_stock, safety_stock)
      VALUES (
        b.id, 
        NEW.id, 
        CASE WHEN b.is_main_branch THEN COALESCE(NEW.stock, 0) ELSE 0 END, 
        0, 
        COALESCE(NEW.reorder_threshold, 5)
      )
      ON CONFLICT (branch_id, product_id) DO NOTHING;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_after_product_insert_provision ON products;
CREATE TRIGGER trg_after_product_insert_provision
AFTER INSERT ON products
FOR EACH ROW EXECUTE FUNCTION trg_provision_product_branch_stocks();

-- ==============================================================================
-- STORED PROCEDURES (RPCs)
-- ==============================================================================

-- RPC 1: dispatch_stock_transfer
-- Snapshot statis cogs_per_unit pada stock_transfer_items
DROP FUNCTION IF EXISTS dispatch_stock_transfer(UUID, UUID, UUID, JSONB, TEXT, UUID, TEXT);
CREATE OR REPLACE FUNCTION dispatch_stock_transfer(
  p_org_id UUID,
  p_source_branch_id UUID,
  p_target_branch_id UUID,
  p_items JSONB,
  p_pin_hash TEXT,
  p_dispatched_by UUID,
  p_notes TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_transfer_id UUID := gen_random_uuid();
  v_transfer_num VARCHAR(30);
  v_item JSONB;
  v_prod_id UUID;
  v_qty INT;
  v_curr_avail INT;
  v_cogs NUMERIC;
  v_source_shop_id UUID;
BEGIN
  -- Validasi cabang asal dan tujuan berbeda
  IF p_source_branch_id = p_target_branch_id THEN
    RAISE EXCEPTION 'Cabang asal dan cabang tujuan tidak boleh sama.';
  END IF;

  SELECT shop_id INTO v_source_shop_id FROM branches WHERE id = p_source_branch_id;

  -- Generate nomor transfer urut
  v_transfer_num := 'TRF-' || to_char(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

  -- Insert header transfer
  INSERT INTO stock_transfers (
    id, transfer_number, organization_id, source_branch_id, target_branch_id,
    status, pin_hash, dispatched_by, notes, dispatched_at
  ) VALUES (
    v_transfer_id, v_transfer_num, p_org_id, p_source_branch_id, p_target_branch_id,
    'DISPATCHED', p_pin_hash, p_dispatched_by, p_notes, NOW()
  );

  -- Iterasi seluruh item mutasi
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_prod_id := (v_item->>'product_id')::UUID;
    v_qty := (v_item->>'qty_dispatched')::INT;

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Kuantitas kirim produk harus lebih besar dari 0.';
    END IF;

    -- Lock row stok cabang pengirim
    SELECT available_stock INTO v_curr_avail
    FROM branch_product_stocks
    WHERE branch_id = p_source_branch_id AND product_id = v_prod_id
    FOR UPDATE;

    IF v_curr_avail IS NULL OR v_curr_avail < v_qty THEN
      RAISE EXCEPTION 'STOK_TIDAK_CUKUP: Stok fisik tersedia di cabang pengirim tidak mencukupi (% < %).', COALESCE(v_curr_avail, 0), v_qty;
    END IF;

    -- Snapshot statis cogs_per_unit dari products.harga_modal (PENGARASAN TEKNIS 1)
    SELECT COALESCE(harga_modal, 0) INTO v_cogs FROM products WHERE id = v_prod_id;

    -- Geser dari available_stock ke in_transit_stock
    UPDATE branch_product_stocks
    SET available_stock = available_stock - v_qty,
        in_transit_stock = in_transit_stock + v_qty,
        updated_at = NOW()
    WHERE branch_id = p_source_branch_id AND product_id = v_prod_id;

    -- Insert ke stock_transfer_items
    INSERT INTO stock_transfer_items (
      transfer_id, product_id, qty_dispatched, cogs_per_unit, notes
    ) VALUES (
      v_transfer_id, v_prod_id, v_qty, v_cogs, v_item->>'notes'
    );

    -- Catat ke stock_mutations
    INSERT INTO stock_mutations (
      shop_id, product_id, mutation_type, quantity_units, quantity_base,
      previous_cost, new_cost, total_spend, notes, created_by
    ) VALUES (
      v_source_shop_id, v_prod_id, 'TRANSFER_OUT', v_qty, v_qty,
      v_cogs, v_cogs, v_cogs * v_qty, 'Mutasi Keluar ke Surat Jalan ' || v_transfer_num, p_dispatched_by
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'transfer_number', v_transfer_num
  );
END;
$$ LANGUAGE plpgsql;

-- RPC 2: receive_stock_transfer
-- Penguncian baris FOR UPDATE ketat pada evaluasi failed_pin_attempts (PENGARASAN TEKNIS 2)
DROP FUNCTION IF EXISTS receive_stock_transfer(UUID, UUID, JSONB, TEXT, UUID);
CREATE OR REPLACE FUNCTION receive_stock_transfer(
  p_transfer_id UUID,
  p_target_branch_id UUID,
  p_received_items JSONB,
  p_raw_pin TEXT,
  p_received_by UUID
)
RETURNS JSONB AS $$
DECLARE
  v_transfer RECORD;
  v_calc_hash VARCHAR(64);
  v_item JSONB;
  v_prod_id UUID;
  v_qty_rec INT;
  v_qty_dam INT;
  v_qty_lost INT;
  v_total_counted INT;
  v_orig_item RECORD;
  v_has_discrepancy BOOLEAN := FALSE;
  v_final_status VARCHAR(20);
  v_target_shop_id UUID;
  v_source_shop_id UUID;
  v_total_received_qty INT := 0;
  v_total_shrink_cogs NUMERIC := 0;
  v_shrink_cogs NUMERIC := 0;
BEGIN
  -- Kunci baris transfer secara KETAT FOR UPDATE
  SELECT * INTO v_transfer
  FROM stock_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF v_transfer IS NULL THEN
    RAISE EXCEPTION 'Data tiket transfer tidak ditemukan.';
  END IF;

  IF v_transfer.target_branch_id != p_target_branch_id THEN
    RAISE EXCEPTION 'Cabang penerima tidak cocok dengan tiket transfer ini.';
  END IF;

  IF v_transfer.status != 'DISPATCHED' THEN
    RAISE EXCEPTION 'Tiket transfer tidak dalam status DISPATCHED (Status saat ini: %).', v_transfer.status;
  END IF;

      IF v_transfer.is_locked THEN
        RETURN jsonb_build_object(
          'success', false,
          'error_code', 'TRANSFER_LOCKED',
          'message', 'TRANSFER_LOCKED: Tiket transfer terkunci akibat salah PIN berulang kali. Butuh verifikasi Owner.',
          'failed_attempts', v_transfer.failed_pin_attempts,
          'is_locked', true
        );
      END IF;

      -- Evaluasi kecocokan PIN via SHA-256
      v_calc_hash := encode(digest(p_raw_pin, 'sha256'), 'hex');

      IF v_calc_hash != v_transfer.pin_hash THEN
        -- Update counter failed_pin_attempts dan status locked secara permanen
        UPDATE stock_transfers
        SET failed_pin_attempts = failed_pin_attempts + 1,
            is_locked = CASE WHEN failed_pin_attempts + 1 >= 3 THEN TRUE ELSE FALSE END,
            locked_at = CASE WHEN failed_pin_attempts + 1 >= 3 THEN NOW() ELSE NULL END
        WHERE id = p_transfer_id;

        IF (v_transfer.failed_pin_attempts + 1) >= 3 THEN
          -- Catat anomali brute force ke security_anomaly_events
          INSERT INTO security_anomaly_events (
            shop_id, event_type, severity, metadata, is_read_by_owner
          ) VALUES (
            (SELECT shop_id FROM branches WHERE id = p_target_branch_id),
            'TRANSFER_PIN_BRUTEFORCE',
            'CRITICAL',
            jsonb_build_object('transfer_id', p_transfer_id, 'transfer_number', v_transfer.transfer_number, 'attempts', 3),
            FALSE
          );

          RETURN jsonb_build_object(
            'success', false,
            'error_code', 'PIN_INVALID_LOCKED',
            'message', 'PIN_INVALID: PIN Salah 3 kali! Tiket dibekukan demi keamanan.',
            'failed_attempts', 3,
            'is_locked', true
          );
        ELSE
          RETURN jsonb_build_object(
            'success', false,
            'error_code', 'PIN_INVALID',
            'message', 'PIN_INVALID: PIN Transit Salah! Sisa percobaan: ' || (3 - (v_transfer.failed_pin_attempts + 1)),
            'failed_attempts', v_transfer.failed_pin_attempts + 1,
            'is_locked', false
          );
        END IF;
      END IF;

      SELECT shop_id INTO v_target_shop_id FROM branches WHERE id = p_target_branch_id;
      SELECT shop_id INTO v_source_shop_id FROM branches WHERE id = v_transfer.source_branch_id;

      -- Evaluasi rekonsiliasi kuantitas fisik dan mutasi stok
      FOR v_item IN SELECT * FROM jsonb_array_elements(p_received_items) LOOP
        v_prod_id := (v_item->>'product_id')::UUID;
        v_qty_rec := COALESCE((v_item->>'qty_received')::INT, 0);
        v_qty_dam := COALESCE((v_item->>'qty_damaged')::INT, 0);
        v_qty_lost := COALESCE((v_item->>'qty_lost')::INT, 0);
        v_total_counted := v_qty_rec + v_qty_dam + v_qty_lost;

        SELECT * INTO v_orig_item
        FROM stock_transfer_items
        WHERE transfer_id = p_transfer_id AND product_id = v_prod_id;

        IF v_orig_item IS NULL THEN
          RAISE EXCEPTION 'Produk % tidak terdaftar pada surat jalan mutasi ini.', v_prod_id;
        END IF;

        IF v_orig_item.qty_dispatched != v_total_counted THEN
          RAISE EXCEPTION 'Total kuantitas fisik (% diterima + % rusak + % hilang = %) tidak sesuai dengan kuantitas kirim (%).',
            v_qty_rec, v_qty_dam, v_qty_lost, v_total_counted, v_orig_item.qty_dispatched;
        END IF;

        -- Update stock_transfer_items
        UPDATE stock_transfer_items
        SET qty_received = v_qty_rec,
            qty_damaged = v_qty_dam,
            qty_lost = v_qty_lost
        WHERE transfer_id = p_transfer_id AND product_id = v_prod_id;

        -- Kurangi in_transit_stock di cabang asal
        UPDATE branch_product_stocks
        SET in_transit_stock = GREATEST(0, in_transit_stock - v_orig_item.qty_dispatched),
            updated_at = NOW()
        WHERE branch_id = v_transfer.source_branch_id AND product_id = v_prod_id;

        -- Tambah available_stock di cabang tujuan (hanya qty_received yang baik)
        INSERT INTO branch_product_stocks (branch_id, product_id, available_stock, in_transit_stock, safety_stock)
        VALUES (p_target_branch_id, v_prod_id, v_qty_rec, 0, 5)
        ON CONFLICT (branch_id, product_id) DO UPDATE
        SET available_stock = branch_product_stocks.available_stock + EXCLUDED.available_stock,
            updated_at = NOW();

        v_total_received_qty := v_total_received_qty + v_qty_rec;

        -- Catat ke stock_mutations cabang tujuan
        INSERT INTO stock_mutations (
          shop_id, product_id, mutation_type, quantity_units, quantity_base,
          previous_cost, new_cost, total_spend, notes, created_by
        ) VALUES (
          v_target_shop_id, v_prod_id, 'TRANSFER_IN', v_qty_rec, v_qty_rec,
          v_orig_item.cogs_per_unit, v_orig_item.cogs_per_unit, v_orig_item.cogs_per_unit * v_qty_rec,
          'Penerimaan Mutasi dari ' || v_transfer.transfer_number, p_received_by
        );

        -- Catat susut barang rusak/hilang jika ada
        IF (v_qty_dam > 0 OR v_qty_lost > 0) THEN
          v_has_discrepancy := TRUE;
          v_shrink_cogs := v_orig_item.cogs_per_unit * (v_qty_dam + v_qty_lost);
          v_total_shrink_cogs := v_total_shrink_cogs + v_shrink_cogs;

          INSERT INTO transit_shrinkage_logs (
            transfer_id, product_id, branch_id, qty_damaged, qty_lost, cogs_per_unit, total_shrinkage_cogs, total_shrinkage_value, notes
          ) VALUES (
            p_transfer_id, v_prod_id, p_target_branch_id, v_qty_dam, v_qty_lost, v_orig_item.cogs_per_unit, v_shrink_cogs, v_shrink_cogs,
            'Susut Perjalanan: ' || v_qty_dam || ' Rusak, ' || v_qty_lost || ' Hilang'
          );
        END IF;
      END LOOP;

      -- Tentukan status akhir transfer
      v_final_status := CASE WHEN v_has_discrepancy THEN 'DISCREPANCY' ELSE 'RECEIVED' END;

      UPDATE stock_transfers
      SET status = v_final_status,
          received_by = p_received_by,
          received_at = NOW()
      WHERE id = p_transfer_id;

      -- Jika terjadi susut, catat radar anomali ke security_anomaly_events
      IF v_has_discrepancy THEN
        INSERT INTO security_anomaly_events (
          shop_id, event_type, severity, metadata, is_read_by_owner
        ) VALUES (
          v_target_shop_id,
          'TRANSFER_SHRINKAGE',
          'HIGH',
          jsonb_build_object(
            'transfer_id', p_transfer_id,
            'transfer_number', v_transfer.transfer_number,
            'total_shrinkage_cogs', v_total_shrink_cogs
          ),
          FALSE
        );
      END IF;

      RETURN jsonb_build_object(
        'success', true,
        'status', v_final_status,
        'total_received', v_total_received_qty,
        'total_shrinkage_cogs', v_total_shrink_cogs
      );
END;
$$ LANGUAGE plpgsql;

-- RPC 3: cancel_stock_transfer
-- Otorisasi Owner dan Pemulihan Stok Atomik
DROP FUNCTION IF EXISTS cancel_stock_transfer(UUID, TEXT, TEXT, UUID);
CREATE OR REPLACE FUNCTION cancel_stock_transfer(
  p_transfer_id UUID,
  p_owner_pin_hash TEXT,
  p_reason TEXT,
  p_owner_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_transfer RECORD;
  v_shop RECORD;
  v_item RECORD;
  v_source_shop_id UUID;
  v_restored_count INT := 0;
BEGIN
  SELECT * INTO v_transfer
  FROM stock_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF v_transfer IS NULL THEN
    RAISE EXCEPTION 'Tiket transfer tidak ditemukan.';
  END IF;

  IF v_transfer.status != 'DISPATCHED' THEN
    RAISE EXCEPTION 'Hanya tiket transfer berstatus DISPATCHED yang dapat dibatalkan (Status saat ini: %).', v_transfer.status;
  END IF;

  SELECT shop_id INTO v_source_shop_id FROM branches WHERE id = v_transfer.source_branch_id;

  -- Validasi PIN Owner
  SELECT * INTO v_shop FROM shops WHERE id = v_source_shop_id;
  IF v_shop.owner_pin_hash IS NOT NULL AND v_shop.owner_pin_hash != p_owner_pin_hash THEN
    RAISE EXCEPTION 'PIN Owner tidak valid untuk membatalkan pengiriman.';
  END IF;

  -- Pulihkan in_transit_stock ke available_stock
  FOR v_item IN SELECT * FROM stock_transfer_items WHERE transfer_id = p_transfer_id LOOP
    UPDATE branch_product_stocks
    SET in_transit_stock = GREATEST(0, in_transit_stock - v_item.qty_dispatched),
        available_stock = available_stock + v_item.qty_dispatched,
        updated_at = NOW()
    WHERE branch_id = v_transfer.source_branch_id AND product_id = v_item.product_id;

    -- Catat ke stock_mutations
    INSERT INTO stock_mutations (
      shop_id, product_id, mutation_type, quantity_units, quantity_base,
      previous_cost, new_cost, total_spend, notes, created_by
    ) VALUES (
      v_source_shop_id, v_item.product_id, 'TRANSFER_CANCELLED', v_item.qty_dispatched, v_item.qty_dispatched,
      v_item.cogs_per_unit, v_item.cogs_per_unit, 0,
      'Pembatalan Surat Jalan ' || v_transfer.transfer_number || ': ' || COALESCE(p_reason, 'Dibatalkan oleh Owner'),
      p_owner_id
    );

    v_restored_count := v_restored_count + 1;
  END LOOP;

  UPDATE stock_transfers
  SET status = 'CANCELLED',
      cancelled_at = NOW(),
      cancelled_by = p_owner_id,
      cancellation_reason = p_reason
  WHERE id = p_transfer_id;

  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', p_transfer_id,
    'restored_items_count', v_restored_count
  );
END;
$$ LANGUAGE plpgsql;

-- RPC 4: mutate_branch_product_stock
-- Mutasi stok atomik per cabang untuk transaksi kasir POS
DROP FUNCTION IF EXISTS mutate_branch_product_stock(UUID, UUID, INT);
CREATE OR REPLACE FUNCTION mutate_branch_product_stock(
  p_branch_id UUID,
  p_product_id UUID,
  p_qty INT
)
RETURNS JSONB AS $$
DECLARE
  v_new_avail INT;
BEGIN
  INSERT INTO branch_product_stocks (branch_id, product_id, available_stock, in_transit_stock, safety_stock)
  VALUES (p_branch_id, p_product_id, GREATEST(0, p_qty), 0, 5)
  ON CONFLICT (branch_id, product_id) DO UPDATE
  SET available_stock = GREATEST(0, branch_product_stocks.available_stock + p_qty),
      updated_at = NOW()
  RETURNING available_stock INTO v_new_avail;

  RETURN jsonb_build_object('success', true, 'available_stock', v_new_avail);
END;
$$ LANGUAGE plpgsql;
