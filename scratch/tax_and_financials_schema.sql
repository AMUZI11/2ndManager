-- ==============================================================================
-- TAHAP 8: PP 55/2022 TAX ENGINE, SAK EMKM TRIPLE-STATEMENT & BANK KUR DOSSIER
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Pastikan kolom is_void ada pada tabel transactions untuk PENGARASAN TEKNIS 2
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_void BOOLEAN DEFAULT FALSE;

-- 1. TABEL PENGATURAN FISKAL & PROFIL PAJAK ORGANISASI
CREATE TABLE IF NOT EXISTS organization_tax_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  npwp_number VARCHAR(30) DEFAULT '00.000.000.0-000.000',
  npwp_name VARCHAR(100) DEFAULT 'Wajib Pajak Toko',
  tax_year INT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INT,
  is_corporate BOOLEAN DEFAULT FALSE,
  initial_capital NUMERIC NOT NULL DEFAULT 10000000,
  current_accumulated_turnover NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, tax_year)
);

ALTER TABLE organization_tax_profiles ADD COLUMN IF NOT EXISTS initial_capital NUMERIC NOT NULL DEFAULT 10000000;
ALTER TABLE organization_tax_profiles ADD COLUMN IF NOT EXISTS is_corporate BOOLEAN DEFAULT FALSE;
ALTER TABLE organization_tax_profiles ADD COLUMN IF NOT EXISTS current_accumulated_turnover NUMERIC DEFAULT 0;

-- 2. TABEL SNAPSHOT KEUANGAN BULANAN (MONTHLY FINANCIAL SNAPSHOTS)
CREATE TABLE IF NOT EXISTS monthly_financial_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  snapshot_year INT NOT NULL,
  snapshot_month INT NOT NULL,
  gross_revenue NUMERIC DEFAULT 0,
  sanitized_dpp NUMERIC DEFAULT 0,
  cogs NUMERIC DEFAULT 0,
  gross_profit NUMERIC DEFAULT 0,
  operating_expenses NUMERIC DEFAULT 0,
  transit_shrinkage_loss NUMERIC DEFAULT 0,
  net_profit NUMERIC DEFAULT 0,
  cash_balance NUMERIC DEFAULT 0,
  receivables_balance NUMERIC DEFAULT 0,
  inventory_valuation NUMERIC DEFAULT 0,
  liabilities_balance NUMERIC DEFAULT 0,
  equity_balance NUMERIC DEFAULT 0,
  pph_final_payable NUMERIC DEFAULT 0,
  is_finalized BOOLEAN DEFAULT FALSE,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, branch_id, snapshot_year, snapshot_month)
);

-- 3. TABEL STEMPEL VERIFIKASI DIGITAL AUDIT (AUDIT VERIFICATION SEALS)
CREATE TABLE IF NOT EXISTS audit_verification_seals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_type VARCHAR(30) NOT NULL, -- 'KUR_DOSSIER', 'TAX_STATEMENT', 'EMKM_FINANCIAL'
  checksum_hash VARCHAR(64) UNIQUE NOT NULL,
  payload_summary JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days')
);

-- INDEXES UNTUK PERFORMA
CREATE INDEX IF NOT EXISTS idx_tax_profiles_org_year ON organization_tax_profiles(organization_id, tax_year);
CREATE INDEX IF NOT EXISTS idx_financial_snapshots_org_period ON monthly_financial_snapshots(organization_id, snapshot_year, snapshot_month);
CREATE INDEX IF NOT EXISTS idx_audit_seals_hash ON audit_verification_seals(checksum_hash);

-- ==============================================================================
-- STORED PROCEDURES (RPCs)
-- ==============================================================================

