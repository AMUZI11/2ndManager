-- ==============================================================================
-- 2NDMANAGER (KLOLAWARUNG) - MASTER CONSOLIDATED DATABASE MIGRATIONS
-- FASE 1, FASE 2, FASE 3, & FASE 4 (SEMUA FITUR STRATEGIS WARUNG)
-- 
-- CATATAN: Semua skrip di bawah ini bersifat IDEMPOTENT (IF NOT EXISTS / OR REPLACE)
-- sehingga aman dijalankan tanpa merusak data yang sudah ada.
-- ==============================================================================

-- ==============================================================================
-- FASE 1: MULTI-TIER AUTO-UNPACK, MARGIN GUARD, & PELACAK TABUNG/GALON
-- ==============================================================================

-- 1.1 Tabel Konversi Multi-Satuan (product_units)
CREATE TABLE IF NOT EXISTS product_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    unit_name VARCHAR(50) NOT NULL,
    multiplier_to_base INTEGER NOT NULL CHECK (multiplier_to_base >= 1),
    barcode VARCHAR(100),
    price BIGINT NOT NULL CHECK (price >= 0),
    is_base_unit BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_units_product ON product_units(product_id);
CREATE INDEX IF NOT EXISTS idx_product_units_barcode ON product_units(barcode);
CREATE INDEX IF NOT EXISTS idx_product_units_shop ON product_units(shop_id);

-- 1.2 RPC Mutasi Stok Atomik (mutate_product_stock)
CREATE OR REPLACE FUNCTION mutate_product_stock(p_product_id UUID, p_qty INT)
RETURNS INT AS $$
DECLARE
    v_new_stock INT;
BEGIN
    UPDATE products 
    SET stock = stock + p_qty,
        updated_at = NOW()
    WHERE id = p_product_id
    RETURNING stock INTO v_new_stock;

    RETURN v_new_stock;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1.3 Tabel Riwayat Mutasi Stok & HPP Kulakan (stock_mutations)
