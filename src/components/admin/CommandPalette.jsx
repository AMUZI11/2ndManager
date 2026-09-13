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
  Package,
  Receipt,
  GitBranch,
  Ticket,
  Laptop,
  Settings,
  X,
  CreditCard
} from 'lucide-react';

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const router = useRouter();

  const commands = [
    { id: 'dash', title: 'Ruang Kontrol & KPI Ringkasan', category: 'Operasional', href: '/admin', icon: Activity, shortcut: 'Alt+1' },
    { id: 'pos', title: 'Terminal POS Kasir Cepat', category: 'Operasional', href: '/pos', icon: Laptop, shortcut: 'POS' },
    { id: 'inv', title: 'Inventaris Produk & Stok Multi-Cabang', category: 'Inventaris', href: '/admin/inventory', icon: Package, shortcut: 'Alt+P' },
    { id: 'trx', title: 'Log Transaksi & Audit Struk', category: 'Operasional', href: '/admin/transactions', icon: Receipt, shortcut: 'Alt+T' },
    { id: 'branches', title: 'Multi-Cabang & Manajemen Outlet', category: 'Inventaris', href: '/admin/branches', icon: GitBranch, shortcut: 'Alt+B' },
    { id: 'vouchers', title: 'Voucher Engine (HMAC Offline Minting)', category: 'Platform', href: '/admin/vouchers', icon: Ticket, shortcut: 'Alt+V' },
    { id: 'proofs', title: 'Verifikasi Bukti Pembayaran & Langganan', category: 'Platform', href: '/admin/payment-proofs', icon: CreditCard, shortcut: 'Alt+7' },
    { id: 'tenants', title: 'Direktori Penyewa & Billing Chokehold', category: 'Platform', href: '/admin/tenants', icon: Store, shortcut: 'Alt+2' },
    { id: 'panic', title: 'Emergency WA Triage Queue (SOS Kasir)', category: 'Darurat', href: '/admin/panic-dispatch', icon: LifeBuoy, shortcut: 'Alt+3' },
    { id: 'cat', title: 'Master 11 Kategori Retail & Seeder', category: 'Katalog', href: '/admin/categories-master', icon: Layers, shortcut: 'Alt+4' },
    { id: 'fraud', title: 'Anomaly Detector & Fraud Radar', category: 'Pengawasan', href: '/admin/fraud-radar', icon: ShieldAlert, shortcut: 'Alt+5' },
    { id: 'audit', title: 'Buku Besar Audit Trail (Immutable)', category: 'Keamanan', href: '/admin/audit-logs', icon: FileLock2, shortcut: 'Alt+6' },
    { id: 'settings', title: 'Pengaturan Profil & Toko', category: 'Konfigurasi', href: '/settings', icon: Settings, shortcut: 'Config' },
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

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
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
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-slate-900/60 backdrop-blur-xs px-4 font-sans animate-in fade-in duration-150"
      onClick={() => setIsOpen(false)}
    >
      <div 
        className="w-full max-w-xl bg-white border-3 border-slate-800 shadow-[8px_8px_0px_0px_#1e293b] rounded-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar */}
        <div className="flex items-center px-4 py-3.5 border-b-2 border-slate-800 gap-3 bg-slate-50">
          <Search size={18} className="text-slate-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleInputKeyDown}
            placeholder="Cari modul, fitur, atau perintah pintas..."
            className="w-full bg-transparent border-none text-slate-900 placeholder-slate-400 text-sm focus:outline-none font-mono font-medium"
          />
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Command List */}
        <div className="max-h-80 overflow-y-auto p-2.5 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 font-mono">
              Tidak ada modul yang cocok dengan &quot;{query}&quot;.
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
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-[#CCFF00] text-slate-900 border-2 border-slate-800 shadow-[2px_2px_0px_0px_#1e293b]' 
                      : 'text-slate-700 hover:bg-slate-100 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div className={`p-1.5 rounded-lg border border-slate-800 ${isSelected ? 'bg-white text-slate-900' : 'bg-slate-100 text-slate-700'}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="font-display font-black text-sm text-slate-900 truncate">{cmd.title}</p>
                      <p className="text-[10px] text-slate-500 font-mono font-bold uppercase">{cmd.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <kbd className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-slate-800 border border-slate-800 shadow-[1px_1px_0px_0px_#1e293b]">
                      {cmd.shortcut}
                    </kbd>
                    <ArrowRight size={14} className={isSelected ? 'text-slate-900' : 'text-transparent'} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hints */}
        <div className="px-4 py-2.5 border-t-2 border-slate-800 bg-slate-50 flex items-center justify-between text-[11px] font-mono text-slate-600 font-bold">
          <div className="flex items-center space-x-3">
            <span>↑↓ Navigasi</span>
            <span>↵ Buka</span>
            <span>ESC Tutup</span>
          </div>
          <span className="text-slate-900 font-black">2ndManager Admin</span>
        </div>
      </div>
    </div>
  );
}
