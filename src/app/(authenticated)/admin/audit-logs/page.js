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
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md border-2 border-slate-800 rounded-2xl p-5 shadow-[3px_3px_0_#1E293B] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 bg-[#CCFF00] inline-block rounded-full border border-slate-800" />
            <h2 className="font-heading font-black text-xl text-slate-900 uppercase tracking-tight">
              Immutable Audit Trail Ledger
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Buku besar permanen tanpa izin ubah/hapus (Append-Only PostgreSQL Policy)
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="flex items-center bg-white border-2 border-slate-800 rounded-xl px-2.5 py-1 text-xs text-slate-700 shadow-[1px_1px_0_#1E293B]">
            <Filter size={13} className="mr-1.5 text-slate-500" />
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="bg-transparent text-xs text-slate-900 font-bold focus:outline-none font-mono cursor-pointer uppercase"
            >
              <option value="ALL">SEMUA TINDAKAN</option>
              <option value="CHOKEHOLD_ENFORCE">CHOKEHOLD ENFORCE</option>
              <option value="CHOKEHOLD_RELEASE">CHOKEHOLD RELEASE</option>
              <option value="SUPPORT_TICKET_RESOLVED">TICKET RESOLVED</option>
              <option value="CATEGORY_TEMPLATES_SEEDED">SEED CATEGORIES</option>
            </select>
          </div>

          <button
            onClick={fetchLogs}
            className="h-9 w-9 rounded-xl bg-white border-2 border-slate-800 text-slate-800 hover:bg-slate-100 flex items-center justify-center cursor-pointer shadow-[2px_2px_0_#1E293B] transition-all"
            title="Refresh Ledger"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0_#1E293B] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans">
            <thead>
              <tr className="border-b-2 border-slate-800 bg-slate-100/90 text-[10px] font-mono uppercase tracking-wider text-slate-700 font-black">
                <th className="py-3 px-3.5">WAKTU (WIB)</th>
                <th className="py-3 px-3.5">AKTOR ADMIN</th>
                <th className="py-3 px-3.5">JENIS TINDAKAN</th>
                <th className="py-3 px-3.5">TARGET TOKO</th>
                <th className="py-3 px-3.5">JUSTIFIKASI / ALASAN</th>
                <th className="py-3 px-3.5 text-right">INTEGRITAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs font-sans">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-mono text-xs">
                    Memuat buku besar audit...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-mono text-xs">
                    Belum ada riwayat audit yang cocok.
                  </td>
                </tr>
              ) : (
                logs.map((item) => (
                  <tr key={item.id} className="hover:bg-amber-50/40 transition-colors h-11">
                    <td className="py-2.5 px-3.5 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                      {new Date(item.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-slate-900 text-[11px] truncate max-w-[160px] font-bold">
                      {item.admin_email}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-slate-900 font-black text-[11px]">
                      <span className="bg-[#CCFF00] text-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                        {item.action_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-800 font-medium truncate max-w-[150px]">
                      {item.shops?.name || (item.target_shop_id ? `#${item.target_shop_id.slice(0, 8)}` : 'Sistem')}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-600 text-xs truncate max-w-[280px]">
                      {item.reason}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono text-[10px] text-emerald-800 font-bold whitespace-nowrap">
                      <span className="inline-flex items-center space-x-1 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-lg">
                        <ShieldCheck size={12} className="text-emerald-700" />
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
        <div className="p-3.5 border-t-2 border-slate-800 bg-slate-50 flex items-center justify-between text-xs font-mono text-slate-700">
          <span>Halaman {page} dari {totalPages}</span>
          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 px-3 rounded-xl bg-white border-2 border-slate-800 text-slate-800 disabled:opacity-40 hover:bg-slate-100 flex items-center shadow-[1px_1px_0_#1E293B] cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 px-3 rounded-xl bg-white border-2 border-slate-800 text-slate-800 disabled:opacity-40 hover:bg-slate-100 flex items-center shadow-[1px_1px_0_#1E293B] cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
