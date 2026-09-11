"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Users, Package, FileText, HelpCircle, LogOut, Settings, ClipboardList, MessageCircle } from 'lucide-react';
import { api } from '@/utils/api';
import { useTutorial } from '@/components/TutorialEngine';
import ConfirmModal from '@/components/ConfirmModal';
import dynamic from 'next/dynamic';

const SetupWizard = dynamic(() => import('@/components/SetupWizard'), {
  ssr: false,
});

export default function AuthenticatedLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState(() => api.getCurrentSession());
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isExitTutorialConfirmOpen, setIsExitTutorialConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const { registerTrigger, activeTutorial } = useTutorial();

  useEffect(() => {
    async function checkEmptyState() {
      try {
        const products = await api.getProducts();
        const dismissed = localStorage.getItem('hl_wizard_dismissed') === 'true';
        if (products.length === 0 && !dismissed) {
          setIsWizardOpen(true);
        }
      } catch (err) {
        console.error(err);
      }
    }
    if (session) {
      checkEmptyState();
    }
  }, [session]);

  useEffect(() => {
    const handleOpenWizard = () => {
      setIsWizardOpen(true);
    };
    const handleUsernameChange = () => {
      setSession(api.getCurrentSession());
    };
    window.addEventListener('open-setup-wizard', handleOpenWizard);
    window.addEventListener('hl-username-changed', handleUsernameChange);
    return () => {
      window.removeEventListener('open-setup-wizard', handleOpenWizard);
      window.removeEventListener('hl-username-changed', handleUsernameChange);
    };
  }, []);

  const handleFinishWizard = () => {
    localStorage.setItem('hl_wizard_dismissed', 'true');
    setIsWizardOpen(false);
    router.push('/transactions/new');
  };

  useEffect(() => {
    const checkSessionExpiration = () => {
      const currentSession = api.getCurrentSession();
      if (!currentSession) {
        router.push('/login');
        return true;
      }
      return false;
    };

    checkSessionExpiration();
    setTimeout(() => {
      setIsLoading(false);
    }, 0);

    const interval = setInterval(() => {
      checkSessionExpiration();
    }, 15000);

    return () => clearInterval(interval);
  }, [router]);

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
    await api.logout();
    router.push('/login');
  };

  if (isLoading || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm font-semibold">
        Memvalidasi Sesi Masuk...
      </div>
    );
  }

  const navItems = [
    { href: '/dashboard', label: 'Beranda', icon: Home, id: 'tour-nav-dashboard' },
    { href: '/customers', label: 'Pelanggan', icon: Users, id: 'tour-nav-customers' },
    { href: '/products', label: 'Produk', icon: Package, id: 'tour-nav-products' },
    { href: '/stok-opname', label: 'Stok Opname', icon: ClipboardList, id: 'tour-nav-stok-opname' },
    { href: '/reporting', label: 'Laporan', icon: FileText, id: 'tour-nav-laporan' },
    { href: '/help', label: 'Bantuan', icon: HelpCircle, id: 'tour-nav-help' },
    { href: '/whatsapp', label: 'WhatsApp', icon: MessageCircle, id: 'tour-nav-whatsapp' },
    { href: '/settings', label: 'Pengaturan', icon: Settings, id: 'tour-nav-settings' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row p-0 lg:p-4 gap-4 pb-28 lg:pb-0">
      {/* DESKTOP SIDEBAR */}
      <aside className="no-print hidden lg:flex flex-col w-[280px] bg-[#3D1A0F] border border-[#4E271B] rounded-3xl p-6 space-y-6 flex-shrink-0 shadow-xl justify-between">
        <div className="space-y-6">
          <div className="py-4 border-b border-[#4E271B]">
            <h2 className="text-2xl font-extrabold tracking-tight text-white font-heading">HL Manager</h2>
            <span className="text-[10px] text-cta font-bold tracking-wider uppercase opacity-95">Sistem Pembukuan Pro</span>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  id={item.id}
                  href={item.href}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-base font-bold transition-all duration-300 ${
                    isActive 
                      ? 'bg-cta text-white shadow-md shadow-cta/20' 
                      : 'text-amber-100/70 hover:bg-white/10 hover:text-white hover:translate-x-1'
                  }`}
                >
                  <Icon size={20} /> {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-[#4E271B] space-y-4">
          <div className="flex items-center gap-2.5 px-2 text-xs text-amber-100/70 font-bold">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Operator: <strong className="text-white">{session.username}</strong></span>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-rose-300 hover:bg-rose-950/30 rounded-2xl text-base font-bold transition-all duration-300 cursor-pointer"
          >
            <LogOut size={20} /> Keluar (Logout)
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <header className="no-print lg:hidden h-16 bg-[#3D1A0F] border-b border-[#4E271B] shadow-sm px-4 flex items-center justify-between z-30 sticky top-0">
        <h2 className="text-base font-extrabold text-white font-heading">HL Manager Pro</h2>
        <div className="flex items-center gap-1">
          <Link
            id="tour-nav-stok-opname-mobile"
            href="/stok-opname"
            className={`p-2 rounded-xl transition-all ${
              pathname.startsWith('/stok-opname') ? 'text-cta bg-white/10' : 'text-amber-100/70 hover:bg-white/5'
            }`}
            title="Stok Opname"
          >
            <ClipboardList size={20} />
          </Link>
          <Link
            id="tour-nav-help"
            href="/help"
            className={`p-2 rounded-xl transition-all ${
              pathname.startsWith('/help') ? 'text-cta bg-white/10' : 'text-amber-100/70 hover:bg-white/5'
            }`}
            title="Bantuan"
          >
            <HelpCircle size={20} />
          </Link>
          <Link
            id="tour-nav-whatsapp"
            href="/whatsapp"
            className={`p-2 rounded-xl transition-all ${
              pathname.startsWith('/whatsapp') ? 'text-cta bg-white/10' : 'text-amber-100/70 hover:bg-white/5'
            }`}
            title="WhatsApp"
          >
            <MessageCircle size={20} />
          </Link>
          <Link
            id="tour-nav-settings"
            href="/settings"
            className={`p-2 rounded-xl transition-all ${
              pathname.startsWith('/settings') ? 'text-cta bg-white/10' : 'text-amber-100/70 hover:bg-white/5'
            }`}
            title="Pengaturan"
          >
            <Settings size={20} />
          </Link>
          <button 
            onClick={handleLogout}
            className="p-2 text-rose-300 hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer"
            title="Keluar"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto bg-white/50 lg:bg-white border border-transparent lg:border-gray-250/20 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
        {activeTutorial && (
          <div className="no-print bg-primary text-white px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between mb-6 animate-slide-in sticky top-0 lg:top-4 z-40">
            <div className="flex items-center gap-2">
              <span className="animate-ping w-2.5 h-2.5 bg-cta rounded-full" />
              <p className="text-xs font-bold font-mono">
                Mode Latihan Aktif: <span className="underline">{activeTutorial.steps[activeTutorial.currentStep].title}</span>
              </p>
            </div>
            <button 
              onClick={() => setIsExitTutorialConfirmOpen(true)}
              className="text-xs font-black bg-white/20 hover:bg-white/35 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
            >
              Keluar Latihan
            </button>
          </div>
        )}

        {children}
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="no-print lg:hidden fixed bottom-4 left-4 right-4 h-20 bg-[#3D1A0F]/95 backdrop-blur-md border border-[#4E271B] rounded-3xl shadow-xl flex items-center justify-around px-2 z-[40]">
        {navItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              id={item.id}
              href={item.href}
              className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl gap-1 text-[11px] font-bold transition-all duration-300 ${
                isActive ? 'text-cta' : 'text-amber-100/60'
              }`}
            >
              <Icon size={22} /> {item.label}
            </Link>
          );
        })}

        {/* Float action for Bon Baru */}
        <Link
          id="tour-nav-bon-baru"
          href="/transactions/new"
          className="flex flex-col items-center justify-center w-14 h-14 bg-cta text-white rounded-full shadow-lg transform -translate-y-4 border-4 border-[#3D1A0F] transition-all duration-300 active:scale-95 hover:scale-105"
        >
          <span className="text-2xl font-black">+</span>
        </Link>

        {navItems.slice(2, 4).map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              id={item.id}
              href={item.href}
              className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl gap-1 text-[11px] font-bold transition-all duration-300 ${
                isActive ? 'text-cta' : 'text-amber-100/60'
              }`}
            >
              <Icon size={22} /> {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Custom Log Out Confirmation Modal */}
      <ConfirmModal
        isOpen={isLogoutConfirmOpen}
        title="Konfirmasi Keluar"
        message="Apakah Bapak/Ibu yakin ingin keluar dari aplikasi HL Manager Pro?"
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
