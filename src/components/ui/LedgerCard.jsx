import React from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export function LedgerCard({ children, className, ...props }) {
  return (
    <div
      className={twMerge(
        clsx(
          "bg-vault-cream text-vault-coffee",
          "p-8 md:p-10",
          "shadow-2xl rounded-sm",
          "border border-vault-gold/20",
          "relative",
          className
        )
      )}
      {...props}
    >
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-multiply bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')]" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
