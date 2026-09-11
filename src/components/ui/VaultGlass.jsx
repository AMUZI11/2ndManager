import React from 'react';
import { cn } from '@/lib/utils'; // Assuming they have cn from shadcn or I'll implement a simple one

export function VaultGlass({ 
  children, 
  tier = 2, 
  className,
  ...props 
}) {
  const baseClasses = "relative overflow-hidden";
  
  const tierClasses = {
    1: "bg-vault-oxblood/60 backdrop-blur-3xl border border-vault-gold/40 shadow-vault-card rounded-2xl",
    2: "bg-vault-oxblood/50 backdrop-blur-xl border border-vault-gold/20 shadow-[0_10px_30px_rgba(0,0,0,0.7)] rounded-xl",
    3: "bg-vault-oxblood/40 backdrop-blur-md border border-vault-gold/10 rounded-xl"
  };

  // The pseudo-element for noise can be added directly via a span if we want to ensure it stays below content
  // but we already have a global film-grain. We can add a subtle local grain if needed.
  
  return (
    <div 
      className={cn(baseClasses, tierClasses[tier], className)}
      {...props}
    >
      {/* Optional internal noise layer if more texture is desired per card */}
      <div className="absolute inset-0 film-grain opacity-[0.05] mix-blend-overlay pointer-events-none rounded-inherit"></div>
      
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
