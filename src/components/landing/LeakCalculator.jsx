"use client";
import React, { useState } from 'react';
import { Minus, Plus } from 'lucide-react';

export function LeakCalculator() {
  const [kasbon, setKasbon] = useState(1500000);
  const [selisih, setSelisih] = useState(500000);

  const totalKerugianSetahun = (kasbon + selisih) * 12;

  const formatRp = (num) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
  };

  return (
    <div id="kalkulator" className="bg-vault-midnight border border-vault-gold/30 p-6 md:p-8 rounded-sm shadow-2xl relative overflow-hidden mt-16 max-w-3xl mx-auto scroll-mt-24">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-vault-coffee via-vault-gold to-vault-coffee opacity-80"></div>
      
      <h3 className="text-2xl md:text-3xl font-heading font-bold text-vault-gold mb-8 text-center">Kalkulator Kebocoran Brankas</h3>
      
      <div className="space-y-10">
        <div>
          <label className="block text-vault-cream mb-3 font-medium text-lg">Estimasi Kasbon Macet Per Bulan</label>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setKasbon(Math.max(0, kasbon - 100000))}
              className="w-12 h-12 md:w-14 md:h-14 flex-shrink-0 flex items-center justify-center bg-vault-oxblood border border-vault-gold/50 text-vault-gold rounded-sm active:scale-95 transition-transform"
              aria-label="Kurangi kasbon"
            >
              <Minus size={28} />
            </button>
            <div className="flex-grow text-center font-mono text-2xl md:text-3xl text-vault-cream bg-[#0a0a0a] py-3 border-b border-vault-coffee">
              {formatRp(kasbon)}
            </div>
            <button 
              onClick={() => setKasbon(kasbon + 100000)}
              className="w-12 h-12 md:w-14 md:h-14 flex-shrink-0 flex items-center justify-center bg-vault-oxblood border border-vault-gold/50 text-vault-gold rounded-sm active:scale-95 transition-transform"
              aria-label="Tambah kasbon"
            >
              <Plus size={28} />
            </button>
          </div>
          <input 
            type="range" 
            min="0" max="10000000" step="100000"
            value={kasbon}
            onChange={(e) => setKasbon(Number(e.target.value))}
            className="w-full mt-6 h-2 bg-vault-coffee rounded-lg appearance-none cursor-pointer accent-vault-gold"
          />
        </div>

        <div>
          <label className="block text-vault-cream mb-3 font-medium text-lg">Estimasi Selisih Stok Per Bulan</label>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelisih(Math.max(0, selisih - 50000))}
              className="w-12 h-12 md:w-14 md:h-14 flex-shrink-0 flex items-center justify-center bg-vault-oxblood border border-vault-gold/50 text-vault-gold rounded-sm active:scale-95 transition-transform"
              aria-label="Kurangi selisih stok"
            >
              <Minus size={28} />
            </button>
            <div className="flex-grow text-center font-mono text-2xl md:text-3xl text-vault-cream bg-[#0a0a0a] py-3 border-b border-vault-coffee">
              {formatRp(selisih)}
            </div>
            <button 
              onClick={() => setSelisih(selisih + 50000)}
              className="w-12 h-12 md:w-14 md:h-14 flex-shrink-0 flex items-center justify-center bg-vault-oxblood border border-vault-gold/50 text-vault-gold rounded-sm active:scale-95 transition-transform"
              aria-label="Tambah selisih stok"
            >
              <Plus size={28} />
            </button>
          </div>
          <input 
            type="range" 
            min="0" max="5000000" step="50000"
            value={selisih}
            onChange={(e) => setSelisih(Number(e.target.value))}
            className="w-full mt-6 h-2 bg-vault-coffee rounded-lg appearance-none cursor-pointer accent-vault-gold"
          />
        </div>
      </div>

      <div className="mt-12 p-8 border-t border-vault-gold/20 flex flex-col items-center">
        <p className="text-vault-cream/80 text-sm md:text-base mb-2 uppercase tracking-widest text-center">Potensi Keuntungan Menguap (1 Tahun)</p>
        <div className="text-4xl md:text-6xl font-heading font-bold text-vault-brick-light drop-shadow-lg tabular-nums mt-2">
          {formatRp(totalKerugianSetahun)}
        </div>
        <p className="mt-6 text-vault-cream/70 text-center max-w-lg text-sm md:text-base leading-relaxed">
          Angka ini bukan sekadar statistik. Ini adalah nilai kerja keras Bapak/Ibu yang seharusnya bisa ditabung atau diputar kembali.
        </p>
      </div>
    </div>
  );
}
