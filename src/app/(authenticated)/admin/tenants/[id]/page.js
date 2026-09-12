"use client";

import React, { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Store, 
  ShieldAlert, 
  Calendar, 
  Users, 
  FileText, 
  History, 
  CheckCircle2,
  Clock,
  AlertOctagon,
  Cpu,
  Save,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import ChokeholdModal from '@/components/admin/ChokeholdModal';

export default function TenantDetailPage({ params }) {
  const unwrappedParams = use(params);
  const shopId = unwrappedParams.id;

  const [shop, setShop] = useState(null);
  const [capacity, setCapacity] = useState(null);
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Override Form States
  const [overrideLimit, setOverrideLimit] = useState(1);
  const [overrideReason, setOverrideReason] = useState('');
  const [savingOverride, setSavingOverride] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState(null); // { type: 'success' | 'error', text: '' }

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/admin/tenants/${shopId}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setShop(json.data.shop);
        setCapacity(json.data.capacity);
        setTelemetry(json.data.telemetry);
        setOverrideLimit(json.data.capacity?.total_allowed || json.data.shop?.cashier_limit || 1);
      } else {
        // Fallback search jika endpoint id mengembalikan selain 200
        const fallbackRes = await fetch(`/api/v1/admin/tenants?search=${shopId}`);
        const fallbackJson = await fallbackRes.json();
        if (fallbackRes.ok && fallbackJson.data?.tenants?.length > 0) {
          const s = fallbackJson.data.tenants[0];
          setShop(s);
          setOverrideLimit(s.cashier_limit || 1);
        }
      }
    } catch (err) {
      console.error('[Fetch Tenant Detail Error]', err);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleSaveOverride = async (e) => {
    e.preventDefault();
    if (!overrideReason || overrideReason.trim().length < 10) {
      setOverrideStatus({
        type: 'error',
        text: 'Justifikasi wajib diisi minimal 10 karakter untuk dicatat di Immutable Audit Log.',
      });
      return;
    }

    try {
      setSavingOverride(true);
      setOverrideStatus(null);

      const res = await fetch(`/api/v1/admin/tenants/${shopId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashier_limit: parseInt(overrideLimit, 10),
          reason: overrideReason.trim(),
        }),
      });

      const json = await res.json();
      if (res.ok && json.data) {
        setOverrideStatus({
          type: 'success',
          text: json.message || 'Kapasitas kasir berhasil diperbarui dan disinkronkan secara realtime.',
        });
        setOverrideReason('');
        await fetchDetail();
      } else {
        throw new Error(json.message || 'Gagal menyimpan override kuota.');
      }
    } catch (err) {
      setOverrideStatus({
        type: 'error',
        text: err.message || 'Terjadi kesalahan sistem saat memperbarui kuota.',
      });
    } finally {
      setSavingOverride(false);
    }
  };

  if (loading && !shop) {
    return (
      <div className="py-20 text-center text-slate-500 font-mono text-xs space-y-3">
        <div className="w-8 h-8 border-2 border-slate-800 border-t-[#CCFF00] rounded-full animate-spin mx-auto" />
        <p>Memuat data inspeksi tenant #{shopId.slice(0, 8)}...</p>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="py-16 text-center text-slate-500 font-mono text-xs space-y-3">
        <p>Toko tidak ditemukan atau ID tidak valid.</p>
        <Link href="/admin/tenants" className="text-slate-900 underline font-bold">
          Kembali ke Direktori Penyewa
        </Link>
      </div>
    );
  }

  const baseLimit = capacity?.base_limit || (shop.subscription_tier === 'EKSEKUTIF' ? 10 : shop.subscription_tier === 'MANAJER' ? 5 : shop.subscription_tier === 'SUPERVISOR' ? 2 : 1);
  const currentTotal = shop.cashier_limit || baseLimit;
  const addOnsCount = Math.max(0, currentTotal - baseLimit);

  return (
    <div className="space-y-6 font-sans max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-200 pb-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/admin/tenants"
            className="h-10 w-10 rounded-xl bg-white border-2 border-slate-800 text-slate-700 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer shadow-[2px_2px_0_#1E293B]"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-heading font-black text-xl text-slate-900 uppercase tracking-tight">
                {shop.name}
              </h2>
              <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-300">#{shop.id.slice(0, 8)}</span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Terdaftar sejak: {new Date(shop.created_at).toLocaleDateString('id-ID', { dateStyle: 'long' })}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={async () => {
              const reason = window.prompt('Masukkan justifikasi audit untuk sesi Ghost Inspection (minimal 10 karakter):');
              if (!reason || reason.trim().length < 10) {
                alert('Justifikasi wajib diisi minimal 10 karakter untuk dicatat di immutable audit log.');
                return;
              }
              try {
                const res = await fetch('/api/v1/admin/tenants/' + shop.id + '/impersonate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ reason: reason.trim() }),
                });
                const json = await res.json();
                if (res.ok && json.data) {
                  localStorage.setItem('hl_active_branch', shop.id);
                  localStorage.setItem('hl_ghost_session', JSON.stringify(json.data));
                  window.open('/dashboard?ghost=true&shop=' + shop.id, '_blank');
                } else {
                  alert(json.message || 'Gagal memulai sesi Ghost.');
                }
              } catch (e) {
                console.error(e);
                alert('Terjadi kesalahan jaringan.');
              }
            }}
            className="h-9 px-3.5 bg-white hover:bg-slate-100 text-slate-800 font-mono font-bold text-xs rounded-xl border-2 border-slate-800 flex items-center space-x-1.5 cursor-pointer transition-all shadow-[2px_2px_0_#1E293B]"
          >
            <span>👻</span>
            <span>GHOST INSPECTION</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="h-9 px-4 bg-[#CCFF00] hover:bg-[#b8e600] text-slate-900 font-mono font-black text-xs rounded-xl border-2 border-slate-800 flex items-center space-x-1.5 cursor-pointer transition-all shadow-[3px_3px_0_#1E293B]"
          >
            <ShieldAlert size={15} />
            <span>KONTROL CHOKEHOLD</span>
          </button>
        </div>
      </div>

      {/* Info Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 font-mono text-xs">
        <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-md border-2 border-slate-800 shadow-[3px_3px_0_#1E293B] space-y-1">
          <span className="text-slate-500 font-bold uppercase text-[10px]">Status Operasional</span>
          <p className="text-sm font-black text-slate-900">{shop.operational_status}</p>
          <p className="text-[10px] text-slate-500">
            Chokehold: {shop.chokehold_active ? 'TERKUNCI AKTIF' : 'NORMAL'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-md border-2 border-slate-800 shadow-[3px_3px_0_#1E293B] space-y-1">
          <span className="text-slate-500 font-bold uppercase text-[10px]">Paket Kontrak</span>
          <p className="text-sm font-black text-emerald-700 uppercase">
            {shop.subscription_tier || 'MAGANG'}
          </p>
          <p className="text-[10px] text-slate-500">
            Masa Tenggang: {shop.grace_period_until ? new Date(shop.grace_period_until).toLocaleDateString('id-ID') : 'Tidak Ada'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-md border-2 border-slate-800 shadow-[3px_3px_0_#1E293B] space-y-1">
          <span className="text-slate-500 font-bold uppercase text-[10px]">Transaksi Bulan Ini (WIB)</span>
          <p className="text-sm font-black text-slate-900">
            {telemetry?.monthly_transactions ?? 0} {telemetry?.monthly_limit !== Infinity && telemetry?.monthly_limit ? `/ ${telemetry.monthly_limit}` : 'Struk'}
          </p>
          <p className="text-[10px] text-slate-500">
            {telemetry?.monthly_limit === 50 ? 'Batas Kontrak Magang (50 Struk)' : 'Struk Unlimited'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-md border-2 border-slate-800 shadow-[3px_3px_0_#1E293B] space-y-1">
          <span className="text-slate-500 font-bold uppercase text-[10px]">Kapasitas Kasir</span>
          <p className="text-sm font-black text-slate-900">
            {shop.active_cashiers_count || 1} / {currentTotal} Kasir
          </p>
          <p className="text-[10px] text-slate-500">
            {currentTotal > baseLimit ? `Overridden (+${addOnsCount})` : 'Sesuai Paket Dasar'}
          </p>
        </div>
      </div>

      {/* CHOKEPOINT 3: KAPASITAS ADITIF & OVERRIDE PANEL */}
      <div className="bg-white/90 backdrop-blur-md border-2 border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6 shadow-[4px_4px_0_#1E293B]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-slate-200 pb-4">
          <div className="flex items-center space-x-2.5">
            <Cpu size={20} className="text-slate-800" />
            <div>
              <h3 className="font-heading font-black text-base text-slate-900 uppercase tracking-wide">
                Kalkulator Kapasitas Aditif &amp; Override Manual
              </h3>
              <p className="font-mono text-xs text-slate-500">
                Penyelarasan kuota kasir tanpa mengubah paket langganan tenant.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full font-mono text-[10px] text-slate-700 border border-slate-300">
            <Info size={12} className="text-amber-600" />
            Single Source: src/config/tiers.js
          </span>
        </div>

        {/* Formula Banner */}
        <div className="bg-slate-50 border-2 border-slate-800 rounded-xl p-4 font-mono space-y-2 shadow-[2px_2px_0_#1E293B]">
          <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">
            Rumus Kapasitas Diizinkan:
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base font-black text-slate-900">
            <span className="text-slate-900 bg-[#CCFF00] px-2 py-0.5 rounded border border-slate-800">Kapasitas Diizinkan</span>
            <span className="text-slate-500">=</span>
            <span className="px-2.5 py-1 bg-white border-2 border-slate-800 rounded-lg text-amber-700 text-xs sm:text-sm font-bold shadow-sm">
              Batas Paket Pokok ({baseLimit})
            </span>
            <span className="text-slate-500">+</span>
            <span className="px-2.5 py-1 bg-white border-2 border-slate-800 rounded-lg text-emerald-700 text-xs sm:text-sm font-bold shadow-sm">
              Add-On / Kompensasi ({addOnsCount})
            </span>
            <span className="text-slate-500">=</span>
            <span className="px-3 py-1 bg-emerald-100 border-2 border-emerald-600 rounded-lg text-emerald-900 text-xs sm:text-sm font-black shadow-sm">
              {currentTotal} Akun Kasir Aktif
            </span>
          </div>
        </div>

        {/* Breakdown Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          <div className="bg-white border-2 border-slate-800 rounded-xl p-3.5 space-y-1 shadow-[2px_2px_0_#1E293B]">
            <span className="text-slate-500 uppercase text-[10px] block font-bold">1. Batas Pokok Tier</span>
            <p className="text-base font-black text-amber-700">{baseLimit} Akun Kasir</p>
            <p className="text-[10px] text-slate-500">Tier: {shop.subscription_tier}</p>
          </div>

          <div className="bg-white border-2 border-slate-800 rounded-xl p-3.5 space-y-1 shadow-[2px_2px_0_#1E293B]">
            <span className="text-slate-500 uppercase text-[10px] block font-bold">2. Ekstensi Add-On / Override</span>
            <p className="text-base font-black text-emerald-700">+{addOnsCount} Tambahan</p>
            <p className="text-[10px] text-slate-500">{addOnsCount > 0 ? 'Kapasitas dinaikkan' : 'Tidak ada add-on aktif'}</p>
          </div>

          <div className="bg-white border-2 border-slate-800 rounded-xl p-3.5 space-y-1 shadow-[2px_2px_0_#1E293B]">
            <span className="text-slate-500 uppercase text-[10px] block font-bold">3. Total Diizinkan Sistem</span>
            <p className="text-base font-black text-slate-900">{currentTotal} Akun Kasir</p>
            <p className="text-[10px] text-slate-500">Terpakai: {shop.active_cashiers_count || 1} kasir</p>
          </div>
        </div>

        {/* Override Form */}
        <form onSubmit={handleSaveOverride} className="bg-slate-50 border-2 border-slate-800 rounded-xl p-4 sm:p-5 space-y-4 font-sans shadow-[2px_2px_0_#1E293B]">
          <div className="flex items-center justify-between">
            <h4 className="font-heading font-black text-xs uppercase text-slate-800 tracking-wider">
              Form Override Kuota Manual (Kompensasi / Hak Istimewa)
            </h4>
            <span className="font-mono text-[10px] text-slate-500">Tercatat ke Admin Audit Log</span>
          </div>

          {overrideStatus && (
            <div className={`p-3 rounded-xl border-2 text-xs font-mono flex items-center gap-2 ${
              overrideStatus.type === 'success' 
                ? 'bg-emerald-50 border-emerald-500 text-emerald-800' 
                : 'bg-rose-50 border-rose-500 text-rose-800'
            }`}>
              {overrideStatus.type === 'success' ? <CheckCircle2 size={14} /> : <AlertOctagon size={14} />}
              <span>{overrideStatus.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 font-mono text-xs">
              <label className="block text-slate-700 font-bold uppercase text-[11px]">
                Total Kuota Kasir Baru:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={overrideLimit}
                  onChange={(e) => setOverrideLimit(e.target.value)}
                  className="h-9 w-24 bg-white border-2 border-slate-800 rounded-xl px-3 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#CCFF00] text-center shadow-[1px_1px_0_#1E293B]"
                />
                <span className="text-slate-600 text-xs font-bold">Akun Kasir</span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setOverrideLimit(baseLimit + 1)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border-2 border-slate-800 rounded-lg text-[10px] text-slate-800 font-bold cursor-pointer shadow-sm transition-all"
                >
                  +1 Kasir
                </button>
                <button
                  type="button"
                  onClick={() => setOverrideLimit(baseLimit + 2)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border-2 border-slate-800 rounded-lg text-[10px] text-slate-800 font-bold cursor-pointer shadow-sm transition-all"
                >
                  +2 Kasir
                </button>
                <button
                  type="button"
                  onClick={() => setOverrideLimit(baseLimit)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border-2 border-slate-800 rounded-lg text-[10px] text-amber-700 font-bold cursor-pointer flex items-center gap-1 shadow-sm transition-all"
                >
                  <RotateCcw size={10} /> Reset Default ({baseLimit})
                </button>
              </div>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              <label className="block text-slate-700 font-bold uppercase text-[11px]">
                Justifikasi Audit (Wajib min. 10 karakter):
              </label>
              <textarea
                rows="3"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Contoh: Kompensasi gangguan jaringan POS cabang selama maintenance sistem."
                className="w-full bg-white border-2 border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#CCFF00] font-sans shadow-[1px_1px_0_#1E293B]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingOverride}
              className="h-9 px-5 bg-[#CCFF00] hover:bg-[#b8e600] disabled:opacity-50 text-slate-900 font-mono font-black text-xs rounded-xl border-2 border-slate-800 flex items-center space-x-2 cursor-pointer transition-all shadow-[3px_3px_0_#1E293B]"
            >
              <Save size={14} />
              <span>{savingOverride ? 'MENYIMPAN & MENSINKRONKAN...' : 'SIMPAN OVERRIDE KUOTA'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Chokehold Modal */}
      <ChokeholdModal
        isOpen={isModalOpen}
        shop={shop}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchDetail()}
      />
    </div>
  );
}
