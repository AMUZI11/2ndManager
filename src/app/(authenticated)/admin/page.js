"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  TrendingUp,
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
  ArrowRightLeft,
  DollarSign,
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
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <p className="font-mono font-bold text-xs uppercase tracking-widest text-slate-600">
          [ MEMUAT TELEMETRI MISSION CONTROL... ]
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ─── 1. TACTICAL STATUS BAR ─── */}
      <div className="bg-white/90 backdrop-blur-md border-2 border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[3px_3px_0_#1E293B]">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono">
          <span className="flex items-center gap-1.5 bg-[#CCFF00] border-2 border-slate-800 rounded-lg px-2.5 py-1 text-slate-900 font-bold uppercase shadow-sm">
            <span className="w-2 h-2 rounded-full bg-slate-900 inline-block animate-pulse" />
            <span>SISTEM OPERASIONAL</span>
          </span>

          <span className="text-slate-600 font-medium">
            TERAKHIR DISINKRONKAN:
            <strong className="text-slate-900 ml-1.5 font-bold">
              {formatTime(lastUpdated || data?.timestamp)}
            </strong>
          </span>

          {activeBranch !== 'ALL' && (
            <span className="bg-slate-100 border border-slate-400 text-slate-800 px-2 py-0.5 rounded text-[10px] font-bold">
              FILTER: CABANG AKTIF
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={manualRefresh}
            disabled={isCooldown || isRefreshing}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-bold uppercase rounded-xl border-2 border-slate-800 transition-all cursor-pointer shadow-[2px_2px_0_#1E293B] ${
              isCooldown || isRefreshing
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-white hover:bg-slate-900 hover:text-white text-slate-900 active:translate-y-0.5'
            }`}
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'MENYINKRONKAN...' : isCooldown ? 'COOLDOWN 3S' : 'REFRESH DATA'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border-2 border-rose-600 text-rose-900 p-4 rounded-2xl font-mono text-xs font-bold uppercase shadow-sm">
          PERINGATAN: {error}
        </div>
      )}

      {/* ─── 2. 4-COLUMN KPI GRID (Gaya Web App) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Omzet Hari Ini */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border-2 border-slate-800 p-5 shadow-[4px_4px_0_#1E293B] flex flex-col justify-between hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
              PENDAPATAN HARI INI
            </span>
            <span className="text-[9px] font-mono font-black bg-[#CCFF00] text-slate-900 px-2 py-0.5 rounded-full border border-slate-800 uppercase">
              BERSIH
            </span>
          </div>

          <div className="my-3">
            <h2 className="text-2xl lg:text-3xl font-mono font-black text-slate-900 tracking-tight">
              {formatRupiah(metrics.todayRevenue)}
            </h2>
            <p className="text-[11px] font-mono text-slate-500 mt-1 uppercase">
              {metrics.todayTransactionsCount} NOTA SUKSES • {metrics.todayVoidCount} VOID
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-1 text-[10px] font-mono">
            <div>
              <span className="text-slate-400 block">TUNAI</span>
              <strong className="text-slate-700">{formatRupiah(metrics.todayCashRevenue)}</strong>
            </div>
            <div>
              <span className="text-slate-400 block">QRIS</span>
              <strong className="text-slate-900">{formatRupiah(metrics.todayQrisRevenue)}</strong>
            </div>
            <div>
              <span className="text-slate-400 block">TRANSFER</span>
              <strong className="text-slate-700">{formatRupiah(metrics.todayTransferRevenue)}</strong>
            </div>
          </div>
        </div>

        {/* Card 2: Laba Operasional */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border-2 border-slate-800 p-5 shadow-[4px_4px_0_#1E293B] flex flex-col justify-between hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
              LABA OPERASIONAL (EST)
            </span>
            <TrendingUp size={16} className="text-slate-900" />
          </div>

          <div className="my-3">
            <h2 className="text-2xl lg:text-3xl font-mono font-black text-slate-900 tracking-tight">
              {formatRupiah(metrics.todayEstimatedProfit)}
            </h2>
            <p className="text-[11px] font-mono text-slate-500 mt-1 uppercase">
              MARGIN BRUTO: ~25% OMZET
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[10px] font-mono text-slate-500 flex justify-between items-center">
            <span>BERSIH DARI HPP</span>
            <span className="bg-[#CCFF00] text-slate-900 px-1.5 py-0.5 rounded border border-slate-800 font-bold">[ AMAN ]</span>
          </div>
        </div>

        {/* Card 3: Total Nilai Inventaris */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border-2 border-slate-800 p-5 shadow-[4px_4px_0_#1E293B] flex flex-col justify-between hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
              NILAI TOTAL INVENTARIS
            </span>
            <Package size={16} className="text-slate-700" />
          </div>

          <div className="my-3">
            <h2 className="text-2xl lg:text-3xl font-mono font-black text-slate-900 tracking-tight">
              {formatRupiah(metrics.totalInventoryValue)}
            </h2>
            <p className="text-[11px] font-mono text-slate-500 mt-1 uppercase">
              {metrics.totalStockUnits} TOTAL UNIT TERDAFTAR
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono">
            <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-bold">
              [ {metrics.lowStockCount} MENIPIS ]
            </span>
            <span className="bg-rose-100 text-rose-900 border border-rose-300 px-2 py-0.5 rounded-full font-bold">
              [ {metrics.outOfStockCount} KOSONG ]
            </span>
          </div>
        </div>

        {/* Card 4: Kas di Laci vs Kasbon */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border-2 border-slate-800 p-5 shadow-[4px_4px_0_#1E293B] flex flex-col justify-between hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
              KAS DI LACI (SHIFT AKTIF)
            </span>
            <Wallet size={16} className="text-slate-700" />
          </div>

          <div className="my-3">
            <h2 className="text-2xl lg:text-3xl font-mono font-black text-slate-900 tracking-tight">
              {formatRupiah(metrics.cashInDrawer)}
            </h2>
            <p className="text-[11px] font-mono text-slate-500 mt-1 uppercase">
              KAS FISIK LACI KASIR
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono">
            <span className="text-slate-500">PIUTANG KASBON:</span>
            <strong className="text-rose-600 font-bold">{formatRupiah(metrics.totalOutstandingKasbon)}</strong>
          </div>
        </div>
      </div>

      {/* ─── 3. SPLIT COMMAND VIEW ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 3-Branch Performance (7 cols) */}
        <section className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Store size={18} className="text-slate-900" />
              <h2 className="font-heading font-black text-base uppercase tracking-tight text-slate-900">
                PERFORMA 3 CABANG GERAI
              </h2>
            </div>
            <Link
              href="/admin/branches"
              className="text-xs font-mono font-bold text-slate-900 hover:text-amber-600 flex items-center gap-1 uppercase"
            >
              <span>KELOLA CABANG</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {branches.length === 0 ? (
            <div className="bg-white/80 border-2 border-slate-800 rounded-2xl p-8 text-center font-mono shadow-[3px_3px_0_#1E293B]">
              <Store className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-600 uppercase">[ BELUM ADA CABANG TERDAFTAR ]</p>
            </div>
          ) : (
            <div className="space-y-3">
              {branches.map((branch, index) => (
                <div
                  key={branch.id}
                  className="bg-white/90 backdrop-blur-md rounded-2xl border-2 border-slate-800 p-5 shadow-[3px_3px_0_#1E293B] space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-black text-[#CCFF00] font-mono font-black text-xs px-2 py-0.5 rounded border border-black">
                        CABANG {index + 1}
                      </span>
                      <h4 className="font-heading font-black text-sm text-slate-900 uppercase truncate">
                        {branch.name}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-mono font-bold">
                      <span
                        className={`px-2 py-0.5 rounded-full border ${
                          branch.status === 'OPERATIONAL'
                            ? 'bg-emerald-100 border-emerald-400 text-emerald-800'
                            : 'bg-amber-100 border-amber-400 text-amber-800'
                        }`}
                      >
                        [ {branch.status} ]
                      </span>

                      {branch.activeCashier ? (
                        <span className="bg-slate-100 border border-slate-300 text-slate-800 px-2 py-0.5 rounded-full">
                          KASIR: {branch.activeCashier.toUpperCase()}
                        </span>
                      ) : (
                        <span className="bg-slate-100 border border-slate-300 text-slate-500 px-2 py-0.5 rounded-full">
                          SHIFT TUTUP
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono">
                    <div>
                      <span className="text-slate-500 text-[10px] block uppercase">OMZET HARI INI</span>
                      <strong className="text-slate-900 font-bold text-sm">
                        {formatRupiah(branch.todayRevenue)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block uppercase">TRANSAKSI</span>
                      <strong className="text-slate-900 font-bold text-sm">
                        {branch.txCount} NOTA
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block uppercase">NILAI STOK</span>
                      <strong className="text-slate-700 font-bold text-sm">
                        {formatRupiah(branch.stockVal)}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono pt-1">
                    <span className="text-slate-500 truncate max-w-[240px]">
                      {branch.address}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/admin/inventory?branch=${branch.id}`}
                        className="bg-white hover:bg-slate-100 text-slate-800 px-3 py-1 border-2 border-slate-800 rounded-lg font-bold uppercase transition-colors shadow-sm"
                      >
                        STOK CABANG
                      </Link>
                      <Link
                        href="/pos"
                        className="bg-[#CCFF00] hover:bg-[#b8e600] text-slate-900 px-3 py-1 font-black uppercase transition-colors border-2 border-slate-800 rounded-lg shadow-[2px_2px_0_#1E293B]"
                      >
                        BUKA KASIR
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Action Dock (Gaya Web App) */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl border-2 border-slate-800 p-4 shadow-[3px_3px_0_#1E293B] space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider block">
              AKSI CEPAT STRATEGIS
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Link
                href="/admin/inventory"
                className="bg-white hover:bg-slate-100 text-slate-800 p-2.5 text-center text-xs font-mono font-bold uppercase rounded-xl border-2 border-slate-800 shadow-[2px_2px_0_#1E293B] transition-transform hover:-translate-y-0.5"
              >
                + TAMBAH PRODUK
              </Link>
              <Link
                href="/admin/transactions"
                className="bg-white hover:bg-slate-100 text-slate-800 p-2.5 text-center text-xs font-mono font-bold uppercase rounded-xl border-2 border-slate-800 shadow-[2px_2px_0_#1E293B] transition-transform hover:-translate-y-0.5"
              >
                PITA TRANSAKSI
              </Link>
              <Link
                href="/reports/financials"
                className="bg-white hover:bg-slate-100 text-slate-800 p-2.5 text-center text-xs font-mono font-bold uppercase rounded-xl border-2 border-slate-800 shadow-[2px_2px_0_#1E293B] transition-transform hover:-translate-y-0.5"
              >
                LAPORAN EMKM
              </Link>
              <Link
                href="/reorder"
                className="bg-white hover:bg-slate-100 text-slate-800 p-2.5 text-center text-xs font-mono font-bold uppercase rounded-xl border-2 border-slate-800 shadow-[2px_2px_0_#1E293B] transition-transform hover:-translate-y-0.5"
              >
                BELANJA PASAR
              </Link>
            </div>
          </div>
        </section>

        {/* Right Column: Live Security Radar Feed (5 cols) */}
        <section className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-rose-600" />
              <h2 className="font-heading font-black text-base uppercase tracking-tight text-slate-900">
                RADAR FORENSIK KEAMANAN
              </h2>
            </div>
            <Link
              href="/radar"
              className="text-xs font-mono font-bold text-rose-600 hover:underline flex items-center gap-1 uppercase"
            >
              <span>BUKA RADAR</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="bg-white/90 backdrop-blur-md rounded-2xl border-2 border-slate-800 shadow-[3px_3px_0_#1E293B] p-4 space-y-3">
            {anomalies.length === 0 ? (
              <div className="p-6 text-center space-y-2 font-mono">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs text-slate-900 font-bold uppercase">
                  [ SEMUA SISTEM AMAN ]
                </p>
                <p className="text-[10px] text-slate-500 uppercase">
                  Tidak terdeteksi anomali void atau manipulasi kasir dalam 24 jam terakhir.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {anomalies.slice(0, 5).map((ano) => (
                  <div
                    key={ano.id}
                    className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-mono space-y-1 hover:border-slate-800 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                          ano.severity === 'CRITICAL' || ano.severity === 'HIGH'
                            ? 'bg-rose-100 text-rose-800 border-rose-400'
                            : 'bg-amber-100 text-amber-800 border-amber-400'
                        }`}
                      >
                        [ {ano.severity || 'ALERT'} ]
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {formatTime(ano.created_at)}
                      </span>
                    </div>
                    <p className="text-slate-800 font-medium leading-relaxed">
                      {ano.description || ano.event_type || 'Aktivitas kasir abnormal terdeteksi'}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-slate-200">
              <Link
                href="/radar"
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-900 hover:text-white text-slate-800 border-2 border-slate-800 rounded-xl py-2.5 text-xs font-mono font-bold uppercase transition-colors shadow-sm"
              >
                <ShieldAlert size={14} />
                <span>LIHAT SEMUA LOG FORENSIK KASIR</span>
              </Link>
            </div>
          </div>

          {/* SAK EMKM / Tax Status Box (Gaya Web App) */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl border-2 border-slate-800 p-4 shadow-[3px_3px_0_#1E293B] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-600 uppercase font-bold">KEPATUHAN PAJAK PP 55/2022</span>
              <span className="bg-[#CCFF00] text-slate-900 px-2 py-0.5 rounded font-black border border-slate-800">[ 0.5% FINAL ]</span>
            </div>
            <p className="text-[11px] font-mono text-slate-600">
              Laporan pembukuan otomatis disinkronkan sesuai standar SAK EMKM untuk keperluan pajak dan pengajuan KUR bank.
            </p>
            <div className="pt-2 flex gap-2">
              <Link
                href="/reports/tax"
                className="flex-1 text-center bg-white hover:bg-slate-100 text-slate-900 border-2 border-slate-800 rounded-xl py-2 text-xs font-mono font-bold uppercase transition-colors shadow-sm"
              >
                REKAP PAJAK
              </Link>
              <Link
                href="/reports/kur-dossier"
                className="flex-1 text-center bg-white hover:bg-slate-100 text-slate-900 border-2 border-slate-800 rounded-xl py-2 text-xs font-mono font-bold uppercase transition-colors shadow-sm"
              >
                BERKAS KUR
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
