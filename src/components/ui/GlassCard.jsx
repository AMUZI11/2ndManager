"use client";
import React from 'react';
import { motion } from 'framer-motion';

export const GlassCard = ({ children, className = '', withAurora = false, ...props }) => {
  return (
    <div className="relative group z-10 w-full h-full">
      {/* Aurora Embers Glow - Blasted with higher opacity and mix-blend for extreme depth */}
      {withAurora && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-vault-gold blur-[120px] opacity-40 mix-blend-color-dodge -z-10 pointer-events-none rounded-full transition-all duration-700 group-hover:opacity-60 group-hover:blur-[100px]" />
      )}
      
      {/* The Tinted Smoked Glassmorphism Card with Directional Specular Highlights */}
      <motion.div
        className={`bg-vault-oxblood/60 backdrop-blur-3xl backdrop-brightness-125 border-t border-l border-vault-gold/40 border-r border-b border-vault-midnight shadow-[inset_0_1px_2px_rgba(197,160,89,0.5),_0_30px_60px_rgba(0,0,0,0.9)] rounded-2xl p-8 h-full flex flex-col ${className}`}
        {...props}
      >
        {children}
      </motion.div>
    </div>
  );
};
