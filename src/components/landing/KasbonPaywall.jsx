"use client";
import React from 'react';
import { Lock, FileText, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function KasbonPaywall() {
  const dummyDebtors = [
    { name: "Pak Budi (Mandor)", amount: "Rp 450.000" },
    { name: "Mas Tono (Gojek)", amount: "Rp 125.000" },
    { name: "Bu Rini (Sayur)", amount: "Rp 850.000" },
    { name: "Andi (Kost)", amount: "Rp 55.000" },
    { name: "Pak Haji Somad", amount: "Rp 1.200.000" },
    { name: "Siti (Warung Sebelah)", amount: "Rp 320.000" },
    { name: "Tukang Parkir", amount: "Rp 15.000" },
    { name: "Supir Truk", amount: "Rp 180.000" }
  ];

  return (
    <section className="relative py-32 md:py-48 bg-transparent overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Large Container */}
        <div className="relative overflow-hidden bg-kw-bg border border-kw-border p-8 md:p-20 rounded-[3rem] shadow-[0_20px_50px_rgba(26,15,10,0.8)]">
          
          {/* Background Fake Debt List (Blurred) */}
          <div className="absolute inset-0 p-8 flex flex-wrap gap-6 opacity-20 select-none pointer-events-none filter blur-[3px]">
            {dummyDebtors.map((debtor, index) => (
              <div key={index} className="bg-kw-card p-4 rounded-xl border border-kw-border w-64 h-24 flex flex-col justify-center">
                <div className="text-kw-text font-bold text-lg">{debtor.name}</div>
                <div className="text-kw-accent font-mono mt-1">{debtor.amount}</div>
              </div>
            ))}
            {/* Duplicate for visual fill */}
            {dummyDebtors.map((debtor, index) => (
              <div key={`dup-${index}`} className="bg-kw-card p-4 rounded-xl border border-kw-border w-64 h-24 flex flex-col justify-center">
                <div className="text-kw-text font-bold text-lg">{debtor.name}</div>
                <div className="text-kw-accent font-mono mt-1">{debtor.amount}</div>
              </div>
            ))}
          </div>

          {/* Foreground Glassmorphism Card */}
          <div className="relative z-10 backdrop-blur-2xl bg-[#8C2818]/30 border border-kw-border shadow-[0_10px_40px_rgba(26,15,10,0.9)] rounded-[2rem] p-10 md:p-14 text-center w-full max-w-2xl mx-auto flex flex-col items-center">
            
            <div className="mb-6 bg-kw-bg p-5 rounded-full shadow-inner border border-kw-border">
              <Lock className="w-16 h-16 text-kw-accent" />
            </div>
            
            <h2 className="text-3xl md:text-5xl font-extrabold text-kw-accent tracking-tight mb-6 leading-tight drop-shadow-md">
              Fitur <span className="text-kw-text">"Buku Kasbon"</span> Terkunci.
            </h2>
            
            <p className="text-kw-text text-lg md:text-xl font-medium mb-10 leading-relaxed">
              Tahukah Anda rata-rata warung kehilangan <strong className="text-kw-accent">Rp 1.500.000 per bulan</strong> hanya karena catatan kasbon yang hilang atau lupa ditagih?
            </p>

            <Link href="/login?mode=signup" className="group relative inline-flex items-center justify-center gap-3 px-8 py-5 rounded-full bg-gradient-to-b from-[#D4AF37] to-[#AA7C11] text-kw-bg font-extrabold text-lg md:text-xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(197,160,89,0.5)] border-b-[4px] border-[#7A5505]">
              <FileText className="w-6 h-6" />
              Amankan Rp 1.5 Juta Pertama Saya
            </Link>
            
            <div className="mt-8 flex items-center justify-center gap-2 text-sm font-bold text-kw-accent">
              <AlertCircle className="w-4 h-4" />
              <span>Buka kunci hari ini untuk menghentikan kebocoran profit.</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
