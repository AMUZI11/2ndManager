-- Master Production Audit: Enforce RLS and Tenant Isolation on 8 Target Tables

-- 1. Enable RLS on all 8 tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_product_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- 2. Policies for organizations
DROP POLICY IF EXISTS "tenant_organizations_owner" ON organizations;
CREATE POLICY "tenant_organizations_owner" ON organizations
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "tenant_organizations_member" ON organizations;
CREATE POLICY "tenant_organizations_member" ON organizations
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT b.organization_id FROM branches b
      JOIN user_shops us ON us.shop_id = b.shop_id
      WHERE us.user_id = auth.uid()
    )
  );

-- 3. Policies for branches
DROP POLICY IF EXISTS "tenant_branches" ON branches;
CREATE POLICY "tenant_branches" ON branches
  FOR ALL TO authenticated
  USING (
    organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
    OR shop_id IN (SELECT shop_id FROM user_shops WHERE user_id = auth.uid())
    OR (get_my_shop_id() IS NOT NULL AND shop_id = get_my_shop_id())
  )
  WITH CHECK (
    organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
    OR shop_id IN (SELECT shop_id FROM user_shops WHERE user_id = auth.uid())
    OR (get_my_shop_id() IS NOT NULL AND shop_id = get_my_shop_id())
  );

-- 4. Policies for branch_product_stocks
DROP POLICY IF EXISTS "tenant_branch_product_stocks" ON branch_product_stocks;
CREATE POLICY "tenant_branch_product_stocks" ON branch_product_stocks
  FOR ALL TO authenticated
  USING (
    branch_id IN (
      SELECT id FROM branches
      WHERE organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
         OR shop_id IN (SELECT shop_id FROM user_shops WHERE user_id = auth.uid())
         OR (get_my_shop_id() IS NOT NULL AND shop_id = get_my_shop_id())
    )
  )
  WITH CHECK (
    branch_id IN (
      SELECT id FROM branches
      WHERE organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
         OR shop_id IN (SELECT shop_id FROM user_shops WHERE user_id = auth.uid())
         OR (get_my_shop_id() IS NOT NULL AND shop_id = get_my_shop_id())
    )
  );

-- 5. Policies for stock_transfers
DROP POLICY IF EXISTS "tenant_stock_transfers" ON stock_transfers;
CREATE POLICY "tenant_stock_transfers" ON stock_transfers
  FOR ALL TO authenticated
  USING (
    organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
    OR source_branch_id IN (SELECT id FROM branches WHERE shop_id IN (SELECT shop_id FROM user_shops WHERE user_id = auth.uid()))
    OR target_branch_id IN (SELECT id FROM branches WHERE shop_id IN (SELECT shop_id FROM user_shops WHERE user_id = auth.uid()))
  )
  WITH CHECK (
    organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
    OR source_branch_id IN (SELECT id FROM branches WHERE shop_id IN (SELECT shop_id FROM user_shops WHERE user_id = auth.uid()))
    OR target_branch_id IN (SELECT id FROM branches WHERE shop_id IN (SELECT shop_id FROM user_shops WHERE user_id = auth.uid()))
  );
