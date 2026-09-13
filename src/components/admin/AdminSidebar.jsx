"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LogOut, 
  Store, 
  Terminal,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getFilteredNavSections } from '@/config/adminNav';

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [adminUser, setAdminUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [pendingProofsCount, setPendingProofsCount] = useState(0);

  useEffect(() => {
    async function getAdminSession() {
      const { data: { user } } = await supabase.auth.getUser();
      setAdminUser(user);
      if (user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(prof);
      }
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

  const { sections, isPlatformAdmin } = getFilteredNavSections(adminUser, profile);

  const handleLogout = async () => {
    sessionStorage.removeItem('hl_active_session');
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside className="w-64 bg-white border-r-2 border-slate-800 flex flex-col justify-between h-screen flex-shrink-0 z-30 font-sans select-none shadow-[2px_0_0_0_#1e293b]">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Brand Header */}
        <div className="h-16 border-b-2 border-slate-800 px-4 flex items-center justify-between bg-slate-50/70">
          <Link href="/admin" className="flex items-center space-x-2.5 group">
            <div className="w-8 h-8 bg-[#CCFF00] text-slate-900 font-black flex items-center justify-center font-mono text-sm border-2 border-slate-800 shadow-[2px_2px_0_#1E293B] group-hover:-translate-y-0.5 transition-all">
              <Terminal size={16} />
            </div>
            <div>
              <h1 className="font-display font-black text-sm tracking-tight text-slate-900 uppercase">
                2ndManager
              </h1>
              <span className="text-[9px] font-mono tracking-wider text-slate-600 font-bold block -mt-0.5">
                {isPlatformAdmin ? 'SUPERADMIN HUB' : 'MISSION CONTROL'}
              </span>
            </div>
          </Link>
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-800 text-emerald-900">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="font-mono text-[9px] font-black">LIVE</span>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="p-3 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          {sections.map((section, secIdx) => (
            <div key={secIdx} className="space-y-1">
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-extrabold px-2.5 pb-1">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                  const isProof = item.href === '/admin/payment-proofs';

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex items-center justify-between h-9 px-3 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-slate-900 text-white font-mono shadow-[3px_3px_0px_0px_#64748b] border-2 border-slate-900 font-bold'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 border-2 border-transparent hover:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <Icon 
                          size={15} 
                          className={isActive ? 'text-[#CCFF00]' : 'text-slate-500 group-hover:text-slate-800'} 
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      
                      {isProof && pendingProofsCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white font-black text-[9px] font-mono leading-none animate-pulse border border-slate-900">
                          {pendingProofsCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer User Profile & POS Launchpad */}
      <div className="p-3 border-t-2 border-slate-800 space-y-2 bg-slate-50/80">
        <Link
          href="/pos"
          className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-900 bg-[#CCFF00] hover:bg-[#b8e600] border-2 border-slate-800 shadow-[2px_2px_0_#1E293B] transition-all font-mono group"
        >
          <span className="flex items-center space-x-2">
            <Store size={14} className="text-slate-900" />
            <span>Meja Kasir POS</span>
          </span>
          <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <div className="flex items-center justify-between px-2 pt-1 border-t border-slate-200">
          <div className="truncate pr-2">
            <p className="text-xs font-mono font-black text-slate-900 truncate">
              {profile?.username || adminUser?.email?.split('@')[0] || 'Admin'}
            </p>
            <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">
              {isPlatformAdmin ? 'SUPERADMIN' : (profile?.role || 'OWNER')}
            </span>
          </div>
          <button
            onClick={handleLogout}
            title="Keluar Sesi"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-300 hover:border-rose-400 transition-colors cursor-pointer"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
