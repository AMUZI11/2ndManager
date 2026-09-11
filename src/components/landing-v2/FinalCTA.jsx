"use client";
import React from 'react';
import { VaultButton } from '@/components/ui/VaultButton';

export function FinalCTA() {
  const scrollToCalculator = () => {
    document.getElementById('kalkulator')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="py-32 px-4 sm:px-6 relative text-center border-t border-vault-coffee">
      <div className="absolute inset-0 bg-vault-oxblood opacity-20 pointer-events-none"></div>
      <div className="relative z-10 max-w-3xl mx-auto">
        <h2 className="text-4xl md:text-6xl font-heading font-extrabold text-vault-cream mb-8 leading-tight">
          Tutup Kebocoran Warung Anda <span className="text-vault-brick-light">Hari Ini Juga.</span>
        </h2>
        <p className="text-xl text-vault-cream/70 mb-12 max-w-2xl mx-auto">
          Jangan tunggu sampai uang Anda menguap lebih banyak lagi. Biarkan kami yang membangun sistem keamanan operasional Anda.
        </p>
        <div className="flex justify-center">
          <VaultButton className="scale-110" onClick={scrollToCalculator}>
            Kunci Kebocoran Sekarang
          </VaultButton>
        </div>
      </div>
    </section>
  );
}
