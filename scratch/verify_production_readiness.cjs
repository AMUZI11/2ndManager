/**
 * scratch/verify_production_readiness.cjs
 * Comprehensive Automated Verification Suite for Master Production Audit Protocol
 */

const fs = require('fs');
const path = require('path');
const pg = require('pg');

async function runAudit() {
  console.log('===============================================================');
  console.log('🛡️  MEMULAI VERIFIKASI PRA-PRODUKSI MASTER 2NDMANAGER');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} -> ${details}`);
      failed++;
    }
  }

  // ── TEST 1: Secret Hygiene & Environment Isolation ────────
  console.log('\n📌 UJI 1: KEBERSIHAN VARIABEL LINGKUNGAN (.env.local)');
  const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
  const publicVars = (envContent.match(/^NEXT_PUBLIC_[A-Z0-9_]+/gm) || []);
  const allowedPublic = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_VAPID_PUBLIC_KEY'
  ];
  const disallowedPublic = publicVars.filter(v => !allowedPublic.includes(v));
  assert(
    disallowedPublic.length === 0,
    'Hanya 3 variabel publik yang menggunakan awalan NEXT_PUBLIC_',
    `Ditemukan variabel tidak diizinkan: ${disallowedPublic.join(', ')}`
  );

  assert(
    !/NEXT_PUBLIC_.*(?:SERVICE_ROLE|SECRET|PRIVATE)/i.test(envContent),
    'Tidak ada service role key atau private key yang terekspos ke NEXT_PUBLIC_'
  );

  // ── TEST 2: Hardening Next.js Configuration ───────────────
  console.log('\n📌 UJI 2: HARDENING NEXT.CONFIG.MJS & SECURITY HEADERS');
  const nextConfig = fs.readFileSync(path.join(process.cwd(), 'next.config.mjs'), 'utf8');
  assert(
    /removeConsole:.*exclude:\s*\['error',\s*'warn'\]/.test(nextConfig),
    'Console log suppression aktif di mode produksi'
  );
  assert(
    nextConfig.includes("productionBrowserSourceMaps: false"),
    'Source maps produksi dimatikan (false)'
  );
  assert(
    /key:\s*['"]X-Frame-Options['"][\s\S]*?value:\s*['"]DENY['"]/.test(nextConfig),
    'Header keamanan X-Frame-Options: DENY terpasang'
  );
  assert(
    /key:\s*['"]X-Content-Type-Options['"][\s\S]*?value:\s*['"]nosniff['"]/.test(nextConfig),
    'Header keamanan X-Content-Type-Options: nosniff terpasang'
  );

  // ── TEST 3: Rate Limiting Module ──────────────────────────
  console.log('\n📌 UJI 3: RATE LIMITING MODULE & ROUTE GUARDS');
  const rateLimiterFile = fs.readFileSync(path.join(process.cwd(), 'src/lib/rate-limiter.js'), 'utf8');
  assert(
    rateLimiterFile.includes('checkRateLimit') && rateLimiterFile.includes('createRateLimitResponse'),
    'Modul rate limiter src/lib/rate-limiter.js terpasang dengan fungsi utama'
  );

  const billingClaimRoute = fs.readFileSync(path.join(process.cwd(), 'src/app/api/v1/billing/claim/route.js'), 'utf8');
  assert(
    billingClaimRoute.includes('checkRateLimit(request'),
    'Rate limit terpasang di /api/v1/billing/claim'
  );

  const promoRoute = fs.readFileSync(path.join(process.cwd(), 'src/app/api/v1/billing/promo/validate/route.js'), 'utf8');
  assert(
    promoRoute.includes('checkRateLimit(request'),
    'Rate limit terpasang di /api/v1/billing/promo/validate'
  );

  const registerStoreRoute = fs.readFileSync(path.join(process.cwd(), 'src/app/api/v1/auth/register-store/route.js'), 'utf8');
  assert(
    registerStoreRoute.includes('checkRateLimit(request'),
    'Rate limit terpasang di /api/v1/auth/register-store'
  );

  // ── TEST 4: Database RLS Lockdown (8 Target Tables) ───────
  console.log('\n📌 UJI 4: KUNCI KEAMANAN ROW LEVEL SECURITY (DATABASE SUPABASE)');
  const client = new pg.Client({
    host: '54.255.219.82',
    port: 5432,
    user: 'postgres.doaisnsdahepsxqaroru',
    password: 'ahzaganteng',
    database: 'postgres',
    ssl: { rejectUnauthorized: false, servername: 'aws-0-ap-southeast-1.pooler.supabase.com' }
  });
  await client.connect();

  const targetTables = [
    'organizations',
    'branches',
    'branch_product_stocks',
    'transactions',
    'transaction_items',
    'stock_transfers',
    'payment_claims',
    'promo_codes'
  ];

  const rlsRes = await client.query(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = ANY($1)
    ORDER BY tablename;
  `, [targetTables]);

  for (const table of targetTables) {
    const row = rlsRes.rows.find(r => r.tablename === table);
    assert(
      row && row.rowsecurity === true,
      `Tabel ${table} memiliki RLS = true`,
      `Status rowsecurity: ${row ? row.rowsecurity : 'not found'}`
    );
  }
  await client.end();

  // ── TEST 5: Indonesian Legal Compliance & Terms ───────────
  console.log('\n📌 UJI 5: KEPATUHAN HUKUM RI (UU PDP 27/2022, PP 55/2022 & FRAUD CLAUSE)');
  const privacyFile = fs.readFileSync(path.join(process.cwd(), 'src/app/(public)/privacy/page.js'), 'utf8');
  assert(
    privacyFile.includes('UU No. 27 Tahun 2022') || privacyFile.includes('UU PDP'),
    'Dasar hukum UU No. 27 Tahun 2022 (UU PDP) tertera di /privacy'
  );
  assert(
    privacyFile.includes('PP No. 55/2022') || privacyFile.includes('PP 55/2022'),
    'Klausul rekonsiliasi fiskal PP No. 55/2022 tertera di /privacy'
  );
  assert(
    privacyFile.includes('Right to Erasure') || privacyFile.includes('Penghapusan'),
    'Hak subjek data (penghapusan / portabilitas data) tertera di /privacy'
  );
  assert(
    privacyFile.includes('PT Klola Warung Teknologi Nusantara'),
    'Entitas PT Klola Warung Teknologi Nusantara tertera di /privacy'
  );

  const termsFile = fs.readFileSync(path.join(process.cwd(), 'src/app/(public)/terms/page.js'), 'utf8');
  assert(
    termsFile.includes('membatalkan, mencabut akses langganan, dan/atau membekukan akun organisasi tanpa pengembalian dana (non-refundable)'),
    'Klausul pembatalan sepihak non-refundable atas fraud/bukti palsu tertera di /terms'
  );

  const cookieBarFile = fs.readFileSync(path.join(process.cwd(), 'src/components/public/CookieConsentBar.jsx'), 'utf8');
  assert(
    cookieBarFile.includes('[ SAYA SETUJU ]'),
    'Tombol phosphor tactile [ SAYA SETUJU ] terpasang di Cookie Consent'
  );
  assert(
    cookieBarFile.includes('bg-white') && cookieBarFile.includes('border-2 border-slate-800'),
    'Banner Cookie Consent mengusung tema Light Neo-Brutalist'
  );

  // ── TEST 6: POS Cashier Ergonomics & Shortcuts ────────────
  console.log('\n📌 UJI 6: ERGONOMI KASIR & SHORTCUT KEYBOARD (SRC/APP/POS/PAGE.JS)');
  const posFile = fs.readFileSync(path.join(process.cwd(), 'src/app/pos/page.js'), 'utf8');
  assert(
    posFile.includes('const isTyping =') && posFile.includes("['INPUT', 'TEXTAREA', 'SELECT'].includes"),
    'Filter deteksi isTyping aktif di POS keydown listener'
  );
  assert(
    posFile.includes("e.key === 'F4'") && posFile.includes('handleCheckoutRef.current()'),
    'Shortcut F4 membuka checkout bayar'
  );
  assert(
    posFile.includes("!isTyping") && (posFile.includes("e.key === ' '") || posFile.includes("e.code === 'Space'")),
    'Tombol Spasi hanya membuka checkout saat kasir TIDAK mengetik input'
  );
  assert(
    posFile.includes("e.key === 'F2'") && posFile.includes('pos-search-input'),
    'Shortcut F2 memfokuskan kursor ke input pencarian produk'
  );
  assert(
    posFile.includes('[F4 / Spasi]'),
    'Label tombol checkout menampilkan [F4 / Spasi]'
  );
  assert(
    posFile.includes('[F2] Cari nama produk'),
    'Placeholder search input menampilkan [F2]'
  );
  assert(
    posFile.includes('SHORTCUT KASIR:') && posFile.includes('Cari / Scan') && posFile.includes('Bayar Bon'),
    'Footer legend shortcut kasir terpasang di antarmuka POS'
  );

  // ── REKAPITULASI HASIL ────────────────────────────────────
  console.log('\n===============================================================');
  console.log(`📊 HASIL AUDIT PRA-PRODUKSI: ${passed} LULUS, ${failed} GAGAL`);
  console.log('===============================================================');

  if (failed === 0) {
    console.log('🎉 SELURUH PROTOKOL AUDIT PRODUKSI 100% MEMENUHI STANDAR EMAS!\n');
    process.exit(0);
  } else {
    console.error(`🚨 DITEMUKAN ${failed} BUTIR YANG PERLU PERBAIKAN SEBELUM DEPLOY!\n`);
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error('Fatal error during audit:', err);
  process.exit(1);
});
