"use client";

import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye, 
  RefreshCw, 
  Store, 
  ShieldCheck, 
  AlertTriangle, 
  ExternalLink,
  Search,
  Filter
} from 'lucide-react';

export default function AdminPaymentProofsPage() {
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProof, setSelectedProof] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const fetchProofs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/admin/payment-proofs');
      const json = await res.json();
      if (res.ok && json.data) {
        setProofs(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProofs();
    const interval = setInterval(fetchProofs, 20000); // 20s auto-refresh
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (proofId) => {
    if (!confirm('Setujui bukti pembayaran ini dan langsung aktifkan tier toko?')) return;
    setProcessingId(proofId);
    try {
      const res = await fetch(`/api/v1/admin/payment-proofs/${proofId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE' }),
      });
      const json = await res.json();
      if (res.ok) {
        setToastMessage(json.message || 'Paket langganan berhasil disetujui & toko diaktifkan!');
        fetchProofs();
        setSelectedProof(null);
      } else {
        alert(json.message || 'Gagal menyetujui.');
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (proofId) => {
    if (!rejectionReason.trim()) {
      alert('Harap tuliskan alasan penolakan.');
      return;
    }
    setProcessingId(proofId);
    try {
      const res = await fetch(`/api/v1/admin/payment-proofs/${proofId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REJECT', rejection_reason: rejectionReason.trim() }),
      });
      const json = await res.json();
      if (res.ok) {
        setToastMessage('Bukti pembayaran berhasil ditolak.');
        fetchProofs();
        setSelectedProof(null);
        setRejectionReason('');
      } else {
        alert(json.message || 'Gagal menolak bukti.');
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredProofs = proofs.filter((p) => {
    if (filterStatus !== 'ALL' && p.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const shopName = p.shops?.name?.toLowerCase() || '';
      const plan = p.plan_requested?.toLowerCase() || '';
      return shopName.includes(q) || plan.includes(q);
    }
    return true;
  });

  const pendingCount = proofs.filter((p) => p.status === 'PENDING').length;

  return (
    <div className="space-y-6 font-sans max-w-6xl mx-auto pb-12">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex items-center justify-between text-xs font-mono font-bold text-emerald-800 shadow-[2px_2px_0_#1E293B] animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage('')} className="ml-3 text-slate-400 hover:text-slate-800 font-bold">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md border-2 border-slate-800 rounded-2xl p-5 shadow-[3px_3px_0_#1E293B] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#CCFF00] inline-block border border-slate-800" />
            <h2 className="font-heading font-black text-xl text-slate-900 uppercase tracking-tight">
              Verifikasi Bukti Pembayaran &amp; Langganan
            </h2>
            {pendingCount > 0 && (
              <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                {pendingCount} MENUNGGU
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Review manual transfer manual, aktivasi tier toko, dan audit trail otomatis
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchProofs}
            className="h-9 px-3.5 rounded-xl bg-white border-2 border-slate-800 text-slate-800 hover:bg-slate-100 flex items-center space-x-1.5 text-xs font-mono font-bold uppercase cursor-pointer shadow-[2px_2px_0_#1E293B] transition-all"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>SYNC DATA</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/90 backdrop-blur-md p-4 rounded-2xl border-2 border-slate-800 shadow-[3px_3px_0_#1E293B]">
        <div className="flex items-center space-x-1.5 overflow-x-auto">
          {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`h-8 px-3.5 rounded-xl text-xs font-mono font-black uppercase transition-all cursor-pointer border-2 ${
                filterStatus === st
                  ? 'bg-[#CCFF00] text-slate-900 border-slate-800 shadow-[2px_2px_0_#1E293B]'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-slate-800 hover:bg-slate-50'
              }`}
            >
              {st === 'PENDING' ? `PENDING (${pendingCount})` : st}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari toko / paket..."
            className="h-9 bg-white border-2 border-slate-800 rounded-xl pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none font-mono font-bold w-48 sm:w-64 shadow-[1px_1px_0_#1E293B]"
          />
        </div>
      </div>

      {/* Proofs Table */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0_#1E293B] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-slate-100/90 border-b-2 border-slate-800 text-[11px] font-black uppercase text-slate-700">
                <th className="py-3.5 px-4">WAKTU PENGAJUAN</th>
                <th className="py-3.5 px-4">TOKO / TENANT</th>
                <th className="py-3.5 px-4">PAKET DIAJUKAN</th>
                <th className="py-3.5 px-4">STATUS</th>
                <th className="py-3.5 px-4">BUKTI STRUK</th>
                <th className="py-3.5 px-4 text-right">AKSI EKSEKUSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredProofs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-mono">
                    Tidak ada bukti pembayaran dengan status: {filterStatus}
                  </td>
                </tr>
              ) : (
                filteredProofs.map((p) => {
                  const isPending = p.status === 'PENDING';
                  const isApproved = p.status === 'APPROVED';
                  const isRejected = p.status === 'REJECTED';

                  return (
                    <tr key={p.id} className="hover:bg-amber-50/40 transition-colors">
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap font-mono text-[11px]">
                        {new Date(p.created_at).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-sans font-bold text-slate-900">
                        <div className="flex items-center space-x-2">
                          <Store size={14} className="text-slate-400 shrink-0" />
                          <span>{p.shops?.name || 'Toko'}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 font-normal block">
                          ID: {p.shop_id.slice(0, 8)}...
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-lg bg-[#CCFF00] text-slate-900 font-black border border-slate-800 text-[10px]">
                          {p.plan_requested}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {isPending && (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[10px]">
                            PENDING
                          </span>
                        )}
                        {isApproved && (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px]">
                            APPROVED
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 border border-rose-300 font-bold text-[10px]">
                            REJECTED
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {p.signed_url ? (
                          <button
                            onClick={() => setSelectedProof(p)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 border-2 border-slate-800 text-slate-900 rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5 cursor-pointer shadow-[1px_1px_0_#1E293B]"
                          >
                            <Eye size={12} />
                            <span>Lihat Bukti</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs">Tidak ada gambar</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleApprove(p.id)}
                              disabled={processingId === p.id}
                              className="h-8 px-3 bg-[#CCFF00] hover:bg-[#b8e600] text-slate-900 font-mono font-black rounded-xl border-2 border-slate-800 shadow-[2px_2px_0_#1E293B] text-xs transition-all cursor-pointer disabled:opacity-50"
                            >
                              SETUJUI &amp; AKTIFKAN
                            </button>
                            <button
                              onClick={() => {
                                setSelectedProof(p);
                                setRejectionReason('');
                              }}
                              className="h-8 px-2.5 bg-rose-100 hover:bg-rose-200 border-2 border-rose-300 text-rose-900 font-mono font-bold rounded-xl text-xs transition-all cursor-pointer shadow-[1px_1px_0_#1E293B]"
                            >
                              TOLAK
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px] font-mono">
                            Diproses oleh {p.approved_by || 'Admin'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Preview Gambar Bukti & Tindakan */}
      {selectedProof && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-[6px_6px_0_#1E293B] font-mono text-xs">
            <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3">
              <div>
                <h3 className="font-heading font-black text-sm text-slate-900 uppercase">
                  Bukti Pembayaran: {selectedProof.shops?.name}
                </h3>
                <span className="text-slate-500 text-[11px]">
                  Permintaan Paket: {selectedProof.plan_requested}
                </span>
              </div>
              <button onClick={() => setSelectedProof(null)} className="text-slate-400 hover:text-slate-800 font-bold text-sm">✕</button>
            </div>

            {/* Gambar Bukti */}
            <div className="bg-slate-50 rounded-xl overflow-hidden border-2 border-slate-200 flex items-center justify-center max-h-[360px] p-2">
              {selectedProof.signed_url ? (
                <img
                  src={selectedProof.signed_url}
                  alt="Bukti Transfer"
                  className="max-h-[340px] w-auto object-contain rounded-lg"
                />
              ) : (
                <div className="py-12 text-slate-400">File bukti tidak dapat dimuat</div>
              )}
            </div>

            {selectedProof.status === 'PENDING' && (
              <div className="space-y-3 pt-2">
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Isi alasan penolakan (jika ingin menolak)..."
                  className="w-full bg-white border-2 border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-500 shadow-[1px_1px_0_#1E293B]"
                />
                <div className="flex items-center justify-end space-x-2">
                  <button
                    onClick={() => handleReject(selectedProof.id)}
                    disabled={processingId === selectedProof.id || !rejectionReason.trim()}
                    className="h-9 px-4 bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold rounded-xl border-2 border-slate-800 shadow-[2px_2px_0_#1E293B] transition-all cursor-pointer disabled:opacity-40"
                  >
                    TOLAK BUKTI
                  </button>
                  <button
                    onClick={() => handleApprove(selectedProof.id)}
                    disabled={processingId === selectedProof.id}
                    className="h-9 px-4 bg-[#CCFF00] hover:bg-[#b8e600] text-slate-900 font-mono font-black rounded-xl border-2 border-slate-800 shadow-[2px_2px_0_#1E293B] transition-all cursor-pointer disabled:opacity-50"
                  >
                    SETUJUI SEKARANG
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
