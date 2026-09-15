import {
  Activity,
  CreditCard,
  Tag,
  Store,
  LifeBuoy,
  Layers,
  ShieldAlert,
  FileLock2,
  Users,
} from 'lucide-react';

export const ADMIN_NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Platform Pulse', icon: Activity, shortcut: 'Alt+1' },
  { href: '/admin/claims', label: 'Audit Klaim Bayar', icon: CreditCard, shortcut: 'Alt+7', badgeKey: 'pendingProofs' },
  { href: '/admin/promos', label: 'Mesin Kode Promo', icon: Tag, shortcut: 'Alt+8' },
  { href: '/admin/branches', label: 'Topologi Cabang', icon: Store, shortcut: 'Alt+9' },
  { href: '/admin/cashiers', label: 'Kelola Staf Kasir', icon: Users, shortcut: 'Alt+0' },
  { href: '/admin/tenants', label: 'Tenants & Billing', icon: Store, shortcut: 'Alt+2' },
  { href: '/admin/panic-dispatch', label: 'Panic Dispatch', icon: LifeBuoy, shortcut: 'Alt+3' },
  { href: '/admin/categories-master', label: 'Master Kategori', icon: Layers, shortcut: 'Alt+4' },
  { href: '/admin/fraud-radar', label: 'Radar Anomali', icon: ShieldAlert, shortcut: 'Alt+5' },
  { href: '/admin/audit-logs', label: 'Audit Trail Ledger', icon: FileLock2, shortcut: 'Alt+6' },
];
