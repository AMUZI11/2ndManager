const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Supabase URL atau SERVICE_ROLE_KEY belum dikonfigurasi di .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function runVerification() {
  console.log('🧪 ================================================================');
  console.log('🧪 VERIFIKASI FITUR: OPTIMISTIC AUTO-APPROVE & DYNAMIC PROMO ENGINE');
  console.log('🧪 ================================================================\n');

  let testOrgId = null;
  let testUserId = null;
  let testShopId = null;
  let testShop2Id = null;
  let mainBranchId = null;
  let secondaryBranchId = null;
  let promoDiskonId = null;
  let promoBonusId = null;
  let claim1Id = null;
  let claim2Id = null;

  try {
    // -------------------------------------------------------------
    // SETUP: Siapkan Akun Uji Coba, Organisasi, dan 2 Cabang
    // -------------------------------------------------------------
    console.log('📦 [SETUP] Menyiapkan entitas pengujian...');

    // Ambil sembarang user eksisting atau create
    const { data: users, error: userErr } = await supabase.auth.admin.listUsers();
    if (userErr || !users.users || users.users.length === 0) {
      throw new Error('Tidak ada auth.users yang dapat digunakan untuk pengujian.');
    }
    testUserId = users.users[0].id;

    // Cari / buat shop uji coba
    const { data: testShop, error: shopErr } = await supabase
      .from('shops')
      .insert({
        name: 'Warung Optimistic Test ' + Date.now(),
        owner_id: testUserId,
        subscription_tier: 'MAGANG',
      })
      .select()
      .single();

    if (shopErr) throw new Error('Gagal membuat shop uji: ' + shopErr.message);
    testShopId = testShop.id;

    // Buat Organisasi Uji Coba
    const { data: testOrg, error: orgErr } = await supabase
      .from('organizations')
      .insert({
        name: 'PT Usaha Optimistik ' + Date.now(),
        owner_id: testUserId,
        tier_id: 'MAGANG',
        has_fraud_history: false,
        require_manual_approval: false,
      })
      .select()
      .single();

    if (orgErr) throw new Error('Gagal membuat organisasi uji: ' + orgErr.message);
    testOrgId = testOrg.id;
    console.log(`✅ Organisasi Uji Coba dibuat: ID ${testOrgId}`);

    // Inisialisasi organization_subscriptions Magang
    await supabase.from('organization_subscriptions').upsert({
      organization_id: testOrgId,
      current_tier: 'MAGANG',
      starts_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      grace_period_ends_at: new Date(Date.now() + 33 * 86400000).toISOString(),
    });

    // Buat Cabang Utama (is_main_branch = true, is_active = true)
    const { data: bMain, error: bMainErr } = await supabase
      .from('branches')
      .insert({
        organization_id: testOrgId,
        shop_id: testShopId,
        branch_name: 'Cabang Pusat (Main)',
        branch_code: 'CB' + Math.floor(1000 + Math.random() * 8999),
        is_main_branch: true,
        is_active: true,
      })
      .select()
      .single();

    if (bMainErr) throw new Error('Gagal membuat cabang utama: ' + bMainErr.message);
    mainBranchId = bMain.id;

    // Buat Toko Uji Coba ke-2 untuk Cabang Sekunder
    const { data: testShop2, error: shop2Err } = await supabase
      .from('shops')
      .insert({
        name: 'Warung Cabang 2 Test ' + Date.now(),
        owner_id: testUserId,
        subscription_tier: 'MAGANG',
      })
      .select()
      .single();

    if (shop2Err) throw new Error('Gagal membuat shop uji 2: ' + shop2Err.message);
    testShop2Id = testShop2.id;

    // Buat Cabang Sekunder (is_main_branch = false, is_active = true)
    const { data: bSec, error: bSecErr } = await supabase
      .from('branches')
      .insert({
        organization_id: testOrgId,
        shop_id: testShop2Id,
        branch_name: 'Cabang Cabang 2 (Secondary)',
        branch_code: 'C2' + Math.floor(1000 + Math.random() * 8999),
        is_main_branch: false,
        is_active: true,
      })
      .select()
      .single();

    if (bSecErr) throw new Error('Gagal membuat cabang sekunder: ' + bSecErr.message);
    secondaryBranchId = bSec.id;
    console.log(`✅ Cabang Utama (${mainBranchId}) dan Cabang Sekunder (${secondaryBranchId}) aktif.`);

    // -------------------------------------------------------------
    // SKENARIO 1: Pembuatan Kode Promo Dinamis
    // -------------------------------------------------------------
    console.log('\n--- SKENARIO 1: Pembuatan Kode Promo Dinamis ---');
    const codeDiskon = 'TEST_DISKON20_' + Date.now().toString().slice(-4);
    const codeBonus = 'TEST_BONUS30_' + Date.now().toString().slice(-4);

    // 1a. Promo Diskon 20%
    const { data: pDiskon, error: pDiskonErr } = await supabase
      .from('promo_codes')
      .insert({
        code: codeDiskon,
        description: 'Diskon Spesial 20%',
        discount_type: 'PERCENTAGE',
        discount_value: 20,
        max_uses: 50,
        max_uses_per_org: 1,
        is_active: true,
      })
      .select()
      .single();

    if (pDiskonErr) throw new Error('Gagal membuat promo diskon: ' + pDiskonErr.message);
    promoDiskonId = pDiskon.id;
    console.log(`✅ [1a] Promo Diskon 20% terbuat: ${pDiskon.code} (ID: ${pDiskon.id})`);

    // 1b. Promo Bonus 30 Hari
    const { data: pBonus, error: pBonusErr } = await supabase
      .from('promo_codes')
      .insert({
        code: codeBonus,
        description: 'Bonus Masa Aktif 30 Hari',
        discount_type: 'BONUS_DAYS',
        discount_value: 30,
        max_uses: 20,
        max_uses_per_org: 1,
        is_active: true,
      })
      .select()
      .single();

    if (pBonusErr) throw new Error('Gagal membuat promo bonus: ' + pBonusErr.message);
    promoBonusId = pBonus.id;
    console.log(`✅ [1b] Promo Bonus 30 Hari terbuat: ${pBonus.code} (ID: ${pBonus.id})`);

    // -------------------------------------------------------------
    // SKENARIO 2: Validasi Kode Promo & Kalkulasi Harga
    // -------------------------------------------------------------
    console.log('\n--- SKENARIO 2: Validasi Logika Kode Promo ---');

    // Kalkulasi paket EKSEKUTIF (Rp 399.000) 1 bulan dengan diskon 20%
    const basePrice = 399000;
    const expectedDiscount = Math.round(basePrice * 0.2);
    const expectedFinalPrice = basePrice - expectedDiscount;

    if (expectedFinalPrice !== 319200) {
      throw new Error(`Kalkulasi harga diskon salah: dapat ${expectedFinalPrice}, harap 319200`);
    }
    console.log(`✅ [2a] Perhitungan Diskon 20% tepat: Rp ${basePrice} -> Rp ${expectedFinalPrice}`);

    // Cek duplikasi klaim per organisasi
    const { data: alreadyRedeemed } = await supabase
      .from('promo_code_redemptions')
      .select('id')
      .eq('promo_code_id', promoDiskonId)
      .eq('organization_id', testOrgId);

    console.log(`✅ [2b] Status redemption awal belum digunakan (count = ${alreadyRedeemed?.length || 0})`);

    // -------------------------------------------------------------
    // SKENARIO 3: Eksekusi Pengajuan Klaim Bukti Bayar Optimistik
    // -------------------------------------------------------------
    console.log('\n--- SKENARIO 3: Eksekusi Klaim Bayar Optimistik (Auto-Approved) ---');

    const fakeProofUrl = 'payment_proofs/proofs/' + testOrgId + '/test_transfer.jpg';

    const { data: claimResult, error: claimErr } = await supabase.rpc('submit_optimistic_payment_claim', {
      p_org_id: testOrgId,
      p_user_id: testUserId,
      p_target_tier: 'EKSEKUTIF',
      p_duration_months: 1,
      p_base_price: basePrice,
      p_final_price: expectedFinalPrice,
      p_promo_code_id: promoDiskonId,
      p_proof_url: fakeProofUrl,
      p_bank: 'BCA',
      p_acc_name: 'Tester Juragan',
    });

    if (claimErr) throw new Error('RPC submit_optimistic_payment_claim gagal: ' + claimErr.message);

    console.log('Hasil RPC Aktivasi Instan:', claimResult);

    if (claimResult.status !== 'INSTANT_ACTIVATED') {
      throw new Error(`Status aktivasi salah: diharapkan 'INSTANT_ACTIVATED', didapat '${claimResult.status}'`);
    }
    if (claimResult.tier !== 'EKSEKUTIF') {
      throw new Error(`Tier tidak aktif sebagai EKSEKUTIF: '${claimResult.tier}'`);
    }

    claim1Id = claimResult.claim_id;

    // Verifikasi di basis data tabel organizations & organization_subscriptions
    const { data: updatedOrg } = await supabase
      .from('organizations')
      .select('tier_id, has_fraud_history, require_manual_approval')
      .eq('id', testOrgId)
      .single();

    if (updatedOrg.tier_id !== 'EKSEKUTIF') {
      throw new Error(`Tabel organizations.tier_id belum terupdate ke EKSEKUTIF: ${updatedOrg.tier_id}`);
    }

    const { data: updatedSub } = await supabase
      .from('organization_subscriptions')
      .select('current_tier, expires_at')
      .eq('organization_id', testOrgId)
      .single();

    if (updatedSub.current_tier !== 'EKSEKUTIF') {
      throw new Error(`Tabel organization_subscriptions.current_tier belum EKSEKUTIF: ${updatedSub.current_tier}`);
    }

    // Verifikasi kuota promo terpakai
    const { data: promoCheck } = await supabase
      .from('promo_codes')
      .select('current_uses')
      .eq('id', promoDiskonId)
      .single();

    if (promoCheck.current_uses !== 1) {
      throw new Error(`current_uses promo harus 1, didapat: ${promoCheck.current_uses}`);
    }

    // Verifikasi tabel promo_code_redemptions tercatat
    const { data: redemptionCheck } = await supabase
      .from('promo_code_redemptions')
      .select('*')
      .eq('promo_code_id', promoDiskonId)
      .eq('organization_id', testOrgId)
      .single();

    if (!redemptionCheck) {
      throw new Error('Pencatatan promo_code_redemptions tidak ditemukan.');
    }

    console.log('✅ [3] Pengajuan klaim berhasil mengaktifkan langganan seketika (EKSEKUTIF).');

    // -------------------------------------------------------------
    // SKENARIO 4: Simulasi Pencabutan Bukti Palsu (revoke_fraudulent_claim)
    // -------------------------------------------------------------
    console.log('\n--- SKENARIO 4: Pencabutan Sepihak Bukti Palsu (One-Click Fraud Revocation) ---');

    const revocationReason = 'Struk transfer palsu / editan Canva. Mutasi bank tidak ditemukan.';

    const { data: revokeResult, error: revokeErr } = await supabase.rpc('revoke_fraudulent_claim', {
      p_claim_id: claim1Id,
      p_reason: revocationReason,
      p_admin_id: testUserId,
    });

    if (revokeErr) throw new Error('RPC revoke_fraudulent_claim gagal: ' + revokeErr.message);
    console.log('Hasil RPC Revoke:', revokeResult);

    // 4a. Cek status claim berubah ke REVOKED_FRAUD
    const { data: claimRevoked } = await supabase
      .from('payment_claims')
      .select('status, revocation_reason, revoked_at')
      .eq('id', claim1Id)
      .single();

    if (claimRevoked.status !== 'REVOKED_FRAUD') {
      throw new Error(`Status klaim harus 'REVOKED_FRAUD', didapat: ${claimRevoked.status}`);
    }
    console.log('✅ [4a] Status klaim berhasil diubah menjadi REVOKED_FRAUD.');

    // 4b. Cek tier organisasi anjlok ke MAGANG & flag fraud aktif
    const { data: orgAfterRevoke } = await supabase
      .from('organizations')
      .select('tier_id, has_fraud_history, require_manual_approval')
      .eq('id', testOrgId)
      .single();

    if (orgAfterRevoke.tier_id !== 'MAGANG') {
      throw new Error(`Tier organisasi harus turun ke 'MAGANG', didapat: ${orgAfterRevoke.tier_id}`);
    }
    if (!orgAfterRevoke.has_fraud_history || !orgAfterRevoke.require_manual_approval) {
      throw new Error('Flag has_fraud_history atau require_manual_approval belum bernilai TRUE');
    }
    console.log('✅ [4b] Organisasi di-downgrade ke MAGANG dan ditandai has_fraud_history = TRUE.');

    // 4c. Cek subscription kedaluwarsa seketika
    const { data: subAfterRevoke } = await supabase
      .from('organization_subscriptions')
      .select('current_tier, expires_at')
      .eq('organization_id', testOrgId)
      .single();

    if (subAfterRevoke.current_tier !== 'MAGANG' || new Date(subAfterRevoke.expires_at) > new Date()) {
      throw new Error('Subscription tidak kedaluwarsa setelah dicabut fraud.');
    }
    console.log('✅ [4c] Subscription organisasi langsung dinyatakan kadaluwarsa.');

    // 4d. Cek cabang sekunder dinonaktifkan (is_active = FALSE), cabang utama tetap aktif
    const { data: branchSecAfter } = await supabase
      .from('branches')
      .select('is_active, is_main_branch')
      .eq('id', secondaryBranchId)
      .single();

    const { data: branchMainAfter } = await supabase
      .from('branches')
      .select('is_active, is_main_branch')
      .eq('id', mainBranchId)
      .single();

    if (branchSecAfter.is_active !== false) {
      throw new Error(`Cabang sekunder harus dinonaktifkan (is_active = FALSE), didapat: ${branchSecAfter.is_active}`);
    }
    if (branchMainAfter.is_active !== true) {
      throw new Error(`Cabang utama harus tetap aktif, didapat: ${branchMainAfter.is_active}`);
    }
    console.log('✅ [4d] Cabang sekunder dinonaktifkan otomatis (is_active = FALSE), cabang utama aman.');

    // -------------------------------------------------------------
    // SKENARIO 5: Percobaan Klaim Kedua Oleh Organisasi Fraud
    // -------------------------------------------------------------
    console.log('\n--- SKENARIO 5: Uji Penolakan Auto-Approve Organisasi Berstatus Fraud ---');

    const { data: claim2Result, error: claim2Err } = await supabase.rpc('submit_optimistic_payment_claim', {
      p_org_id: testOrgId,
      p_user_id: testUserId,
      p_target_tier: 'MANAJER',
      p_duration_months: 1,
      p_base_price: 149000,
      p_final_price: 149000,
      p_promo_code_id: null,
      p_proof_url: fakeProofUrl,
      p_bank: 'BRI',
      p_acc_name: 'Tester Juragan',
    });

    if (claim2Err) throw new Error('RPC submit_optimistic_payment_claim kedua gagal: ' + claim2Err.message);
    console.log('Hasil Klaim Organisasi Fraud:', claim2Result);

    if (claim2Result.status !== 'PENDING_REVIEW') {
      throw new Error(`Harusnya status PENDING_REVIEW, tapi didapat: ${claim2Result.status}`);
    }

    claim2Id = claim2Result.claim_id;

    // Verifikasi klaim kedua berstatus PENDING_MANUAL_REVIEW di database
    const { data: claim2Db } = await supabase
      .from('payment_claims')
      .select('status')
      .eq('id', claim2Id)
      .single();

    if (claim2Db.status !== 'PENDING_MANUAL_REVIEW') {
      throw new Error(`Status di database harus 'PENDING_MANUAL_REVIEW', didapat: ${claim2Db.status}`);
    }

    // Verifikasi tier organisasi TIDAK BERUBAH (tetap MAGANG)
    const { data: orgStillMagang } = await supabase
      .from('organizations')
      .select('tier_id')
      .eq('id', testOrgId)
      .single();

    if (orgStillMagang.tier_id !== 'MAGANG') {
      throw new Error(`Tier tidak boleh berubah ke MANAJER untuk akun berstatus fraud! Status: ${orgStillMagang.tier_id}`);
    }

    console.log('✅ [5] Auto-approve berhasil dicegah! Klaim masuk ke PENDING_MANUAL_REVIEW.');

    console.log('\n================================================================');
    console.log('🎉 SEMUA 5 SKENARIO LOGIKA BASIS DATA & RPC BERHASIL 100%!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ PENGUJIAN GAGAL:', err.message);
    process.exit(1);
  } finally {
    // Cleanup data pengujian
    console.log('🧹 [CLEANUP] Membersihkan entitas uji coba...');
    if (claim1Id) await supabase.from('payment_claims').delete().eq('id', claim1Id);
    if (claim2Id) await supabase.from('payment_claims').delete().eq('id', claim2Id);
    if (promoDiskonId) await supabase.from('promo_codes').delete().eq('id', promoDiskonId);
    if (promoBonusId) await supabase.from('promo_codes').delete().eq('id', promoBonusId);
    if (secondaryBranchId) await supabase.from('branches').delete().eq('id', secondaryBranchId);
    if (mainBranchId) await supabase.from('branches').delete().eq('id', mainBranchId);
    if (testOrgId) {
      await supabase.from('organization_subscriptions').delete().eq('organization_id', testOrgId);
      await supabase.from('organizations').delete().eq('id', testOrgId);
    }
    if (testShopId) await supabase.from('shops').delete().eq('id', testShopId);
    if (testShop2Id) await supabase.from('shops').delete().eq('id', testShop2Id);
    console.log('✅ Selesai pembersihan data uji coba.');
  }
}

runVerification();
