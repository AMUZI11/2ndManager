"use client";

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  RefreshCw,
  Search,
  Filter,
  ShieldAlert,
  Calendar,
  ExternalLink,
  Lock,
  Tag,
  Store,
  ChevronRight,
  X
} from 'lucide-react';

export default function AdminClaimsAuditPage() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Lightbox & Modal states
  const [selectedProofUrl, setSelectedProofUrl] = useState(null);
  const [revokingClaim, setRevokingClaim] = useState(null);
  const [revocationReason, setRevocationReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState(null);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/v1/admin/claims', window.location.origin);
      if (filterStatus !== 'ALL') url.searchParams.set('status', filterStatus);
      if (searchQuery.trim()) url.searchParams.set('search', searchQuery.trim());

      const res = await fetch(url.toString(), { cache: 'no-store' });
      const json = await res.json();
      if (res.ok && json.data) {
        setClaims(json.data);
      }
    } catch (err) {
      console.error('[Fetch Claims Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
    const interval = setInterval(fetchClaims, 25000); // 25s auto-poll
    return () => clearInterval(interval);
  }, [filterStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchClaims();
  };

  // Tandai Sah / Valid Secara Tenang (Silent Verification)
  const handleMarkValid = async (claimId) => {
    try {
      setIsProcessing(true);
      const res = await fetch('/api/v1/admin/claims', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, status: 'VERIFIED_SILENT' }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.message || 'Gagal menandai bukti valid.');
      }

      setFeedbackToast({ type: 'success', text: 'Klaim pembayaran disetujui & ditandai sah.' });
      await fetchClaims();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Cabut Lisensi Sepihak (Fraud Revocation)
  const handleExecuteRevocation = async (e) => {
    e?.preventDefault();
    if (!revokingClaim) return;
    if (!revocationReason.trim()) {
      alert('Harap tuliskan alasan pencabutan lisensi.');
      return;
    }

    try {
      setIsProcessing(true);
      const res = await fetch('/api/v1/admin/claims/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimId: revokingClaim.id,
          reason: revocationReason.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.message || 'Gagal mencabut lisensi.');
      }

      setFeedbackToast({
        type: 'danger',
        text: '🚨 LISENSI DICABUT! Toko didowngrade ke MAGANG dan seluruh cabang sekunder dibekukan.',
      });
      setRevokingClaim(null);
      setRevocationReason('');
      await fetchClaims();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 p-4 sm:p-6 lg:p-8 font-sans space-y-8 pb-32">
      {/* Header Neo-Brutalist */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-950/80 border border-amber-500/60 text-amber-300 font-mono text-xs font-black uppercase tracking-widest mb-1.5">
            <ShieldAlert size={14} className="text-[#F59E0B]" />
            POST-AUDIT INSPECTION DECK
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white uppercase">
            AUDIT KLAIM BAYAR & FRAUD REVOCATION
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Inspeksi bukti transfer dari juragan yang menikmati fitur instan (Auto-Approved). Gunakan tuas darurat
            untuk mencabut lisensi dan membekukan cabang sekunder seketika jika ditemukan bukti palsu.
          </p>
        </div>

        <button
          onClick={fetchClaims}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0B0F17] hover:bg-slate-900 text-slate-300 hover:text-[#CCFF00] font-mono text-xs font-bold border-2 border-slate-700 shadow-[3px_3px_0px_#1E293B] cursor-pointer transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>REFRESH DATA</span>
        </button>
      </div>

      {/* Feedback Toast */}
      {feedbackToast && (
        <div
          className={`p-4 border-2 font-mono text-xs sm:text-sm flex items-center justify-between shadow-[4px_4px_0px_#000] ${
            feedbackToast.type === 'danger'
              ? 'bg-red-950/90 border-red-500 text-red-200'
              : 'bg-lime-950/90 border-lime-500 text-lime-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackToast.type === 'danger' ? (
              <AlertTriangle size={18} className="text-red-400 shrink-0" />
            ) : (
              <CheckCircle2 size={18} className="text-[#CCFF00] shrink-0" />
            )}
            <span className="font-bold">{feedbackToast.text}</span>
          </div>
          <button
            onClick={() => setFeedbackToast(null)}
            className="p-1 hover:bg-black/40 text-slate-400 hover:text-white cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-[#0B0F17] border-2 border-slate-800 p-4">
        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: 'ALL', label: 'SEMUA KLAIM' },
            { key: 'PROVISIONALLY_APPROVED', label: 'AKTIF (PROVISIONAL)' },
            { key: 'VERIFIED_SILENT', label: 'SAH (VERIFIED)' },
            { key: 'REVOKED_FRAUD', label: 'PENIPUAN (DICABUT)' },
            { key: 'PENDING_MANUAL_REVIEW', label: 'TINJAUAN MANUAL' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`px-3 py-1.5 font-mono text-xs font-bold border-2 transition-all cursor-pointer ${
                filterStatus === tab.key
                  ? 'bg-[#CCFF00] text-black border-black shadow-[2px_2px_0px_#000]'
                  : 'bg-[#07090E] text-slate-400 border-slate-700 hover:text-white hover:border-slate-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari warung, bank, atau rekening..."
              className="pl-9 pr-3 py-1.5 bg-[#07090E] border-2 border-slate-700 focus:border-[#CCFF00] font-mono text-xs text-white outline-none w-full sm:w-64"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold border border-slate-600 cursor-pointer"
          >
            CARI
          </button>
        </form>
      </div>

      {/* Bento Claims Table */}
      <div className="bg-[#0B0F17] border-3 border-slate-700 shadow-[6px_6px_0px_#1E293B] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="bg-[#07090E] border-b-2 border-slate-800 text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">TANGGAL & ID</th>
                <th className="py-3 px-4">WARUNG / ORGANISASI</th>
                <th className="py-3 px-4">PAKET & DURASI</th>
                <th className="py-3 px-4">NOMINAL & PROMO</th>
                <th className="py-3 px-4">BUKTI BAYAR</th>
                <th className="py-3 px-4">STATUS AUDIT</th>
                <th className="py-3 px-4 text-right">AKSI KONTROL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {claims.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-mono">
                    {loading ? 'Memuat data klaim pembayaran...' : 'Belum ada data klaim pembayaran yang sesuai.'}
                  </td>
                </tr>
              ) : (
                claims.map((c) => {
                  const isFraud = c.status === 'REVOKED_FRAUD';
                  const isProvisional = c.status === 'PROVISIONALLY_APPROVED';
                  const isVerified = c.status === 'VERIFIED_SILENT';
                  const isPending = c.status === 'PENDING_MANUAL_REVIEW';

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-900/40 transition-colors ${
                        isFraud ? 'bg-red-950/20' : ''
                      }`}
                    >
                      {/* Tanggal & ID */}
                      <td className="py-3.5 px-4 space-y-1">
                        <div className="font-bold text-white">
                          {new Date(c.created_at).toLocaleDateString('id-ID')}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[100px]">
                          {c.id.slice(0, 8)}...
                        </div>
                      </td>

                      {/* Warung & Info Pengirim */}
                      <td className="py-3.5 px-4 space-y-1">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <Store size={13} className="text-slate-400" />
                          <span>{c.organizations?.name || 'Warung Tanpa Nama'}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {c.sender_bank || '-'}{' '}
                          {c.sender_account_name ? `• a.n. ${c.sender_account_name}` : ''}
                        </div>
                        {c.organizations?.has_fraud_history && (
                          <span className="inline-block px-1.5 py-0.5 bg-red-900 text-red-200 text-[10px] font-bold border border-red-500">
                            Pernah Fraud
                          </span>
                        )}
                      </td>

                      {/* Paket & Durasi */}
                      <td className="py-3.5 px-4 space-y-1">
                        <span
                          className={`inline-block px-2 py-0.5 text-[11px] font-black border ${
                            c.target_tier === 'EKSEKUTIF'
                              ? 'bg-lime-950 text-[#CCFF00] border-lime-500'
                              : c.target_tier === 'MANAJER'
                              ? 'bg-amber-950 text-amber-300 border-amber-500'
                              : 'bg-sky-950 text-sky-300 border-sky-500'
                          }`}
                        >
                          {c.target_tier}
                        </span>
                        <div className="text-[11px] text-slate-400">{c.duration_months} Bulan</div>
                      </td>

                      {/* Nominal & Promo */}
                      <td className="py-3.5 px-4 space-y-1">
                        <div className="font-black text-white">
                          Rp {Number(c.final_price).toLocaleString('id-ID')}
                        </div>
                        {c.promo_codes ? (
                          <div className="text-[10px] text-[#CCFF00] flex items-center gap-1">
                            <Tag size={10} />
                            <span>{c.promo_codes.code}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500">Tanpa Promo</div>
                        )}
                      </td>

                      {/* Bukti Bayar Thumbnail */}
                      <td className="py-3.5 px-4">
                        {c.signed_proof_url ? (
                          <button
                            type="button"
                            onClick={() => setSelectedProofUrl(c.signed_proof_url)}
                            className="group relative block w-14 h-14 border-2 border-slate-700 hover:border-[#CCFF00] overflow-hidden cursor-pointer"
                          >
                            <img
                              src={c.signed_proof_url}
                              alt="Struk"
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye size={16} className="text-white" />
                            </div>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500">Tidak ada gambar</span>
                        )}
                      </td>

                      {/* Status Audit */}
                      <td className="py-3.5 px-4 space-y-1">
                        {isProvisional && (
                          <span className="inline-block px-2.5 py-1 bg-amber-950 text-amber-300 border-2 border-amber-500 text-[11px] font-black shadow-[2px_2px_0px_#B45309]">
                            🟡 PROVISIONAL (AKTIF)
                          </span>
                        )}
                        {isVerified && (
                          <span className="inline-block px-2.5 py-1 bg-lime-950 text-[#CCFF00] border-2 border-lime-500 text-[11px] font-black shadow-[2px_2px_0px_#4D7C0F]">
                            🟢 SAH (VALID)
                          </span>
                        )}
                        {isFraud && (
                          <div className="space-y-1">
                            <span className="inline-block px-2.5 py-1 bg-red-950 text-red-300 border-2 border-red-500 text-[11px] font-black shadow-[2px_2px_0px_#991B1B]">
                              🔴 PENIPUAN (DICABUT)
                            </span>
                            {c.revocation_reason && (
                              <p className="text-[10px] text-red-300 max-w-xs font-sans truncate">
                                Alasan: {c.revocation_reason}
                              </p>
                            )}
                          </div>
                        )}
                        {isPending && (
                          <span className="inline-block px-2.5 py-1 bg-slate-900 text-sky-300 border-2 border-sky-500 text-[11px] font-black">
                            ⏳ TINJAUAN MANUAL
                          </span>
                        )}
                      </td>

                      {/* Aksi Kontrol */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isProvisional && (
                            <button
                              type="button"
                              onClick={() => handleMarkValid(c.id)}
                              disabled={isProcessing}
                              className="px-2.5 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 font-mono text-[11px] font-bold border border-emerald-500 transition-all cursor-pointer"
                              title="Tandai Sah Tanpa Gangguan"
                            >
                              [ 🟢 SAHKAN ]
                            </button>
                          )}

                          {!isFraud && (
                            <button
                              type="button"
                              onClick={() => {
                                setRevokingClaim(c);
                                setRevocationReason('');
                              }}
                              disabled={isProcessing}
                              className="px-2.5 py-1.5 bg-red-950 hover:bg-red-900 text-red-200 font-mono text-[11px] font-bold border-2 border-red-600 shadow-[2px_2px_0px_#991B1B] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                            >
                              [ 🚨 CABUT LISENSI ]
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lightbox Modal (Zoom Bukti Transfer) */}
      {selectedProofUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh] bg-[#0B0F17] border-3 border-[#CCFF00] p-4 shadow-[8px_8px_0px_#4D7C0F] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 font-mono text-xs">
              <span className="text-[#CCFF00] font-black uppercase">
                INSPEKSI RESOLUSI TINGGI BUKTI TRANSFER
              </span>
              <button
                onClick={() => setSelectedProofUrl(null)}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-auto max-h-[75vh] flex items-center justify-center bg-black/60 p-2">
              <img
                src={selectedProofUrl}
                alt="Zoom Bukti Bayar"
                className="max-h-[70vh] object-contain border border-slate-700"
              />
            </div>

            <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 pt-2">
              <span>Periksa nomor referensi, tanggal mutasi, dan nama penerima.</span>
              <a
                href={selectedProofUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#CCFF00] underline flex items-center gap-1"
              >
                <span>Buka Berkas Asli</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Pencabutan Bukti Palsu (One-Click Fraud Revocation) */}
      {revokingClaim && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B0F17] border-3 border-red-600 p-6 sm:p-8 max-w-lg w-full shadow-[8px_8px_0px_#991B1B] space-y-6 relative animate-in fade-in duration-150">
            <button
              onClick={() => setRevokingClaim(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white border border-slate-700 cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-red-950 border border-red-500 text-red-200 font-mono text-xs font-black uppercase">
                <AlertTriangle size={14} className="text-red-400" />
                TINDAKAN SANKSI KRITIS (ONE-CLICK REVOCATION)
              </div>
              <h2 className="text-xl font-mono font-black text-white uppercase">
                CABUT LISENSI BUKTI PALSU
              </h2>
              <p className="text-xs text-slate-300">
                Anda akan mencabut lisensi untuk warung{' '}
                <strong className="text-white">{revokingClaim.organizations?.name}</strong>.
                Tindakan ini akan seketika:
              </p>
              <ul className="text-xs font-mono text-red-300 list-disc pl-5 space-y-1 pt-1">
                <li>Menurunkan tier organisasi ke MAGANG secara permanen.</li>
                <li>Menonaktifkan seluruh cabang non-utama (read-only mode).</li>
                <li>Menandai organisasi memiliki riwayat penipuan (has_fraud_history = TRUE).</li>
                <li>Mewajibkan verifikasi manual ketat untuk seluruh pembayaran selanjutnya.</li>
              </ul>
            </div>

            <form onSubmit={handleExecuteRevocation} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1.5">
                  ALASAN PENCABUTAN LISENSI (WAJIB)
                </label>
                <textarea
                  rows={3}
                  value={revocationReason}
                  onChange={(e) => setRevocationReason(e.target.value)}
                  placeholder="Contoh: Bukti transfer diedit / mutasi rekening tidak ditemukan / nominal tidak sesuai."
                  className="w-full bg-[#07090E] border-2 border-red-500/80 focus:border-red-400 p-3 font-mono text-xs text-white placeholder-slate-600 outline-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRevokingClaim(null)}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono text-xs font-bold border border-slate-700 cursor-pointer uppercase"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessing || !revocationReason.trim()}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-mono text-xs font-black border-2 border-black shadow-[4px_4px_0px_#000] cursor-pointer uppercase transition-all"
                >
                  {isProcessing ? 'MENGEKSEKUSI SANKSI...' : '[ 🚨 EKSEKUSI CABUT LISENSI ]'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
