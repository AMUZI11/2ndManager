-- ==============================================================================
-- 2NDMANAGER: ENHANCED OPTIMISTIC PAYMENT CLAIM & FRAUD REVOCATION WITH ADD-ONS
-- ==============================================================================

-- 1. Pastikan kolom addon pada payment_claims siap
ALTER TABLE public.payment_claims
ADD COLUMN IF NOT EXISTS addon_branches_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS addon_cashiers_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS addon_total_amount NUMERIC(15,2) DEFAULT 0;

-- 2. Update RPC submit_optimistic_payment_claim
CREATE OR REPLACE FUNCTION public.submit_optimistic_payment_claim(
  p_org_id UUID,
  p_user_id UUID,
  p_target_tier VARCHAR(30),
  p_duration_months INT,
  p_base_price NUMERIC(15,2),
  p_final_price NUMERIC(15,2),
  p_promo_code_id UUID DEFAULT NULL,
  p_proof_url TEXT DEFAULT '',
  p_bank VARCHAR(50) DEFAULT NULL,
  p_acc_name VARCHAR(100) DEFAULT NULL,
  p_addon_branches INT DEFAULT 0,
  p_addon_cashiers INT DEFAULT 0,
  p_addon_total NUMERIC(15,2) DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org RECORD;
  v_promo RECORD;
  v_sub RECORD;
  v_claim_id UUID := gen_random_uuid();
  v_total_days INT;
  v_target_tier_clean VARCHAR(30) := UPPER(TRIM(p_target_tier));
  v_effective_tier VARCHAR(30);
  v_effective_starts_at TIMESTAMPTZ := NOW();
  v_new_expires_at TIMESTAMPTZ;
  v_new_grace_ends_at TIMESTAMPTZ;
  v_already_redeemed BOOLEAN := FALSE;
  v_is_pure_addon BOOLEAN := FALSE;
  v_new_extra_branches INT := 0;
  v_new_extra_cashiers INT := 0;
BEGIN
  -- 1. Kunci dan periksa reputasi organisasi
  SELECT * INTO v_org
  FROM public.organizations
  WHERE id = p_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organisasi tidak ditemukan.';
  END IF;

  -- 2. Ambil data langganan berjalan saat ini
  SELECT * INTO v_sub
  FROM public.organization_subscriptions
  WHERE organization_id = p_org_id
  FOR UPDATE;

  IF v_target_tier_clean = 'ADDON' OR v_target_tier_clean = 'ADD-ON' OR p_duration_months = 0 THEN
    v_is_pure_addon := TRUE;
    v_effective_tier := COALESCE(v_sub.current_tier, v_org.tier_id, 'MAGANG');
  ELSE
    v_effective_tier := v_target_tier_clean;
  END IF;

  -- 3. Pengecekan Reputasi Fraud / Pengawasan Ketat
  IF v_org.require_manual_approval = TRUE OR v_org.has_fraud_history = TRUE THEN
    INSERT INTO public.payment_claims (
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
      addon_branches_count,
      addon_cashiers_count,
      addon_total_amount,
      created_at
    ) VALUES (
      v_claim_id,
      p_org_id,
      p_user_id,
      v_effective_tier,
      COALESCE(p_duration_months, 0),
      p_base_price,
      p_final_price,
      p_promo_code_id,
      p_proof_url,
      p_bank,
      p_acc_name,
      'PENDING_MANUAL_REVIEW',
      GREATEST(0, p_addon_branches),
      GREATEST(0, p_addon_cashiers),
      GREATEST(0, p_addon_total),
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

  -- 4. Hitung Durasi Lisensi jika bukan pure add-on
  IF NOT v_is_pure_addon THEN
    v_total_days := GREATEST(1, p_duration_months) * 30;

    -- Validasi dan konsumsi promo code jika disertakan
    IF p_promo_code_id IS NOT NULL THEN
      SELECT * INTO v_promo
      FROM public.promo_codes
      WHERE id = p_promo_code_id
      FOR UPDATE;

      IF FOUND AND v_promo.is_active = TRUE THEN
        SELECT EXISTS (
          SELECT 1 FROM public.promo_code_redemptions
          WHERE promo_code_id = p_promo_code_id AND organization_id = p_org_id
        ) INTO v_already_redeemed;

        IF NOT v_already_redeemed THEN
          IF v_promo.discount_type = 'BONUS_DAYS' THEN
            v_total_days := v_total_days + (v_promo.discount_value::INT);
          ELSIF v_promo.discount_type = 'TIER_OVERRIDE' AND v_promo.target_tier IS NOT NULL THEN
            v_effective_tier := UPPER(v_promo.target_tier);
          END IF;

          UPDATE public.promo_codes
          SET current_uses = current_uses + 1
          WHERE id = v_promo.id;

          INSERT INTO public.promo_code_redemptions (
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

    -- Kalkulasi masa aktif baru
    IF v_sub.id IS NOT NULL AND v_sub.current_tier = v_effective_tier AND v_sub.expires_at > NOW() THEN
      v_effective_starts_at := v_sub.starts_at;
      v_new_expires_at := v_sub.expires_at + (v_total_days * INTERVAL '1 day');
    ELSE
      v_effective_starts_at := NOW();
      v_new_expires_at := NOW() + (v_total_days * INTERVAL '1 day');
    END IF;

    v_new_grace_ends_at := v_new_expires_at + INTERVAL '3 days';
  ELSE
    -- Pure add-on: pertahankan masa aktif yang ada
    IF v_sub.id IS NOT NULL THEN
      v_effective_starts_at := v_sub.starts_at;
      v_new_expires_at := v_sub.expires_at;
      v_new_grace_ends_at := v_sub.grace_period_ends_at;
    ELSE
      v_effective_starts_at := NOW();
      v_new_expires_at := NOW() + INTERVAL '30 days';
      v_new_grace_ends_at := v_new_expires_at + INTERVAL '3 days';
    END IF;
  END IF;

  -- 5. Hitung kuota add-on baru akumulatif
  v_new_extra_branches := COALESCE(v_sub.extra_branches_quota, 0) + GREATEST(0, p_addon_branches);
  v_new_extra_cashiers := COALESCE(v_sub.extra_cashiers_quota, 0) + GREATEST(0, p_addon_cashiers);

  -- 6. Simpan Klaim dengan Status PROVISIONALLY_APPROVED
  INSERT INTO public.payment_claims (
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
    addon_branches_count,
    addon_cashiers_count,
    addon_total_amount,
    created_at
  ) VALUES (
    v_claim_id,
    p_org_id,
    p_user_id,
    v_effective_tier,
    COALESCE(p_duration_months, 0),
    p_base_price,
    p_final_price,
    p_promo_code_id,
    p_proof_url,
    p_bank,
    p_acc_name,
    'PROVISIONALLY_APPROVED',
    GREATEST(0, p_addon_branches),
    GREATEST(0, p_addon_cashiers),
    GREATEST(0, p_addon_total),
    NOW()
  );

  -- 7. Upsert ke organization_subscriptions
  IF v_sub.id IS NOT NULL THEN
    UPDATE public.organization_subscriptions
    SET 
      current_tier = v_effective_tier,
      starts_at = v_effective_starts_at,
      expires_at = v_new_expires_at,
      grace_period_ends_at = v_new_grace_ends_at,
      extra_branches_quota = v_new_extra_branches,
      extra_cashiers_quota = v_new_extra_cashiers,
      is_active = TRUE,
      updated_at = NOW()
    WHERE id = v_sub.id;
  ELSE
    INSERT INTO public.organization_subscriptions (
      organization_id,
      current_tier,
      starts_at,
      expires_at,
      grace_period_ends_at,
      extra_branches_quota,
      extra_cashiers_quota,
      is_active,
      updated_at
    ) VALUES (
      p_org_id,
      v_effective_tier,
      v_effective_starts_at,
      v_new_expires_at,
      v_new_grace_ends_at,
      v_new_extra_branches,
      v_new_extra_cashiers,
      TRUE,
      NOW()
    );
  END IF;

  -- 8. Sinkronisasi tier organisasi jika bukan pure add-on
  IF NOT v_is_pure_addon THEN
    UPDATE public.organizations
    SET tier_id = v_effective_tier
    WHERE id = p_org_id;

    IF v_effective_tier = 'EKSEKUTIF' THEN
      UPDATE public.branches
      SET is_active = TRUE
      WHERE organization_id = p_org_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'status', 'INSTANT_ACTIVATED',
    'tier', v_effective_tier,
    'is_pure_addon', v_is_pure_addon,
    'extra_branches_quota', v_new_extra_branches,
    'extra_cashiers_quota', v_new_extra_cashiers,
    'expires_at', v_new_expires_at,
    'grace_period_ends_at', v_new_grace_ends_at,
    'claim_id', v_claim_id,
    'message', CASE 
      WHEN v_is_pure_addon THEN 'Add-on kapasitas berhasil diaktifkan secara instan!'
      ELSE 'Pembayaran berhasil dikonfirmasi secara instan! Selamat menikmati fitur ' || v_effective_tier || '.'
    END
  );
END;
$$;

-- 3. Update RPC revoke_fraudulent_claim untuk mereset kuota add-on ke 0
CREATE OR REPLACE FUNCTION public.revoke_fraudulent_claim(
  p_claim_id UUID,
  p_reason TEXT,
  p_admin_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claim RECORD;
  v_org_id UUID;
BEGIN
  -- 1. Ambil dan kunci baris klaim
  SELECT * INTO v_claim
  FROM public.payment_claims
  WHERE id = p_claim_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Klaim pembayaran dengan ID % tidak ditemukan.', p_claim_id;
  END IF;

  v_org_id := v_claim.organization_id;

  -- 2. Update status klaim menjadi REVOKED_FRAUD
  UPDATE public.payment_claims
  SET 
    status = 'REVOKED_FRAUD',
    revocation_reason = p_reason,
    revoked_by = p_admin_id,
    revoked_at = NOW()
  WHERE id = p_claim_id;

  -- 3. Sanksi Organisasi: Blacklist Reputasi & Turunkan Tier ke MAGANG
  UPDATE public.organizations
  SET 
    has_fraud_history = TRUE,
    require_manual_approval = TRUE,
    tier_id = 'MAGANG'
  WHERE id = v_org_id;

  -- 4. Sanksi Langganan: Kadaluwarsakan Seketika dan Reset Seluruh Kuota Add-on
  UPDATE public.organization_subscriptions
  SET 
    current_tier = 'MAGANG',
    extra_branches_quota = 0,
    extra_cashiers_quota = 0,
    expires_at = NOW() - INTERVAL '1 day',
    grace_period_ends_at = NOW() - INTERVAL '1 day',
    is_active = FALSE,
    updated_at = NOW()
  WHERE organization_id = v_org_id;

  -- 5. Nonaktifkan seluruh cabang anak (hanya pertahankan Toko A)
  UPDATE public.branches
  SET is_active = FALSE
  WHERE organization_id = v_org_id AND is_main_branch = FALSE;

  RETURN jsonb_build_object(
    'success', TRUE,
    'status', 'REVOKED_FRAUD',
    'organization_id', v_org_id,
    'message', 'Lisensi dan seluruh kuota add-on berhasil dicabut sepihak karena indikasi pemalsuan bukti bayar.'
  );
END;
$$;
