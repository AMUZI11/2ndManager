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
        <span className="font-mono text-[10px] uppercase px-2 py-0.5 bg-red-950/80 text-red-300 border border-red-800 rounded font-black">
          [ CHOKEHOLD ]
        </span>
      );
    }
    if (status === 'GRACE_PERIOD') {
      return (
        <span className="font-mono text-[10px] uppercase px-2 py-0.5 bg-amber-950/80 text-amber-300 border border-amber-700 rounded font-bold">
          [ DISPENSASI ]
        </span>
      );
    }
    if (status === 'SUSPENDED') {
      return (
        <span className="font-mono text-[10px] uppercase px-2 py-0.5 bg-zinc-900 text-zinc-400 border border-zinc-700 rounded font-medium">
          [ SUSPENDED ]
        </span>
      );
    }
    return (
      <span className="font-mono text-[10px] uppercase px-2 py-0.5 bg-emerald-950/80 text-[#10B981] border border-emerald-800 rounded font-bold">
        [ AKTIF ]
      </span>
    );
  };

  return (
    <div className="space-y-4 font-sans max-w-7xl mx-auto">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Store size={18} className="text-[#CCFF00]" />
            <h2 className="font-heading font-black text-lg text-zinc-100 uppercase tracking-tight">
              Tenant Directory &amp; Billing Chokehold
            </h2>
          </div>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Total {totalCount} penyewa terdaftar | Kontrol status operasional &amp; kuota kasir
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              id="tenant-search-input"
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari nama warung/toko... (Shift+L)"
              className="h-8 pl-8 pr-3 bg-zinc-900/90 border border-zinc-700 rounded text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 font-sans w-56 sm:w-64"
            />
          </div>

          <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded h-8 px-2 text-xs text-zinc-400">
            <Filter size={12} className="mr-1.5 text-zinc-500" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-transparent text-xs text-zinc-300 focus:outline-none font-mono cursor-pointer"
            >
              <option value="ALL" className="bg-zinc-900">SEMUA STATUS</option>
              <option value="ACTIVE" className="bg-zinc-900">AKTIF</option>
              <option value="GRACE_PERIOD" className="bg-zinc-900">DISPENSASI</option>
              <option value="CHOKEHOLD" className="bg-zinc-900">CHOKEHOLD</option>
            </select>
          </div>

          <button
            onClick={() => fetchTenants()}
            title="Muat Ulang Data"
            className="h-8 w-8 rounded bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-zinc-100 flex items-center justify-center cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* High-Density Table */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/80 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                <th className="py-2.5 px-3">ID / TOKEN</th>
                <th className="py-2.5 px-3">NAMA TOKO</th>
                <th className="py-2.5 px-3">OWNER WA</th>
                <th className="py-2.5 px-3">PAKET</th>
                <th className="py-2.5 px-3">KASIR (AKTIF/MAX)</th>
                <th className="py-2.5 px-3">STATUS</th>
                <th className="py-2.5 px-3 text-right">TINDAKAN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-xs">
              {loading && tenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500 font-mono text-xs">
                    Memuat data penyewa...
                  </td>
                </tr>
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500 font-mono text-xs">
                    Tidak ditemukan data penyewa yang cocok.
                  </td>
                </tr>
              ) : (
                tenants.map((t) => {
                  const ownerPhone = t.owner?.raw_user_meta_data?.phone || t.owner?.email || '-';
                  const tier = t.subscription_tier || t.subscriptions?.[0]?.plan || 'TRIAL';
                  const cashiers = `${t.active_cashiers_count || 1} / ${t.cashier_limit || 1}`;

                  return (
                    <tr key={t.id} className="hover:bg-zinc-850/60 transition-colors h-10">
                      <td className="py-1.5 px-3 font-mono text-zinc-400 text-[11px] truncate max-w-[100px]">
                        #{t.id.slice(0, 8)}
                      </td>
                      <td className="py-1.5 px-3 font-bold text-zinc-100 truncate max-w-[200px]">
                        {t.name}
                      </td>
                      <td className="py-1.5 px-3 font-mono text-zinc-400 text-[11px] truncate max-w-[140px]">
                        {ownerPhone}
                      </td>
                      <td className="py-1.5 px-3 font-mono text-zinc-300 text-[11px] uppercase font-semibold">
                        {tier}
                      </td>
                      <td className="py-1.5 px-3 font-mono text-zinc-400 text-[11px]">
                        {cashiers}
                      </td>
                      <td className="py-1.5 px-3">
                        {getStatusBadge(t.operational_status, t.chokehold_active)}
                      </td>
                      <td className="py-1.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                        <Link
                          href={`/admin/tenants/${t.id}`}
                          className="h-7 px-2.5 inline-flex items-center space-x-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-[11px] font-medium"
                        >
                          <span>Inspeksi</span>
                          <ExternalLink size={10} />
                        </Link>
                        <button
                          onClick={() => openChokeholdModal(t)}
                          className="h-7 px-2.5 rounded bg-zinc-900 hover:bg-zinc-800 text-[#CCFF00] border border-zinc-700 text-[11px] font-bold cursor-pointer"
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
        <div className="p-3 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between text-xs font-mono text-zinc-400">
          <span>Halaman {page} dari {totalPages}</span>
          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 px-2.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-800 flex items-center"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-7 px-2.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-800 flex items-center"
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
