import React from 'react';

export const DoubleBezelCard = ({ children, className = '' }) => {
  return (
    <div className={`p-1.5 rounded-[2rem] bg-gradient-to-b from-white/60 to-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_4px_6px_-1px_rgba(0,0,0,0.05),0_10px_15px_-3px_rgba(0,0,0,0.05)] border border-kw-border/50 backdrop-blur-sm ${className}`}>
      <div className="rounded-[calc(2rem-0.375rem)] bg-kw-card shadow-sm border border-kw-border overflow-hidden h-full">
        {children}
      </div>
    </div>
  );
};
