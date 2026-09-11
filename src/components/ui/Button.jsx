"use client";
import React from 'react';
import { motion } from 'framer-motion';

export const Button = ({ children, className = '', onClick, variant = 'primary', ...props }) => {
  // Using the exact classes from the directive for the "Fat UI" mechanical button
  const baseClasses = "min-h-[64px] w-fit px-8 py-4 font-black text-xl rounded-xl transition-all flex items-center justify-center";
  
  const variants = {
    primary: `
      bg-gradient-to-b from-[#B33622] to-[#822012] 
      text-[#F4F1E9] 
      border-t border-[#FF9985]/30 
      border-b-[6px] border-[#3D0A05] 
      shadow-[0_10px_25px_rgba(0,0,0,0.8)] 
      active:translate-y-[4px] active:border-b-[2px]
    `,
    secondary: `
      bg-gradient-to-b from-[#1A0F0A] to-[#140503]
      text-[#C5A059]
      border-t border-[#C5A059]/20
      border-b-[6px] border-[#0A0301]
      shadow-[0_10px_25px_rgba(0,0,0,0.8)]
      active:translate-y-[4px] active:border-b-[2px]
    `
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`${baseClasses} ${variants[variant]} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </motion.button>
  );
};