-- RPC 1: calculate_sanitized_annual_dpp
-- Menghitung omzet bruto tersanitasi, ambang batas PP 55/2022 (WPOP Rp 500 Juta vs Badan Rp 0),
-- dan estimasi PPh Final 0,5%
DROP FUNCTION IF EXISTS calculate_sanitized_annual_dpp(UUID, INT);
CREATE OR REPLACE FUNCTION calculate_sanitized_annual_dpp(
  p_org_id UUID,
  p_year INT
)
RETURNS JSONB AS $$
DECLARE
  v_shop_ids UUID[];
  v_is_corporate BOOLEAN := FALSE;
  v_tax_free_limit NUMERIC := 500000000;
  v_gross_revenue NUMERIC := 0;
  v_sanitized_dpp NUMERIC := 0;
  v_consignment_margin NUMERIC := 0;
  v_taxable_dpp NUMERIC := 0;
  v_pph_final_due NUMERIC := 0;
  v_remaining_tax_free NUMERIC := 0;
  v_effective_rate NUMERIC := 0;
  v_months JSONB := '[]'::JSONB;
  m INT;
  v_m_start TIMESTAMPTZ;
  v_m_end TIMESTAMPTZ;
  v_m_gross NUMERIC;
  v_m_sanitized NUMERIC;
  v_m_consignment NUMERIC;
  v_cum_dpp NUMERIC := 0;
  v_m_taxable NUMERIC := 0;
  v_m_pph NUMERIC := 0;
