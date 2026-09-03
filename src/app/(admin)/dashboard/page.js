"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Activity, 
  Store, 
  ShieldAlert, 
  LifeBuoy, 
  TrendingUp, 
  RefreshCw,
  Clock,
  ArrowUpRight,
  Lock,
  Layers
} from 'lucide-react';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPulse = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/admin/telemetry');
      const json = await res.json();
      if (res.ok && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPulse();
    const interval = setInterval(fetchPulse, 30000); // 30s auto pulse
    return () => clearInterval(interval);
  }, []);

  const metrics = data?.metrics || {};
  const recentAudits = data?.recentAudits || [];

  return (
    <div className="space-y-6 font-sans max-w-7xl mx-auto">
      {/* Platform Pulse Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
            <h2 className="font-heading font-black text-xl text-zinc-100 uppercase tracking-tight">
              Platform Pulse &amp; Telemetry Stream
            </h2>
          </div>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Real-time multi-tenant health, SLA telemetry, dan penegakan tagihan
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchPulse}
            className="h-8 px-3 rounded bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-zinc-100 flex items-center space-x-1.5 text-xs font-mono cursor-pointer"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span>PULSE REFRESH</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (Geist Mono Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* GMV Metric */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>VOLUME GMV HARI INI</span>
            <TrendingUp size={15} className="text-[#CCFF00]" />
          </div>
          <p className="text-2xl font-heading font-black text-[#CCFF00] font-mono tracking-tight">
            Rp {(metrics.todayGMV || 0).toLocaleString('id-ID')}
          </p>
          <p className="text-[11px] text-zinc-500 font-mono">
            {metrics.todayTxCount || 0} transaksi kasir tercatat
          </p>
        </div>

        {/* Tenants Metric */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>TOTAL PENYEWA (SHOPS)</span>
            <Store size={15} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-heading font-black text-zinc-100 font-mono">
            {metrics.totalShops || 0}
          </p>
          <p className="text-[11px] text-emerald-400 font-mono font-bold">
            ● {metrics.activeShops || 0} toko operasional normal
          </p>
        </div>

        {/* Chokehold Metric */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>CHOKEHOLD &amp; GRACE</span>
            <Lock size={15} className="text-[#E30022]" />
          </div>
          <div className="flex items-baseline space-x-3">
            <span className="text-2xl font-heading font-black text-[#E30022] font-mono">
              {metrics.chokeholdCount || 0}
            </span>
            <span className="text-xs font-mono text-amber-400 font-bold">
              +{metrics.graceCount || 0} dispensasi
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 font-mono">
            Akses dibatasi otomatis oleh sistem
          </p>
        </div>

        {/* Panic SOS Tickets */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>TIKET DARURAT (OPEN)</span>
            <LifeBuoy size={15} className="text-red-400 animate-spin" />
          </div>
          <p className="text-2xl font-heading font-black text-red-400 font-mono">
            {metrics.openTickets || 0}
          </p>
          <Link
            href="/admin/panic-dispatch"
            className="text-[11px] text-red-300 hover:text-red-200 underline font-mono flex items-center space-x-1"
          >
            <span>Buka Antrean Triage WA</span>
            <ArrowUpRight size={11} />
          </Link>
        </div>
      </div>

      {/* Quick Launchpad & Recent Immutable Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Launchpad */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-zinc-400 font-mono">
            Akses Cepat Modul Utama
          </h3>

          <div className="space-y-2">
            <Link
              href="/admin/tenants"
              className="p-3 bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 rounded-lg flex items-center justify-between transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded bg-zinc-950 border border-zinc-700 text-[#CCFF00]">
                  <Store size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-zinc-200">Direktori Penyewa &amp; Chokehold</h4>
                  <p className="text-[10px] text-zinc-500 font-mono">Kontrol status toko &amp; kuota kasir</p>
                </div>
              </div>
              <ArrowUpRight size={14} className="text-zinc-500 group-hover:text-zinc-200" />
            </Link>

            <Link
              href="/admin/panic-dispatch"
              className="p-3 bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 rounded-lg flex items-center justify-between transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded bg-zinc-950 border border-zinc-700 text-red-400">
                  <LifeBuoy size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-zinc-200">Emergency WA Triage</h4>
                  <p className="text-[10px] text-zinc-500 font-mono">Respons darurat kasir SLA &lt; 5 mnt</p>
                </div>
              </div>
              <ArrowUpRight size={14} className="text-zinc-500 group-hover:text-zinc-200" />
            </Link>

            <Link
              href="/admin/categories-master"
              className="p-3 bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 rounded-lg flex items-center justify-between transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded bg-zinc-950 border border-zinc-700 text-cyan-400">
                  <Layers size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-zinc-200">Master 11 Kategori Ritel</h4>
                  <p className="text-[10px] text-zinc-500 font-mono">Injeksi seeder ke warung baru</p>
                </div>
              </div>
              <ArrowUpRight size={14} className="text-zinc-500 group-hover:text-zinc-200" />
            </Link>

            <Link
              href="/admin/fraud-radar"
              className="p-3 bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 rounded-lg flex items-center justify-between transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded bg-zinc-950 border border-zinc-700 text-amber-400">
                  <ShieldAlert size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-zinc-200">Radar Anomali Kasir</h4>
                  <p className="text-[10px] text-zinc-500 font-mono">Deteksi void &amp; diskon mencurigakan</p>
                </div>
              </div>
              <ArrowUpRight size={14} className="text-zinc-500 group-hover:text-zinc-200" />
            </Link>
          </div>
        </div>

        {/* Live Immutable Audit Stream */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-zinc-400 font-mono">
              Live Immutable Audit Ledger
            </h3>
            <Link href="/admin/audit-logs" className="text-[11px] font-mono text-[#CCFF00] hover:underline">
              Lihat Seluruh Log →
            </Link>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg overflow-hidden">
            <div className="divide-y divide-zinc-800/80">
              {recentAudits.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 font-mono text-xs">
                  Belum ada log audit yang tercatat di ledger.
                </div>
              ) : (
                recentAudits.map((log) => (
                  <div key={log.id} className="p-3 hover:bg-zinc-850/40 transition-colors flex items-center justify-between text-xs font-mono">
                    <div className="space-y-0.5 truncate pr-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-zinc-200 text-[11px] uppercase">
                          [{log.action_type}]
                        </span>
                        <span className="text-zinc-500 text-[10px]">
                          oleh {log.admin_email}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {log.reason}
                      </p>
                    </div>

                    <span className="text-[10px] text-zinc-500 shrink-0">
                      {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
