"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Users, Package, FileText, HelpCircle, LogOut, Settings, CreditCard, ShieldCheck, ShoppingCart, Menu, X, User, Receipt, ShieldAlert, HandCoins, ShoppingBag } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { api } from '@/utils/api';
import { useTutorial, TutorialProvider } from '@/components/TutorialEngine';
import ConfirmModal from '@/components/ConfirmModal';
import SetupWizard from '@/components/SetupWizard';
import BranchSwitcher from '@/components/BranchSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';

function AuthenticatedLayoutInner({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [session, setSession] = useState(null);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isExitTutorialConfirmOpen, setIsExitTutorialConfirmOpen] = useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [shops, setShops] = useState([]);
  const [currentShopId, setCurrentShopId] = useState('ALL');

  const [userPlan, setUserPlan] = useState('FREE');
  const [chokeholdLock, setChokeholdLock] = useState(null);
  const { registerTrigger, activeTutorial } = useTutorial();

  // Virtual keyboard detection to auto-hide mobile dock
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleViewportChange = () => {
      if (window.visualViewport) {
        const isKeyboard = window.innerHeight - window.visualViewport.height > 150;
        setIsKeyboardOpen(isKeyboard);
      }
    };

    const handleFocusIn = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) {
        setIsKeyboardOpen(true);
      }
    };

    const handleFocusOut = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) {
        setIsKeyboardOpen(false);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
    }
    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
      }
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Real-time Chokehold Status Listener
  useEffect(() => {
    if (!currentShopId || currentShopId === 'ALL') return;

    async function checkShopStatus() {
      try {
        const { data: s } = await supabase
          .from('shops')
          .select('chokehold_active, operational_status')
          .eq('id', currentShopId)
          .single();

        if (s?.chokehold_active || s?.operational_status === 'CHOKEHOLD') {
          setChokeholdLock({
            active: true,
            reason: 'Tagihan langganan telah melampaui masa tenggang. Akses kasir dan transaksi toko terkunci sementara.',
          });
        } else {
          setChokeholdLock(null);
        }
      } catch (e) {
        console.warn('[Check chokehold error]', e);
      }
    }

    checkShopStatus();

    const channel = supabase
      .channel(`shop_control:${currentShopId}`)
      .on('broadcast', { event: 'STATUS_LOCK_UPDATE' }, (payload) => {
        if (payload?.chokehold_active || payload?.operational_status === 'CHOKEHOLD') {
          setChokeholdLock({
            active: true,
            reason: payload.reason || 'Tagihan langganan telah melampaui masa tenggang.',
          });
        } else {
          setChokeholdLock(null);
        }
      })
      .on('broadcast', { event: 'PLAN_UPDATED' }, (payload) => {
        const newPlan = payload?.payload?.plan || payload?.payload?.tier;
        if (newPlan) {
          setUserPlan(newPlan);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('hl-plan-changed', { detail: { plan: newPlan } }));
          }
        }
      })
      .on('broadcast', { event: 'CHOKEHOLD_REVOKED' }, (payload) => {
        const newPlan = payload?.payload?.tier;
        if (newPlan) {
          setUserPlan(newPlan);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('hl-plan-changed', { detail: { plan: newPlan } }));
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentShopId, supabase]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedBranch = localStorage.getItem('hl_active_branch');
      if (savedBranch) setCurrentShopId(savedBranch);
    }
  }, []);

  const handleSelectShop = (shopId) => {
    setCurrentShopId(shopId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hl_active_branch', shopId);
      window.dispatchEvent(new CustomEvent('hl_branch_changed', { detail: { shopId } }));
    }
  };

  useEffect(() => {
    async function checkSession() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        // Tab-close auto logout: jika tab/browser ditutup, sessionStorage terhapus oleh browser
        const isActiveSession = sessionStorage.getItem('hl_active_session') === 'true';
        if (error || !user || !isActiveSession) {
          await supabase.auth.signOut();
          router.push('/login');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        setSession({
          user,
          profile,
          username: profile?.username || user.email.split('@')[0],
          isSuperadmin: user.email?.toLowerCase() === 'ahza201111@gmail.com',
        });

        // Fetch user plan for Status Symbol header
        try {
          const billingRes = await fetch('/api/v1/billing');
          if (billingRes.ok) {
            const json = await billingRes.json();
            const activePlan = json?.data?.plan || json?.data?.subscription?.plan || json?.data?.tier || 'MAGANG';
            setUserPlan(activePlan);
          }
        } catch (planErr) {
          console.error('[Plan fetch error]', planErr);
        }

        // If user is Boss, fetch all shops owned by them for BranchSwitcher
        if (profile?.role !== 'CASHIER') {
          try {
            const { data: ownedShops } = await supabase
              .from('shops')
              .select('id, name')
              .eq('owner_id', user.id)
              .order('created_at', { ascending: true });
            
            const shopList = ownedShops || [];
            setShops(shopList);


            if (shopList.length > 0 && typeof window !== 'undefined') {
              const savedBranch = localStorage.getItem('hl_active_branch');
              if (!savedBranch || !shopList.some(s => s.id === savedBranch)) {
                setCurrentShopId(shopList[0].id);
                localStorage.setItem('hl_active_branch', shopList[0].id);
              }
            }
          } catch (err) {
            console.error('[Layout Branch Fetch Error]', err);
          }
        }
      } catch (err) {
        console.error('[Layout Session Check Error]', err);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    }

    checkSession();
  }, [router, supabase]);

  // Realtime plan synchronization from Admin Command Deck
  useEffect(() => {
    if (!currentShopId) return;

    const channel = supabase.channel(`shop_control_user_${currentShopId}`);
    channel.on('broadcast', { event: 'PLAN_UPDATED' }, (payload) => {
      const newPlan = payload?.payload?.plan || payload?.payload?.tier;
      if (newPlan) {
        setUserPlan(newPlan);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('hl-plan-changed', { detail: { plan: newPlan } }));
        }
      }
    });
    channel.on('broadcast', { event: 'CHOKEHOLD_REVOKED' }, (payload) => {
      const newPlan = payload?.payload?.tier;
      if (newPlan) {
        setUserPlan(newPlan);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('hl-plan-changed', { detail: { plan: newPlan } }));
        }
      }
    });
    channel.subscribe();

    const handleLocalPlanChanged = (e) => {
      if (e.detail?.plan) setUserPlan(e.detail.plan);
    };
    window.addEventListener('hl-plan-changed', handleLocalPlanChanged);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('hl-plan-changed', handleLocalPlanChanged);
    };
  }, [currentShopId, supabase]);

  // Status Symbol Logo Helper
  const renderBrandLogo = (isMobile = false) => {
    const plan = (userPlan || 'MAGANG').toUpperCase();

    if (plan === 'EKSEKUTIF' || plan === 'PRO') {
      return (
        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-black text-[#CCFF00] font-black text-sm w-7 h-7 flex items-center justify-center border-2 border-black">
            2M
          </div>
          <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-black font-heading tracking-tight text-black`}>
            2ndManager
          </h2>
          <span className="text-[9px] font-black uppercase bg-[#CCFF00] text-black px-1.5 py-0.5 border border-black font-mono shrink-0">
            [ EKSEKUTIF ]
          </span>
        </div>
      );
    }

    if (plan === 'MANAJER') {
      return (
        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-black text-[#CCFF00] font-black text-sm w-7 h-7 flex items-center justify-center border-2 border-black">
            2M
          </div>
          <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-black font-heading tracking-tight text-black`}>
            2ndManager
          </h2>
          <span className="text-[9px] font-black uppercase bg-black text-[#CCFF00] px-1.5 py-0.5 border border-black font-mono shrink-0">
            [ MANAJER ]
          </span>
        </div>
      );
    }

    if (plan === 'SUPERVISOR' || plan === 'STANDARD') {
      return (
        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-black text-white font-black text-sm w-7 h-7 flex items-center justify-center border-2 border-black">
            2M
          </div>
          <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-black tracking-tight text-black font-heading shrink-0`}>
            2ndManager
          </h2>
          <span className="text-[9px] font-mono uppercase bg-black text-white px-1.5 py-0.5 border border-black shrink-0 tracking-wider">
            [ SUPERVISOR ]
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 shrink-0">
        <div className="bg-zinc-200 text-zinc-700 font-black text-sm w-7 h-7 flex items-center justify-center border-2 border-zinc-400">
          2M
        </div>
        <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-black tracking-tight text-zinc-700 font-heading shrink-0`}>
          2ndManager
        </h2>
        <span className="text-[9px] font-mono uppercase bg-zinc-200 text-zinc-600 px-1.5 py-0.5 border border-dashed border-zinc-400 shrink-0">
          [ DRAFT MAGANG ]
        </span>
      </div>
    );
  };

  useEffect(() => {
    async function checkEmptyState() {
      try {
        const products = await api.getProducts();
        const dismissed = localStorage.getItem('hl_wizard_dismissed') === 'true';
        if (products && products.length === 0 && !dismissed) {
          setIsWizardOpen(true);
        }
      } catch (err) {
        console.error(err);
      }
    }
    if (session && session.profile?.role !== 'CASHIER') {
      checkEmptyState();
    }
  }, [session]);

  const handleFinishWizard = () => {
    localStorage.setItem('hl_wizard_dismissed', 'true');
    setIsWizardOpen(false);
    router.push('/transactions/new');
  };

  // Pantau perubahan path untuk otomatisasi langkah tutorial
  useEffect(() => {
    if (pathname === '/customers') registerTrigger('tour-nav-customers', 'click');
    if (pathname === '/products') registerTrigger('tour-nav-products', 'click');
    if (pathname === '/reporting') registerTrigger('tour-nav-laporan', 'click');
    if (pathname === '/transactions/new') registerTrigger('tour-nav-bon-baru', 'click');
  }, [pathname, registerTrigger]);

  const handleLogout = () => {
    setIsLogoutConfirmOpen(true);
  };

  const confirmLogout = async () => {
    sessionStorage.removeItem('hl_active_session');
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (isLoading || !session) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] text-slate-900 flex flex-col items-center justify-center text-lg font-semibold space-y-3 font-sans relative">
        <div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none transform-gpu translate-z-0">
          <div className="absolute -top-32 -left-32 w-[550px] h-[550px] bg-amber-200/25 rounded-full blur-[130px] transform-gpu translate-z-0" />
          <div className="absolute top-1/4 -right-32 w-[600px] h-[600px] bg-purple-200/25 rounded-full blur-[140px] transform-gpu translate-z-0" />
          <div className="absolute -bottom-32 left-1/3 w-[550px] h-[550px] bg-orange-100/30 rounded-full blur-[120px] transform-gpu translate-z-0" />
        </div>
        <div className="relative z-10 flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-xs font-bold text-slate-700 uppercase tracking-wider">Memvalidasi Sesi Masuk Supabase...</span>
        </div>
      </div>
    );
  }

  // Cashier Kiosk Layout (Fullscreen without sidebar or mobile navigation)
  if (session?.profile?.role === 'CASHIER') {
    return (
      <main className="min-h-screen bg-[#F8F9FA] p-0 font-sans relative">
        <div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none transform-gpu translate-z-0">
          <div className="absolute -top-32 -left-32 w-[550px] h-[550px] bg-amber-200/25 rounded-full blur-[130px] transform-gpu translate-z-0" />
          <div className="absolute top-1/4 -right-32 w-[600px] h-[600px] bg-purple-200/25 rounded-full blur-[140px] transform-gpu translate-z-0" />
          <div className="absolute -bottom-32 left-1/3 w-[550px] h-[550px] bg-orange-100/30 rounded-full blur-[120px] transform-gpu translate-z-0" />
        </div>
        <div className="relative z-10">
          {children}
        </div>
      </main>
    );
  }

  const navItems = [
    { href: '/dashboard', label: 'Beranda', icon: Home, id: 'tour-nav-dashboard' },
    { href: '/pos', label: 'Kasir POS', icon: ShoppingCart, id: 'tour-nav-pos' },
    { href: '/transactions', label: 'Pita Transaksi', icon: Receipt, id: 'tour-nav-transactions' },
    { href: '/customers', label: 'Pelanggan', icon: Users, id: 'tour-nav-customers' },
    { href: '/products', label: 'Produk', icon: Package, id: 'tour-nav-products' },
    { href: '/reorder', label: 'Belanja Pasar', icon: ShoppingBag, id: 'tour-nav-reorder' },
    { href: '/consignments', label: 'Buku Titip Jual', icon: HandCoins, id: 'tour-nav-consignments' },
    { href: '/reporting', label: 'Laporan', icon: FileText, id: 'tour-nav-laporan' },
    { href: '/billing', label: 'Langganan', icon: CreditCard, id: 'tour-nav-billing' },
    { href: '/help', label: 'Bantuan', icon: HelpCircle, id: 'tour-nav-help' },
    { href: '/settings', label: 'Pengaturan', icon: Settings, id: 'tour-nav-settings' },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col md:flex-row p-0 md:p-0 overflow-x-hidden w-full max-w-full font-sans relative">
      {/* ─── GLOBAL AMBIENT BLEND BACKDROP (Soft Warm Orange & Gentle Lavender-Purple Blend - Synchronized with Pita Transaksi) ─── */}
      <div 
        aria-hidden="true" 
        className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none transform-gpu translate-z-0"
      >
        {/* Soft Warm Amber/Orange Glow (Top-Left) */}
        <div className="absolute -top-32 -left-32 w-[550px] h-[550px] bg-amber-200/25 rounded-full blur-[130px] transform-gpu translate-z-0" />
        {/* Gentle Lavender / Purple Glow (Top-Right / Mid-Right) */}
        <div className="absolute top-1/4 -right-32 w-[600px] h-[600px] bg-purple-200/25 rounded-full blur-[140px] transform-gpu translate-z-0" />
        {/* Warm Sunrise / Peach Glow (Bottom-Center) */}
        <div className="absolute -bottom-32 left-1/3 w-[550px] h-[550px] bg-orange-100/30 rounded-full blur-[120px] transform-gpu translate-z-0" />
      </div>

      {/* DESKTOP SIDEBAR: Glassmorphism Bubble with Top-Right Arc */}
      <aside className="no-print hidden md:flex flex-col w-[280px] bg-white/60 backdrop-blur-xl border-r border-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] rounded-tr-[2.5rem] p-6 space-y-6 flex-shrink-0 justify-between min-h-screen sticky top-0 z-30">
        <div className="space-y-6">
          <div className="py-4 border-b border-slate-200/80 space-y-3">
            <div>
              {renderBrandLogo(false)}
              <span className="text-[10px] text-zinc-500 font-mono font-bold tracking-widest uppercase block mt-1">SISTEM AUTOPILOT B2B</span>
            </div>
            <BranchSwitcher
              shops={shops}
              currentShopId={currentShopId}
              onSelectShop={handleSelectShop}
            />
          </div>

          {session.isSuperadmin && (
            <div className="space-y-1.5">
              <Link
                href="/admin/dashboard"
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-black bg-[#09090B] text-[#CCFF00] border-2 border-slate-800 shadow-[3px_3px_0_#1E293B] hover:-translate-y-0.5 transition-all font-mono"
              >
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                  <span>COMMAND DECK</span>
                </span>
                <span className="text-[9px] bg-[#CCFF00] text-black px-1.5 py-0.5 rounded font-black tracking-widest">
                  ADMIN
                </span>
              </Link>
              <Link
                href="/superadmin"
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <span>Bukti Transfer</span>
                <ShieldCheck size={13} />
              </Link>
            </div>
          )}

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  id={item.id}
                  href={item.href}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold tracking-tight transition-all duration-150 min-h-[48px] ${
                    isActive 
                      ? 'bg-white/80 text-slate-900 border-2 border-slate-800 shadow-[3px_3px_0_#1E293B] font-bold' 
                      : 'text-slate-700 hover:text-slate-900 hover:bg-white/50 border-2 border-transparent hover:border-slate-800 hover:-translate-y-1 hover:shadow-[3px_3px_0_#1E293B]'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-slate-900' : 'text-slate-600'} /> {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between text-slate-800 font-bold">
            <div className="flex items-center gap-2 text-xs font-mono">
              <div className="w-2 h-2 rounded-full bg-[#CCFF00] border border-slate-800 animate-pulse" />
              <span>OP: <strong className="text-slate-900 uppercase">{session.username}</strong></span>
            </div>
            <ThemeToggle />
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/80 hover:bg-slate-900 hover:text-white text-slate-800 border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer min-h-[44px]"
          >
            <LogOut size={16} /> KELUAR SISTEM
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER: Glassmorphism */}
      <header className="no-print md:hidden h-16 bg-white/70 backdrop-blur-xl border-b border-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] px-4 flex items-center justify-between z-30 sticky top-0 w-full max-w-full overflow-x-hidden">
        <div className="flex items-center gap-4 shrink-0">
          {renderBrandLogo(true)}
          <BranchSwitcher
            shops={shops}
            currentShopId={currentShopId}
            onSelectShop={handleSelectShop}
          />
        </div>

        {/* Mobile Actions: Theme Toggle + Menu */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#CCFF00] text-slate-900 rounded-xl border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] transition-all cursor-pointer font-bold text-xs uppercase shrink-0 min-h-[38px]"
            aria-label="Buka Menu Mobile"
          >
            {isMobileMenuOpen ? (
              <X size={18} className="text-slate-900" />
            ) : (
              <Menu size={18} className="text-slate-900" />
            )}
            <span className="font-mono font-bold">MENU</span>
          </button>
        </div>
      </header>

      {/* MOBILE DROPDOWN / SIDE DRAWER MENU */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop Overlay */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden animate-fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Mobile Menu Card: Pop-Art Glass */}
          <div className="md:hidden fixed top-16 right-3 left-3 bg-white/95 backdrop-blur-2xl border-2 border-slate-800 shadow-[6px_6px_0px_#1E293B] p-6 z-50 animate-fade-in space-y-4 font-sans rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#CCFF00] border border-slate-800 animate-pulse" />
                <span className="text-xs font-mono font-bold text-slate-800 uppercase">
                  OPERATOR: <strong>{session.username}</strong>
                </span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-slate-800 hover:bg-slate-900 hover:text-white p-1.5 rounded-lg border border-slate-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 pt-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    id={item.id}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold tracking-tight transition-all min-h-[48px] ${
                      isActive 
                        ? 'bg-[#CCFF00] text-slate-900 border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] font-bold' 
                        : 'text-slate-800 hover:bg-slate-100 border-2 border-transparent'
                    }`}
                  >
                    <Icon size={18} /> {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Keluar (Logout) */}
            <div className="pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white border-2 border-slate-800 font-mono text-xs font-bold uppercase rounded-xl transition-all cursor-pointer min-h-[48px]"
              >
                <LogOut size={16} /> KELUAR SISTEM
              </button>
            </div>
          </div>
        </>
      )}

      {/* MAIN CONTAINER */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full overflow-x-hidden overflow-y-auto pb-[120px] md:pb-8 relative z-10">
        {activeTutorial && (
          <div className="no-print bg-[#CCFF00] text-slate-900 border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B] px-4 py-3 rounded-xl flex items-center justify-between mb-6 animate-slide-in sticky top-0 lg:top-4 z-40">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 bg-slate-900 rounded-full animate-ping" />
              <p className="text-xs font-bold font-mono uppercase">
                Mode Latihan: <span className="underline">{activeTutorial.steps[activeTutorial.currentStep].title}</span>
              </p>
            </div>
            <button 
              onClick={() => setIsExitTutorialConfirmOpen(true)}
              className="text-xs font-mono font-black bg-slate-900 text-white px-2.5 py-1 transition-all cursor-pointer uppercase rounded"
            >
              Keluar Latihan
            </button>
          </div>
        )}

        {children}
      </main>

      {/* ERGONOMIC FLOATING BOTTOM DOCK (Mobile < 768px) */}
      {!isKeyboardOpen && (
        <nav 
          aria-label="Navigasi Bawah Mobile"
          className="no-print md:hidden fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom)] bg-white/95 backdrop-blur-xl border-t-2 border-zinc-900 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] select-none"
        >
          <div className="flex items-center justify-around px-2 h-16 relative max-w-lg mx-auto">
            {/* 1. Beranda */}
            <Link
              href="/dashboard"
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-[10px] font-bold transition-all active:scale-95 ${
                pathname === '/dashboard' ? 'text-zinc-950 font-black' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <div className={`p-1 rounded-lg transition-colors ${pathname === '/dashboard' ? 'bg-[#CCFF00]/30' : ''}`}>
                <Home size={20} className={pathname === '/dashboard' ? 'stroke-[2.5]' : 'stroke-2'} />
              </div>
              <span className="font-sans">Beranda</span>
            </Link>

            {/* 2. Produk */}
            <Link
              href="/products"
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-[10px] font-bold transition-all active:scale-95 ${
                pathname.startsWith('/products') ? 'text-zinc-950 font-black' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <div className={`p-1 rounded-lg transition-colors ${pathname.startsWith('/products') ? 'bg-[#CCFF00]/30' : ''}`}>
                <Package size={20} className={pathname.startsWith('/products') ? 'stroke-[2.5]' : 'stroke-2'} />
              </div>
              <span className="font-sans">Produk</span>
            </Link>

            {/* 3. HERO: KASIR (Elevated Neon Button) */}
            <Link
              href="/pos"
              className="flex flex-col items-center justify-center -translate-y-3 px-2 focus:outline-none group active:scale-95"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#CCFF00] border-2 border-zinc-900 shadow-[3px_3px_0px_#1E293B] flex items-center justify-center text-zinc-950 transition-all duration-150 group-hover:scale-105">
                <ShoppingCart size={24} className="stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-black uppercase text-zinc-950 tracking-wider mt-0.5 bg-white/95 px-2 py-0.5 rounded-full border border-zinc-400 shadow-sm font-sans">
                KASIR
              </span>
            </Link>

            {/* 4. Transaksi */}
            <Link
              href="/transactions"
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-[10px] font-bold transition-all active:scale-95 ${
                pathname.startsWith('/transactions') ? 'text-zinc-950 font-black' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <div className={`p-1 rounded-lg transition-colors ${pathname.startsWith('/transactions') ? 'bg-[#CCFF00]/30' : ''}`}>
                <Receipt size={20} className={pathname.startsWith('/transactions') ? 'stroke-[2.5]' : 'stroke-2'} />
              </div>
              <span className="font-sans">Transaksi</span>
            </Link>

            {/* 5. Lainnya (Slide-Up Drawer Trigger) */}
            <button
              type="button"
              onClick={() => setIsQuickActionOpen(true)}
              className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-[10px] font-bold text-zinc-500 hover:text-zinc-800 transition-all active:scale-95 cursor-pointer"
            >
              <div className="p-1 rounded-lg hover:bg-zinc-100">
                <Menu size={20} className="stroke-2" />
              </div>
              <span className="font-sans">Lainnya</span>
            </button>
          </div>
        </nav>
      )}

      {/* BOTTOM SHEET MODAL (SLIDE-UP DRAWER "LAINNYA") */}
      {isQuickActionOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/50 backdrop-blur-sm p-4 sm:p-8 animate-fade-in"
          onClick={() => setIsQuickActionOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-white/95 backdrop-blur-2xl border-2 border-slate-800 shadow-[6px_6px_0px_#1E293B] rounded-2xl p-6 space-y-4 animate-slide-up max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 sticky top-0 bg-white/95 z-10 pt-1">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-[#CCFF00] border border-slate-800" />
                <h3 className="text-lg font-extrabold text-slate-900 font-sans">Menu &amp; Fitur Tambahan</h3>
              </div>
              <button 
                onClick={() => setIsQuickActionOpen(false)} 
                className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 hover:text-slate-900 font-bold flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Pelanggan */}
              <button
                onClick={() => { setIsQuickActionOpen(false); router.push('/customers'); }}
                className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-white border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] rounded-xl transition-all group min-h-[56px] cursor-pointer active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 text-slate-900 flex items-center justify-center font-extrabold shrink-0">
                    <Users size={20} className="text-amber-800" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-900">Catat Kasbon &amp; Pelanggan</p>
                    <p className="text-[11px] text-slate-500 font-medium">Kelola hutang piutang &amp; satpam WA</p>
                  </div>
                </div>
                <span className="text-sm font-extrabold text-slate-900 group-hover:translate-x-1 transition-transform">➔</span>
              </button>

              {/* Laporan */}
              <button
                onClick={() => { setIsQuickActionOpen(false); router.push('/reporting'); }}
                className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-white border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] rounded-xl transition-all group min-h-[56px] cursor-pointer active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-300 text-slate-900 flex items-center justify-center font-extrabold shrink-0">
                    <FileText size={20} className="text-purple-800" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-900">Laporan Rekap Keuangan</p>
                    <p className="text-[11px] text-slate-500 font-medium">Omzet harian, laba rugi, &amp; unduh PDF</p>
                  </div>
                </div>
                <span className="text-sm font-extrabold text-slate-900 group-hover:translate-x-1 transition-transform">➔</span>
              </button>

              {/* Billing */}
              <button
                onClick={() => { setIsQuickActionOpen(false); router.push('/billing'); }}
                className="w-full flex items-center justify-between p-3 bg-[#CCFF00]/40 hover:bg-[#CCFF00]/60 border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] rounded-xl transition-all group min-h-[56px] cursor-pointer active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-[#CCFF00] flex items-center justify-center font-extrabold shrink-0">
                    <CreditCard size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-extrabold text-slate-900">Kontrak Langganan Toko</p>
                    <p className="text-[11px] text-slate-800 font-medium">Status paket, tagihan, &amp; upgrade</p>
                  </div>
                </div>
                <span className="text-sm font-extrabold text-slate-900 group-hover:translate-x-1 transition-transform">➔</span>
              </button>

              {/* Pengaturan */}
              <button
                onClick={() => { setIsQuickActionOpen(false); router.push('/settings'); }}
                className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-white border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] rounded-xl transition-all group min-h-[56px] cursor-pointer active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-300 text-slate-900 flex items-center justify-center font-extrabold shrink-0">
                    <Settings size={20} className="text-blue-800" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-900">Pengaturan Toko</p>
                    <p className="text-[11px] text-slate-500 font-medium">Printer thermal, profil toko, &amp; kasir</p>
                  </div>
                </div>
                <span className="text-sm font-extrabold text-slate-900 group-hover:translate-x-1 transition-transform">➔</span>
              </button>

              {/* Bantuan */}
              <button
                onClick={() => { setIsQuickActionOpen(false); router.push('/help'); }}
                className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-white border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] rounded-xl transition-all group min-h-[56px] cursor-pointer active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 text-slate-900 flex items-center justify-center font-extrabold shrink-0">
                    <HelpCircle size={20} className="text-emerald-800" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-900">Pusat Bantuan</p>
                    <p className="text-[11px] text-slate-500 font-medium">Panduan pemakaian &amp; CS WhatsApp</p>
                  </div>
                </div>
                <span className="text-sm font-extrabold text-slate-900 group-hover:translate-x-1 transition-transform">➔</span>
              </button>

              {/* Keluar */}
              <button
                onClick={() => {
                  setIsQuickActionOpen(false);
                  setIsLogoutConfirmOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 p-3 bg-slate-900 text-white hover:bg-slate-800 border-2 border-slate-900 font-mono text-xs font-bold uppercase rounded-xl transition-all min-h-[48px] cursor-pointer active:scale-98 mt-2"
              >
                <LogOut size={16} /> KELUAR SISTEM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Log Out Confirmation Modal */}
      <ConfirmModal
        isOpen={isLogoutConfirmOpen}
        title="Konfirmasi Keluar"
        message="Apakah Bapak/Ibu yakin ingin keluar dari aplikasi 2ndManager?"
        onConfirm={confirmLogout}
        onCancel={() => setIsLogoutConfirmOpen(false)}
        confirmLabel="YA, KELUAR"
        cancelLabel="BATAL"
      />

      {/* Custom Exit Tutorial Confirmation Modal */}
      <ConfirmModal
        isOpen={isExitTutorialConfirmOpen}
        title="Keluar Latihan"
        message="Apakah Bapak/Ibu yakin ingin keluar dari Mode Latihan? Progress latihan saat ini tidak akan disimpan."
        onConfirm={() => window.location.reload()}
        onCancel={() => setIsExitTutorialConfirmOpen(false)}
        confirmLabel="YA, KELUAR"
        cancelLabel="BATAL"
      />

      {/* Billing Chokehold Lockout Overlay */}
      {chokeholdLock?.active && (
        <div className="fixed inset-0 z-[9999] bg-zinc-950/95 backdrop-blur-2xl flex items-center justify-center p-6 text-center font-sans select-none animate-fadeIn">
          <div className="max-w-md w-full bg-zinc-900 border-2 border-red-700 rounded-2xl p-6 space-y-4 shadow-[0_20px_60px_rgba(227,0,34,0.3)]">
            <div className="w-14 h-14 rounded-xl bg-[#E30022] text-white flex items-center justify-center mx-auto border-2 border-red-500 shadow-[0_0_20px_rgba(227,0,34,0.6)]">
              <ShieldAlert size={28} />
            </div>

            <div className="space-y-1">
              <span className="font-mono text-[11px] font-black text-red-400 uppercase tracking-widest block">
                [ BILLING CHOKEHOLD ACTIVE ]
              </span>
              <h2 className="font-heading font-black text-xl text-white uppercase tracking-tight">
                Akses Toko Terkunci Sementara
              </h2>
              <p className="text-xs text-zinc-400 font-mono pt-1 leading-relaxed">
                {chokeholdLock.reason || 'Tagihan langganan telah melampaui batas toleransi masa tenggang.'}
              </p>
            </div>

            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-300 font-mono space-y-1 text-left">
              <p className="text-zinc-400">• Transaksi kasir &amp; navigasi toko dinonaktifkan sementara.</p>
              <p className="text-zinc-400">• Hubungi pemilik toko atau CS 2ndManager untuk penyelesaian.</p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Link
                href="/billing"
                className="w-full py-2.5 rounded-xl bg-[#CCFF00] hover:bg-[#b3e600] text-black font-black text-xs transition-colors flex items-center justify-center"
              >
                SELESAIKAN TAGIHAN LANGGANAN
              </Link>
              <a
                href="https://wa.me/6281234567890?text=Halo%20Admin%2C%20toko%20saya%20terkunci%20Chokehold.%20Mohon%20bantuannya."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition-colors flex items-center justify-center"
              >
                Hubungi Layanan Bantuan CS
              </a>
            </div>
          </div>
        </div>
      )}

      <SetupWizard
        isOpen={isWizardOpen}
        onClose={() => {
          localStorage.setItem('hl_wizard_dismissed', 'true');
          setIsWizardOpen(false);
        }}
        onFinish={handleFinishWizard}
      />
    </div>
  );
}

export default function AuthenticatedLayout({ children }) {
  return (
    <TutorialProvider>
      <AuthenticatedLayoutInner>{children}</AuthenticatedLayoutInner>
    </TutorialProvider>
  );
}
