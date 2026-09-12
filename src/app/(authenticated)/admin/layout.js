"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  HandCoins,
  ShoppingBag,
  Store,
  Receipt,
  Users,
  TrendingUp,
  Scale,
  FileText,
  CreditCard,
  ShieldAlert,
  Settings,
  HelpCircle,
  ShieldCheck,
  AlertTriangle,
  Ticket,
  FileCheck,
  Building2,
  Tags,
  Key,
  ScrollText,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AdminMissionControlLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [shops, setShops] = useState([]);
  const [activeShopId, setActiveShopId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('hl_active_branch') || 'ALL';
    }
    return 'ALL';
  });
  const [licenseInfo, setLicenseInfo] = useState({
    tier: 'MAGANG',
    daysRemaining: 30,
    status: 'OPERATIONAL',
  });
  const [anomalyCount, setAnomalyCount] = useState(0);

  // Check auth & role
  useEffect(() => {
    let isMounted = true;

    async function initAdminSession() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          router.replace(`/login?redirectTo=${encodeURIComponent(pathname)}`);
          return;
        }

        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        const superadminEmails = (
          process.env.NEXT_PUBLIC_SUPERADMIN_EMAILS ||
          process.env.NEXT_PUBLIC_ADMIN_EMAIL ||
          'ahza201111@gmail.com'
        )
          .split(',')
          .map((e) => e.trim().toLowerCase());

        const isSuper =
          superadminEmails.includes(user.email?.toLowerCase()) ||
          prof?.role === 'SUPERADMIN';

        // Block cashier
        if (prof?.role === 'CASHIER' && !isSuper) {
          router.replace('/pos?denied=unauthorized_admin_access');
          return;
        }

        if (!isMounted) return;
        setSession(user);
        setProfile(prof);
        setIsSuperadmin(isSuper);

        // Fetch owned shops / branches
        let shopQuery = supabase
          .from('shops')
          .select('id, name, subscription_tier, operational_status, parent_shop_id')
          .order('created_at', { ascending: true });

        if (!isSuper) {
          shopQuery = shopQuery.eq('owner_id', user.id);
        }

        const { data: ownedShops } = await shopQuery;
        const shopList = ownedShops || [];
        setShops(shopList);

        if (shopList.length > 0) {
          const mainShop = shopList.find((s) => !s.parent_shop_id) || shopList[0];
          setLicenseInfo({
            tier: mainShop?.subscription_tier || prof?.subscription_plan || 'MAGANG',
            daysRemaining: 28,
            status: mainShop?.operational_status || 'OPERATIONAL',
          });
        }

        // Quick unread anomaly count
        try {
          const { count } = await supabase
            .from('security_anomaly_events')
            .select('*', { count: 'exact', head: true })
            .eq('is_read_by_owner', false);
          setAnomalyCount(count || 0);
        } catch {
          // fallback
        }
      } catch (err) {
        console.error('[Admin Layout Init Error]', err);
        router.replace('/login');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initAdminSession();

    return () => {
      isMounted = false;
    };
  }, [router, pathname, supabase]);

  const handleBranchChange = (e) => {
    const nextId = e.target.value;
    setActiveShopId(nextId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hl_active_branch', nextId);
      document.cookie = `hl_active_branch=${nextId}; path=/; max-age=31536000; SameSite=Lax`;
      window.dispatchEvent(
        new CustomEvent('hl_branch_changed', {
          detail: { shopId: nextId },
        })
      );
    }
  };

  const handleLogout = async () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('hl_active_session');
    }
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-[#080C14] text-white flex flex-col items-center justify-center font-mono select-none">
        <div className="w-12 h-12 border-4 border-[#1E293B] border-t-[#CCFF00] animate-spin mb-4" />
        <span className="text-xs tracking-widest text-slate-400 font-bold uppercase">
          [ OTORISASI MISSION CONTROL ADMIN... ]
        </span>
      </div>
    );
  }

  // Pillar 1: Ringkasan & POS
  const pillar1Items = [
    { href: '/admin', label: 'Ringkasan Eksekutif', icon: LayoutDashboard, exact: true },
    { href: '/pos', label: 'Terminal Kasir POS', icon: ShoppingCart, external: false },
  ];

  // Pillar 2: Inventaris & Cabang
  const pillar2Items = [
    { href: '/admin/inventory', label: 'Inventaris & Stok', icon: Package },
    { href: '/consignments', label: 'Buku Titip Jual', icon: HandCoins },
    { href: '/reorder', label: 'Belanja Pasar / Reorder', icon: ShoppingBag },
    { href: '/admin/branches', label: '3 Cabang & Kasir Gerai', icon: Store },
  ];

  // Pillar 3: Keuangan SAK EMKM
  const pillar3Items = [
    { href: '/admin/transactions', label: 'Pita Transaksi & Void', icon: Receipt },
    { href: '/customers', label: 'Buku Utang / Kasbon', icon: Users },
    { href: '/reports/financials', label: 'Laporan SAK EMKM', icon: TrendingUp },
    { href: '/reports/tax', label: 'Pajak UMKM PP 55', icon: Scale },
    { href: '/reports/kur-dossier', label: 'Berkas KUR Bank', icon: FileText },
  ];

  // Pillar 4: Organisasi & Lisensi
  const pillar4Items = [
    { href: '/billing', label: 'Langganan & Billing', icon: CreditCard },
    { href: '/radar', label: 'Radar Forensik Kasir', icon: ShieldAlert },
    { href: '/settings', label: 'Pengaturan Sistem', icon: Settings },
    { href: '/help', label: 'Pusat Bantuan', icon: HelpCircle },
  ];

  // Pillar 5: Platform Overlord (Superadmin Only)
  const pillar5Items = [
    { href: '/admin/fraud-radar', label: 'Radar Fraud Kasir Global', icon: AlertTriangle },
    { href: '/admin/panic-dispatch', label: 'Tiket Panic Dispatch', icon: Ticket },
    { href: '/admin/payment-proofs', label: 'Verifikasi Bukti Transfer', icon: FileCheck },
    { href: '/admin/tenants', label: 'Data Penyewa / Tenants', icon: Building2 },
    { href: '/admin/categories-master', label: 'Master Kategori Produk', icon: Tags },
    { href: '/admin/vouchers', label: 'Penerbitan Voucher Lisensi', icon: Key },
    { href: '/admin/audit-logs', label: 'Audit Log Platform', icon: ScrollText },
  ];

  const renderNavSection = (title, items, isSuper = false) => (
    <div className="space-y-1">
      <div className="px-3 py-1 text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase flex items-center justify-between">
        <span>{title}</span>
        {isSuper && (
          <span className="bg-rose-950/80 text-rose-400 border border-rose-800 text-[8px] px-1 py-0.2 font-mono">
            SUPER
          </span>
        )}
      </div>
      <div className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center justify-between px-3 py-2 text-xs font-mono font-bold uppercase transition-all duration-100 ${
                isActive
                  ? 'bg-[#CCFF00] text-black border-2 border-black font-black shadow-[2px_2px_0px_#000000] translate-x-0.5'
                  : 'text-slate-300 hover:text-white hover:bg-[#161F36] border-2 border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon size={15} className={`shrink-0 ${isActive ? 'text-black' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.href === '/pos' && (
                <span className="text-[9px] bg-black text-[#CCFF00] px-1.5 py-0.5 font-mono shrink-0 ml-1">
                  POS
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 font-sans flex flex-col selection:bg-[#CCFF00] selection:text-black">
      {/* ─── 1. TOP COMMAND DECK (STICKY HEADER) ─── */}
      <header className="sticky top-0 z-40 h-16 bg-[#0F172A] border-b-2 border-[#1E293B] px-4 lg:px-6 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
        {/* Left: Brand & Title */}
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-2 shrink-0 group">
            <div className="bg-[#CCFF00] text-black font-mono font-black text-sm w-8 h-8 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_#000000] group-hover:rotate-6 transition-transform">
              2M
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-black text-sm tracking-tight text-white uppercase font-mono leading-none">
                2ndManager
              </span>
              <span className="text-[9px] font-mono text-[#CCFF00] font-bold tracking-widest uppercase">
                MISSION CONTROL
              </span>
            </div>
          </Link>

          <span className="hidden md:inline-block h-6 w-px bg-slate-700 mx-1" />

          {/* Branch Selector Dropdown */}
          <div className="relative flex items-center">
            <select
              value={activeShopId}
              onChange={handleBranchChange}
              className="appearance-none bg-[#161F36] text-white border-2 border-[#334155] focus:border-[#CCFF00] text-xs font-mono font-bold uppercase pl-3 pr-8 py-1.5 focus:outline-none transition-colors cursor-pointer shadow-[2px_2px_0px_#000000]"
            >
              <option value="ALL">KONSOLIDASI (SEMUA CABANG)</option>
              {shops.map((s, idx) => (
                <option key={s.id} value={s.id}>
                  CABANG {idx + 1}: {s.name.toUpperCase()}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Center / Right: Status Badges & Quick Action */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* License Badge */}
          <div className="hidden lg:flex items-center gap-1.5 bg-[#161F36] border border-[#334155] px-2.5 py-1 text-[11px] font-mono font-bold uppercase text-slate-300">
            <span className="w-2 h-2 rounded-none bg-[#CCFF00]" />
            <span>[ {licenseInfo.tier} : SISA {licenseInfo.daysRemaining} HARI ]</span>
          </div>

          {/* Security Radar Badge */}
          <Link
            href="/radar"
            className={`hidden sm:flex items-center gap-1.5 border px-2.5 py-1 text-[11px] font-mono font-bold uppercase transition-all ${
              anomalyCount > 0
                ? 'bg-rose-950/60 border-rose-600 text-rose-300 hover:bg-rose-900/80 animate-pulse'
                : 'bg-[#161F36] border-[#334155] text-slate-300 hover:border-[#CCFF00]'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-none ${anomalyCount > 0 ? 'bg-rose-500' : 'bg-emerald-400'}`}
            />
            <span>{anomalyCount > 0 ? `[ 🔴 ${anomalyCount} ANOMALI ]` : '[ 🟢 RADAR AMAN ]'}</span>
          </Link>

          {/* Role Badge */}
          <div className="hidden xl:flex items-center bg-black border border-slate-700 px-2 py-1 text-[10px] font-mono font-bold uppercase text-[#CCFF00]">
            {isSuperadmin ? '[ ⚡ SUPERADMIN OVERLORD ]' : '[ 👑 JURAGAN WARUNG ]'}
          </div>

          {/* Quick Action Button: POS */}
          <Link
            href="/pos"
            className="flex items-center gap-1.5 bg-[#CCFF00] hover:bg-[#b8e600] text-black font-mono font-black text-xs uppercase px-3 py-1.5 border-2 border-black shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            <ShoppingCart size={14} className="stroke-[2.5]" />
            <span className="hidden sm:inline">BUKA KASIR POS</span>
            <span className="sm:hidden">POS</span>
          </Link>

          {/* Tactical Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            title="Keluar dari Mission Control"
            className="hidden sm:flex items-center gap-1 bg-[#161F36] hover:bg-rose-950/80 text-slate-300 hover:text-rose-400 border border-[#334155] hover:border-rose-700 px-2.5 py-1.5 text-xs font-mono font-bold uppercase transition-colors cursor-pointer"
          >
            <LogOut size={14} />
          </button>

          {/* Mobile Hamburger Menu Toggle */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden flex items-center justify-center w-9 h-9 bg-[#161F36] border border-[#334155] text-white hover:border-[#CCFF00] transition-colors"
            aria-label="Toggle Menu Navigasi"
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* ─── 2. BODY SHELL: SIDEBAR + MAIN CONTENT ─── */}
      <div className="flex-1 flex overflow-hidden">
        {/* DESKTOP SIDEBAR: Tactical 4-Pillar (+ 5th Superadmin) Navigation */}
        <aside className="hidden lg:flex flex-col w-72 bg-[#0F172A] border-r-2 border-[#1E293B] overflow-y-auto shrink-0 select-none p-4 space-y-5">
          {/* Pillar 1 */}
          {renderNavSection('PILAR 1: RINGKASAN & POS', pillar1Items)}

          {/* Pillar 2 */}
          {renderNavSection('PILAR 2: INVENTARIS & CABANG', pillar2Items)}

          {/* Pillar 3 */}
          {renderNavSection('PILAR 3: KEUANGAN SAK EMKM', pillar3Items)}

          {/* Pillar 4 */}
          {renderNavSection('PILAR 4: ORGANISASI & LISENSI', pillar4Items)}

          {/* Pillar 5 (Superadmin Only) */}
          {isSuperadmin &&
            renderNavSection('PILAR 5: PLATFORM OVERLORD', pillar5Items, true)}

          {/* Footer Info Box */}
          <div className="pt-4 mt-auto border-t border-[#1E293B] space-y-2">
            <div className="bg-[#080C14] border border-[#1E293B] p-2.5 text-[10px] font-mono text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>OPERATOR:</span>
                <strong className="text-white uppercase truncate ml-1">
                  {profile?.username || session.email.split('@')[0]}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>STATUS:</span>
                <span className="text-[#CCFF00] font-bold">TERKONEKSI</span>
              </div>
              <div className="flex justify-between text-[9px] text-slate-500 pt-1 border-t border-slate-900">
                <span>ENGINE:</span>
                <span>V3 BRUTALIST</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 bg-[#161F36] hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 border border-[#334155] hover:border-rose-700 py-2 text-xs font-mono font-bold uppercase transition-colors cursor-pointer"
            >
              <LogOut size={14} />
              <span>KELUAR SESI ADMIN</span>
            </button>
          </div>
        </aside>

        {/* MOBILE SLIDE-OUT DRAWER MENU */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Tactical Drawer Content */}
            <div className="relative w-80 max-w-[85vw] bg-[#0F172A] border-r-2 border-[#CCFF00] h-full overflow-y-auto p-4 flex flex-col space-y-5 z-10 shadow-[6px_0px_0px_#000000]">
              <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-[#CCFF00] text-black font-mono font-black text-xs w-6 h-6 flex items-center justify-center">
                    2M
                  </div>
                  <span className="font-mono font-black text-xs uppercase text-white">
                    MISSION CONTROL
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 text-slate-400 hover:text-white border border-[#334155]"
                >
                  <X size={16} />
                </button>
              </div>

              {renderNavSection('PILAR 1: RINGKASAN & POS', pillar1Items)}
              {renderNavSection('PILAR 2: INVENTARIS & CABANG', pillar2Items)}
              {renderNavSection('PILAR 3: KEUANGAN SAK EMKM', pillar3Items)}
              {renderNavSection('PILAR 4: ORGANISASI & LISENSI', pillar4Items)}
              {isSuperadmin &&
                renderNavSection('PILAR 5: PLATFORM OVERLORD', pillar5Items, true)}

              <div className="pt-4 border-t border-[#1E293B] mt-auto space-y-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 bg-rose-950/80 text-rose-300 border border-rose-800 py-2.5 text-xs font-mono font-bold uppercase transition-colors"
                >
                  <LogOut size={14} />
                  <span>KELUAR SESI</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── 3. MAIN WORKSPACE CONTAINER ─── */}
        <main className="flex-1 overflow-y-auto bg-[#080C14] p-4 md:p-6 lg:p-8 space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
