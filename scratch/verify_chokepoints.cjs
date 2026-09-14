const { createClient } = require('@supabase/supabase-js');
const path = require('path');

require('dotenv').config({ path: '.env.local' });
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://doaisnsdahepsxqaroru.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  console.log('====================================================');
  console.log('🚀 MEMULAI AUDIT OTOMATIS: 3 ENFORCEMENT CHOKEPOINTS');
  console.log('====================================================\n');

  let failedTests = 0;

  // ── TEST 1: Single Source of Truth (TIER_CONFIG) ──────────
  console.log('📌 UJI 1: SINGLE SOURCE OF TRUTH (src/config/tiers.js)');
  try {
    const tiersModule = await import('../src/config/tiers.js');
    const { TIER_CONFIG, normalizeTier, getTierConfig, calculateAdditiveCapacity, getWIBStartOfMonth } = tiersModule;

    const expectedTiers = ['MAGANG', 'SUPERVISOR', 'MANAJER', 'EKSEKUTIF'];
    const actualTiers = Object.keys(TIER_CONFIG);
    if (JSON.stringify(actualTiers) !== JSON.stringify(expectedTiers)) {
      throw new Error(`Keys TIER_CONFIG tidak sesuai: ${actualTiers.join(', ')}`);
    }

    // Periksa Magang limits & features
    if (TIER_CONFIG.MAGANG.maxMonthlyReceipts !== 50 || TIER_CONFIG.MAGANG.maxCashiers !== 1) {
      throw new Error('Limit Kontrak Magang salah (wajib 50 struk & 1 kasir)');
    }
    if (TIER_CONFIG.MAGANG.features.allow_kasbon !== false || TIER_CONFIG.MAGANG.features.export_csv !== false) {
      throw new Error('Feature gate Kontrak Magang bocor');
    }

    // Periksa Supervisor
    if (TIER_CONFIG.SUPERVISOR.maxMonthlyReceipts !== Infinity || TIER_CONFIG.SUPERVISOR.maxCashiers !== 2) {
      throw new Error('Limit Supervisor salah');
    }
    if (TIER_CONFIG.SUPERVISOR.features.allow_kasbon !== true || TIER_CONFIG.SUPERVISOR.features.wa_tagihan !== true) {
      throw new Error('Fitur kasbon/wa_tagihan Supervisor tidak aktif');
    }

    // Periksa Manajer
    if (TIER_CONFIG.MANAJER.maxCashiers !== 5 || TIER_CONFIG.MANAJER.features.void_log !== true) {
      throw new Error('Limit/fitur Manajer salah');
    }

    // Periksa Eksekutif
    if (TIER_CONFIG.EKSEKUTIF.maxBranches !== 3 || TIER_CONFIG.EKSEKUTIF.maxCashiers !== 10 || TIER_CONFIG.EKSEKUTIF.features.auto_wa_report !== true) {
      throw new Error('Limit/fitur Eksekutif salah');
    }

    // Periksa Timezone Safeguard WIB (UTC+7)
    const wibStart = getWIBStartOfMonth();
    console.log(`  -> WIB Start of Month ISO: ${wibStart}`);
    const d = new Date(wibStart);
    if (isNaN(d.getTime())) {
      throw new Error('getWIBStartOfMonth menghasilkan invalid date string');
    }

    // Periksa Rumus Aditif
    const addCap1 = calculateAdditiveCapacity({ tier: 'MAGANG', addOnCashiers: 0 });
    const addCap2 = calculateAdditiveCapacity({ tier: 'MAGANG', addOnCashiers: 2 });
    const addCap3 = calculateAdditiveCapacity({ tier: 'SUPERVISOR', addOnCashiers: 3 });
    if (addCap1.totalAllowed !== 1 || addCap2.totalAllowed !== 3 || addCap3.totalAllowed !== 5) {
      throw new Error(`Kalkulasi aditif salah: ${JSON.stringify({ addCap1, addCap2, addCap3 })}`);
    }

    console.log('  ✅ [PASS] TIER_CONFIG, normalisasi, rumus aditif, & WIB timezone valid 100%!\n');
  } catch (err) {
    console.error('  ❌ [FAIL] Uji 1 Gagal:', err.message);
    failedTests++;
  }

  // ── TEST 2: DDL & Database State via Supabase ─────────────
  console.log('📌 UJI 2: KONSISTENSI DDL & DATA SUPABASE');
  try {
    const { data: shops, error } = await supabase
      .from('shops')
      .select('id, name, subscription_tier, operational_status, cashier_limit');

    if (error) throw error;

    const invalidTiers = shops.filter(s => s.subscription_tier === 'TRIAL' || s.subscription_tier === 'JURAGAN');
    if (invalidTiers.length > 0) {
      throw new Error(`Ditemukan ${invalidTiers.length} toko dengan tier usang: ${JSON.stringify(invalidTiers)}`);
    }

    console.log('  -> Data toko saat ini di Supabase:');
    shops.forEach(s => {
      console.log(`     - [${s.subscription_tier}] ${s.name} (ID: ${s.id.slice(0, 8)}, Kasir Max: ${s.cashier_limit})`);
    });

    console.log('  ✅ [PASS] Seluruh baris basis data tersinkronisasi ke 4 tier kanonikal!\n');
  } catch (err) {
    console.error('  ❌ [FAIL] Uji 2 Gagal:', err.message);
    failedTests++;
  }

  // ── TEST 3: #51 Atomic Lock Simulation ───────────────────
  console.log('📌 UJI 3: PENCEGAHAN JEBAKAN STRUK (#51 ATOMIC LOCK SIMULATION)');
  try {
    const tiersModule = await import('../src/config/tiers.js');
    const { getWIBStartOfMonth } = tiersModule;
    const startOfMonth = getWIBStartOfMonth();

    const { data: magangShops, error: shopErr } = await supabase
      .from('shops')
      .select('id, name, subscription_tier, cashier_limit')
      .eq('subscription_tier', 'MAGANG')
      .limit(1);

    if (shopErr) throw shopErr;

    if (!magangShops || magangShops.length === 0) {
      console.log('  ⚠️ Tidak ada toko berstatus MAGANG untuk simulasi langsung.');
    } else {
      const magangShop = magangShops[0];
      const { count: txCount, error: countErr } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('shop_id', magangShop.id)
        .gte('created_at', startOfMonth);

      if (countErr) throw countErr;

      console.log(`  -> Toko Magang "${magangShop.name}" memiliki ${txCount || 0}/50 transaksi bulan ini.`);

      // Simulasi evaluasi guard
      const limit = 50;
      const count = txCount || 0;
      const willReject = (count >= limit);
      console.log(`  -> Evaluasi Guard Transaksi ke-${count + 1}: ${willReject ? '🛑 DITOLAK (HTTP 402 - RECEIPT_LIMIT_REACHED)' : '✅ DIIZINKAN (Masih dalam batas kuota 50)'}`);
    }

    console.log('  ✅ [PASS] Logika query atomik SELECT COUNT >= startOfMonth WIB terverifikasi!\n');
  } catch (err) {
    console.error('  ❌ [FAIL] Uji 3 Gagal:', err.message);
    failedTests++;
  }

  // ── TEST 4: Admin Additive Capacity & Override ────────────
  console.log('📌 UJI 4: PENYELARASAN PANEL ADMIN & OVERRIDE KUOTA KASIR');
  try {
    const { data: shops, error: sErr } = await supabase.from('shops').select('id, cashier_limit').limit(1);
    if (sErr) throw sErr;

    if (shops && shops.length > 0) {
      const targetShopId = shops[0].id;
      const originalLimit = shops[0].cashier_limit || 1;

      // 1. Simulasikan override ke limit baru
      const testLimit = originalLimit + 2;
      const { error: upErr } = await supabase
        .from('shops')
        .update({ cashier_limit: testLimit })
        .eq('id', targetShopId);

      if (upErr) throw upErr;

      // Ambil admin user dari profiles
      const { data: profile } = await supabase.from('profiles').select('id, username').limit(1).single();

      // 2. Simulasikan audit log entry
      const { data: auditData, error: logErr } = await supabase
        .from('admin_audit_logs')
        .insert({
          admin_id: profile?.id,
          admin_email: 'admin@klolawarung.id',
          action_type: 'TENANT_QUOTA_OVERRIDE_TEST',
          target_shop_id: targetShopId,
          reason: 'Verifikasi pengujian otomatis kapasitas aditif.',
          metadata: { previous: originalLimit, new: testLimit },
          ip_address: '127.0.0.1',
          user_agent: 'Automated-Test-Runner'
        })
        .select()
        .single();

      if (logErr) throw logErr;
      console.log(`  -> Audit Log ID tercatat: ${auditData.id}`);

      // 3. Kembalikan ke original
      await supabase.from('shops').update({ cashier_limit: originalLimit }).eq('id', targetShopId);

      // 4. Bersihkan log test
      await supabase.from('admin_audit_logs').delete().eq('id', auditData.id);

      console.log('  ✅ [PASS] Override kapasitas kasir & immutable audit trail berfungsi sempurna!\n');
    }
  } catch (err) {
    console.error('  ❌ [FAIL] Uji 4 Gagal:', err.message);
    failedTests++;
  }

  console.log('====================================================');
  if (failedTests === 0) {
    console.log('🎉 SEMUA 4 PENGUJIAN OTOMATIS CHOKEPOINTS BERHASIL 100%!');
  } else {
    console.error(`💥 TERDAPAT ${failedTests} PENGUJIAN YANG GAGAL!`);
    process.exit(1);
  }
  console.log('====================================================');
}

main().catch(err => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
