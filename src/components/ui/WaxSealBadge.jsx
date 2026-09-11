import React from 'react';

export function WaxSealBadge({ text = "Jaminan Kunci Emas", className = "" }) {
  return (
    <div className={`relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-vault-oxblood shadow-[inset_0_4px_10px_rgba(0,0,0,0.6),_0_4px_15px_rgba(0,0,0,0.5)] border border-vault-oxblood/80 ${className}`}>
      <svg className="absolute inset-0 w-full h-full text-vault-oxblood" viewBox="0 0 100 100">
        <path fill="currentColor" d="M50 0 C60 2, 75 0, 85 10 C95 20, 100 35, 98 50 C100 65, 95 80, 85 90 C75 100, 60 98, 50 100 C40 98, 25 100, 15 90 C5 80, 0 65, 2 50 C0 35, 5 20, 15 10 C25 0, 40 2, 50 0 Z" />
      </svg>
      <div className="absolute inset-2 rounded-full border-[3px] border-vault-gold/40 shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]"></div>
      
      <div className="relative z-10 flex flex-col items-center justify-center p-2 h-full">
        <span className="text-vault-gold text-[10px] font-heading font-bold uppercase tracking-widest leading-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] text-center break-words max-w-[80%]">
          {text}
        </span>
      </div>
    </div>
  );
}
