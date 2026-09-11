// src/utils/barcodeScannerListener.js
// Hardware Barcode Scanner (HID) Global Listener & Burst Detection Engine
// Mendeteksi ketikan burst berkecepatan tinggi (<45ms) dari barcode scanner fisik (USB/Bluetooth)

/**
 * Memasang global keydown listener untuk mendeteksi scan barcode fisik.
 * 
 * @param {Function} onBarcodeScanned Callback saat barcode berhasil di-scan
 * @param {Object} options Opsi konfigurasi
 * @param {Function} [options.isModalOpen] Callback untuk mengecek apakah modal sensitif (misal: PIN Owner) sedang terbuka
 * @param {number} [options.maxInterval=45] Batas waktu ms antar-keystroke untuk dianggap sebagai scanner
 * @param {number} [options.minLength=8] Panjang minimum karakter barcode valid (EAN-8, UPC, EAN-13, dsb)
 * @returns {Function} Fungsi cleanup untuk mencopot event listener
 */
export function attachBarcodeScannerListener(onBarcodeScanned, options = {}) {
  const {
    isModalOpen = () => false,
    maxInterval = 45,
    minLength = 8,
  } = options;

  let buffer = [];
  let lastTimestamp = 0;
  let inputSnapshot = null;
  let activeElementAtBurstStart = null;

  function handleKeyDown(e) {
    // Abaikan tombol modifier
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) {
      return;
    }

    const now = performance.now();
    const interval = now - lastTimestamp;
    lastTimestamp = now;

    // Jika modal sensitif sedang terbuka, bersihkan buffer dan jangan intercept
    if (typeof isModalOpen === 'function' && isModalOpen()) {
      buffer = [];
      inputSnapshot = null;
      activeElementAtBurstStart = null;
      return;
    }

    // Tombol penutup scanner adalah 'Enter'
    if (e.key === 'Enter') {
      if (buffer.length >= minLength && interval < 80) {
        e.preventDefault();
        e.stopPropagation();

        const scannedCode = buffer.join('');

        // Revert input jika ada karakter yang sempat terketik masuk ke form aktif
        if (
          inputSnapshot !== null &&
          activeElementAtBurstStart &&
          typeof activeElementAtBurstStart.value === 'string'
        ) {
          activeElementAtBurstStart.value = inputSnapshot;
          // Trigger React internal tracker agar state form tersinkronisasi
          try {
            const tracker = activeElementAtBurstStart._valueTracker;
            if (tracker) tracker.setValue(inputSnapshot);
            activeElementAtBurstStart.dispatchEvent(new Event('input', { bubbles: true }));
          } catch {
            // Fail-safe
          }
        }

        // Panggil callback
        if (typeof onBarcodeScanned === 'function') {
          onBarcodeScanned(scannedCode);
        }
      }

      // Reset buffer setelah Enter
      buffer = [];
      inputSnapshot = null;
      activeElementAtBurstStart = null;
      return;
    }

    // Jika karakter tunggal (huruf, angka, simbol)
    if (e.key.length === 1) {
      if (buffer.length === 0) {
        // Karakter pertama dari calon burst
        buffer.push(e.key);
        inputSnapshot = null;
        activeElementAtBurstStart = null;
      } else if (interval < maxInterval) {
        // Karakter ke-2 atau seterusnya yang terdeteksi sebagai burst cepat (<45ms)
        if (buffer.length === 1) {
          // Ambil snapshot nilai input sebelum burst scanner masuk lebih banyak
          const activeEl = document.activeElement;
          if (activeEl && typeof activeEl.value === 'string') {
            activeElementAtBurstStart = activeEl;
            // Snapshot adalah nilai sebelum karakter pertama burst masuk
            const currentVal = activeEl.value;
            // Jika karakter pertama sudah masuk ke input, pangkas karakter terakhir
            if (currentVal.endsWith(buffer[0])) {
              inputSnapshot = currentVal.slice(0, -1);
            } else {
              inputSnapshot = currentVal;
            }
          }
        }
        buffer.push(e.key);
      } else {
        // Interval lambat (>45ms), dianggap ketikan tangan manusia normal
        buffer = [e.key];
        inputSnapshot = null;
        activeElementAtBurstStart = null;
      }
    }
  }

  window.addEventListener('keydown', handleKeyDown, true);

  return () => {
    window.removeEventListener('keydown', handleKeyDown, true);
    buffer = [];
    inputSnapshot = null;
    activeElementAtBurstStart = null;
  };
}

export default attachBarcodeScannerListener;
