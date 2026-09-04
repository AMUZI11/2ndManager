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
      <div className="py-20 text-center text-zinc-500 font-mono text-xs space-y-3">
        <div className="w-8 h-8 border-2 border-[#CCFF00] border-t-transparent rounded-full animate-spin mx-auto" />
        <p>Memuat data inspeksi tenant #{shopId.slice(0, 8)}...</p>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="py-16 text-center text-zinc-400 font-mono text-xs space-y-3">
        <p>Toko tidak ditemukan atau ID tidak valid.</p>
        <Link href="/admin/tenants" className="text-[#CCFF00] underline font-bold">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/admin/tenants"
            className="h-9 w-9 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-heading font-black text-xl text-zinc-100 uppercase tracking-tight">
                {shop.name}
              </h2>
              <span className="font-mono text-xs text-zinc-500">#{shop.id.slice(0, 8)}</span>
            </div>
            <p className="text-xs text-zinc-400 font-mono">
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
            className="h-9 px-3.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs rounded-xl border border-zinc-700 flex items-center space-x-1.5 cursor-pointer transition-colors"
          >
            <span>👻</span>
            <span>GHOST INSPECTION</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="h-9 px-4 bg-[#CCFF00] hover:bg-[#b3e600] text-black font-extrabold text-xs rounded-xl border border-black flex items-center space-x-1.5 cursor-pointer transition-colors shadow-[2px_2px_0px_#000]"
          >
            <ShieldAlert size={15} />
            <span>KONTROL CHOKEHOLD</span>
          </button>
        </div>
      </div>

      {/* Info Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 font-mono text-xs">
        <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-1">
          <span className="text-zinc-500 font-bold uppercase text-[10px]">Status Operasional</span>
          <p className="text-sm font-black text-zinc-100">{shop.operational_status}</p>
          <p className="text-[10px] text-zinc-400">
            Chokehold: {shop.chokehold_active ? 'TERKUNCI AKTIF' : 'NORMAL'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-1">
          <span className="text-zinc-500 font-bold uppercase text-[10px]">Paket Kontrak</span>
          <p className="text-sm font-black text-[#CCFF00] uppercase">
            {shop.subscription_tier || 'MAGANG'}
          </p>
          <p className="text-[10px] text-zinc-400">
            Masa Tenggang: {shop.grace_period_until ? new Date(shop.grace_period_until).toLocaleDateString('id-ID') : 'Tidak Ada'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-1">
          <span className="text-zinc-500 font-bold uppercase text-[10px]">Transaksi Bulan Ini (WIB)</span>
          <p className="text-sm font-black text-zinc-100">
            {telemetry?.monthly_transactions ?? 0} {telemetry?.monthly_limit !== Infinity && telemetry?.monthly_limit ? `/ ${telemetry.monthly_limit}` : 'Struk'}
          </p>
          <p className="text-[10px] text-zinc-400">
            {telemetry?.monthly_limit === 50 ? 'Batas Kontrak Magang (50 Struk)' : 'Struk Unlimited'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-1">
          <span className="text-zinc-500 font-bold uppercase text-[10px]">Kapasitas Kasir</span>
          <p className="text-sm font-black text-zinc-100">
            {shop.active_cashiers_count || 1} / {currentTotal} Kasir
          </p>
          <p className="text-[10px] text-zinc-400">
            {currentTotal > baseLimit ? `Overridden (+${addOnsCount})` : 'Sesuai Paket Dasar'}
          </p>
        </div>
      </div>

      {/* CHOKEPOINT 3: KAPASITAS ADITIF & OVERRIDE PANEL */}
      <div className="bg-zinc-900/90 border-2 border-zinc-750 rounded-2xl p-5 sm:p-6 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <Cpu size={20} className="text-[#CCFF00]" />
            <div>
              <h3 className="font-heading font-black text-base text-white uppercase tracking-wide">
                Kalkulator Kapasitas Aditif &amp; Override Manual
              </h3>
              <p className="font-mono text-xs text-zinc-400">
                Penyelarasan kuota kasir tanpa mengubah paket langganan tenant.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-800 rounded-full font-mono text-[10px] text-zinc-300 border border-zinc-700">
            <Info size={12} className="text-[#CCFF00]" />
            Single Source: src/config/tiers.js
          </span>
        </div>

        {/* Formula Banner */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 font-mono space-y-2">
          <p className="text-[11px] text-zinc-400 uppercase font-bold tracking-wider">
            Rumus Kapasitas Diizinkan:
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base font-black text-white">
            <span className="text-[#CCFF00]">Kapasitas Diizinkan</span>
            <span className="text-zinc-500">=</span>
            <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-700 rounded-lg text-amber-300 text-xs sm:text-sm">
              Batas Paket Pokok ({baseLimit})
            </span>
            <span className="text-zinc-500">+</span>
            <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-700 rounded-lg text-emerald-300 text-xs sm:text-sm">
              Add-On / Kompensasi ({addOnsCount})
            </span>
            <span className="text-zinc-500">=</span>
            <span className="px-3 py-1 bg-emerald-950/80 border border-emerald-700 rounded-lg text-[#10B981] text-xs sm:text-sm">
              {currentTotal} Akun Kasir Aktif
            </span>
          </div>
        </div>

        {/* Breakdown Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          <div className="bg-zinc-950/80 border border-zinc-850 rounded-xl p-3.5 space-y-1">
            <span className="text-zinc-500 uppercase text-[10px] block">1. Batas Pokok Tier</span>
            <p className="text-base font-bold text-amber-400">{baseLimit} Akun Kasir</p>
            <p className="text-[10px] text-zinc-500">Tier: {shop.subscription_tier}</p>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-850 rounded-xl p-3.5 space-y-1">
            <span className="text-zinc-500 uppercase text-[10px] block">2. Ekstensi Add-On / Override</span>
            <p className="text-base font-bold text-emerald-400">+{addOnsCount} Tambahan</p>
            <p className="text-[10px] text-zinc-500">{addOnsCount > 0 ? 'Kapasitas dinaikkan' : 'Tidak ada add-on aktif'}</p>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-850 rounded-xl p-3.5 space-y-1">
            <span className="text-zinc-500 uppercase text-[10px] block">3. Total Diizinkan Sistem</span>
            <p className="text-base font-bold text-[#CCFF00]">{currentTotal} Akun Kasir</p>
            <p className="text-[10px] text-zinc-500">Terpakai: {shop.active_cashiers_count || 1} kasir</p>
          </div>
        </div>

        {/* Override Form */}
        <form onSubmit={handleSaveOverride} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 sm:p-5 space-y-4 font-sans">
          <div className="flex items-center justify-between">
            <h4 className="font-heading font-black text-xs uppercase text-zinc-200 tracking-wider">
              Form Override Kuota Manual (Kompensasi / Hak Istimewa)
            </h4>
            <span className="font-mono text-[10px] text-zinc-500">Tercatat ke Admin Audit Log</span>
          </div>

          {overrideStatus && (
            <div className={`p-3 rounded-lg border text-xs font-mono flex items-center gap-2 ${
              overrideStatus.type === 'success' 
                ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300' 
                : 'bg-red-950/80 border-red-800 text-red-300'
            }`}>
              {overrideStatus.type === 'success' ? <CheckCircle2 size={14} /> : <AlertOctagon size={14} />}
              <span>{overrideStatus.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 font-mono text-xs">
              <label className="block text-zinc-400 font-bold uppercase text-[11px]">
                Total Kuota Kasir Baru:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={overrideLimit}
                  onChange={(e) => setOverrideLimit(e.target.value)}
                  className="h-9 w-24 bg-zinc-900 border border-zinc-700 rounded-lg px-3 text-sm font-black text-[#CCFF00] focus:outline-none focus:border-[#CCFF00] text-center"
                />
                <span className="text-zinc-400 text-xs">Akun Kasir</span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setOverrideLimit(baseLimit + 1)}
                  className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded text-[10px] text-zinc-300 font-bold cursor-pointer"
                >
                  +1 Kasir
                </button>
                <button
                  type="button"
                  onClick={() => setOverrideLimit(baseLimit + 2)}
                  className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded text-[10px] text-zinc-300 font-bold cursor-pointer"
                >
                  +2 Kasir
                </button>
                <button
                  type="button"
                  onClick={() => setOverrideLimit(baseLimit)}
                  className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded text-[10px] text-amber-300 font-bold cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw size={10} /> Reset Default ({baseLimit})
                </button>
              </div>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              <label className="block text-zinc-400 font-bold uppercase text-[11px]">
                Justifikasi Audit (Wajib min. 10 karakter):
              </label>
              <textarea
                rows="3"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Contoh: Kompensasi gangguan jaringan POS cabang selama maintenance sistem."
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 font-sans"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingOverride}
              className="h-9 px-5 bg-[#CCFF00] hover:bg-[#b3e600] disabled:opacity-50 text-black font-extrabold text-xs rounded-xl border border-black flex items-center space-x-2 cursor-pointer transition-all shadow-[2px_2px_0px_#000]"
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
