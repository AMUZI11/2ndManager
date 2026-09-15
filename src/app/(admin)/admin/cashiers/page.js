"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  ShieldAlert,
  Store,
  Key,
  Mail,
  Building2,
  CheckCircle2,
  AlertCircle,
  Zap,
  ArrowRight,
  RefreshCw,
  Clock,
  Sparkles
} from 'lucide-react';
import { useCashierManagement } from '@/hooks/useCashierManagement';

export default function AdminCashiersPage() {
  const {
    cashiers,
    branches,
    loading,
    actionLoading,
    error,
    success,
    setError,
    setSuccess,
    loadData,
    addCashier,
    tier,
    baseCashiersQuota,
    extraCashiersQuota,
    maxAllowedCashiers,
    currentActiveCount,
    isQuotaFull,
  } = useCashierManagement();

  // Form State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [branchId, setBranchId] = useState('');

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      await addCashier({ username, email, password, branchId });
      setUsername('');
      setEmail('');
      setPassword('');
      setBranchId('');
      setIsCreateOpen(false);
    } catch (err) {
      // Handled in hook
    }
  };

  const percentage = Math.min(100, Math.round((currentActiveCount / Math.max(1, maxAllowedCashiers)) * 100));

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-24">
      {/* Top Header */}
      <div className="bg-white border-2 border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[6px_6px_0px_#1E293B] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#CCFF00] border-2 border-slate-800 rounded-full font-mono text-xs font-black text-slate-900 shadow-[2px_2px_0px_#1E293B]">
            <Users size={14} strokeWidth={2.5} /> OPERASIONAL STAF
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-slate-900 uppercase tracking-tight">
            MANAJEMEN AKUN KASIR
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-xl">
            Atur staf kasir yang bertugas di gerai fisik Anda. Setiap akun memiliki sesi terisolasi untuk pencatatan transaksi POS.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="btn-arcade p-3 bg-slate-100 hover:bg-slate-200 border-2 border-slate-800 rounded-2xl shadow-[3px_3px_0px_#1E293B] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer text-slate-800"
            title="Refresh Data"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          {isQuotaFull ? (
            <Link
              href="/billing"
              className="btn-arcade px-5 py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-mono text-xs font-black rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#1E293B] flex items-center gap-2 transition-all cursor-pointer"
            >
              <Zap size={16} strokeWidth={2.5} />
              <span>[ ⚡ KUOTA PENUH — BELI SLOT KASIR ]</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="btn-arcade px-5 py-3 bg-[#CCFF00] hover:bg-[#b8e600] text-slate-950 font-mono text-xs font-black rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#1E293B] flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
            >
              <UserPlus size={16} strokeWidth={2.5} />
              <span>[ + TAMBAH KASIR BARU ]</span>
            </button>
          )}
        </div>
      </div>

      {/* Bento Progress Meter & Quota Status */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Progress Bar Neo-Brutalist */}
        <div className="md:col-span-8 bg-white border-2 border-slate-800 rounded-3xl p-6 shadow-[5px_5px_0px_#1E293B] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-slate-100 pb-3">
            <div className="font-mono text-xs font-black text-slate-500 uppercase tracking-wider">
              KAPASITAS AKUN KASIR AKTIF
            </div>
            <div className="font-mono text-xs font-black px-2.5 py-1 bg-slate-900 text-[#CCFF00] rounded-lg">
              {currentActiveCount} / {maxAllowedCashiers} STAF AKTIF
            </div>
          </div>

          {/* Progress Track */}
          <div className="space-y-2">
            <div className="h-6 w-full bg-slate-100 border-2 border-slate-800 rounded-xl overflow-hidden p-0.5 shadow-inner">
              <div
                className={`h-full rounded-lg transition-all duration-500 border border-slate-900 ${
                  isQuotaFull ? 'bg-amber-400' : 'bg-[#CCFF00]'
                }`}
                style={{ width: `${Math.max(5, percentage)}%` }}
              />
            </div>
            <div className="flex items-center justify-between font-mono text-[11px] text-slate-500 font-bold">
              <span>0 Staf</span>
              <span>
                Tier {tier}: {baseCashiersQuota} Dasar + {extraCashiersQuota} Add-on = {maxAllowedCashiers} Maksimal
              </span>
            </div>
          </div>

          {isQuotaFull && (
            <div className="p-3.5 bg-amber-50 border-2 border-amber-400 rounded-2xl flex items-center justify-between gap-3 font-mono text-xs text-amber-950">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-700 shrink-0" />
                <span>Batas kuota kasir tercapai. Tambah slot ekstra tanpa perlu upgrade paket di menu Billing.</span>
              </div>
              <Link
                href="/billing"
                className="btn-arcade px-3 py-1.5 bg-amber-400 hover:bg-amber-500 font-black text-slate-900 rounded-xl border border-slate-900 shrink-0 uppercase text-[11px]"
              >
                Beli Add-on ➔
              </Link>
            </div>
          )}
        </div>

        {/* Quota Summary Card */}
        <div className="md:col-span-4 bg-slate-900 text-white border-2 border-slate-800 rounded-3xl p-6 shadow-[5px_5px_0px_#1E293B] flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-400 uppercase">TIER LANGGANAN</span>
              <span className="px-2 py-0.5 bg-[#CCFF00] text-slate-900 font-mono text-[10px] font-black rounded uppercase">
                {tier}
              </span>
            </div>
            <div className="font-display font-black text-2xl text-white">
              {maxAllowedCashiers - currentActiveCount} Slot Tersisa
            </div>
            <p className="text-xs text-slate-400">
              Slot kasir tambahan aktif secara instan dengan harga terjangkau Rp 20.000/staf/bulan.
            </p>
          </div>

          <Link
            href="/billing"
            className="btn-arcade w-full py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-mono text-xs font-black rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_#000] text-center flex items-center justify-center gap-2 uppercase transition-all"
          >
            <span>Tambah Kapasitas</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-rose-50 border-2 border-rose-500 rounded-2xl text-rose-900 font-mono text-xs flex items-center gap-2.5 shadow-[2px_2px_0px_#E11D48]">
          <AlertCircle size={18} className="text-rose-600 shrink-0" />
          <span className="font-bold">{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-500 rounded-2xl text-emerald-900 font-mono text-xs flex items-center gap-2.5 shadow-[2px_2px_0px_#10B981]">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span className="font-bold">{success}</span>
        </div>
      )}

      {/* Cashier List Bento Grid */}
      <div className="bg-white border-2 border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[5px_5px_0px_#1E293B] space-y-6">
        <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4">
          <div className="space-y-1">
            <h2 className="text-lg font-display font-black text-slate-900 uppercase">
              DAFTAR AKUN KASIR TERDAFTAR
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Total {cashiers.length} akun kasir aktif di seluruh gerai toko fisik
            </p>
          </div>
          <span className="font-mono text-xs font-bold text-slate-500">
            [ {cashiers.length} Terpasang ]
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center font-mono text-xs text-slate-500 flex flex-col items-center justify-center gap-3">
            <RefreshCw size={24} className="animate-spin text-slate-400" />
            <span>Memuat data akun kasir...</span>
          </div>
        ) : cashiers.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-300 rounded-2xl p-8 space-y-3">
            <Users size={36} className="mx-auto text-slate-400" />
            <h3 className="font-display font-black text-base text-slate-800 uppercase">
              Belum Ada Akun Kasir
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Buat akun kasir pertama Anda untuk mendelegasikan tugas penjualan di toko fisik dengan hak akses kasir terbatas.
            </p>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              disabled={isQuotaFull}
              className="btn-arcade mt-2 px-4 py-2 bg-[#CCFF00] hover:bg-[#b8e600] font-mono text-xs font-black text-slate-950 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_#1E293B]"
            >
              [ + Tambah Kasir Pertama ]
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cashiers.map((c) => (
              <div
                key={c.id}
                className="p-5 bg-slate-50 border-2 border-slate-800 rounded-2xl shadow-[3px_3px_0px_#1E293B] flex flex-col justify-between space-y-4 hover:-translate-y-0.5 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-500 rounded-lg font-mono text-[10px] font-black uppercase">
                      STATUS: AKTIF
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('id-ID') : 'Aktif'}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-display font-black text-lg text-slate-900">
                      {c.username || 'Kasir Warung'}
                    </h4>
                    <p className="text-xs font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                      <Building2 size={13} className="text-slate-400" />
                      <span>{c.shops?.name || 'Semua Cabang / Pusat'}</span>
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-600">
                  <span className="flex items-center gap-1">
                    <Key size={12} className="text-slate-400" />
                    <span>Role: {c.role || 'CASHIER'}</span>
                  </span>
                  <span className="text-slate-400">POS Ready</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Buat Akun Kasir */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-[8px_8px_0px_#1E293B] space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b-2 border-slate-100 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#CCFF00] border border-slate-900 rounded-full font-mono text-[10px] font-black text-slate-900 mb-1">
                  <UserPlus size={12} /> TAMBAH STAF
                </div>
                <h3 className="text-xl font-display font-black text-slate-900 uppercase">
                  DAFTARKAN AKUN KASIR
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  NAMA / USERNAME KASIR
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full bg-slate-50 border-2 border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold focus:bg-lime-50 outline-none shadow-[2px_2px_0px_#1E293B]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  EMAIL LOGIN KASIR
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="kasir.budi@warung.com"
                  className="w-full bg-slate-50 border-2 border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold focus:bg-lime-50 outline-none shadow-[2px_2px_0px_#1E293B]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  KATA SANDI (MINIMAL 8 KARAKTER)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border-2 border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold focus:bg-lime-50 outline-none shadow-[2px_2px_0px_#1E293B]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  CABANG PENUGASAN
                </label>
                <select
                  required
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold focus:bg-lime-50 outline-none shadow-[2px_2px_0px_#1E293B]"
                >
                  <option value="">-- Pilih Cabang Penugasan --</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.shop_id || b.id}>
                      {b.name || b.branch_name} {b.is_main_branch ? '(Pusat)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t-2 border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="btn-arcade px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl border border-slate-800 cursor-pointer"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-arcade px-5 py-2.5 bg-[#CCFF00] hover:bg-[#b8e600] text-slate-950 font-black rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_#1E293B] cursor-pointer active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-2"
                >
                  {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : null}
                  <span>SIMPAN AKUN KASIR</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
