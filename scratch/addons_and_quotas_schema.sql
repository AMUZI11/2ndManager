-- ==============================================================================
-- 2NDMANAGER: ADD-ONS & QUOTAS SCHEMA MIGRATION
-- ==============================================================================

-- 1. Modifikasi Tabel 'organization_subscriptions'
ALTER TABLE public.organization_subscriptions
ADD COLUMN IF NOT EXISTS extra_branches_quota INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS extra_cashiers_quota INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS extra_branches_unit_price NUMERIC(15,2) NOT NULL DEFAULT 150000,
ADD COLUMN IF NOT EXISTS extra_cashiers_unit_price NUMERIC(15,2) NOT NULL DEFAULT 40000,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.organization_subscriptions
ALTER COLUMN extra_branches_unit_price SET DEFAULT 150000,
ALTER COLUMN extra_cashiers_unit_price SET DEFAULT 40000;

-- Update data lama jika ada
UPDATE public.organization_subscriptions
SET 
  extra_branches_unit_price = 150000,
  extra_cashiers_unit_price = 40000
WHERE extra_branches_unit_price = 100000 OR extra_cashiers_unit_price = 20000;

-- 2. Modifikasi Tabel 'profiles' untuk status aktif kasir
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Backfill organization_id pada profiles untuk kasir yang belum memiliki organization_id
UPDATE public.profiles p
SET organization_id = b.organization_id
FROM public.branches b
WHERE (p.shop_id = b.shop_id OR p.shop_id = b.id)
  AND p.organization_id IS NULL;

-- 3. Modifikasi Tabel 'payment_claims' untuk rincian add-on
ALTER TABLE public.payment_claims
ADD COLUMN IF NOT EXISTS addon_branches_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS addon_cashiers_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS addon_total_amount NUMERIC(15,2) DEFAULT 0;

-- 3b. Fungsi Penegakan Otorisasi Fitur Payung (Umbrella Feature Resolver)
CREATE OR REPLACE FUNCTION public.get_organization_feature_tier(p_org_id UUID)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier VARCHAR(50);
  v_is_active BOOLEAN;
BEGIN
  SELECT current_tier, (expires_at > NOW()) INTO v_tier, v_is_active
  FROM public.organization_subscriptions
  WHERE organization_id = p_org_id;

  IF NOT FOUND OR v_is_active IS FALSE THEN
    RETURN 'RINTISAN'; -- Fallback ke tier gratis jika expired
  END IF;

  RETURN v_tier;
END;
$$;

-- 4. View Kalkulasi Kuota Efektif ('v_organization_effective_quotas')
CREATE OR REPLACE VIEW public.v_organization_effective_quotas AS
SELECT 
  os.organization_id,
  os.current_tier,
  os.expires_at,
  os.grace_period_ends_at,
  (os.is_active AND (os.grace_period_ends_at IS NULL OR os.grace_period_ends_at > NOW())) AS is_active,
  os.extra_branches_quota,
  os.extra_cashiers_quota,
  os.extra_branches_unit_price,
  os.extra_cashiers_unit_price,
  -- Basis Kuota Cabang berdasarkan Tier
  (CASE 
    WHEN UPPER(os.current_tier) IN ('JURAGAN_CABANG', 'EKSEKUTIF') THEN 3
    ELSE 1 
  END) AS base_branches_quota,
  -- Kuota Maksimal Cabang (Tier + Add-on)
  (CASE 
    WHEN UPPER(os.current_tier) IN ('JURAGAN_CABANG', 'EKSEKUTIF') THEN 3
    ELSE 1 
  END + os.extra_branches_quota) AS max_allowed_branches,

  -- Basis Kuota Kasir berdasarkan Tier
  (CASE 
    WHEN UPPER(os.current_tier) IN ('RINTISAN', 'MAGANG') THEN 1
    WHEN UPPER(os.current_tier) IN ('MANDIRI', 'SUPERVISOR') THEN 2
    WHEN UPPER(os.current_tier) IN ('USAHA_BERKEMBANG', 'MANAJER') THEN 4
    WHEN UPPER(os.current_tier) IN ('JURAGAN_CABANG', 'EKSEKUTIF') THEN 8
    ELSE 8 
  END) AS base_cashiers_quota,
  -- Kuota Maksimal Kasir (Tier + Add-on)
  (CASE 
    WHEN UPPER(os.current_tier) IN ('RINTISAN', 'MAGANG') THEN 1
    WHEN UPPER(os.current_tier) IN ('MANDIRI', 'SUPERVISOR') THEN 2
    WHEN UPPER(os.current_tier) IN ('USAHA_BERKEMBANG', 'MANAJER') THEN 4
    WHEN UPPER(os.current_tier) IN ('JURAGAN_CABANG', 'EKSEKUTIF') THEN 8
    ELSE 8 
  END + os.extra_cashiers_quota) AS max_allowed_cashiers,

  -- Jumlah Entitas Aktif Saat Ini
  (SELECT COUNT(*) 
   FROM public.branches b 
   WHERE b.organization_id = os.organization_id 
     AND b.is_active = TRUE) AS current_active_branches,

  (SELECT COUNT(DISTINCT p.id) 
   FROM public.profiles p 
   LEFT JOIN public.user_shops us ON us.user_id = p.id
   LEFT JOIN public.branches b ON (b.shop_id = us.shop_id OR b.id = us.shop_id OR b.shop_id = p.shop_id OR b.id = p.shop_id)
   WHERE (p.organization_id = os.organization_id OR b.organization_id = os.organization_id)
     AND p.role = 'CASHIER' 
     AND COALESCE(p.is_active, TRUE) = TRUE) AS current_active_cashiers
