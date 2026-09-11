// src/utils/terminalConfig.js
// Pengelolaan Identitas Terminal Meja Kasir (Multi-Register Isolation)

const STORAGE_KEY = 'hl_pos_register_id';
const DEFAULT_REGISTER = 'REGISTER_MAIN';

export function getRegisterId() {
  if (typeof window === 'undefined') return DEFAULT_REGISTER;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved || typeof saved !== 'string' || !saved.trim()) {
      return DEFAULT_REGISTER;
    }
    return saved.trim().toUpperCase();
  } catch {
    return DEFAULT_REGISTER;
  }
}

export function setRegisterId(newId) {
  if (typeof window === 'undefined') return DEFAULT_REGISTER;
  try {
    if (!newId || typeof newId !== 'string') {
      localStorage.setItem(STORAGE_KEY, DEFAULT_REGISTER);
      return DEFAULT_REGISTER;
    }

    // Bersihkan karakter selain alphanumeric dan underscore/dash
    const clean = newId
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '')
      .slice(0, 30);

    const finalId = clean || DEFAULT_REGISTER;
    localStorage.setItem(STORAGE_KEY, finalId);

    // Dispatch event agar UI POS sinkron seketika
    window.dispatchEvent(new CustomEvent('hl-register-changed', { detail: { registerId: finalId } }));
    return finalId;
  } catch {
    return DEFAULT_REGISTER;
  }
}
