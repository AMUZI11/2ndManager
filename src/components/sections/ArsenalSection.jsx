"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';

const ARSENAL_FEATURES = [
  {
    title: "Mesin Kasir Anti-Bocor",
    desc: "Kasir pintar yang otomatis menghitung komisi dan menolak penjualan di bawah harga modal. Lindungi margin Anda dari kelalaian karyawan.",
    mockupId: "pos",
    mockupColor: "bg-vault-brick-dark"
  },
  {
    title: "Buku Piutang Baja",
    desc: "Sistem pencatatan kasbon yang mengikat. Setiap pinjaman tercatat permanen di cloud, menjaga hubungan baik tanpa mengorbankan cashflow.",
    mockupId: "debt",
    mockupColor: "bg-vault-gold"
  },
  {
    title: "Detektor Stok Presisi",
    desc: "Lacak pergerakan setiap batang rokok dan renteng kopi. Notifikasi otomatis saat stok menipis atau terdapat selisih mencurigakan di akhir shift.",
    mockupId: "inventory",
    mockupColor: "bg-vault-midnight"
  }
];

export const ArsenalSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  // Reusable abstract UI component to ensure identical rendering on mobile/desktop
  const AbstractMockup = ({ feature }) => (
    <div className="w-full h-full bg-vault-oxblood/80 backdrop-blur-3xl backdrop-brightness-125 border-t border-l border-vault-gold/50 border-r border-b border-vault-midnight shadow-[inset_0_1px_2px_rgba(197,160,89,0.5),_0_30px_60px_rgba(0,0,0,0.9)] rounded-2xl p-6 md:p-8 flex flex-col justify-between">
      <div className="flex justify-between items-center mb-6 md:mb-8 border-b border-vault-gold/20 pb-4">
        <div className="flex space-x-3">
          <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-vault-brick-light shadow-[0_0_8px_rgba(179,54,34,0.8)]" />
          <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-vault-gold shadow-[0_0_8px_rgba(197,160,89,0.8)]" />
          <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-vault-cream/50" />
        </div>
        <div className="text-vault-gold font-bold text-xs md:text-sm tracking-widest uppercase">
          Module: {feature.mockupId}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4 md:gap-6">
        <div className={`w-full h-24 md:h-40 rounded-xl ${feature.mockupColor} opacity-80 border-2 border-vault-gold/30 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] relative overflow-hidden`}>
           <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent" />
        </div>
        <div className="flex gap-4 md:gap-6 h-full min-h-[80px]">
          <div className="w-1/3 rounded-xl bg-vault-midnight border border-vault-cream/10 shadow-inner" />
          <div className="w-2/3 rounded-xl bg-vault-midnight border border-vault-cream/10 shadow-inner flex flex-col gap-2 md:gap-3 p-3 md:p-4">
             <div className="w-full h-2 md:h-3 bg-vault-cream/20 rounded-full" />
             <div className="w-3/4 h-2 md:h-3 bg-vault-cream/10 rounded-full" />
             <div className="w-1/2 h-2 md:h-3 bg-vault-cream/5 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <section className="relative bg-[radial-gradient(circle_at_bottom_right,_#3D140D_0%,_#2A0A06_100%)] z-20 py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="text-center mb-20 md:mb-32">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            className="font-heading font-bold text-5xl md:text-6xl text-vault-cream mb-8 drop-shadow-md"
          >
            Senjata Utama Pengaman Aset
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            className="text-2xl text-vault-cream/80 max-w-3xl mx-auto leading-relaxed"
          >
            Ini bukan sekadar fitur. Ini adalah protokol keamanan tingkat tinggi 
            untuk memastikan tidak ada satupun rupiah yang lolos dari pengawasan Anda.
          </motion.p>
        </div>

        {/* MOBILE LAYOUT (Stacked, no sticky logic) */}
        <div className="block md:hidden space-y-24 relative z-30">
          {ARSENAL_FEATURES.map((feature, idx) => (
            <div key={idx} className="flex flex-col gap-8">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
              >
                <h3 className="font-heading font-bold text-4xl text-vault-gold mb-4 drop-shadow-[0_0_10px_rgba(197,160,89,0.5)]">{feature.title}</h3>
                <p className="text-xl text-vault-cream/90 leading-relaxed font-medium">
                  {feature.desc}
                </p>
              </motion.div>
              <motion.div 
                className="w-full h-[350px]"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.1 }}
              >
                <AbstractMockup feature={feature} />
              </motion.div>
            </div>
          ))}
        </div>

        {/* DESKTOP LAYOUT (Sticky Scroll Spy) */}
        <div className="hidden md:flex flex-row gap-16 relative items-start">
          
          {/* Left Column: Scrolling Text blocks */}
          <div className="w-1/2 flex flex-col pb-[50vh] relative z-20">
            {ARSENAL_FEATURES.map((feature, idx) => (
              <motion.div 
                key={idx}
                className={`transition-all duration-700 py-[20vh] ${activeIndex === idx ? 'opacity-100 scale-100' : 'opacity-30 scale-95'}`}
                onViewportEnter={() => setActiveIndex(idx)}
                viewport={{ amount: 0.4, margin: "-10% 0px -10% 0px" }}
              >
                <h3 className="font-heading font-bold text-5xl text-vault-gold mb-6 drop-shadow-[0_0_10px_rgba(197,160,89,0.5)]">{feature.title}</h3>
                <p className="text-2xl text-vault-cream/90 leading-relaxed font-medium">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Right Column: Sticky UI Mockups */}
          <div className="w-1/2 sticky top-32 h-[600px] z-10">
            <div className="relative w-full h-full">
              {/* Massive Aurora backing the sticky section */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-vault-gold blur-[150px] opacity-30 mix-blend-color-dodge rounded-full pointer-events-none" />
              
              {/* Use absolute positioning and opacity for robust SSR instead of AnimatePresence */}
              {ARSENAL_FEATURES.map((feature, idx) => (
                <div 
                  key={idx}
                  className="absolute inset-0 transition-all duration-700 ease-in-out"
                  style={{
                    opacity: activeIndex === idx ? 1 : 0,
                    transform: `scale(${activeIndex === idx ? 1 : 0.95}) translateY(${activeIndex === idx ? 0 : 20}px)`,
                    pointerEvents: activeIndex === idx ? 'auto' : 'none',
                    zIndex: activeIndex === idx ? 20 : 10
                  }}
                >
                  <AbstractMockup feature={feature} />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