FROM public.organization_subscriptions os;

-- 5. Trigger Proteksi Penambahan Cabang Melebihi Kuota Efektif
CREATE OR REPLACE FUNCTION public.check_branch_quota_before_insert()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_effective RECORD;
BEGIN
  -- Hanya cek jika cabang berstatus aktif
  IF NEW.is_active = TRUE THEN
    SELECT max_allowed_branches, current_active_branches INTO v_effective
    FROM public.v_organization_effective_quotas
    WHERE organization_id = NEW.organization_id;

    IF FOUND THEN
      -- Pada saat INSERT, atau UPDATE dari inactive -> active
      IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND (OLD.is_active IS DISTINCT FROM TRUE)) THEN
        IF v_effective.current_active_branches >= v_effective.max_allowed_branches THEN
          RAISE EXCEPTION '2NDM-40310: Kuota cabang penuh (% gerai). Tambah slot cabang di menu Billing untuk membuka cabang baru.', v_effective.max_allowed_branches;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_branch_quota ON public.branches;
CREATE TRIGGER trg_check_branch_quota
  BEFORE INSERT OR UPDATE OF is_active, organization_id ON public.branches
  FOR EACH ROW
  EXECUTE FUNCTION public.check_branch_quota_before_insert();

-- 6. Trigger Proteksi Penambahan Kasir Melebihi Kuota Efektif
CREATE OR REPLACE FUNCTION public.check_cashier_quota_before_insert()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_effective RECORD;
  v_target_org_id UUID;
BEGIN
  IF NEW.role = 'CASHIER' AND COALESCE(NEW.is_active, TRUE) = TRUE THEN
    v_target_org_id := NEW.organization_id;

    -- Jika organization_id null, cari melalui shop_id / branch
    IF v_target_org_id IS NULL AND NEW.shop_id IS NOT NULL THEN
      SELECT organization_id INTO v_target_org_id
      FROM public.branches
      WHERE shop_id = NEW.shop_id OR id = NEW.shop_id
      LIMIT 1;
      
      IF v_target_org_id IS NOT NULL THEN
        NEW.organization_id := v_target_org_id;
      END IF;
    END IF;

    IF v_target_org_id IS NOT NULL THEN
      SELECT max_allowed_cashiers, current_active_cashiers INTO v_effective
      FROM public.v_organization_effective_quotas
      WHERE organization_id = v_target_org_id;

      IF FOUND THEN
        IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND (OLD.is_active IS DISTINCT FROM TRUE OR OLD.role <> 'CASHIER')) THEN
          IF v_effective.current_active_cashiers >= v_effective.max_allowed_cashiers THEN
            RAISE EXCEPTION '2NDM-40311: Kuota kasir penuh (% staf). Beli add-on slot kasir di menu Billing.', v_effective.max_allowed_cashiers;
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_cashier_quota ON public.profiles;
CREATE TRIGGER trg_check_cashier_quota
  BEFORE INSERT OR UPDATE OF is_active, organization_id, role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_cashier_quota_before_insert();

-- 7. Stored Procedure Downgrade Guard (RPC 'validate_addon_quota_reduction')
CREATE OR REPLACE FUNCTION public.validate_addon_quota_reduction(
  p_org_id UUID,
  p_new_extra_branches INT,
  p_new_extra_cashiers INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_effective RECORD;
  v_new_max_branches INT;
  v_new_max_cashiers INT;
BEGIN
  SELECT * INTO v_effective
  FROM public.v_organization_effective_quotas
  WHERE organization_id = p_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '2NDM-40410: Organisasi tidak ditemukan atau belum memiliki langganan aktif.';
  END IF;

  v_new_max_branches := v_effective.base_branches_quota + GREATEST(0, p_new_extra_branches);
  v_new_max_cashiers := v_effective.base_cashiers_quota + GREATEST(0, p_new_extra_cashiers);

  IF v_new_max_branches < v_effective.current_active_branches THEN
    RAISE EXCEPTION 'Nonaktifkan atau arsipkan cabang terlebih dahulu sebelum mengurangi kuota add-on! (Aktif: % gerai, Kuota Baru: % gerai)', 
      v_effective.current_active_branches, v_new_max_branches;
  END IF;

  IF v_new_max_cashiers < v_effective.current_active_cashiers THEN
    RAISE EXCEPTION 'Nonaktifkan atau arsipkan kasir terlebih dahulu sebelum mengurangi kuota add-on! (Aktif: % staf, Kuota Baru: % staf)', 
      v_effective.current_active_cashiers, v_new_max_cashiers;
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'new_max_branches', v_new_max_branches,
    'new_max_cashiers', v_new_max_cashiers,
    'message', 'Validasi penurunan kuota berhasil.'
  );
