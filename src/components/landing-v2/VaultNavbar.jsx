"use client";
import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useLocale } from '@/providers/LocaleProvider';
import { VaultButton } from '@/components/ui/VaultButton';
import { VaultGlass } from '@/components/ui/VaultGlass';

export function VaultNavbar() {
  const { locale, toggleLocale, t } = useLocale();
  const { scrollY } = useScroll();
  
  // Make the navbar pill slightly more opaque when scrolling
  const opacity = useTransform(scrollY, [0, 100], [0, 1]);

  const scrollToCalculator = () => {
    document.getElementById('kalkulator')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="fixed top-6 left-0 right-0 z-50 px-4 sm:px-6 pointer-events-none">
      <div className="max-w-4xl mx-auto w-full flex justify-center pointer-events-auto">
        <VaultGlass tier={3} className="rounded-full px-4 py-3 flex items-center justify-between w-full shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
          
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="text-vault-cream font-heading font-bold text-xl tracking-wide ml-2">
              KLOLA<span className="text-vault-gold">.</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Language Toggle */}
            <button 
              onClick={toggleLocale}
              className="text-vault-cream/80 hover:text-vault-gold text-sm font-bold tracking-widest uppercase transition-colors"
            >
              {locale === 'id' ? 'ID' : 'EN'}
            </button>

            {/* CTA Button */}
            <VaultButton 
              onClick={scrollToCalculator} 
              className="px-6 py-2 text-sm rounded-full border-b-[4px]"
            >
              {t('nav.cta')}
            </VaultButton>
          </div>

        </VaultGlass>
      </div>
    </div>
  );
}
