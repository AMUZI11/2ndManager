-- ============================================================
-- HL MANAGER PRO — Full SaaS Schema Migration (Idempotent)
-- Safe to run multiple times in Supabase SQL Editor
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- STEP 0: DROP TABEL LAMA (Prisma Migration Cleanup)
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public."BonusGrant" CASCADE;
DROP TABLE IF EXISTS public."TransactionItem" CASCADE;
DROP TABLE IF EXISTS public."Transaction" CASCADE;
DROP TABLE IF EXISTS public."CustomerDiscount" CASCADE;
DROP TABLE IF EXISTS public."Customer" CASCADE;
DROP TABLE IF EXISTS public."Product" CASCADE;
DROP TABLE IF EXISTS public."ProductCategory" CASCADE;
DROP TABLE IF EXISTS public."AuditLog" CASCADE;
DROP TABLE IF EXISTS public."TutorialProgress" CASCADE;
DROP TABLE IF EXISTS public."User" CASCADE;
DROP TABLE IF EXISTS public."_prisma_migrations" CASCADE;

-- ─────────────────────────────────────────────────────────────
-- STEP 1: TABEL MULTI-TENANT INTI
-- ─────────────────────────────────────────────────────────────

-- Toko / Tenant induk & Cabang
CREATE TABLE IF NOT EXISTS public.shops (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  owner_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS parent_shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE;

-- Profil pengguna (extend auth.users)
-- role: 'BOSS' = pemilik toko, 'CASHIER' = kasir
-- shop_id untuk CASHIER: satu kasir hanya boleh di satu toko/cabang
-- shop_id untuk BOSS: null atau ID cabang aktif
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT UNIQUE,               -- nama tampil di audit log
  role        TEXT NOT NULL DEFAULT 'BOSS' CHECK (role IN ('BOSS', 'CASHIER')),
  shop_id     UUID REFERENCES public.shops(id) ON DELETE SET NULL, -- null = BOSS
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Junction: BOSS bisa punya banyak shops (many-to-many)
CREATE TABLE IF NOT EXISTS public.user_shops (
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id  UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, shop_id)
);

-- Langganan per toko
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id        UUID NOT NULL UNIQUE REFERENCES public.shops(id) ON DELETE CASCADE,
  plan           TEXT NOT NULL DEFAULT 'FREE' CHECK (plan IN ('FREE', 'STARTER', 'PLUS', 'PRO')),
  valid_until    TIMESTAMPTZ,          -- NULL = FREE (tidak pernah expire)
  max_cashiers   INT NOT NULL DEFAULT 1,
  max_branches   INT NOT NULL DEFAULT 1,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- STEP 2: TABEL BISNIS (dengan shop_id untuk tenant isolation)
-- ─────────────────────────────────────────────────────────────

-- Kategori produk
CREATE TABLE IF NOT EXISTS public.product_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  code       TEXT NOT NULL,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (shop_id, code)
);

-- Produk (tambah barcode untuk Auto-Scanner & is_active untuk soft-delete)
CREATE TABLE IF NOT EXISTS public.products (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id      UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  nama         TEXT NOT NULL,
  barcode      TEXT,                     -- untuk fitur Auto-Scanner kasir
  harga_modal  BIGINT NOT NULL DEFAULT 0,
  harga_base   BIGINT NOT NULL DEFAULT 0,
  stock        INT NOT NULL DEFAULT 0,   -- stok untuk alert kritis
  reorder_threshold INT DEFAULT 5,       -- minimum stok sebelum alert
  tipe         TEXT NOT NULL,            -- category code: 'LM', 'BR', dll
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,  -- soft-delete (dilarang hapus fisik)
  is_deleted   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns on existing tables
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS barcode TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS reorder_threshold INT DEFAULT 5;

-- Index untuk pencarian barcode cepat di kasir & query produk aktif
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(shop_id, barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_shop_active ON public.products(shop_id, is_active);

-- Pelanggan
CREATE TABLE IF NOT EXISTS public.customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  nama            TEXT NOT NULL,
  phone           TEXT,                  -- untuk kirim struk WA
  bonus_threshold BIGINT NOT NULL DEFAULT 0,
  is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Diskon bertingkat per pelanggan per kategori
CREATE TABLE IF NOT EXISTS public.customer_discounts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id      UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id  UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  product_type TEXT NOT NULL,
  step_order   INT NOT NULL,
  percentage   DECIMAL(5,2) NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (customer_id, product_type, step_order)
);

-- Transaksi
-- idempotency_key: UNIQUE constraint mencegah double-submit dari kasir
CREATE TABLE IF NOT EXISTS public.transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id          UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  nomor_bon        TEXT NOT NULL,
  idempotency_key  TEXT UNIQUE,          -- anti race condition
  tanggal          DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_id      UUID REFERENCES public.customers(id),
  ongkir           BIGINT NOT NULL DEFAULT 0,
  deskripsi        TEXT,
  is_bonus         BOOLEAN NOT NULL DEFAULT FALSE,
  status           TEXT NOT NULL DEFAULT 'Piutang' CHECK (status IN ('Piutang', 'Lunas')),
  tanggal_lunas    DATE,
  omzet_total      BIGINT NOT NULL DEFAULT 0,
  laba_total       BIGINT NOT NULL DEFAULT 0,
  amount_owed      BIGINT NOT NULL DEFAULT 0,
  created_by       UUID REFERENCES auth.users(id),  -- kasir/operator yang input
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (shop_id, nomor_bon)
);

