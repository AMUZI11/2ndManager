"use client";
import React, { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ShieldCheck, Check, X } from 'lucide-react';

const STORAGE_KEY = 'hl_cookie_consent';

function subscribe(callback) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener('cookie_consent_change', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('cookie_consent_change', callback);
  };
}

function getSnapshot() {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'pending';
  } catch {
    return 'dismissed';
  }
}

function getServerSnapshot() {
  return 'ssr';
}

export default function CookieConsentBar() {
  const consentState = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const handleChoice = (val) => {
    try {
      localStorage.setItem(STORAGE_KEY, val);
      window.dispatchEvent(new Event('cookie_consent_change'));
    } catch {
      // Ignore write errors
    }
  };

  // Do not render during SSR or if user already decided
  if (consentState === 'ssr' || consentState === 'accepted' || consentState === 'essential' || consentState === 'dismissed') {
    return null;
  }

  return (
    <aside
      role="region"
      aria-label="Persetujuan Privasi dan Kuki UU PDP"
      className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-5 pointer-events-none animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="pointer-events-auto max-w-5xl mx-auto bg-[#0B0F17] text-white border-3 border-amber-400 rounded-2xl shadow-[6px_6px_0px_#0B0F17] p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-sans">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center font-bold shrink-0 border-2 border-slate-900 shadow-[2px_2px_0px_#CCFF00] mt-0.5">
            <ShieldCheck size={22} strokeWidth={2.5} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black uppercase tracking-wider text-amber-400">
                Persetujuan Privasi &amp; Kuki
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-bold">
                UU PDP No. 27/2022
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl font-normal">
              2ndManager memanfaatkan kuki esensial &amp; IndexedDB lokal untuk menjamin operasional kasir offline-first yang andal dan aman. Kami tidak memperjualbelikan data keuangan warung ke pihak ketiga. Baca rincian hak privasi Anda di{' '}
              <Link
                href="/privacy"
                className="underline decoration-amber-400 underline-offset-2 font-bold text-amber-400 hover:text-amber-300"
              >
                Kebijakan Privasi
              </Link>
              .
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 pt-2 md:pt-0">
          <button
            type="button"
            onClick={() => handleChoice('essential')}
            className="flex-1 md:flex-none px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border-2 border-slate-600 font-mono text-xs font-bold transition-all active:translate-y-0.5 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <X size={14} strokeWidth={2.5} />
            <span>Hanya Esensial</span>
          </button>
          <button
            type="button"
            onClick={() => handleChoice('accepted')}
            className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 border-2 border-slate-900 shadow-[2px_2px_0px_#0B0F17] font-mono text-xs font-black uppercase transition-all active:translate-y-0.5 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check size={14} strokeWidth={2.5} />
            <span>Terima Semua</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
