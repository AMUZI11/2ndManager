-- scratch/procurement_reorder_rpc.sql
-- Stored Function PostgreSQL untuk Agregasi Rekomendasi Belanja Pasar Subuh
-- Bebas Bias Stok Nol (Stockout-Aware Velocity) & Multi-Tier Packaging

CREATE OR REPLACE FUNCTION get_stockout_aware_reorder_suggestions(
  p_shop_id UUID,
  p_target_days INT DEFAULT 3
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_store_hours_per_day NUMERIC := 14.0;
  v_analysis_days INT := 14;
  v_since_timestamp TIMESTAMPTZ := NOW() - (v_analysis_days || ' days')::INTERVAL;
BEGIN
  WITH sales_agg AS (
    -- 1. Total penjualan 14 hari terakhir per produk
    SELECT 
      ti.product_id,
      COALESCE(SUM(ti.quantity), 0) AS total_sold,
      COUNT(DISTINCT DATE(t.created_at)) AS distinct_sale_days
    FROM transaction_items ti
    JOIN transactions t ON t.id = ti.transaction_id
    WHERE t.shop_id = p_shop_id
      AND t.status = 'Lunas'
      AND t.created_at >= v_since_timestamp
      AND (ti.is_bonus_item IS NULL OR ti.is_bonus_item = FALSE)
    GROUP BY ti.product_id
  ),
  stockout_agg AS (
    -- 2. Estimasi jam stok habis berdasarkan mutasi stok terakhir
    SELECT 
      sm.product_id,
      COALESCE(
        SUM(
          CASE 
            WHEN sm.stock_after <= 0 THEN 24.0
            ELSE 0.0
          END
        ), 0
      ) AS out_of_stock_hours_approx
    FROM stock_mutations sm
    WHERE sm.shop_id = p_shop_id
      AND sm.created_at >= v_since_timestamp
    GROUP BY sm.product_id
  ),
  product_units_agg AS (
    -- 3. Kemasan grosir terbesar per produk (multiplier > 1)
    SELECT DISTINCT ON (pu.product_id)
      pu.product_id,
      pu.id AS unit_id,
      pu.unit_name,
      pu.multiplier_to_base,
      pu.price AS unit_price
    FROM product_units pu
    WHERE pu.shop_id = p_shop_id
      AND pu.is_base_unit = FALSE
      AND pu.multiplier_to_base > 1
    ORDER BY pu.product_id, pu.multiplier_to_base DESC
  ),
  analyzed_skus AS (
    -- 4. Kalkulasi stockout-aware velocity & saran kulakan per SKU
    SELECT 
      p.id AS product_id,
      p.nama AS product_name,
      p.barcode,
      p.tipe,
      p.stock AS current_stock,
      COALESCE(p.harga_modal, 0) AS harga_modal,
      COALESCE(p.reorder_threshold, 5) AS safety_stock_threshold,
      COALESCE(p.lead_time_days, s.lead_time_days, 1) AS lead_time_days,
      COALESCE(s.id, NULL) AS supplier_id,
      COALESCE(s.name, 'Pasar Induk Subuh / Belanja Umum') AS supplier_name,
      s.phone AS supplier_phone,
      COALESCE(sa.total_sold, 0) AS total_sold,
      -- Jam aktif stok (> 0). Minimal 12 jam untuk mencegah pembagian nol:
      GREATEST(
        12.0, 
        (v_analysis_days * v_store_hours_per_day) - COALESCE(soa.out_of_stock_hours_approx, 0.0)
      ) AS active_in_stock_hours,
      pua.unit_name AS wholesale_unit_name,
      COALESCE(pua.multiplier_to_base, 1) AS wholesale_multiplier
    FROM products p
    LEFT JOIN suppliers s ON s.id = p.supplier_id
    LEFT JOIN sales_agg sa ON sa.product_id = p.id
    LEFT JOIN stockout_agg soa ON soa.product_id = p.id
    LEFT JOIN product_units_agg pua ON pua.product_id = p.id
    WHERE p.shop_id = p_shop_id
      AND p.is_deleted = FALSE
      AND p.is_consignment = FALSE
      AND p.is_active = TRUE
  ),
  computed_reorders AS (
    SELECT 
      product_id,
      product_name,
      barcode,
      tipe,
      current_stock,
      harga_modal,
      supplier_id,
      supplier_name,
      supplier_phone,
      ROUND((total_sold / active_in_stock_hours) * v_store_hours_per_day, 2) AS real_daily_velocity,
      CEIL(ROUND((total_sold / active_in_stock_hours) * v_store_hours_per_day, 2) * lead_time_days * 1.5) AS safety_stock,
      wholesale_unit_name,
      wholesale_multiplier,
      -- Target stock = (Velocity * Target Days) + Safety Stock
      CEIL(ROUND((total_sold / active_in_stock_hours) * v_store_hours_per_day, 2) * p_target_days) + 
      CEIL(ROUND((total_sold / active_in_stock_hours) * v_store_hours_per_day, 2) * lead_time_days * 1.5) AS target_stock_level,
      -- Suggested Base Pcs:
      GREATEST(
        0,
        (
          CEIL(ROUND((total_sold / active_in_stock_hours) * v_store_hours_per_day, 2) * p_target_days) + 
          CEIL(ROUND((total_sold / active_in_stock_hours) * v_store_hours_per_day, 2) * lead_time_days * 1.5)
        ) - current_stock
      ) AS suggested_base_pcs
    FROM analyzed_skus
  )
  SELECT jsonb_build_object(
    'generated_at', NOW(),
    'shop_id', p_shop_id,
    'target_days', p_target_days,
    'total_skus_evaluated', COUNT(*),
    'reorder_items', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', product_id,
          'nama', product_name,
          'barcode', barcode,
          'tipe', tipe,
          'current_stock', current_stock,
          'harga_modal', harga_modal,
          'supplier_id', supplier_id,
          'supplier_name', supplier_name,
          'supplier_phone', supplier_phone,
          'daily_velocity', real_daily_velocity,
          'safety_stock', safety_stock,
          'suggested_pcs', suggested_base_pcs,
          'wholesale_unit', wholesale_unit_name,
          'wholesale_multiplier', wholesale_multiplier,
          'suggested_packs', CASE 
            WHEN wholesale_multiplier > 1 THEN CEIL(suggested_base_pcs::NUMERIC / wholesale_multiplier)
            ELSE suggested_base_pcs
          END,
          'estimated_cost', suggested_base_pcs * harga_modal,
          'is_urgent', current_stock <= 0
        )
      ) FILTER (WHERE suggested_base_pcs > 0 OR current_stock <= safety_stock),
      '[]'::jsonb
    )
  ) INTO v_result
  FROM computed_reorders;

  RETURN v_result;
END;
$$;