CREATE INDEX IF NOT EXISTS idx_transactions_shop_status ON public.transactions(shop_id, status, tanggal);
CREATE INDEX IF NOT EXISTS idx_transactions_shop_date   ON public.transactions(shop_id, tanggal);

-- Item transaksi
CREATE TABLE IF NOT EXISTS public.transaction_items (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id          UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  product_id              UUID REFERENCES public.products(id),
  quantity                INT NOT NULL,
  product_type_snapshot   TEXT NOT NULL,
  harga_base_snapshot     BIGINT NOT NULL,
  harga_modal_snapshot    BIGINT NOT NULL,
  discounted_unit_price   BIGINT NOT NULL,
  line_omzet              BIGINT NOT NULL,
  line_laba               BIGINT NOT NULL,
  is_bonus_item           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Bonus grants
CREATE TABLE IF NOT EXISTS public.bonus_grants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES public.customers(id),
  transaction_id  UUID NOT NULL REFERENCES public.transactions(id),
  bonuses_granted INT NOT NULL,
  omzet_consumed  BIGINT NOT NULL,
  granted_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Void log (kasir hapus item dari keranjang — Starter+)
CREATE TABLE IF NOT EXISTS public.void_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  cashier_id    UUID NOT NULL REFERENCES auth.users(id),
  cashier_name  TEXT NOT NULL,
  product_name  TEXT NOT NULL,
  quantity      INT NOT NULL,
  voided_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log (immutable — Pro tier)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  operator   TEXT NOT NULL,
  action     TEXT NOT NULL,
  details    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- STEP 3: BILLING & PAYMENT
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.payment_proofs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id          UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  submitted_by     UUID NOT NULL REFERENCES auth.users(id),
  plan_requested   TEXT NOT NULL,     -- STARTER | PLUS | PRO | ADDON_CASHIER | ADDON_BRANCH
  storage_path     TEXT NOT NULL,     -- path di Supabase Storage bucket
  status           TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  rejection_reason TEXT,
  approved_by      TEXT,              -- email Superadmin yang approve
  approved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Storage bucket untuk bukti pembayaran
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('payment-proofs', 'payment-proofs', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- STEP 4: POSTGRESQL TRIGGER — AUTO-SETUP SAAT REGISTER
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_shop_id UUID;
  shop_name   TEXT;
BEGIN
  shop_name := COALESCE(NEW.raw_user_meta_data->>'shop_name', 'Toko Saya');

  -- Auto-append (Cabang 1) jika nama toko belum mengandung kata Cabang
  IF shop_name NOT ILIKE '%Cabang%' THEN
    shop_name := shop_name || ' (Cabang 1)';
  END IF;

  -- 1. Buat toko baru (otomatis terdaftar sebagai Cabang 1)
  INSERT INTO public.shops (name, owner_id)
  VALUES (shop_name, NEW.id)
  RETURNING id INTO new_shop_id;

  -- 2. Buat profil BOSS untuk user ini
  INSERT INTO public.profiles (id, username, role, shop_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)), 'BOSS', NULL);

  -- 3. Daftarkan BOSS ke toko via user_shops
  INSERT INTO public.user_shops (user_id, shop_id)
  VALUES (NEW.id, new_shop_id);

  -- 4. Buat subscription FREE untuk toko ini
  INSERT INTO public.subscriptions (shop_id, plan, valid_until, max_cashiers, max_branches)
  VALUES (new_shop_id, 'FREE', NULL, 1, 1);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- STEP 5: TRIGGER AUDIT LOG (immutable — Pro tier)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.log_product_price_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.harga_base <> NEW.harga_base OR OLD.harga_modal <> NEW.harga_modal THEN
    INSERT INTO public.audit_logs (shop_id, operator, action, details)
    VALUES (
      NEW.shop_id,
      auth.uid()::TEXT,
      'UPDATE_PRODUCT_PRICE',
      json_build_object(
        'product_id', NEW.id,
        'product_name', NEW.nama,
        'old_harga_base', OLD.harga_base,
        'new_harga_base', NEW.harga_base,
        'old_harga_modal', OLD.harga_modal,
        'new_harga_modal', NEW.harga_modal
      )::TEXT
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_product_price ON public.products;
CREATE TRIGGER audit_product_price
  AFTER UPDATE OF harga_base, harga_modal ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.log_product_price_change();

CREATE OR REPLACE FUNCTION public.log_transaction_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status <> NEW.status THEN
    INSERT INTO public.audit_logs (shop_id, operator, action, details)
    VALUES (
      NEW.shop_id,
      auth.uid()::TEXT,
      'UPDATE_TRANSACTION_STATUS',
      json_build_object(
        'transaction_id', NEW.id,
        'nomor_bon', NEW.nomor_bon,
        'old_status', OLD.status,
        'new_status', NEW.status
      )::TEXT
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_transaction_status ON public.transactions;
CREATE TRIGGER audit_transaction_status
  AFTER UPDATE OF status ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.log_transaction_status_change();

-- ─────────────────────────────────────────────────────────────
-- STEP 6: HELPER FUNCTION (dipakai RLS)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_shop_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    (SELECT shop_id FROM public.profiles WHERE id = auth.uid() AND shop_id IS NOT NULL),
    (SELECT shop_id FROM public.user_shops WHERE user_id = auth.uid() LIMIT 1)
  )
$$;

-- ─────────────────────────────────────────────────────────────
-- STEP 7: ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.shops              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_shops         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonus_grants       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.void_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_proofs     ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for idempotent re-runs
DROP POLICY IF EXISTS "tenant_profiles" ON public.profiles;
DROP POLICY IF EXISTS "own_profile" ON public.profiles;
DROP POLICY IF EXISTS "own_user_shops" ON public.user_shops;
DROP POLICY IF EXISTS "boss_own_shops" ON public.shops;
DROP POLICY IF EXISTS "tenant_subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "tenant_categories" ON public.product_categories;
DROP POLICY IF EXISTS "tenant_products_select" ON public.products;
DROP POLICY IF EXISTS "boss_products_write" ON public.products;
DROP POLICY IF EXISTS "tenant_customers" ON public.customers;
DROP POLICY IF EXISTS "tenant_customer_discounts" ON public.customer_discounts;
DROP POLICY IF EXISTS "tenant_transactions" ON public.transactions;
DROP POLICY IF EXISTS "tenant_transaction_items" ON public.transaction_items;
DROP POLICY IF EXISTS "tenant_bonus_grants" ON public.bonus_grants;
DROP POLICY IF EXISTS "tenant_void_logs_insert" ON public.void_logs;
DROP POLICY IF EXISTS "tenant_void_logs_select" ON public.void_logs;
DROP POLICY IF EXISTS "audit_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "boss_read_audit" ON public.audit_logs;
DROP POLICY IF EXISTS "boss_insert_proof" ON public.payment_proofs;
DROP POLICY IF EXISTS "boss_read_own_proofs" ON public.payment_proofs;

-- ── Profiles ──
CREATE POLICY "tenant_profiles" ON public.profiles
  USING (
    id = auth.uid()
    OR shop_id = public.get_my_shop_id()
    OR shop_id IN (SELECT shop_id FROM public.user_shops WHERE user_id = auth.uid())
  );

-- ── User Shops ──
CREATE POLICY "own_user_shops" ON public.user_shops
  USING (user_id = auth.uid());

-- ── Shops ──
CREATE POLICY "boss_own_shops" ON public.shops
  USING (
    id = public.get_my_shop_id()
    OR id IN (SELECT shop_id FROM public.user_shops WHERE user_id = auth.uid())
  );

-- ── Subscriptions ──
CREATE POLICY "tenant_subscription" ON public.subscriptions
  USING (
    shop_id = public.get_my_shop_id()
    OR shop_id IN (SELECT shop_id FROM public.user_shops WHERE user_id = auth.uid())
  );

-- ── Product Categories ──
CREATE POLICY "tenant_categories" ON public.product_categories
  USING (
    shop_id = public.get_my_shop_id()
    OR shop_id IN (SELECT shop_id FROM public.user_shops WHERE user_id = auth.uid())
  );

-- ── Products ── BOSS: full CRUD | CASHIER: SELECT only
CREATE POLICY "tenant_products_select" ON public.products
  FOR SELECT USING (
    shop_id = public.get_my_shop_id()
    OR shop_id IN (SELECT shop_id FROM public.user_shops WHERE user_id = auth.uid())
  );

CREATE POLICY "boss_products_write" ON public.products
  FOR ALL USING (
    (shop_id = public.get_my_shop_id() OR shop_id IN (SELECT shop_id FROM public.user_shops WHERE user_id = auth.uid()))
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'BOSS'
  );

-- ── Customers ──
CREATE POLICY "tenant_customers" ON public.customers
  USING (
    shop_id = public.get_my_shop_id()
    OR shop_id IN (SELECT shop_id FROM public.user_shops WHERE user_id = auth.uid())
  );

-- ── Customer Discounts ──
CREATE POLICY "tenant_customer_discounts" ON public.customer_discounts
  USING (
    shop_id = public.get_my_shop_id()
    OR shop_id IN (SELECT shop_id FROM public.user_shops WHERE user_id = auth.uid())
  );

-- ── Transactions ──
CREATE POLICY "tenant_transactions" ON public.transactions
  USING (
    shop_id = public.get_my_shop_id()
    OR shop_id IN (SELECT shop_id FROM public.user_shops WHERE user_id = auth.uid())
  );

-- ── Transaction Items ──
CREATE POLICY "tenant_transaction_items" ON public.transaction_items
  USING (
    transaction_id IN (
      SELECT id FROM public.transactions
      WHERE shop_id = public.get_my_shop_id()
         OR shop_id IN (SELECT shop_id FROM public.user_shops WHERE user_id = auth.uid())
    )
  );

-- ── Bonus Grants ──
CREATE POLICY "tenant_bonus_grants" ON public.bonus_grants
  USING (
    shop_id = public.get_my_shop_id()
    OR shop_id IN (SELECT shop_id FROM public.user_shops WHERE user_id = auth.uid())
  );

-- ── Void Logs ──
CREATE POLICY "tenant_void_logs_insert" ON public.void_logs
  FOR INSERT WITH CHECK (
    shop_id = public.get_my_shop_id()
    OR shop_id IN (SELECT shop_id FROM public.user_shops WHERE user_id = auth.uid())
  );
CREATE POLICY "tenant_void_logs_select" ON public.void_logs
  FOR SELECT USING (
    shop_id = public.get_my_shop_id()
    OR shop_id IN (SELECT shop_id FROM public.user_shops WHERE user_id = auth.uid())
  );

-- ── Audit Logs ──
-- Immutable append-only log guarantee: ONLY INSERT and SELECT policies are defined.
-- NO UPDATE or DELETE policies exist, ensuring default-deny blocks any log alteration or deletion.
CREATE POLICY "audit_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (
    shop_id = public.get_my_shop_id()
    OR shop_id IN (SELECT shop_id FROM public.user_shops WHERE user_id = auth.uid())
  );
