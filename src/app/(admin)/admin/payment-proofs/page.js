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
    <div className="space-y-6 font-sans max-w-7xl mx-auto">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-[9999] bg-zinc-950 border-2 border-[#CCFF00] text-zinc-100 px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 text-xs font-mono animate-fade-in">
          <CheckCircle2 size={16} className="text-[#CCFF00]" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage('')} className="ml-3 text-zinc-400 hover:text-white font-bold">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#CCFF00] animate-pulse" />
            <h2 className="font-heading font-black text-xl text-zinc-100 uppercase tracking-tight">
              Verifikasi Bukti Pembayaran &amp; Langganan
            </h2>
            {pendingCount > 0 && (
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                {pendingCount} MENUNGGU
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Review manual transfer manual, aktivasi tier toko, dan audit trail otomatis
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchProofs}
            className="h-8 px-3 rounded bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white flex items-center space-x-1.5 text-xs font-mono cursor-pointer"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span>SYNC DATA</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800">
        <div className="flex items-center space-x-1.5 overflow-x-auto">
          {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`h-7 px-3 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                filterStatus === st
                  ? 'bg-[#CCFF00] text-black shadow-sm'
                  : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              {st === 'PENDING' ? `PENDING (${pendingCount})` : st}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari toko / paket..."
            className="h-8 bg-zinc-950 border border-zinc-700 rounded-lg pl-8 pr-3 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#CCFF00] font-mono w-48 sm:w-64"
          />
        </div>
      </div>

      {/* Proofs Table */}
      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400">
              <th className="py-3 px-4">WAKTU PENGAJUAN</th>
              <th className="py-3 px-4">TOKO / TENANT</th>
              <th className="py-3 px-4">PAKET DIAJUKAN</th>
              <th className="py-3 px-4">STATUS</th>
              <th className="py-3 px-4">BUKTI STRUK</th>
              <th className="py-3 px-4 text-right">AKSI EKSEKUSI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {filteredProofs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-zinc-500">
                  Tidak ada bukti pembayaran dengan status: {filterStatus}
                </td>
              </tr>
            ) : (
              filteredProofs.map((p) => {
                const isPending = p.status === 'PENDING';
                const isApproved = p.status === 'APPROVED';
                const isRejected = p.status === 'REJECTED';

                return (
                  <tr key={p.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="py-3 px-4 text-zinc-400 whitespace-nowrap">
                      {new Date(p.created_at).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 font-sans font-bold text-zinc-100">
                      <div className="flex items-center space-x-2">
                        <Store size={14} className="text-zinc-500 shrink-0" />
                        <span>{p.shops?.name || 'Toko'}</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 font-normal block">
                        ID: {p.shop_id.slice(0, 8)}...
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-[#CCFF00] font-bold border border-zinc-700">
                        {p.plan_requested}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {isPending && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold">
                          PENDING
                        </span>
                      )}
                      {isApproved && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                          APPROVED
                        </span>
                      )}
                      {isRejected && (
                        <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold">
                          REJECTED
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {p.signed_url ? (
                        <button
                          onClick={() => setSelectedProof(p)}
                          className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded text-xs flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Eye size={12} />
                          <span>Lihat Bukti</span>
                        </button>
                      ) : (
                        <span className="text-zinc-600">Tidak ada gambar</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isPending ? (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleApprove(p.id)}
                            disabled={processingId === p.id}
                            className="h-7 px-3 bg-[#CCFF00] hover:bg-[#b3e600] text-black font-bold rounded text-xs transition-colors cursor-pointer disabled:opacity-50"
                          >
                            SETUJUI &amp; AKTIFKAN
                          </button>
                          <button
                            onClick={() => {
                              setSelectedProof(p);
                              setRejectionReason('');
                            }}
                            className="h-7 px-2.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-700/50 text-rose-300 font-bold rounded text-xs transition-colors cursor-pointer"
                          >
                            TOLAK
                          </button>
                        </div>
                      ) : (
                        <span className="text-zinc-600 text-[11px]">
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

      {/* Modal Preview Gambar Bukti & Tindakan */}
      {selectedProof && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border-2 border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="font-heading font-black text-sm text-zinc-100 uppercase">
                  Bukti Pembayaran: {selectedProof.shops?.name}
                </h3>
                <span className="text-zinc-400 text-[11px]">
                  Permintaan Paket: {selectedProof.plan_requested}
                </span>
              </div>
              <button onClick={() => setSelectedProof(null)} className="text-zinc-400 hover:text-white font-bold text-sm">✕</button>
            </div>

            {/* Gambar Bukti */}
            <div className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 flex items-center justify-center max-h-[360px] p-2">
              {selectedProof.signed_url ? (
                <img
                  src={selectedProof.signed_url}
                  alt="Bukti Transfer"
                  className="max-h-[340px] w-auto object-contain rounded-lg"
                />
              ) : (
                <div className="py-12 text-zinc-500">File bukti tidak dapat dimuat</div>
              )}
            </div>

            {selectedProof.status === 'PENDING' && (
              <div className="space-y-3 pt-2">
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Isi alasan penolakan (jika ingin menolak)..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                />
                <div className="flex items-center justify-end space-x-2">
                  <button
                    onClick={() => handleReject(selectedProof.id)}
                    disabled={processingId === selectedProof.id || !rejectionReason.trim()}
                    className="h-8 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                  >
                    TOLAK BUKTI
                  </button>
                  <button
                    onClick={() => handleApprove(selectedProof.id)}
                    disabled={processingId === selectedProof.id}
                    className="h-8 px-4 bg-[#CCFF00] hover:bg-[#b3e600] text-black font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
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
