"use client";
import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { VaultGlass } from '@/components/ui/VaultGlass';
import { StempelBadge } from '@/components/ui/StempelBadge';

const testimonials = [
  {
    quote: "Dulu tiap bulan pasti ada selisih uang rokok dan sembako. Sejak pakai Klola, ketahuan karyawan shift malam sering 'lupa' catat. Sekarang omzet naik 15% tanpa nambah jualan.",
    name: "Ko Afat",
    role: "Pemilik Toko Kelontong, Jakarta Barat",
    metric: "Omzet Naik 15%"
  },
  {
    quote: "Saya gaptek, awalnya ragu. Tapi tim Klola datang langsung ke warung, ajarin sampai saya lancar. Sekarang mantau hutang pelanggan tinggal buka HP sambil ngopi.",
    name: "Ibu Ningsih",
    role: "Warung Sembako Makmur",
    metric: "Piutang Tertagih 100%"
  },
  {
    quote: "Fitur peringatan stoknya gila. Saya nggak pernah lagi nolak pembeli karena rokok favorit mereka habis. Otomatis ketahuan barang mana yang muternya cepat.",
    name: "Pak Budi",
    role: "Distributor Minuman",
    metric: "Zero Stock-out"
  }
];

export function SocialProofCarousel() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });
  
  // Subtle parallax effect on the background
  const y = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);

  return (
    <section ref={containerRef} className="py-24 md:py-32 relative overflow-hidden">
      
      {/* Background with slight parallax */}
      <motion.div 
        className="absolute inset-0 z-0 bg-vault-oxblood/20"
        style={{ y }}
      />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        
        <div className="flex flex-col md:flex-row gap-6 items-end justify-between mb-16">
          <div className="max-w-2xl">
            <StempelBadge text="TERBUKTI" className="mb-6" />
            <h2 className="text-3xl md:text-5xl font-heading font-bold text-vault-cream leading-tight">
              Mereka Sudah Mengunci Kebocoran. <span className="text-vault-gold">Anda Kapan?</span>
            </h2>
          </div>
        </div>

        {/* Horizontal Scroll Snap Container */}
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-12 hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {testimonials.map((testi, idx) => (
            <div key={idx} className="snap-center shrink-0 w-[85vw] sm:w-[400px]">
              <VaultGlass tier={2} className="h-full p-8 flex flex-col justify-between hover:-translate-y-2 transition-transform duration-500">
                <div>
                  <div className="text-vault-gold mb-6 opacity-50">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14.017 21L16.41 14.5916C17.742 10.3541 19.346 7.42398 22 5.16124L20.596 3C17.265 5.56475 14.86 9.38048 13.882 14.281L10 14.281L14.017 21ZM5.01697 21L7.41097 14.5916C8.74297 10.3541 10.346 7.42398 13 5.16124L11.596 3C8.26497 5.56475 5.86097 9.38048 4.88197 14.281L1 14.281L5.01697 21Z" />
                    </svg>
                  </div>
                  <p className="text-lg text-vault-cream/90 leading-relaxed font-sans mb-8">
                    "{testi.quote}"
                  </p>
                </div>
                
                <div className="pt-6 border-t border-vault-coffee/50 flex justify-between items-end">
                  <div>
                    <p className="font-heading font-bold text-vault-cream">{testi.name}</p>
                    <p className="text-sm text-vault-cream/50">{testi.role}</p>
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wider text-vault-gold bg-vault-gold/10 px-3 py-1 rounded">
                    {testi.metric}
                  </div>
                </div>
              </VaultGlass>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
