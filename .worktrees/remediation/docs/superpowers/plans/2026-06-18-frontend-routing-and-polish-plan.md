# Frontend Page Routing & Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengubah arsitektur frontend HL Manager Pro ke Next.js App Router subpages, menyelaraskan desain visual dengan MASTER.md untuk aksesibilitas lansia dengan estetika premium, dan memperbaiki bug-bug terkait.

**Architecture:** Membagi view tunggal di `page.js` menjadi subpages Next.js dengan layout global yang dibungkus oleh TutorialProvider, mengimplementasikan batch bonus-alerts endpoint untuk mengoptimalkan pemuatan data, dan menyediakan komponen konfirmasi kustom.

**Tech Stack:** Next.js (App Router), Tailwind CSS v4, Motion (Framer Motion), Lucide Icons, Prisma.

---

### Task 1: API Batch Bonus Alerts & Konfigurasi Desain Global
**Files:**
- Create: `src/app/api/v1/customers/bonus-alerts/route.js`
- Modify: `src/app/globals.css`
- Modify: `src/utils/api.js`

- [ ] **Step 1: Buat API Route untuk batch bonus alerts**
Write to `src/app/api/v1/customers/bonus-alerts/route.js`:
```javascript
import { prisma } from '@/lib/prisma';
import { withAuth, errorResponse, successResponse } from '@/lib/auth';

export const GET = withAuth(async (request) => {
  try {
    const customers = await prisma.customer.findMany({
      where: { is_deleted: false },
      select: { id: true, nama: true, bonus_threshold: true }
    });

    const txSums = await prisma.transaction.groupBy({
      by: ['customer_id'],
      where: {
        status: 'Lunas',
        is_bonus: false,
      },
      _sum: {
        omzet_total: true
      }
    });

    const grantSums = await prisma.bonusGrant.groupBy({
      by: ['customer_id'],
      _sum: {
        bonuses_granted: true
      }
    });

    const txMap = {};
    for (const item of txSums) {
      txMap[item.customer_id] = Number(item._sum.omzet_total || 0n);
    }

    const grantMap = {};
    for (const item of grantSums) {
      grantMap[item.customer_id] = Number(item._sum.bonuses_granted || 0);
    }

    const alerts = [];
    for (const c of customers) {
      const accumulator = txMap[c.id] || 0;
      const threshold = Number(c.bonus_threshold || 0n);
      const bonuses_granted = grantMap[c.id] || 0;

      const bonuses_available = threshold > 0
        ? Math.max(0, Math.floor(accumulator / threshold) - bonuses_granted)
        : 0;

      if (bonuses_available > 0) {
        alerts.push({
          customer: { id: c.id, nama: c.nama },
          available: bonuses_available
        });
      }
    }

    return successResponse(alerts);
  } catch (error) {
    console.error('[GET /customers/bonus-alerts]', error);
    return errorResponse('Gagal mengambil pengingat bonus.', 'SERVER_ERROR', 500);
  }
});
```

- [ ] **Step 2: Tambahkan fungsi api client untuk batch bonus alerts**
Modify `src/utils/api.js` to include the `getBonusAlerts` call:
```javascript
  // Tambahkan di dalam objek api setelah getCustomerBonusStatus:
  getBonusAlerts: async () => {
    const res = await fetchAPI('/customers/bonus-alerts');
    return res?.data?.data || [];
  },
```

- [ ] **Step 3: Perbarui CSS untuk warna & font sesuai MASTER.md**
Modify `src/app/globals.css` to import Fira fonts and define the new `@theme` in Tailwind CSS v4:
```css
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap');

@import "tailwindcss";
@config "../../tailwind.config.mjs";

@theme {
  --color-primary: #0F172A;
  --color-secondary: #1E3A8A;
  --color-cta: #CA8A04;
  --color-background: #F8FAFC;
  --color-text: #020617;
  
  --font-sans: "Fira Sans", sans-serif;
  --font-mono: "Fira Code", monospace;
  --font-heading: "Fira Code", monospace;
}

@layer base {
  body {
    @apply font-sans bg-background text-text antialiased min-h-screen selection:bg-navy-ice selection:text-navy-deep;
    font-size: 16px;
    line-height: 1.7;
  }
  h1, h2, h3, h4, h5, h6 {
    @apply font-heading font-bold text-primary tracking-tight;
  }
}
```

