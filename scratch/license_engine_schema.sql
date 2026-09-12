-- ==============================================================================
-- 2ndManager - TAHAP 10: GRASSROOTS LICENSE ENGINE & SUBSCRIPTION ARCHITECTURE
-- File: scratch/license_engine_schema.sql
-- ==============================================================================

-- 1. Tabel Pengelolaan Token Lisensi (Voucher Fisik / Digital 16-Digit)
CREATE TABLE IF NOT EXISTS license_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_code VARCHAR(19) NOT NULL UNIQUE, -- Format: 2NDM-XXXX-XXXX-XXXX
  tier_id VARCHAR(30) NOT NULL,           -- 'SUPERVISOR', 'MANAJER', 'EKSEKUTIF'
  duration_days INT NOT NULL DEFAULT 30,  -- 30, 90, 365, 3650 (Lifetime)
  hmac_signature VARCHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'UNUSED' CHECK (status IN ('UNUSED', 'REDEEMED', 'REVOKED', 'EXPIRED')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_by_org UUID REFERENCES organizations(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_tokens_lookup ON license_tokens(token_code, status);
CREATE INDEX IF NOT EXISTS idx_license_tokens_org ON license_tokens(redeemed_by_org);

-- 2. Tabel Langganan Organisasi Aktif (Active Subscriptions)
CREATE TABLE IF NOT EXISTS organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  current_tier VARCHAR(30) NOT NULL DEFAULT 'MAGANG',
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  grace_period_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '33 days'), -- H+3
  active_license_token_id UUID REFERENCES license_tokens(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_sub_org_id ON organization_subscriptions(organization_id);

-- 3. View Status Subscription Dinamis (Resolusi Immutability PostgreSQL)
CREATE OR REPLACE VIEW v_active_organization_subscriptions AS
SELECT 
  sub.id,
  sub.organization_id,
  sub.current_tier,
  sub.starts_at,
  sub.expires_at,
  sub.grace_period_ends_at,
  sub.active_license_token_id,
  sub.updated_at,
  (NOW() > sub.expires_at AND NOW() <= sub.grace_period_ends_at) AS is_in_grace_period,
  (NOW() > sub.grace_period_ends_at) AS is_expired,
  GREATEST(0, EXTRACT(DAY FROM (sub.expires_at - NOW())))::INT AS days_remaining,
  GREATEST(0, EXTRACT(EPOCH FROM (sub.grace_period_ends_at - NOW())))::BIGINT AS grace_seconds_remaining
FROM organization_subscriptions sub;

-- 4. Stored Procedure: Aktivasi Token Lisensi Atomik (FOR UPDATE)
CREATE OR REPLACE FUNCTION redeem_license_token(
  p_org_id UUID, 
  p_token_code TEXT, 
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token RECORD;
  v_sub RECORD;
  v_new_expires_at TIMESTAMPTZ;
  v_new_grace_ends_at TIMESTAMPTZ;
  v_effective_starts_at TIMESTAMPTZ;
  v_org_name TEXT;
BEGIN
  -- 1. Validasi Organisasi
  SELECT name INTO v_org_name FROM organizations WHERE id = p_org_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organisasi tidak ditemukan.';
  END IF;

  -- 2. Kunci baris token secara eksklusif (Anti Race Condition & Double Redemption)
  SELECT * INTO v_token 
  FROM license_tokens 
  WHERE token_code = UPPER(TRIM(p_token_code)) 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kode voucher tidak valid.';
  END IF;

  IF v_token.status <> 'UNUSED' THEN
    RAISE EXCEPTION 'Kode voucher sudah digunakan atau tidak aktif.';
  END IF;

  -- 3. Ambil data langganan organisasi yang sedang berjalan
  SELECT * INTO v_sub 
  FROM organization_subscriptions 
  WHERE organization_id = p_org_id 
  FOR UPDATE;

  -- 4. Hitung tanggal kedaluwarsa baru
  IF v_sub.id IS NOT NULL AND v_sub.current_tier = v_token.tier_id AND v_sub.expires_at > NOW() THEN
    -- Akumulasi durasi hari jika tier identik dan masih aktif
    v_effective_starts_at := v_sub.starts_at;
    v_new_expires_at := v_sub.expires_at + (v_token.duration_days * INTERVAL '1 day');
  ELSE
    -- Reset masa aktif baru jika tier naik/berbeda atau sudah expired
    v_effective_starts_at := NOW();
    v_new_expires_at := NOW() + (v_token.duration_days * INTERVAL '1 day');
  END IF;

  v_new_grace_ends_at := v_new_expires_at + INTERVAL '3 days';

  -- 5. Perbarui status token menjadi REDEEMED
  UPDATE license_tokens
  SET 
    status = 'REDEEMED',
    redeemed_by_org = p_org_id,
    redeemed_at = NOW()
  WHERE id = v_token.id;

  -- 6. Upsert ke organization_subscriptions
  IF v_sub.id IS NOT NULL THEN
    UPDATE organization_subscriptions
    SET 
      current_tier = v_token.tier_id,
      starts_at = v_effective_starts_at,
      expires_at = v_new_expires_at,
      grace_period_ends_at = v_new_grace_ends_at,
      active_license_token_id = v_token.id,
      updated_at = NOW()
    WHERE id = v_sub.id;
  ELSE
    INSERT INTO organization_subscriptions (
      organization_id,
      current_tier,
      starts_at,
      expires_at,
      grace_period_ends_at,
      active_license_token_id,
      updated_at
    ) VALUES (
      p_org_id,
      v_token.tier_id,
      v_effective_starts_at,
      v_new_expires_at,
      v_new_grace_ends_at,
      v_token.id,
      NOW()
    );
  END IF;

  -- 7. Sinkronkan tier organisasi
  UPDATE organizations 
  SET tier_id = v_token.tier_id 
  WHERE id = p_org_id;

  -- 8. Jika tier adalah EKSEKUTIF, pulihkan seluruh cabang yang sempat di-suspend
  IF v_token.tier_id = 'EKSEKUTIF' THEN
    UPDATE branches
    SET is_active = TRUE
    WHERE organization_id = p_org_id;
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'tier', v_token.tier_id,
    'duration_days', v_token.duration_days,
    'expires_at', v_new_expires_at,
    'grace_period_ends_at', v_new_grace_ends_at,
    'message', 'Selamat! Lisensi ' || v_token.tier_id || ' berhasil diaktifkan.'
  );
END;
$$;

-- 5. Stored Procedure: Evaluasi Status Langganan & Graceful Downgrade
CREATE OR REPLACE FUNCTION evaluate_subscription_status(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sub RECORD;
  v_effective_tier VARCHAR(30);
  v_is_grace BOOLEAN;
  v_is_expired BOOLEAN;
BEGIN
  SELECT * INTO v_sub 
  FROM v_active_organization_subscriptions 
  WHERE organization_id = p_org_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'tier', 'MAGANG',
      'is_in_grace', FALSE,
      'is_expired', TRUE,
      'days_remaining', 0,
      'grace_seconds_remaining', 0,
      'expires_at', NULL,
      'active_branches_allowed', 1
    );
  END IF;

  v_is_grace := v_sub.is_in_grace_period;
  v_is_expired := v_sub.is_expired;

  -- Terapkan graceful downgrade jika sudah kedaluwarsa melewati H+3
  IF v_is_expired THEN
    v_effective_tier := 'MAGANG';
    
    -- Tangguhkan cabang non-pusat (read-only mode, data aman tidak dihapus)
    UPDATE branches 
    SET is_active = FALSE 
    WHERE organization_id = p_org_id AND is_main_branch = FALSE;
    
    UPDATE organizations 
    SET tier_id = 'MAGANG' 
    WHERE id = p_org_id;
  ELSE
    v_effective_tier := v_sub.current_tier;
  END IF;

  RETURN jsonb_build_object(
    'tier', v_effective_tier,
    'is_in_grace', v_is_grace,
    'is_expired', v_is_expired,
    'days_remaining', v_sub.days_remaining,
    'grace_seconds_remaining', v_sub.grace_seconds_remaining,
    'expires_at', v_sub.expires_at,
    'grace_period_ends_at', v_sub.grace_period_ends_at,
    'active_branches_allowed', CASE WHEN v_effective_tier = 'EKSEKUTIF' THEN 3 ELSE 1 END
  );
END;
$$;

-- 6. Row-Level Security (RLS)
ALTER TABLE license_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY;

-- Kebijakan license_tokens
DROP POLICY IF EXISTS "Public can check token format via RPC" ON license_tokens;
DROP POLICY IF EXISTS "Authenticated users can view redeemed tokens in org" ON license_tokens;

CREATE POLICY "Authenticated users can view redeemed tokens in org"
ON license_tokens FOR SELECT
TO authenticated
USING (
  redeemed_by_org IN (
    SELECT id FROM organizations WHERE owner_id = auth.uid()
  )
);

-- Kebijakan organization_subscriptions
DROP POLICY IF EXISTS "Org owners can read subscription" ON organization_subscriptions;
CREATE POLICY "Org owners can read subscription"
ON organization_subscriptions FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT id FROM organizations WHERE owner_id = auth.uid()
  )
);

-- 7. Backfill & Seed Idempoten untuk Organisasi Eksisting
INSERT INTO organization_subscriptions (
  organization_id,
  current_tier,
  starts_at,
  expires_at,
  grace_period_ends_at
)
SELECT 
  org.id,
  COALESCE(org.tier_id, 'MAGANG'),
  NOW(),
  NOW() + INTERVAL '30 days',
  NOW() + INTERVAL '33 days'
FROM organizations org
ON CONFLICT (organization_id) DO NOTHING;
