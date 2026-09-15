"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Crown,
  Store,
  Plus,
  ShieldCheck,
  Lock,
  Trash2,
  ExternalLink,
  RefreshCw,
  GitFork,
  CheckCircle2,
  AlertCircle,
  Building2,
  MapPin,
  Phone,
  Layers,
  ArrowRight,
  Zap
} from 'lucide-react';

export default function AdminBranchesPage() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [creating, setCreating] = useState(false);

  // Delete State
  const [deletingId, setDeletingId] = useState(null);
  const [billingStatus, setBillingStatus] = useState(null);

  const fetchBranches = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const [res, blRes] = await Promise.all([
        fetch('/api/v1/branches', { cache: 'no-store' }),
        fetch('/api/v1/billing/status', { cache: 'no-store' }),
      ]);
      const json = await res.json();
      if (res.ok && json.data) {
        setBranches(json.data || []);
      } else {
        setErrorMsg(json.error?.message || 'Gagal memuat daftar cabang.');
      }
      if (blRes.ok) {
        const blJson = await blRes.json();
        setBillingStatus(blJson?.data || null);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat memuat data cabang.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const rootBranch = branches.find((b) => b.is_main_branch === true);
  const childBranches = branches.filter((b) => !b.is_main_branch);

  // Hitung kuota aktif dari view kuota efektif dan status add-on
  const currentTier = (billingStatus?.tier || rootBranch?.shop?.subscription_tier || 'MAGANG').toUpperCase();
  const isEksekutif = currentTier === 'EKSEKUTIF' || currentTier === 'JURAGAN_CABANG';
  const baseQuota = isEksekutif ? 3 : 1;
  const extraBranchesQuota = billingStatus?.extra_branches_quota || 0;
  const maxQuota = billingStatus?.max_allowed_branches || (baseQuota + extraBranchesQuota);
  const isQuotaFull = branches.length >= maxQuota;

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    if (!newBranchName.trim()) {
      setErrorMsg('Nama cabang wajib diisi.');
      return;
    }

    try {
      setCreating(true);
      setErrorMsg('');
      const res = await fetch('/api/v1/branches/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch_name: newBranchName.trim(),
          address: newAddress.trim() || null,
          phone: newPhone.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Gagal membuat cabang baru.');
      }

      setSuccessMsg(`Cabang "${newBranchName}" berhasil dibuat sebagai anak dari ${rootBranch?.branch_name || 'Toko Utama'}!`);
      setNewBranchName('');
      setNewAddress('');
      setNewPhone('');
      setIsCreateOpen(false);
      await fetchBranches();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteChildBranch = async (branch) => {
    if (branch.is_main_branch) {
      alert('2NDM-40301: Toko Utama (Toko A) adalah jangkar organisasi dan tidak dapat dihapus!');
      return;
    }

    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus cabang anak "${branch.branch_name}"?\nOperasi ini tidak dapat dibatalkan.`
    );
    if (!confirmDelete) return;

    try {
      setDeletingId(branch.id);
      setErrorMsg('');
      const res = await fetch(`/api/v1/branches?id=${branch.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || 'Gagal menghapus cabang.');
      }

      setSuccessMsg(`Cabang "${branch.branch_name}" berhasil dihapus.`);
      await fetchBranches();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-32 max-w-7xl mx-auto p-4 sm:p-6 font-sans">
      {/* HEADER SECTION */}
      <div className="bg-white rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#CCFF00] border-2 border-slate-800 rounded-lg text-xs font-black font-mono tracking-wider shadow-[2px_2px_0px_#1E293B]">
            <GitFork size={14} className="text-slate-900" />
            TOPOLOGI HIERARKI CABANG
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display uppercase text-slate-900 tracking-tight">
            Root Anchor Store & Manajemen Multi-Cabang
          </h1>
          <p className="text-slate-600 text-sm max-w-2xl">
            Toko A berstatus sebagai <strong className="text-slate-900">Genesis Root Anchor</strong> yang tidak dapat dihapus. Seluruh cabang baru secara otomatis berinduk ke Toko A di bawah 1 langganan organisasi.
          </p>
        </div>

        {/* ACTION BUTTON */}
        <div className="flex items-center gap-3">
          {isQuotaFull ? (
            <Link
              href="/billing"
              className="btn-arcade flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border-2 border-slate-900 bg-amber-400 hover:bg-amber-500 text-slate-950 font-mono text-xs font-black shadow-[4px_4px_0px_#1E293B] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer uppercase"
            >
              <Zap size={16} strokeWidth={2.5} />
              <span>[ ⚡ KUOTA PENUH — BELI SLOT CABANG ]</span>
            </Link>
          ) : (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="btn-arcade flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border-2 border-slate-900 bg-[#CCFF00] hover:bg-[#b8e600] text-slate-900 font-mono text-xs font-black shadow-[4px_4px_0px_#1E293B] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer uppercase"
            >
              <Plus size={18} strokeWidth={2.5} />
              <span>Tambah Cabang Anak</span>
            </button>
          )}
        </div>
      </div>

      {/* Neo-Brutalist Capacity Progress Bar */}
      <div className="bg-white border-2 border-slate-800 rounded-3xl p-6 shadow-[5px_5px_0px_#1E293B] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-slate-100 pb-3">
          <div className="font-mono text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Building2 size={16} className="text-slate-700" />
            <span>KAPASITAS GERAI: [ {branches.length} / {maxQuota} AKTIF ]</span>
          </div>
          <div className="font-mono text-[11px] font-bold text-slate-600">
            (1 Toko Induk + {Math.max(0, baseQuota - 1)} Tier Dasar + {extraBranchesQuota} Add-on)
          </div>
        </div>

        <div className="space-y-2">
          <div className="h-6 w-full bg-slate-100 border-2 border-slate-800 rounded-xl overflow-hidden p-0.5 shadow-inner">
            <div
              className={`h-full rounded-lg transition-all duration-500 border border-slate-900 ${
                isQuotaFull ? 'bg-amber-400' : 'bg-[#CCFF00]'
              }`}
              style={{
                width: `${Math.min(100, Math.max(8, Math.round((branches.length / Math.max(1, maxQuota)) * 100)))}%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between font-mono text-[11px] text-slate-500 font-bold">
            <span>Status: {branches.length} Gerai Fisik Beroperasi</span>
            <span>Maksimal Kuota: {maxQuota} Cabang</span>
          </div>
        </div>

        {isQuotaFull && (
          <div className="p-3.5 bg-amber-50 border-2 border-amber-400 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs text-amber-950">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-700 shrink-0" />
              <span>Kuota cabang penuh. Perluas jangkauan warung Anda dengan menambah slot cabang fleksibel.</span>
            </div>
            <Link
              href="/billing"
              className="btn-arcade px-3.5 py-1.5 bg-amber-400 hover:bg-amber-500 font-black text-slate-900 rounded-xl border border-slate-900 shrink-0 uppercase text-[11px] text-center"
            >
              Beli Slot Cabang ➔
            </Link>
          </div>
        )}
      </div>

      {/* ALERT NOTIFICATIONS */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border-2 border-rose-600 rounded-xl shadow-[3px_3px_0px_#E11D48] flex items-start gap-3 text-rose-900 text-sm">
          <AlertCircle size={20} className="text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Perhatian Terdeteksi:</p>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-600 rounded-xl shadow-[3px_3px_0px_#059669] flex items-start gap-3 text-emerald-900 text-sm">
          <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Berhasil:</p>
            <p>{successMsg}</p>
          </div>
        </div>
      )}

      {/* TREE TOPOLOGY CONTAINER */}
      <div className="bg-slate-50 border-2 border-slate-800 rounded-2xl shadow-[4px_4px_0px_#1E293B] p-6 sm:p-10 space-y-8">
        <div className="flex items-center justify-between border-b-2 border-slate-200 pb-4">
          <div className="flex items-center gap-2">
            <Layers size={20} className="text-slate-800" />
            <h2 className="font-black font-display text-lg uppercase tracking-tight text-slate-900">
              Pohon Hierarki Fisik Gerai
            </h2>
          </div>
          <button
            onClick={fetchBranches}
            className="p-2 hover:bg-white border border-slate-300 rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
            title="Muat Ulang"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* LOADING STATE */}
        {loading && branches.length === 0 ? (
          <div className="py-16 text-center">
            <RefreshCw size={32} className="animate-spin text-slate-400 mx-auto mb-3" />
            <p className="font-mono text-sm uppercase tracking-wider text-slate-500">Membaca Topologi Database...</p>
          </div>
        ) : null}

        {/* LEVEL 1: ROOT ANCHOR (TOKO A) */}
        {rootBranch && (
          <div className="flex flex-col items-center">
            <div className="w-full max-w-xl bg-white border-2 border-slate-800 rounded-2xl shadow-[6px_6px_0px_#1E293B] p-6 relative overflow-hidden">
              {/* Header Badge */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 border-2 border-amber-800 rounded-lg text-xs font-black text-amber-900 shadow-[2px_2px_0px_#92400E]">
                  <Crown size={14} className="text-amber-700 fill-amber-500" />
                  👑 TOKO UTAMA (PUSAT)
                </span>
                <span className="font-mono text-xs font-black px-2.5 py-1 bg-slate-100 border border-slate-400 rounded text-slate-800">
                  {rootBranch.branch_code || 'CBG-01'}
                </span>
              </div>

              {/* Body Info */}
              <h3 className="text-xl font-black font-display text-slate-900 mb-1">
                {rootBranch.branch_name || rootBranch.name}
              </h3>
              <p className="text-xs text-slate-500 font-mono mb-4">
                Jangkar Utama Organisasi • Genesis Root Node
              </p>

              <div className="space-y-2 py-3 border-y border-slate-200 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-slate-400 flex-shrink-0" />
                  <span>{rootBranch.address || 'Kantor Pusat'}</span>
                </div>
                {rootBranch.phone_number && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-slate-400 flex-shrink-0" />
                    <span>{rootBranch.phone_number}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-4 flex items-center justify-between pt-2">
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-700 inline-block animate-pulse"></span>
                  OPERASIONAL AKTIF
                </div>

                {/* Proteksi Hapus: Diberi gembok dan dinonaktifkan permanen */}
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-400 text-xs font-mono font-bold cursor-not-allowed"
                  title="2NDM-40301: Toko Utama (Toko A) dilindungi trigger database dan tidak dapat dihapus!"
                >
                  <Lock size={12} className="text-slate-400" />
                  HAPUS DIKUNCI
                </div>
              </div>
            </div>

            {/* TREE CONNECTOR LINE */}
            <div className="w-0.5 h-12 bg-slate-800 relative">
              <div className="absolute -bottom-2 -left-1.5 w-3.5 h-3.5 rounded-full bg-[#CCFF00] border-2 border-slate-800"></div>
            </div>
          </div>
        )}

        {/* LEVEL 2: CHILD BRANCHES (CABANG 2 & 3) */}
        <div className="space-y-4">
          <div className="text-center">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-500 bg-white px-3 py-1 border border-slate-300 rounded-full">
              Daftar Cabang Anak ({childBranches.length} Gerai)
            </span>
          </div>

          {childBranches.length === 0 ? (
            <div className="max-w-xl mx-auto bg-white border-2 border-dashed border-slate-400 rounded-2xl p-8 text-center space-y-3">
              <Store size={36} className="text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Belum Ada Cabang Anak Terdaftar</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {isQuotaFull
                  ? 'Organisasi Anda berada pada kuota gerai maksimal (Tier Magang 1 gerai). Upgrade ke Eksekutif untuk membuka hingga 3 gerai.'
                  : `Tambahkan cabang baru sekarang. Cabang baru akan otomatis berinduk ke ${rootBranch?.branch_name || 'Toko Utama'}.`}
              </p>
              {!isQuotaFull && (
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 shadow-[2px_2px_0px_#1E293B]"
                >
                  <Plus size={14} />
                  Tambah Cabang Sekarang
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {childBranches.map((cb) => (
                <div
                  key={cb.id}
                  className="bg-white border-2 border-slate-800 rounded-2xl shadow-[4px_4px_0px_#1E293B] p-6 flex flex-col justify-between"
                >
                  <div>
                    {/* Header Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-100 border border-sky-800 rounded-lg text-xs font-black text-sky-900 shadow-sm">
                        <Store size={14} className="text-sky-700" />
                        🏬 CABANG DARI: {cb.parent_store_name || rootBranch?.branch_name || 'TOKO A'}
                      </span>
                      <span className="font-mono text-xs font-black px-2 py-0.5 bg-slate-100 border border-slate-400 rounded text-slate-800">
                        {cb.branch_code}
                      </span>
                    </div>

                    <h3 className="text-lg font-black font-display text-slate-900 mb-1">
                      {cb.branch_name || cb.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mb-4">
                      Cabang Anak • Relasi ID: {cb.id.substring(0, 8)}...
                    </p>

                    <div className="space-y-1.5 py-2 border-y border-slate-100 text-xs text-slate-700 mb-4">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-slate-400 flex-shrink-0" />
                        <span>{cb.address || 'Alamat cabang belum diatur'}</span>
                      </div>
                      {cb.phone_number && (
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="text-slate-400 flex-shrink-0" />
                          <span>{cb.phone_number}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                      <CheckCircle2 size={14} />
                      Aktif
                    </span>

                    <button
                      onClick={() => handleDeleteChildBranch(cb)}
                      disabled={deletingId === cb.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 hover:border-rose-400 rounded-lg text-xs font-bold transition-colors"
                    >
                      <Trash2 size={14} />
                      {deletingId === cb.id ? 'Menghapus...' : 'Tutup Cabang'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL TAMBAH CABANG ANAK */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-slate-800 rounded-2xl shadow-[8px_8px_0px_#1E293B] max-w-md w-full p-6 sm:p-8 animate-fade-in space-y-6">
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-black font-display uppercase text-slate-900">
                  Tambah Cabang Baru
                </h3>
                <p className="text-xs text-slate-600 font-mono mt-0.5">
                  Induk: <strong className="text-slate-900">{rootBranch?.branch_name || 'Toko Utama'}</strong>
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg border border-slate-300 text-slate-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="space-y-4">
              <div>
                <label className="block font-mono text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Nama Cabang *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Cabang Glodok / Pasar Subuh"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-800 rounded-xl font-sans text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#CCFF00]"
                />
              </div>

              <div>
                <label className="block font-mono text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Alamat Gerai (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Jl. Pintu Besar Selatan No. 12..."
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-800 rounded-xl font-sans text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#CCFF00]"
                />
              </div>

              <div>
                <label className="block font-mono text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  No. Telepon / WhatsApp (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="08123456789"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-800 rounded-xl font-sans text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#CCFF00]"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900">
                <p className="font-bold flex items-center gap-1 mb-0.5">
                  <ShieldCheck size={14} className="text-amber-700" />
                  Keterikatan Hierarki Otomatis:
                </p>
                Cabang ini akan secara otomatis terikat ke Toko A sebagai cabang anak, mewarisi lisensi organisasi, dan dapat disupervisi langsung oleh Owner.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 border-2 border-slate-800 rounded-xl font-black text-xs uppercase tracking-wider text-slate-700 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 bg-[#CCFF00] hover:bg-[#b8e600] border-2 border-slate-800 rounded-xl font-black text-xs uppercase tracking-wider text-slate-900 shadow-[2px_2px_0px_#1E293B] active:translate-x-[1px] active:translate-y-[1px]"
                >
                  {creating ? 'Menyimpan...' : 'Simpan Cabang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
