const { Client } = require('pg');
const crypto = require('crypto');

const client = new Client({
  connectionString: 'postgresql://postgres.doaisnsdahepsxqaroru:ahzaganteng@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres'
});

// Helper for asserting
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✅ PASS: ${message}`);
}

// 1. Proration Math Logic (Mirroring /api/v1/billing/addons/calculate)
function calculateProration(unitPrice, daysRemaining) {
  if (daysRemaining <= 0) return unitPrice;
  return Math.round(((unitPrice / 30) * daysRemaining) / 1000) * 1000;
}

async function runTests() {
  console.log('====================================================');
  console.log('2NDMANAGER: PHASE 12 ADD-ONS & QUOTAS VERIFICATION');
  console.log('====================================================\n');

  // TEST 1: Proration Formula Verification
  console.log('--- TEST 1: Proration Formula Unit Tests ---');
  {
    const BRANCH_PRICE = 100000;
    const CASHIER_PRICE = 20000;

    // Full 30 days
    assert(calculateProration(BRANCH_PRICE, 30) === 100000, '30 days branch proration is 100.000');
    assert(calculateProration(CASHIER_PRICE, 30) === 20000, '30 days cashier proration is 20.000');

    // 15 days (half month)
    assert(calculateProration(BRANCH_PRICE, 15) === 50000, '15 days branch proration is 50.000');
    assert(calculateProration(CASHIER_PRICE, 15) === 10000, '15 days cashier proration is 10.000');

    // 7 days
    assert(calculateProration(BRANCH_PRICE, 7) === 23000, '7 days branch proration rounded to 23.000');
    assert(calculateProration(CASHIER_PRICE, 7) === 5000, '7 days cashier proration rounded to 5.000');

    // 0 days (expired or base cycle)
    assert(calculateProration(BRANCH_PRICE, 0) === 100000, '0 days branch proration fallback to unit price');
    assert(calculateProration(CASHIER_PRICE, 0) === 20000, '0 days cashier proration fallback to unit price');
  }

  // Connect to PostgreSQL
  await client.connect();
  console.log('\nConnected to database successfully.');

  // Fetch an existing auth user to ensure foreign keys satisfy
  const authUserRes = await client.query('SELECT id FROM auth.users LIMIT 1;');
  const existingUserId = authUserRes.rows[0]?.id || crypto.randomUUID();

  const testOrgId = crypto.randomUUID();
  const testUserId = existingUserId;
  const testShopId = crypto.randomUUID();
  const testShop2Id = crypto.randomUUID();
  const testBranch1Id = crypto.randomUUID();
  const testBranch2Id = crypto.randomUUID();
  
  // For cashier tests, generate test auth user IDs
  const testCashier1Id = crypto.randomUUID();
  const testCashier2Id = crypto.randomUUID();
  let createdAuthUsers = [];

  try {
    // Create entries in auth.users so profiles FK is satisfied
    for (const cid of [testCashier1Id, testCashier2Id]) {
      await client.query(`
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, 'encrypted_dummy', NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `, [cid, `test_cashier_${cid.slice(0, 8)}@example.com`]);
      createdAuthUsers.push(cid);
    }

    // TEST 2: Setup Test Organization & Subscription
    console.log('\n--- TEST 2: Organization Setup & Quota View Initialization ---');
    
    await client.query(`
      INSERT INTO public.organizations (id, name, owner_id, tier_id)
      VALUES ($1, 'Test Addon Warung', $2, 'MAGANG')
      ON CONFLICT (id) DO NOTHING;
    `, [testOrgId, testUserId]);

    await client.query(`
      INSERT INTO public.shops (id, owner_id, name)
      VALUES ($1, $2, 'Toko Utama Addon')
      ON CONFLICT (id) DO NOTHING;
    `, [testShopId, testUserId]);

    await client.query(`
      INSERT INTO public.shops (id, owner_id, name)
      VALUES ($1, $2, 'Toko Cabang Kedua')
      ON CONFLICT (id) DO NOTHING;
    `, [testShop2Id, testUserId]);

    await client.query(`
      INSERT INTO public.organization_subscriptions (
        id, organization_id, current_tier, starts_at, expires_at,
        extra_branches_quota, extra_cashiers_quota, is_active
      ) VALUES (
        gen_random_uuid(), $1, 'MAGANG', NOW(), NOW() + INTERVAL '30 days',
        0, 0, TRUE
      );
    `, [testOrgId]);

    // Query effective quotas view
    const viewRes = await client.query(`
      SELECT * FROM public.v_organization_effective_quotas WHERE organization_id = $1;
    `, [testOrgId]);

    assert(viewRes.rows.length === 1, 'View returns 1 row for test org');
    const qRow = viewRes.rows[0];
    assert(Number(qRow.base_branches_quota) === 1, 'MAGANG base branches is 1');
    assert(Number(qRow.extra_branches_quota) === 0, 'Extra branches is 0 initially');
    assert(Number(qRow.max_allowed_branches) === 1, 'Max allowed branches is 1');
    assert(Number(qRow.base_cashiers_quota) === 1, 'MAGANG base cashiers is 1');
    assert(Number(qRow.extra_cashiers_quota) === 0, 'Extra cashiers is 0 initially');
    assert(Number(qRow.max_allowed_cashiers) === 1, 'Max allowed cashiers is 1');

    // TEST 3: Branch Quota Enforcement Trigger (2NDM-40310)
    console.log('\n--- TEST 3: Branch Quota Enforcement Trigger ---');
    
    // Insert Branch 1 (Main branch, allowed)
    await client.query(`
      INSERT INTO public.branches (id, organization_id, shop_id, name, branch_name, branch_code, is_main_branch, is_active)
      VALUES ($1, $2, $3, 'Cabang Utama', 'Cabang Utama', 'BR-01', TRUE, TRUE);
    `, [testBranch1Id, testOrgId, testShopId]);
    console.log('  ✅ First branch inserted successfully (within quota of 1).');

    // Attempt to insert Branch 2 (Exceeds quota of 1)
    let branchOverflowCaught = false;
    try {
      await client.query(`
        INSERT INTO public.branches (id, organization_id, shop_id, name, branch_name, branch_code, is_main_branch, is_active)
        VALUES ($1, $2, $3, 'Cabang Kedua Overflow', 'Cabang Kedua Overflow', 'BR-02', FALSE, TRUE);
      `, [testBranch2Id, testOrgId, testShop2Id]);
    } catch (err) {
      if (err.message.includes('2NDM-40310')) {
        branchOverflowCaught = true;
        console.log(`  ✅ Successfully caught quota exception: ${err.message}`);
      } else {
        console.error('Unexpected error:', err);
      }
    }
    assert(branchOverflowCaught, 'Trigger correctly rejected 2nd branch with 2NDM-40310');

    // TEST 4: Cashier Quota Enforcement Trigger (2NDM-40311)
    console.log('\n--- TEST 4: Cashier Quota Enforcement Trigger ---');
    
    // Insert Cashier 1 (allowed)
    try {
      await client.query(`
        INSERT INTO public.profiles (id, organization_id, shop_id, full_name, role, is_active)
        VALUES ($1, $2, $3, 'Kasir 1 Resmi', 'CASHIER', TRUE)
        ON CONFLICT (id) DO UPDATE SET organization_id = EXCLUDED.organization_id, role = EXCLUDED.role, is_active = TRUE;
      `, [testCashier1Id, testOrgId, testShopId]);
      console.log('  ✅ First cashier profile inserted successfully (within quota of 1).');
    } catch (c1Err) {
      console.error('Cashier 1 insert error:', c1Err);
      throw c1Err;
    }

    // Attempt to insert Cashier 2 (Exceeds quota of 1)
    let cashierOverflowCaught = false;
    try {
      await client.query(`
        INSERT INTO public.profiles (id, organization_id, shop_id, full_name, role, is_active)
        VALUES ($1, $2, $3, 'Kasir 2 Overflow', 'CASHIER', TRUE)
        ON CONFLICT (id) DO UPDATE SET organization_id = EXCLUDED.organization_id, role = EXCLUDED.role, is_active = TRUE;
      `, [testCashier2Id, testOrgId, testShopId]);
    } catch (err) {
      if (err.message.includes('2NDM-40311')) {
        cashierOverflowCaught = true;
        console.log(`  ✅ Successfully caught cashier quota exception: ${err.message}`);
      } else {
        console.error('Unexpected error:', err);
      }
    }
    assert(cashierOverflowCaught, 'Trigger correctly rejected 2nd cashier with 2NDM-40311');

    // TEST 5: Downgrade Guard RPC (validate_addon_quota_reduction)
    console.log('\n--- TEST 5: Downgrade Guard RPC (Strict Downgrade Protection) ---');

    // Increase extra branch quota to 1 so we can insert the 2nd branch
    await client.query(`
      UPDATE public.organization_subscriptions
      SET extra_branches_quota = 1
      WHERE organization_id = $1;
    `, [testOrgId]);

    // Now 2nd branch insert must succeed
    await client.query(`
      INSERT INTO public.branches (id, organization_id, shop_id, name, branch_name, branch_code, is_main_branch, is_active)
      VALUES ($1, $2, $3, 'Cabang Kedua Resmi', 'Cabang Kedua Resmi', 'BR-02', FALSE, TRUE);
    `, [testBranch2Id, testOrgId, testShop2Id]);
    console.log('  ✅ Second branch successfully inserted with extra quota = 1 (active branches = 2).');

    // Attempt to reduce extra_branches_quota back to 0 while 2 branches are active
    let downgradeBlocked = false;
    try {
      await client.query(`
        SELECT public.validate_addon_quota_reduction($1, 0, 0);
      `, [testOrgId]);
    } catch (err) {
      if (err.message.includes('Nonaktifkan atau arsipkan cabang terlebih dahulu')) {
        downgradeBlocked = true;
        console.log(`  ✅ Successfully prevented illegal downgrade: ${err.message}`);
      } else {
        console.error('Unexpected downgrade error:', err);
      }
    }
    assert(downgradeBlocked, 'validate_addon_quota_reduction blocked reducing quota below active branches');

    // Valid reduction to 1 extra branch (matches 2 active branches)
    const validReduction = await client.query(`
      SELECT public.validate_addon_quota_reduction($1, 1, 0) as res;
    `, [testOrgId]);
    assert(validReduction.rows[0].res.valid === true, 'validate_addon_quota_reduction allowed valid reduction');

    // TEST 6: Optimistic Payment Claim with Add-ons (submit_optimistic_payment_claim)
    console.log('\n--- TEST 6: Optimistic Activation via submit_optimistic_payment_claim ---');

    const claimRes = await client.query(`
      SELECT public.submit_optimistic_payment_claim(
        p_org_id => $1,
        p_user_id => $2,
        p_target_tier => 'MAGANG',
        p_duration_months => 1,
        p_base_price => 390000,
        p_final_price => 390000,
        p_promo_code_id => NULL,
        p_proof_url => 'https://example.com/proof.jpg',
        p_bank => 'BSI',
        p_acc_name => 'Tester Addon',
        p_addon_branches => 2,
        p_addon_cashiers => 3,
        p_addon_total => 260000
      ) as claim_result;
    `, [testOrgId, testUserId]);

    const claimData = claimRes.rows[0].claim_result;
    const claimId = claimData.claim_id;
    assert(claimData.status === 'INSTANT_ACTIVATED', 'Claim submission status returned INSTANT_ACTIVATED');
    const claimRecord = await client.query('SELECT status FROM public.payment_claims WHERE id = $1;', [claimId]);
    assert(claimRecord.rows[0].status === 'PROVISIONALLY_APPROVED', 'Claim table record status is PROVISIONALLY_APPROVED');

    // Check updated quotas on subscription
    const subCheck = await client.query(`
      SELECT extra_branches_quota, extra_cashiers_quota, is_active
      FROM public.organization_subscriptions
      WHERE organization_id = $1;
    `, [testOrgId]);
    
    console.log('Updated subscription quotas:', subCheck.rows[0]);
    // Previously extra_branches was 1 + 2 = 3
    assert(Number(subCheck.rows[0].extra_branches_quota) === 3, 'Extra branches incremented to 3');
    // Previously extra_cashiers was 0 + 3 = 3
    assert(Number(subCheck.rows[0].extra_cashiers_quota) === 3, 'Extra cashiers incremented to 3');

    // Check effective quotas view
    const viewAfter = await client.query(`
      SELECT * FROM public.v_organization_effective_quotas WHERE organization_id = $1;
    `, [testOrgId]);
    assert(Number(viewAfter.rows[0].max_allowed_branches) === 4, 'Max allowed branches is now 4 (1 base + 3 extra)');
    assert(Number(viewAfter.rows[0].max_allowed_cashiers) === 4, 'Max allowed cashiers is now 4 (1 base + 3 extra)');

    // TEST 7: Fraud Revocation & Add-on Quota Reset (revoke_fraudulent_claim)
    console.log('\n--- TEST 7: Fraud Revocation & Automatic Quota Reset ---');

    const adminUserId = testUserId;
    const revokeRes = await client.query(`
      SELECT public.revoke_fraudulent_claim(
        p_claim_id => $1,
        p_admin_id => $2,
        p_reason => 'Bukti transfer terdeteksi hasil rekayasa grafis (Fraud).'
      ) as revoke_result;
    `, [claimId, adminUserId]);

    console.log('Revocation result:', revokeRes.rows[0].revoke_result);
    assert(revokeRes.rows[0].revoke_result.status === 'REVOKED_FRAUD', 'Claim status updated to REVOKED_FRAUD');

    // Check organization fraud flag
    const orgCheck = await client.query(`
      SELECT has_fraud_history, require_manual_approval, tier_id
      FROM public.organizations WHERE id = $1;
    `, [testOrgId]);
    assert(orgCheck.rows[0].has_fraud_history === true, 'Organization marked with has_fraud_history = true');
    assert(orgCheck.rows[0].require_manual_approval === true, 'require_manual_approval = true');

    // Check subscription quotas reset to 0
    const subRevoked = await client.query(`
      SELECT extra_branches_quota, extra_cashiers_quota, is_active
      FROM public.organization_subscriptions WHERE organization_id = $1;
    `, [testOrgId]);
    assert(Number(subRevoked.rows[0].extra_branches_quota) === 0, 'Extra branches quota reset to 0');
    assert(Number(subRevoked.rows[0].extra_cashiers_quota) === 0, 'Extra cashiers quota reset to 0');
    assert(subRevoked.rows[0].is_active === false, 'Subscription is_active set to false');

    // Check child branch deactivated
    const branch2Check = await client.query(`
      SELECT is_active FROM public.branches WHERE id = $1;
    `, [testBranch2Id]);
    assert(branch2Check.rows[0].is_active === false, 'Child branch deactivated after fraud revocation');

    console.log('\n====================================================');
    console.log('🎉 ALL 7 PHASE 12 ADD-ON AUDIT TESTS PASSED 100%!');
    console.log('====================================================\n');

  } finally {
    // Cleanup test data safely
    console.log('Cleaning up test artifacts...');
    try {
      await client.query('DELETE FROM public.payment_claims WHERE organization_id = $1;', [testOrgId]);
      await client.query('DELETE FROM public.organization_subscriptions WHERE organization_id = $1;', [testOrgId]);
      await client.query('DELETE FROM public.profiles WHERE organization_id = $1;', [testOrgId]);
      await client.query('UPDATE public.branches SET is_main_branch = FALSE WHERE organization_id = $1;', [testOrgId]);
      await client.query('DELETE FROM public.branches WHERE organization_id = $1;', [testOrgId]);
      await client.query('DELETE FROM public.shops WHERE id IN ($1, $2);', [testShopId, testShop2Id]);
      await client.query('DELETE FROM public.organizations WHERE id = $1;', [testOrgId]);
      for (const uid of createdAuthUsers) {
        await client.query('DELETE FROM auth.users WHERE id = $1;', [uid]);
      }
    } catch (cErr) {
      console.warn('Cleanup warning:', cErr.message);
    }
    await client.end();
    console.log('Cleanup complete. Database connection closed.');
  }
}

runTests().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
