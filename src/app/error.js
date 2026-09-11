"use client";

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // Tangkap error secara internal tanpa memicu log publik bocor
  }, [error]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 bg-[#F8FAFC]">
      <div className="max-w-lg w-full bg-white border-3 border-[#0B0F17] rounded-2xl p-6 md:p-10 shadow-[8px_8px_0px_#0B0F17] text-center space-y-6">
        {/* Badge Error */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#0B0F17]">
          <AlertTriangle size={16} />
          <span>SISTEM TERHAMBAT • REFRESH DIPERLUKAN</span>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="font-display font-black text-2xl md:text-3xl text-[#0B0F17] uppercase tracking-tight">
            Terjadi Gangguan pada Rak Sistem
          </h1>
          <p className="text-sm text-slate-600 font-sans leading-relaxed">
            Tenang juragan, data kasir dan saldo warung Anda aman di penyimpanan lokal. Segarkan halaman untuk memuat ulang modul yang sempat terhenti.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono font-black text-xs border-2 border-[#0B0F17] shadow-[3px_3px_0px_#0B0F17] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw size={15} />
            <span>🔄 Coba Muat Ulang Halaman</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-mono font-bold text-xs border-2 border-[#0B0F17] shadow-[3px_3px_0px_#0B0F17] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home size={15} />
            <span>Ke Beranda</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