CREATE TABLE IF NOT EXISTS stock_mutations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    mutation_type VARCHAR(20) NOT NULL, -- 'PURCHASE', 'SALE', 'ADJUSTMENT'
    unit_id UUID REFERENCES product_units(id) ON DELETE SET NULL,
    unit_name VARCHAR(50),
    quantity_units INTEGER NOT NULL,
    quantity_base INTEGER NOT NULL,
    previous_cost BIGINT,
    new_cost BIGINT,
    total_spend BIGINT,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_mutations_product ON stock_mutations(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_mutations_shop ON stock_mutations(shop_id);

-- 1.4 Tabel & Kolom Pelacak Tabung Gas & Galon (customer_asset_loans)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS loaned_assets JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS customer_asset_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    asset_type VARCHAR(50) NOT NULL, -- 'GAS_3KG', 'GAS_12KG', 'GALON_AQUA'
    loan_type VARCHAR(10) NOT NULL CHECK (loan_type IN ('BORROW', 'RETURN')),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_loans_customer ON customer_asset_loans(customer_id);
CREATE INDEX IF NOT EXISTS idx_asset_loans_shop ON customer_asset_loans(shop_id);


-- ==============================================================================
-- FASE 2: BUKU KONSINYASI TERPISAH & CELENGAN KEMBALIAN (SMART CHANGE)
-- ==============================================================================

-- 2.1 Master Vendor Konsinyasi (consignment_vendors)
CREATE TABLE IF NOT EXISTS consignment_vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    nama_vendor VARCHAR(150) NOT NULL,
    phone VARCHAR(50),
    alamat TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consignment_vendors_shop ON consignment_vendors(shop_id);

-- 2.2 Batch Titipan Konsinyasi (consignment_batches)
CREATE TABLE IF NOT EXISTS consignment_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES consignment_vendors(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    batch_code VARCHAR(50) NOT NULL,
    received_qty INTEGER NOT NULL CHECK (received_qty > 0),
    sold_qty INTEGER NOT NULL DEFAULT 0,
    returned_qty INTEGER NOT NULL DEFAULT 0,
    damaged_qty INTEGER NOT NULL DEFAULT 0,
    vendor_price_per_unit BIGINT NOT NULL CHECK (vendor_price_per_unit >= 0),
    selling_price_per_unit BIGINT NOT NULL CHECK (selling_price_per_unit >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'SETTLED'
    settled_at TIMESTAMPTZ,
    total_payout BIGINT DEFAULT 0,
    total_profit BIGINT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consignment_batches_vendor ON consignment_batches(vendor_id);
CREATE INDEX IF NOT EXISTS idx_consignment_batches_status ON consignment_batches(status);

-- 2.3 Celengan Kembalian & Tabungan Pelanggan (customer_balance_mutations)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS balance BIGINT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS customer_balance_mutations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    mutation_type VARCHAR(20) NOT NULL CHECK (mutation_type IN ('DEPOSIT', 'WITHDRAW', 'PAY_DEBT')),
    amount BIGINT NOT NULL CHECK (amount > 0),
    previous_balance BIGINT NOT NULL,
    current_balance BIGINT NOT NULL,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_balance_mutations_cust ON customer_balance_mutations(customer_id);
CREATE INDEX IF NOT EXISTS idx_balance_mutations_shop ON customer_balance_mutations(shop_id);


-- ==============================================================================
-- FASE 3: RADAR JUAL RUGI (PIN OWNER) & SERAH TERIMA SHIFT KASIR 60 DETIK
-- ==============================================================================

-- 3.1 Keamanan PIN Pemilik Toko pada Tabel Shops
ALTER TABLE shops ADD COLUMN IF NOT EXISTS owner_pin_hash TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS is_pin_configured BOOLEAN DEFAULT false;

-- 3.2 Tabel Sesi Shift Kasir (cashier_shifts) - True Blind Closing
CREATE TABLE IF NOT EXISTS cashier_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    cashier_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    cashier_in_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    shift_name VARCHAR(50) DEFAULT 'Shift Reguler',
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'CLOSED'
    initial_cash BIGINT NOT NULL DEFAULT 0,
    physical_counted_amount BIGINT DEFAULT 0,
    system_expected_amount BIGINT DEFAULT 0,
    discrepancy_amount BIGINT DEFAULT 0,
    cash_in_movements BIGINT DEFAULT 0,
    cash_out_movements BIGINT DEFAULT 0,
    pos_cash_sales BIGINT DEFAULT 0,
    debt_payments_received BIGINT DEFAULT 0,
    customer_deposits_received BIGINT DEFAULT 0,
    denominations JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shifts_shop ON cashier_shifts(shop_id);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON cashier_shifts(status);

-- 3.3 Tabel Mutasi Kas Masuk / Keluar Laci Toko (cash_drawer_movements)
CREATE TABLE IF NOT EXISTS cash_drawer_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES cashier_shifts(id) ON DELETE CASCADE,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('CASH_IN', 'CASH_OUT')),
    amount BIGINT NOT NULL CHECK (amount > 0),
    category VARCHAR(50) NOT NULL, -- 'MODAL_TAMBAHAN', 'BIAYA_OPERASIONAL', 'KULAKAN_MENDESAK', 'SETOR_OWNER'
    notes TEXT,
    operator VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drawer_movements_shift ON cash_drawer_movements(shift_id);


-- ==============================================================================
-- FASE 4: SMART RE-ORDER ENGINE & DAFTAR BELANJA PASAR SUBUH
-- ==============================================================================

-- 4.1 Master Agen Kulakan / Supplier (suppliers)
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(50),
    contact_person VARCHAR(100),
    address TEXT,
    lead_time_days INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_shop ON suppliers(shop_id);

-- 4.2 Kolom Supplier & Lead Time pada Products
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_reorder_qty INTEGER DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS target_stock_days INTEGER DEFAULT 7;

CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);

-- 4.3 Kolom WhatsApp & Briefing pada Shops
ALTER TABLE shops ADD COLUMN IF NOT EXISTS owner_whatsapp_phone VARCHAR(30);
ALTER TABLE shops ADD COLUMN IF NOT EXISTS morning_briefing_time VARCHAR(10) DEFAULT '06:00';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS auto_briefing_enabled BOOLEAN DEFAULT true;

-- 4.4 Tabel Riwayat Purchase Order (purchase_orders)
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    po_number VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'SENT', 'RECEIVED', 'CANCELLED'
    total_estimated_cost BIGINT NOT NULL DEFAULT 0,
    total_actual_cost BIGINT NOT NULL DEFAULT 0,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT,
    sent_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_shop ON purchase_orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);

-- ==============================================================================
-- SELESAI: SEMUA TABEL, FUNGSI, DAN INDEX TELAH AKTIF 100%
-- ==============================================================================
