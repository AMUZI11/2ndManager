const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generateAssets() {
  const publicDir = path.resolve(__dirname, '../public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // 1. OG IMAGE (1200 x 630)
  const ogSvg = `
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1E293B" stroke-width="1.5" stroke-opacity="0.4"/>
      </pattern>
    </defs>

    <!-- Canvas Background -->
    <rect width="1200" height="630" fill="#0B0F17" />
    <rect width="1200" height="630" fill="url(#grid)" />

    <!-- Ambient Orbs -->
    <circle cx="1050" cy="150" r="280" fill="#F59E0B" fill-opacity="0.12" />
    <circle cx="150" cy="500" r="250" fill="#10B981" fill-opacity="0.08" />

    <!-- Heavy Arcade Outer Border -->
    <rect x="24" y="24" width="1152" height="582" rx="20" fill="none" stroke="#F59E0B" stroke-width="6" />
    <rect x="34" y="34" width="1132" height="562" rx="14" fill="none" stroke="#334155" stroke-width="2" />

    <!-- Top Badge -->
    <g transform="translate(60, 65)">
      <rect width="440" height="44" rx="10" fill="#1E293B" stroke="#475569" stroke-width="2" />
      <circle cx="24" cy="22" r="8" fill="#10B981" />
      <text x="44" y="28" fill="#F8FAFC" font-family="sans-serif" font-weight="900" font-size="16" letter-spacing="1.5">
        2NDMANAGER // OPERATIONAL OS
      </text>
    </g>

    <!-- Brand Shield Icon -->
    <g transform="translate(1000, 65)">
      <rect width="130" height="44" rx="10" fill="#F59E0B" stroke="#0B0F17" stroke-width="2" />
      <text x="65" y="28" fill="#0B0F17" text-anchor="middle" font-family="monospace" font-weight="900" font-size="16" letter-spacing="2">
        V2.4 PRO
      </text>
    </g>

    <!-- Main Headings -->
    <g transform="translate(60, 175)">
      <text x="0" y="0" fill="#F59E0B" font-family="sans-serif" font-weight="900" font-size="28" letter-spacing="2">
        SISTEM OPERASI POS &amp; LOGISTIK WARUNG
      </text>
      <text x="0" y="70" fill="#FFFFFF" font-family="sans-serif" font-weight="900" font-size="62" letter-spacing="-1">
        KELOLA WARUNG TANPA
      </text>
      <text x="0" y="145" fill="#FBBF24" font-family="sans-serif" font-weight="900" font-size="64" letter-spacing="-1">
        KEBOCORAN KAS LACI.
      </text>
    </g>

    <!-- Subtitle Bar -->
    <g transform="translate(60, 360)">
      <text x="0" y="0" fill="#94A3B8" font-family="sans-serif" font-weight="600" font-size="22">
        Sistem kasir anti-fraud pertama dengan estafet blind closing, radar belanja pasar subuh,
      </text>
      <text x="0" y="32" fill="#94A3B8" font-family="sans-serif" font-weight="600" font-size="22">
        dan pelacak deposit tabung gas rolling untuk pedagang kelontong modern.
      </text>
    </g>

    <!-- Feature Tags -->
    <g transform="translate(60, 465)">
      <!-- Tag 1 -->
      <g transform="translate(0, 0)">
        <rect width="230" height="46" rx="8" fill="#1E293B" stroke="#0B0F17" stroke-width="2" />
        <text x="115" y="28" fill="#F8FAFC" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="14">
          🛡️ DOUBLE-BLIND AUDIT
        </text>
      </g>
      <!-- Tag 2 -->
      <g transform="translate(245, 0)">
        <rect width="230" height="46" rx="8" fill="#1E293B" stroke="#0B0F17" stroke-width="2" />
        <text x="115" y="28" fill="#F8FAFC" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="14">
          🔥 TABUNG GAS ROLLING
        </text>
      </g>
      <!-- Tag 3 -->
      <g transform="translate(490, 0)">
        <rect width="230" height="46" rx="8" fill="#1E293B" stroke="#0B0F17" stroke-width="2" />
        <text x="115" y="28" fill="#F8FAFC" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="14">
          🌙 RADAR PASAR SUBUH
        </text>
      </g>
      <!-- Tag 4 -->
      <g transform="translate(735, 0)">
        <rect width="230" height="46" rx="8" fill="#10B981" stroke="#0B0F17" stroke-width="2" />
        <text x="115" y="28" fill="#0B0F17" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="14">
          ⚡ 100% OFFLINE-READY
        </text>
      </g>
    </g>

    <!-- Bottom Footer Strip -->
    <g transform="translate(60, 560)">
      <text x="0" y="0" fill="#64748B" font-family="monospace" font-weight="700" font-size="16">
        WWW.2NDMANAGER.COM • RESMI UU PDP NO. 27/2022 • ZERO-COST WHATSAPP
      </text>
    </g>
  </svg>
  `;

  console.log('Rendering og-image.png (1200x630)...');
  await sharp(Buffer.from(ogSvg))
    .png({ quality: 90, compressionLevel: 8 })
    .toFile(path.join(publicDir, 'og-image.png'));

  // 2. ICON (512 x 512)
  const iconSvg = `
  <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" rx="100" fill="#0B0F17" />
    <rect x="24" y="24" width="464" height="464" rx="84" fill="none" stroke="#F59E0B" stroke-width="12" />
    <path d="M 256 90 L 400 150 C 400 290 320 380 256 422 C 192 380 112 290 112 150 Z" fill="#F59E0B" stroke="#0B0F17" stroke-width="8" />
    <text x="256" y="280" fill="#0B0F17" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="110">
      2M
    </text>
    <circle cx="256" cy="335" r="14" fill="#10B981" />
  </svg>
  `;

  console.log('Rendering icon.png (512x512)...');
  await sharp(Buffer.from(iconSvg))
    .png()
    .toFile(path.join(publicDir, 'icon.png'));

  // 3. APPLE TOUCH ICON (180 x 180)
  console.log('Rendering apple-touch-icon.png (180x180)...');
  await sharp(Buffer.from(iconSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // 4. FAVICON (32 x 32)
  console.log('Rendering favicon.ico (32x32)...');
  await sharp(Buffer.from(iconSvg))
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));

  console.log('Rendering favicon.png (32x32)...');
  await sharp(Buffer.from(iconSvg))
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));

  console.log('All brand assets successfully generated in public/ !');
}

generateAssets().catch(err => {
  console.error('Error generating brand assets:', err);
  process.exit(1);
});
