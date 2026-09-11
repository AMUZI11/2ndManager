/**
 * src/utils/branchDeviceGuard.js
 * Pengikatan Permanen Terminal Kasir POS ke Cabang Tertentu (Device-Level Binding Guard)
 * Mengunci terminal kasir agar tidak menampilkan atau menjual inventaris milik cabang lain.
 */

const STORAGE_BRANCH_KEY = 'hl_pos_device_branch_id';
const STORAGE_REGISTER_NAME_KEY = 'hl_pos_device_register_name';
const DEFAULT_REGISTER_NAME = 'POS-01';

/**
 * Mengambil ID Cabang yang terikat pada perangkat browser ini.
 * @returns {string|null} UUID Cabang atau null jika belum diikat.
 */
export function getAssignedBranchId() {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(STORAGE_BRANCH_KEY);
    if (!saved || typeof saved !== 'string' || !saved.trim()) {
      return null;
    }
    return saved.trim();
  } catch {
    return null;
  }
}

/**
 * Mengambil label nama terminal kasir.
 * @returns {string} Nama terminal kasir
 */
export function getAssignedRegisterName() {
  if (typeof window === 'undefined') return DEFAULT_REGISTER_NAME;
  try {
    const saved = localStorage.getItem(STORAGE_REGISTER_NAME_KEY);
    if (!saved || typeof saved !== 'string' || !saved.trim()) {
      return DEFAULT_REGISTER_NAME;
    }
    return saved.trim().toUpperCase();
  } catch {
    return DEFAULT_REGISTER_NAME;
  }
}

/**
 * Memeriksa apakah perangkat sudah terikat secara sah ke cabang.
 * @returns {boolean}
 */
export function isDeviceBound() {
  return Boolean(getAssignedBranchId());
}

/**
 * Mengikat perangkat kasir ke cabang tertentu.
 * @param {Object} params
 * @param {string} params.branchId - UUID Cabang
 * @param {string} params.registerName - Nama register (misal: "KASIR-01")
 * @returns {boolean} Status keberhasilan
 */
export function bindDeviceToBranch({ branchId, registerName }) {
  if (typeof window === 'undefined') return false;
  if (!branchId || typeof branchId !== 'string') {
    throw new Error('ID Cabang wajib diisi untuk mengikat perangkat.');
  }

  try {
    const cleanBranchId = branchId.trim();
    const cleanRegName = (registerName && String(registerName).trim().toUpperCase()) || DEFAULT_REGISTER_NAME;

    localStorage.setItem(STORAGE_BRANCH_KEY, cleanBranchId);
    localStorage.setItem(STORAGE_REGISTER_NAME_KEY, cleanRegName);

    // Siarkan event perubahan binding perangkat
    window.dispatchEvent(new CustomEvent('hl-device-branch-changed', {
      detail: { branchId: cleanBranchId, registerName: cleanRegName }
    }));

    return true;
  } catch (err) {
    console.error('[branchDeviceGuard] Gagal mengikat perangkat:', err);
    return false;
  }
}

/**
 * Melepas pengikatan perangkat (Unbind) setelah verifikasi PIN Owner.
 * @returns {boolean} Status keberhasilan
 */
export function unbindDeviceFromBranch() {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.removeItem(STORAGE_BRANCH_KEY);
    localStorage.removeItem(STORAGE_REGISTER_NAME_KEY);

    window.dispatchEvent(new CustomEvent('hl-device-branch-changed', {
      detail: { branchId: null, registerName: null }
    }));

    return true;
  } catch (err) {
    console.error('[branchDeviceGuard] Gagal melepas pengikatan perangkat:', err);
    return false;
  }
}
