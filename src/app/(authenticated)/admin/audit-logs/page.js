"use client";

import React, { useState, useEffect } from 'react';
import { FileLock2, ShieldCheck, RefreshCw, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/admin/audit-logs?action=${actionFilter}&page=${page}&limit=25`);
      const json = await res.json();
      if (res.ok && json.data) {
        setLogs(json.data.logs || []);
        setTotalPages(json.data.pagination?.totalPages || 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, page]);

  return (
    <div className="space-y-6 font-sans max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <FileLock2 size={20} className="text-[#CCFF00]" />
            <h2 className="font-heading font-black text-xl text-zinc-100 uppercase tracking-tight">
              Immutable Audit Trail Ledger
            </h2>
          </div>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Buku besar permanen tanpa izin ubah/hapus (Append-Only PostgreSQL Policy)
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded h-8 px-2 text-xs text-zinc-400">
            <Filter size={12} className="mr-1.5 text-zinc-500" />
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="bg-transparent text-xs text-zinc-300 focus:outline-none font-mono cursor-pointer"
            >
              <option value="ALL" className="bg-zinc-900">SEMUA TINDAKAN</option>
              <option value="CHOKEHOLD_ENFORCE" className="bg-zinc-900">CHOKEHOLD ENFORCE</option>
              <option value="CHOKEHOLD_RELEASE" className="bg-zinc-900">CHOKEHOLD RELEASE</option>
              <option value="SUPPORT_TICKET_RESOLVED" className="bg-zinc-900">TICKET RESOLVED</option>
              <option value="CATEGORY_TEMPLATES_SEEDED" className="bg-zinc-900">SEED CATEGORIES</option>
            </select>
          </div>

          <button
            onClick={fetchLogs}
            className="h-8 w-8 rounded bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-zinc-100 flex items-center justify-center cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/80 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                <th className="py-2.5 px-3">WAKTU (WIB)</th>
                <th className="py-2.5 px-3">AKTOR ADMIN</th>
                <th className="py-2.5 px-3">JENIS TINDAKAN</th>
                <th className="py-2.5 px-3">TARGET TOKO</th>
                <th className="py-2.5 px-3">JUSTIFIKASI / ALASAN</th>
                <th className="py-2.5 px-3 text-right">INTEGRITAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-xs">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500 font-mono text-xs">
                    Memuat buku besar audit...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500 font-mono text-xs">
                    Belum ada riwayat audit yang cocok.
                  </td>
                </tr>
              ) : (
                logs.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-850/60 transition-colors h-10">
                    <td className="py-2 px-3 font-mono text-zinc-400 text-[11px] whitespace-nowrap">
                      {new Date(item.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="py-2 px-3 font-mono text-zinc-300 text-[11px] truncate max-w-[160px]">
                      {item.admin_email}
                    </td>
                    <td className="py-2 px-3 font-mono text-[#CCFF00] font-bold text-[11px]">
                      {item.action_type}
                    </td>
                    <td className="py-2 px-3 text-zinc-300 truncate max-w-[150px]">
                      {item.shops?.name || (item.target_shop_id ? `#${item.target_shop_id.slice(0, 8)}` : 'Sistem')}
                    </td>
                    <td className="py-2 px-3 text-zinc-400 text-xs truncate max-w-[280px]">
                      {item.reason}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-[10px] text-emerald-400 font-bold whitespace-nowrap">
                      <span className="inline-flex items-center space-x-1 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                        <ShieldCheck size={11} />
                        <span>IMMUTABLE</span>
                      </span>
                    </td>
                  </tr>
                ))
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
              className="h-7 px-2.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-40 hover:bg-zinc-800 flex items-center"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-7 px-2.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-40 hover:bg-zinc-800 flex items-center"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
