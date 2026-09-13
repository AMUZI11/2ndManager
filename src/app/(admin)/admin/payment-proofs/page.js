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
  Filter,
  X
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
    const interval = setInterval(fetchProofs, 20000);
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
    <div className="space-y-6 font-sans max-w-7xl mx-auto pb-12">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-[9999] bg-white border-3 border-slate-800 text-slate-900 px-5 py-3 rounded-2xl shadow-[6px_6px_0px_0px_#1e293b] flex items-center space-x-3 text-xs font-mono font-bold animate-in fade-in duration-200">
          <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage('')} className="ml-3 text-slate-400 hover:text-slate-800 font-black cursor-pointer">✕</button>
        </div>
      )}

      {/* Header Bento Card */}
      <div className="bg-white border-2 border-slate-800 rounded-2xl p-6 shadow-[4px_4px_0px_0px_#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 bg-[#CCFF00] border-2 border-slate-800 rounded-xl shadow-[2px_2px_0px_0px_#1e293b]">
              <CreditCard className="w-5 h-5 text-slate-900" />
            </span>
            <h1 className="font-display font-black text-2xl text-slate-900 tracking-tight">
              Verifikasi Bukti Pembayaran
            </h1>
            {pendingCount > 0 && (
              <span className="bg-amber-300 text-slate-900 border border-slate-800 text-[10px] px-2.5 py-0.5 rounded-full font-mono font-black">
                {pendingCount} MENUNGGU
              </span>
            )}
          </div>
          <p className="text-slate-600 text-sm font-medium">
            Review manual transfer manual, aktivasi tier toko, dan pencatatan audit trail otomatis.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchProofs}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white border-2 border-slate-800 text-slate-800 font-mono text-xs font-bold shadow-[2px_2px_0px_0px_#1e293b] hover:bg-slate-50 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>SYNC DATA</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bento Card */}
      <div className="bg-white border-2 border-slate-800 rounded-2xl p-4 shadow-[4px_4px_0px_0px_#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
          {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-black transition-all cursor-pointer ${
                filterStatus === st
                  ? 'bg-[#CCFF00] text-slate-900 border-2 border-slate-800 shadow-[2px_2px_0px_0px_#1e293b]'
                  : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
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
            className="h-9 bg-white border-2 border-slate-800 rounded-xl pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#CCFF00] font-mono shadow-[2px_2px_0px_0px_#1e293b] w-full sm:w-64"
          />
        </div>
      </div>

      {/* Proofs Table Bento Card */}
      <div className="bg-white border-2 border-slate-800 rounded-2xl shadow-[4px_4px_0px_0px_#1e293b] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-800 text-[11px] font-mono font-bold text-slate-700 uppercase tracking-wider">
                <th className="py-3 px-4">WAKTU PENGAJUAN</th>
                <th className="py-3 px-4">TOKO / TENANT</th>
                <th className="py-3 px-4">PAKET DIAJUKAN</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4">BUKTI STRUK</th>
                <th className="py-3 px-4 text-right">AKSI EKSEKUSI</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100">
              {filteredProofs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-mono text-xs">
                    Tidak ada bukti pembayaran dengan status: {filterStatus}
                  </td>
                </tr>
              ) : (
                filteredProofs.map((p) => {
                  const isPending = p.status === 'PENDING';
                  const isApproved = p.status === 'APPROVED';
                  const isRejected = p.status === 'REJECTED';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {p.created_at ? new Date(p.created_at).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }) : '-'}
                      </td>
                      <td className="py-3 px-4 font-sans font-bold text-slate-900">
                        <div className="flex items-center space-x-2">
                          <Store size={14} className="text-slate-500 shrink-0" />
                          <span>{p.shops?.name || 'Toko'}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 font-normal block">
                          ID: {p.shop_id?.slice(0, 8)}...
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-lime-100 text-slate-900 font-black border border-slate-800">
                          {p.plan_requested}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {isPending && (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-slate-800 font-black text-[10px]">
                            PENDING
                          </span>
                        )}
                        {isApproved && (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-slate-800 font-black text-[10px]">
                            APPROVED
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-900 border border-slate-800 font-black text-[10px]">
                            REJECTED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {p.signed_url ? (
                          <button
                            onClick={() => setSelectedProof(p)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 border-2 border-slate-800 text-slate-800 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-[1px_1px_0px_0px_#1e293b] cursor-pointer"
                          >
                            <Eye size={12} />
                            <span>Lihat Bukti</span>
                          </button>
                        ) : (
                          <span className="text-slate-400">Tidak ada gambar</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleApprove(p.id)}
                              disabled={processingId === p.id}
                              className="px-3 py-1.5 bg-[#CCFF00] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] text-slate-900 font-mono font-black rounded-xl text-xs border-2 border-slate-800 shadow-[2px_2px_0px_0px_#1e293b] transition-all cursor-pointer disabled:opacity-50"
                            >
                              SETUJUI &amp; AKTIFKAN
                            </button>
                            <button
                              onClick={() => {
                                setSelectedProof(p);
                                setRejectionReason('');
                              }}
                              className="px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-900 font-mono font-bold rounded-xl text-xs border-2 border-slate-800 shadow-[2px_2px_0px_0px_#1e293b] transition-all cursor-pointer"
                            >
                              TOLAK
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">
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
        <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border-3 border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-[8px_8px_0px_0px_#1e293b] font-sans">
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-3">
              <div>
                <h3 className="font-display font-black text-base text-slate-900 uppercase tracking-tight">
                  Bukti Pembayaran: {selectedProof.shops?.name}
                </h3>
                <span className="text-slate-600 font-mono text-xs">
                  Permintaan Paket: {selectedProof.plan_requested}
                </span>
              </div>
              <button 
                onClick={() => setSelectedProof(null)} 
                className="p-1 rounded-lg border-2 border-slate-800 bg-white hover:bg-slate-100 text-slate-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Gambar Bukti */}
            <div className="bg-slate-100 rounded-xl overflow-hidden border-2 border-slate-800 flex items-center justify-center max-h-[360px] p-2">
              {selectedProof.signed_url ? (
                <img
                  src={selectedProof.signed_url}
                  alt="Bukti Transfer"
                  className="max-h-[340px] w-auto object-contain rounded-lg"
                />
              ) : (
                <div className="py-12 text-slate-400 font-mono text-xs">File bukti tidak dapat dimuat</div>
              )}
            </div>

            {selectedProof.status === 'PENDING' && (
              <div className="space-y-3 pt-2">
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Isi alasan penolakan (jika ingin menolak)..."
                  className="w-full bg-white border-2 border-slate-800 rounded-xl p-2.5 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-[2px_2px_0px_0px_#1e293b]"
                />
                <div className="flex items-center justify-end space-x-2">
                  <button
                    onClick={() => handleReject(selectedProof.id)}
                    disabled={processingId === selectedProof.id || !rejectionReason.trim()}
                    className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-mono font-black rounded-xl text-xs border-2 border-slate-800 shadow-[2px_2px_0px_0px_#1e293b] transition-all cursor-pointer disabled:opacity-40"
                  >
                    TOLAK BUKTI
                  </button>
                  <button
                    onClick={() => handleApprove(selectedProof.id)}
                    disabled={processingId === selectedProof.id}
                    className="px-4 py-2 bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 font-mono font-black rounded-xl text-xs border-2 border-slate-800 shadow-[2px_2px_0px_0px_#1e293b] transition-all cursor-pointer disabled:opacity-50"
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
