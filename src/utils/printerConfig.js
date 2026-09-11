// src/utils/printerConfig.js
// Pengelola Konfigurasi Hardware Printer Thermal ESC/POS (Dual-Width 58mm/80mm)
// Persistensi ke localStorage ('hl_pos_printer_config')

export const STORAGE_KEY_PRINTER = 'hl_pos_printer_config';

export const DEFAULT_PRINTER_CONFIG = {
  connectionType: 'BLUETOOTH', // 'BLUETOOTH' | 'USB_SERIAL' | 'BROWSER_FALLBACK'
  paperWidth: '58MM',          // '58MM' | '80MM'
  columns: 32,                 // 32 (58mm) atau 48 (80mm)
  autoKickDrawer: true,        // Kirim pulse buka laci kasir saat transaksi tunai lunas
  autoCutPaper: false,         // Potong kertas otomatis (hanya printer 80mm)
  deviceId: null,
  deviceName: null,
};

/**
 * Membaca konfigurasi printer yang tersimpan atau mengembalikan konfigurasi default
 * @returns {Object}
 */
export function getPrinterConfig() {
  if (typeof window === 'undefined') return DEFAULT_PRINTER_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRINTER);
    if (!raw) return DEFAULT_PRINTER_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PRINTER_CONFIG,
      ...parsed,
      columns: parsed.paperWidth === '80MM' ? 48 : 32,
    };
  } catch {
    return DEFAULT_PRINTER_CONFIG;
  }
}

/**
 * Menyimpan konfigurasi printer hardware ke localStorage
 * @param {Object} nextConfig
 * @returns {Object}
 */
export function savePrinterConfig(nextConfig = {}) {
  if (typeof window === 'undefined') return DEFAULT_PRINTER_CONFIG;
  try {
    const current = getPrinterConfig();
    const merged = {
      ...current,
      ...nextConfig,
    };

    // Sinkronisasi otomatis jumlah kolom berdasarkan lebar kertas
    if (merged.paperWidth === '80MM') {
      merged.columns = 48;
    } else {
      merged.columns = 32;
      merged.autoCutPaper = false; // Sebagian besar printer 58mm tidak memiliki motor autocutter
    }

    localStorage.setItem(STORAGE_KEY_PRINTER, JSON.stringify(merged));
    window.dispatchEvent(new Event('printer_config_changed'));
    return merged;
  } catch (err) {
    console.error('[savePrinterConfig error]', err);
    return DEFAULT_PRINTER_CONFIG;
  }
}