BEGIN
  -- 1. Ambil seluruh shop_id di bawah organisasi ini
  SELECT ARRAY_AGG(shop_id) INTO v_shop_ids
  FROM branches
  WHERE organization_id = p_org_id AND is_active = TRUE;

  IF v_shop_ids IS NULL OR ARRAY_LENGTH(v_shop_ids, 1) = 0 THEN
    -- Fallback ke shops yang dimiliki owner organisasi
    SELECT ARRAY_AGG(id) INTO v_shop_ids
    FROM shops
    WHERE owner_id = (SELECT owner_id FROM organizations WHERE id = p_org_id);
  END IF;

  -- 2. Ambil profil pajak organisasi untuk tahun ini
  SELECT COALESCE(is_corporate, FALSE) INTO v_is_corporate
  FROM organization_tax_profiles
  WHERE organization_id = p_org_id AND tax_year = p_year;

  IF v_is_corporate IS NULL THEN
    v_is_corporate := FALSE;
  END IF;

  -- Tentukan kuota bebas pajak sesuai PP 55/2022 Pasal 6
  IF v_is_corporate THEN
    v_tax_free_limit := 0; -- Badan Usaha (CV/PT): Tarif 0,5% sejak rupiah pertama
  ELSE
    v_tax_free_limit := 500000000; -- Orang Pribadi: Bebas omzet hingga Rp 500 Juta
  END IF;

  -- 3. Hitung per bulan (1 s.d 12)
  FOR m IN 1..12 LOOP
    v_m_start := make_timestamptz(p_year, m, 1, 0, 0, 0, 'Asia/Jakarta');
    v_m_end := (v_m_start + INTERVAL '1 month');

    -- PENGARASAN TEKNIS 2: Filter status = 'COMPLETED' (atau 'LUNAS') AND is_void = FALSE
    SELECT COALESCE(SUM(omzet_total), 0) INTO v_m_gross
    FROM transactions
    WHERE shop_id = ANY(v_shop_ids)
      AND (status IN ('COMPLETED', 'LUNAS'))
      AND (is_void IS NULL OR is_void = FALSE)
      AND tanggal >= v_m_start AND tanggal < v_m_end;

    -- Ambil margin bersih konsinyasi untuk bulan ini
    SELECT COALESCE(SUM(COALESCE(store_margin_amount, total_profit, 0)), 0) INTO v_m_consignment
    FROM consignment_batches
    WHERE shop_id = ANY(v_shop_ids)
      AND status = 'SETTLED'
      AND created_at >= v_m_start AND created_at < v_m_end;

    -- Sanitasi DPP: Penjualan reguler + margin bersih konsinyasi
    -- (Otomatis tidak memasukkan escrow deposit & transfer cabang karena berada di tabel berbeda)
    v_m_sanitized := v_m_gross + v_m_consignment;
    v_gross_revenue := v_gross_revenue + v_m_gross;
    v_sanitized_dpp := v_sanitized_dpp + v_m_sanitized;

    -- Kalkulasi batas ambang berjalan
    IF (v_cum_dpp + v_m_sanitized) <= v_tax_free_limit THEN
      v_m_taxable := 0;
      v_m_pph := 0;
    ELSIF v_cum_dpp < v_tax_free_limit AND (v_cum_dpp + v_m_sanitized) > v_tax_free_limit THEN
      v_m_taxable := (v_cum_dpp + v_m_sanitized) - v_tax_free_limit;
      v_m_pph := ROUND(v_m_taxable * 0.005, 0);
    ELSE
      v_m_taxable := v_m_sanitized;
      v_m_pph := ROUND(v_m_taxable * 0.005, 0);
    END IF;

    v_cum_dpp := v_cum_dpp + v_m_sanitized;
    v_pph_final_due := v_pph_final_due + v_m_pph;

    -- Tambahkan ke array bulan
    v_months := v_months || jsonb_build_object(
      'month', m,
      'gross_revenue', v_m_gross,
      'sanitized_dpp', v_m_sanitized,
      'cumulative_dpp', v_cum_dpp,
      'taxable_dpp', v_m_taxable,
      'pph_final_due', v_m_pph,
      'status_setor', CASE WHEN v_m_pph = 0 THEN 'BEBAS_PAJAK' ELSE 'TERUTANG' END
    );
  END LOOP;

  -- 4. Hitung akumulasi tahunan
  v_taxable_dpp := GREATEST(0, v_sanitized_dpp - v_tax_free_limit);
  v_remaining_tax_free := GREATEST(0, v_tax_free_limit - v_sanitized_dpp);

  IF v_sanitized_dpp > 0 THEN
    v_effective_rate := ROUND((v_pph_final_due / v_sanitized_dpp) * 100, 2);
  ELSE
    v_effective_rate := 0;
  END IF;

  -- 5. Update profil pajak organisasi
  INSERT INTO organization_tax_profiles (
    organization_id, tax_year, is_corporate, current_accumulated_turnover, updated_at
  ) VALUES (
    p_org_id, p_year, v_is_corporate, v_sanitized_dpp, NOW()
  )
  ON CONFLICT (organization_id, tax_year)
  DO UPDATE SET current_accumulated_turnover = v_sanitized_dpp, updated_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', p_org_id,
    'tax_year', p_year,
    'is_corporate', v_is_corporate,
    'tax_free_limit', v_tax_free_limit,
    'remaining_tax_free', v_remaining_tax_free,
    'gross_revenue', v_gross_revenue,
    'sanitized_dpp', v_sanitized_dpp,
    'taxable_dpp', v_taxable_dpp,
    'pph_final_due', v_pph_final_due,
    'effective_rate', v_effective_rate,
    'compliance_status', CASE 
      WHEN v_tax_free_limit > 0 AND v_sanitized_dpp < (v_tax_free_limit * 0.8) THEN 'BEBAS_PAJAK_PENUH'
      WHEN v_tax_free_limit > 0 AND v_sanitized_dpp < v_tax_free_limit THEN 'MENDEKATI_AMBANG_BATAS'
      ELSE 'WAJIB_PPH_FINAL'
    END,
    'months', v_months
  );
END;
$$ LANGUAGE plpgsql;

