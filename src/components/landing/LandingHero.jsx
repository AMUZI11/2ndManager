"use client";
import React from 'react';

export default function LandingHero() {
  const handleScrollToCCTV = () => {
    document.getElementById('cctv-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-[90dvh] flex flex-col items-center justify-center bg-transparent overflow-hidden px-4">
      
      {/* AMBIENT GLOW (Pendaran Emas & Terracotta) */}
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-[#9B2C2C]/15 rounded-full blur-[100px] -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-kw-accent/20 rounded-full blur-[150px] -z-10" />

      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center text-center gap-12">
        {/* HEADLINE H1 - SERIF TREATMENT */}
        <h1 className="w-full text-5xl md:text-7xl font-serif text-kw-accent leading-tight tracking-tight max-w-4xl mx-auto drop-shadow-sm">
          Berapa banyak uang yang <span className="italic text-[#9B2C2C] font-serif">menguap</span> dari laci warung Anda bulan ini?
        </h1>

        {/* SOLID GOLD BUTTON */}
        <button 
          onClick={handleScrollToCCTV}
          className="relative inline-flex items-center justify-center px-12 py-5 text-xl font-extrabold tracking-wide text-kw-bg uppercase bg-gradient-to-b from-[#D4AF37] to-[#AA7C11] rounded-xl border-b-[6px] border-[#7A5505] shadow-[0_10px_30px_rgba(197,160,89,0.3)] transition-all hover:-translate-y-1 hover:border-b-[8px] active:translate-y-2 active:border-b-[2px] overflow-hidden group"
        >
          <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
          Cek Kebocoran
        </button>
      </div>
    </section>
  );
}
