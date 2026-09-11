import React from 'react';
import { cn } from '@/lib/utils';

export function StempelBadge({ 
  text = "TERUJI", 
  className 
}) {
  return (
    <div className={cn(
      "inline-flex items-center justify-center",
      "border-2 border-dashed border-vault-gold/80 text-vault-gold",
      "px-3 py-1 rounded-sm transform -rotate-2",
      "font-heading font-bold text-xs tracking-widest",
      "opacity-90 mix-blend-screen",
      className
    )}>
      <span className="uppercase">{text}</span>
    </div>
  );
}
