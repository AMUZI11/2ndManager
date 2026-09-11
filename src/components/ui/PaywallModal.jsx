"use client";
import React from 'react';
import { Lock, X } from 'lucide-react';
import Link from 'next/link';

export default function PaywallModal({ isOpen, onClose, title, message, targetPlan, priceLabel }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/70 backdrop-blur-sm">
      <div className="bg-kw-accent/10 w-full max-w-md rounded-3xl shadow-2xl border border-kw-border overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header / Banner */}
        <div className="bg-kw-bg p-6 relative border-b border-kw-border">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-kw-card hover:bg-[#8C2818] text-kw-text rounded-xl transition-colors border border-kw-border"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-6 mb-2">
            <div className="p-3 bg-kw-card border border-kw-border rounded-xl shadow-xs">
              <Lock className="w-6 h-6 text-kw-accent" />
            </div>
            <span className="text-kw-accent font-black uppercase tracking-widest text-sm border border-kw-border px-3 py-1 rounded-full bg-kw-card">Fitur Premium</span>
          </div>
          <h3 className="text-2xl font-extrabold text-kw-accent tracking-tighter mt-4 font-heading">{title}</h3>
        </div>

        {/* Content */}
        <div className="bg-kw-bg p-6">
          <p className="text-kw-text text-lg mb-8 leading-relaxed font-medium">
            {message}
          </p>

          <div className="space-y-4">
            <Link 
              href="/billing"
              className="flex items-center justify-center w-full px-6 py-4 bg-kw-accent text-kw-bg font-black rounded-2xl hover:bg-[#b06a14] active:scale-95 transition-all shadow-md border border-[#D4AF37]"
            >
              Buka {targetPlan} ({priceLabel})
            </Link>
            <button 
              onClick={onClose}
              className="w-full px-6 py-4 text-lg font-bold text-kw-text border border-kw-border rounded-2xl hover:bg-kw-card active:scale-95 transition-all"
            >
              Nanti Saja
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
