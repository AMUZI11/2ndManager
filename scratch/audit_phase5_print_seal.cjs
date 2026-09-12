/**
 * scratch/audit_phase5_print_seal.cjs
 * FASE 5: AUDIT TAMPILAN FISIK & KELAYAKAN DOKUMEN CETAK (PRINT & VERIFICATION SEAL AUDIT)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passedCount = 0;
let failedCount = 0;

function report(name, ok, details = '') {
  if (ok) {
    console.log(`  ✅ [PASS] ${name}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${name} -> ${details}`);
    failedCount++;
  }
}

function hasRawEmoji(str) {
  // Regex detecting common emojis
  const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  return emojiRegex.test(str);
}

function runPhase5Audit() {
  console.log('\n================================================================');
  console.log('📄  FASE 5: AUDIT TAMPILAN FISIK & KELAYAKAN DOKUMEN CETAK');
  console.log('================================================================\n');

  // ── 1. AUDIT BERKAS KUR A4 (KurDossierPrintView.jsx) ────────────────────────
  console.log('1. Audit Komponen Cetak A4: KurDossierPrintView.jsx');
  const printViewPath = path.join(__dirname, '../src/components/reports/KurDossierPrintView.jsx');
  assert.ok(fs.existsSync(printViewPath), 'KurDossierPrintView.jsx must exist');
  const printContent = fs.readFileSync(printViewPath, 'utf8');

  report(
    "Pengarasan 1: CSS -webkit-print-color-adjust & print-color-adjust: exact !important terpasang",
    printContent.includes('-webkit-print-color-adjust: exact !important') &&
    printContent.includes('print-color-adjust: exact !important')
  );

  report(
    "Presisi Ukuran Halaman: @page size: A4 portrait; margin: 0 terpasang",
    printContent.includes('size: A4 portrait') && printContent.includes('margin: 0')
  );

  report(
    "Pemisahan Halaman: page-break-after: always & break-after: page terpasang pada .dossier-page",
    printContent.includes('page-break-after: always !important') &&
    printContent.includes('break-after: page !important')
  );

  report(
    "Struktur Berkas: Memuat 4 halaman lengkap (Profil Usaha, Laba Rugi, Posisi Keuangan, Arus Kas)",
    printContent.includes('HALAMAN 1: PROFIL USAHA') &&
    printContent.includes('HALAMAN 2: LAPORAN LABA RUGI') &&
    printContent.includes('HALAMAN 3: LAPORAN POSISI KEUANGAN') &&
    printContent.includes('HALAMAN 4: ARUS KAS')
  );

  report(
    "Footer Navigasi Dokumen: Menampilkan penomoran halaman 1-4 secara eksplisit",
    printContent.includes('Halaman 1 dari 4') &&
    printContent.includes('Halaman 2 dari 4') &&
    printContent.includes('Halaman 3 dari 4') &&
    printContent.includes('Halaman 4 dari 4')
  );

  report(
    "Format Finansial Standar SAK EMKM: Menggunakan formatAccountingRupiah (tanda kurung untuk saldo defisit)",
    printContent.includes('formatAccountingRupiah')
  );

  report(
    "Kepatuhan Desain: KurDossierPrintView bebas dari raw emoji (Zero Raw Emoji)",
    !hasRawEmoji(printContent)
  );

  // ── 2. AUDIT PORTAL PUBLIK VERIFIKASI STEMPEL (/verify-seal/[checksum]) ──────
  console.log('\n2. Audit Portal Verifikasi Stempel: /verify-seal/[checksum]/page.js');
  const sealPagePath = path.join(__dirname, '../src/app/verify-seal/[checksum]/page.js');
  assert.ok(fs.existsSync(sealPagePath), '/verify-seal/[checksum]/page.js must exist');
  const sealPageContent = fs.readFileSync(sealPagePath, 'utf8');

  report(
    "Akses Publik: Halaman tidak memuat proteksi login/auth guards (Dapat diakses terbuka oleh analis bank)",
    !sealPageContent.includes('requireAuth') &&
    !sealPageContent.includes("redirect('/login')") &&
    !sealPageContent.includes('useSession')
  );

  report(
    "Next.js 16 App Router Compliance: Menggunakan React.use(params) untuk unwrapping asynchronous params",
    sealPageContent.includes('use(params)')
  );

  report(
    "Tata Letak Responsif: Menggunakan styling Tailwind ramah smartphone (w-full max-w-xl, flex-col, grid-cols-2)",
    sealPageContent.includes('max-w-xl') &&
    sealPageContent.includes('grid grid-cols-2') &&
    sealPageContent.includes('min-h-screen')
  );

  report(
    "Kerahasiaan Data (Anti-Data Breach): Hanya menampilkan ringkasan agregat, tanpa rincian transaksi individu pembeli",
    !sealPageContent.includes('customer_phone') &&
    !sealPageContent.includes('transaction_items') &&
    !sealPageContent.includes('buyer_name') &&
    sealPageContent.includes('netTurnover') &&
    sealPageContent.includes('netOperatingProfit')
  );

  report(
    "Kepatuhan Desain: /verify-seal/[checksum]/page.js bebas dari raw emoji (Zero Raw Emoji)",
    !hasRawEmoji(sealPageContent)
  );

  // ── 3. AUDIT API VERIFIKASI STEMPEL (/api/v1/verify-seal/[checksum]) ─────────
  console.log('\n3. Audit API Route: /api/v1/verify-seal/[checksum]/route.js');
  const apiRoutePath = path.join(__dirname, '../src/app/api/v1/verify-seal/[checksum]/route.js');
  assert.ok(fs.existsSync(apiRoutePath), '/api/v1/verify-seal/[checksum]/route.js must exist');
  const apiRouteContent = fs.readFileSync(apiRoutePath, 'utf8');

  report(
    "Kriptografi Validasi: Melakukan pencarian berdasarkan SHA-256 seal_checksum",
    apiRouteContent.includes('seal_checksum') || apiRouteContent.includes('checksum')
  );

  report(
    "Proteksi Privasi: Response JSON hanya mengekspos metadata organisasi dan ringkasan audit",
    apiRouteContent.includes('organizationName') &&
    apiRouteContent.includes('verified') &&
    !apiRouteContent.includes('customer_personal_info')
  );

  console.log('\n================================================================');
  console.log(`🏁 REKAPITULASI FASE 5: ${passedCount} LULUS, ${failedCount} GAGAL`);
  console.log('================================================================\n');

  if (failedCount > 0) process.exit(1);
}

runPhase5Audit();