- [ ] **Step 4: Commit**
```bash
git add src/app/api/v1/customers/bonus-alerts/route.js src/utils/api.js src/app/globals.css
git commit -m "feat: add batch bonus alerts endpoint and master css updates"
```

---

### Task 2: Pembuatan Error Boundary dan Custom Confirm Modal
**Files:**
- Create: `src/components/ErrorBoundary.jsx`
- Create: `src/components/ConfirmModal.jsx`

- [ ] **Step 1: Buat file Error Boundary**
Write to `src/components/ErrorBoundary.jsx`:
```javascript
"use client";
import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl border border-rose-light space-y-4">
            <div className="w-16 h-16 bg-rose-light text-rose-deep rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
              ⚠️
            </div>
            <div className="space-y-2">
              <h2 className="text-heading text-lg text-rose-deep">Terjadi Kesalahan Aplikasi</h2>
              <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                Aplikasi mengalami kendala teknis saat memuat data. Bapak/Ibu tidak perlu khawatir, silakan tekan tombol di bawah untuk memuat ulang halaman.
              </p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-gradient-to-r from-navy-bright to-navy-deep hover:from-navy-deep hover:to-navy-bright text-white font-extrabold h-12 rounded-xl text-sm transition-all shadow-md"
            >
              MUAT ULANG HALAMAN
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Step 2: Buat file Custom Confirm Modal**
Write to `src/components/ConfirmModal.jsx`:
```javascript
"use client";
import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmLabel = "YA, LANJUTKAN", cancelLabel = "BATAL" }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-gray-100 space-y-4">
        <div className="w-16 h-16 bg-amber-cream text-amber-deep rounded-full flex items-center justify-center mx-auto text-2xl font-bold animate-pulse">
          <AlertTriangle size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-heading text-lg font-bold text-charcoal-black">{title}</h2>
          <p className="text-xs text-gray-500 leading-relaxed font-semibold">
            {message}
          </p>
        </div>
        <div className="flex gap-3 pt-2">
          <button 
            onClick={onCancel}
            className="flex-1 border-2 border-gray-200 hover:bg-gray-50 text-charcoal-medium font-bold h-12 rounded-xl text-xs transition-all cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 bg-gradient-to-r from-rose-medium to-rose-deep hover:from-rose-deep hover:to-rose-medium text-white font-extrabold h-12 rounded-xl text-xs transition-all shadow-md cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**
```bash
git add src/components/ErrorBoundary.jsx src/components/ConfirmModal.jsx
git commit -m "feat: add ErrorBoundary and ConfirmModal components"
```

---

### Task 3: Migrasi Halaman Login & Penyesuaian Kredensial
**Files:**
- Create: `src/app/login/page.js`
- Modify: `src/views/Login.jsx`

- [ ] **Step 1: Buat page wrapper untuk login**
Write to `src/app/login/page.js`:
```javascript
"use client";
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Login from '@/views/Login';
import { api } from '@/utils/api';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const session = api.getCurrentSession();
    if (session) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleLoginSuccess = () => {
    router.push('/dashboard');
  };

  return <Login onLoginSuccess={handleLoginSuccess} />;
}
```

