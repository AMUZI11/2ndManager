"use client";
import React from 'react';
import { motion } from 'framer-motion';

export function HeroSection() {
  const scrollToCalculator = () => {
    document.getElementById('kalkulator')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden px-4 sm:px-6 py-20">
      <div className="absolute left-0 top-0 bottom-0 w-8 md:w-16 bg-vault-oxblood/40 border-r border-vault-coffee shadow-2xl z-10 hidden sm:block mix-blend-multiply opacity-50" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E")' }}></div>
      <div className="absolute right-0 top-0 bottom-0 w-8 md:w-16 bg-vault-oxblood/40 border-l border-vault-coffee shadow-2xl z-10 hidden sm:block mix-blend-multiply opacity-50" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E")' }}></div>

      <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
        <div className="w-[80vw] h-[120vh] border-[40px] border-vault-coffee rounded-t-[100px] border-b-0 absolute top-[10%]"></div>
      </div>

      <div className="relative z-20 text-center max-w-4xl mx-auto flex flex-col items-center">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-4xl md:text-5xl lg:text-7xl font-heading font-bold text-vault-gold mb-6 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] leading-tight"
        >
          Berapa Juta Keuntungan Anda Menguap Hari Ini?
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="text-lg md:text-2xl text-vault-cream mb-12 max-w-2xl font-light"
        >
          Kami tahu, Bapak/Ibu tidak pernah benar-benar libur memikirkan warung ini. Saatnya mengunci rapat kebocoran yang tak terlihat.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="relative inline-block"
        >
          <div className="absolute -inset-4 bg-vault-gold/30 blur-2xl rounded-full animate-pulse" style={{ animationDuration: '4s' }}></div>
          <div className="absolute -inset-1 bg-vault-gold/40 blur-xl rounded-full animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }}></div>
          
          <button onClick={scrollToCalculator} className="relative z-10 bg-vault-gold text-vault-midnight px-8 py-5 rounded-sm font-heading font-bold text-xl md:text-2xl tracking-wide shadow-vault-btn border-2 border-vault-gold/80 hover:bg-[#d4af37]/90 hover:scale-[1.02] transition-transform duration-300">
            Lihat Kebocoran Saya
          </button>
        </motion.div>
      </div>
    </section>
  );
}
