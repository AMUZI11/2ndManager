"use client";
import React, { useState } from 'react';
import { Calculator, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function CitizenCalculator() {
  const [kasbon, setKasbon] = useState(500000);
  const [selisih, setSelisih] = useState(20000);

  const kebocoranBulan = kasbon + (selisih * 30);
  const kebocoranTahun = kebocoranBulan * 12;

  return (
    <section id="kalkulator" className="py-24 bg-klola-bg border-y border-klola-border">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-klola-surface rounded-2xl border border-klola-border mb-6 shadow-sm shadow-[#3C2415]/5">
            <Calculator className="w-6 h-6 text-klola-brand" />
          </div>
          <h2 className="text-3xl md:text-5xl font-sans font-extrabold tracking-tighter text-klola-text-main mb-4">
            Hitung Kerugian Tak Terlihat Anda
          </h2>
          <p className="text-klola-text-muted max-w-2xl mx-auto text-lg">
            Angka kecil yang dibiarkan setiap hari akan menggerogoti profit warung Anda secara masif dalam setahun.
          </p>
        </div>

        <div className="bg-klola-surface border border-klola-border rounded-3xl p-6 md:p-10 flex flex-col md:flex-row gap-10 shadow-sm shadow-[#3C2415]/5">
          
          {/* Controls */}
          <div className="w-full md:w-1/2 space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <label className="text-sm font-semibold text-klola-text-main tracking-tight">Rata-rata Kasbon Macet / Bulan</label>
                <span className="text-lg font-bold text-klola-brand font-mono">Rp {kasbon.toLocaleString('id-ID')}</span>
              </div>
              <input 
                type="range" 
                min="0" max="5000000" step="50000"
                value={kasbon}
                onChange={(e) => setKasbon(Number(e.target.value))}
                className="w-full h-2 bg-klola-border rounded-lg appearance-none cursor-pointer accent-klola-brand"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <label className="text-sm font-semibold text-klola-text-main tracking-tight">Selisih Hitung Laci / Hari</label>
                <span className="text-lg font-bold text-klola-brand font-mono">Rp {selisih.toLocaleString('id-ID')}</span>
              </div>
              <input 
                type="range" 
                min="0" max="500000" step="5000"
                value={selisih}
                onChange={(e) => setSelisih(Number(e.target.value))}
                className="w-full h-2 bg-klola-border rounded-lg appearance-none cursor-pointer accent-klola-brand"
              />
            </div>
          </div>

          {/* Results */}
          <div className="w-full md:w-1/2 bg-klola-bg border border-klola-border rounded-2xl p-6 flex flex-col justify-center">
            <h3 className="text-klola-text-muted text-sm font-bold uppercase tracking-widest mb-2">Potensi Kebocoran 1 Tahun</h3>
            <div className="text-4xl md:text-5xl font-black text-rose-600 font-mono mb-6 tracking-tighter">
              Rp {kebocoranTahun.toLocaleString('id-ID')}
            </div>
            
            <Link 
              href="/login?mode=signup" 
              className="group w-full flex items-center justify-center gap-2 px-6 py-4 bg-klola-brand text-white font-semibold rounded-xl shadow-md shadow-klola-brand/10 hover:bg-klola-brand-hover hover:scale-105 transition-all"
            >
              Hentikan Kebocoran Ini
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}
