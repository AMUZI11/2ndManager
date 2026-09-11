/**
 * scratch/verify_phase3_tactile_launch.cjs
 * Comprehensive verification script for Tahap 3: Tactile Accessibility, Hardware HID Scanner Engine, UU PDP Consent & Production Launchpad
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT_DIR = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${testName}: ${err.message}`);
  }
}

console.log('================================================================');
console.log('2ndManager - TAHAP 3 VERIFICATION SUITE: TACTILE & PRODUCTION');
console.log('================================================================\n');

// 1. Barcode Scanner Listener verification
runTest('Barcode Scanner Listener: File exists, contains burst detection & snapshot reversion', () => {
  const filePath = path.join(ROOT_DIR, 'src/utils/barcodeScannerListener.js');
  assert.ok(fs.existsSync(filePath), 'barcodeScannerListener.js must exist');
  const code = fs.readFileSync(filePath, 'utf-8');
  assert.ok(code.includes('attachBarcodeScannerListener'), 'Must export attachBarcodeScannerListener');
  assert.ok(code.includes('inputSnapshot'), 'Must save active input snapshot');
  assert.ok(
    code.includes('activeElementAtBurstStart.value = inputSnapshot') || code.includes('target.value = inputSnapshot'),
    'Must revert target.value to snapshot on scan complete'
  );
  assert.ok(code.includes('isModalOpen'), 'Must honor isModalOpen guard');
  assert.ok(code.includes('maxInterval'), 'Must check maxInterval between keystrokes');
});

// 2. Focus Trap Hook verification
runTest('Focus Trap Hook: File exists, contains Tab cycle, Escape, and MutationObserver', () => {
  const filePath = path.join(ROOT_DIR, 'src/hooks/useFocusTrap.js');
  assert.ok(fs.existsSync(filePath), 'useFocusTrap.js must exist');
  const code = fs.readFileSync(filePath, 'utf-8');
  assert.ok(code.includes('useFocusTrap'), 'Must export useFocusTrap');
  assert.ok(code.includes('MutationObserver'), 'Must observe DOM mutations for dynamic step transitions');
  assert.ok(code.includes('stepDependencies'), 'Must watch stepDependencies');
  assert.ok(code.includes('e.shiftKey'), 'Must handle Shift+Tab reverse cycle');
  assert.ok(code.includes('onEscape'), 'Must invoke onEscape callback');
});

// 3. POS Page Hotkey & Barcode Scanner Integration
runTest('POS Page: Hotkeys, Barcode Scanner, CIP filter, and Cart visual highlight', () => {
  const filePath = path.join(ROOT_DIR, 'src/app/pos/page.js');
  assert.ok(fs.existsSync(filePath), 'pos/page.js must exist');
  const code = fs.readFileSync(filePath, 'utf-8');
  
  assert.ok(code.includes('attachBarcodeScannerListener'), 'Must attach barcode scanner listener');
  assert.ok(code.includes('F4') || code.includes('F1'), 'Must handle F4/F1 hotkeys for search input');
  assert.ok(code.includes('F2'), 'Must handle F2 hotkey for checkout');
  assert.ok(code.includes('F9'), 'Must handle F9 hotkey for cash drawer kick');
  assert.ok(code.includes('ArrowDown') && code.includes('ArrowUp'), 'Must handle arrow navigation in cart');
  assert.ok(code.includes('Delete'), 'Must handle Delete hotkey for purging cart item');
  assert.ok(code.includes('selectedCartIndex'), 'Must track selectedCartIndex');
  assert.ok(code.includes('ring-2 ring-amber-400') || code.includes('border-amber-400'), 'Must highlight selected cart item');
  assert.ok(code.includes('hasEnteredPaymentPhaseRef'), 'Must track payment phase for CIP telemetry');
  assert.ok(code.includes('totalPurgedVal > 30000'), 'CIP filter must check purged value > 30000');
});

// 4. Modal Focus Trap Integration
runTest('Modal Integrations: CloseShiftModal, StartShiftModal, SmartChangeModal use focus trap', () => {
  const closeShift = fs.readFileSync(path.join(ROOT_DIR, 'src/components/pos/CloseShiftModal.jsx'), 'utf-8');
  const startShift = fs.readFileSync(path.join(ROOT_DIR, 'src/components/pos/StartShiftModal.jsx'), 'utf-8');
  const smartChange = fs.readFileSync(path.join(ROOT_DIR, 'src/components/pos/SmartChangeModal.jsx'), 'utf-8');

  assert.ok(closeShift.includes('useFocusTrap'), 'CloseShiftModal must use useFocusTrap');
  assert.ok(startShift.includes('useFocusTrap'), 'StartShiftModal must use useFocusTrap');
  assert.ok(smartChange.includes('useFocusTrap'), 'SmartChangeModal must use useFocusTrap');
  assert.ok(closeShift.includes('role="dialog"'), 'CloseShiftModal must have accessible dialog role');
  assert.ok(startShift.includes('role="dialog"'), 'StartShiftModal must have accessible dialog role');
  assert.ok(smartChange.includes('role="dialog"'), 'SmartChangeModal must have accessible dialog role');
});

// 5. UU PDP Consent Suite
runTest('UU PDP Consent Suite: CookieConsentBar, Layout mounting, Isolation from POS, WhatsApp notice', () => {
  const barPath = path.join(ROOT_DIR, 'src/components/public/CookieConsentBar.jsx');
  assert.ok(fs.existsSync(barPath), 'CookieConsentBar.jsx must exist');
  const barCode = fs.readFileSync(barPath, 'utf-8');
  assert.ok(barCode.includes('hl_cookie_consent'), 'Must persist to localStorage hl_cookie_consent');
  assert.ok(barCode.includes('UU PDP No. 27/2022'), 'Must cite UU PDP No. 27/2022');

  const pubLayout = fs.readFileSync(path.join(ROOT_DIR, 'src/app/(public)/layout.js'), 'utf-8');
  assert.ok(pubLayout.includes('CookieConsentBar'), 'Public layout must mount CookieConsentBar');

  const posPage = fs.readFileSync(path.join(ROOT_DIR, 'src/app/pos/page.js'), 'utf-8');
  assert.ok(!posPage.includes('CookieConsentBar'), 'POS terminal must NEVER mount CookieConsentBar');

  const smartChange = fs.readFileSync(path.join(ROOT_DIR, 'src/components/pos/SmartChangeModal.jsx'), 'utf-8');
  assert.ok(smartChange.includes('UU PDP No. 27/2022'), 'SmartChangeModal must include UU PDP WhatsApp disclaimer');
});

// 6. Semantic Breadcrumbs & Schema.org JSON-LD
runTest('Breadcrumbs: Component with Schema.org JSON-LD mounted on all 5 public pages', () => {
  const bPath = path.join(ROOT_DIR, 'src/components/public/Breadcrumbs.jsx');
  assert.ok(fs.existsSync(bPath), 'Breadcrumbs.jsx must exist');
  const bCode = fs.readFileSync(bPath, 'utf-8');
  assert.ok(bCode.includes('BreadcrumbList'), 'Must include BreadcrumbList JSON-LD');
  assert.ok(bCode.includes('aria-label="Breadcrumb"'), 'Must have accessible aria-label');

  const pages = ['features', 'pricing', 'privacy', 'terms', 'refund'];
  for (const p of pages) {
    const pCode = fs.readFileSync(path.join(ROOT_DIR, `src/app/(public)/${p}/page.js`), 'utf-8');
    assert.ok(pCode.includes('Breadcrumbs'), `Public page /${p} must mount Breadcrumbs component`);
  }
});

// 7. CORS Guard and Production Domain Setup Docs
runTest('CORS Guard & Production Domain Documentation', () => {
  const proxyPath = path.join(ROOT_DIR, 'src/proxy.js');
  assert.ok(fs.existsSync(proxyPath), 'src/proxy.js must exist');
  const proxyCode = fs.readFileSync(proxyPath, 'utf-8');
  assert.ok(proxyCode.includes('isAllowedOrigin'), 'Must have origin validation helper');
  assert.ok(proxyCode.includes('2ndmanager.com'), 'Must allow 2ndmanager.com and subdomains');
  assert.ok(proxyCode.includes('CORS_FORBIDDEN'), 'Must reject unauthorized origins with 403');

  const docPath = path.join(ROOT_DIR, 'docs/PRODUCTION_DOMAIN_SETUP.md');
  assert.ok(fs.existsSync(docPath), 'docs/PRODUCTION_DOMAIN_SETUP.md must exist');
  const docCode = fs.readFileSync(docPath, 'utf-8');
  assert.ok(docCode.includes('2ndmanager.com'), 'Doc must detail 2ndmanager.com architecture');
});

// 8. Zero Emojis and Zero Em-Dashes in Modified Production Files
runTest('Zero Emojis & Em-Dashes Hygiene across Tahap 3 deliverables', () => {
  const filesToCheck = [
    'src/utils/barcodeScannerListener.js',
    'src/hooks/useFocusTrap.js',
    'src/components/public/CookieConsentBar.jsx',
    'src/components/public/Breadcrumbs.jsx',
    'src/components/pos/CloseShiftModal.jsx',
    'src/components/pos/StartShiftModal.jsx',
    'src/components/pos/SmartChangeModal.jsx',
    'src/app/pos/page.js',
    'src/app/(public)/layout.js',
    'src/app/(public)/features/page.js',
    'src/app/(public)/pricing/page.js',
    'src/app/(public)/privacy/page.js',
    'src/app/(public)/terms/page.js',
    'src/app/(public)/refund/page.js',
    'src/proxy.js',
    'docs/PRODUCTION_DOMAIN_SETUP.md',
  ];

  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  const emDashRegex = /—/;

  for (const rel of filesToCheck) {
    const fullPath = path.join(ROOT_DIR, rel);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      // Check emoji
      const emojiMatch = line.match(emojiRegex);
      assert.strictEqual(
        emojiMatch,
        null,
        `Forbidden raw emoji "${emojiMatch?.[0]}" found in ${rel} at line ${idx + 1}: ${line.trim()}`
      );

      // Check em-dash
      const emDashMatch = line.match(emDashRegex);
      assert.strictEqual(
        emDashMatch,
        null,
        `Forbidden em-dash "—" found in ${rel} at line ${idx + 1}: ${line.trim()}`
      );
    });
  }
});

console.log('\n----------------------------------------------------------------');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log('================================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
} else {
  console.log('ALL TAHAP 3 TACTILE ACCESSIBILITY & PRODUCTION LAUNCH CHECKS PASSED 100%!\n');
  process.exit(0);
}