CREATE POLICY "boss_read_audit" ON public.audit_logs
  FOR SELECT USING (
    shop_id = public.get_my_shop_id()
    OR shop_id IN (SELECT shop_id FROM public.user_shops WHERE user_id = auth.uid())
  );

-- ── Payment Proofs ──
CREATE POLICY "boss_insert_proof" ON public.payment_proofs
  FOR INSERT WITH CHECK (
    submitted_by = auth.uid()
    AND (
      shop_id = public.get_my_shop_id()
      OR shop_id IN (SELECT shop_id FROM public.user_shops WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "boss_read_own_proofs" ON public.payment_proofs
  FOR SELECT USING (
    shop_id = public.get_my_shop_id()
    OR shop_id IN (SELECT shop_id FROM public.user_shops WHERE user_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────
-- STEP 8: THE OBSIDIAN PLATFORM (ADMIN PLATFORM SUITE)
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
    CREATE TYPE subscription_tier_enum AS ENUM ('TRIAL', 'MAGANG', 'JURAGAN', 'EKSEKUTIF');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE shop_operational_status AS ENUM ('ACTIVE', 'GRACE_PERIOD', 'CHOKEHOLD', 'SUSPENDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE shops 
ADD COLUMN IF NOT EXISTS subscription_tier subscription_tier_enum DEFAULT 'TRIAL',
ADD COLUMN IF NOT EXISTS operational_status shop_operational_status DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS chokehold_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS grace_period_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cashier_limit INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS active_cashiers_count INT DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_shops_operational_status ON shops(operational_status, chokehold_active);

-- TABEL TIKET ANTRIAN DARURAT (PANIC DISPATCH)
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    issue_type VARCHAR(50) NOT NULL,
    reporter_name VARCHAR(100) NOT NULL,
    reporter_phone VARCHAR(25) NOT NULL,
    telemetry_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    priority VARCHAR(10) NOT NULL DEFAULT 'HIGH',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_to UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    resolution_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status, created_at DESC);

-- TABEL AUDIT TRAIL PERMANEN (IMMUTABLE AUDIT LEDGER)
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES auth.users(id),
    admin_email VARCHAR(150) NOT NULL,
    action_type VARCHAR(60) NOT NULL,
    target_shop_id UUID REFERENCES shops(id),
    reason TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON admin_audit_logs(target_shop_id, created_at DESC);

CREATE OR REPLACE RULE no_update_admin_audit_logs AS ON UPDATE TO admin_audit_logs DO INSTEAD NOTHING;
CREATE OR REPLACE RULE no_delete_admin_audit_logs AS ON DELETE TO admin_audit_logs DO INSTEAD NOTHING;
REVOKE UPDATE, DELETE, TRUNCATE ON admin_audit_logs FROM PUBLIC, authenticated;

-- TABEL MASTER KATALOG BAWAAN (SINGLE SOURCE OF TRUTH)
CREATE TABLE IF NOT EXISTS global_category_templates (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    example_items TEXT NOT NULL,
    display_order INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

INSERT INTO global_category_templates (code, name, example_items, display_order) VALUES
('SBK', 'Sembako & Bahan Pokok', 'Beras, Minyak Goreng, Gula Pasir, Terigu, Telur', 1),
('MNM', 'Minuman & Kopi', 'Air Mineral, Kopi Sachet, Teh, Susu UHT, Soda', 2),
('RKK', 'Rokok & Tembakau', 'Rokok Filter, Kretek, Korek Api, Tembakau', 3),
('SNK', 'Snack & Makanan Ringan', 'Keripik, Biskuit, Wafer, Mie Instan, Cokelat', 4),
('BMB', 'Bumbu & Bahan Dapur', 'Garam, Micin/Penyedap, Kecap, Saus, Santan Instan', 5),
('SBN', 'Sabun & Kebersihan Rumah', 'Deterjen, Sabun Cuci Piring, Pembersih Lantai', 6),
('PRW', 'Perawatan Diri & Mandi', 'Sabun Mandi, Sampo, Pasta Gigi, Deodoran', 7),
('OBT', 'Obat-obatan & Farmasi', 'Parasetamol, Obat Flu, Minyak Kayu Putih, Plester', 8),
('GAS', 'Gas LPG & Galon Air', 'Tabung Gas 3kg/12kg, Air Galon Isi Ulang', 9),
('PLS', 'Pulsa, Token & Tagihan', 'Pulsa HP, Token Listrik PLN, Voucher Game', 10),
('ATK', 'Alat Tulis & Perlengkapan', 'Buku Tulis, Pulpen, Lakban, Amplop', 11)
ON CONFLICT (code) DO NOTHING;

-- AGREGASI TELEMETRI UNTUK ISOLASI KINERJA ANALITIK
CREATE TABLE IF NOT EXISTS platform_daily_telemetry (
    metric_date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
    total_active_shops INT DEFAULT 0,
    gross_volume_idr BIGINT DEFAULT 0,
    total_transactions_count INT DEFAULT 0,
    active_chokeholds_count INT DEFAULT 0,
    open_panic_tickets_count INT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- ✅ SELESAI — Migration script 100% idempotent
-- ─────────────────────────────────────────────────────────────
