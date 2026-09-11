-- 1. Perbarui Tabel cashier_shifts untuk Multi-Terminal & Cash Skim
ALTER TABLE cashier_shifts 
  ADD COLUMN IF NOT EXISTS register_id VARCHAR(50) NOT NULL DEFAULT 'REGISTER_MAIN',
  ADD COLUMN IF NOT EXISTS cash_drop_amount BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leftover_cash BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS previous_shift_id UUID REFERENCES cashier_shifts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS handover_difference BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS handover_status VARCHAR(20) DEFAULT 'STANDALONE' 
    CHECK (handover_status IN ('MATCH', 'DISCREPANCY', 'STANDALONE')),
  ADD COLUMN IF NOT EXISTS handover_gap_minutes INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_shifts_shop_reg_closed 
  ON cashier_shifts(shop_id, register_id, end_time DESC) 
  WHERE status = 'CLOSED';

-- 2. Tabel Pusat Rekaman Anomali Siluman
CREATE TABLE IF NOT EXISTS security_anomaly_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES cashier_shifts(id) ON DELETE SET NULL,
  cashier_id UUID NOT NULL REFERENCES profiles(id),
  cashier_name VARCHAR(150) NOT NULL,
  event_type VARCHAR(20) NOT NULL, -- 'CIP', 'VAC', 'FPA', 'RPC', 'ACD', 'DFO', 'SDC', 'HEM'
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read_by_owner BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_anomaly_shop ON security_anomaly_events(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_anomaly_unread ON security_anomaly_events(shop_id) WHERE is_read_by_owner = FALSE;

-- 3. Kebijakan Row Level Security (RLS)
ALTER TABLE security_anomaly_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner and Admin can view anomaly logs" ON security_anomaly_events;
CREATE POLICY "Owner and Admin can view anomaly logs" ON security_anomaly_events
  FOR SELECT USING (
    shop_id IN (
      SELECT shop_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('BOSS', 'ADMIN')
    )
  );

DROP POLICY IF EXISTS "System can insert anomalies" ON security_anomaly_events;
CREATE POLICY "System can insert anomalies" ON security_anomaly_events
  FOR INSERT WITH CHECK (
    shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())
  );

