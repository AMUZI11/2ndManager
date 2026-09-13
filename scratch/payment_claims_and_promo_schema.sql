-- ==============================================================================
-- 2ndManager - TAHAP 11: OPTIMISTIC AUTO-APPROVE PAYMENT CLAIMS & DYNAMIC PROMOS
-- File: scratch/payment_claims_and_promo_schema.sql
-- ==============================================================================

-- 1. Storage Bucket Inisialisasi: payment_proofs
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'payment_proofs',
    'payment_proofs',
    FALSE,
    10485760, -- 10MB
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf']
  )
  ON CONFLICT (id) DO UPDATE SET
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback jika schema storage belum di-expose langsung
    NULL;
END $$;

-- 2. Modifikasi Kolom Reputasi & Flag Fraud pada Tabel organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS has_fraud_history BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS require_manual_approval BOOLEAN DEFAULT FALSE;

-- 3. Tabel Mesin Kode Promo (promo_codes)
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  discount_type VARCHAR(30) NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED_AMOUNT', 'BONUS_DAYS', 'TIER_OVERRIDE')),
  discount_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  target_tier VARCHAR(30),
  min_spend NUMERIC(15,2) DEFAULT 0,
  max_uses INT DEFAULT 100,
  current_uses INT DEFAULT 0,
  max_uses_per_org INT DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_lookup ON promo_codes(code, is_active);

