"use client";

import React from 'react';

export default function CommandPaletteTrigger() {
  const handleClick = () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  };

  return (
    <button 
      type="button"
      onClick={handleClick}
      className="h-8 px-3 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-400 hover:text-zinc-200 flex items-center space-x-2.5 transition-colors cursor-pointer"
    >
      <span>Cari atau perintah...</span>
      <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-600 rounded text-[10px] font-mono text-zinc-300">⌘K</kbd>
    </button>
  );
}
