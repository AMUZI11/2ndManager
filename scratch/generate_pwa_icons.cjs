const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Minimal pure-JS PNG generator for PWA icons
function createPNG(size, bgR, bgG, bgB, fgR, fgG, fgB) {
  const width = size;
  const height = size;
  
  // Uncompressed raw scanlines: each scanline starts with filter byte 0
  const rowBytes = 1 + width * 4;
  const rawData = Buffer.alloc(rowBytes * height);
  
  const center = size / 2;
  const radius = size * 0.4;
  
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter: None
    
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Draw an arcade rounded square / emblem
      const isForeground = Math.abs(dx) < radius * 0.7 && Math.abs(dy) < radius * 0.7;
      
      if (isForeground) {
        rawData[pxOffset] = fgR;     // R (#CCFF00 -> 204)
        rawData[pxOffset + 1] = fgG; // G (255)
        rawData[pxOffset + 2] = fgB; // B (0)
        rawData[pxOffset + 3] = 255; // A
      } else {
        rawData[pxOffset] = bgR;     // R (#0B0F17 -> 11)
        rawData[pxOffset + 1] = bgG; // G (15)
        rawData[pxOffset + 2] = bgB; // B (23)
        rawData[pxOffset + 3] = 255; // A
      }
    }
  }
  
  const compressed = zlib.deflateSync(rawData);
  
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const body = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([len, body, crc]);
  }
  
  // CRC-32 table
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
  }
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }
  
  // Header: 13 bytes
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace
  
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = chunk('IHDR', ihdr);
  const idatChunk = chunk('IDAT', compressed);
  const iendChunk = chunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

// Buat icon 192x192 dan 512x512
const png192 = createPNG(192, 11, 15, 23, 204, 255, 0);
fs.writeFileSync(path.join(iconsDir, 'icon-192x192.png'), png192);

const png512 = createPNG(512, 11, 15, 23, 204, 255, 0);
fs.writeFileSync(path.join(iconsDir, 'icon-512x512.png'), png512);

// Buat juga SVG icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="128" fill="#0B0F17" />
  <rect x="96" y="96" width="320" height="320" rx="48" fill="#CCFF00" stroke="#1E293B" stroke-width="16" />
  <path d="M176 192h160v48H176zM176 272h100v48H176z" fill="#0B0F17" />
</svg>`;
fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent);

console.log('✅ PWA Icons berhasil dibuat di public/icons/:');
console.log('- icon-192x192.png (' + png192.length + ' bytes)');
console.log('- icon-512x512.png (' + png512.length + ' bytes)');
console.log('- icon.svg');
