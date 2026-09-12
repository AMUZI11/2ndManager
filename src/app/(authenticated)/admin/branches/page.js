"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Store,
  Plus,
  Users,
  ShieldCheck,
  RefreshCw,
  MapPin,
  Phone,
  ArrowRightLeft,
  X,
  Lock,
  Smartphone,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AdminBranchesPage() {
  const supabase = createClient();

  const [branches, setBranches] = useState([]);
  const [cashiers, setCashiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal States
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [isCashierModalOpen, setIsCashierModalOpen] = useState(false);
  const [selectedBranchForCashier, setSelectedBranchForCashier] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // New Branch Form
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPhone, setBranchPhone] = useState('');

  // New Cashier Form
  const [cashierName, setCashierName] = useState('');
  const [cashierEmail, setCashierEmail] = useState('');
  const [cashierPassword, setCashierPassword] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [branchRes, cashierRes] = await Promise.all([
        fetch('/api/v1/branches'),
        fetch('/api/v1/cashiers'),
      ]);

      const branchJson = await branchRes.json();
      const cashierJson = await cashierRes.json();

      setBranches(branchJson?.data || []);
      setCashiers(cashierJson?.data || []);
    } catch (err) {
      console.error('[Branches Load Error]', err);
      setError('Gagal memuat daftar cabang dan kasir.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    if (!branchName.trim()) {
      alert('Nama cabang wajib diisi!');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/v1/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: branchName.trim(),
          address: branchAddress.trim(),
          phone_number: branchPhone.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Gagal mendaftarkan cabang baru');
      }

      setIsBranchModalOpen(false);
      setBranchName('');
      setBranchAddress('');
      setBranchPhone('');
      await loadData();
    } catch (err) {
      console.error('[Create Branch Error]', err);
      alert(err.message || 'Gagal mendaftarkan cabang');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCashier = async (e) => {
    e.preventDefault();
    if (!selectedBranchForCashier) return;

    if (cashierPassword.length < 8) {
      alert('Kata sandi kasir minimal 8 karakter!');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/v1/cashiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashier_name: cashierName.trim(),
          username: cashierName.trim().toLowerCase().replace(/\s+/g, '_'),
          email: cashierEmail.trim(),
          password: cashierPassword,
          branch_id: selectedBranchForCashier.id,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Gagal menambahkan kasir baru');
      }

      setIsCashierModalOpen(false);
      setCashierName('');
      setCashierEmail('');
      setCashierPassword('');
      setSelectedBranchForCashier(null);
      await loadData();
    } catch (err) {
      console.error('[Create Cashier Error]', err);
      alert(err.message || 'Gagal mendaftarkan kasir');
    } finally {
      setSubmitting(false);
    }
  };

  const maxBranches = 3;
  const currentBranchCount = branches.length;
  const isQuotaFull = currentBranchCount >= maxBranches;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-mono">
      {/* ─── 1. HEADER SECTION ─── */}
      <div className="bg-[#0F172A] border-2 border-[#1E293B] p-4 sm:p-5 shadow-[3px_3px_0px_#000000] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-[#CCFF00] tracking-widest uppercase">
            <span className="w-2.5 h-2.5 bg-[#CCFF00] inline-block border border-black" />
            <span>ARSITEKTUR MULTI-GERAI B2B & KASIR</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight mt-1">
            3 CABANG GERAI & PENUGASAN KASIR
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 bg-[#161F36] hover:bg-[#223055] text-slate-300 border border-[#334155] px-3 py-2 text-xs font-bold uppercase transition-all cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>REFRESH</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBranchModalOpen(true)}
            disabled={isQuotaFull}
            className={`flex items-center gap-1.5 px-4 py-2 border-2 border-black text-xs font-black uppercase transition-all shadow-[2px_2px_0px_#000000] ${
              isQuotaFull
                ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                : 'bg-[#CCFF00] hover:bg-[#b8e600] text-black active:translate-x-0.5 active:translate-y-0.5 cursor-pointer'
            }`}
          >
            <Plus size={15} className="stroke-[3]" />
            <span>{isQuotaFull ? 'KUOTA CABANG PENUH (3/3)' : '+ DAFTARKAN CABANG BARU'}</span>
          </button>
        </div>
      </div>

      {/* ─── 2. QUOTA & SECURITY BANNER ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#0F172A] border-2 border-[#1E293B] p-3.5 shadow-[2px_2px_0px_#000000]">
          <span className="text-[10px] text-slate-400 block uppercase">STATUS KUOTA CABANG</span>
          <div className="flex items-center justify-between mt-1">
            <strong className="text-xl font-black text-white">
              {currentBranchCount} / {maxBranches} GERAI
            </strong>
            <span
              className={`text-[9px] font-black px-1.5 py-0.5 border ${
                isQuotaFull
                  ? 'bg-amber-950 text-amber-300 border-amber-700'
                  : 'bg-emerald-950 text-emerald-300 border-emerald-700'
              }`}
            >
              [ {isQuotaFull ? 'MAKSIMAL' : 'TERSEDIA'} ]
            </span>
          </div>
        </div>

        <div className="bg-[#0F172A] border-2 border-[#1E293B] p-3.5 shadow-[2px_2px_0px_#000000]">
          <span className="text-[10px] text-slate-400 block uppercase">TOTAL OPERATOR KASIR</span>
          <div className="flex items-center justify-between mt-1">
            <strong className="text-xl font-black text-[#CCFF00]">
              {cashiers.length} KASIR AKTIF
            </strong>
            <span className="text-[9px] font-bold bg-[#161F36] text-slate-300 border border-[#334155] px-1.5 py-0.5">
              [ TERISOLASI ]
            </span>
          </div>
        </div>

        <div className="bg-[#0F172A] border-2 border-[#1E293B] p-3.5 shadow-[2px_2px_0px_#000000]">
          <span className="text-[10px] text-slate-400 block uppercase">SECURITY GUARD</span>
          <div className="flex items-center justify-between mt-1">
            <strong className="text-sm font-black text-emerald-400 flex items-center gap-1">
              <ShieldCheck size={16} />
              <span>LOCKSCREEN READY</span>
            </strong>
            <span className="text-[9px] font-mono text-slate-400">HMAC-TOKEN</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-950/60 border-2 border-rose-600 text-rose-300 p-3 text-xs font-bold uppercase">
          PERINGATAN: {error}
        </div>
      )}

      {/* ─── 3. 3-BRANCH GERAI CARDS ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-3 bg-[#0F172A] border-2 border-[#1E293B] p-12 text-center text-slate-400 uppercase">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[#CCFF00]" />
            [ MEMUAT DATA GERAI CABANG... ]
          </div>
        ) : branches.length === 0 ? (
          <div className="col-span-3 bg-[#0F172A] border-2 border-[#1E293B] p-12 text-center text-slate-400 uppercase">
            <Store className="w-10 h-10 mx-auto mb-3 text-slate-600" />
            <p>[ BELUM ADA CABANG TERDAFTAR ]</p>
          </div>
        ) : (
          branches.map((branch, idx) => {
            const branchCashiers = cashiers.filter(
              (c) => c.shop_id === branch.shop_id || c.shop_id === branch.id
            );
            const isMain = branch.is_main_branch || idx === 0;

            return (
              <div
                key={branch.id}
                className={`bg-[#0F172A] border-2 ${
                  isMain ? 'border-[#CCFF00]' : 'border-[#1E293B]'
                } p-5 shadow-[3px_3px_0px_#000000] flex flex-col justify-between space-y-4 relative`}
              >
                {/* Header Gerai */}
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 border ${
                        isMain
                          ? 'bg-[#CCFF00] text-black border-black'
                          : 'bg-black text-slate-300 border-[#334155]'
                      }`}
                    >
                      {branch.branch_code || `CBG-0${idx + 1}`} {isMain ? '(PUSAT)' : ''}
                    </span>

                    <span className="text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700 px-1.5 py-0.5 uppercase">
                      [ {branch.shop?.operational_status || 'OPERASIONAL'} ]
                    </span>
                  </div>

                  <h3 className="text-lg font-black uppercase text-white mt-3 truncate">
                    {branch.name || branch.branch_name}
                  </h3>

                  <div className="space-y-1 mt-2 text-[11px] text-slate-400">
                    <div className="flex items-start gap-1.5">
                      <MapPin size={13} className="shrink-0 mt-0.5 text-slate-500" />
                      <span className="truncate">{branch.address || 'Alamat Toko Belum Diisi'}</span>
                    </div>
                    {branch.phone_number && (
                      <div className="flex items-center gap-1.5">
                        <Phone size={13} className="shrink-0 text-slate-500" />
                        <span>{branch.phone_number}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cashier Assignment List */}
                <div className="bg-[#161F36] border border-[#334155] p-3 space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-bold border-b border-[#334155] pb-1.5">
                    <span>OPERATOR KASIR ({branchCashiers.length})</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBranchForCashier(branch);
                        setIsCashierModalOpen(true);
                      }}
                      className="text-[#CCFF00] hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus size={11} />
                      <span>TAMBAH KASIR</span>
                    </button>
                  </div>

                  {branchCashiers.length === 0 ? (
                    <div className="text-[10px] text-slate-500 py-1 text-center">
                      [ BELUM ADA KASIR DITUGASKAN ]
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {branchCashiers.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between text-[11px] bg-[#0F172A] border border-slate-800 px-2 py-1"
                        >
                          <div className="truncate text-white font-bold uppercase">
                            {c.username || c.shops?.name}
                          </div>
                          <span className="text-[9px] bg-black text-[#CCFF00] px-1 py-0.2">
                            KASIR
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Device Guard Status */}
                <div className="text-[10px] bg-black/60 border border-slate-800 p-2 text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>ISOLASI STOK:</span>
                    <span className="text-emerald-400 font-bold">100% TERLINDUNGI</span>
                  </div>
                  <div className="flex justify-between">
                    <span>MUTASI ANTAR-CABANG:</span>
                    <span className="text-[#CCFF00] font-bold">PIN 2-ARAH AKTIF</span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-[#1E293B] flex gap-2">
                  <Link
                    href={`/admin/inventory?branch=${branch.shop_id || branch.id}`}
                    className="flex-1 bg-[#161F36] hover:bg-[#223055] text-slate-300 text-center py-2 text-xs font-bold uppercase border border-[#334155] transition-colors"
                  >
                    STOK GERAI
                  </Link>
                  <Link
                    href="/transfers"
                    className="flex-1 bg-[#CCFF00] hover:bg-[#b8e600] text-black text-center py-2 text-xs font-black uppercase border-2 border-black shadow-[2px_2px_0px_#000000] transition-colors flex items-center justify-center gap-1"
                  >
                    <ArrowRightLeft size={12} />
                    <span>MUTASI</span>
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ─── 4. MODAL: DAFTAR CABANG BARU ─── */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#0F172A] border-2 border-[#CCFF00] shadow-[6px_6px_0px_#000000] max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b-2 border-[#1E293B] pb-3">
              <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
                <Store size={18} className="text-[#CCFF00]" />
                <span>DAFTARKAN CABANG GERAI BARU</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsBranchModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">
                  NAMA CABANG GERAI *
                </label>
                <input
                  type="text"
                  required
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="CONTOH: WARUNG MADURA CABANG PASAR MINGGU"
                  className="w-full bg-[#161F36] border-2 border-[#334155] focus:border-[#CCFF00] text-white px-3 py-2 font-mono uppercase focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">
                  ALAMAT LENGKAP GERAI
                </label>
                <textarea
                  rows={3}
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  placeholder="JL. RAYA NO. 123, RT 01 / RW 02..."
                  className="w-full bg-[#161F36] border-2 border-[#334155] focus:border-[#CCFF00] text-white px-3 py-2 font-mono uppercase focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">
                  NO TELEPON / WHATSAPP GERAI
                </label>
                <input
                  type="text"
                  value={branchPhone}
                  onChange={(e) => setBranchPhone(e.target.value)}
                  placeholder="08123456789"
                  className="w-full bg-[#161F36] border-2 border-[#334155] focus:border-[#CCFF00] text-white px-3 py-2 font-mono focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-[#1E293B] flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="flex-1 bg-[#161F36] text-slate-300 border border-[#334155] py-2 font-bold uppercase"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#CCFF00] text-black border-2 border-black py-2 font-black uppercase shadow-[2px_2px_0px_#000000] disabled:opacity-50"
                >
                  {submitting ? 'MENDAFTARKAN...' : 'SIMPAN CABANG'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 5. MODAL: TAMBAH KASIR BARU ─── */}
      {isCashierModalOpen && selectedBranchForCashier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#0F172A] border-2 border-[#CCFF00] shadow-[6px_6px_0px_#000000] max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b-2 border-[#1E293B] pb-3">
              <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
                <Users size={18} className="text-[#CCFF00]" />
                <span>PENUGASAN KASIR UNTUK {selectedBranchForCashier.name || selectedBranchForCashier.branch_name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCashierModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateCashier} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">
                  NAMA OPERATOR KASIR *
                </label>
                <input
                  type="text"
                  required
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                  placeholder="CONTOH: AGUS PRASETYO"
                  className="w-full bg-[#161F36] border-2 border-[#334155] focus:border-[#CCFF00] text-white px-3 py-2 font-mono uppercase focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">
                  EMAIL LOGIN KASIR *
                </label>
                <input
                  type="email"
                  required
                  value={cashierEmail}
                  onChange={(e) => setCashierEmail(e.target.value)}
                  placeholder="kasir1@warunganda.com"
                  className="w-full bg-[#161F36] border-2 border-[#334155] focus:border-[#CCFF00] text-white px-3 py-2 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">
                  KATA SANDI KASIR (MINIMAL 8 KARAKTER) *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={cashierPassword}
                  onChange={(e) => setCashierPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#161F36] border-2 border-[#334155] focus:border-[#CCFF00] text-white px-3 py-2 font-mono focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-[#1E293B] flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCashierModalOpen(false)}
                  className="flex-1 bg-[#161F36] text-slate-300 border border-[#334155] py-2 font-bold uppercase"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#CCFF00] text-black border-2 border-black py-2 font-black uppercase shadow-[2px_2px_0px_#000000] disabled:opacity-50"
                >
                  {submitting ? 'MEMPROSES...' : 'TUGASKAN KASIR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
