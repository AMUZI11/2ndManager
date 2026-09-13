-- ==============================================================================
-- 2NDMANAGER: ROOT ANCHOR STORE (TOKO A) & MULTI-BRANCH HIERARCHY SCHEMA
-- ==============================================================================

-- 1. Perbaikan Kolom & Relasi Hierarki pada Tabel 'branches'
ALTER TABLE public.branches 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS is_main_branch BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS parent_branch_id UUID REFERENCES public.branches(id) ON DELETE RESTRICT;

-- Sinkronisasi name dan branch_name jika salah satu kosong
UPDATE public.branches SET name = branch_name WHERE name IS NULL AND branch_name IS NOT NULL;
UPDATE public.branches SET branch_name = name WHERE branch_name IS NULL AND name IS NOT NULL;

-- 2. Perbaikan Metadata Pengguna pada Tabel 'profiles'
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS default_branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- 3. Indeks Performa untuk Hierarki & Topologi Cabang
CREATE INDEX IF NOT EXISTS idx_branches_hierarchy 
ON public.branches(organization_id, parent_branch_id, is_main_branch);

-- 4. Constraint Integritas: Tepat 1 Toko Utama (Toko A) per Organisasi
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_main_branch_per_org 
ON public.branches (organization_id) 
WHERE is_main_branch = TRUE;

-- 5. Trigger Guard: Larangan Mutlak Menghapus Toko Utama (Toko A)
CREATE OR REPLACE FUNCTION public.prevent_main_branch_deletion()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.is_main_branch = TRUE THEN
    RAISE EXCEPTION '2NDM-40301: Toko Utama (Toko A) adalah jangkar organisasi dan tidak dapat dihapus!';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_main_branch_deletion ON public.branches;
CREATE TRIGGER trg_prevent_main_branch_deletion
  BEFORE DELETE ON public.branches
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_main_branch_deletion();