-- 4. Tabel Riwayat Penggunaan Promo (promo_code_redemptions)
CREATE TABLE IF NOT EXISTS promo_code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (promo_code_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_promo_redemptions_lookup ON promo_code_redemptions(promo_code_id, organization_id);

-- 5. Tabel Klaim Pembayaran Manual Berbasis Kepercayaan Awal (payment_claims)
CREATE TABLE IF NOT EXISTS payment_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_tier VARCHAR(30) NOT NULL,
  duration_months INT NOT NULL DEFAULT 1,
  base_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  final_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL,
  proof_image_url TEXT NOT NULL,
  sender_bank VARCHAR(50),
  sender_account_name VARCHAR(100),
  status VARCHAR(30) NOT NULL DEFAULT 'PROVISIONALLY_APPROVED' CHECK (status IN ('PROVISIONALLY_APPROVED', 'VERIFIED_SILENT', 'REVOKED_FRAUD', 'PENDING_MANUAL_REVIEW')),
  revocation_reason TEXT,
  revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_claims_org ON payment_claims(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_claims_status ON payment_claims(status, created_at DESC);

-- 6. Stored Procedure: Pengajuan Klaim Pembayaran Optimistik
CREATE OR REPLACE FUNCTION submit_optimistic_payment_claim(
  p_org_id UUID,
  p_user_id UUID,
  p_target_tier VARCHAR(30),
  p_duration_months INT,
  p_base_price NUMERIC(15,2),
  p_final_price NUMERIC(15,2),
  p_promo_code_id UUID DEFAULT NULL,
  p_proof_url TEXT DEFAULT '',
  p_bank VARCHAR(50) DEFAULT NULL,
  p_acc_name VARCHAR(100) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org RECORD;
  v_promo RECORD;
  v_sub RECORD;
  v_claim_id UUID := gen_random_uuid();
  v_total_days INT;
  v_effective_tier VARCHAR(30) := UPPER(p_target_tier);
  v_effective_starts_at TIMESTAMPTZ := NOW();
  v_new_expires_at TIMESTAMPTZ;
  v_new_grace_ends_at TIMESTAMPTZ;
  v_already_redeemed BOOLEAN := FALSE;
BEGIN
  -- 1. Kunci dan periksa reputasi organisasi
  SELECT * INTO v_org
  FROM organizations
  WHERE id = p_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organisasi tidak ditemukan.';
  END IF;

  -- 2. Pengecekan Reputasi Fraud / Pengawasan Ketat
  IF v_org.require_manual_approval = TRUE OR v_org.has_fraud_history = TRUE THEN
    -- Wajib melalui peninjauan manual admin, JANGAN aktifkan lisensi instan
    INSERT INTO payment_claims (
      id,
      organization_id,
      user_id,
      target_tier,
      duration_months,
      base_price,
      final_price,
      promo_code_id,
      proof_image_url,
      sender_bank,
      sender_account_name,
      status,
      created_at
    ) VALUES (
      v_claim_id,
      p_org_id,
      p_user_id,
      v_effective_tier,
      p_duration_months,
      p_base_price,
      p_final_price,
      p_promo_code_id,
      p_proof_url,
      p_bank,
      p_acc_name,
      'PENDING_MANUAL_REVIEW',
      NOW()
    );

    RETURN jsonb_build_object(
      'success', TRUE,
      'status', 'PENDING_REVIEW',
      'claim_id', v_claim_id,
      'tier', v_org.tier_id,
      'message', 'Akun berada dalam tinjauan keamanan. Bukti pembayaran Anda diteruskan ke Admin untuk verifikasi manual sebelum lisensi diaktifkan.'
    );
  END IF;

  -- 3. Hitung Durasi Lisensi (Dasar: Bulan * 30 Hari)
  v_total_days := GREATEST(1, p_duration_months) * 30;

  -- 4. Validasi dan konsumsi promo code jika disertakan
  IF p_promo_code_id IS NOT NULL THEN
    SELECT * INTO v_promo
    FROM promo_codes
    WHERE id = p_promo_code_id
    FOR UPDATE;

    IF FOUND AND v_promo.is_active = TRUE THEN
      -- Cek apakah warung ini sudah pernah menggunakan promo ini
      SELECT EXISTS (
        SELECT 1 FROM promo_code_redemptions
        WHERE promo_code_id = p_promo_code_id AND organization_id = p_org_id
      ) INTO v_already_redeemed;

      IF NOT v_already_redeemed THEN
        -- Terapkan efek promo
        IF v_promo.discount_type = 'BONUS_DAYS' THEN
          v_total_days := v_total_days + (v_promo.discount_value::INT);
        ELSIF v_promo.discount_type = 'TIER_OVERRIDE' AND v_promo.target_tier IS NOT NULL THEN
          v_effective_tier := UPPER(v_promo.target_tier);
        END IF;

        -- Catat penggunaan kuota
        UPDATE promo_codes
        SET current_uses = current_uses + 1
        WHERE id = v_promo.id;

        INSERT INTO promo_code_redemptions (
          promo_code_id,
          organization_id,
          user_id,
          redeemed_at
        ) VALUES (
          v_promo.id,
          p_org_id,
          p_user_id,
          NOW()
        );
      END IF;
    END IF;
  END IF;

  -- 5. Ambil data langganan berjalan untuk kalkulasi masa aktif
  SELECT * INTO v_sub
  FROM organization_subscriptions
  WHERE organization_id = p_org_id
  FOR UPDATE;

  IF v_sub.id IS NOT NULL AND v_sub.current_tier = v_effective_tier AND v_sub.expires_at > NOW() THEN
    -- Akumulasi durasi jika tier sama dan masih aktif
    v_effective_starts_at := v_sub.starts_at;
    v_new_expires_at := v_sub.expires_at + (v_total_days * INTERVAL '1 day');
  ELSE
    -- Reset masa aktif baru
    v_effective_starts_at := NOW();
    v_new_expires_at := NOW() + (v_total_days * INTERVAL '1 day');
  END IF;

  v_new_grace_ends_at := v_new_expires_at + INTERVAL '3 days';

  -- 6. Simpan Klaim dengan Status PROVISIONALLY_APPROVED
  INSERT INTO payment_claims (
    id,
    organization_id,
    user_id,
    target_tier,
    duration_months,
    base_price,
    final_price,
    promo_code_id,
    proof_image_url,
    sender_bank,
    sender_account_name,
    status,
    created_at
  ) VALUES (
    v_claim_id,
    p_org_id,
    p_user_id,
    v_effective_tier,
    p_duration_months,
    p_base_price,
    p_final_price,
    p_promo_code_id,
    p_proof_url,
    p_bank,
    p_acc_name,
    'PROVISIONALLY_APPROVED',
    NOW()
  );

  -- 7. Upsert ke organization_subscriptions
  IF v_sub.id IS NOT NULL THEN
    UPDATE organization_subscriptions
    SET 
      current_tier = v_effective_tier,
      starts_at = v_effective_starts_at,
      expires_at = v_new_expires_at,
      grace_period_ends_at = v_new_grace_ends_at,
      updated_at = NOW()
    WHERE id = v_sub.id;
  ELSE
    INSERT INTO organization_subscriptions (
      organization_id,
      current_tier,
      starts_at,
      expires_at,
      grace_period_ends_at,
      updated_at
    ) VALUES (
      p_org_id,
      v_effective_tier,
      v_effective_starts_at,
      v_new_expires_at,
      v_new_grace_ends_at,
      NOW()
    );
  END IF;

  -- 8. Sinkronisasi tier organisasi
  UPDATE organizations
  SET tier_id = v_effective_tier
  WHERE id = p_org_id;

  -- 9. Pulihkan seluruh cabang jika tier EKSEKUTIF
  IF v_effective_tier = 'EKSEKUTIF' THEN
    UPDATE branches
    SET is_active = TRUE
    WHERE organization_id = p_org_id;
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'status', 'INSTANT_ACTIVATED',
    'tier', v_effective_tier,
    'duration_days', v_total_days,
    'expires_at', v_new_expires_at,
    'grace_period_ends_at', v_new_grace_ends_at,
    'claim_id', v_claim_id,
    'message', 'Pembayaran berhasil dikonfirmasi secara instan! Selamat menikmati fitur ' || v_effective_tier || '.'
  );
END;
$$;

-- 7. Stored Procedure: Pencabutan Sepihak Bukti Palsu (One-Click Fraud Revocation)
CREATE OR REPLACE FUNCTION revoke_fraudulent_claim(
  p_claim_id UUID,
  p_reason TEXT,
  p_admin_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_claim RECORD;
  v_org_id UUID;
BEGIN
  -- 1. Ambil dan kunci baris klaim
  SELECT * INTO v_claim
  FROM payment_claims
  WHERE id = p_claim_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Klaim pembayaran dengan ID % tidak ditemukan.', p_claim_id;
  END IF;

  v_org_id := v_claim.organization_id;

  -- 2. Update status klaim menjadi REVOKED_FRAUD
  UPDATE payment_claims
  SET 
    status = 'REVOKED_FRAUD',
    revocation_reason = p_reason,
    revoked_by = p_admin_id,
    revoked_at = NOW()
  WHERE id = p_claim_id;

  -- 3. Sanksi Organisasi: Blacklist Reputasi & Turunkan Tier ke MAGANG
  UPDATE organizations
  SET 
    has_fraud_history = TRUE,
    require_manual_approval = TRUE,
    tier_id = 'MAGANG'
  WHERE id = v_org_id;

  -- 4. Sanksi Langganan: Kadaluwarsakan Seketika
  UPDATE organization_subscriptions
  SET 
    current_tier = 'MAGANG',
    expires_at = NOW() - INTERVAL '1 day',
    grace_period_ends_at = NOW() - INTERVAL '1 day',
    updated_at = NOW()
  WHERE organization_id = v_org_id;

  -- 5. Nonaktifkan Cabang Non-Utama (Read-Only Mode, data produk/transaksi aman tidak terhapus)
  UPDATE branches
  SET is_active = FALSE
  WHERE organization_id = v_org_id AND is_main_branch = FALSE;

  RETURN jsonb_build_object(
    'success', TRUE,
    'claim_id', p_claim_id,
    'organization_id', v_org_id,
    'message', 'Lisensi berhasil dicabut, organisasi ditandai penipuan.'
  );
END;
$$;

-- 8. Row Level Security Policies
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_claims ENABLE ROW LEVEL SECURITY;

-- promo_codes policies
DROP POLICY IF EXISTS "Public can view active promo codes" ON promo_codes;
CREATE POLICY "Public can view active promo codes"
ON promo_codes FOR SELECT
TO authenticated, anon
USING (is_active = TRUE);

-- promo_code_redemptions policies
DROP POLICY IF EXISTS "Org members can view their redemptions" ON promo_code_redemptions;
CREATE POLICY "Org members can view their redemptions"
ON promo_code_redemptions FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT id FROM organizations WHERE owner_id = auth.uid()
  )
);

-- payment_claims policies
DROP POLICY IF EXISTS "Org owners can view their payment claims" ON payment_claims;
CREATE POLICY "Org owners can view their payment claims"
ON payment_claims FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT id FROM organizations WHERE owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Org owners can insert payment claims" ON payment_claims;
CREATE POLICY "Org owners can insert payment claims"
ON payment_claims FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT id FROM organizations WHERE owner_id = auth.uid()
  )
);