END;
$$;

-- 8. RPC: Aktivasi / Update Add-on Quota Langganan
CREATE OR REPLACE FUNCTION public.apply_subscription_addons(
  p_org_id UUID,
  p_additional_branches INT,
  p_additional_cashiers INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub RECORD;
  v_new_extra_branches INT;
  v_new_extra_cashiers INT;
BEGIN
  SELECT id, extra_branches_quota, extra_cashiers_quota INTO v_sub
  FROM public.organization_subscriptions
  WHERE organization_id = p_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '2NDM-40411: Langganan organisasi tidak ditemukan.';
  END IF;

  v_new_extra_branches := v_sub.extra_branches_quota + GREATEST(0, p_additional_branches);
  v_new_extra_cashiers := v_sub.extra_cashiers_quota + GREATEST(0, p_additional_cashiers);

  UPDATE public.organization_subscriptions
  SET 
    extra_branches_quota = v_new_extra_branches,
    extra_cashiers_quota = v_new_extra_cashiers,
    updated_at = NOW()
  WHERE organization_id = p_org_id;

  RETURN jsonb_build_object(
    'success', true,
    'extra_branches_quota', v_new_extra_branches,
    'extra_cashiers_quota', v_new_extra_cashiers,
    'message', 'Add-on berhasil diaktifkan secara instan.'
  );
END;
$$;

-- 9. Pembaruan RPC create_child_branch agar menghormati kuota efektif (Tier + Add-on)
CREATE OR REPLACE FUNCTION public.create_child_branch(
  p_org_id UUID,
  p_branch_name TEXT,
  p_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_root_branch RECORD;
  v_effective RECORD;
  v_new_branch_id UUID;
  v_shop_id UUID;
BEGIN
  -- 1. Dapatkan Toko A (Root Branch)
  SELECT id, name, shop_id INTO v_root_branch
  FROM public.branches
  WHERE organization_id = p_org_id AND is_main_branch = TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION '2NDM-40401: Toko Utama (Toko A) tidak ditemukan untuk organisasi ini.';
  END IF;

  -- 2. Cek Kuota Efektif (Tier Dasar + Add-on)
  SELECT * INTO v_effective
  FROM public.v_organization_effective_quotas
  WHERE organization_id = p_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '2NDM-40402: Data langganan organisasi tidak ditemukan.';
  END IF;

  IF NOT v_effective.is_active THEN
    RAISE EXCEPTION '2NDM-40302: Masa aktif langganan habis. Tidak dapat menambah cabang.';
  END IF;

  IF v_effective.current_active_branches >= v_effective.max_allowed_branches THEN
    RAISE EXCEPTION '2NDM-40310: Kuota cabang penuh (% gerai). Tambah slot cabang di menu Billing untuk membuka cabang baru.', v_effective.max_allowed_branches;
  END IF;

  -- 3. Sinkronisasi entitas tabel shops (Zero breaking change untuk POS & Transaksi)
  INSERT INTO public.shops (
    name,
    owner_id,
    address,
    created_at
  ) VALUES (
    p_branch_name,
    (SELECT owner_id FROM public.organizations WHERE id = p_org_id),
    p_address,
    NOW()
  ) RETURNING id INTO v_shop_id;

  -- 4. Sisipkan Cabang Baru Sebagai Anak Toko A
  INSERT INTO public.branches (
    organization_id,
    shop_id,
    name,
    branch_name,
    address,
    is_main_branch,
    parent_branch_id,
    is_active,
    created_at
  ) VALUES (
    p_org_id,
    v_shop_id,
    p_branch_name,
    p_branch_name,
    p_address,
    FALSE,
    v_root_branch.id,
    TRUE,
    NOW()
  ) RETURNING id INTO v_new_branch_id;

  -- 5. Beri hak akses Owner ke cabang baru di user_shops
  INSERT INTO public.user_shops (user_id, shop_id)
  VALUES (
    (SELECT owner_id FROM public.organizations WHERE id = p_org_id),
    v_shop_id
  ) ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'branch_id', v_new_branch_id,
    'shop_id', v_shop_id,
    'branch_name', p_branch_name,
    'parent_branch_id', v_root_branch.id,
    'parent_store_name', v_root_branch.name,
    'message', 'Cabang baru berhasil dibuat sebagai anak dari ' || v_root_branch.name
  );
END;
$$;
