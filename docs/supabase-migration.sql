-- ============================================================
-- HL MANAGER PRO — Full SaaS Schema Migration
-- Jalankan seluruh file ini di Supabase SQL Editor (sekali jalan)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- STEP 0: DROP TABEL PRISMA LAMA (fresh start)
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

-- Toko / Tenant induk
CREATE TABLE public.shops (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  owner_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Profil pengguna (extend auth.users)
-- role: 'BOSS' = pemilik toko, 'CASHIER' = kasir
-- shop_id untuk CASHIER: satu kasir hanya boleh di satu toko
-- shop_id untuk BOSS: null (BOSS bisa punya banyak toko via user_shops)
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT UNIQUE,               -- nama tampil di audit log
  role        TEXT NOT NULL DEFAULT 'BOSS' CHECK (role IN ('BOSS', 'CASHIER')),
  shop_id     UUID REFERENCES public.shops(id) ON DELETE SET NULL, -- null = BOSS
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Junction: BOSS bisa punya banyak shops (many-to-many)
CREATE TABLE public.user_shops (
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id  UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, shop_id)
);

-- Langganan per toko
CREATE TABLE public.subscriptions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id        UUID NOT NULL UNIQUE REFERENCES public.shops(id) ON DELETE CASCADE,
  plan           TEXT NOT NULL DEFAULT 'FREE' CHECK (plan IN ('FREE', 'STARTER', 'PRO')),
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
CREATE TABLE public.product_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  code       TEXT NOT NULL,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (shop_id, code)
);

