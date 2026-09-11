"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { useLocale } from '@/providers/LocaleProvider';
import { VaultButton } from '@/components/ui/VaultButton';
import { AuroraEmber } from '@/components/ui/AuroraEmber';
import { VaultGlass } from '@/components/ui/VaultGlass';

export function HeroVaultReveal() {
  const { t } = useLocale();

  const scrollToCalculator = () => {
    document.getElementById('kalkulator')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-[95vh] flex flex-col items-center justify-center overflow-hidden px-4 sm:px-6 py-32">
      {/* The Reveal Light (Aurora Ember) */}
      <AuroraEmber color="gold" size="lg" className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      
      {/* Texture: global film-grain is already present in layout, so we don't need a heavy one here, 
          but we can add a subtle vignette or edge darkening to emphasize the light */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_20%,_#140503_100%)] pointer-events-none z-0"></div>

      <div className="relative z-20 text-center max-w-4xl mx-auto flex flex-col items-center">
        {/* H1 Manifesto */}
        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} // Mechanical spring-like ease
          className="text-4xl md:text-5xl lg:text-7xl font-heading font-extrabold text-vault-cream mb-8 drop-shadow-lg leading-[1.1] tracking-tight"
        >
          {t('hero.title')}
        </motion.h1>
        
        {/* Subtitle */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="text-lg md:text-xl text-vault-cream/90 mb-12 max-w-2xl font-sans leading-relaxed"
        >
          {t('hero.subtitle')}
        </motion.p>

        {/* The Heavy Lever CTA */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <VaultButton onClick={scrollToCalculator} className="mb-16">
            {t('hero.cta')}
          </VaultButton>
        </motion.div>

        {/* The Treasure Artifact (Breathing widget) */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm"
        >
          <motion.div
            animate={{ y: [-5, 5, -5] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <VaultGlass tier={1} className="p-6 text-center">
              <p className="text-sm text-vault-cream/80 font-bold mb-2 uppercase tracking-widest">Total Kebocoran Terselamatkan</p>
              <p className="text-3xl font-mono tabular-nums text-vault-gold font-bold">
                Rp 12.450.000<span className="text-lg opacity-50">,00</span>
              </p>
            </VaultGlass>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
