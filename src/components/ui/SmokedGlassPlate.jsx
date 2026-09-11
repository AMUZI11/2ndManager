import React from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export function SmokedGlassPlate({ children, className, ...props }) {
  return (
    <div 
      className={twMerge(
        clsx(
          "relative overflow-hidden",
          "bg-vault-oxblood/70 backdrop-blur-md",
          "border border-vault-coffee",
          "shadow-[inset_1px_1px_0_rgba(212,175,55,0.3),_4px_4px_10px_rgba(26,15,10,0.8)]", 
          className
        )
      )}
      style={{
        clipPath: "polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)"
      }}
      {...props}
    >
      <div className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')]" />
      
      <div className="relative z-10 p-6 md:p-8">
        {children}
      </div>
    </div>
  );
}
