"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { VaultGlass } from '@/components/ui/VaultGlass';
import { VaultButton } from '@/components/ui/VaultButton';
import { useLocale } from '@/providers/LocaleProvider';

export function LeakCalculator() {
  const { t } = useLocale();
  const [revenue, setRevenue] = useState(2000000);
  const [leaks, setLeaks] = useState(0);

  // Simple formula: Assuming 3% leak on average without a system
  useEffect(() => {
    const dailyLeak = revenue * 0.03;
    const yearlyLeak = dailyLeak * 365;
    setLeaks(yearlyLeak);
  }, [revenue]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <section id="kalkulator" className="py-24 md:py-32 px-4 sm:px-6 relative">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <VaultGlass tier={1} className="p-8 md:p-12 relative overflow-visible">
            {/* Control Panel Aesthetics */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-vault-gold/50 rounded-b-md shadow-vault-glow"></div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              
              {/* Left: Controls */}
              <div className="flex flex-col gap-8">
                <div>
                  <h2 className="text-3xl md:text-4xl font-heading font-bold text-vault-cream mb-4">
                    {t('calculator.title')}
                  </h2>
                  <p className="text-vault-cream/70">
                    Geser tuas di bawah ini untuk melihat estimasi uang Anda yang menguap setiap tahunnya tanpa sistem kasir yang aman.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <label className="text-sm uppercase tracking-widest text-vault-gold font-bold">
                      {t('calculator.daily_revenue')}
                    </label>
                    <span className="text-2xl font-mono text-vault-cream font-bold">
                      {formatCurrency(revenue)}
                    </span>
                  </div>
                  
                  {/* Custom Range Slider feeling like a mechanical dial */}
                  <div className="relative h-6 flex items-center">
                    <div className="absolute w-full h-3 bg-vault-midnight rounded-full border border-vault-coffee shadow-inner"></div>
                    <input 
                      type="range" 
                      min="500000" 
                      max="20000000" 
                      step="500000"
                      value={revenue}
                      onChange={(e) => setRevenue(Number(e.target.value))}
                      className="absolute w-full h-full opacity-0 cursor-pointer z-20"
                    />
                    {/* Visual Track Fill */}
                    <div 
                      className="absolute h-3 bg-gradient-to-r from-vault-coffee to-vault-gold rounded-full pointer-events-none"
                      style={{ width: `${((revenue - 500000) / (20000000 - 500000)) * 100}%` }}
                    ></div>
                    {/* Visual Thumb (Mechanical feeling) */}
                    <motion.div 
                      className="absolute h-8 w-8 bg-vault-cream rounded-full border-4 border-vault-coffee shadow-vault-btn pointer-events-none z-10 flex items-center justify-center"
                      style={{ left: `calc(${((revenue - 500000) / (20000000 - 500000)) * 100}% - 16px)` }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <div className="w-2 h-2 bg-vault-gold rounded-full"></div>
                    </motion.div>
                  </div>
                  <div className="flex justify-between text-xs text-vault-cream/40 font-mono">
                    <span>Rp 500rb</span>
                    <span>Rp 20jt+</span>
                  </div>
                </div>
              </div>

              {/* Right: Output Screen */}
              <div className="bg-vault-midnight p-8 rounded-xl border border-vault-coffee shadow-inner relative overflow-hidden">
                <div className="absolute inset-0 film-grain opacity-20 mix-blend-overlay pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col gap-6">
                  <div>
                    <p className="text-sm uppercase tracking-widest text-vault-brick-light font-bold mb-2">
                      {t('calculator.lost_profit')}
                    </p>
                    <motion.div 
                      key={leaks}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className="text-4xl md:text-5xl font-mono text-vault-brick-light font-bold drop-shadow-[0_0_15px_rgba(179,54,34,0.5)]"
                    >
                      {formatCurrency(leaks)}
                    </motion.div>
                  </div>
                  
                  <div className="w-full h-px bg-vault-coffee"></div>
                  
                  <div>
                    <p className="text-sm uppercase tracking-widest text-vault-gold font-bold mb-2">
                      {t('calculator.roi')}
                    </p>
                    <div className="text-xl font-mono text-vault-cream font-bold">
                      +{formatCurrency(leaks * 0.9)} <span className="text-sm text-vault-cream/50">(dengan Klola OS)</span>
                    </div>
                  </div>

                  <VaultButton className="mt-4 w-full">
                    {t('calculator.cta')}
                  </VaultButton>
                </div>
              </div>

            </div>
          </VaultGlass>
        </motion.div>
      </div>
    </section>
  );
}
