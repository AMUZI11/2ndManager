-- scratch/pwa_push_sync_schema.sql
-- TAHAP 9: NATIVE PWA HARDENING, VAPID PUSH & BACKGROUND SYNC ENGINE

-- 1. TABEL PENDAFTARAN PERANGKAT WEB PUSH (RFC 8292)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  device_label VARCHAR(100) DEFAULT 'Android Terminal',
  user_agent TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_org ON push_subscriptions(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id, is_active);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can manage their push subscriptions" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role has full access to push_subscriptions" ON push_subscriptions;
CREATE POLICY "Service role has full access to push_subscriptions" ON push_subscriptions
  FOR ALL USING (TRUE)
  WITH CHECK (TRUE);

-- 2. KOLOM INTEGRITAS TRANSAKSI OFFLINE (IDEMPOTENCY KEY)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'client_tx_uuid'
  ) THEN
    ALTER TABLE transactions ADD COLUMN client_tx_uuid UUID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'synced_via'
  ) THEN
    ALTER TABLE transactions ADD COLUMN synced_via VARCHAR(25) DEFAULT 'ONLINE';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'offline_created_at'
  ) THEN
    ALTER TABLE transactions ADD COLUMN offline_created_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_transactions_shop_client_tx_uuid'
  ) THEN
    ALTER TABLE transactions ADD CONSTRAINT uq_transactions_shop_client_tx_uuid UNIQUE (shop_id, client_tx_uuid);
  END IF;
END $$;

-- Tambah kolom pengunci di cashier_shifts jika belum ada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cashier_shifts' AND column_name = 'is_locked'
  ) THEN
    ALTER TABLE cashier_shifts ADD COLUMN is_locked BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cashier_shifts' AND column_name = 'lock_reason'
  ) THEN
    ALTER TABLE cashier_shifts ADD COLUMN lock_reason TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cashier_shifts' AND column_name = 'locked_at'
  ) THEN
    ALTER TABLE cashier_shifts ADD COLUMN locked_at TIMESTAMPTZ;
  END IF;
END $$;

-- 3. TABEL AUDIT LOG AKSI JARAK JAUH (REMOTE ACTION AUDIT)
CREATE TABLE IF NOT EXISTS remote_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL, -- 'FREEZE_REGISTER', 'UNFREEZE_REGISTER', 'ALERT_ACK'
  triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source VARCHAR(50) NOT NULL, -- 'LOCKSCREEN_PUSH_ACTION', 'DASHBOARD_BUTTON'
  client_ip VARCHAR(45),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_remote_action_logs_shop ON remote_action_logs(shop_id, created_at DESC);

-- Enable RLS
ALTER TABLE remote_action_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role and shop owners can view remote_action_logs" ON remote_action_logs;
CREATE POLICY "Service role and shop owners can view remote_action_logs" ON remote_action_logs
  FOR ALL USING (TRUE)
  WITH CHECK (TRUE);

-- Perluas tipe event_type di security_anomaly_events jika perlu
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'security_anomaly_events' AND column_name = 'event_type'
  ) THEN
    ALTER TABLE security_anomaly_events ALTER COLUMN event_type TYPE VARCHAR(50);
  END IF;
END $$;

-- 4. STORED PROCEDURE: remote_freeze_cashier
CREATE OR REPLACE FUNCTION remote_freeze_cashier(
  p_shop_id UUID,
  p_reason TEXT DEFAULT 'Kunci darurat jarak jauh diaktifkan oleh pemilik',
  p_actor_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actor_name VARCHAR(150) := 'Owner/Sistem';
  v_active_shift_id UUID := NULL;
  v_active_cashier_id UUID := NULL;
  v_registers_updated INT := 0;
BEGIN
  -- Dapatkan nama aktor jika terdaftar di profiles
  IF p_actor_id IS NOT NULL THEN
    SELECT COALESCE(full_name, username, 'Owner') INTO v_actor_name
    FROM profiles
    WHERE id = p_actor_id
    LIMIT 1;
  END IF;

  -- Cari shift aktif di toko ini (jika ada)
  SELECT id, cashier_id INTO v_active_shift_id, v_active_cashier_id
  FROM cashier_shifts
  WHERE shop_id = p_shop_id AND status = 'OPEN'
  ORDER BY start_time DESC
  LIMIT 1;

  -- 1. Bekukan semua terminal register di toko terkait
  UPDATE registers
  SET is_frozen = TRUE,
      frozen_reason = p_reason,
      frozen_at = NOW(),
      updated_at = NOW()
  WHERE shop_id = p_shop_id;
  GET DIAGNOSTICS v_registers_updated = ROW_COUNT;

  -- Jika register belum ada di tabel registers, buat entri default beku
  IF v_registers_updated = 0 THEN
    INSERT INTO registers (shop_id, register_code, is_frozen, frozen_reason, frozen_at, updated_at)
    VALUES (p_shop_id, 'REGISTER_MAIN', TRUE, p_reason, NOW(), NOW())
    ON CONFLICT (shop_id, register_code)
    DO UPDATE SET is_frozen = TRUE, frozen_reason = p_reason, frozen_at = NOW(), updated_at = NOW();
  END IF;

  -- 2. Kunci shift aktif jika ada
  IF v_active_shift_id IS NOT NULL THEN
    UPDATE cashier_shifts
    SET is_locked = TRUE,
        lock_reason = p_reason,
        locked_at = NOW()
    WHERE id = v_active_shift_id;
  END IF;

  -- 3. Catat peristiwa ke security_anomaly_events
  BEGIN
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
    )
    VALUES (
      p_shop_id,
      v_active_shift_id,
      COALESCE(v_active_cashier_id, p_actor_id),
      COALESCE(v_actor_name, 'Sistem'),
      'REMOTE_FREEZE_TRIGGERED',
      'CRITICAL',
      jsonb_build_object(
        'reason', p_reason,
        'actor_id', p_actor_id,
        'triggered_at', NOW(),
        'source', 'REMOTE_KILL_SWITCH'
      ),
      TRUE,
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    -- Fail safe jika relasi profile belum sinkron
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Terminal kasir berhasil dibekukan dari jarak jauh.',
    'shop_id', p_shop_id,
    'frozen_at', NOW(),
    'reason', p_reason
  );
END;
$$;
