"use client";
import React from 'react';

export default function PremiumButton({ children, onClick, className = '', variant = 'primary', ...props }) {
  // active:scale-[0.97] follows Emil Design Eng constraint
  const baseClasses = "font-bold min-h-[64px] rounded-xl flex items-center justify-center px-8 text-lg md:text-xl transition-all duration-[160ms] ease-out-premium active:scale-[0.97] active:origin-center";
  
  const variants = {
    primary: "bg-kw-terra text-kw-cream border-b-[6px] border-[#3D1A0F] hover:brightness-110",
    secondary: "bg-transparent text-kw-cream border-2 border-kw-cream/40 hover:bg-kw-cream/10",
    glass: "bg-white/10 backdrop-blur-md border border-white/20 text-kw-cream hover:bg-white/20"
  };

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variants[variant]} ${className}`}
      {...props}
    >
      <span className="transition-all duration-200 ease-in-out">
        {children}
      </span>
    </button>
  );
}
