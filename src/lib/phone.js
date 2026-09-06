/**
 * src/lib/phone.js
 * Utility untuk sanitasi dan normalisasi nomor WhatsApp / telepon Indonesia.
 * Memastikan output berformat internasional tanpa tanda plus, spasi, atau strip: '628xxx'
 */

export function normalizeIndonesianPhone(phone) {
  if (!phone) return '';
  
  // Hapus semua karakter non-digit
  let cleaned = String(phone).replace(/\D/g, '');

  if (!cleaned) return '';

  // 08xx -> 628xx
  if (cleaned.startsWith('08')) {
    cleaned = '62' + cleaned.slice(1);
  } 
  // 8xx -> 628xx
  else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  // 6208xx (salah ketik umum) -> 628xx
  else if (cleaned.startsWith('6208')) {
    cleaned = '62' + cleaned.slice(3);
  }

  // Validasi panjang minimum nomor seluler Indonesia (biasanya 10-15 digit)
  if (cleaned.startsWith('62') && cleaned.length >= 10 && cleaned.length <= 16) {
    return cleaned;
  }

  return cleaned;
}

export default normalizeIndonesianPhone;
