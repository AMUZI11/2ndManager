"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Terminal, Store, ShieldCheck, Search, Activity } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import BranchSwitcher from '@/components/BranchSwitcher';

export default function AdminHeader() {
  const supabase = createClient();
  const [shops, setShops] = useState([]);
  const [currentShopId, setCurrentShopId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('hl_active_branch') || 'ALL';
    }
    return 'ALL';
  });
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function loadUserAndShops() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      if (currentUser) {
        const { data: ownedShops } = await supabase
          .from('shops')
          .select('id, name')
          .eq('owner_id', currentUser.id)
          .order('created_at', { ascending: true });
        setShops(ownedShops || []);
      }
    }
    loadUserAndShops();
  }, [supabase]);

  const handleSelectShop = (shopId) => {
    setCurrentShopId(shopId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hl_active_branch', shopId);
      window.dispatchEvent(new Event('branch_changed'));
    }
  };

  return (
    <header className="h-16 border-b-2 border-slate-800 bg-white/95 backdrop-blur-md px-6 flex items-center justify-between flex-shrink-0 z-20 shadow-[0_2px_0_0_#1e293b]">
      <div className="flex items-center space-x-3">
        <span className="font-display font-black text-sm tracking-wide uppercase text-slate-900 flex items-center gap-2">
          <span>MISSION CONTROL</span>
          <span className="text-slate-400 font-normal">/</span>
          <span className="text-xs font-mono font-bold text-slate-600">HUB OPERASIONAL</span>
        </span>
      </div>

      <div className="flex items-center space-x-3">
        {shops.length > 0 && (
          <div className="hidden sm:block">
            <BranchSwitcher 
              shops={shops} 
              currentShopId={currentShopId} 
              onSelectShop={handleSelectShop} 
            />
          </div>
        )}

        <div className="flex items-center space-x-2 px-3 py-1 rounded-xl bg-slate-100 border-2 border-slate-800 text-slate-800 font-mono text-xs font-bold shadow-[2px_2px_0_0_#1e293b]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="hidden md:inline">SYSTEM ONLINE</span>
        </div>

        <Link
          href="/pos"
          className="px-3.5 py-1.5 rounded-xl bg-[#CCFF00] hover:bg-[#b8e600] text-slate-900 border-2 border-slate-800 shadow-[2px_2px_0_0_#1e293b] text-xs font-mono font-black flex items-center gap-1.5 transition-all"
        >
          <Store size={14} />
          <span>KASIR</span>
        </Link>
      </div>
    </header>
  );
}
