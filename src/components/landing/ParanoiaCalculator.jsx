"use client";
import React, { useState } from 'react';
import { AlertTriangle, TrendingDown, DollarSign } from 'lucide-react';

export default function ParanoiaCalculator() {
  const [kasbonCount, setKasbonCount] = useState(25); // default 25 customers

  // Estimation: Average lost debt per uncollected customer = Rp 270,000 / month
  const totalLoss = kasbonCount * 270000;

  const formatRupiah = (num) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num);
  };

  // Dynamic intensity based on slider position (0 to 1)
  const intensity = (kasbonCount - 5) / 95;

  return (
    <section className="py-24 bg-[#F6F3EA] text-[#1C1009] relative overflow-hidden border-t border-[#E8DCC8]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* SECTION HEADER */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100 border border-rose-300 text-rose-800 text-xs font-extrabold uppercase tracking-wider">
            <AlertTriangle size={14} className="text-rose-600 animate-pulse" />
            <span>Kalkulator Kerugian Warung</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black font-heading text-[#3D1A0F] tracking-tight">
            Berapa Uang Anda yang <br />
            <span className="text-[#E11D48] underline decoration-rose-300 underline-offset-4">
              Menguap Bulan Ini?
            </span>
          </h2>
          <p className="text-base text-[#6B4F3A] font-medium max-w-xl mx-auto">
            Geser jumlah pelanggan yang sering kasbon di warung Anda untuk menghitung estimasi dana tercecer yang tidak pernah tertagih.
          </p>
        </div>

        {/* CALCULATOR CARD */}
        <div 
          className="bg-white border-4 border-[#3D1A0F] rounded-[2.5rem] p-6 sm:p-10 shadow-2xl transition-colors duration-300"
          style={{
            backgroundColor: intensity > 0.5 ? `rgba(254, 242, 242, ${intensity * 0.8})` : '#FFFFFF'
          }}
        >
          {/* SLIDER CONTROL */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8DCC8] pb-4">
              <label className="text-lg font-extrabold text-[#3D1A0F] font-heading flex items-center gap-2">
                <span>Jumlah Pelanggan Kasbon Toko:</span>
              </label>
              <span className="text-2xl font-black text-[#C97B1A] bg-[#3D1A0F] px-4 py-1.5 rounded-xl font-heading text-white">
                {kasbonCount} Pelanggan
              </span>
            </div>

            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={kasbonCount}
              onChange={(e) => setKasbonCount(Number(e.target.value))}
              className="w-full h-4 bg-[#E8DCC8] rounded-lg appearance-none cursor-pointer accent-[#E11D48]"
            />

            <div className="flex justify-between text-xs font-bold text-[#6B4F3A]">
              <span>5 Pelanggan</span>
              <span>50 Pelanggan</span>
              <span>100 Pelanggan</span>
            </div>
          </div>

          {/* DYNAMIC LOSS RESULT BOX */}
          <div className="mt-8 p-6 sm:p-8 rounded-2xl bg-[#3D1A0F] border-2 border-[#E11D48] text-white text-center space-y-3 relative overflow-hidden shadow-xl">
            <div className="absolute right-4 top-4 opacity-10 pointer-events-none">
              <TrendingDown size={140} className="text-[#E11D48]" />
            </div>

            <span className="inline-block text-xs font-black uppercase tracking-widest text-rose-300 bg-rose-950/80 px-3 py-1 rounded-full border border-rose-500/30">
              ⚠️ Peringatan Risiko Keuangan
            </span>

            <p className="text-[#E11D48] text-2xl sm:text-4xl md:text-5xl font-black font-heading tracking-tight animate-pulse transition-all">
              🔥 Anda berpotensi RUGI {formatRupiah(totalLoss)} / bulan
            </p>

            <p className="text-amber-100/90 text-sm font-medium max-w-lg mx-auto">
              Akibat bon kertas terselip, lupa menagih, dan kasbon menggantung tanpa limit batas kredit yang terkunci otomatis.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}
