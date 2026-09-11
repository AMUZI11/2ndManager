-- Run this in Supabase SQL Editor
-- Atomic stock decrement to prevent race conditions
CREATE OR REPLACE FUNCTION decrement_stock(p_product_id UUID, p_qty INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE products
  SET stock = stock - p_qty,
      updated_at = NOW()
  WHERE id = p_product_id;
END;
$$;
