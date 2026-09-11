-- ==============================================================================
-- TAHAP 5: THE ANTI-THEFT CITADEL
-- MIGRATION: REGISTERS TABLE, ANOMALY LOGS & DOUBLE-BLIND SHIFT HANDOVER RPC
-- ==============================================================================

-- 1. Tabel Terminal Kasir (Registers) untuk Multi-Terminal & Remote Lockdown
CREATE TABLE IF NOT EXISTS registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  register_code VARCHAR(50) NOT NULL,
  name VARCHAR(100) DEFAULT 'Terminal Kasir',
  is_frozen BOOLEAN DEFAULT FALSE,
  frozen_reason TEXT,
  frozen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, register_code)
);

CREATE INDEX IF NOT EXISTS idx_registers_shop_code ON registers(shop_id, register_code);
CREATE INDEX IF NOT EXISTS idx_registers_frozen ON registers(shop_id, is_frozen);

-- 2. Pastikan Tabel Pusat Rekaman Anomali Siluman Ada
CREATE TABLE IF NOT EXISTS security_anomaly_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES cashier_shifts(id) ON DELETE SET NULL,
  cashier_id UUID NOT NULL REFERENCES profiles(id),
  cashier_name VARCHAR(150) NOT NULL,
  event_type VARCHAR(30) NOT NULL, -- 'CIP', 'VAC', 'FPA', 'RPC', 'ACD', 'DFO', 'SDC', 'HEM', 'SHIFT_DISCREPANCY'
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read_by_owner BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_anomaly_shop ON security_anomaly_events(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_anomaly_unread ON security_anomaly_events(shop_id) WHERE is_read_by_owner = FALSE;

-- 3. Perbarui Kolom cashier_shifts untuk Estafet Double-Blind
ALTER TABLE cashier_shifts
  ADD COLUMN IF NOT EXISTS register_id VARCHAR(50) NOT NULL DEFAULT 'REGISTER_MAIN',
  ADD COLUMN IF NOT EXISTS cash_drop_amount BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leftover_cash BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS previous_shift_id UUID REFERENCES cashier_shifts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS handover_difference BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS handover_status VARCHAR(20) DEFAULT 'STANDALONE',
  ADD COLUMN IF NOT EXISTS incoming_cashier_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS outgoing_cash_count NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS incoming_cash_count NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS diff_outgoing NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS diff_handoff NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS requires_owner_review BOOLEAN DEFAULT FALSE;

-- 4. RPC: execute_double_blind_handover
CREATE OR REPLACE FUNCTION execute_double_blind_handover(
  p_shift_id UUID,
  p_outgoing_cash_count NUMERIC,
  p_incoming_cash_count NUMERIC,
  p_incoming_cashier_id UUID,
  p_incoming_pin VARCHAR DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_shift RECORD;
  v_incoming_profile RECORD;
  v_expected_cash NUMERIC;
  v_diff_outgoing NUMERIC;
  v_diff_handoff NUMERIC;
  v_requires_review BOOLEAN := FALSE;
  v_new_shift_id UUID;
  v_new_shift_number INT;
  v_cash_sales NUMERIC := 0;
  v_debt_settled NUMERIC := 0;
  v_savings_deposits NUMERIC := 0;
  v_drawer_in NUMERIC := 0;
  v_drawer_out NUMERIC := 0;
  v_consignment_paid NUMERIC := 0;
  v_anomaly_id UUID;
BEGIN
  -- A. Validasi shift lama yang masih terbuka
  SELECT * INTO v_old_shift
  FROM cashier_shifts
  WHERE id = p_shift_id AND status = 'OPEN'
  FOR UPDATE;

  IF v_old_shift.id IS NULL THEN
    RAISE EXCEPTION 'Shift aktif tidak ditemukan atau sudah ditutup.';
  END IF;

  -- B. Validasi profil kasir pengganti
  SELECT * INTO v_incoming_profile
  FROM profiles
  WHERE id = p_incoming_cashier_id;

  IF v_incoming_profile.id IS NULL THEN
    RAISE EXCEPTION 'Kasir pengganti tidak valid atau tidak terdaftar.';
  END IF;

  -- C. Hitung Kas Harapan Sistem (Expected Cash)
  -- 1. Penjualan Tunai
  SELECT COALESCE(SUM(total_akhir), 0) INTO v_cash_sales
  FROM transactions
  WHERE shift_id = v_old_shift.id
    AND UPPER(metode_pembayaran) = 'TUNAI'
    AND status IN ('Lunas', 'Selesai');

  -- 2. Mutasi Laci Kas (Cash In / Out)
  BEGIN
    SELECT 
      COALESCE(SUM(CASE WHEN UPPER(movement_type) = 'IN' THEN amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN UPPER(movement_type) = 'OUT' THEN amount ELSE 0 END), 0)
    INTO v_drawer_in, v_drawer_out
    FROM cash_drawer_movements
    WHERE shift_id = v_old_shift.id;
  EXCEPTION WHEN OTHERS THEN
    v_drawer_in := 0;
    v_drawer_out := 0;
  END;

  v_expected_cash := COALESCE(v_old_shift.starting_cash, 0)
                     + v_cash_sales
                     + v_debt_settled
                     + v_savings_deposits
                     + v_drawer_in
                     - v_drawer_out
                     - v_consignment_paid;

  -- D. Evaluasi Selisih Double-Blind
  v_diff_outgoing := p_outgoing_cash_count - v_expected_cash;
  v_diff_handoff  := p_outgoing_cash_count - p_incoming_cash_count;

  -- Ambang Batas Anomali:
  -- Selisih kas keluar > Rp 10.000 ATAU selisih serah terima antar kasir > Rp 5.000
  IF ABS(v_diff_outgoing) > 10000 OR ABS(v_diff_handoff) > 5000 THEN
    v_requires_review := TRUE;

    INSERT INTO security_anomaly_events (
      shop_id,
      shift_id,
      cashier_id,
      cashier_name,
      event_type,
      severity,
      metadata,
      is_read_by_owner,
      created_at
    ) VALUES (
      v_old_shift.shop_id,
      v_old_shift.id,
      v_old_shift.cashier_id,
      COALESCE((SELECT username FROM profiles WHERE id = v_old_shift.cashier_id), 'Kasir Keluar'),
      'SHIFT_DISCREPANCY',
      'CRITICAL',
      jsonb_build_object(
        'outgoing_cashier_id', v_old_shift.cashier_id,
        'incoming_cashier_id', p_incoming_cashier_id,
        'incoming_cashier_name', COALESCE(v_incoming_profile.username, 'Kasir Masuk'),
        'expected_cash', v_expected_cash,
        'outgoing_count', p_outgoing_cash_count,
        'incoming_count', p_incoming_cash_count,
        'diff_outgoing', v_diff_outgoing,
        'diff_handoff', v_diff_handoff,
        'register_id', COALESCE(v_old_shift.register_id, 'REGISTER_MAIN')
      ),
      FALSE,
      NOW()
    ) RETURNING id INTO v_anomaly_id;
  END IF;

  -- E. Tutup Shift Lama
  UPDATE cashier_shifts
  SET
    status = 'CLOSED',
    actual_cash = p_outgoing_cash_count,
    expected_cash = v_expected_cash,
    difference = v_diff_outgoing,
    outgoing_cash_count = p_outgoing_cash_count,
    incoming_cash_count = p_incoming_cash_count,
    diff_outgoing = v_diff_outgoing,
    diff_handoff = v_diff_handoff,
    handover_to = p_incoming_cashier_id,
    incoming_cashier_id = p_incoming_cashier_id,
    requires_owner_review = v_requires_review,
    notes = COALESCE(p_notes, notes),
    end_time = NOW(),
    updated_at = NOW()
  WHERE id = v_old_shift.id;

  -- F. Buka Shift Baru untuk Kasir Pengganti
  v_new_shift_number := COALESCE(v_old_shift.shift_number, 0) + 1;

  INSERT INTO cashier_shifts (
    shop_id,
    cashier_id,
    register_id,
    shift_number,
    starting_cash,
    actual_cash,
    expected_cash,
    difference,
    status,
    start_time,
    previous_shift_id,
    handover_status,
    incoming_cash_count,
    requires_owner_review,
    created_at,
    updated_at
  ) VALUES (
    v_old_shift.shop_id,
    p_incoming_cashier_id,
    COALESCE(v_old_shift.register_id, 'REGISTER_MAIN'),
    v_new_shift_number,
    p_incoming_cash_count,
    NULL,
    p_incoming_cash_count,
    0,
    'OPEN',
    NOW(),
    v_old_shift.id,
    CASE WHEN v_requires_review THEN 'DISCREPANCY' ELSE 'MATCH' END,
    p_incoming_cash_count,
    v_requires_review,
    NOW(),
    NOW()
  ) RETURNING id INTO v_new_shift_id;

  -- G. Return Payload
  RETURN jsonb_build_object(
    'success', TRUE,
    'old_shift_id', v_old_shift.id,
    'new_shift_id', v_new_shift_id,
    'new_shift_number', v_new_shift_number,
    'expected_cash', v_expected_cash,
    'outgoing_cash_count', p_outgoing_cash_count,
    'incoming_cash_count', p_incoming_cash_count,
    'diff_outgoing', v_diff_outgoing,
    'diff_handoff', v_diff_handoff,
    'requires_owner_review', v_requires_review,
    'incoming_cashier', jsonb_build_object(
      'id', v_incoming_profile.id,
      'username', v_incoming_profile.username,
      'role', v_incoming_profile.role
    )
  );
END;
$$;
