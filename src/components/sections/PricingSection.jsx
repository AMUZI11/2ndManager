"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/Button';

export const PricingSection = () => {
  return (
    <section className="relative py-32 bg-vault-midnight z-20">
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <motion.div 
          className="text-center mb-24"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
        >
          <h2 className="font-heading font-bold text-5xl md:text-6xl text-vault-cream mb-8">
            Investasi Sekali, <br className="hidden md:block" />
            <span className="text-vault-gold drop-shadow-[0_0_10px_rgba(197,160,89,0.5)]">Aman Selamanya</span>
          </h2>
          <p className="text-2xl text-vault-cream/80 max-w-3xl mx-auto leading-relaxed font-medium">
            Berapa harga ketenangan pikiran Anda? Lebih murah dari gaji satu kasir selama sebulan.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          
          {/* Basic Tier */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.8, delay: 0.1, type: "spring", bounce: 0.4 }}
            className="bg-vault-midnight/80 border border-vault-cream/10 rounded-2xl p-10 flex flex-col justify-between"
          >
            <div>
              <h3 className="text-3xl font-bold text-vault-cream mb-4">Klola Starter</h3>
              <p className="text-vault-cream/70 text-lg mb-8">Untuk warung pemula yang ingin mulai tertib.</p>
              <div className="text-4xl font-bold text-vault-cream mb-8">Rp 499.000<span className="text-xl text-vault-cream/50 font-normal">/tahun</span></div>
              <ul className="space-y-4 mb-10">
                {['Mesin Kasir Standar', 'Pencatatan Stok Dasar', 'Laporan Bulanan PDF'].map((item, i) => (
                  <li key={i} className="flex items-center text-vault-cream/80 text-lg">
                    <span className="text-vault-gold mr-3">✔</span> {item}
                  </li>
                ))}
              </ul>
            </div>
            <Button variant="secondary" className="w-full">Pilih Starter</Button>
          </motion.div>

          {/* Pro Tier (Hormozi Expansion) */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.8, delay: 0.2, type: "spring", bounce: 0.4 }}
            className="relative bg-vault-oxblood/80 backdrop-blur-3xl backdrop-brightness-125 border-t-2 border-l-2 border-vault-gold/60 border-r border-b border-vault-coffee rounded-2xl p-10 shadow-[inset_0_1px_5px_rgba(197,160,89,0.7),_0_40px_80px_rgba(0,0,0,0.9)] flex flex-col justify-between"
          >
            {/* The Pro Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-vault-gold blur-[100px] opacity-40 mix-blend-color-dodge -z-10 pointer-events-none rounded-full" />
            
            <div className="absolute top-0 right-8 -translate-y-1/2 bg-vault-gold text-vault-midnight font-bold px-6 py-2 rounded-full uppercase tracking-widest text-sm shadow-[0_5px_15px_rgba(197,160,89,0.6)]">
              Rekomendasi
            </div>

            <div>
              <h3 className="text-3xl font-bold text-vault-gold mb-4 drop-shadow-md">Klola Fortress</h3>
              <p className="text-vault-cream/90 text-lg mb-8 font-medium">Pengamanan total aset dan margin. Tidak ada celah.</p>
              <div className="text-5xl font-bold text-vault-cream mb-8 drop-shadow-lg">Rp 1.299.000<span className="text-xl text-vault-cream/50 font-normal">/tahun</span></div>
              <ul className="space-y-4 mb-10">
                {[
                  'Semua Fitur Starter', 
                  'Buku Piutang Baja (Anti Lupa)', 
                  'Margin Guard (Blokir Jual Rugi)', 
                  'Detektor Stok Presisi Real-time',
                  'VIP Concierge Setup & Migrasi'
                ].map((item, i) => (
                  <li key={i} className="flex items-start text-vault-cream font-medium text-lg">
                    <span className="text-vault-gold mr-3 mt-1 shadow-sm font-bold">✔</span> 
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Button variant="primary" className="w-full text-lg shadow-[0_0_20px_rgba(197,160,89,0.4)]">Amankan Bisnis Saya</Button>
          </motion.div>

        </div>
      </div>
    </section>
  );
};
