// src/utils/soundAlerts.js
// Web Audio API sound synthesizers for Owner Security Radar Alerts
// No external MP3/WAV assets needed; zero bandwidth and zero loading delay.

let audioContext = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioContext = new AudioContextClass();
    }
  }
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

// Unlock audio context on first user interaction if needed
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('click', unlockAudio, { once: true, passive: true });
  window.addEventListener('keydown', unlockAudio, { once: true, passive: true });
}

/**
 * Play synthesizer alert based on severity
 * @param {'CRITICAL' | 'WARNING' | 'INFO'} severity
 */
export function playSecurityChime(severity = 'CRITICAL') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (severity === 'CRITICAL') {
      // Urgent double siren sweep (440Hz -> 880Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(440, now);
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.18);
      osc1.frequency.setValueAtTime(440, now + 0.22);
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.4);

      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.setValueAtTime(0.01, now + 0.19);
      gain1.gain.setValueAtTime(0.2, now + 0.22);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.46);
    } else if (severity === 'WARNING') {
      // Two-tone warning chime (587Hz -> 784Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(783.99, now + 0.15); // G5

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.36);
    } else {
      // Soft ping for INFO / Telemetry
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now); // E5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.21);
    }
  } catch (err) {
    console.warn('[soundAlerts] Audio synthesis failed:', err);
  }
}
