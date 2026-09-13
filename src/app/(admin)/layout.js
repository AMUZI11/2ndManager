import React from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import CommandPalette from '@/components/admin/CommandPalette';
import AdminNotificationToast from '@/components/admin/AdminNotificationToast';

export const metadata = {
  title: 'Mission Control Hub — 2ndManager',
  description: 'Pusat Manajemen Operasional Toko, Multi-Cabang, Inventaris, dan Pengawasan Keuangan 2ndManager',
};

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased flex selection:bg-[#CCFF00] selection:text-slate-900 relative overflow-hidden">
      {/* Global Realtime Alerts Toast (Payments & Panic) */}
      <AdminNotificationToast />

      {/* Global Command Palette (Cmd+K / Ctrl+K) */}
      <CommandPalette />

      {/* High-density Light Neo-Brutalist Sidebar */}
      <AdminSidebar />

      {/* Main Workspace Area */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden bg-[#F8FAFC]">
        {/* Top Bento Header */}
        <AdminHeader />

        {/* Scrollable Viewport */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
