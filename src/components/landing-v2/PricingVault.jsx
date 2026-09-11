"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { VaultGlass } from '@/components/ui/VaultGlass';
import { VaultButton } from '@/components/ui/VaultButton';

export function PricingVault() {
  const scrollToCalculator = () => {
    document.getElementById('kalkulator')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="py-24 md:py-32 px-4 sm:px-6 relative max-w-6xl mx-auto border-t border-vault-coffee/50">
      
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-heading font-bold text-vault-cream mb-6">
          Investasi yang <span className="text-vault-gold">Membayar Dirinya Sendiri</span>
        </h2>
        <p className="text-lg text-vault-cream/70 max-w-2xl mx-auto">
          Jangan lihat ini sebagai biaya. Lihat ini sebagai satpam digital yang mengamankan jutaan rupiah uang Anda dari kebocoran setiap bulannya.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-4xl mx-auto">
        
        {/* The Cost of Doing Nothing */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="order-2 md:order-1"
        >
          <div className="p-8 border-2 border-vault-coffee/30 rounded-2xl bg-vault-midnight">
            <h3 className="text-xl font-bold text-vault-cream/50 mb-6 font-heading">Tanpa Klola OS</h3>
            <ul className="space-y-4 mb-8">
              <li className="flex gap-3 text-vault-cream/60">
                <span className="text-vault-brick-light font-bold">✕</span> Kebocoran 3-5% dari omzet setiap bulan
              </li>
              <li className="flex gap-3 text-vault-cream/60">
                <span className="text-vault-brick-light font-bold">✕</span> Piutang tak tertagih karena catatan hilang
              </li>
              <li className="flex gap-3 text-vault-cream/60">
                <span className="text-vault-brick-light font-bold">✕</span> Pusing memantau karyawan saat Anda pergi
              </li>
              <li className="flex gap-3 text-vault-cream/60">
                <span className="text-vault-brick-light font-bold">✕</span> Selisih stok yang misterius
              </li>
            </ul>
            <p className="text-xl font-mono text-vault-brick-light font-bold opacity-80">Rugi Jutaan / Bulan</p>
          </div>
        </motion.div>

        {/* The Vault Plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="order-1 md:order-2 relative z-10"
        >
          {/* Glow Behind */}
          <div className="absolute inset-0 bg-vault-gold/20 blur-[100px] pointer-events-none rounded-full"></div>
          
          <VaultGlass tier={1} className="p-8 md:p-10 border-vault-gold/40 shadow-vault-glow relative">
            <div className="absolute top-0 right-0 bg-vault-gold text-vault-midnight text-xs font-bold px-4 py-1 rounded-bl-lg uppercase tracking-widest">
              Terbaik
            </div>
            
            <h3 className="text-3xl font-heading font-bold text-vault-gold mb-2">Paket Brankas</h3>
            <p className="text-vault-cream/80 mb-6">Sistem keamanan operasional lengkap.</p>
            
            <div className="mb-8">
              <span className="text-5xl font-mono font-bold text-vault-cream">Rp 199k</span>
              <span className="text-vault-cream/50"> / bulan</span>
            </div>
            
            <ul className="space-y-4 mb-10">
              <li className="flex gap-3 text-vault-cream">
                <span className="text-vault-gold font-bold">✓</span> <span className="font-bold">Layanan Concierge (Kami siapkan semua)</span>
              </li>
              <li className="flex gap-3 text-vault-cream/80">
                <span className="text-vault-gold">✓</span> Mesin Kasir Offline-First
              </li>
              <li className="flex gap-3 text-vault-cream/80">
                <span className="text-vault-gold">✓</span> Laporan Keuangan Real-time
              </li>
              <li className="flex gap-3 text-vault-cream/80">
                <span className="text-vault-gold">✓</span> Manajemen Piutang & Tagihan WA
              </li>
            </ul>

            <VaultButton className="w-full" onClick={scrollToCalculator}>
              Amankan Warung Saya
            </VaultButton>
          </VaultGlass>
        </motion.div>

      </div>
    </section>
  );
}
