/**
 * scratch/ensure_vapid_keys.cjs
 * Helper idempoten inisialisasi dan verifikasi VAPID Keypair (RFC 8292)
 */

const fs = require('fs');
const path = require('path');
const webpush = require('web-push');

const envLocalPath = path.resolve(__dirname, '../.env.local');

function ensureVapidKeys() {
  let envContent = '';
  if (fs.existsSync(envLocalPath)) {
    envContent = fs.readFileSync(envLocalPath, 'utf8');
  }

  const hasPublicKey = envContent.includes('NEXT_PUBLIC_VAPID_PUBLIC_KEY=');
  const hasPrivateKey = envContent.includes('VAPID_PRIVATE_KEY=');
  const hasSubject = envContent.includes('VAPID_SUBJECT=');

  if (hasPublicKey && hasPrivateKey && hasSubject) {
    // Ekstrak existing keys
    const publicKeyMatch = envContent.match(/NEXT_PUBLIC_VAPID_PUBLIC_KEY="?([^"\r\n]+)"?/);
    const privateKeyMatch = envContent.match(/VAPID_PRIVATE_KEY="?([^"\r\n]+)"?/);
    const subjectMatch = envContent.match(/VAPID_SUBJECT="?([^"\r\n]+)"?/);

    console.log('[VAPID] Sepasang kunci VAPID RFC 8292 sudah tersedia di .env.local.');
    return {
      publicKey: publicKeyMatch ? publicKeyMatch[1] : null,
      privateKey: privateKeyMatch ? privateKeyMatch[1] : null,
      subject: subjectMatch ? subjectMatch[1] : 'mailto:security@2ndmanager.com',
      isNew: false,
    };
  }

  // Generate sepasang VAPID key baru
  const vapidKeys = webpush.generateVAPIDKeys();
  const subject = 'mailto:security@2ndmanager.com';

  const vapidConfigLines = [
    '',
    '# ─── VAPID WEB PUSH (RFC 8292) ─────────────────────────────────────────────',
    `NEXT_PUBLIC_VAPID_PUBLIC_KEY="${vapidKeys.publicKey}"`,
    `VAPID_PRIVATE_KEY="${vapidKeys.privateKey}"`,
    `VAPID_SUBJECT="${subject}"`,
    'CRITICAL_ACTION_SECRET="c79f42d2a7bc4e9089f66d4822501a3de9e0ad7911b3e5a3"',
    '',
  ].join('\n');

  fs.appendFileSync(envLocalPath, vapidConfigLines, 'utf8');
  console.log('[VAPID] Sepasang kunci VAPID RFC 8292 baru berhasil dibuat dan disimpan ke .env.local');

  return {
    publicKey: vapidKeys.publicKey,
    privateKey: vapidKeys.privateKey,
    subject,
    isNew: true,
  };
}

if (require.main === module) {
  const result = ensureVapidKeys();
  console.log('Public Key :', result.publicKey);
  console.log('Subject    :', result.subject);
}

module.exports = { ensureVapidKeys };
