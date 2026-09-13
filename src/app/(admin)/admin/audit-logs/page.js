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
    <div className="space-y-6 font-sans max-w-7xl mx-auto pb-12">
      {/* Header Bento Card */}
      <div className="bg-white border-2 border-slate-800 rounded-2xl p-6 shadow-[4px_4px_0px_0px_#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-[#CCFF00] border-2 border-slate-800 rounded-xl shadow-[2px_2px_0px_0px_#1e293b]">
              <FileLock2 className="w-5 h-5 text-slate-900" />
            </span>
            <h1 className="font-display font-black text-2xl text-slate-900 tracking-tight">
              Buku Besar Audit Trail
            </h1>
          </div>
          <p className="text-slate-600 text-sm font-medium">
            Buku besar permanen tanpa izin ubah/hapus (Append-Only PostgreSQL Security Policy).
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="flex items-center bg-white border-2 border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-mono font-bold shadow-[2px_2px_0px_0px_#1e293b]">
            <Filter size={13} className="mr-1.5 text-slate-500" />
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="bg-transparent text-xs text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="ALL">SEMUA TINDAKAN</option>
              <option value="CHOKEHOLD_ENFORCE">CHOKEHOLD ENFORCE</option>
              <option value="CHOKEHOLD_RELEASE">CHOKEHOLD RELEASE</option>
              <option value="SUPPORT_TICKET_RESOLVED">TICKET RESOLVED</option>
              <option value="CATEGORY_TEMPLATES_SEEDED">SEED CATEGORIES</option>
              <option value="VOUCHER_MINTED">VOUCHER MINTED</option>
            </select>
          </div>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white border-2 border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-800 shadow-[2px_2px_0px_0px_#1e293b] hover:bg-slate-50 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>SEGARKAN</span>
          </button>
        </div>
      </div>

      {/* Ledger Table Bento Card */}
      <div className="bg-white border-2 border-slate-800 rounded-2xl shadow-[4px_4px_0px_0px_#1e293b] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans">
            <thead>
              <tr className="border-b-2 border-slate-800 bg-slate-100 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-700">
                <th className="py-3 px-4">WAKTU (WIB)</th>
                <th className="py-3 px-4">AKTOR ADMIN</th>
                <th className="py-3 px-4">JENIS TINDAKAN</th>
                <th className="py-3 px-4">TARGET TOKO</th>
                <th className="py-3 px-4">JUSTIFIKASI / ALASAN</th>
                <th className="py-3 px-4 text-right">INTEGRITAS</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100 text-xs font-mono">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-mono text-xs">
                    Memuat buku besar audit...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-mono text-xs">
                    Belum ada riwayat audit yang cocok dengan filter yang dipilih.
                  </td>
                </tr>
              ) : (
                logs.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                      {item.created_at ? new Date(item.created_at).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }) : '-'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-900 font-bold text-[11px] truncate max-w-[160px]">
                      {item.admin_email}
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-[#CCFF00] text-slate-900 border border-slate-800 font-mono font-black text-[10px] px-2 py-0.5 rounded shadow-[1px_1px_0px_0px_#1e293b]">
                        {item.action_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-sans font-medium truncate max-w-[150px]">
                      {item.shops?.name || (item.target_shop_id ? `#${item.target_shop_id.slice(0, 8)}` : 'Sistem')}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-sans text-xs truncate max-w-[280px]">
                      {item.reason}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[10px] text-emerald-800 font-bold whitespace-nowrap">
                      <span className="inline-flex items-center space-x-1 bg-emerald-100 border border-slate-800 px-2 py-0.5 rounded">
                        <ShieldCheck size={11} className="text-emerald-700" />
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
        <div className="p-4 border-t-2 border-slate-800 bg-slate-50 flex items-center justify-between text-xs font-mono text-slate-700">
          <span className="font-bold">Halaman {page} dari {totalPages}</span>
          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border-2 border-slate-800 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded-lg border-2 border-slate-800 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
