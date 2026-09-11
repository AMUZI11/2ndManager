import React from 'react';
import { cn } from '@/lib/utils';

export function AuroraEmber({ 
  className,
  color = "gold", // gold, ember, or brick
  size = "md"     // sm, md, lg
}) {
  const sizeClasses = {
    sm: "w-[300px] h-[150px] blur-[80px]",
    md: "w-[600px] h-[250px] blur-[120px]",
    lg: "w-[800px] h-[300px] blur-[160px]"
  };

  const colorClasses = {
    gold: "bg-vault-gold opacity-[0.25]",
    ember: "bg-vault-ember opacity-[0.4]",
    brick: "bg-[#B33622] opacity-[0.2]"
  };

  return (
    <div 
      className={cn(
        "absolute pointer-events-none rounded-full",
        sizeClasses[size],
        colorClasses[color],
        className
      )}
    ></div>
  );
}
