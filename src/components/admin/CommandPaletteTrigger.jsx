"use client";

import React from 'react';
import { Search } from 'lucide-react';

export default function CommandPaletteTrigger() {
  const handleClick = () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  };

  return (
    <button 
      type="button"
      onClick={handleClick}
      className="h-9 px-3.5 bg-white border-2 border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-600 hover:text-slate-900 shadow-[2px_2px_0px_0px_#1e293b] active:translate-x-[1px] active:translate-y-[1px] flex items-center space-x-2.5 transition-all cursor-pointer"
    >
      <Search size={14} className="text-slate-500" />
      <span>Cari atau perintah...</span>
      <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-800 rounded font-mono text-[10px] text-slate-800 font-bold">⌘K</kbd>
    </button>
  );
}
