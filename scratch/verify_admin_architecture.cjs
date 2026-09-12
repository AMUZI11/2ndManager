// scratch/verify_admin_architecture.cjs
// Verification script for Arcade Brutalist Mission Control Admin Architecture & RBAC
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

console.log('====================================================');
console.log('AUDIT ARSITEKTUR & RBAC MISSION CONTROL ADMIN');
console.log('====================================================\n');

let allPassed = true;
function assert(desc, condition) {
  if (condition) {
    console.log(`✅ PASS: ${desc}`);
  } else {
    console.error(`❌ FAIL: ${desc}`);
    allPassed = false;
  }
}

// 1. Verifikasi Penghapusan Direktori Konflik (src/app/(admin))
const oldAdminDir = path.join(rootDir, 'src', 'app', '(admin)');
assert('Direktori lama src/app/(admin) telah dihapus (anti-collision Next.js)', !fs.existsSync(oldAdminDir));

// 2. Verifikasi Keberadaan Seluruh Halaman Mission Control di (authenticated)/admin
const requiredPages = [
  'src/app/(authenticated)/admin/layout.js',
  'src/app/(authenticated)/admin/page.js',
  'src/app/(authenticated)/admin/inventory/page.js',
  'src/app/(authenticated)/admin/transactions/page.js',
  'src/app/(authenticated)/admin/branches/page.js',
  'src/app/(authenticated)/admin/vouchers/page.js',
  'src/app/api/v1/admin/summary/route.js',
  'src/app/api/v1/admin/vouchers/route.js',
  'src/hooks/useAdminDashboardData.js',
];

for (const p of requiredPages) {
  const fullPath = path.join(rootDir, p);
  assert(`File modul ada: ${p}`, fs.existsSync(fullPath));
}

// 3. Verifikasi Isi Proxy.js (RBAC & 308 Permanent Redirects)
const proxyContent = fs.readFileSync(path.join(rootDir, 'src', 'proxy.js'), 'utf8');

assert('Proxy mendeteksi role CASHIER dan memblokir ke /pos?denied=unauthorized_admin_access',
  proxyContent.includes("role === 'CASHIER'") &&
  proxyContent.includes('/pos') &&
  proxyContent.includes('unauthorized_admin_access')
);

assert('Proxy melindungi route Superadmin (/admin/vouchers, tenants, panic-dispatch, dll)',
  proxyContent.includes('/admin/vouchers') &&
  proxyContent.includes('/admin/tenants') &&
  proxyContent.includes('isSuperadminRoute')
);

assert('Proxy mengizinkan peran BOSS/OWNER/MANAGER untuk dashboard admin',
  proxyContent.includes('isAuthorizedOwner') &&
  proxyContent.includes('BOSS')
);

assert('Proxy memiliki 308 Permanent Redirects untuk /dashboard, /owner, /products, /transactions',
  proxyContent.includes("url.pathname = '/admin';\n    return NextResponse.redirect(url, 308);") &&
  proxyContent.includes("url.pathname = '/admin/inventory';\n    return NextResponse.redirect(url, 308);") &&
  proxyContent.includes("url.pathname = '/admin/transactions';\n    return NextResponse.redirect(url, 308);")
);

// 4. Verifikasi Isolasi Shell di src/app/(authenticated)/layout.js
const authLayoutContent = fs.readFileSync(path.join(rootDir, 'src', 'app', '(authenticated)', 'layout.js'), 'utf8');
assert('Layout authenticated mengisolasi /admin dari dock/sidebar warung biasa',
  authLayoutContent.includes("pathname?.startsWith('/admin')") &&
  authLayoutContent.includes('return <>{children}</>;')
);

// 5. Verifikasi Legacy Redirect Pages
const legacyPages = [
  { file: 'src/app/(authenticated)/dashboard/page.js', target: '/admin' },
  { file: 'src/app/(authenticated)/owner/page.js', target: '/admin' },
  { file: 'src/app/(authenticated)/products/page.js', target: '/admin/inventory' },
  { file: 'src/app/(authenticated)/transactions/page.js', target: '/admin/transactions' },
];

for (const lp of legacyPages) {
  const content = fs.readFileSync(path.join(rootDir, lp.file), 'utf8');
  assert(`Legacy page ${lp.file} melakukan redirect ke ${lp.target}`,
    content.includes(`redirect('${lp.target}')`)
  );
}

// 6. Verifikasi Hook Smart Polling useAdminDashboardData
const hookContent = fs.readFileSync(path.join(rootDir, 'src', 'hooks', 'useAdminDashboardData.js'), 'utf8');
assert('Hook useAdminDashboardData memiliki interval 30 detik dan Page Visibility API',
  hookContent.includes('30000') &&
  hookContent.includes('document.visibilityState') &&
  hookContent.includes('addEventListener(\'online\'') &&
  hookContent.includes('isCooldown')
);

console.log('\n====================================================');
if (allPassed) {
  console.log('🎉 SELURUH AUDIT ARSITEKTUR & RBAC BERHASIL 100%!');
} else {
  console.error('❌ ADA KEGAGALAN DALAM AUDIT ARSITEKTUR!');
  process.exit(1);
}
console.log('====================================================\n');
