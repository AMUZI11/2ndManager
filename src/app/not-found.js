import React from 'react';
import Link from 'next/link';
import { AlertOctagon, Store, Home, LayoutDashboard } from 'lucide-react';

export const metadata = {
  title: 'Halaman Tidak Ditemukan (404) | 2ndManager',
  description: 'Rak atau halaman yang Anda cari tidak ditemukan pada sistem kasir warung 2ndManager.',
};

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 bg-[#F8FAFC]">
      <div className="max-w-lg w-full bg-white border-3 border-[#0B0F17] rounded-2xl p-6 md:p-10 shadow-[8px_8px_0px_#0B0F17] text-center space-y-6">
        {/* Badge 404 */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-red-600 text-white font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#0B0F17]">
          <AlertOctagon size={16} />
          <span>ERROR 404 • RAK KOSONG</span>
        </div>

        {/* Heading & Warung Flavor Text */}
        <div className="space-y-2">
          <h1 className="font-display font-black text-2xl md:text-4xl text-[#0B0F17] uppercase tracking-tight">
            BARANG TIDAK DITEMUKAN!
          </h1>
          <p className="text-sm md:text-base text-slate-600 font-sans leading-relaxed">
            Halaman atau rak yang Anda cari tidak ada, sudah habis, atau sudah dipindahkan juragan ke etalase lain.
          </p>
        </div>

        {/* Visual Box Illustration */}
        <div className="p-4 bg-slate-100 border-2 border-dashed border-slate-400 rounded-xl font-mono text-xs text-slate-500">
          [ KODE STATUS: 404_PAGE_NOT_FOUND // SYSTEM_ROUTE_MISSING ]
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2 flex-wrap">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-[#CCFF00] font-mono font-bold text-xs border-2 border-[#0B0F17] shadow-[3px_3px_0px_#0B0F17] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LayoutDashboard size={15} />
            <span>Dashboard Pemilik</span>
          </Link>

          <Link
            href="/pos"
            className="w-full sm:w-auto px-4 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono font-black text-xs border-2 border-[#0B0F17] shadow-[3px_3px_0px_#0B0F17] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Store size={15} />
            <span>Meja Kasir POS</span>
          </Link>

          <Link
            href="/"
            className="w-full sm:w-auto px-4 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-mono font-bold text-xs border-2 border-[#0B0F17] shadow-[3px_3px_0px_#0B0F17] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home size={15} />
            <span>Beranda</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
