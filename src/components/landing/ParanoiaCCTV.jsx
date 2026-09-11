"use client";
import React from 'react';

export default function ParanoiaCCTV() {
  return (
    <section id="cctv-section" className="py-24 bg-kw-bg border-y border-kw-border font-mono relative overflow-hidden">
      {/* Background glow for CCTV */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#9B2C2C]/10 blur-[120px] pointer-events-none rounded-full"></div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col md:flex-row items-center gap-12">
          
          <div className="w-full md:w-1/2 space-y-6">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-kw-accent leading-[1.1] uppercase drop-shadow-sm">
              MEREKA PIKIR ANDA TIDAK TAHU.
            </h2>
            <p className="text-kw-text text-lg leading-relaxed">
              Setiap laci ditarik, setiap rokok diambil tanpa nota, setiap "kasbon" yang mendadak hilang. Mesin kasir ini tidak pernah berkedip.
            </p>
            <div className="bg-[#8C2818] text-kw-text px-6 py-4 font-bold text-lg uppercase border border-kw-border shadow-[4px_4px_0px_0px_#C5A059] inline-flex items-center gap-3 mt-4">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
              ALARM KEBOCORAN AKTIF
            </div>
          </div>

          <div className="w-full md:w-1/2">
            {/* NEOBRUTALIST TERMINAL IN VIP THEME */}
            <div className="bg-kw-bg border-[3px] border-kw-border shadow-[8px_8px_0px_0px_#8C2818] relative rounded-lg overflow-hidden">
              {/* Terminal Header */}
              <div className="bg-kw-card border-b-[3px] border-kw-border px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-bold text-kw-accent uppercase tracking-widest">
                  KLOLA_AUDIT_LOG.EXE
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-none border border-[#1A0F0A] animate-pulse"></div>
                  <span className="text-xs font-bold text-red-500 uppercase">REC</span>
                </div>
              </div>

              {/* Terminal Content */}
              <div className="p-6 text-sm md:text-base leading-loose space-y-3 h-[300px] overflow-hidden relative text-kw-text">
                <p className="text-kw-text">[14:03:12] SYSTEM: Laci Terbuka.</p>
                <p className="text-kw-accent font-bold bg-[#8C2818]/20 border-l-[3px] border-kw-border pl-3 -ml-3">
                  [14:04:05] WARNING: Transaksi Dihapus: Rokok Surya (Kasir: Anton).
                </p>
                <p className="text-kw-text">[15:20:00] SYSTEM: Laci Terbuka.</p>
                <p className="text-red-400 font-bold bg-red-900/20 border-l-[3px] border-red-500 pl-3 -ml-3">
                  [15:20:15] CRITICAL: Selisih uang tunai terdeteksi (Rp 45.000).
                </p>
                <p className="text-kw-text mt-4 flex items-center gap-2">
                  <span className="text-kw-accent">C:\ADMIN&gt;</span> <span className="w-2 h-4 bg-kw-accent animate-pulse inline-block"></span>
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