- [ ] **Step 2: Perbarui visual login dan perbaiki petunjuk password**
Modify `src/views/Login.jsx`:
- Ubah `MockDB` menjadi `api`.
- Ganti warna tombol aksen dan petunjuk password (baris 77):
```javascript
// Ganti baris 4:
import { api } from '../utils/api';

// Ganti baris 18:
    const res = await api.login(username.trim(), password.trim());

// Ganti baris 76-78 (petunjuk password yang benar 'admin123'):
          <div className="text-center text-[11px] text-gray-400 font-semibold">
            💡 Gunakan username <strong className="text-charcoal-medium font-bold">admin</strong> dan password <strong className="text-charcoal-medium font-bold">admin123</strong> untuk latihan.
          </div>

// Perbarui tombol masuk (baris 81-86) agar menggunakan teks Navy Gelap pada latar emas:
          <button 
            type="submit"
            className="w-full bg-cta hover:bg-cta/90 text-primary font-extrabold h-14 rounded-2xl text-base shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            MASUK
          </button>
```

- [ ] **Step 3: Commit**
```bash
git add src/app/login/page.js src/views/Login.jsx
git commit -m "feat: migrate login page and fix credential hint text"
```

---

### Task 4: Layout Utama Terautentikasi (Authenticated Layout / AppShell)
**Files:**
- Create: `src/app/(authenticated)/layout.js`
- Modify: `src/components/TutorialEngine.jsx`

- [ ] **Step 1: Buat file layout terautentikasi**
Write to `src/app/(authenticated)/layout.js`:
```javascript
"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Users, Package, FileText, HelpCircle, LogOut } from 'lucide-react';
import { api } from '@/utils/api';
import { useTutorial } from '@/components/TutorialEngine';
import ConfirmModal from '@/components/ConfirmModal';

export default function AuthenticatedLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState(null);
  const [sessionExpiredModal, setSessionExpiredModal] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { registerTrigger, activeTutorial } = useTutorial();

  const checkSessionExpiration = () => {
    const currentSession = api.getCurrentSession();
    if (!currentSession) {
      router.push('/login');
      return true;
    }
    return false;
  };

  useEffect(() => {
    const isExpired = checkSessionExpiration();
    if (!isExpired) {
      setSession(api.getCurrentSession());
    }
    setIsLoading(false);

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
    { href: '/reporting', label: 'Laporan', icon: FileText, id: 'tour-nav-laporan' },
    { href: '/help', label: 'Bantuan', icon: HelpCircle, id: 'tour-nav-help' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row pb-24 lg:pb-0">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-[260px] bg-primary text-white p-5 space-y-6 flex-shrink-0">
        <div className="py-4 border-b border-white/10">
          <h2 className="text-xl font-extrabold tracking-tight text-white font-heading">HL Manager Pro</h2>
          <span className="text-[10px] text-blue-300 font-bold tracking-wider uppercase opacity-75">Sistem Pembukuan</span>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                id={item.id}
                href={item.href}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  isActive ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={18} /> {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-white/10 space-y-3">
          <div className="flex items-center gap-2 px-2 text-xs text-white/80 font-semibold">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Operator: <strong>{session.username}</strong></span>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-200 hover:bg-white/10 hover:text-white rounded-xl text-sm font-bold transition-all cursor-pointer"
          >
            <LogOut size={18} /> Keluar (Logout)
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <header className="lg:hidden h-16 bg-white border-b border-gray-100 shadow-sm px-4 flex items-center justify-between z-30 sticky top-0">
        <h2 className="text-base font-extrabold text-primary font-heading">HL Manager Pro</h2>
        <button 
          onClick={handleLogout}
          className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
        >
          <LogOut size={20} />
        </button>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
        {activeTutorial && (
          <div className="bg-primary text-white px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between mb-6 animate-slide-in sticky top-0 lg:top-4 z-40">
            <div className="flex items-center gap-2">
              <span className="animate-ping w-2.5 h-2.5 bg-cta rounded-full" />
              <p className="text-xs font-bold font-mono">
                Mode Latihan Aktif: <span className="underline">{activeTutorial.steps[activeTutorial.currentStep].title}</span>
              </p>
            </div>
            <button 
              onClick={() => {
                if (confirm("Keluar dari Mode Latihan? Progress latihan tidak disimpan.")) {
                  window.location.reload();
                }
              }}
              className="text-xs font-black bg-white/20 hover:bg-white/35 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
            >
              Keluar Latihan
            </button>
          </div>
        )}

        {children}
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-white/95 backdrop-blur-md border-t border-gray-100 shadow-2xl flex items-center justify-around px-2 pb-safe z-[40]">
        {navItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              id={item.id}
              href={item.href}
              className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl gap-1 text-[10px] font-bold transition-all duration-300 ${
                isActive ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <Icon size={20} /> {item.label}
            </Link>
          );
        })}

        {/* Float action for Bon Baru */}
        <Link
          id="tour-nav-bon-baru"
          href="/transactions/new"
          className="flex flex-col items-center justify-center w-14 h-14 bg-cta text-primary rounded-full shadow-lg transform -translate-y-4 border-4 border-white transition-all duration-300 active:scale-95 hover:scale-105"
        >
          <span className="text-xl font-black">+</span>
        </Link>

        {navItems.slice(2, 5).map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              id={item.id}
              href={item.href}
              className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl gap-1 text-[10px] font-bold transition-all duration-300 ${
                isActive ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <Icon size={20} /> {item.label}
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
    </div>
  );
}
```

