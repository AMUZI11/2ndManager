"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

export default function FomoPaywallCard({ userPlan }) {
  const router = useRouter();

  if (userPlan === 'EKSEKUTIF' || userPlan === 'PRO') return null;

  return (
    <div className="bg-white/70 backdrop-blur-xl border-2 border-slate-800 p-6 sm:p-7 shadow-[5px_5px_0px_#1E293B] rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden group">
      {/* Background Ambient Reflection */}
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-orange-500/10 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-purple-500/10 blur-[80px] pointer-events-none" />

      <div className="flex items-start gap-4 relative z-10">
        <div className="p-3.5 bg-slate-900 text-[#CCFF00] border-2 border-slate-800 rounded-2xl shadow-[3px_3px_0px_#1E293B] shrink-0 group-hover:scale-105 transition-transform">
          <Lock size={24} className="text-[#CCFF00]" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider bg-slate-900 text-[#CCFF00] px-2.5 py-0.5 rounded-md border border-slate-900">
              RADAR KASIR &amp; MULTI-CABANG
            </span>
            <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
              TERKUNCI
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 font-display uppercase tracking-tight">
            Aktifkan Radar Audit &amp; Analitik 24 Jam
          </h3>
          <p className="text-xs font-sans text-slate-600 max-w-lg leading-relaxed">
            Pantau jam sibuk, pergerakan kasbon pelanggan, dan kunci harga modal HPP dengan Kontrak Eksekutif.
          </p>
        </div>
      </div>
      <button
        onClick={() => router.push('/billing')}
        className="btn-arcade relative z-10 shrink-0 bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 text-xs font-mono font-extrabold uppercase px-6 py-3.5 rounded-xl transition-all shadow-[3px_3px_0px_#1E293B] flex items-center gap-2 cursor-pointer border-2 border-slate-800"
      >
        <Sparkles size={15} /> BUKA KONTRAK EKSEKUTIF <ArrowRight size={14} />
      </button>
    </div>
  );
}