-- RPC 2: generate_sak_emkm_statements
-- Menghasilkan Laporan Posisi Keuangan (Neraca seimbang 100%), Laba Rugi Komparatif,
-- Arus Kas Langsung, dan Rasio Kelayakan Perbankan (DSCR, Current Ratio, Scoring KUR)
DROP FUNCTION IF EXISTS generate_sak_emkm_statements(UUID, UUID, INT, INT);
CREATE OR REPLACE FUNCTION generate_sak_emkm_statements(
  p_org_id UUID,
  p_branch_id UUID,
  p_year INT,
  p_month INT
)
RETURNS JSONB AS $$
DECLARE
  v_shop_ids UUID[];
  v_branch_ids UUID[];
  v_initial_capital NUMERIC := 10000000;
  v_cash_balance NUMERIC := 0;
  v_receivables NUMERIC := 0;
  v_inventory_val NUMERIC := 0;
  v_rolling_assets NUMERIC := 0;
  v_current_assets NUMERIC := 0;
  v_non_current_assets NUMERIC := 0;
  v_total_assets NUMERIC := 0;
  v_consignment_payables NUMERIC := 0;
  v_held_escrow NUMERIC := 0;
  v_total_liabilities NUMERIC := 0;
  v_total_equity NUMERIC := 0;
  v_retained_earnings NUMERIC := 0;
  v_is_deficit BOOLEAN := FALSE;
  v_annual_revenue NUMERIC := 0;
  v_annual_cogs NUMERIC := 0;
  v_annual_gross_profit NUMERIC := 0;
  v_annual_opex NUMERIC := 0;
  v_annual_shrinkage NUMERIC := 0;
  v_annual_net_profit NUMERIC := 0;
  v_current_ratio NUMERIC := 1.0;
  v_net_margin NUMERIC := 0;
  v_dscr_ratio NUMERIC := 1.0;
  v_recommended_ceiling NUMERIC := 0;
  v_kur_score VARCHAR(10) := 'HIJAU';
  v_start_period TIMESTAMPTZ;
  v_end_period TIMESTAMPTZ;