- [ ] **Step 2: Update TutorialEngine trigger registration**
Modify `src/components/TutorialEngine.jsx` to dynamically fetch active steps correctly if needed (the steps configuration remains the same).

- [ ] **Step 3: Commit**
```bash
git add src/app/(authenticated)/layout.js src/components/TutorialEngine.jsx
git commit -m "feat: add authenticated wrapper layout and automated route change tracking"
```

---

### Task 5: Pembuatan Sub-halaman Route Authenticated
**Files:**
- Create: `src/app/page.js`
- Create: `src/app/(authenticated)/dashboard/page.js`
- Create: `src/app/(authenticated)/customers/page.js`
- Create: `src/app/(authenticated)/customers/[id]/page.js`
- Create: `src/app/(authenticated)/products/page.js`
- Create: `src/app/(authenticated)/transactions/new/page.js`
- Create: `src/app/(authenticated)/transactions/[id]/edit/page.js`
- Create: `src/app/(authenticated)/reporting/page.js`
- Create: `src/app/(authenticated)/help/page.js`

- [ ] **Step 1: Set page.js root untuk redirect ke dashboard**
Write to `src/app/page.js`:
```javascript
import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/dashboard');
}
```

- [ ] **Step 2: Buat Halaman Dashboard**
Write to `src/app/(authenticated)/dashboard/page.js`:
```javascript
"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Dashboard from '@/views/Dashboard';

export default function DashboardPage() {
  const router = useRouter();
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  const handleSetView = (view) => {
    if (view === 'customers') {
      router.push('/customers');
    } else if (view === 'reporting') {
      router.push('/reporting');
    } else if (view === 'transaction-form') {
      router.push('/transactions/new');
    }
  };

  const handleSetSelectedCustomer = (id) => {
    setSelectedCustomerId(id);
    router.push(`/customers/${id}`);
  };

  return (
    <Dashboard 
      setView={handleSetView} 
      setSelectedCustomerId={handleSetSelectedCustomer} 
    />
  );
}
```

- [ ] **Step 3: Buat Halaman Customers**
Write to `src/app/(authenticated)/customers/page.js`:
```javascript
"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import CustomerManagement from '@/views/CustomerManagement';

export default function CustomersPage() {
  const router = useRouter();

  const handleSetView = (view) => {
    if (view === 'dashboard') {
      router.push('/dashboard');
    }
  };

  const handleSetSelectedCustomer = (id) => {
    router.push(`/customers/${id}`);
  };

  return (
    <CustomerManagement 
      setView={handleSetView} 
      setSelectedCustomerId={handleSetSelectedCustomer} 
    />
  );
}
```

