// src/utils/sirenAudio.js
// Generator Audio Sirine Alarm Retro Web Audio API (Zero External WAV/MP3 Asset)

let activeAudioCtx = null;
let activeOscillators = [];

const SIREN_MUTED_KEY = 'hl_security_siren_muted';

/**
 * Cek apakah sirine dinonaktifkan oleh pengguna
 */
export function isSirenMuted() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SIREN_MUTED_KEY) === 'true';
}

/**
 * Atur preferensi mute/unmute sirine
 */
export function setSirenMuted(muted) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SIREN_MUTED_KEY, muted ? 'true' : 'false');
  if (muted) {
    stopSecuritySiren();
  }
}

/**
 * Putar suara sirine peringatan anomali darurat:
 * Menggunakan sawtooth oscillator dengan modulasi frekuensi 800Hz -> 400Hz -> 800Hz
 * @param {Object} options
 * @param {number} options.cycles - Jumlah gelombang sirine (default: 2)
 * @param {number} options.volume - Level kekuatan suara (0.0 - 1.0, default: 0.25)
 */
export function playSecuritySiren({ cycles = 2, volume = 0.25 } = {}) {
  if (typeof window === 'undefined') return;
  if (isSirenMuted()) return;

  try {
    // Hentikan sirine aktif sebelumnya jika ada
    stopSecuritySiren();

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!activeAudioCtx || activeAudioCtx.state === 'closed') {
      activeAudioCtx = new AudioContextClass();
    }

    if (activeAudioCtx.state === 'suspended') {
      activeAudioCtx.resume().catch(() => {});
    }

    const ctx = activeAudioCtx;
    const cycleDuration = 0.55; // detik per ayunan sirine
    const totalDuration = cycleDuration * cycles;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // Sawtooth waveform untuk nada arcade tajam & menusuk
    osc.type = 'sawtooth';

    const now = ctx.currentTime;

    // Sapuan frekuensi 800Hz -> 420Hz -> 800Hz berulang sebanyak 'cycles'
    for (let i = 0; i < cycles; i++) {
      const cycleStart = now + i * cycleDuration;
      const cycleMid = cycleStart + cycleDuration / 2;
      const cycleEnd = cycleStart + cycleDuration;

      osc.frequency.setValueAtTime(820, cycleStart);
      osc.frequency.exponentialRampToValueAtTime(420, cycleMid);
      osc.frequency.exponentialRampToValueAtTime(820, cycleEnd);
    }

    // Volume Envelope: Fade-in halus di awal, konstan, dan decay di akhir
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.exponentialRampToValueAtTime(Math.min(0.5, volume), now + 0.05);
    gainNode.gain.setValueAtTime(Math.min(0.5, volume), now + totalDuration - 0.08);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + totalDuration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + totalDuration);

    activeOscillators.push(osc);

    osc.onended = () => {
      activeOscillators = activeOscillators.filter((o) => o !== osc);
    };
  } catch (err) {
    console.warn('[playSecuritySiren AudioContext Error]', err);
  }
}

/**
 * Hentikan sirine seketika
 */
export function stopSecuritySiren() {
  try {
    activeOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    });
    activeOscillators = [];

    if (activeAudioCtx && activeAudioCtx.state === 'running') {
      activeAudioCtx.suspend().catch(() => {});
    }
  } catch {}
}
