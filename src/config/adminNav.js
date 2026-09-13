// src/config/adminNav.js
import { 
  LayoutDashboard, 
  Receipt, 
  ShieldAlert, 
  Package, 
  Truck, 
  Calculator, 
  Scale, 
  FileCheck, 
  Store, 
  CreditCard, 
  KeyRound, 
  Building2, 
  Activity,
  FileLock2,
  LifeBuoy
} from 'lucide-react';

export const OWNER_NAV_SECTIONS = [
  {
    title: 'OPERASIONAL & KASIR',
    items: [
      { label: 'KONTROL UTAMA', href: '/admin', icon: LayoutDashboard },
      { label: 'MONITOR TRANSAKSI', href: '/admin/transactions', icon: Receipt },
      { label: 'RADAR KEAMANAN', href: '/radar', icon: ShieldAlert },
    ],
  },
  {
    title: 'INVENTARIS & CABANG',
    items: [
      { label: 'MASTER STOK PRODUK', href: '/admin/inventory', icon: Package },
      { label: 'MUTASI ANTAR-CABANG', href: '/transfers', icon: Truck },
    ],
  },
  {
    title: 'KEUANGAN & LEGALITAS',
    items: [
      { label: 'PAJAK PP 55/2022', href: '/reports/tax', icon: Calculator },
      { label: 'LAPORAN SAK EMKM', href: '/reports/financials', icon: Scale },
      { label: 'BERKAS KUR BANK', href: '/reports/kur-dossier', icon: FileCheck },
    ],
  },
  {
    title: 'ORGANISASI & LISENSI',
    items: [
      { label: 'PENGATURAN CABANG', href: '/admin/branches', icon: Store },
      { label: 'BILLING & VOUCHER', href: '/billing', icon: CreditCard },
    ],
  },
];

export const SUPERADMIN_NAV_SECTION = {
  title: 'PLATFORM OPERATIONS',
  items: [
    { label: 'VOUCHER MINTING', href: '/admin/vouchers', icon: KeyRound },
    { label: 'MANAJEMEN TENANT', href: '/admin/tenants', icon: Building2 },
    { label: 'TRIAGE DARURAT WA', href: '/admin/panic-dispatch', icon: LifeBuoy },
    { label: 'VERIFIKASI TRANSFER', href: '/admin/payment-proofs', icon: CreditCard },
    { label: 'RADAR ANOMALI KASIR', href: '/admin/fraud-radar', icon: ShieldAlert },
    { label: 'IMMUTABLE AUDIT TRAIL', href: '/admin/audit-logs', icon: FileLock2 },
  ],
};

export function getFilteredNavSections(user, profile) {
  const superadminEmails = (process.env.NEXT_PUBLIC_SUPERADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'ahza201111@gmail.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const emailMatch = user?.email && superadminEmails.includes(user.email.toLowerCase());
  const roleMatch = profile?.role === 'SUPERADMIN' || user?.app_metadata?.is_platform_admin === true;
  const isPlatformAdmin = Boolean(emailMatch || roleMatch);

  const sections = [...OWNER_NAV_SECTIONS];
  if (isPlatformAdmin) {
    sections.push(SUPERADMIN_NAV_SECTION);
  }

  return { sections, isPlatformAdmin };
}