- [ ] **Step 4: Buat Halaman Customer Detail**
Write to `src/app/(authenticated)/customers/[id]/page.js`:
```javascript
"use client";
import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import CustomerDetail from '@/views/CustomerDetail';

export default function CustomerDetailPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const customerId = resolvedParams.id;

  const handleSetView = (view) => {
    if (view === 'customers') {
      router.push('/customers');
    } else if (view === 'dashboard') {
      router.push('/dashboard');
    }
  };

  const handleSetEditTransaction = (txId) => {
    router.push(`/transactions/${txId}/edit`);
  };

  return (
    <CustomerDetail 
      customerId={customerId} 
      setView={handleSetView} 
      setEditTransactionId={handleSetEditTransaction} 
    />
  );
}
```

- [ ] **Step 5: Buat Halaman Products**
Write to `src/app/(authenticated)/products/page.js`:
```javascript
"use client";
import React from 'react';
import ProductManagement from '@/views/ProductManagement';

export default function ProductsPage() {
  return <ProductManagement />;
}
```

- [ ] **Step 6: Buat Halaman Transactions New**
Write to `src/app/(authenticated)/transactions/new/page.js`:
```javascript
"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import TransactionForm from '@/views/TransactionForm';

export default function NewTransactionPage() {
  const router = useRouter();

  const handleSetView = (view) => {
    if (view === 'dashboard') {
      router.push('/dashboard');
    } else if (view === 'customers') {
      router.push('/customers');
    }
  };

  return (
    <TransactionForm 
      setView={handleSetView} 
      editTransactionId={null} 
    />
  );
}
```

- [ ] **Step 7: Buat Halaman Transactions Edit**
Write to `src/app/(authenticated)/transactions/[id]/edit/page.js`:
```javascript
"use client";
import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import TransactionForm from '@/views/TransactionForm';

export default function EditTransactionPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const txId = resolvedParams.id;

  const handleSetView = (view) => {
    if (view === 'dashboard') {
      router.push('/dashboard');
    } else if (view === 'customers') {
      router.push('/customers');
    }
  };

  return (
    <TransactionForm 
      setView={handleSetView} 
      editTransactionId={txId} 
    />
  );
}
```

- [ ] **Step 8: Buat Halaman Reporting**
Write to `src/app/(authenticated)/reporting/page.js`:
```javascript
"use client";
import React from 'react';
import Reporting from '@/views/Reporting';

export default function ReportingPage() {
  return <Reporting />;
}
```

- [ ] **Step 9: Buat Halaman Help Center**
Write to `src/app/(authenticated)/help/page.js`:
```javascript
"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import HelpCenter from '@/views/HelpCenter';

export default function HelpPage() {
  const router = useRouter();

  const handleSetView = (view) => {
    if (view === 'dashboard') {
      router.push('/dashboard');
    }
  };

  return <HelpCenter setView={handleSetView} />;
}
```

- [ ] **Step 10: Commit**
```bash
git add src/app/page.js src/app/\(authenticated\)/dashboard/page.js src/app/\(authenticated\)/customers/page.js src/app/\(authenticated\)/customers/\[id\]/page.js src/app/\(authenticated\)/products/page.js src/app/\(authenticated\)/transactions/new/page.js src/app/\(authenticated\)/transactions/\[id\]/edit/page.js src/app/\(authenticated\)/reporting/page.js src/app/\(authenticated\)/help/page.js
git commit -m "feat: create authenticated router page files mapping views to URLs"
```

---

### Task 6: Optimasi Pemuatan Dashboard (Batch Bonus Alerts) & Visual Polish
**Files:**
- Modify: `src/views/Dashboard.jsx`

