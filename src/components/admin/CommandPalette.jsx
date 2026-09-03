"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Activity, 
  Store, 
  LifeBuoy, 
  Layers, 
  ShieldAlert, 
  FileLock2, 
  ArrowRight,
  Store as ShopIcon,
  X
} from 'lucide-react';

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const router = useRouter();

  const commands = [
    { id: 'dash', title: 'Platform Pulse & Telemetry', category: 'Modul Utama', href: '/admin/dashboard', icon: Activity, shortcut: 'Alt+1' },
    { id: 'tenants', title: 'Tenant Directory & Billing Chokehold', category: 'Modul Utama', href: '/admin/tenants', icon: Store, shortcut: 'Alt+2' },
    { id: 'panic', title: 'Emergency WA Triage Queue', category: 'Tanggap Darurat', href: '/admin/panic-dispatch', icon: LifeBuoy, shortcut: 'Alt+3' },
    { id: 'cat', title: 'Master 11 Kategori Retail & Seeder', category: 'Katalog', href: '/admin/categories-master', icon: Layers, shortcut: 'Alt+4' },
    { id: 'fraud', title: 'Anomaly Detector & Fraud Radar', category: 'Pengawasan', href: '/admin/fraud-radar', icon: ShieldAlert, shortcut: 'Alt+5' },
    { id: 'audit', title: 'Immutable Audit Trail Ledger', category: 'Keamanan', href: '/admin/audit-logs', icon: FileLock2, shortcut: 'Alt+6' },
    { id: 'user-side', title: 'Kembali ke Tampilan Kasir / Toko', category: 'Sistem', href: '/dashboard', icon: ShopIcon, shortcut: 'Go User' },
  ];

  const filteredCommands = commands.filter(c => 
    c.title.toLowerCase().includes(query.toLowerCase()) || 
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  // Global Keydown Listeners (Cmd+K, Ctrl+K, Esc)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleCustomEvent = () => setIsOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', handleCustomEvent);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', handleCustomEvent);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
      setQuery('');
    }
  }, [isOpen]);

  const handleSelect = (cmd) => {
    setIsOpen(false);
    router.push(cmd.href);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredCommands.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % (filteredCommands.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        handleSelect(filteredCommands[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/70 backdrop-blur-md px-4 font-sans animate-fade-in"
      onClick={() => setIsOpen(false)}
    >
      <div 
        className="w-full max-w-xl bg-zinc-950/95 border-2 border-zinc-700 shadow-[0_25px_60px_rgba(0,0,0,0.9)] rounded-xl overflow-hidden animate-slide-down flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar */}
        <div className="flex items-center px-4 py-3 border-b border-zinc-800 gap-3 bg-zinc-900/40">
          <Search size={18} className="text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleInputKeyDown}
            placeholder="Cari modul, aksi, atau perintah sistem..."
            className="w-full bg-transparent border-none text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none font-sans"
          />
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 text-zinc-500 hover:text-zinc-300 rounded hover:bg-zinc-800"
          >
            <X size={16} />
          </button>
        </div>

        {/* Command List */}
        <div className="max-h-72 overflow-y-auto p-2 space-y-1 custom-dark-scrollbar">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500 font-mono">
              Tidak ada modul yang cocok dengan "{query}".
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={cmd.id}
                  onClick={() => handleSelect(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded text-xs cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-zinc-800/90 text-[#CCFF00] border border-zinc-700' 
                      : 'text-zinc-300 hover:bg-zinc-900 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div className={`p-1 rounded ${isSelected ? 'bg-zinc-950 text-[#CCFF00]' : 'text-zinc-500 bg-zinc-900'}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="font-bold font-sans truncate">{cmd.title}</p>
                      <p className="text-[10px] text-zinc-500 font-mono">{cmd.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                      {cmd.shortcut}
                    </kbd>
                    <ArrowRight size={14} className={isSelected ? 'text-[#CCFF00]' : 'text-transparent'} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hints */}
        <div className="px-4 py-2 border-t border-zinc-800/80 bg-zinc-950 flex items-center justify-between text-[10px] font-mono text-zinc-500">
          <div className="flex items-center space-x-3">
            <span>↑↓ Pilih</span>
            <span>↵ Eksekusi</span>
            <span>ESC Tutup</span>
          </div>
          <span className="text-[#CCFF00] font-bold">2ndManager Obsidian Hub</span>
        </div>
      </div>
    </div>
  );
}
