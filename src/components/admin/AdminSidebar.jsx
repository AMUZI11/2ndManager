"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Activity, 
  Store, 
  LifeBuoy, 
  Layers, 
  ShieldAlert, 
  FileLock2, 
  LogOut, 
  ArrowUpRight,
  Terminal,
  ChevronRight,
  CreditCard,
  Tag
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [adminUser, setAdminUser] = useState(null);
  const [pendingProofsCount, setPendingProofsCount] = useState(0);

  useEffect(() => {
    async function getAdminSession() {
      const { data: { user } } = await supabase.auth.getUser();
      setAdminUser(user);
    }
    getAdminSession();

    // Fetch initial pending payment proofs
    const fetchPendingCount = async () => {
      try {
        const res = await fetch('/api/v1/admin/telemetry');
        const json = await res.json();
        if (json?.data?.metrics?.pendingProofs !== undefined) {
          setPendingProofsCount(json.data.metrics.pendingProofs);
        }
      } catch (e) {}
    };
    fetchPendingCount();

    // Realtime increment on new payment proof
    const channel = supabase.channel('sidebar_proofs_counter');
    channel.on('broadcast', { event: 'PAYMENT_PROOF_SUBMITTED' }, () => {
      setPendingProofsCount((prev) => prev + 1);
    });
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Global Keyboard Shortcuts (Alt + 1 .. 8)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.key === '1') { e.preventDefault(); router.push('/admin/dashboard'); }
        if (e.key === '2') { e.preventDefault(); router.push('/admin/tenants'); }
        if (e.key === '3') { e.preventDefault(); router.push('/admin/panic-dispatch'); }
        if (e.key === '4') { e.preventDefault(); router.push('/admin/categories-master'); }
        if (e.key === '5') { e.preventDefault(); router.push('/admin/fraud-radar'); }
        if (e.key === '6') { e.preventDefault(); router.push('/admin/audit-logs'); }
        if (e.key === '7') { e.preventDefault(); router.push('/admin/claims'); }
        if (e.key === '8') { e.preventDefault(); router.push('/admin/promos'); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  const navItems = [
    { href: '/admin/dashboard', label: 'Platform Pulse', icon: Activity, shortcut: 'Alt+1' },
    { href: '/admin/claims', label: 'Audit Klaim Bayar', icon: CreditCard, shortcut: 'Alt+7', badge: pendingProofsCount },
    { href: '/admin/promos', label: 'Mesin Kode Promo', icon: Tag, shortcut: 'Alt+8' },
    { href: '/admin/tenants', label: 'Tenants & Billing', icon: Store, shortcut: 'Alt+2' },
    { href: '/admin/panic-dispatch', label: 'Panic Dispatch', icon: LifeBuoy, shortcut: 'Alt+3' },
    { href: '/admin/categories-master', label: 'Master Kategori', icon: Layers, shortcut: 'Alt+4' },
    { href: '/admin/fraud-radar', label: 'Radar Anomali', icon: ShieldAlert, shortcut: 'Alt+5' },
    { href: '/admin/audit-logs', label: 'Audit Trail Ledger', icon: FileLock2, shortcut: 'Alt+6' },
  ];

  const handleLogout = async () => {
    sessionStorage.removeItem('hl_active_session');
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside className="w-[260px] bg-zinc-950/90 backdrop-blur-xl border-r border-zinc-800 flex flex-col justify-between h-screen flex-shrink-0 z-30 font-sans select-none">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Brand Header */}
        <div className="h-14 border-b border-zinc-800/80 px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 bg-[#CCFF00] text-black font-black flex items-center justify-center font-mono text-xs border border-zinc-800">
              <Terminal size={15} />
            </div>
            <div>
              <h1 className="font-heading font-black text-sm tracking-tight text-zinc-100 uppercase">
                2ndManager
              </h1>
              <span className="text-[9px] font-mono tracking-widest text-[#CCFF00] font-bold block -mt-0.5">
                OBSIDIAN DECK
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            <span className="font-mono text-[10px] text-zinc-400 font-bold">LIVE</span>
          </div>
        </div>

        {/* Section Label */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">
            Pusat Operasional
          </p>
        </div>

        {/* Navigation Items (High-Density h-9) */}
        <nav className="px-2 space-y-1 overflow-y-auto flex-1 custom-dark-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center justify-between h-9 px-3 rounded text-xs transition-all ${
                  isActive
                    ? 'bg-zinc-900 border border-zinc-700 text-[#CCFF00] font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <Icon size={16} className={isActive ? 'text-[#CCFF00]' : 'text-zinc-500 group-hover:text-zinc-300'} />
                  <span className="truncate">{item.label}</span>
                </div>
                <div className="flex items-center space-x-1.5 shrink-0">
                  {item.badge > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-[#CCFF00] text-black font-black text-[9px] font-mono leading-none animate-pulse">
                      {item.badge}
                    </span>
                  )}
                  <kbd className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-500 border border-zinc-800 group-hover:text-zinc-400 group-hover:border-zinc-700">
                    {item.shortcut}
                  </kbd>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / User Profile & Logout */}
      <div className="p-3 border-t border-zinc-800/80 space-y-2 bg-zinc-950/60">
        <Link
          href="/dashboard"
          className="flex items-center justify-between px-3 py-2 rounded text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800/80 transition-colors group"
        >
          <span className="flex items-center space-x-2">
            <Store size={14} className="text-zinc-500 group-hover:text-zinc-300" />
            <span>Sisi Toko (User)</span>
          </span>
          <ArrowUpRight size={13} className="text-zinc-600 group-hover:text-zinc-300" />
        </Link>

        <div className="flex items-center justify-between px-2 pt-1">
          <div className="truncate pr-2">
            <p className="text-xs font-mono font-bold text-zinc-300 truncate">
              {adminUser?.email || 'admin@internal'}
            </p>
            <span className="text-[9px] font-mono text-[#CCFF00] bg-zinc-900 border border-zinc-800 px-1 py-0.2 rounded inline-block uppercase">
              SUPERADMIN
            </span>
          </div>
          <button
            onClick={handleLogout}
            title="Keluar Sesi Admin"
            className="w-8 h-8 rounded flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors cursor-pointer"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