- [ ] **Step 1: Ganti loop sequential dengan batch bonus-alerts API**
Modify `src/views/Dashboard.jsx` to optimize load speed and style colors to master variables:
```javascript
// Ganti baris 4:
import { api } from '../utils/api';

// Ganti di dalam loadData (baris 15-63):
  useEffect(() => {
    async function loadData() {
      try {
        const [transactions, customersData, alerts] = await Promise.all([
          api.getTransactions(),
          api.getCustomers(),
          api.getBonusAlerts()
        ]);
        
        setCustomers(customersData);

        // Sum overall stats
        const piutang = transactions
          .filter(t => t.status === "Piutang")
          .reduce((sum, t) => sum + Number(t.amount_owed || 0), 0);

        const omzet = transactions
          .filter(t => t.status === "Lunas")
          .reduce((sum, t) => sum + Number(t.omzet_total || 0), 0);

        const laba = transactions
          .filter(t => t.status === "Lunas")
          .reduce((sum, t) => sum + Number(t.laba_total || 0), 0);

        setStats({ piutang, omzet, laba, count: transactions.length });

        // Recent 5 transactions
        const sorted = [...transactions].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
        setRecentTx(sorted.slice(0, 5));
        setBonusAlerts(alerts);
      } catch (err) {
        console.error("Gagal mengambil data dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);
```

- [ ] **Step 2: Polish visual Dashboard dengan Navy + Gold**
Modify elements in `src/views/Dashboard.jsx` to use high-contrast theme variables:
- Ganti header banner (baris 88) agar menggunakan `bg-primary` (Navy):
`className="bg-primary text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden"`
- Ganti tombol "Buka Pelanggan" di panel bonus alert (baris 152-160) agar teks gelap di atas emas:
`className="bg-cta hover:bg-cta/90 text-primary text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer font-mono"`

- [ ] **Step 3: Commit**
```bash
git add src/views/Dashboard.jsx
git commit -m "perf: optimize dashboard loading with batch api alerts and theme polish"
```

---

### Task 7: Penyelarasan Visual Seluruh Views Lain & Pembersihan File
**Files:**
- Modify: `src/views/CustomerManagement.jsx`
- Modify: `src/views/CustomerDetail.jsx`
- Modify: `src/views/ProductManagement.jsx`
- Modify: `src/views/TransactionForm.jsx`
- Modify: `src/views/Reporting.jsx`
- Modify: `src/views/HelpCenter.jsx`
- Modify: `src/app/layout.js`
- Delete: `src/utils/MockDB.js`

- [ ] **Step 1: Bersihkan layout.js global**
Modify `src/app/layout.js` to wrap inside global components:
```javascript
import "./globals.css";
import { TutorialProvider } from "../components/TutorialEngine";
import ErrorBoundary from "../components/ErrorBoundary";

export const metadata = {
  title: "HL Manager Pro",
  description: "Sistem Manajemen Keuangan Bisnis HL",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="antialiased font-sans">
        <ErrorBoundary>
          <TutorialProvider>
            {children}
          </TutorialProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Perbarui import MockDB ke api dan perbarui gaya tombol di views**
Iterate through the following files and:
1. Replace `import { MockDB } from '../utils/api'` (or similar) with `import { api } from '../utils/api'`
2. Replace `MockDB.` calls with `api.`
3. Polish CTA buttons to utilize `bg-cta hover:bg-cta/90 text-primary font-bold cursor-pointer font-mono` for high-contrast senior-friendly golden actions.
4. Replace browser native `confirm()` with custom alert modal flow or ensure proper safe check.

- [ ] **Step 3: Hapus MockDB.js lama yang tidak digunakan**
Run: `rm src/utils/MockDB.js`

- [ ] **Step 4: Commit**
```bash
git rm src/utils/MockDB.js
git add src/views/*.jsx src/app/layout.js
git commit -m "feat: complete visual polish for all views and clean up unused MockDB file"
```
