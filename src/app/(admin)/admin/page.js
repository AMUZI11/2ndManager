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
  Layers,
  CreditCard,
  Package,
  Receipt,
  Truck,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AdminDashboardPage() {
  const supabase = createClient();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState('');

  const fetchPulse = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/admin/telemetry');
      const json = await res.json();
      if (res.ok && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error('[Telemetry Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPulse();
    const interval = setInterval(fetchPulse, 30000); // 30s auto pulse
    
    const date = new Date().toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric'
    }).toUpperCase();
    setCurrentDate(date);

    return () => clearInterval(interval);
  }, []);

  const metrics = data?.metrics || {};
  const recentAudits = data?.recentAudits || [];

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val || 0);
  };

  return (
    <div className="space-y-6 pb-20 font-sans">
      {/* ─── 1. HEADER DASHBOARD UTAMA ─── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-2 mb-2 border-b-2 border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-slate-500 tracking-widest mb-1.5 uppercase">
            <span className="w-2.5 h-2.5 bg-[#CCFF00] rounded-full inline-block border border-slate-800 shadow-[0_0_8px_#CCFF00]" />
            RUANG KONTROL OPERASIONAL — {currentDate}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black font-display text-slate-900 tracking-tight uppercase">
            Mission Control Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
            Pusat pemantauan transaksi real-time, master katalog, log anomali, dan integritas multi-cabang.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={fetchPulse}
            disabled={loading}
            className="h-10 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 border-2 border-slate-800 shadow-[2px_2px_0px_0px_#1e293b] flex items-center space-x-2 text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-60"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>SEGARKAN DATA</span>
          </button>

          <Link
            href="/pos"
            className="h-10 px-4 rounded-xl bg-[#CCFF00] hover:bg-[#b8e600] text-slate-900 border-2 border-slate-800 shadow-[2px_2px_0px_0px_#1e293b] flex items-center space-x-2 text-xs font-mono font-black transition-all"
          >
            <Store size={14} />
            <span>BUKA POS</span>
          </Link>
        </div>
      </div>

      {/* ─── 2. BENTO KPI GRID (4 KOLOM) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Volume GMV Hari Ini */}
        <div className="bg-white rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_0px_#1e293b] p-5 space-y-3 relative overflow-hidden group hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-600 uppercase tracking-wider">
              GMV TRANSAKSI HARI INI
            </span>
            <div className="w-8 h-8 rounded-lg bg-lime-100 border border-slate-800 flex items-center justify-center text-slate-900">
              <TrendingUp size={16} />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900 tracking-tight">
              {formatRupiah(metrics.todayGMV)}
            </p>
            <p className="text-xs font-mono font-medium text-slate-500 mt-1">
              {metrics.todayTxCount || 0} struk kasir tercatat sistem
            </p>
          </div>
          <div className="pt-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-lime-200 text-slate-900 border border-slate-800 font-mono font-bold text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              STATUS NORMAL
            </span>
          </div>
        </div>

        {/* Card 2: Toko & Gerai Aktif */}
        <div className="bg-white rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_0px_#1e293b] p-5 space-y-3 relative overflow-hidden group hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-600 uppercase tracking-wider">
              GERAI &amp; TENANT AKTIF
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-800 flex items-center justify-center text-slate-900">
              <Store size={16} />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900 tracking-tight">
              {metrics.activeTenants || 0} <span className="text-base text-slate-400 font-normal">/ {metrics.totalTenants || 0}</span>
            </p>
            <p className="text-xs font-mono font-medium text-slate-500 mt-1">
              Terhubung ke server sinkronisasi
            </p>
          </div>
          <div className="pt-1">
            <Link
              href="/admin/tenants"
              className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-slate-800 hover:underline"
            >
              <span>Kelola Direktori</span>
              <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>

        {/* Card 3: Chokehold & Status Lisensi */}
        <div className="bg-white rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_0px_#1e293b] p-5 space-y-3 relative overflow-hidden group hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-600 uppercase tracking-wider">
              CHOKEHOLD &amp; TAGIHAN
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 border border-slate-800 flex items-center justify-center text-rose-700">
              <Lock size={16} />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black font-mono text-rose-600 tracking-tight">
              {metrics.chokeholdCount || 0} <span className="text-xs text-amber-700 font-bold font-mono">+{metrics.graceCount || 0} GRACE</span>
            </p>
            <p className="text-xs font-mono font-medium text-slate-500 mt-1">
              Akses terkunci otomatis billing
            </p>
          </div>
          <div className="pt-1">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-slate-800 font-mono font-bold text-[10px] ${
              metrics.chokeholdCount > 0 ? 'bg-rose-200 text-rose-950' : 'bg-lime-200 text-slate-900'
            }`}>
              {metrics.chokeholdCount > 0 ? 'ADA OUTLET TERKUNCI' : 'SEMUA OUTLET LANCAR'}
            </span>
          </div>
        </div>

        {/* Card 4: Antrean Triage Darurat WA */}
        <div className="bg-white rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_0px_#1e293b] p-5 space-y-3 relative overflow-hidden group hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-600 uppercase tracking-wider">
              ANTREAN TRIAGE DARURAT
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 border border-slate-800 flex items-center justify-center text-amber-800">
              <LifeBuoy size={16} />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900 tracking-tight">
              {metrics.openTickets || 0} <span className="text-xs text-slate-500 font-mono font-normal">TIKET OPEN</span>
            </p>
            <p className="text-xs font-mono font-medium text-slate-500 mt-1">
              {metrics.pendingProofs || 0} bukti transfer verifikasi
            </p>
          </div>
          <div className="pt-1">
            <Link
              href="/admin/panic-dispatch"
              className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-rose-700 hover:underline"
            >
              <span>Buka Antrean WA (SLA &lt; 5m)</span>
              <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>
      </div>

      {/* ─── 3. QUICK ACCESS BENTO LAUNCHPAD ─── */}
      <div className="space-y-3 pt-2">
        <h3 className="font-display font-black text-xs uppercase tracking-wider text-slate-600 font-mono">
          Akses Cepat Modul Operasional Toko
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/admin/inventory"
            className="p-4 bg-white hover:bg-slate-50 border-2 border-slate-800 rounded-2xl shadow-[3px_3px_0px_0px_#1e293b] flex items-center justify-between group transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-100 border-2 border-slate-800 flex items-center justify-center text-slate-900 shadow-[1px_1px_0_#1E293B]">
                <Package size={18} />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900 font-display uppercase">Master Stok Produk</h4>
                <p className="text-[10px] text-slate-500 font-mono">Katalog &amp; HPP Otomatis</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/admin/transactions"
            className="p-4 bg-white hover:bg-slate-50 border-2 border-slate-800 rounded-2xl shadow-[3px_3px_0px_0px_#1e293b] flex items-center justify-between group transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-lime-100 border-2 border-slate-800 flex items-center justify-center text-slate-900 shadow-[1px_1px_0_#1E293B]">
                <Receipt size={18} />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900 font-display uppercase">Monitor Transaksi</h4>
                <p className="text-[10px] text-slate-500 font-mono">Audit Bon &amp; Pembayaran</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/transfers"
            className="p-4 bg-white hover:bg-slate-50 border-2 border-slate-800 rounded-2xl shadow-[3px_3px_0px_0px_#1e293b] flex items-center justify-between group transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 border-2 border-slate-800 flex items-center justify-center text-slate-900 shadow-[1px_1px_0_#1E293B]">
                <Truck size={18} />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900 font-display uppercase">Mutasi Antar-Cabang</h4>
                <p className="text-[10px] text-slate-500 font-mono">Verifikasi PIN 6-Digit</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/admin/branches"
            className="p-4 bg-white hover:bg-slate-50 border-2 border-slate-800 rounded-2xl shadow-[3px_3px_0px_0px_#1e293b] flex items-center justify-between group transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 border-2 border-slate-800 flex items-center justify-center text-slate-900 shadow-[1px_1px_0_#1E293B]">
                <Store size={18} />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900 font-display uppercase">Pengaturan Cabang</h4>
                <p className="text-[10px] text-slate-500 font-mono">Staf Kasir &amp; Kuota</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* ─── 4. TABEL BENTO AKTIVITAS TERKINI (LIVE AUDIT STREAM) ─── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-black text-xs uppercase tracking-wider text-slate-700 font-mono">
              Live Immutable Audit Trail
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">Rekaman tindakan keamanan dan operasional yang tidak dapat dimanipulasi.</p>
          </div>
          <Link
            href="/admin/audit-logs"
            className="text-xs font-mono font-bold text-slate-900 hover:text-slate-700 underline flex items-center gap-1"
          >
            <span>Semua Log Audit</span>
            <ArrowUpRight size={13} />
          </Link>
        </div>

        <div className="bg-white border-2 border-slate-800 rounded-2xl shadow-[4px_4px_0px_0px_#1e293b] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-800 text-slate-700 font-mono uppercase text-[10px] font-black tracking-wider">
                  <th className="py-3 px-4">WAKTU (WIB)</th>
                  <th className="py-3 px-4">OPERATOR / AKTOR</th>
                  <th className="py-3 px-4">JENIS AKSI</th>
                  <th className="py-3 px-4">JUSTIFIKASI / CATATAN</th>
                  <th className="py-3 px-4 text-right">INTEGRITAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {recentAudits.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400 font-mono text-xs">
                      Belum ada catatan log terbaru di buku besar audit.
                    </td>
                  </tr>
                ) : (
                  recentAudits.slice(0, 8).map((log, idx) => (
                    <tr 
                      key={log.id || idx}
                      className="odd:bg-white even:bg-slate-50/60 hover:bg-amber-50/40 transition-colors h-11"
                    >
                      <td className="py-2.5 px-4 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                        {log.created_at ? new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-900 font-bold text-[11px] truncate max-w-[160px]">
                        {log.admin_email || 'Sistem'}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-black text-[11px]">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-800 text-slate-900 text-[10px]">
                          {log.action_type || 'SYSTEM'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 text-xs truncate max-w-[280px]">
                        {log.reason || '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-[10px] whitespace-nowrap">
                        <span className="inline-flex items-center space-x-1 bg-lime-100 border border-slate-800 px-2 py-0.5 rounded-full text-slate-900 font-bold">
                          <ShieldCheck size={11} className="text-emerald-700" />
                          <span>VERIFIED</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
