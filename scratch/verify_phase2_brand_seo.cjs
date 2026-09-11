const fs = require('fs');
const path = require('path');

async function verify() {
  console.log('=== VERIFIKASI TAHAP 2: BRAND, LEGAL & TECHNICAL SEO ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Check Brand Assets
  const assets = [
    'public/og-image.png',
    'public/icon.png',
    'public/apple-touch-icon.png',
    'public/favicon.ico',
    'public/llms.txt',
  ];

  for (const asset of assets) {
    const fullPath = path.resolve(__dirname, '..', asset);
    const exists = fs.existsSync(fullPath);
    const size = exists ? fs.statSync(fullPath).size : 0;
    assert(exists && size > 0, `Asset ${asset} ada dan bervolume (${size} bytes)`);
  }

  // 2. Check llms.txt content
  const llmsContent = fs.readFileSync(path.resolve(__dirname, '../public/llms.txt'), 'utf8');
  assert(llmsContent.includes('# 2ndManager'), 'llms.txt memuat judul # 2ndManager');
  assert(llmsContent.includes('Double-Blind Estafet Handover'), 'llms.txt memuat fitur Double-Blind');
  assert(llmsContent.includes('Pelacak Tabung Gas & Galon'), 'llms.txt memuat fitur Tabung Gas');

  // 3. Test HTTP endpoints on running server (http://localhost:3000)
  const baseUrl = 'http://localhost:3000';

  // 3a. robots.txt
  try {
    const resRobots = await fetch(`${baseUrl}/robots.txt`);
    const textRobots = await resRobots.text();
    assert(resRobots.status === 200, `GET /robots.txt status 200 (Status: ${resRobots.status})`);
    assert(textRobots.includes('Disallow: /pos/'), 'robots.txt memuat Disallow: /pos/');
    assert(textRobots.includes('Disallow: /api/'), 'robots.txt memuat Disallow: /api/');
    assert(textRobots.includes('sitemap.xml'), 'robots.txt merujuk ke sitemap.xml');
  } catch (e) {
    assert(false, `Gagal memanggil /robots.txt: ${e.message}`);
  }

  // 3b. sitemap.xml
  try {
    const resSitemap = await fetch(`${baseUrl}/sitemap.xml`);
    const textSitemap = await resSitemap.text();
    assert(resSitemap.status === 200, `GET /sitemap.xml status 200 (Status: ${resSitemap.status})`);
    assert(textSitemap.includes('https://2ndmanager.com/pricing'), 'sitemap.xml memuat /pricing');
    assert(textSitemap.includes('https://2ndmanager.com/features'), 'sitemap.xml memuat /features');
    assert(textSitemap.includes('https://2ndmanager.com/privacy'), 'sitemap.xml memuat /privacy');
    assert(textSitemap.includes('https://2ndmanager.com/terms'), 'sitemap.xml memuat /terms');
    assert(textSitemap.includes('https://2ndmanager.com/refund'), 'sitemap.xml memuat /refund');
  } catch (e) {
    assert(false, `Gagal memanggil /sitemap.xml: ${e.message}`);
  }

  // 3c. Public Pages
  const pagesToTest = [
    { url: '/privacy', expected: 'UU PDP No. 27' },
    { url: '/terms', expected: 'Syarat & Ketentuan' },
    { url: '/refund', expected: 'Garansi 7 Hari' },
    { url: '/pricing', expected: 'Magang' },
    { url: '/features', expected: 'Multi-Tier Auto-Unpack' },
  ];

  for (const page of pagesToTest) {
    try {
      const res = await fetch(`${baseUrl}${page.url}`);
      const text = await res.text();
      assert(res.status === 200, `GET ${page.url} status 200`);
      assert(text.includes(page.expected) || text.includes(page.expected.replace(/&/g, '&amp;')), `${page.url} memuat teks kunci "${page.expected}"`);
    } catch (e) {
      assert(false, `Gagal memanggil ${page.url}: ${e.message}`);
    }
  }

  // 3d. 404 Not Found Page
  try {
    const res404 = await fetch(`${baseUrl}/halaman-acak-tidak-ada-12345`);
    const text404 = await res404.text();
    assert(res404.status === 404, `GET /halaman-acak status 404 (Status: ${res404.status})`);
    assert(text404.includes('BARANG TIDAK DITEMUKAN') || text404.includes('RAK KOSONG'), 'Halaman 404 memuat teks kustom Arcade Brutalist');
  } catch (e) {
    assert(false, `Gagal memanggil rute 404: ${e.message}`);
  }

  console.log(`\n=== HASIL VERIFIKASI: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) process.exit(1);
}

verify().catch(err => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
