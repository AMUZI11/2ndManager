"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function VaultButton({ 
  children, 
  onClick, 
  className,
  type = "button",
  ...props 
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      whileTap={{ y: 4, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        "relative",
        "bg-gradient-to-b from-[#B33622] to-[#822012]",
        "text-[#F4F1E9] font-heading font-bold text-lg tracking-wide",
        "px-8 py-4 rounded-xl",
        "border-t border-[#FF9985]/30",       // Top reflection
        "border-b-[6px] border-[#1A0F0A]",    // Heavy cast shadow
        "border-l border-r border-[#822012]", // Sides
        "shadow-vault-btn",
        "active:border-b-[2px]",              // Compress border-b on press (via CSS state or motion)
        "transition-[border-width,shadow] duration-75",
        "flex items-center justify-center gap-2",
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}
