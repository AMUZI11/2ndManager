/**
 * scratch/verify_bugfix_org_cors.cjs
 * Verifikasi Perbaikan Bug: CORS Origin Guard & Resolusi Multi-Organisasi/Multi-Cabang
 */

const assert = require('assert');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://doaisnsdahepsxqaroru.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvYWlzbnNkYWhlcHN4cWFyb3J1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDg5NjQxMSwiZXhwIjoyMTAwNDcyNDExfQ.0JwvzNqGalGY97USjY_8SI_4lihNoNPZEJFDQMNf8g0';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Implement resolveOrganization identical to src/lib/auth-helpers.js
async function resolveOrganization(supabase, user, profile = null, explicitBranchId = null) {
  if (!user && !profile) return null;

  if (explicitBranchId && explicitBranchId !== 'ALL') {
    const { data: branch } = await supabase
      .from('branches')
      .select('organization_id, organizations(*)')
      .eq('id', explicitBranchId)
      .maybeSingle();
    if (branch?.organizations) return branch.organizations;
  }

  const targetShopId = profile?.shop_id;
  if (targetShopId) {
    const { data: branch } = await supabase
      .from('branches')
      .select('organization_id, organizations(*)')
      .eq('shop_id', targetShopId)
      .maybeSingle();
    if (branch?.organizations) return branch.organizations;
  }

  if (user?.id) {
    const { data: ownedShops } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', user.id);

    if (ownedShops && ownedShops.length > 0) {
      const shopIds = ownedShops.map((s) => s.id);
      const { data: branchList } = await supabase
        .from('branches')
        .select('organization_id, organizations(*)')
        .in('shop_id', shopIds)
        .limit(1);
      if (branchList && branchList.length > 0 && branchList[0].organizations) {
        return branchList[0].organizations;
      }
    }

    const { data: orgList } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (orgList && orgList.length > 0) {
      return orgList[0];
    }
  }

  return null;
}

async function testBugfixes() {
  console.log('================================================================');
  console.log('🔍 VERIFIKASI PERBAIKAN BUG: ORGANISASI & CORS ORIGIN GUARD');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function check(name, condition) {
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name}`);
      failed++;
    }
  }

  // ── TEST 1: Boss dengan Multi-Organisasi & Multi-Cabang ──────────────────
  console.log('1. Uji Resolusi Organisasi untuk Boss Ahza (Multi-Org & Multi-Cabang):');
  const userBoss = { id: '4c67a61d-be80-4e58-8709-da509a273687' };
  const profileBoss = { role: 'BOSS', shop_id: '0abced26-0c34-40d4-8652-f0cd6242cd7d' };
  
  const orgBoss = await resolveOrganization(supabase, userBoss, profileBoss);
  check('Boss Ahza berhasil menemukan organisasi (tidak error PGRST116)', orgBoss !== null);
  check('Organisasi yang ditemukan adalah toko ahza', orgBoss?.name === 'toko ahza');

  // ── TEST 2: Kasir yang Terikat ke Cabang ──────────────────────────────────
  console.log('\n2. Uji Resolusi Organisasi untuk Kasir Budi Padang (Role: CASHIER):');
  const userKasir = { id: 'b286482b-36dc-48cf-9e84-bb2de9362c9d' };
  const profileKasir = { role: 'CASHIER', shop_id: '73b39c01-97b8-4585-a70a-0d3eed9c1474' };

  const orgKasir = await resolveOrganization(supabase, userKasir, profileKasir);
  check('Kasir Budi Padang berhasil menemukan organisasi induk tokonya', orgKasir !== null);
  check('Organisasi kasir cocok dengan toko ahza', orgKasir?.name === 'toko ahza');

  // ── TEST 3: Resolusi Berdasarkan explicitBranchId ─────────────────────────
  console.log('\n3. Uji Resolusi dengan explicitBranchId:');
  const branchPadangId = '4e0a745b-76bc-4230-a000-a42840e92bac'; // cabang padang
  const orgByBranch = await resolveOrganization(supabase, userBoss, profileBoss, branchPadangId);
  check('Berhasil menemukan organisasi melalui branch_id eksplisit', orgByBranch !== null);
  check('ID Organisasi valid', orgByBranch?.id === 'c5c69787-b8e1-4bdb-894f-479ca461fb01');

  // ── TEST 4: Uji CORS isAllowedOrigin ─────────────────────────────────────
  console.log('\n4. Uji Aturan CORS isAllowedOrigin di Edge Proxy:');
  // Replicate logic in src/proxy.js
  function isAllowedOrigin(origin, request = null) {
    if (!origin) return true;
    try {
      const url = new URL(origin);
      const host = url.hostname.toLowerCase();
      if (request) {
        const reqHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl?.host;
        if (reqHost) {
          const cleanReqHost = reqHost.split(':')[0].toLowerCase();
          if (host === cleanReqHost) return true;
        }
      }
      if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1') return true;
      if (/^192\.168\./.test(host) || /^10\./.test(host) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return true;
      if (host === '2ndmanager.com' || host.endsWith('.2ndmanager.com')) return true;
      if (host === 'vercel.app' || host.endsWith('.vercel.app')) return true;
      return false;
    } catch {
      return false;
    }
  }

  const dummyReq = {
    headers: {
      get: (k) => (k.toLowerCase() === 'host' ? '2ndmanager.vercel.app' : null)
    },
    nextUrl: { host: '2ndmanager.vercel.app' }
  };

  check('Vercel preview domain diizinkan (*.vercel.app)', isAllowedOrigin('https://2ndmanager.vercel.app'));
  check('Subdomain Vercel deployment diizinkan', isAllowedOrigin('https://hl-manager-pro-git-main-amuzi11s-projects.vercel.app'));
  check('Same-origin request matching host header diizinkan', isAllowedOrigin('https://2ndmanager.vercel.app', dummyReq));
  check('LAN IP Android kasir diizinkan (192.168.1.50)', isAllowedOrigin('http://192.168.1.50:3000'));
  check('Domain penyerang ditolak (evil-hacker.com)', !isAllowedOrigin('https://evil-hacker.com', dummyReq));

  console.log('\n================================================================');
  console.log(`🏁 REKAPITULASI PENGUJIAN: ${passed} LULUS, ${failed} GAGAL`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

testBugfixes().catch((err) => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});
