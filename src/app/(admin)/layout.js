import React from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import CommandPalette from '@/components/admin/CommandPalette';

export const metadata = {
  title: 'Obsidian Command Deck — 2ndManager Platform Operations',
  description: 'Enterprise Multi-Tenant Administration, SLA Triage, and Billing Chokehold Controller',
};

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 font-sans antialiased flex selection:bg-zinc-800 selection:text-white relative overflow-hidden">
      {/* Ambient background GPU-locked lights */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none transform-gpu translate-z-0">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-purple-900/10 blur-[140px] transform-gpu translate-z-0" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-orange-900/10 blur-[140px] transform-gpu translate-z-0" />
      </div>

      {/* Global Command Palette (Cmd+K / Ctrl+K) */}
      <CommandPalette />

      {/* High-density dark glass sidebar */}
      <AdminSidebar />

      {/* Main Workspace Area */}
      <main className="flex-1 min-w-0 z-10 flex flex-col h-screen overflow-hidden bg-[#09090B]">
        {/* Top Utility Header */}
        <header className="h-14 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-6 flex items-center justify-between flex-shrink-0 z-20">
          <div className="flex items-center space-x-3">
            <span className="font-heading font-black text-sm tracking-wider uppercase text-zinc-200">
              COMMAND DECK
            </span>
            <span className="text-zinc-600 font-mono text-xs">/</span>
            <span className="font-mono text-xs text-zinc-400 font-semibold">ENV: PRODUCTION</span>
          </div>

          <div className="flex items-center space-x-4">
            <button 
              id="open-cmd-palette-btn"
              className="h-8 px-3 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-400 hover:text-zinc-200 flex items-center space-x-2.5 transition-colors cursor-pointer"
            >
              <span>Cari atau perintah...</span>
              <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-600 rounded text-[10px] font-mono text-zinc-300">⌘K</kbd>
            </button>

            <div className="flex items-center space-x-2 pl-2 border-l border-zinc-800">
              <div className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" title="Platform Realtime Connected" />
              <span className="font-mono text-[11px] text-zinc-400 font-bold hidden sm:inline">REALTIME CONNECTED</span>
            </div>
          </div>
        </header>

        {/* Scrollable Viewport */}
        <div className="flex-1 overflow-y-auto p-6 custom-dark-scrollbar">
          {children}
        </div>
      </main>

      {/* Inline script for Command Palette button click */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('click', function(e) {
              if (e.target && e.target.closest('#open-cmd-palette-btn')) {
                window.dispatchEvent(new CustomEvent('open-command-palette'));
              }
            });
          `,
        }}
      />
    </div>
  );
}
