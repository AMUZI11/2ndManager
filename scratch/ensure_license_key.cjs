/**
 * scratch/ensure_license_key.cjs
 * Inisialisasi Idempoten Kunci Rahasia Lisensi HMAC (LICENSE_SECRET_KEY)
 * Menulis ke .env.local jika belum ada atau kurang dari 32 karakter.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function ensureLicenseSecretKey() {
  const envPath = path.join(process.cwd(), '.env.local');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  const match = envContent.match(/^LICENSE_SECRET_KEY=(.+)$/m);
  if (match && match[1] && match[1].trim().length >= 32) {
    return match[1].trim();
  }

  const generatedKey = crypto.randomBytes(32).toString('hex');
  const newLine = `\nLICENSE_SECRET_KEY=${generatedKey}\n`;

  fs.appendFileSync(envPath, newLine, 'utf8');
  console.log('[LICENSE] Kunci rahasia HMAC (LICENSE_SECRET_KEY) berhasil diinisialisasi di .env.local.');
  
  process.env.LICENSE_SECRET_KEY = generatedKey;
  return generatedKey;
}

if (require.main === module) {
  const key = ensureLicenseSecretKey();
  console.log(`[LICENSE] Key Active: ${key.substring(0, 8)}... (${key.length} chars)`);
}

module.exports = { ensureLicenseSecretKey };
