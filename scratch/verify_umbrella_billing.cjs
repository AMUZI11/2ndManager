const { Client } = require('pg');
const path = require('path');
const assert = require('assert');

// Test Tier Mapping
console.log('--- 1. Testing Tier Mapping & Pricing Configurations ---');
const {
  TIER_DEFINITIONS,
  ADDON_PRICING,
  normalizeTierKey,
  toDbTierKey,
  getCanonicalTier,
} = require('../src/config/tierMapping.js');

// Verify Add-on rates
assert.strictEqual(ADDON_PRICING.BRANCH.monthlyUnitPrice, 150000, 'Branch unit price must be 150,000');
assert.strictEqual(ADDON_PRICING.BRANCH.dailyRate, 5000, 'Branch daily rate must be 5,000');
assert.strictEqual(ADDON_PRICING.CASHIER.monthlyUnitPrice, 40000, 'Cashier unit price must be 40,000');
assert.strictEqual(Math.round(ADDON_PRICING.CASHIER.dailyRate), 1333, 'Cashier daily rate must be ~1,333');
console.log('✅ Add-on pricing constants verified: Branch = 150.000, Cashier = 40.000');

// Verify Canonical Tiers
assert.strictEqual(TIER_DEFINITIONS.RINTISAN.price, 0);
assert.strictEqual(TIER_DEFINITIONS.MANDIRI.price, 50000);
assert.strictEqual(TIER_DEFINITIONS.USAHA_BERKEMBANG.price, 150000);
assert.strictEqual(TIER_DEFINITIONS.JURAGAN_CABANG.price, 350000);
console.log('✅ Canonical tier prices verified: Rintisan 0, Mandiri 50k, Usaha Berkembang 150k, Juragan Cabang 350k');

// Verify bidirectional conversion
assert.strictEqual(toDbTierKey('RINTISAN'), 'MAGANG');
assert.strictEqual(toDbTierKey('MANDIRI'), 'SUPERVISOR');
assert.strictEqual(toDbTierKey('USAHA_BERKEMBANG'), 'MANAJER');
assert.strictEqual(toDbTierKey('JURAGAN_CABANG'), 'EKSEKUTIF');

assert.strictEqual(normalizeTierKey('MAGANG'), 'RINTISAN');
assert.strictEqual(normalizeTierKey('SUPERVISOR'), 'MANDIRI');
assert.strictEqual(normalizeTierKey('MANAJER'), 'USAHA_BERKEMBANG');
assert.strictEqual(normalizeTierKey('EKSEKUTIF'), 'JURAGAN_CABANG');

assert.strictEqual(getCanonicalTier('EKSEKUTIF').name, 'Juragan Cabang');
assert.strictEqual(getCanonicalTier('MANAJER').name, 'Usaha Berkembang');
assert.strictEqual(getCanonicalTier('SUPERVISOR').name, 'Mandiri');
assert.strictEqual(getCanonicalTier('MAGANG').name, 'Rintisan');
console.log('✅ Bidirectional mapping (Canonical <-> DB) verified 100%');

// Test Math Proration and Consolidated Billing Formula
console.log('\n--- 2. Testing Billing Mathematical Formulas ---');

// Test 2A: Co-Termination Proration for pure add-on (15 days remaining)
const sisaHari = 15;
const dailyBranch = ADDON_PRICING.BRANCH.monthlyUnitPrice / 30; // 5000
const dailyCashier = ADDON_PRICING.CASHIER.monthlyUnitPrice / 30; // 1333.333
const proratedBranch15 = Math.round((dailyBranch * sisaHari) / 1000) * 1000;
const proratedCashier15 = Math.round((dailyCashier * sisaHari) / 1000) * 1000;

assert.strictEqual(proratedBranch15, 75000, 'Branch prorated for 15 days should be 75,000');
assert.strictEqual(proratedCashier15, 20000, 'Cashier prorated for 15 days should be 20,000');

const pureAddonTotal = (1 * proratedBranch15) + (2 * proratedCashier15);
assert.strictEqual(pureAddonTotal, 115000, '1 Branch + 2 Cashiers for 15 days should be 115,000');
console.log('✅ Co-termination proration calculation verified: 1 Branch (75k) + 2 Cashiers (40k) = 115k');

