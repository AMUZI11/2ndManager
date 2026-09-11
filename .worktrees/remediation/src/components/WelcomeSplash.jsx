"use client";
import React, { useEffect, useState } from 'react';

export default function WelcomeSplash() {
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const shown = sessionStorage.getItem('hl_welcome_shown');
      if (!shown) {
        sessionStorage.setItem('hl_welcome_shown', 'true');
        setTimeout(() => {
          setVisible(true);
        }, 0);
        
        const interval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 100) {
              clearInterval(interval);
              setTimeout(() => {
                setFadeOut(true);
                setTimeout(() => setVisible(false), 800);
              }, 400);
              return 100;
            }
            return prev + 5;
          });
        }, 60);

        return () => clearInterval(interval);
      }
    }
  }, []);

  if (!visible) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-[#3D1A0F] flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${
        fadeOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(201,123,26,0.15)_0%,transparent_70%)] pointer-events-none" />

      <div className="flex flex-col items-center max-w-sm px-6 text-center z-10 space-y-6">
        <div className="relative flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#C97B1A] to-[#A85F10] rounded-2xl shadow-[0_12px_24px_rgba(201,123,26,0.3)] border border-[#C97B1A]/40 mb-2 animate-bounce-slow">
          <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
            <path d="M6 6h10" />
            <path d="M6 10h10" />
            <path d="M6 14h10" />
          </svg>
          <span className="absolute -inset-1 rounded-2xl border-2 border-[#C97B1A] opacity-30 animate-ping" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black text-white tracking-[0.25em] select-none animate-tracking-expand font-heading">
            HL MANAGER
          </h1>
          <p className="text-[#C97B1A] text-xs font-black tracking-[0.4em] uppercase opacity-90">
            SISTEM PEMBUKUAN PRO
          </p>
        </div>

        <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden mt-4">
          <div 
            className="h-full bg-gradient-to-r from-[#C97B1A] to-amber-300 transition-all duration-100 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <span className="text-[10px] text-amber-100/40 font-bold tracking-widest uppercase">
          Mempersiapkan Lembar Kas...
        </span>
      </div>
    </div>
  );
}
