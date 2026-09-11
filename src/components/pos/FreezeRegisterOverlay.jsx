"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  Lock,
  KeyRound,
  AlertTriangle,
  Radio,
  CheckCircle2,
  Unlock,
} from 'lucide-react';
import { verifyOwnerPinSecurely, checkLocalPinLockout } from '@/utils/authPin';
import { useFocusTrap } from '@/hooks/useFocusTrap';

export default function FreezeRegisterOverlay({
  isFrozen = false,
  registerCode = 'REGISTER_MAIN',
  freezeReason = 'Kunci darurat diaktifkan oleh pemilik warung',
  onUnfreezeSuccess,
}) {
  const [pinInput, setPinInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  const containerRef = useRef(null);

  useFocusTrap(containerRef, isFrozen, {
    onEscape: () => {}, // Dilarang menutup via tombol Escape
    stepDependencies: [isFrozen, lockoutRemaining],
    autoFocusFirst: true,
  });

  // ── 1. DOM ANTI-TAMPER GUARD (TAHAP 5 PATCH #1) ──────────────────────────────
  // Cegah kasir nakal yang mencoba menghapus elemen overlay via inspect element / DevTools
  useEffect(() => {
    if (!isFrozen || typeof window === 'undefined') return;

    const enforceElement = () => {
      const el = document.getElementById('hl-freeze-register-overlay-container');
      if (!el && isFrozen) {
        // Jika elemen dihapus dari DOM, reload halaman seketika agar state server tetap mengunci
        window.location.reload();
      }
    };

    const intervalId = setInterval(enforceElement, 600);

    const observer = new MutationObserver(() => {
      enforceElement();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearInterval(intervalId);
      observer.disconnect();
    };
  }, [isFrozen]);

  // ── 2. BLOKIR SELURUH HOTKEY & SCANNER DI LEVEL WINDOW ─────────────────────
  useEffect(() => {
    if (!isFrozen || typeof window === 'undefined') return;

    const blockAllKeys = (e) => {
      // Izinkan tombol numerik dan backspace untuk input PIN saja
      const isPinTarget = e.target?.id === 'hl-owner-unfreeze-pin-input';
      if (isPinTarget) {
        if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key)) {
          return;
        }
        if (/^\d$/.test(e.key)) {
          return;
        }
      }

      // Blokir F1-F12, Escape, Space, shortcut lainnya
      e.stopPropagation();
      e.preventDefault();
    };

    window.addEventListener('keydown', blockAllKeys, true);
    window.addEventListener('keyup', blockAllKeys, true);
    window.addEventListener('keypress', blockAllKeys, true);

    return () => {
      window.removeEventListener('keydown', blockAllKeys, true);
      window.removeEventListener('keyup', blockAllKeys, true);
      window.removeEventListener('keypress', blockAllKeys, true);
    };
  }, [isFrozen]);

  // ── 3. HITUNG MUNDUR LOCKOUT ANTI-BRUTEFORCE ───────────────────────────────
  useEffect(() => {
    if (!isFrozen) return;

    const interval = setInterval(() => {
      const status = checkLocalPinLockout();
      setLockoutRemaining(status.remainingSeconds || 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [isFrozen]);

  if (!isFrozen) return null;

  const handleVerifyPhysicalPin = async (e) => {
    e?.preventDefault();
    if (lockoutRemaining > 0) return;

    if (!pinInput || pinInput.length !== 6) {
      setErrorMsg('Masukkan 6 angka PIN Owner.');
      return;
    }

    setVerifying(true);
    setErrorMsg('');

    try {
      const res = await verifyOwnerPinSecurely(pinInput);
      setPinInput('');

      if (res.isValid) {
        if (onUnfreezeSuccess) {
          onUnfreezeSuccess();
        }
      } else {
        setErrorMsg(res.error || 'PIN Owner salah.');
      }
    } catch (err) {
      setErrorMsg('Gagal memverifikasi PIN.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div
      id="hl-freeze-register-overlay-container"
      ref={containerRef}
      className="fixed inset-0 z-[99999] bg-[#0B0F17] flex items-center justify-center p-4 font-sans select-none"
      role="dialog"
      aria-modal="true"
    >
      {/* Background Strobe Accent */}
      <div className="absolute inset-0 bg-red-950/20 pointer-events-none" />

      <div className="relative w-full max-w-lg bg-[#0F172A] border-4 border-red-600 rounded-3xl p-6 md:p-8 shadow-[12px_12px_0px_#991B1B] text-center space-y-6">
        {/* Top Warning Strip */}
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-600/20 border border-red-500 rounded-full text-red-400 text-xs font-mono font-bold tracking-widest uppercase">
          <Radio size={14} className="animate-pulse" strokeWidth={2.5} />
          <span>TERMINAL DIBEKUKAN</span>
        </div>

        {/* Big Icon */}
        <div className="w-20 h-20 bg-red-600/10 border-2 border-red-500 rounded-2xl flex items-center justify-center mx-auto text-red-500 shadow-[4px_4px_0px_#7F1D1D]">
          <ShieldAlert size={44} strokeWidth={2.5} />
        </div>

        {/* Titles */}
        <div className="space-y-2">
          <h2 className="font-heading font-black text-2xl md:text-3xl text-white tracking-tight uppercase">
            Sistem Kasir Terkunci
          </h2>
          <p className="text-sm text-red-200/80 font-mono">
            Terminal <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded">{registerCode}</span> dinonaktifkan sementara demi keamanan transaksi.
          </p>
          <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300 font-mono text-left">
            <span className="font-bold text-red-400 block mb-0.5">Alasan Pembekuan:</span>
            {freezeReason || 'Kunci keamanan diaktifkan oleh pemilik warung.'}
          </div>
        </div>

        {/* Unlock Methods: Dual Control */}
        <div className="pt-2 border-t border-slate-800 space-y-4">
          <div className="text-xs text-slate-400 font-mono text-left space-y-1">
            <span className="font-bold text-slate-200 block">Jalur Pembukaan Kunci:</span>
            <p>1. <span className="text-amber-400 font-bold">Remote Unfreeze:</span> Pemilik warung membuka kunci melalui menu Radar di dashboard HP.</p>
            <p>2. <span className="text-emerald-400 font-bold">PIN Fisik di Tempat:</span> Masukkan PIN Owner 6 digit di bawah ini.</p>
          </div>

          {/* Form PIN Unfreeze Fisik */}
          <form onSubmit={handleVerifyPhysicalPin} className="space-y-3 font-mono">
            {lockoutRemaining > 0 ? (
              <div className="p-3 bg-amber-950/40 border border-amber-500 rounded-xl text-xs text-amber-300 flex items-center justify-center gap-2">
                <AlertTriangle size={16} strokeWidth={2.5} />
                <span>Terlalu banyak percobaan. Terkunci: {lockoutRemaining} detik</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <input
                    id="hl-owner-unfreeze-pin-input"
                    type="password"
                    maxLength={6}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ketik 6 Angka PIN Owner"
                    className="w-full h-12 bg-slate-900 border-2 border-slate-700 focus:border-emerald-400 rounded-xl text-center text-lg font-bold tracking-[0.4em] text-white outline-none transition-colors"
                    autoComplete="off"
                    autoFocus
                  />
                  <KeyRound size={18} className="absolute left-3.5 top-3.5 text-slate-500 pointer-events-none" strokeWidth={2.5} />
                </div>

                {errorMsg && (
                  <p className="text-xs text-red-400 font-bold text-left">{errorMsg}</p>
                )}

                <button
                  type="submit"
                  disabled={verifying || pinInput.length !== 6}
                  className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl border-2 border-emerald-400 shadow-[4px_4px_0px_#064E3B] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  {verifying ? (
                    <span>Memverifikasi PIN...</span>
                  ) : (
                    <>
                      <Unlock size={16} strokeWidth={2.5} />
                      <span>Buka Kunci Terminal</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
