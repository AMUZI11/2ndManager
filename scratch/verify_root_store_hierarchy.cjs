const { createClient } = require('@supabase/supabase-js');
const pg = require('pg');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runVerification() {
  console.log('🧪 ==============================================================================');
  console.log('🧪 VERIFIKASI MANDIRI: ROOT ANCHOR STORE (TOKO A) & MULTI-BRANCH HIERARCHY');
  console.log('🧪 ==============================================================================\n');

  const testEmail = `test_owner_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  const testOwnerName = `Juragan Test ${Date.now().toString().slice(-4)}`;
  const testStoreName = `Warung Berkah Utama ${Date.now().toString().slice(-4)}`;
  const testPhone = '081299887766';

  let testUserId = null;
  let testOrgId = null;
  let rootBranchId = null;
  let rootShopId = null;
  let childBranch1Id = null;
  let childBranch2Id = null;

  try {
    // 0. Inisialisasi Auth User
    console.log('▶ [PERSIAPAN] Membuat Akun Auth User Pengujian...');
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { role: 'BOSS', username: testOwnerName }
    });

    if (authErr || !authData?.user) {
      throw new Error(`Gagal membuat auth user: ${authErr?.message}`);
    }
    testUserId = authData.user.id;
    console.log(`   ✅ Auth User ID: ${testUserId}\n`);

    // -------------------------------------------------------------------------
    // TEST 1: Registrasi Owner & Pembuatan Toko A (Root Anchor)
    // -------------------------------------------------------------------------
    console.log('▶ [TEST 1] Registrasi Owner & Pembuatan Toko A (Root Genesis Node)...');
    const { data: regData, error: regErr } = await supabase.rpc('register_owner_with_store', {
      p_user_id: testUserId,
      p_owner_name: testOwnerName,
      p_store_name: testStoreName,
      p_phone: testPhone,
    });

    if (regErr || !regData?.success) {
      throw new Error(`TEST 1 GAGAL: ${regErr?.message || JSON.stringify(regData)}`);
    }

    console.log('   Hasil RPC register_owner_with_store:', regData);
    testOrgId = regData.organization_id;
    rootBranchId = regData.root_branch_id;
    rootShopId = regData.shop_id;

    // Verifikasi di basis data
    const { data: branchRow, error: branchErr } = await supabase
      .from('branches')
      .select('id, organization_id, shop_id, is_main_branch, parent_branch_id, branch_name, branch_code')
      .eq('id', rootBranchId)
      .single();

    if (branchErr || !branchRow) throw new Error('TEST 1 GAGAL: Query cabang gagal');
    if (!branchRow.is_main_branch) throw new Error('TEST 1 GAGAL: is_main_branch harus bernilai TRUE untuk Toko A!');
    if (branchRow.parent_branch_id !== null) throw new Error('TEST 1 GAGAL: parent_branch_id harus NULL untuk Toko A!');
    if (!branchRow.shop_id) throw new Error('TEST 1 GAGAL: shop_id di branches tidak boleh kosong (zero-breaking-change)!');

    // Cek shops dan user_shops
    const { data: shopRow } = await supabase.from('shops').select('id, name, owner_id').eq('id', rootShopId).single();
    if (!shopRow) throw new Error('TEST 1 GAGAL: Record di tabel shops tidak ditemukan!');

    const { data: userShopRow } = await supabase
      .from('user_shops')
      .select('*')
      .eq('user_id', testUserId)
      .eq('shop_id', rootShopId)
      .single();
    if (!userShopRow) throw new Error('TEST 1 GAGAL: Relasi di tabel user_shops tidak ditemukan!');

    console.log('   ✅ PASS: Toko A berhasil dibuat dengan is_main_branch = TRUE, parent_branch_id = NULL, serta shops & user_shops tersinkronisasi atomik.\n');

    // -------------------------------------------------------------------------
    // TEST 2: Proteksi Hapus Toko A (Trigger 2NDM-40301)
    // -------------------------------------------------------------------------
    console.log('▶ [TEST 2] Verifikasi Larangan Hapus Toko Utama (Trigger trg_prevent_main_branch_deletion)...');
    let deleteTriggerFired = false;
    const { error: delErr } = await supabase.from('branches').delete().eq('id', rootBranchId);
    if (delErr) {
      console.log('   Pesan Tangkapan Error:', delErr.message);
      if (delErr.message.includes('2NDM-40301')) {
        deleteTriggerFired = true;
      }
    }

    if (!deleteTriggerFired) {
      throw new Error('TEST 2 GAGAL: Toko Utama berhasil dihapus atau exception 2NDM-40301 tidak muncul!');
    }
    console.log('   ✅ PASS: Upaya penghapusan Toko A diblokir 100% oleh database trigger dengan exception 2NDM-40301.\n');

    // -------------------------------------------------------------------------
    // TEST 3: Penegakan Kuota Cabang pada Tier Magang (Maks 1 Gerai -> 2NDM-40303)
    // -------------------------------------------------------------------------
    console.log('▶ [TEST 3] Penegakan Batas Kuota Cabang pada Tier Magang (Maksimal 1 Gerai)...');
    let quotaTriggerFired = false;
    const { data: childMagangData, error: childMagangErr } = await supabase.rpc('create_child_branch', {
      p_org_id: testOrgId,
      p_branch_name: 'Cabang Kedua Ilegal Magang',
      p_address: 'Jl. Percobaan No. 1',
      p_phone: '08111'
    });

    if (childMagangErr) {
      console.log('   Pesan Tangkapan Error Kuota:', childMagangErr.message);
      if (childMagangErr.message.includes('2NDM-40303')) {
        quotaTriggerFired = true;
      }
    }

    if (!quotaTriggerFired) {
      throw new Error('TEST 3 GAGAL: Penambahan cabang anak pada tier Magang tidak diblokir kuota!');
    }
    console.log('   ✅ PASS: Penambahan cabang ke-2 pada Tier Magang sukses diblokir dengan exception 2NDM-40303.\n');

    // -------------------------------------------------------------------------
    // TEST 4: Upgrade ke Eksekutif & Pembuatan Cabang Anak 1 (Cabang 2)
    // -------------------------------------------------------------------------
    console.log('▶ [TEST 4] Upgrade Organisasi ke Tier EKSEKUTIF & Pembuatan Cabang Anak (Cabang 2)...');
    await supabase.from('organizations').update({ tier_id: 'EKSEKUTIF' }).eq('id', testOrgId);
    await supabase.from('organization_subscriptions').update({ current_tier: 'EKSEKUTIF' }).eq('organization_id', testOrgId);

    const { data: child1Data, error: child1Err } = await supabase.rpc('create_child_branch', {
      p_org_id: testOrgId,
      p_branch_name: 'Cabang Glodok Perintis',
      p_address: 'Jl. Glodok Raya No. 8',
      p_phone: '081234567'
    });

    if (child1Err || !child1Data?.success) {
      throw new Error(`TEST 4 GAGAL: ${child1Err?.message || JSON.stringify(child1Data)}`);
    }

    console.log('   Hasil RPC create_child_branch (Cabang 2):', child1Data);
    childBranch1Id = child1Data.branch_id;

    if (child1Data.parent_branch_id !== rootBranchId) {
      throw new Error(`TEST 4 GAGAL: parent_branch_id (${child1Data.parent_branch_id}) harus sama persis dengan Toko A (${rootBranchId})!`);
    }

    // Verifikasi di tabel branches & shops
    const { data: child1Row } = await supabase
      .from('branches')
      .select('id, is_main_branch, parent_branch_id, shop_id')
      .eq('id', childBranch1Id)
      .single();

    if (child1Row.is_main_branch !== false) throw new Error('TEST 4 GAGAL: is_main_branch harus FALSE!');
    if (child1Row.parent_branch_id !== rootBranchId) throw new Error('TEST 4 GAGAL: parent_branch_id tidak menunjuk ke Toko A!');

    const { data: child1ShopRow } = await supabase
      .from('shops')
      .select('id, parent_shop_id')
      .eq('id', child1Row.shop_id)
      .single();
    if (child1ShopRow.parent_shop_id !== rootShopId) {
      throw new Error('TEST 4 GAGAL: parent_shop_id di tabel shops harus menunjuk ke Toko A!');
    }

    console.log('   ✅ PASS: Cabang 2 sukses dibuat dengan parent_branch_id mengikat langsung ke Toko A.\n');

    // -------------------------------------------------------------------------
    // TEST 5: Pembuatan Cabang Anak 2 (Cabang 3) - Kuota 3 Tercapai
    // -------------------------------------------------------------------------
    console.log('▶ [TEST 5] Pembuatan Cabang Anak 2 (Cabang 3) - Kuota Maksimal 3 Gerai...');
    const { data: child2Data, error: child2Err } = await supabase.rpc('create_child_branch', {
      p_org_id: testOrgId,
      p_branch_name: 'Cabang Pasar Subuh Sentosa',
      p_address: 'Pasar Subuh Blok A No. 3',
      p_phone: '08998877'
    });

    if (child2Err || !child2Data?.success) {
      throw new Error(`TEST 5 GAGAL: ${child2Err?.message || JSON.stringify(child2Data)}`);
    }
    console.log('   Hasil RPC create_child_branch (Cabang 3):', child2Data);
    childBranch2Id = child2Data.branch_id;

    const { count: totalBranches } = await supabase
      .from('branches')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', testOrgId)
      .eq('is_active', true);

    console.log(`   Total Cabang Aktif Sekarang: ${totalBranches} Gerai (1 Toko Utama + 2 Cabang Anak).`);
    if (totalBranches !== 3) {
      throw new Error(`TEST 5 GAGAL: Total cabang harus 3, didapat: ${totalBranches}`);
    }
    console.log('   ✅ PASS: Cabang ke-3 berhasil dibuat. Total organisasi memiliki 3 gerai aktif.\n');

    // -------------------------------------------------------------------------
    // TEST 6: Upaya Membuat Cabang Ke-4 Ditolak (Limit Maksimal 3 Gerai -> 2NDM-40303)
    // -------------------------------------------------------------------------
    console.log('▶ [TEST 6] Upaya Membuat Cabang Ke-4 pada Tier Eksekutif (Batas Maksimal 3 Gerai)...');
    let maxQuotaFired = false;
    const { data: child4Data, error: child4Err } = await supabase.rpc('create_child_branch', {
      p_org_id: testOrgId,
      p_branch_name: 'Cabang Ke-4 Terlarang',
      p_address: 'Jl. Ilegal No. 4',
      p_phone: '08000'
    });

    if (child4Err) {
      console.log('   Pesan Tangkapan Error Kuota Maksimal:', child4Err.message);
      if (child4Err.message.includes('2NDM-40303')) {
        maxQuotaFired = true;
      }
    }

    if (!maxQuotaFired) {
      throw new Error('TEST 6 GAGAL: Cabang ke-4 tidak ditolak padahal batas maksimal 3 gerai!');
    }
    console.log('   ✅ PASS: Pembuatan cabang ke-4 sukses ditolak oleh sistem dengan exception 2NDM-40303.\n');

    // -------------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------------
    console.log('🧹 Membersihkan data pengujian...');
    if (childBranch2Id) await supabase.from('branches').delete().eq('id', childBranch2Id);
    if (childBranch1Id) await supabase.from('branches').delete().eq('id', childBranch1Id);
    if (rootBranchId) {
      await supabase.from('branches').update({ is_main_branch: false }).eq('id', rootBranchId);
      await supabase.from('branches').delete().eq('id', rootBranchId);
    }
    if (testOrgId) {
      await supabase.from('organization_subscriptions').delete().eq('organization_id', testOrgId);
      await supabase.from('user_shops').delete().eq('user_id', testUserId);
      await supabase.from('subscriptions').delete().eq('shop_id', rootShopId);
      await supabase.from('shops').delete().eq('owner_id', testUserId);
      await supabase.from('organizations').delete().eq('id', testOrgId);
      await supabase.from('profiles').delete().eq('id', testUserId);
    }
    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId);
    }
    console.log('   Data pengujian telah dibersihkan secara aman.\n');

    console.log('🏆 ==============================================================================');
    console.log('🏆 SELURUH PENGUJIAN OTOMATIS BERHASIL 100% (PASS)');
    console.log('🏆 ==============================================================================');

  } catch (testError) {
    console.error('❌ GAGAL PENGUJIAN:', testError.message);
    if (testUserId) {
      try {
        await supabase.auth.admin.deleteUser(testUserId);
      } catch {}
    }
    process.exit(1);
  }
}

runVerification();
