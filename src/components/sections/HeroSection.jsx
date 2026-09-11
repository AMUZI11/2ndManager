"use client";
import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Button } from '../ui/Button';

export const HeroSection = () => {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 150]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-vault-midnight pt-24 pb-32">
      {/* Deep Radial Background Glow - Fixed to be more visible at the center */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#3D140D_0%,_#140503_100%)] pointer-events-none" />
      
      {/* Central Aurora Ember - Opacity boosted and mix-blend applied */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-vault-gold blur-[150px] opacity-40 mix-blend-color-dodge -z-10 pointer-events-none rounded-full" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Aggressive H1 */}
        <motion.h1 
          className="font-heading font-bold text-5xl md:text-7xl leading-tight text-vault-cream tracking-tight mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
        >
          Berapa Juta Keuntungan Anda <br className="hidden md:block" />
          <span className="text-vault-gold drop-shadow-[0_0_15px_rgba(197,160,89,0.5)]">Menguap Hari Ini?</span>
        </motion.h1>

        {/* Empathetic Subtext */}
        <motion.p 
          className="text-lg md:text-2xl text-vault-cream/90 max-w-3xl mx-auto mb-12 leading-relaxed font-medium"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, type: "spring", bounce: 0.4 }}
        >
          Kami tahu kerasnya perjuangan Anda. Keringat dan air mata yang Anda korbankan untuk membangun bisnis ini, 
          tidak seharusnya habis karena kasbon macet atau stok hilang. Klola OS adalah benteng psikologis Anda.
        </motion.p>

        {/* Heavy CTA Button */}
        <motion.div
          className="flex justify-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, type: "spring", bounce: 0.4 }}
        >
          <Button variant="primary">
            Amankan Bisnis Saya Sekarang
          </Button>
        </motion.div>

        {/* 3D-Tilted Smoked Glass Widget - Removed whileInView to prevent disappearing bugs */}
        <motion.div
          style={{ y, opacity }}
          className="relative mx-auto w-full max-w-2xl perspective-1000"
          initial={{ opacity: 0, rotateX: 45, y: 100 }}
          animate={{ opacity: 1, rotateX: 15, y: 0 }}
          transition={{ duration: 1.2, delay: 0.6, type: "spring", bounce: 0.3 }}
        >
          <div className="bg-vault-oxblood/80 backdrop-blur-3xl backdrop-brightness-125 border-t border-l border-vault-gold/50 border-r border-b border-vault-midnight shadow-[inset_0_1px_2px_rgba(197,160,89,0.5),_0_40px_80px_rgba(0,0,0,0.9)] rounded-2xl p-8 transform-style-3d text-center relative overflow-hidden">
            {/* Inner Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-vault-gold blur-[80px] opacity-50 mix-blend-color-dodge rounded-full" />
            
            <p className="text-vault-cream/80 font-bold mb-2 uppercase tracking-widest text-sm">Total Dana Member Klola Yang Diselamatkan</p>
            <h2 className="font-heading font-bold text-4xl md:text-6xl text-vault-gold drop-shadow-[0_0_20px_rgba(197,160,89,0.6)]">Rp 12.450.000.000+</h2>
            <div className="w-full h-2 bg-vault-coffee mt-8 rounded-full overflow-hidden shadow-inner">
              <motion.div 
                className="h-full bg-vault-gold shadow-[0_0_10px_rgba(197,160,89,1)]"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2, delay: 1, ease: "easeOut" }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