-- 6. RPC: Registrasi Onboarding Owner & Toko A Atomik (Zero Breaking Change)
CREATE OR REPLACE FUNCTION public.register_owner_with_store(
  p_user_id UUID,
  p_owner_name TEXT,
  p_store_name TEXT,
  p_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_root_branch_id UUID;
  v_sub_id UUID;
  v_shop_id UUID;
BEGIN
  -- 1. Cek apakah user sudah memiliki Toko A / Organisasi
  SELECT organization_id INTO v_org_id
  FROM public.profiles
  WHERE id = p_user_id AND organization_id IS NOT NULL;

  IF v_org_id IS NOT NULL THEN
    SELECT id, shop_id INTO v_root_branch_id, v_shop_id
    FROM public.branches
    WHERE organization_id = v_org_id AND is_main_branch = TRUE
    LIMIT 1;

    IF v_root_branch_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'organization_id', v_org_id,
        'root_branch_id', v_root_branch_id,
        'shop_id', v_shop_id,
        'store_name', p_store_name,
        'message', 'User sudah terdaftar dengan Toko Utama.'
      );
    END IF;
  END IF;

  -- 2. Buat Entitas Organisasi (Wadah Bisnis Owner)
  INSERT INTO public.organizations (
    name,
    owner_id,
    tier_id,
    created_at
  ) VALUES (
    p_store_name || ' Group',
    p_user_id,
    'MAGANG',
    NOW()
  ) RETURNING id INTO v_org_id;

  -- 3. Inisialisasi Langganan Organisasi (Dihitung 1 Owner Berlangganan)
  INSERT INTO public.organization_subscriptions (
    organization_id,
    current_tier,
    starts_at,
    expires_at,
    grace_period_ends_at
  ) VALUES (
    v_org_id,
    'MAGANG',
    NOW(),
    NOW() + INTERVAL '30 days',
    NOW() + INTERVAL '33 days'
  ) RETURNING id INTO v_sub_id;

  -- 4. Buat Toko di Tabel Warisan shops (Zero Breaking Change untuk POS Kasir & Transaksi)
  INSERT INTO public.shops (
    name,
    owner_id,
    subscription_tier,
    operational_status,
    created_at
  ) VALUES (
    p_store_name,
    p_user_id,
    'MAGANG'::subscription_tier_enum,
    'ACTIVE'::shop_operational_status,
    NOW()
  ) RETURNING id INTO v_shop_id;

  -- 5. Buat TOKO A sebagai Root Genesis Anchor Branch
  INSERT INTO public.branches (
    organization_id,
    shop_id,
    name,
    branch_name,
    branch_code,
    is_main_branch,
    parent_branch_id,
    address,
    phone_number,
    is_active,
    created_at
  ) VALUES (
    v_org_id,
    v_shop_id,
    p_store_name,
    p_store_name,
    'CBG-01',
    TRUE,         -- Menandai Toko A (Root)
    NULL,         -- Root tidak punya induk
    'Kantor Pusat',
    p_phone,
    TRUE,
    NOW()
  ) RETURNING id INTO v_root_branch_id;

  -- 6. Hubungkan Hak Akses Kasir/Owner ke user_shops
  INSERT INTO public.user_shops (user_id, shop_id)
  VALUES (p_user_id, v_shop_id)
  ON CONFLICT DO NOTHING;

  -- 7. Sinkronisasi langganan tabel legacy subscriptions (untuk modul kuota kasir)
  INSERT INTO public.subscriptions (shop_id, plan, valid_until, max_cashiers, max_branches)
  VALUES (v_shop_id, 'MAGANG', NOW() + INTERVAL '30 days', 1, 1)
  ON CONFLICT (shop_id) DO UPDATE 
    SET plan = 'MAGANG', valid_until = NOW() + INTERVAL '30 days';

  -- 8. Hubungkan Metadata Pengguna di profiles
  UPDATE public.profiles 
  SET 
    organization_id = v_org_id,
    default_branch_id = v_root_branch_id,
    shop_id = v_shop_id,
    role = 'BOSS',
    full_name = p_owner_name,
    phone_number = p_phone,
    subscription_plan = 'MAGANG'
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.profiles (
      id,
      username,
      role,
      shop_id,
      organization_id,
      default_branch_id,
      full_name,
      phone_number,
      subscription_plan
    ) VALUES (
      p_user_id,
      p_owner_name,
      'BOSS',
      v_shop_id,
      v_org_id,
      v_root_branch_id,
      p_owner_name,
      p_phone,
      'MAGANG'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', v_org_id,
    'subscription_id', v_sub_id,
    'root_branch_id', v_root_branch_id,
    'shop_id', v_shop_id,
    'store_name', p_store_name,
    'message', 'Registrasi berhasil: 1 Owner terdaftar dengan Toko Utama (Toko A).'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Gagal mendaftarkan toko: %', SQLERRM;
END;
$$;

-- 7. RPC: Penambahan Cabang Anak di Bawah Toko A
CREATE OR REPLACE FUNCTION public.create_child_branch(
  p_org_id UUID,
  p_branch_name TEXT,
  p_address TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_root_branch RECORD;
  v_current_tier TEXT := 'MAGANG';
  v_is_expired BOOLEAN := FALSE;
  v_current_branch_count INT;
  v_max_branches INT;
  v_new_branch_id UUID;
  v_new_shop_id UUID;
  v_owner_id UUID;
  v_branch_code TEXT;
BEGIN
  -- 1. Dapatkan Toko A (Root Genesis Branch)
  SELECT id, name, branch_name, shop_id INTO v_root_branch 
  FROM public.branches 
  WHERE organization_id = p_org_id AND is_main_branch = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '2NDM-40401: Toko Utama (Toko A) tidak ditemukan untuk organisasi ini.';
  END IF;

  -- Ambil ID Owner dari tabel organizations
  SELECT owner_id, tier_id INTO v_owner_id, v_current_tier
  FROM public.organizations
  WHERE id = p_org_id;

  -- 2. Cek Hak Akses Tier Langganan dari v_active_organization_subscriptions
  BEGIN
    SELECT current_tier, is_expired INTO v_current_tier, v_is_expired
    FROM public.v_active_organization_subscriptions
    WHERE organization_id = p_org_id;
  EXCEPTION WHEN OTHERS THEN
    v_is_expired := FALSE;
  END;

  IF v_current_tier IS NULL THEN
    SELECT tier_id INTO v_current_tier FROM public.organizations WHERE id = p_org_id;
  END IF;

  IF v_is_expired = TRUE THEN
    RAISE EXCEPTION '2NDM-40302: Masa aktif langganan habis. Tidak dapat menambah cabang.';
  END IF;

  -- Eksekutif max 3 gerai, selain itu (Magang/Supervisor) max 1 gerai
  v_max_branches := CASE WHEN UPPER(COALESCE(v_current_tier, 'MAGANG')) = 'EKSEKUTIF' THEN 3 ELSE 1 END;

  SELECT COUNT(*) INTO v_current_branch_count 
  FROM public.branches 
  WHERE organization_id = p_org_id AND is_active = TRUE;

  IF v_current_branch_count >= v_max_branches THEN
    RAISE EXCEPTION '2NDM-40303: Batas kuota cabang tercapai (% gerai). Upgrade ke Tier Eksekutif untuk menambah cabang.', v_max_branches;
  END IF;

  -- 3. Buat Entitas Toko di tabel shops (Zero Breaking Change untuk POS Kasir & Transaksi)
  INSERT INTO public.shops (
    name,
    owner_id,
    parent_shop_id,
    subscription_tier,
    operational_status,
    created_at
  ) VALUES (
    p_branch_name,
    v_owner_id,
    v_root_branch.shop_id,
    CASE 
      WHEN UPPER(COALESCE(v_current_tier, 'MAGANG')) = 'EKSEKUTIF' THEN 'EKSEKUTIF'::subscription_tier_enum
      ELSE 'MAGANG'::subscription_tier_enum
    END,
    'ACTIVE'::shop_operational_status,
    NOW()
  ) RETURNING id INTO v_new_shop_id;

  -- Hubungkan hak akses Owner ke cabang anak di user_shops
  IF v_owner_id IS NOT NULL THEN
    INSERT INTO user_shops (user_id, shop_id)
    VALUES (v_owner_id, v_new_shop_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- 4. Sisipkan Cabang Baru Sebagai Anak Toko A di branches
  v_branch_code := 'CBG-0' || (v_current_branch_count + 1);

  INSERT INTO public.branches (
    organization_id,
    shop_id,
    name,
    branch_name,
    branch_code,
    address,
    phone_number,
    is_main_branch,
    parent_branch_id, -- Terikat eksplisit ke Toko A
    is_active,
    created_at
  ) VALUES (
    p_org_id,
    v_new_shop_id,
    p_branch_name,
    p_branch_name,
    v_branch_code,
    p_address,
    p_phone,
    FALSE,
    v_root_branch.id,
    TRUE,
    NOW()
  ) RETURNING id INTO v_new_branch_id;

  RETURN jsonb_build_object(
    'success', true,
    'branch_id', v_new_branch_id,
    'shop_id', v_new_shop_id,
    'branch_name', p_branch_name,
    'branch_code', v_branch_code,
    'parent_branch_id', v_root_branch.id,
    'parent_store_name', COALESCE(v_root_branch.name, v_root_branch.branch_name),
    'message', 'Cabang baru berhasil dibuat sebagai anak dari ' || COALESCE(v_root_branch.name, v_root_branch.branch_name)
  );
END;
$$;
