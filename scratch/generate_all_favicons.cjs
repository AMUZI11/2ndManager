const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

function createIco(images) {
  const numImages = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(numImages, 4); // Number of images

  let offset = 6 + (16 * numImages);
  const entries = [];
  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
    entry.writeUInt8(0, 2); // Palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8); // Size of image data
    entry.writeUInt32LE(offset, 12); // Offset of image data
    entries.push(entry);
    offset += img.buffer.length;
  }
  return Buffer.concat([header, ...entries, ...images.map(i => i.buffer)]);
}

// 2ndManager Signature Neo-Brutalist Brand SVG
// Deep Obsidian #080C14 canvas, Neon Citron #CCFF00 border & 2M monogram, high-contrast
const brandSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="neonGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#D4FF00"/>
      <stop offset="100%" stop-color="#A6E600"/>
    </linearGradient>
  </defs>

  <!-- Deep Obsidian Canvas with Neo-Brutalist Radius -->
  <rect width="512" height="512" rx="100" fill="#080C14"/>
  
  <!-- Thick Neo-Brutalist Citron Border -->
  <rect x="20" y="20" width="472" height="472" rx="80" fill="none" stroke="url(#neonGlow)" stroke-width="32"/>

  <!-- Status / Online Dot -->
  <circle cx="410" cy="100" r="26" fill="#CCFF00"/>
  <circle cx="410" cy="100" r="14" fill="#080C14"/>

  <!-- 2M High-Contrast Monogram -->
  <text x="246" y="336" text-anchor="middle" fill="#CCFF00" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="240" letter-spacing="-14">2M</text>

  <!-- Bottom Terminal Status Strip -->
  <rect x="176" y="386" width="160" height="24" rx="6" fill="#CCFF00"/>
  <rect x="206" y="392" width="100" height="12" rx="3" fill="#080C14"/>
</svg>
`.trim();

async function generateAllFavicons() {
  console.log('🚀 [FAVICON GENERATOR] Memulai pembuatan aset favicon & app icons 2ndManager...');

  const rootDir = path.resolve(__dirname, '..');
  const publicDir = path.join(rootDir, 'public');
  const iconsDir = path.join(publicDir, 'icons');
  const appDir = path.join(rootDir, 'src', 'app');

  if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

  // 1. Simpan vector SVG sumber
  fs.writeFileSync(path.join(publicDir, 'icons', 'icon.svg'), brandSvg, 'utf8');
  fs.writeFileSync(path.join(appDir, 'icon.svg'), brandSvg, 'utf8');
  console.log('✅ icon.svg berhasil disimpan di public/icons dan src/app.');

  // 2. Render multi-size PNG buffers
  const svgBuf = Buffer.from(brandSvg);
  const buf16 = await sharp(svgBuf).resize(16, 16).png().toBuffer();
  const buf32 = await sharp(svgBuf).resize(32, 32).png().toBuffer();
  const buf48 = await sharp(svgBuf).resize(48, 48).png().toBuffer();
  const buf180 = await sharp(svgBuf).resize(180, 180).png().toBuffer();
  const buf192 = await sharp(svgBuf).resize(192, 192).png().toBuffer();
  const buf512 = await sharp(svgBuf).resize(512, 512).png().toBuffer();

  // 3. Bangun ICO Multi-Resolusi (16x16, 32x32, 48x48)
  const icoBuffer = createIco([
    { width: 16, height: 16, buffer: buf16 },
    { width: 32, height: 32, buffer: buf32 },
    { width: 48, height: 48, buffer: buf48 },
  ]);

  // 4. Timpa src/app/favicon.ico (INI YANG MENYELESAIKAN MASALAH LOGO VERCEL!)
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), icoBuffer);
  console.log(`✅ src/app/favicon.ico berhasil ditimpa dengan icon 2ndManager (${icoBuffer.length} bytes)!`);

  // 5. Simpan ke public/favicon.ico & public/favicon.png
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(publicDir, 'favicon.png'), buf32);
  console.log('✅ public/favicon.ico dan public/favicon.png berhasil diperbarui.');

  // 6. Simpan Next.js App Router metadata icons: src/app/icon.png & src/app/apple-icon.png
  fs.writeFileSync(path.join(appDir, 'icon.png'), buf32);
  fs.writeFileSync(path.join(appDir, 'apple-icon.png'), buf180);
  console.log('✅ src/app/icon.png dan src/app/apple-icon.png berhasil dibuat.');

  // 7. Simpan public/apple-touch-icon.png
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), buf180);
  fs.writeFileSync(path.join(publicDir, 'icon.png'), buf512);

  // 8. Simpan PWA icons
  fs.writeFileSync(path.join(iconsDir, 'icon-192x192.png'), buf192);
  fs.writeFileSync(path.join(iconsDir, 'icon-512x512.png'), buf512);
  console.log('✅ PWA icons (192x192, 512x512) berhasil diperbarui.');

  console.log('🎉 Seluruh aset Favicon & Brand Icons 2ndManager telah berhasil dibuat 100%!');
}

generateAllFavicons().catch(err => {
  console.error('❌ Gagal menghasilkan favicon:', err);
  process.exit(1);
});
