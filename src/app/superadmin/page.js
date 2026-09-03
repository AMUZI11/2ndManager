"use client";
export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck, CheckCircle2, XCircle, Clock, Eye, RefreshCw, LogOut,
  AlertTriangle, Store, FileText, Search
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function SuperadminPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [proofs, setProofs] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL');

  const [selectedProof, setSelectedProof] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const fetchAdminProofs = async () => {
    try {
      const res = await fetch('/api/v1/admin/payment-proofs');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const json = await res.json();
        if (json.data) setProofs(json.data);
      } else if (res.status === 403) {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('[Admin Fetch Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function checkAdminAuth() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const isActiveSession = typeof window !== 'undefined' && sessionStorage.getItem('hl_active_session') === 'true';
      if (!currentUser || !isActiveSession) {
        await supabase.auth.signOut();
        router.push('/login');
        return;
      }
      setUser(currentUser);
      fetchAdminProofs();
    }

    checkAdminAuth();
  }, [router, supabase]);

  const handleApprove = async (proofId) => {
    setProcessingId(proofId);
    try {
      const res = await fetch(`/api/v1/admin/payment-proofs/${proofId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE' }),
      });
      const json = await res.json();
      if (res.ok) {
        setToastMessage(json.data?.message || 'Berhasil menyetujui pembayaran!');
        setSelectedProof(null);
        fetchAdminProofs();
      } else {
        alert(json.message || 'Gagal menyetujui.');
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (proofId) => {
    if (!rejectionReason.trim()) {
      alert('Harap isi alasan penolakan.');
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
        setToastMessage('Bukti pembayaran ditolak.');
        setSelectedProof(null);
        setRejectionReason('');
        fetchAdminProofs();
      } else {
        alert(json.message || 'Gagal menolak.');
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi.');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredProofs = proofs.filter((p) => {
    if (filterStatus === 'ALL') return true;
    return p.status === filterStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#3D1A0F] flex flex-col items-center justify-center text-white space-y-3 font-sans">
        <RefreshCw size={32} className="animate-spin text-[#C97B1A]" />
        <span className="text-xs font-bold font-mono tracking-widest text-amber-200/70">Memuat Dashboard Superadmin...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F3EA] font-sans text-[#1C1009]">

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-[#3D1A0F] text-amber-100 border border-[#C97B1A] px-6 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-bounce">
          <ShieldCheck size={18} className="text-emerald-400" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage('')} className="ml-4 font-bold text-amber-300 hover:underline">Tutup</button>
        </div>
      )}

      {/* Header Admin */}
      <header className="bg-[#3D1A0F] text-white border-b-4 border-[#4E271B] px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-[#C97B1A] rounded-2xl flex items-center justify-center font-black text-white text-lg shadow">
            SA
          </div>
          <div>
            <h1 className="text-lg font-black font-heading tracking-wide flex items-center gap-2">
              Superadmin Control Center
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-mono font-extrabold uppercase">
                Verified Superadmin
              </span>
            </h1>
            <p className="text-[11px] text-amber-100/70 font-semibold">Login sebagai: {user?.email}</p>
          </div>
        </div>

        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push('/login');
          }}
          className="bg-rose-900/60 hover:bg-rose-800 border border-rose-700/50 text-white text-xs font-extrabold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <LogOut size={14} /> Keluar Admin
        </button>
      </header>

      <main className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
        {/* Banner Menuju Obsidian Command Deck */}
        <div className="bg-[#09090B] border-2 border-zinc-700 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xl">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 bg-[#CCFF00] text-black font-black flex items-center justify-center font-mono rounded-xl shrink-0 text-base">
              ⚡
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-heading font-black text-sm uppercase text-zinc-100 tracking-wide">
                  THE OBSIDIAN COMMAND DECK (PLATFORM ADMIN)
                </h2>
                <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-[#CCFF00] text-black font-extrabold">
                  LIVE SUITE
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                Platform Pulse, Tenant Chokehold, Antrean Darurat WA (SLA &lt; 5m), Master Kategori &amp; Immutable Audit Logs.
              </p>
            </div>
          </div>
          <Link
            href="/admin/dashboard"
            className="h-10 px-5 bg-[#CCFF00] hover:bg-[#b3e600] text-black font-black text-xs rounded-xl flex items-center justify-center space-x-2 transition-all shrink-0 font-mono shadow-[0_0_15px_rgba(204,255,0,0.4)]"
          >
            <span>BUKA OBSIDIAN DECK</span>
            <span>&rarr;</span>
          </Link>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center justify-between border-b border-[#E8DCC8] pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-[#3D1A0F] font-heading">Persetujuan Pembayaran QRIS</h2>
            <p className="text-xs text-[#6B4F3A] font-semibold">Validasi bukti transfer dari pemilik toko untuk mengaktifkan langganan.</p>
          </div>

          <div className="flex bg-white p-1 rounded-2xl border border-[#E8DCC8] shadow-sm">
            {[
              { id: 'ALL', label: 'Semua' },
              { id: 'PENDING', label: 'Menunggu' },
              { id: 'APPROVED', label: 'Disetujui' },
              { id: 'REJECTED', label: 'Ditolak' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  filterStatus === tab.id
                    ? 'bg-[#3D1A0F] text-white shadow'
                    : 'text-[#6B4F3A] hover:text-[#3D1A0F]'
                }`}
              >
                {tab.label} ({proofs.filter((p) => tab.id === 'ALL' || p.status === tab.id).length})
              </button>
            ))}
          </div>
        </div>

        {/* Tabel Bukti Pembayaran */}
        <div className="bg-white border-2 border-[#E8DCC8] rounded-3xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs font-semibold">
            <thead className="bg-[#FAF7F0] border-b border-[#E8DCC8] text-[#6B4F3A] uppercase text-[10px] font-black">
              <tr>
                <th className="p-4">Toko & Pemilik</th>
                <th className="p-4">Paket Diminta</th>
                <th className="p-4">Tanggal Pengajuan</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Aksi / Bukti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProofs.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="p-4">
                    <div className="font-extrabold text-[#1C1009] text-sm">{p.shops?.name || 'Toko'}</div>
                    <div className="text-[11px] text-gray-500 font-mono">User: {p.profiles?.username || p.submitted_by?.slice(0, 8)}</div>
                  </td>
                  <td className="p-4">
                    <span className="bg-[#3D1A0F] text-white font-extrabold text-[11px] uppercase px-2.5 py-1 rounded-lg">
                      {p.plan_requested}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500 font-mono">
                    {new Date(p.created_at).toLocaleString('id-ID')}
                  </td>
                  <td className="p-4">
                    {p.status === 'PENDING' && (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1 w-fit">
                        <Clock size={12} /> PENDING
                      </span>
                    )}
                    {p.status === 'APPROVED' && (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1 w-fit">
                        <CheckCircle2 size={12} /> APPROVED
                      </span>
                    )}
                    {p.status === 'REJECTED' && (
                      <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1 w-fit">
                        <XCircle size={12} /> REJECTED
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => {
                        setSelectedProof(p);
                        setRejectionReason(p.rejection_reason || '');
                      }}
                      className="bg-[#C97B1A] hover:bg-kw-accent-hover text-white text-xs font-extrabold px-3.5 py-1.5 rounded-xl shadow transition-all flex items-center gap-1 mx-auto cursor-pointer"
                    >
                      <Eye size={14} /> Inspeksi &amp; Aksi
                    </button>
                  </td>
                </tr>
              ))}

              {filteredProofs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-400">
                    Tidak ada data pengajuan pembayaran untuk filter ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </main>

      {/* ── MODAL INSPEKSI & APPROVAL ── */}
      {selectedProof && (
        <div className="fixed inset-0 z-[10000] bg-black/75 flex items-center justify-center p-4 overflow-y-auto font-sans">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border-4 border-[#3D1A0F] space-y-4">

            <div className="bg-[#3D1A0F] text-white p-4 flex items-center justify-between">
              <h3 className="font-extrabold text-sm font-heading">
                Inspeksi Pembayaran — {selectedProof.shops?.name}
              </h3>
              <button
                onClick={() => setSelectedProof(null)}
                className="text-amber-200 hover:text-white font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">

              {/* Preview Gambar Transfer */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gray-500 uppercase">Gambar Bukti Transfer</span>
                <div className="bg-gray-100 border border-gray-200 rounded-2xl overflow-hidden min-h-[200px] max-h-[300px] flex items-center justify-center p-2">
                  {selectedProof.signed_url ? (
                    <img
                      src={selectedProof.signed_url}
                      alt="Bukti Transfer"
                      className="max-h-[280px] object-contain rounded-xl shadow"
                    />
                  ) : (
                    <span className="text-xs text-gray-400">Gambar tidak tersedia / gagal dimuat.</span>
                  )}
                </div>
              </div>

              {/* Form Aksi Approve / Reject */}
              <div className="space-y-3 border-t border-gray-200 pt-3">
                <div className="text-xs font-semibold text-gray-700">
                  Paket Diminta: <strong className="text-black font-extrabold uppercase">{selectedProof.plan_requested}</strong> (+30 Hari Aktif)
                </div>

                {selectedProof.status === 'PENDING' && (
                  <div className="space-y-3 pt-2">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-gray-600 uppercase">Alasan Penolakan (Jika Menolak)</label>
                      <input
                        type="text"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Contoh: Bukti transfer tidak jelas / nominal kurang"
                        className="w-full h-10 bg-gray-50 border border-gray-300 rounded-xl px-3 text-xs font-semibold outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        onClick={() => handleReject(selectedProof.id)}
                        disabled={processingId === selectedProof.id}
                        className="bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white font-extrabold py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <XCircle size={16} /> Tolak Pembayaran
                      </button>

                      <button
                        onClick={() => handleApprove(selectedProof.id)}
                        disabled={processingId === selectedProof.id}
                        className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-extrabold py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                      >
                        {processingId === selectedProof.id ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <><CheckCircle2 size={16} /> Setujui &amp; Aktifkan</>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {selectedProof.status !== 'PENDING' && (
                  <div className="bg-gray-100 p-3 rounded-xl text-xs font-semibold text-gray-700">
                    Status saat ini: <strong className="uppercase">{selectedProof.status}</strong> oleh {selectedProof.approved_by || 'Admin'}.
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
