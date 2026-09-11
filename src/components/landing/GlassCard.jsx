import React from 'react';

export default function GlassCard({ children, className = '', glow = false, ...props }) {
  return (
    <div 
      className={`relative rounded-3xl overflow-hidden bg-[#F5F2EA]/10 backdrop-blur-2xl border border-[#F5F2EA]/20 shadow-[0_8px_32px_0_rgba(61,26,15,0.3)] ${className}`}
      {...props}
    >
      {/* Optional subtle glow effect inside the card */}
      {glow && (
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C2A36B]/50 to-transparent"></div>
      )}
      <div className="relative z-10 p-8 md:p-12 h-full flex flex-col">
        {children}
      </div>
    </div>
  );
}
