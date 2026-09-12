"use client";

import React, { useEffect, useState } from 'react';
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
  ArrowLeft,
  Home,
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

        // Fetch owned shops
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
      <div className="min-h-screen bg-[#F8F9FA] text-slate-900 flex flex-col items-center justify-center font-sans relative">
        <div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none">
          <div className="absolute -top-32 -left-32 w-[550px] h-[550px] bg-amber-200/25 rounded-full blur-[130px]" />
          <div className="absolute top-1/4 -right-32 w-[600px] h-[600px] bg-purple-200/25 rounded-full blur-[140px]" />
          <div className="absolute -bottom-32 left-1/3 w-[550px] h-[550px] bg-orange-100/30 rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-xs font-bold text-slate-700 uppercase tracking-wider">
            [ MEMVALIDASI SESI MISSION CONTROL... ]
          </span>
        </div>
      </div>
    );
  }

  // Pillar 1: Ringkasan & Navigasi Web
  const pillar1Items = [
    { href: '/admin', label: 'Ringkasan Eksekutif', icon: LayoutDashboard, exact: true },
    { href: '/dashboard', label: 'Beranda Utama Web', icon: Home, exact: true },
    { href: '/pos', label: 'Terminal Kasir POS', icon: ShoppingCart },
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
          <span className="bg-rose-100 text-rose-700 border border-rose-300 text-[9px] px-1.5 py-0.2 rounded font-mono font-bold">
            SUPER
          </span>
        )}
      </div>
      <div className="space-y-1">
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
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-tight transition-all duration-150 ${
                isActive
                  ? 'bg-white/90 text-slate-900 border-2 border-slate-800 shadow-[3px_3px_0_#1E293B] font-black'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60 border-2 border-transparent hover:border-slate-800 hover:-translate-y-0.5 hover:shadow-[2px_2px_0_#1E293B]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon size={16} className={`shrink-0 ${isActive ? 'text-slate-900' : 'text-slate-500'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.href === '/pos' && (
                <span className="text-[9px] bg-[#CCFF00] text-black font-mono font-black px-1.5 py-0.5 rounded border border-black shrink-0 ml-1">
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
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 font-sans flex flex-col relative selection:bg-[#CCFF00] selection:text-slate-900">
      {/* ─── GLOBAL AMBIENT BLEND BACKDROP (Sama Persis dengan Web App) ─── */}
      <div 
        aria-hidden="true" 
        className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none transform-gpu translate-z-0"
      >
        <div className="absolute -top-32 -left-32 w-[550px] h-[550px] bg-amber-200/25 rounded-full blur-[130px] transform-gpu translate-z-0" />
        <div className="absolute top-1/4 -right-32 w-[600px] h-[600px] bg-purple-200/25 rounded-full blur-[140px] transform-gpu translate-z-0" />
        <div className="absolute -bottom-32 left-1/3 w-[550px] h-[550px] bg-orange-100/30 rounded-full blur-[120px] transform-gpu translate-z-0" />
      </div>

      {/* ─── 1. TOP COMMAND DECK (STICKY GLASSMORPHIC HEADER) ─── */}
      <header className="sticky top-0 z-40 h-16 bg-white/70 backdrop-blur-xl border-b border-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] px-4 lg:px-6 flex items-center justify-between">
        {/* Left: Brand & Title */}
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-2 shrink-0 group">
            <div className="bg-black text-[#CCFF00] font-black text-sm w-8 h-8 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_#1E293B] rounded-lg">
              2M
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-black text-sm tracking-tight text-slate-900 uppercase font-heading leading-none">
                2ndManager
              </span>
              <span className="text-[9px] font-mono text-slate-600 font-bold tracking-widest uppercase">
                MISSION CONTROL
              </span>
            </div>
          </Link>

          <span className="hidden md:inline-block h-6 w-px bg-slate-300 mx-1" />

          {/* Branch Selector Dropdown */}
          <div className="relative flex items-center">
            <select
              value={activeShopId}
              onChange={handleBranchChange}
              className="appearance-none bg-white/90 text-slate-900 border-2 border-slate-800 focus:border-slate-900 text-xs font-mono font-bold uppercase pl-3 pr-8 py-1.5 rounded-xl shadow-[2px_2px_0px_#1E293B] cursor-pointer focus:outline-none"
            >
              <option value="ALL">SEMUA CABANG (KONSOLIDASI)</option>
              {shops.map((s, idx) => (
                <option key={s.id} value={s.id}>
                  CABANG {idx + 1}: {s.name.toUpperCase()}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 text-slate-600 pointer-events-none" />
          </div>
        </div>

        {/* Center / Right: Status Badges & Quick Action */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Back to Web App Link */}
          <Link
            href="/dashboard"
            className="hidden md:flex items-center gap-1.5 bg-white/90 hover:bg-white text-slate-800 border-2 border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase shadow-[2px_2px_0px_#1E293B] hover:-translate-y-0.5 transition-all"
            title="Kembali ke Beranda Web"
          >
            <Home size={14} />
            <span>BERANDA WEB</span>
          </Link>

          {/* License Badge */}
          <div className="hidden lg:flex items-center gap-1.5 bg-white/90 border-2 border-slate-800 rounded-xl px-2.5 py-1 text-[11px] font-mono font-bold uppercase text-slate-900 shadow-[2px_2px_0px_#1E293B]">
            <span className="w-2 h-2 rounded-full bg-[#CCFF00] border border-black" />
            <span>[ {licenseInfo.tier} : SISA {licenseInfo.daysRemaining} HARI ]</span>
          </div>

          {/* Security Radar Badge */}
          <Link
            href="/radar"
            className={`hidden sm:flex items-center gap-1.5 border-2 rounded-xl px-2.5 py-1 text-[11px] font-mono font-bold uppercase transition-all shadow-[2px_2px_0px_#1E293B] ${
              anomalyCount > 0
                ? 'bg-rose-100 border-rose-700 text-rose-900 hover:bg-rose-200 animate-pulse'
                : 'bg-white/90 border-slate-800 text-slate-900 hover:bg-white'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${anomalyCount > 0 ? 'bg-rose-600' : 'bg-emerald-500'}`}
            />
            <span>{anomalyCount > 0 ? `[ 🔴 ${anomalyCount} ANOMALI ]` : '[ 🟢 RADAR AMAN ]'}</span>
          </Link>

          {/* Quick Action Button: POS */}
          <Link
            href="/pos"
            className="flex items-center gap-1.5 bg-[#CCFF00] hover:bg-[#b8e600] text-slate-900 font-mono font-black text-xs uppercase px-3.5 py-1.5 rounded-xl border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] hover:-translate-y-0.5 active:translate-y-0 transition-all"
          >
            <ShoppingCart size={14} className="stroke-[2.5]" />
            <span className="hidden sm:inline">KASIR POS</span>
            <span className="sm:hidden">POS</span>
          </Link>

          {/* Tactical Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            title="Keluar dari Sistem"
            className="hidden sm:flex items-center gap-1 bg-white hover:bg-slate-900 hover:text-white text-slate-800 border-2 border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold uppercase shadow-[2px_2px_0px_#1E293B] transition-colors cursor-pointer"
          >
            <LogOut size={14} />
          </button>

          {/* Mobile Hamburger Menu Toggle */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden flex items-center justify-center w-9 h-9 bg-white border-2 border-slate-800 rounded-xl text-slate-900 shadow-[2px_2px_0px_#1E293B] cursor-pointer"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* ─── 2. BODY SHELL: SIDEBAR + MAIN CONTENT ─── */}
      <div className="flex-1 flex relative z-10">
        {/* DESKTOP SIDEBAR: Glassmorphism Bubble with Top-Right Arc */}
        <aside className="hidden lg:flex flex-col w-[280px] bg-white/60 backdrop-blur-xl border-r border-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] rounded-tr-[2.5rem] p-5 space-y-5 flex-shrink-0 justify-between min-h-[calc(100vh-4rem)] sticky top-16 z-30">
          <div className="space-y-4">
            {/* Quick Context Switch */}
            <div className="p-3 bg-white/80 border-2 border-slate-800 rounded-2xl shadow-[2px_2px_0px_#1E293B] space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-800">
                <span className="uppercase truncate">
                  OP: <strong>{profile?.username || session.email.split('@')[0]}</strong>
                </span>
                <span className="w-2 h-2 rounded-full bg-[#CCFF00] border border-slate-800 animate-pulse" />
              </div>
              <div className="text-[10px] text-slate-500 font-mono uppercase">
                ROLE: <strong className="text-slate-900">{isSuperadmin ? 'SUPERADMIN' : (profile?.role || 'JURAGAN')}</strong>
              </div>
            </div>

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
          </div>

          <div className="pt-3 border-t border-slate-200/80 space-y-2">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 bg-white/90 hover:bg-slate-900 hover:text-white text-slate-800 border-2 border-slate-800 rounded-xl py-2.5 text-xs font-mono font-bold uppercase shadow-[2px_2px_0px_#1E293B] transition-colors cursor-pointer"
            >
              <LogOut size={14} />
              <span>KELUAR SESI</span>
            </button>
          </div>
        </aside>

        {/* MOBILE SLIDE-OUT DRAWER MENU */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Drawer Content */}
            <div className="relative w-80 max-w-[85vw] bg-white/95 backdrop-blur-2xl border-r-2 border-slate-800 h-full overflow-y-auto p-5 flex flex-col space-y-4 z-10 shadow-[6px_0px_0px_#1E293B]">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-black text-[#CCFF00] font-black text-xs w-6 h-6 flex items-center justify-center rounded">
                    2M
                  </div>
                  <span className="font-heading font-black text-sm uppercase text-slate-900">
                    MISSION CONTROL
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 text-slate-700 hover:text-slate-900 border border-slate-300 rounded-lg"
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

              <div className="pt-3 border-t border-slate-200 mt-auto">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white rounded-xl py-2.5 text-xs font-mono font-bold uppercase transition-colors"
                >
                  <LogOut size={14} />
                  <span>KELUAR SESI</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── 3. MAIN WORKSPACE CONTAINER ─── */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full overflow-x-hidden space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
