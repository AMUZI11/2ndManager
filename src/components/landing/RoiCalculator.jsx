"use client";
import React, { useState } from 'react';
import { Calculator, TrendingDown, Clock, ArrowRight, AlertTriangle } from 'lucide-react';

export default function RoiCalculator() {
  const [dailyTx, setDailyTx] = useState(75);
  const [avgTicket, setAvgTicket] = useState(120000);

  // Calculations
  const monthlyVolume = dailyTx * 30;
  const monthlyOmzet = monthlyVolume * avgTicket;
  
  // Estimated 5% revenue lost from unpaid customer debts and lost paper notes
  const lostRevenue = Math.round(monthlyOmzet * 0.05);
  
  // Estimated hours spent manually tracking debts
  const hoursSaved = Math.round((dailyTx * 30 * 15) / 3600);

  // ROI multiplier against Plus plan (Rp 225.000/mo)
  const plusPlanCost = 225000;
  const roiMultiplier = Math.max(1, Math.round(lostRevenue / plusPlanCost));

  return (
    <section id="roi" className="py-24 bg-[#2C120A] border-t border-[#4E271B] relative overflow-hidden text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="text-center w-full max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-black text-amber-200 uppercase tracking-widest px-3 py-1 bg-[#C97B1A]/20 border border-[#C97B1A]/40 rounded-xl">
            Kalkulator Kerugian Piutang Macet
          </span>
          <h2 className="w-full text-3xl sm:text-5xl font-black text-white tracking-tight font-heading">
            Cegah Kebocoran Pendapatan dari <br />
            <span className="text-[#C97B1A] underline decoration-[#C97B1A]/40 underline-offset-4">
              Bon Tercecer &amp; Lupa Tagih
            </span>
          </h2>
          <p className="w-full text-amber-100/80 text-sm sm:text-base">
            Hitung estimasi omzet yang menguap setiap bulan karena pencatatan piutang pelanggan yang tidak rapi.
          </p>
        </div>

        <div className="max-w-4xl mx-auto bg-[#3D1A0F] border border-[#4E271B] rounded-3xl p-6 md:p-10 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            
            {/* SLIDERS INPUT */}
            <div className="space-y-6">
              
              {/* Slider 1: Transaksi Per Hari */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-bold">
                  <label className="text-amber-100">Pelanggan Kasbon per Hari</label>
                  <span className="text-[#C97B1A] font-mono text-base font-extrabold">{dailyTx} Orang</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="200"
                  step="5"
                  value={dailyTx}
                  onChange={(e) => setDailyTx(Number(e.target.value))}
                  className="w-full h-2.5 bg-[#2C120A] rounded-lg appearance-none cursor-pointer accent-[#C97B1A]"
                />
                <div className="flex justify-between text-[10px] text-amber-100/50 font-semibold">
                  <span>5 Orang</span>
                  <span>100 Orang</span>
                  <span>200+ Orang</span>
                </div>
              </div>

              {/* Slider 2: Rata-Rata Bon */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-bold">
                  <label className="text-amber-100">Rata-Rata Nilai Bon Kasbon (Rp)</label>
                  <span className="text-[#C97B1A] font-mono text-base font-extrabold">
                    Rp {avgTicket.toLocaleString('id-ID')}
                  </span>
                </div>
                <input
                  type="range"
                  min="20000"
                  max="1000000"
                  step="10000"
                  value={avgTicket}
                  onChange={(e) => setAvgTicket(Number(e.target.value))}
                  className="w-full h-2.5 bg-[#2C120A] rounded-lg appearance-none cursor-pointer accent-[#C97B1A]"
                />
                <div className="flex justify-between text-[10px] text-amber-100/50 font-semibold">
                  <span>Rp 20.000</span>
                  <span>Rp 500.000</span>
                  <span>Rp 1.000.000</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#2C120A] border border-[#4E271B] text-xs text-amber-100/70 space-y-1">
                <div className="text-white font-bold flex items-center gap-1.5">
                  <Calculator size={14} className="text-[#C97B1A]" />
                  Estimasi Total Omzet Kasbon:
                </div>
                <div className="text-lg font-black text-white font-mono">
                  Rp {monthlyOmzet.toLocaleString('id-ID')} / bulan
                </div>
              </div>

            </div>

            {/* RESULTS BOX */}
            <div className="bg-[#2C120A] border border-rose-900/40 p-6 md:p-8 rounded-2xl space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <AlertTriangle size={80} className="text-rose-500" />
              </div>
              <div className="relative z-10">
                <span className="text-xs text-rose-300 font-bold uppercase tracking-wider block mb-1">
                  Potensi Kehilangan Piutang Macet (5%)
                </span>
                <div className="text-3xl md:text-4xl font-black text-rose-500 font-mono">
                  - Rp {lostRevenue.toLocaleString('id-ID')}
                  <span className="text-xs font-normal text-amber-100/70 block mt-1">/ bulan menguap karena lupa tagih</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#4E271B] relative z-10">
                <div>
                  <span className="text-[11px] text-amber-100/70 font-bold flex items-center gap-1 mb-1">
                    <Clock size={12} className="text-amber-300" /> Waktu Terbuang
                  </span>
                  <div className="text-xl font-extrabold text-white font-mono">{hoursSaved} Jam</div>
                  <span className="text-[10px] text-amber-100/50">Hitung manual/bulan</span>
                </div>

                <div>
                  <span className="text-[11px] text-amber-100/70 font-bold flex items-center gap-1 mb-1">
                    <TrendingDown size={12} className="text-[#C97B1A]" /> ROI 2ndManager
                  </span>
                  <div className="text-xl font-extrabold text-[#C97B1A] font-mono">{roiMultiplier}x Lipat</div>
                  <span className="text-[10px] text-amber-100/50">Return dari Paket Plus</span>
                </div>
              </div>

              <a
                href="#harga"
                className="relative w-full py-3.5 rounded-xl bg-[#C97B1A] hover:bg-[#b06a14] active:scale-[0.97] text-white font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#C97B1A]/20 z-10"
              >
                <span>Cegah Kerugian Ini Sekarang</span>
                <ArrowRight size={16} />
              </a>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