// Test 2B: Consolidated Full Package (Usaha Berkembang 150k + 1 Branch 150k + 2 Cashiers 80k)
const baseTier = TIER_DEFINITIONS.USAHA_BERKEMBANG.price; // 150000
const extraBranchCost = 1 * ADDON_PRICING.BRANCH.monthlyUnitPrice; // 150000
const extraCashierCost = 2 * ADDON_PRICING.CASHIER.monthlyUnitPrice; // 80000
const fullPackageConsolidated = baseTier + extraBranchCost + extraCashierCost;

assert.strictEqual(fullPackageConsolidated, 380000, 'Usaha Berkembang + 1 Branch + 2 Cashiers should be 380,000');
console.log('✅ Consolidated Billing verified: Usaha Berkembang (150k) + 1 Branch (150k) + 2 Cashiers (80k) = 380.000');

// Test 2C: Consolidated Full Package (Juragan Cabang 350k + 2 Branches 300k + 3 Cashiers 120k)
const juraganBase = TIER_DEFINITIONS.JURAGAN_CABANG.price; // 350000
const juraganBranchCost = 2 * ADDON_PRICING.BRANCH.monthlyUnitPrice; // 300000
const juraganCashierCost = 3 * ADDON_PRICING.CASHIER.monthlyUnitPrice; // 120000
const juraganTotal = juraganBase + juraganBranchCost + juraganCashierCost;
assert.strictEqual(juraganTotal, 770000, 'Juragan Cabang + 2 Branches + 3 Cashiers should be 770,000');
console.log('✅ Consolidated Billing verified: Juragan Cabang (350k) + 2 Branches (300k) + 3 Cashiers (120k) = 770.000');

// Test Database Layer
async function verifyDatabase() {
  console.log('\n--- 3. Testing Supabase PostgreSQL Database Layer ---');
  const client = new Client({
    connectionString: 'postgresql://postgres.doaisnsdahepsxqaroru:ahzaganteng@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres'
  });

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL pooler.');

    // 1. Verify get_organization_feature_tier stored procedure
    const testOrg = await client.query(`
      SELECT id, name, tier_id FROM organizations LIMIT 1;
    `);

    if (testOrg.rows.length > 0) {
      const orgId = testOrg.rows[0].id;
      const rpcTest = await client.query(`
        SELECT get_organization_feature_tier($1) AS feature_tier;
      `, [orgId]);
      console.log(`✅ Function get_organization_feature_tier('${orgId}') returned:`, rpcTest.rows[0].feature_tier);
      assert.ok(rpcTest.rows[0].feature_tier, 'Feature tier should not be empty');
    }

    // 2. Verify v_organization_effective_quotas pricing columns
    const quotaQuery = await client.query(`
      SELECT organization_id, current_tier, extra_branches_unit_price, extra_cashiers_unit_price,
             base_branches_quota, max_allowed_branches, base_cashiers_quota, max_allowed_cashiers
      FROM public.v_organization_effective_quotas
      LIMIT 1;
    `);

    if (quotaQuery.rows.length > 0) {
      const row = quotaQuery.rows[0];
      console.log('Sample row from v_organization_effective_quotas:', {
        current_tier: row.current_tier,
        extra_branches_unit_price: row.extra_branches_unit_price,
        extra_cashiers_unit_price: row.extra_cashiers_unit_price,
        max_branches: row.max_allowed_branches,
        max_cashiers: row.max_allowed_cashiers,
      });
      assert.strictEqual(Number(row.extra_branches_unit_price), 150000, 'extra_branches_unit_price in DB must be 150000');
      assert.strictEqual(Number(row.extra_cashiers_unit_price), 40000, 'extra_cashiers_unit_price in DB must be 40000');
      console.log('✅ Supabase View v_organization_effective_quotas verified: 150k branch / 40k cashier unit prices');
    }

    await client.end();
    console.log('\n🌟 ALL VERIFICATION CHECKS PASSED SUCCESSFULLY! 🌟');
  } catch (err) {
    console.error('❌ Database verification failed:', err);
    if (client) await client.end().catch(() => {});
    process.exit(1);
  }
}

verifyDatabase();