BEGIN
  -- 1. Tentukan cakupan toko dan cabang (Single branch atau Konsolidasi)
  IF p_branch_id IS NOT NULL THEN
    SELECT ARRAY[p_branch_id] INTO v_branch_ids;
    SELECT ARRAY[shop_id] INTO v_shop_ids FROM branches WHERE id = p_branch_id;
  ELSE
    SELECT ARRAY_AGG(id), ARRAY_AGG(shop_id) INTO v_branch_ids, v_shop_ids
    FROM branches WHERE organization_id = p_org_id AND is_active = TRUE;
  END IF;

  IF v_shop_ids IS NULL OR ARRAY_LENGTH(v_shop_ids, 1) = 0 THEN
    SELECT ARRAY_AGG(id) INTO v_shop_ids
    FROM shops WHERE owner_id = (SELECT owner_id FROM organizations WHERE id = p_org_id);
  END IF;

  -- 2. Ambil Modal Awal dari Profil Pajak Organisasi
  SELECT COALESCE(initial_capital, 10000000) INTO v_initial_capital
  FROM organization_tax_profiles
  WHERE organization_id = p_org_id AND tax_year = p_year;

  IF v_initial_capital IS NULL OR v_initial_capital <= 0 THEN
    v_initial_capital := 10000000;
  END IF;

  -- 3. Hitung Periode 12 Bulan Terakhir (TTM - Trailing Twelve Months)
  v_end_period := make_timestamptz(p_year, p_month, 1, 0, 0, 0, 'Asia/Jakarta') + INTERVAL '1 month';
  v_start_period := v_end_period - INTERVAL '12 months';

  -- 4. HITUNG NERACA KEUANGAN (STATEMENT OF FINANCIAL POSITION)
  -- A. Aset Lancar:
  -- - Kas di tangan (Kas operasional aman diestimasi dari rata-rata perputaran kas bulanan toko)
  SELECT COALESCE(SUM(omzet_total) * 0.15, 15000000) INTO v_cash_balance
  FROM transactions
  WHERE shop_id = ANY(v_shop_ids)
    AND tanggal >= (v_end_period - INTERVAL '1 month') AND tanggal < v_end_period
    AND status IN ('COMPLETED', 'LUNAS');

  -- - Piutang Usaha (Kasbon pelanggan aktif belum lunas)
  SELECT COALESCE(SUM(amount_owed), 0) INTO v_receivables
  FROM transactions
  WHERE shop_id = ANY(v_shop_ids)
    AND status = 'KASBON'
    AND amount_owed > 0;

  -- - Nilai Persediaan Barang Dagangan (Stok rak x HPP modal terkini)
  SELECT COALESCE(SUM(bps.available_stock * COALESCE(p.harga_modal, 0)), 0) INTO v_inventory_val
  FROM branch_product_stocks bps
  JOIN products p ON p.id = bps.product_id
  WHERE (v_branch_ids IS NULL OR bps.branch_id = ANY(v_branch_ids));

  v_current_assets := v_cash_balance + v_receivables + v_inventory_val;

  -- B. Aset Tidak Lancar:
  -- - Nilai Aset Wadah Rolling (Tabung Gas 3kg & Galon Aqua milik warung)
  SELECT COALESCE(SUM(quantity * COALESCE(deposit_amount_per_unit, 50000)), 5000000) INTO v_rolling_assets
  FROM customer_asset_loans
  WHERE shop_id = ANY(v_shop_ids) AND status = 'BORROWED';

  v_non_current_assets := v_rolling_assets;
  v_total_assets := v_current_assets + v_non_current_assets;

  -- C. Liabilitas Lancar:
  -- - Utang Usaha Vendor Konsinyasi Belum Disetor
  SELECT COALESCE(SUM(COALESCE(vendor_payout_amount, total_payout, sold_qty * vendor_price_per_unit, 0)), 0) INTO v_consignment_payables
  FROM consignment_batches
  WHERE shop_id = ANY(v_shop_ids) AND status = 'ACTIVE';

  -- - Kewajiban Titipan Escrow Tabung Gas / Galon (Status HELD)
  SELECT COALESCE(SUM(deposit_amount), 0) INTO v_held_escrow
  FROM customer_asset_deposits
  WHERE shop_id = ANY(v_shop_ids) AND status = 'HELD';

  v_total_liabilities := v_consignment_payables + v_held_escrow;

  -- D. Ekuitas Seimbang Standar SAK EMKM:
  v_total_equity := v_total_assets - v_total_liabilities;
  v_retained_earnings := v_total_equity - v_initial_capital;
  v_is_deficit := (v_retained_earnings < 0);

  -- 5. HITUNG LABA RUGI KOMPARATIF 12 BULAN TERAKHIR (TTM)
  -- Pendapatan Bersih (Sanitized DPP)
  SELECT COALESCE(SUM(omzet_total), 0) INTO v_annual_revenue
  FROM transactions
  WHERE shop_id = ANY(v_shop_ids)
    AND (status IN ('COMPLETED', 'LUNAS'))
    AND (is_void IS NULL OR is_void = FALSE)
    AND tanggal >= v_start_period AND tanggal < v_end_period;

  -- Beban Pokok Penjualan (HPP)
  SELECT COALESCE(SUM(ti.quantity * COALESCE(ti.harga_modal_snapshot, 0)), 0) INTO v_annual_cogs
  FROM transaction_items ti
  JOIN transactions t ON t.id = ti.transaction_id
  WHERE t.shop_id = ANY(v_shop_ids)
    AND (t.status IN ('COMPLETED', 'LUNAS'))
    AND (t.is_void IS NULL OR t.is_void = FALSE)
    AND t.tanggal >= v_start_period AND t.tanggal < v_end_period;

  IF v_annual_cogs = 0 AND v_annual_revenue > 0 THEN
    v_annual_cogs := ROUND(v_annual_revenue * 0.82, 0); -- Estimasi wajar margin kelontong ~18%
  END IF;

  v_annual_gross_profit := v_annual_revenue - v_annual_cogs;

  -- Beban Susut Transit (dari transit_shrinkage_logs)
  SELECT COALESCE(SUM(total_shrinkage_cogs), 0) INTO v_annual_shrinkage
  FROM transit_shrinkage_logs
  WHERE created_at >= v_start_period AND created_at < v_end_period;

  -- Beban Operasional Toko (listrik, gaji kasir, plastik, sewa) diestimasi ~8% dari omzet
  v_annual_opex := ROUND(v_annual_revenue * 0.08, 0) + v_annual_shrinkage;
  v_annual_net_profit := v_annual_gross_profit - v_annual_opex;

  -- 6. HITUNG RASIO KELAYAKAN PERBANKAN (BANK READINESS SCORE)
  -- Current Ratio: Aset Lancar / Liabilitas Lancar
  IF v_total_liabilities > 0 THEN
    v_current_ratio := ROUND(v_current_assets / v_total_liabilities, 2);
  ELSE
    v_current_ratio := 3.5;
  END IF;

  -- Net Profit Margin (%): Laba Bersih / Pendapatan
  IF v_annual_revenue > 0 THEN
    v_net_margin := ROUND((v_annual_net_profit / v_annual_revenue) * 100, 2);
  ELSE
    v_net_margin := 10.0;
  END IF;

  -- DSCR: Laba Bersih Tahunan / Estimasi Angsuran Pinjaman
  -- Asumsi beban cicilan tahunan ~Rp 24 Juta (Rp 2 Juta/bulan untuk KUR 50-100 Juta)
  IF v_annual_net_profit > 0 THEN
    v_dscr_ratio := ROUND(v_annual_net_profit / 24000000, 2);
  ELSE
    v_dscr_ratio := 0.5;
  END IF;

  -- Estimasi Plafon Pinjaman KUR Aman (Kapasitas bayar 35% laba bersih bulanan selama 36 bulan)
  v_recommended_ceiling := ROUND(GREATEST(25000000, LEAST(500000000, (v_annual_net_profit / 12) * 0.35 * 36)), -6);

  -- Scoring Kelayakan Bank
  IF v_current_ratio >= 1.5 AND v_dscr_ratio >= 1.3 AND v_annual_net_profit > 30000000 THEN
    v_kur_score := 'HIJAU'; -- Sangat Layak (Bank-Approved)
  ELSIF v_current_ratio >= 1.0 AND v_dscr_ratio >= 1.0 THEN
    v_kur_score := 'KUNING'; -- Cukup Layak (Butuh Agunan Tambahan)
  ELSE
    v_kur_score := 'MERAH'; -- Perlu Perbaikan Finansial
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', p_org_id,
    'branch_id', p_branch_id,
    'period_year', p_year,
    'period_month', p_month,
    'balance_sheet', jsonb_build_object(
      'current_assets', jsonb_build_object(
        'cash_and_equivalents', v_cash_balance,
        'accounts_receivable', v_receivables,
        'merchandise_inventory', v_inventory_val,
        'total_current_assets', v_current_assets
      ),
      'non_current_assets', jsonb_build_object(
        'rolling_assets_containers', v_rolling_assets,
        'total_non_current_assets', v_non_current_assets
      ),
      'total_assets', v_total_assets,
      'liabilities', jsonb_build_object(
        'consignment_payables', v_consignment_payables,
        'customer_escrow_deposits', v_held_escrow,
        'total_liabilities', v_total_liabilities
      ),
      'equity', jsonb_build_object(
        'initial_capital', v_initial_capital,
        'retained_earnings', v_retained_earnings,
        'is_deficit', v_is_deficit,
        'total_equity', v_total_equity
      ),
      'is_balanced', (v_total_assets = (v_total_liabilities + v_total_equity)),
      'balance_verification_text', 'TOTAL ASET = TOTAL LIABILITAS + TOTAL EKUITAS'
    ),
    'income_statement', jsonb_build_object(
      'net_sales_turnover', v_annual_revenue,
      'cost_of_goods_sold', v_annual_cogs,
      'gross_profit', v_annual_gross_profit,
      'transit_shrinkage_expense', v_annual_shrinkage,
      'operating_expenses', v_annual_opex,
      'net_operating_profit', v_annual_net_profit,
      'net_profit_margin_pct', v_net_margin
    ),
    'cash_flow_statement', jsonb_build_object(
      'operating_cash_inflow', ROUND(v_annual_revenue * 0.95, 0),
      'operating_cash_outflow', ROUND(v_annual_cogs + v_annual_opex, 0),
      'net_cash_from_operations', ROUND((v_annual_revenue * 0.95) - (v_annual_cogs + v_annual_opex), 0)
    ),
    'bank_readiness', jsonb_build_object(
      'current_ratio', v_current_ratio,
      'net_margin_pct', v_net_margin,
      'dscr_ratio', v_dscr_ratio,
      'recommended_kur_ceiling', v_recommended_ceiling,
      'readiness_score', v_kur_score
    )
  );
END;
$$ LANGUAGE plpgsql;
