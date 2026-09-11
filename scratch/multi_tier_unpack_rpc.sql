-- ==============================================================================
-- TAHAP 6: ATOMIC MULTI-TIER AUTO-UNPACK WITH COGS PROPAGATION
-- ==============================================================================

-- 1. Pastikan kolom stock ada di product_units
ALTER TABLE product_units 
  ADD COLUMN IF NOT EXISTS stock INT DEFAULT 0;

-- 2. Stored Procedure Atomik Pemecah Satuan
CREATE OR REPLACE FUNCTION execute_atomic_unit_unpack(
  p_product_id UUID,
  p_required_pcs INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_shop_id UUID;
  v_product_name VARCHAR;
  v_current_stock INT;
  v_current_cogs BIGINT;
  v_unit_id UUID;
  v_unit_name VARCHAR;
  v_multiplier INT;
  v_unit_stock INT;
  v_unit_price BIGINT;
  v_unpacks_needed INT;
  v_added_pcs INT;
  v_parent_cogs NUMERIC;
  v_unit_cogs NUMERIC;
  v_new_stock INT;
BEGIN
  -- 1. Kunci baris produk dengan SELECT FOR UPDATE
  SELECT shop_id, nama, stok_saat_ini, harga_modal
  INTO v_shop_id, v_product_name, v_current_stock, v_current_cogs
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PRODUCT_NOT_FOUND: Produk % tidak ditemukan', p_product_id;
  END IF;

  -- Jika stok eceran saat ini sudah mencukupi, tidak perlu unpack
  IF v_current_stock >= p_required_pcs THEN
    RETURN jsonb_build_object(
      'success', true,
      'needed_unpack', false,
      'product_id', p_product_id,
      'current_stock', v_current_stock,
      'message', 'Stok eceran sudah mencukupi'
    );
  END IF;

  -- 2. Ambil unit kemasan induk terdekat yang memiliki stok > 0
  SELECT id, unit_name, multiplier_to_base, stock, price
  INTO v_unit_id, v_unit_name, v_multiplier, v_unit_stock, v_unit_price
  FROM product_units
  WHERE product_id = p_product_id
    AND multiplier_to_base > 1
    AND stock > 0
  ORDER BY multiplier_to_base ASC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INSUFFICIENT_PARENT_STOCK: Tidak ada kemasan induk bertingkat dengan stok tersedia untuk produk %', v_product_name;
  END IF;

  -- 3. Hitung berapa kemasan induk yang harus dipecah
  v_unpacks_needed := CEIL((p_required_pcs - v_current_stock)::numeric / v_multiplier::numeric)::int;

  IF v_unit_stock < v_unpacks_needed THEN
    RAISE EXCEPTION 'INSUFFICIENT_PARENT_STOCK: Stok % hanya tersisa %, butuh % kemasan untuk dipecah', 
      v_unit_name, v_unit_stock, v_unpacks_needed;
  END IF;

  v_added_pcs := v_unpacks_needed * v_multiplier;
  v_new_stock := v_current_stock + v_added_pcs;

  -- 4. PATCH TEKNIS 1: Propagasi HPP Proporsional
  -- parent_cogs dihitung dari harga_modal dasar x multiplier, atau estimasi dari unit_price
  v_parent_cogs := COALESCE(NULLIF(v_current_cogs * v_multiplier, 0), v_unit_price);
  v_unit_cogs := ROUND(v_parent_cogs / v_multiplier, 2);

  -- 5. Mutasi atomik stok kemasan induk & produk eceran
  UPDATE product_units
  SET stock = stock - v_unpacks_needed,
      updated_at = NOW()
  WHERE id = v_unit_id;

  UPDATE products
  SET stok_saat_ini = v_new_stock,
      updated_at = NOW()
  WHERE id = p_product_id;

  -- 6. Catat audit riwayat mutasi stok ke stock_mutations
  INSERT INTO stock_mutations (
    shop_id,
    product_id,
    mutation_type,
    unit_id,
    unit_name,
    quantity_units,
    quantity_base,
    previous_cost,
    new_cost,
    total_spend,
    notes,
    created_at
  ) VALUES (
    v_shop_id,
    p_product_id,
    'AUTO_UNPACK',
    v_unit_id,
    v_unit_name,
    -v_unpacks_needed,
    v_added_pcs,
    v_current_cogs,
    v_unit_cogs::bigint,
    0,
    format('[AUTO_UNPACK] Memecah %s unit %s (x%s) menjadi %s Pcs eceran (HPP Rp %s/pcs)', 
      v_unpacks_needed, v_unit_name, v_multiplier, v_added_pcs, v_unit_cogs),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'needed_unpack', true,
    'product_id', p_product_id,
    'unpacked_unit_id', v_unit_id,
    'unpacked_unit_name', v_unit_name,
    'unpacks_count', v_unpacks_needed,
    'multiplier', v_multiplier,
    'added_pcs', v_added_pcs,
    'previous_stock', v_current_stock,
    'new_stock', v_new_stock,
    'unit_cogs', v_unit_cogs
  );
END;
$$;
