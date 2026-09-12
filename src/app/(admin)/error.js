"use client";

import React from 'react';
import { AlertOctagon, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AdminError({ error, reset }) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4 font-sans">
      <div className="w-12 h-12 rounded-lg bg-red-950/80 border border-red-800 text-red-400 flex items-center justify-center">
        <AlertOctagon size={24} />
      </div>

      <div className="space-y-1">
        <h2 className="font-heading font-black text-lg text-zinc-100 uppercase tracking-tight">
          Penyimpangan Operasi Command Deck
        </h2>
        <p className="text-xs text-zinc-400 font-mono max-w-md">
          {error?.message || 'Terjadi kesalahan sistem tak terduga pada subsistem admin.'}
        </p>
      </div>

      <div className="flex items-center space-x-3 pt-2">
        <button
          onClick={() => reset()}
          className="h-8 px-4 bg-[#CCFF00] hover:bg-[#b3e600] text-black font-extrabold text-xs rounded border border-black flex items-center space-x-2 transition-colors cursor-pointer"
        >
          <RefreshCw size={13} />
          <span>COBA PULIHKAN</span>
        </button>

        <Link
          href="/admin/dashboard"
          className="h-8 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs rounded border border-zinc-700 flex items-center space-x-2 transition-colors"
        >
          <ArrowLeft size={13} />
          <span>KEMBALI KE PULSE</span>
        </Link>
      </div>
    </div>
  );
}