-- Produk (tambah barcode untuk Auto-Scanner)
CREATE TABLE public.products (
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

-- Ensure is_active column on products for Soft-Delete (dilarang Hapus Fisik)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Index untuk pencarian barcode cepat di kasir & query produk aktif
CREATE INDEX idx_products_barcode ON public.products(shop_id, barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_shop_active ON public.products(shop_id, is_active);

-- Pelanggan
CREATE TABLE public.customers (
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
CREATE TABLE public.customer_discounts (
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
CREATE TABLE public.transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id          UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  nomor_bon        TEXT NOT NULL,
  idempotency_key  TEXT UNIQUE,          -- anti race condition (Koreksi #3)
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
  created_by       UUID REFERENCES auth.users(id),  -- kasir yang input
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (shop_id, nomor_bon)
);

CREATE INDEX idx_transactions_shop_status ON public.transactions(shop_id, status, tanggal);
CREATE INDEX idx_transactions_shop_date   ON public.transactions(shop_id, tanggal);

-- Item transaksi
CREATE TABLE public.transaction_items (
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
CREATE TABLE public.bonus_grants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES public.customers(id),
  transaction_id  UUID NOT NULL REFERENCES public.transactions(id),
  bonuses_granted INT NOT NULL,
  omzet_consumed  BIGINT NOT NULL,
  granted_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Void log (kasir hapus item dari keranjang — Starter+)
CREATE TABLE public.void_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  cashier_id    UUID NOT NULL REFERENCES auth.users(id),
  cashier_name  TEXT NOT NULL,
  product_name  TEXT NOT NULL,
  quantity      INT NOT NULL,
  voided_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log (immutable — Pro tier)
CREATE TABLE public.audit_logs (
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

-- Bukti pembayaran QRIS (upload manual oleh BOSS)
CREATE TABLE public.payment_proofs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id          UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  submitted_by     UUID NOT NULL REFERENCES auth.users(id),
  plan_requested   TEXT NOT NULL,     -- STARTER | PRO | ADDON_CASHIER | ADDON_BRANCH
  storage_path     TEXT NOT NULL,     -- path di Supabase Storage bucket
  status           TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  rejection_reason TEXT,
  approved_by      TEXT,              -- email Superadmin yang approve
  approved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- STEP 4: POSTGRESQL TRIGGER — AUTO-SETUP SAAT REGISTER
-- (Koreksi Kritis #1: jangan lakukan ini di level aplikasi!)
-- ─────────────────────────────────────────────────────────────

-- Function: dijalankan SETIAP KALI ada user baru di auth.users
-- Mengambil shop_name dari raw_user_meta_data yang dikirim saat signUp
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER         -- jalan sebagai superuser agar bisa insert ke semua tabel
SET search_path = public
AS $$
DECLARE
  new_shop_id UUID;
  shop_name   TEXT;
BEGIN
  -- Ambil shop_name dari metadata (dikirim dari frontend saat signup)
  shop_name := COALESCE(NEW.raw_user_meta_data->>'shop_name', 'Toko Saya');

  -- 1. Buat toko baru
  INSERT INTO public.shops (name, owner_id)
  VALUES (shop_name, NEW.id)
  RETURNING id INTO new_shop_id;

  -- 2. Buat profil BOSS untuk user ini
  INSERT INTO public.profiles (id, username, role, shop_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)), 'BOSS', NULL);
  -- Note: BOSS shop_id = NULL, relasinya via user_shops

  -- 3. Daftarkan BOSS ke toko via user_shops
  INSERT INTO public.user_shops (user_id, shop_id)
  VALUES (NEW.id, new_shop_id);

  -- 4. Buat subscription FREE untuk toko ini
  INSERT INTO public.subscriptions (shop_id, plan, valid_until, max_cashiers, max_branches)
  VALUES (new_shop_id, 'FREE', NULL, 1, 1);

  RETURN NEW;
END;
$$;

-- Pasang trigger di tabel auth.users milik Supabase
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- STEP 5: TRIGGER AUDIT LOG (immutable — Pro tier, Fase 3)
-- ─────────────────────────────────────────────────────────────

-- Catat setiap perubahan harga produk ke audit_logs
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

CREATE TRIGGER audit_product_price
  AFTER UPDATE OF harga_base, harga_modal ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.log_product_price_change();

-- Catat perubahan status transaksi (Lunas/Piutang)
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

CREATE TRIGGER audit_transaction_status
  AFTER UPDATE OF status ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.log_transaction_status_change();

-- ─────────────────────────────────────────────────────────────
-- STEP 6: HELPER FUNCTION (dipakai RLS)
-- ─────────────────────────────────────────────────────────────

-- Fungsi: ambil shop_id user dari profiles atau user_shops (multi-tenant helper)
-- Ditulis di schema public (bukan auth) agar tidak kena 'permission denied for schema auth'
CREATE OR REPLACE FUNCTION public.get_my_shop_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    (SELECT shop_id FROM public.profiles WHERE id = auth.uid()),
    (SELECT shop_id FROM public.user_shops WHERE user_id = auth.uid() LIMIT 1)
  )
$$;

-- ─────────────────────────────────────────────────────────────
-- STEP 7: ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────

-- Enable RLS di semua tabel
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
-- BOSS bisa lihat shop yang dia miliki via user_shops / get_my_shop_id
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

-- ── Audit Logs ── INSERT + SELECT, NO DELETE (immutable)
CREATE POLICY "audit_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (
    shop_id = public.get_my_shop_id()
    OR shop_id IN (SELECT shop_id FROM public.user_shops WHERE user_id = auth.uid())
  );
CREATE POLICY "boss_read_audit" ON public.audit_logs
  FOR SELECT USING (
    shop_id IN (SELECT shop_id FROM public.user_shops WHERE user_id = auth.uid())
  );
-- ⚠️ DELETE policy SENGAJA tidak dibuat — audit_logs adalah append-only, immutable by design

-- ── Payment Proofs ──
-- (A) BOSS bisa INSERT bukti bayar untuk shop miliknya
CREATE POLICY "boss_insert_proof" ON public.payment_proofs
  FOR INSERT WITH CHECK (
    submitted_by = auth.uid()
    AND shop_id IN (SELECT shop_id FROM public.user_shops WHERE user_id = auth.uid())
  );
-- (B) BOSS bisa SELECT riwayat pembayaran shop mereka (cek status Pending/Approved/Rejected)
-- Koreksi Kritis #2: tanpa ini, BOSS upload bukti tapi tidak bisa lihat statusnya
CREATE POLICY "boss_read_own_proofs" ON public.payment_proofs
  FOR SELECT USING (
    shop_id IN (SELECT shop_id FROM public.user_shops WHERE user_id = auth.uid())
  );
-- Superadmin gunakan Service Role Key (bypass semua RLS) — tidak perlu policy khusus

-- ─────────────────────────────────────────────────────────────
-- STEP 8: SUPABASE STORAGE BUCKET
-- (Jalankan manual di Supabase Dashboard > Storage > New Bucket)
-- ─────────────────────────────────────────────────────────────
-- Buat bucket: payment-proofs
-- Settings: Private bucket (bukan public)
-- Max file size: 5 MB
-- Allowed MIME types: image/jpeg, image/png, image/webp
-- RLS policy di Storage: authenticated users hanya bisa upload ke path {user_id}/*

-- ─────────────────────────────────────────────────────────────
-- STEP 9: SEED DATA DUMMY (jalankan setelah signup akun pertama)
-- ─────────────────────────────────────────────────────────────
-- Setelah signup, ambil shop_id dari tabel shops lalu gunakan untuk seed:

-- Contoh seed produk (ganti <YOUR_SHOP_ID>):
-- INSERT INTO public.products (shop_id, nama, barcode, harga_modal, harga_base, stock, tipe)
-- VALUES
--   ('<YOUR_SHOP_ID>', 'Indomie Goreng', '8992388100404', 2500, 3200, 100, 'MIE'),
--   ('<YOUR_SHOP_ID>', 'Aqua 600ml', '8886011100252', 2000, 2500, 50, 'AIR'),
--   ('<YOUR_SHOP_ID>', 'Sabun Lifebuoy', '8710908508967', 3500, 4500, 30, 'SABUN');

-- ─────────────────────────────────────────────────────────────
-- ✅ SELESAI — Schema siap digunakan
-- ─────────────────────────────────────────────────────────────
