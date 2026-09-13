"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Store, 
  Search, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import ChokeholdModal from '@/components/admin/ChokeholdModal';
import { normalizeTier, TIER_CONFIG } from '@/config/tiers';

export default function TenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal State
  const [selectedShop, setSelectedShop] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchTenants = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/admin/tenants?search=${encodeURIComponent(search)}&status=${statusFilter}&page=${page}&limit=25`);
      const json = await res.json();
      if (res.ok && json.data) {
        setTenants(json.data.tenants || []);
        setTotalPages(json.data.pagination?.totalPages || 1);
        setTotalCount(json.data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('[Fetch Tenants Error]', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  // Keyboard shortcut (Shift+L focus search)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        document.getElementById('tenant-search-input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const openChokeholdModal = (shop) => {
    setSelectedShop(shop);
    setIsModalOpen(true);
  };

  const getStatusBadge = (status, chokeholdActive) => {
    if (chokeholdActive || status === 'CHOKEHOLD') {
      return (
        <span className="font-mono text-[10px] uppercase px-2 py-0.5 bg-rose-100 text-rose-900 border border-slate-800 rounded font-black">
          CHOKEHOLD
        </span>
      );
    }
    if (status === 'GRACE_PERIOD') {
      return (
        <span className="font-mono text-[10px] uppercase px-2 py-0.5 bg-amber-100 text-amber-900 border border-slate-800 rounded font-bold">
          DISPENSASI
        </span>
      );
    }
    if (status === 'SUSPENDED') {
      return (
        <span className="font-mono text-[10px] uppercase px-2 py-0.5 bg-slate-200 text-slate-700 border border-slate-400 rounded font-medium">
          SUSPENDED
        </span>
      );
    }
    return (
      <span className="font-mono text-[10px] uppercase px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-slate-800 rounded font-bold">
        AKTIF
      </span>
    );
  };

  return (
    <div className="space-y-6 font-sans max-w-7xl mx-auto pb-12">
      {/* Top Header Bento Card */}
      <div className="bg-white border-2 border-slate-800 rounded-2xl p-6 shadow-[4px_4px_0px_0px_#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 bg-[#CCFF00] border-2 border-slate-800 rounded-xl shadow-[2px_2px_0px_0px_#1e293b]">
              <Store size={20} className="text-slate-900" />
            </span>
            <h1 className="font-display font-black text-2xl text-slate-900 tracking-tight">
              Direktori Penyewa &amp; Billing Chokehold
            </h1>
          </div>
          <p className="text-slate-600 text-sm font-medium">
            Total {totalCount} penyewa terdaftar | Kontrol status operasional &amp; kuota kasir lintas tenant.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="tenant-search-input"
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari warung... (Shift+L)"
              className="h-9 pl-9 pr-3 bg-white border-2 border-slate-800 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#CCFF00] font-mono shadow-[2px_2px_0px_0px_#1e293b] w-52 sm:w-60"
            />
          </div>

          <div className="flex items-center bg-white border-2 border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-mono font-bold shadow-[2px_2px_0px_0px_#1e293b]">
            <Filter size={13} className="mr-1.5 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-transparent text-xs text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="ALL">SEMUA STATUS</option>
              <option value="ACTIVE">AKTIF</option>
              <option value="GRACE_PERIOD">DISPENSASI</option>
              <option value="CHOKEHOLD">CHOKEHOLD</option>
            </select>
          </div>

          <button
            onClick={() => fetchTenants()}
            disabled={loading}
            title="Muat Ulang Data"
            className="flex items-center justify-center h-9 w-9 rounded-xl bg-white border-2 border-slate-800 text-slate-800 shadow-[2px_2px_0px_0px_#1e293b] hover:bg-slate-50 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* High-Density Table Bento Card */}
      <div className="bg-white border-2 border-slate-800 rounded-2xl shadow-[4px_4px_0px_0px_#1e293b] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans">
            <thead>
              <tr className="border-b-2 border-slate-800 bg-slate-100 text-[11px] font-mono uppercase tracking-wider text-slate-700 font-bold">
                <th className="py-3 px-4">ID / TOKEN</th>
                <th className="py-3 px-4">NAMA TOKO</th>
                <th className="py-3 px-4">KONTAK OWNER</th>
                <th className="py-3 px-4">PAKET TIER</th>
                <th className="py-3 px-4">KASIR (AKTIF/MAX)</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4 text-right">TINDAKAN</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100 text-xs font-mono">
              {loading && tenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-mono text-xs">
                    Memuat data penyewa...
                  </td>
                </tr>
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-mono text-xs">
                    Tidak ditemukan data penyewa yang cocok dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                tenants.map((t) => {
                  const ownerPhone = t.owner?.raw_user_meta_data?.phone || t.owner?.email || '-';
                  const tier = normalizeTier(t.subscription_tier || t.subscriptions?.[0]?.plan || 'MAGANG');
                  const baseCashiers = TIER_CONFIG[tier]?.maxCashiers || 1;
                  const currentLimit = t.cashier_limit || baseCashiers;
                  const hasOverride = currentLimit !== baseCashiers;

                  return (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px] truncate max-w-[100px]">
                        #{t.id.slice(0, 8)}
                      </td>
                      <td className="py-3 px-4 font-bold font-sans text-slate-900 truncate max-w-[200px]">
                        {t.name}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 text-[11px] truncate max-w-[140px]">
                        {ownerPhone}
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-lime-200 border border-slate-800 text-slate-900 px-2 py-0.5 rounded font-mono text-[10px] font-black uppercase">
                          {tier}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <span className={hasOverride ? 'text-emerald-700 font-black' : 'text-slate-700 font-bold'}>
                          {t.active_cashiers_count || 1} / {currentLimit}
                        </span>
                        {hasOverride && (
                          <span className="ml-1 text-[9px] px-1 py-0.2 bg-emerald-100 border border-slate-800 text-emerald-800 rounded font-mono font-bold">
                            +{currentLimit - baseCashiers}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(t.operational_status, t.chokehold_active)}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                        <Link
                          href={`/admin/tenants/${t.id}`}
                          className="px-2.5 py-1.5 inline-flex items-center space-x-1 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-800 shadow-[2px_2px_0px_0px_#1e293b] active:translate-x-[1px] active:translate-y-[1px] text-[11px] font-mono font-bold transition-all"
                        >
                          <span>Inspeksi</span>
                          <ExternalLink size={10} />
                        </Link>
                        <button
                          onClick={() => openChokeholdModal(t)}
                          className="px-2.5 py-1.5 rounded-xl bg-[#CCFF00] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] text-slate-900 border-2 border-slate-800 shadow-[2px_2px_0px_0px_#1e293b] text-[11px] font-mono font-black transition-all cursor-pointer"
                        >
                          Chokehold
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t-2 border-slate-800 bg-slate-50 flex items-center justify-between text-xs font-mono text-slate-700">
          <span className="font-bold">Halaman {page} dari {totalPages}</span>
          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border-2 border-slate-800 bg-white hover:bg-slate-100 text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded-lg border-2 border-slate-800 bg-white hover:bg-slate-100 text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Chokehold Modal */}
      {selectedShop && (
        <ChokeholdModal
          isOpen={isModalOpen}
          shop={selectedShop}
          onClose={() => { setIsModalOpen(false); setSelectedShop(null); }}
          onSuccess={() => fetchTenants()}
        />
      )}
    </div>
  );
}
