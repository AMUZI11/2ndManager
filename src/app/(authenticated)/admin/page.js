"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  TrendingUp,
  DollarSign,
  Package,
  Wallet,
  Store,
  ShieldAlert,
  ArrowRight,
  Plus,
  Printer,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  ShoppingCart,
  Layers,
} from 'lucide-react';
import { useAdminDashboardData } from '@/hooks/useAdminDashboardData';

export default function AdminDashboardPage() {
  const [activeBranch, setActiveBranch] = useState('ALL');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hl_active_branch') || 'ALL';
      setActiveBranch(saved);

      const handleBranchChange = (e) => {
        if (e.detail?.shopId) {
          setActiveBranch(e.detail.shopId);
        }
      };
      window.addEventListener('hl_branch_changed', handleBranchChange);
      return () => window.removeEventListener('hl_branch_changed', handleBranchChange);
    }
  }, []);

  const {
    data,
    loading,
    isRefreshing,
    isCooldown,
    error,
    lastUpdated,
    manualRefresh,
  } = useAdminDashboardData(activeBranch);

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatTime = (d) => {
    if (!d) return '--:--:--';
    const date = new Date(d);
    return date.toTimeString().split(' ')[0];
  };

  const metrics = data?.metrics || {
    todayRevenue: 0,
    todayEstimatedProfit: 0,
    todayTransactionsCount: 0,
    todayVoidCount: 0,
    todayCashRevenue: 0,
    todayQrisRevenue: 0,
    todayTransferRevenue: 0,
    todayKasbonRevenue: 0,
    totalInventoryValue: 0,
    totalStockUnits: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    cashInDrawer: 0,
    totalOutstandingKasbon: 0,
  };

  const branches = data?.branches || [];
  const anomalies = data?.anomalies || [];

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-[#1E293B] border-t-[#CCFF00] animate-spin" />
        <p className="font-mono font-bold text-xs uppercase tracking-widest text-slate-400">
          [ MEMUAT TELEMETRI MISSION CONTROL... ]
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ─── 1. TACTICAL STATUS BAR ─── */}
      <div className="bg-[#0F172A] border-2 border-[#1E293B] p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[3px_3px_0px_#000000]">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono">
          <span className="flex items-center gap-1.5 bg-[#161F36] border border-[#334155] px-2.5 py-1 text-slate-300 font-bold uppercase">
            <span className="w-2 h-2 rounded-none bg-emerald-400 inline-block animate-pulse" />
            <span>SISTEM OPERASIONAL</span>
          </span>

          <span className="text-slate-400 font-medium">
            TERAKHIR DISINKRONKAN:
            <strong className="text-white ml-1.5 font-bold">
              {formatTime(lastUpdated || data?.timestamp)}
            </strong>
          </span>

          {activeBranch !== 'ALL' && (
            <span className="bg-[#CCFF00]/10 border border-[#CCFF00]/40 text-[#CCFF00] px-2 py-0.5 text-[10px] font-bold">
              FILTER: CABANG AKTIF
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={manualRefresh}
            disabled={isCooldown || isRefreshing}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-black uppercase border-2 border-black transition-all cursor-pointer ${
              isCooldown || isRefreshing
                ? 'bg-[#161F36] text-slate-500 border-slate-700 cursor-not-allowed'
                : 'bg-[#CCFF00] text-black shadow-[2px_2px_0px_#000000] hover:bg-[#b8e600] active:translate-x-0.5 active:translate-y-0.5'
            }`}
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'MENYINKRONKAN...' : isCooldown ? 'COOLDOWN 3S' : 'REFRESH DATA'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-950/60 border-2 border-rose-600 text-rose-300 p-3 font-mono text-xs font-bold uppercase">
          PERINGATAN: {error}
        </div>
      )}

      {/* ─── 2. 4-COLUMN ARCADE KPI GRID ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Omzet Hari Ini */}
        <div className="bg-[#0F172A] border-2 border-[#1E293B] hover:border-slate-500 p-5 shadow-[3px_3px_0px_#000000] flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
              PENDAPATAN HARI INI
            </span>
            <span className="text-[9px] font-mono font-black bg-[#CCFF00] text-black px-1.5 py-0.5">
              [ BERSIH ]
            </span>
          </div>

          <div className="my-4">
            <h2 className="text-2xl lg:text-3xl font-mono font-black text-white tracking-tight">
              {formatRupiah(metrics.todayRevenue)}
            </h2>
            <p className="text-[11px] font-mono text-slate-400 mt-1 uppercase">
              {metrics.todayTransactionsCount} NOTA SUKSES • {metrics.todayVoidCount} VOID
            </p>
          </div>

          <div className="pt-3 border-t border-[#1E293B] grid grid-cols-3 gap-1 text-[10px] font-mono">
            <div>
              <span className="text-slate-500 block">TUNAI</span>
              <strong className="text-slate-300">{formatRupiah(metrics.todayCashRevenue)}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">QRIS</span>
              <strong className="text-[#CCFF00]">{formatRupiah(metrics.todayQrisRevenue)}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">TRANSFER</span>
              <strong className="text-slate-300">{formatRupiah(metrics.todayTransferRevenue)}</strong>
            </div>
          </div>
        </div>

        {/* Card 2: Estimasi Laba Operasional */}
        <div className="bg-[#0F172A] border-2 border-[#CCFF00] p-5 shadow-[3px_3px_0px_#000000] flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-12 h-12 bg-[#CCFF00]/10 -rotate-45 transform origin-bottom-left pointer-events-none" />
          <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#CCFF00]">
              LABA OPERASIONAL (EST)
            </span>
            <TrendingUp size={16} className="text-[#CCFF00]" />
          </div>

          <div className="my-4">
            <h2 className="text-2xl lg:text-3xl font-mono font-black text-[#CCFF00] tracking-tight">
              {formatRupiah(metrics.todayEstimatedProfit)}
            </h2>
            <p className="text-[11px] font-mono text-slate-400 mt-1 uppercase">
              MARGIN BRUTO ESTIMASI: ~25% OMZET
            </p>
          </div>

          <div className="pt-3 border-t border-[#1E293B] text-[10px] font-mono text-slate-400 flex justify-between items-center">
            <span>BERSIH DARI HPP PRODUK</span>
            <span className="text-white font-bold">[ AMAN ]</span>
          </div>
        </div>

        {/* Card 3: Nilai Total Inventaris */}
        <div className="bg-[#0F172A] border-2 border-[#1E293B] hover:border-slate-500 p-5 shadow-[3px_3px_0px_#000000] flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
              NILAI TOTAL INVENTARIS
            </span>
            <Package size={16} className="text-slate-400" />
          </div>

          <div className="my-4">
            <h2 className="text-2xl lg:text-3xl font-mono font-black text-white tracking-tight">
              {formatRupiah(metrics.totalInventoryValue)}
            </h2>
            <p className="text-[11px] font-mono text-slate-400 mt-1 uppercase">
              {metrics.totalStockUnits} TOTAL UNIT STOK TERDAFTAR
            </p>
          </div>

          <div className="pt-3 border-t border-[#1E293B] flex items-center justify-between text-[10px] font-mono">
            <span className="bg-amber-950/60 text-amber-300 border border-amber-800 px-1.5 py-0.5">
              [ {metrics.lowStockCount} MENIPIS ]
            </span>
            <span className="bg-rose-950/60 text-rose-300 border border-rose-800 px-1.5 py-0.5">
              [ {metrics.outOfStockCount} KOSONG ]
            </span>
          </div>
        </div>

        {/* Card 4: Kas di Laci vs Kasbon */}
        <div className="bg-[#0F172A] border-2 border-[#1E293B] hover:border-slate-500 p-5 shadow-[3px_3px_0px_#000000] flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
              KAS DI LACI (SHIFT AKTIF)
            </span>
            <Wallet size={16} className="text-slate-400" />
          </div>

          <div className="my-4">
            <h2 className="text-2xl lg:text-3xl font-mono font-black text-emerald-400 tracking-tight">
              {formatRupiah(metrics.cashInDrawer)}
            </h2>
            <p className="text-[11px] font-mono text-slate-400 mt-1 uppercase">
              KAS FISIK LACI KASIR BERJALAN
            </p>
          </div>

          <div className="pt-3 border-t border-[#1E293B] flex items-center justify-between text-[10px] font-mono">
            <span className="text-slate-400">PIUTANG KASBON:</span>
            <strong className="text-amber-400">{formatRupiah(metrics.totalOutstandingKasbon)}</strong>
          </div>
        </div>
      </div>

      {/* ─── 3. SPLIT COMMAND VIEW ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 3-Branch Performance & Gerai Logistics (7 cols) */}
        <section className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b-2 border-[#1E293B] pb-2">
            <div className="flex items-center gap-2">
              <Store size={18} className="text-[#CCFF00]" />
              <h2 className="font-mono font-black text-sm uppercase tracking-wide text-white">
                PERFORMA 3 CABANG GERAI WARUNG
              </h2>
            </div>
            <Link
              href="/admin/branches"
              className="text-xs font-mono font-bold text-[#CCFF00] hover:underline flex items-center gap-1 uppercase"
            >
              <span>KELOLA CABANG</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {branches.length === 0 ? (
            <div className="bg-[#0F172A] border-2 border-[#1E293B] p-8 text-center font-mono">
              <Store className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400 uppercase">[ BELUM ADA CABANG TERDAFTAR ]</p>
            </div>
          ) : (
            <div className="space-y-3">
              {branches.map((branch, index) => (
                <div
                  key={branch.id}
                  className="bg-[#0F172A] border-2 border-[#1E293B] hover:border-[#CCFF00] p-4 transition-all shadow-[2px_2px_0px_#000000] space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-black text-[#CCFF00] font-mono font-black text-xs px-2 py-0.5 border border-[#334155]">
                        CABANG {index + 1}
                      </span>
                      <h4 className="font-mono font-black text-sm text-white uppercase truncate">
                        {branch.name}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-mono font-bold">
                      <span
                        className={`px-2 py-0.5 border ${
                          branch.status === 'OPERATIONAL'
                            ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300'
                            : branch.status === 'GRACE_PERIOD'
                            ? 'bg-amber-950/70 border-amber-700 text-amber-300'
                            : 'bg-rose-950/70 border-rose-700 text-rose-300'
                        }`}
                      >
                        [ {branch.status} ]
                      </span>

                      {branch.activeCashier ? (
                        <span className="bg-[#161F36] border border-[#334155] text-slate-300 px-2 py-0.5">
                          KASIR: {branch.activeCashier.toUpperCase()}
                        </span>
                      ) : (
                        <span className="bg-slate-900 border border-slate-800 text-slate-500 px-2 py-0.5">
                          SHIFT TUTUP
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-[#161F36] p-3 border border-[#334155] text-xs font-mono">
                    <div>
                      <span className="text-slate-400 text-[10px] block">OMZET HARI INI</span>
                      <strong className="text-[#CCFF00] font-bold text-sm">
                        {formatRupiah(branch.todayRevenue)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">TRANSAKSI</span>
                      <strong className="text-white font-bold text-sm">
                        {branch.txCount} NOTA
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">NILAI STOK</span>
                      <strong className="text-slate-300 font-bold text-sm">
                        {formatRupiah(branch.stockVal)}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono pt-1">
                    <span className="text-slate-400 truncate max-w-[240px]">
                      {branch.address}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/admin/inventory?branch=${branch.id}`}
                        className="bg-[#161F36] hover:bg-[#223055] text-slate-300 hover:text-white px-2.5 py-1 border border-[#334155] font-bold uppercase transition-colors"
                      >
                        STOK CABANG
                      </Link>
                      <Link
                        href="/pos"
                        className="bg-[#CCFF00] hover:bg-[#b8e600] text-black px-2.5 py-1 font-black uppercase transition-colors border border-black shadow-[1px_1px_0px_#000000]"
                      >
                        BUKA KASIR
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Action Dock */}
          <div className="bg-[#0F172A] border-2 border-[#1E293B] p-4 shadow-[2px_2px_0px_#000000] space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider block">
              AKSI CEPAT STRATEGIS
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Link
                href="/admin/inventory"
                className="bg-[#161F36] hover:bg-[#223055] text-slate-200 p-2.5 text-center text-xs font-mono font-bold uppercase border border-[#334155] transition-colors"
              >
                + TAMBAH PRODUK
              </Link>
              <Link
                href="/admin/transactions"
                className="bg-[#161F36] hover:bg-[#223055] text-slate-200 p-2.5 text-center text-xs font-mono font-bold uppercase border border-[#334155] transition-colors"
              >
                PITA TRANSAKSI
              </Link>
              <Link
                href="/reports/financials"
                className="bg-[#161F36] hover:bg-[#223055] text-slate-200 p-2.5 text-center text-xs font-mono font-bold uppercase border border-[#334155] transition-colors"
              >
                LAPORAN EMKM
              </Link>
              <Link
                href="/reorder"
                className="bg-[#161F36] hover:bg-[#223055] text-slate-200 p-2.5 text-center text-xs font-mono font-bold uppercase border border-[#334155] transition-colors"
              >
                BELANJA PASAR
              </Link>
            </div>
          </div>
        </section>

        {/* Right Column: Live Security Radar Feed & Quick Alerts (5 cols) */}
        <section className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between border-b-2 border-[#1E293B] pb-2">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-rose-500" />
              <h2 className="font-mono font-black text-sm uppercase tracking-wide text-white">
                RADAR FORENSIK KEAMANAN
              </h2>
            </div>
            <Link
              href="/radar"
              className="text-xs font-mono font-bold text-rose-400 hover:underline flex items-center gap-1 uppercase"
            >
              <span>BUKA RADAR</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="bg-[#0F172A] border-2 border-[#1E293B] shadow-[2px_2px_0px_#000000] p-4 space-y-3">
            {anomalies.length === 0 ? (
              <div className="p-6 text-center space-y-2 font-mono">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-xs text-white font-bold uppercase">
                  [ SEMUA SISTEM AMAN ]
                </p>
                <p className="text-[10px] text-slate-400 uppercase">
                  Tidak terdeteksi anomali void atau manipulasi laci kasir dalam 24 jam terakhir.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {anomalies.slice(0, 5).map((ano) => (
                  <div
                    key={ano.id}
                    className="bg-[#161F36] border border-[#334155] p-3 text-xs font-mono space-y-1 hover:border-slate-400 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 border ${
                          ano.severity === 'CRITICAL' || ano.severity === 'HIGH'
                            ? 'bg-rose-950 text-rose-300 border-rose-700'
                            : 'bg-amber-950 text-amber-300 border-amber-700'
                        }`}
                      >
                        [ {ano.severity || 'ALERT'} ]
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatTime(ano.created_at)}
                      </span>
                    </div>
                    <p className="text-slate-200 font-medium leading-relaxed">
                      {ano.description || ano.event_type || 'Aktivitas kasir abnormal terdeteksi'}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-[#1E293B]">
              <Link
                href="/radar"
                className="w-full flex items-center justify-center gap-2 bg-[#161F36] hover:bg-[#202c4b] text-slate-300 hover:text-white border border-[#334155] py-2 text-xs font-mono font-bold uppercase transition-colors"
              >
                <ShieldAlert size={14} />
                <span>LIHAT SEMUA LOG FORENSIK KASIR</span>
              </Link>
            </div>
          </div>

          {/* SAK EMKM / Tax Status Box */}
          <div className="bg-[#0F172A] border-2 border-[#1E293B] p-4 shadow-[2px_2px_0px_#000000] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 uppercase font-bold">KEPATUHAN PAJAK PP 55/2022</span>
              <span className="text-emerald-400 font-black">[ 0.5% FINAL ]</span>
            </div>
            <p className="text-[11px] font-mono text-slate-300">
              Laporan pembukuan warung otomatis disinkronkan sesuai standar SAK EMKM untuk keperluan pajak dan pengajuan KUR perbankan.
            </p>
            <div className="pt-2 flex gap-2">
              <Link
                href="/reports/tax"
                className="flex-1 text-center bg-[#161F36] hover:bg-[#202c4b] text-[#CCFF00] border border-[#334155] py-1.5 text-xs font-mono font-bold uppercase transition-colors"
              >
                REKAP PAJAK PP 55
              </Link>
              <Link
                href="/reports/kur-dossier"
                className="flex-1 text-center bg-[#161F36] hover:bg-[#202c4b] text-slate-300 border border-[#334155] py-1.5 text-xs font-mono font-bold uppercase transition-colors"
              >
                BERKAS KUR BANK
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
