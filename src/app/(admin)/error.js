"use client";

import React from 'react';
import { AlertOctagon, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AdminError({ error, reset }) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4 font-sans max-w-lg mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-rose-100 border-3 border-slate-800 text-rose-600 flex items-center justify-center shadow-[4px_4px_0px_0px_#1e293b]">
        <AlertOctagon size={32} />
      </div>

      <div className="space-y-1.5">
        <h1 className="font-display font-black text-xl text-slate-900 uppercase tracking-tight">
          Penyimpangan Operasi Command Deck
        </h1>
        <p className="text-xs text-slate-600 font-mono">
          {error?.message || 'Terjadi kesalahan sistem tak terduga pada subsistem admin.'}
        </p>
      </div>

      <div className="flex items-center space-x-3 pt-3">
        <button
          onClick={() => reset()}
          className="px-4 py-2.5 bg-[#CCFF00] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] text-slate-900 font-mono font-black text-xs rounded-xl border-2 border-slate-800 shadow-[3px_3px_0px_0px_#1e293b] flex items-center space-x-2 transition-all cursor-pointer"
        >
          <RefreshCw size={14} />
          <span>COBA PULIHKAN</span>
        </button>

        <Link
          href="/admin"
          className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 font-mono font-bold text-xs rounded-xl border-2 border-slate-800 shadow-[2px_2px_0px_0px_#1e293b] active:translate-x-[1px] active:translate-y-[1px] flex items-center space-x-2 transition-all"
        >
          <ArrowLeft size={14} />
          <span>KEMBALI KE ADMIN</span>
        </Link>
      </div>
    </div>
  );
}