-- 4. RPC: Tutup Shift dengan Alur Cash Skim (Setoran ke Bos)
CREATE OR REPLACE FUNCTION close_cashier_shift_with_skim(
  p_shift_id UUID,
  p_shop_id UUID,
  p_actual_cash BIGINT,
  p_cash_drop_amount BIGINT,
  p_denominations JSONB DEFAULT '{}'::jsonb,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_shift RECORD;
  v_expected_cash BIGINT;
  v_difference BIGINT;
  v_leftover_cash BIGINT;
  v_status VARCHAR(20);
BEGIN
  SELECT * INTO v_shift FROM cashier_shifts 
  WHERE id = p_shift_id AND shop_id = p_shop_id AND status = 'OPEN';

  IF v_shift.id IS NULL THEN
    RAISE EXCEPTION 'Shift aktif tidak ditemukan atau sudah ditutup';
  END IF;

  IF p_cash_drop_amount > p_actual_cash THEN
    RAISE EXCEPTION 'Setoran ke brankas tidak boleh melebihi total uang fisik di laci';
  END IF;

  -- Hitung sisa modal yang ditinggalkan untuk kasir berikutnya
  v_leftover_cash := p_actual_cash - p_cash_drop_amount;
  v_expected_cash := COALESCE(v_shift.expected_cash, v_shift.starting_cash, 0);
  v_difference := p_actual_cash - v_expected_cash;

  IF v_difference = 0 THEN v_status := 'PAS';
  ELSIF v_difference > 0 THEN v_status := 'SURPLUS';
  ELSE v_status := 'DEFISIT';
  END IF;

  UPDATE cashier_shifts SET
    actual_cash = p_actual_cash,
    cash_drop_amount = p_cash_drop_amount,
    leftover_cash = v_leftover_cash,
    difference = v_difference,
    denominations = p_denominations,
    status = 'CLOSED',
    end_time = NOW(),
    notes = p_notes,
    updated_at = NOW()
  WHERE id = p_shift_id;

  -- Anomali jika selisih kas fisik vs sistem tidak nol
  IF v_difference != 0 THEN
    INSERT INTO security_anomaly_events (
      shop_id, shift_id, cashier_id, cashier_name, event_type, severity, metadata
    )
    SELECT 
      p_shop_id, p_shift_id, v_shift.cashier_id, COALESCE(p.username, 'Kasir'), 'DRAWER_DISCREPANCY',
      CASE WHEN v_difference < -20000 THEN 'CRITICAL' ELSE 'HIGH' END,
      jsonb_build_object(
        'expected', v_expected_cash,
        'actual', p_actual_cash,
        'difference', v_difference,
        'cash_drop', p_cash_drop_amount,
        'leftover', v_leftover_cash
      )
    FROM profiles p WHERE p.id = v_shift.cashier_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'status', v_status,
    'difference', v_difference,
    'leftover_cash', v_leftover_cash
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC: Buka Shift Baru dengan Evaluasi Estafet & Isolasi Terminal
CREATE OR REPLACE FUNCTION start_shift_with_estafet_audit(
  p_shop_id UUID,
  p_cashier_id UUID,
  p_register_id VARCHAR(50),
  p_starting_cash BIGINT,
  p_denominations JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_last_shift RECORD;
  v_new_shift_id UUID;
  v_cashier_name TEXT;
  v_handover_diff BIGINT := 0;
  v_status VARCHAR(20) := 'STANDALONE';
  v_gap_minutes INT := 0;
  v_active_shift RECORD;
BEGIN
  -- Periksa apakah kasir / toko sudah memiliki shift OPEN di register ini
  SELECT id INTO v_active_shift FROM cashier_shifts
  WHERE shop_id = p_shop_id AND register_id = p_register_id AND status = 'OPEN'
  LIMIT 1;

  IF v_active_shift.id IS NOT NULL THEN
    RAISE EXCEPTION 'Shift aktif masih terbuka di terminal ini. Tutup shift sebelumnya terlebih dahulu.';
  END IF;

  SELECT COALESCE(username, 'Kasir') INTO v_cashier_name FROM profiles WHERE id = p_cashier_id;

  -- Kueri hanya shift terakhir pada TERMINAL (register_id) yang sama
  SELECT id, cashier_id, leftover_cash, end_time 
  INTO v_last_shift
  FROM cashier_shifts 
  WHERE shop_id = p_shop_id 
    AND register_id = p_register_id 
    AND status = 'CLOSED' 
  ORDER BY end_time DESC LIMIT 1;

  IF v_last_shift.id IS NOT NULL THEN
    v_gap_minutes := EXTRACT(EPOCH FROM (NOW() - v_last_shift.end_time)) / 60;
    
    -- Evaluasi estafet jika jeda operasional <= 12 jam (720 menit)
    IF v_gap_minutes <= 720 THEN
      v_handover_diff := p_starting_cash - COALESCE(v_last_shift.leftover_cash, 0);
      
      IF v_handover_diff = 0 THEN
        v_status := 'MATCH';
      ELSE
        v_status := 'DISCREPANCY';
        
        -- Catat insiden ke security_anomaly_events
        INSERT INTO security_anomaly_events (
          shop_id, cashier_id, cashier_name, event_type, severity, metadata
        ) VALUES (
          p_shop_id, p_cashier_id, COALESCE(v_cashier_name, 'Kasir'), 'HEM', 'CRITICAL',
          jsonb_build_object(
            'register_id', p_register_id,
            'outgoing_shift_id', v_last_shift.id,
            'outgoing_cashier_id', v_last_shift.cashier_id,
            'expected_leftover_cash', v_last_shift.leftover_cash,
            'outgoing_closed_at', v_last_shift.end_time,
            'incoming_starting_cash', p_starting_cash,
            'gap_minutes', v_gap_minutes,
            'difference', v_handover_diff
          )
        );
      END IF;
    END IF;
  END IF;

  -- Inisialisasi Shift Baru
  INSERT INTO cashier_shifts (
    shop_id, cashier_id, register_id, starting_cash, expected_cash, 
    denominations, status, previous_shift_id, handover_difference, 
    handover_status, handover_gap_minutes
  ) VALUES (
    p_shop_id, p_cashier_id, p_register_id, p_starting_cash, p_starting_cash,
    p_denominations, 'OPEN', v_last_shift.id, v_handover_diff, v_status, v_gap_minutes
  ) RETURNING id INTO v_new_shift_id;

  RETURN jsonb_build_object(
    'success', true,
    'shift_id', v_new_shift_id,
    'register_id', p_register_id,
    'handover_status', v_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
