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
      <div className="pointer-events-auto max-w-5xl mx-auto bg-white text-slate-900 rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_#1e293b] p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-sans">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center font-bold shrink-0 border-2 border-slate-800 shadow-[2px_2px_0px_#1e293b] mt-0.5">
            <ShieldCheck size={22} strokeWidth={2.5} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black uppercase tracking-wider text-slate-900">
                Persetujuan Privasi &amp; Kuki
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-400 font-black">
                UU PDP No. 27/2022
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed max-w-2xl font-medium">
              2ndManager memanfaatkan kuki esensial &amp; IndexedDB lokal untuk menjamin operasional kasir offline-first yang andal dan aman. Kami tidak memperjualbelikan data keuangan warung ke pihak ketiga. Baca rincian hak privasi Anda di{' '}
              <Link
                href="/privacy"
                className="underline decoration-amber-500 underline-offset-2 font-bold text-slate-900 hover:text-amber-600"
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
            className="flex-1 md:flex-none px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-800 shadow-[2px_2px_0px_#1e293b] font-mono text-xs font-bold transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <X size={14} strokeWidth={2.5} />
            <span>Hanya Esensial</span>
          </button>
          <button
            type="button"
            onClick={() => handleChoice('accepted')}
            className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-900 border-2 border-slate-800 shadow-[2px_2px_0px_#1e293b] font-mono text-xs font-black uppercase transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check size={14} strokeWidth={2.5} />
            <span>[ SAYA SETUJU ]</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
