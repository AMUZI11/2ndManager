"use client";

import React, { useState, useEffect } from 'react';
import {
  Key,
  Plus,
  Printer,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles,
  QrCode,
  Tag,
  Clock,
} from 'lucide-react';

export default function AdminVouchersPage() {
  const [tokens, setTokens] = useState([]);
  const [newlyMinted, setNewlyMinted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [error, setError] = useState(null);

  // Minting Form
  const [tierId, setTierId] = useState('EKSEKUTIF');
  const [durationDays, setDurationDays] = useState('30');
  const [count, setCount] = useState('1');
  const [notes, setNotes] = useState('Batch Voucher Gerai B2B');

  const loadTokens = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/v1/admin/vouchers');
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Gagal memuat riwayat voucher');
      }
      setTokens(json.data?.tokens || []);
    } catch (err) {
      console.error('[Load Vouchers Error]', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTokens();
  }, []);

  const handleMintTokens = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch('/api/v1/admin/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tierId,
          durationDays: Number(durationDays),
          count: Number(count),
          notes,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Gagal menerbitkan voucher');
      }

      setNewlyMinted(json.data?.tokens || []);
      await loadTokens();
    } catch (err) {
      console.error('[Mint Vouchers Error]', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handlePrintSheet = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ─── 1. HEADER ─── */}
      <div className="no-print bg-white/90 backdrop-blur-md border-2 border-slate-800 rounded-2xl p-5 shadow-[3px_3px_0_#1E293B] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-slate-600 tracking-widest uppercase">
            <span className="w-2.5 h-2.5 bg-[#CCFF00] inline-block rounded-full border border-slate-800" />
            <span>SUPERADMIN ENGINE — TAHAP 10</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-black uppercase text-slate-900 tracking-tight mt-1">
            PENERBITAN VOUCHER LISENSI KRIPTOGRAFIS
          </h1>
          <p className="text-xs font-mono text-slate-500 mt-1 uppercase">
            HMAC-SHA256 Signed 16-Digit Offline Cryptographic Activation Tokens (4x4 Blocks)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadTokens}
            disabled={loading}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono font-bold uppercase transition-all shadow-[2px_2px_0_#1E293B] cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>REFRESH</span>
          </button>

          {newlyMinted.length > 0 && (
            <button
              type="button"
              onClick={handlePrintSheet}
              className="flex items-center gap-1.5 bg-[#CCFF00] hover:bg-[#b8e600] text-slate-900 font-mono font-black text-xs uppercase px-4 py-2 rounded-xl border-2 border-slate-800 shadow-[3px_3px_0_#1E293B] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
            >
              <Printer size={15} />
              <span>CETAK LEMBAR VOUCHER FISIK</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="no-print bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-800 p-4 text-xs font-mono font-bold uppercase shadow-[2px_2px_0_#1E293B]">
          PERINGATAN: {error}
        </div>
      )}

      {/* ─── 2. MINTING CONSOLE FORM ─── */}
      <div className="no-print bg-white/90 backdrop-blur-md rounded-2xl border-2 border-slate-800 p-5 shadow-[3px_3px_0_#1E293B] space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200 text-xs font-mono font-black uppercase text-slate-900">
          <Key size={16} className="text-slate-800" />
          <span>MINTING CONSOLE LISENSI BARU</span>
        </div>

        <form onSubmit={handleMintTokens} className="space-y-4 text-xs font-mono">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Tier Selection */}
            <div>
              <label className="block text-slate-700 font-bold uppercase mb-1">
                TIER PAKET LISENSI
              </label>
              <select
                value={tierId}
                onChange={(e) => setTierId(e.target.value)}
                className="w-full bg-white border-2 border-slate-800 focus:border-slate-900 text-slate-900 px-3.5 py-2.5 text-xs font-bold uppercase rounded-xl focus:outline-none cursor-pointer shadow-[1px_1px_0_#1E293B]"
              >
                <option value="SUPERVISOR">SUPERVISOR (1 CABANG / RP 49.000)</option>
                <option value="MANAJER">MANAJER (2 CABANG / RP 99.000)</option>
                <option value="EKSEKUTIF">EKSEKUTIF (3 CABANG / RP 149.000)</option>
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-slate-700 font-bold uppercase mb-1">
                MASA AKTIF LISENSI
              </label>
              <select
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                className="w-full bg-white border-2 border-slate-800 focus:border-slate-900 text-slate-900 px-3.5 py-2.5 text-xs font-bold uppercase rounded-xl focus:outline-none cursor-pointer shadow-[1px_1px_0_#1E293B]"
              >
                <option value="30">30 HARI (1 BULAN)</option>
                <option value="90">90 HARI (3 BULAN)</option>
                <option value="180">180 HARI (6 BULAN)</option>
                <option value="365">365 HARI (1 TAHUN PENUH)</option>
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-slate-700 font-bold uppercase mb-1">
                JUMLAH TOKEN DICETAK
              </label>
              <select
                value={count}
                onChange={(e) => setCount(e.target.value)}
                className="w-full bg-white border-2 border-slate-800 focus:border-slate-900 text-slate-900 px-3.5 py-2.5 text-xs font-bold uppercase rounded-xl focus:outline-none cursor-pointer shadow-[1px_1px_0_#1E293B]"
              >
                <option value="1">1 KEPING TOKEN</option>
                <option value="5">BATCH 5 KEPING</option>
                <option value="10">BATCH 10 KEPING</option>
                <option value="25">BATCH 25 KEPING</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold uppercase mb-1">
              CATATAN PENERBITAN / NAMA DISTRIBUTOR
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="CONTOH: KONSINYASI MITRA PAGUYUBAN MADURA JABODETABEK"
              className="w-full bg-white border-2 border-slate-800 focus:border-slate-900 text-slate-900 px-3.5 py-2.5 rounded-xl uppercase focus:outline-none shadow-[1px_1px_0_#1E293B]"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#CCFF00] hover:bg-[#b8e600] text-slate-900 font-black uppercase px-6 py-2.5 rounded-xl border-2 border-slate-800 shadow-[3px_3px_0_#1E293B] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'MEMPRODUKSI TOKEN HMAC...' : '⚡ TERBITKAN VOUCHER SEKARANG'}
            </button>
          </div>
        </form>
      </div>

      {/* ─── 3. NEWLY MINTED CARDS (4x4 SEGMENTED PRINTABLE) ─── */}
      {newlyMinted.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b-2 border-slate-300 pb-2">
            <h2 className="text-sm font-mono font-black uppercase text-slate-900 flex items-center gap-1.5">
              <Sparkles size={16} className="text-amber-500" />
              <span>TOKEN HASIL PENERBITAN BARU ({newlyMinted.length} KEPING)</span>
            </h2>
            <span className="text-[10px] font-mono text-slate-500 uppercase">
              SIAP DICETAK ATAU DIBAGIKAN
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {newlyMinted.map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border-2 border-slate-800 p-5 shadow-[3px_3px_0_#1E293B] space-y-3 relative"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 font-mono">
                  <span className="text-[10px] font-black bg-[#CCFF00] text-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                    {item.tier_id || tierId}
                  </span>
                  <span className="text-[10px] text-slate-600 font-bold">
                    {item.duration_days || durationDays} HARI
                  </span>
                </div>

                {/* 4x4 Segmented Code */}
                <div className="text-center py-2.5 bg-slate-50 rounded-xl border-2 border-slate-800 shadow-inner">
                  <span className="text-lg font-mono font-black text-slate-900 tracking-widest block select-all">
                    {item.token_code}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-500 uppercase truncate max-w-[140px] font-bold">
                    HMAC SIGNED
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(item.token_code)}
                    className="flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-900 px-2.5 py-1 rounded-lg border-2 border-slate-800 uppercase font-black transition-all shadow-[1px_1px_0_#1E293B] cursor-pointer"
                  >
                    {copiedCode === item.token_code ? (
                      <>
                        <Check size={12} className="text-emerald-600" />
                        <span className="text-emerald-600">TERSALIN!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>SALIN KODE</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── 4. TOKEN LEDGER & HISTORY ─── */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0_#1E293B] overflow-hidden">
        <div className="flex items-center justify-between p-4 bg-slate-50 border-b-2 border-slate-800">
          <h2 className="text-xs font-mono font-black uppercase text-slate-900">
            BUKU BESAR AUDIT VOUCHER LISENSI
          </h2>
          <span className="text-[10px] font-mono text-slate-500 font-bold">
            TOTAL: {tokens.length} RECORD
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="bg-slate-100/90 border-b-2 border-slate-800 text-[11px] font-black uppercase text-slate-700">
                <th className="p-3.5 w-48">KODE TOKEN (4x4)</th>
                <th className="p-3.5 w-32">TIER PAKET</th>
                <th className="p-3.5 w-28">DURASI</th>
                <th className="p-3.5 w-36 text-center">STATUS</th>
                <th className="p-3.5 min-w-[200px]">CATATAN / PENEBUS</th>
                <th className="p-3.5 w-40">TANGGAL DIBUAT</th>
                <th className="p-3.5 w-24 text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 uppercase font-mono">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-800" />
                    [ MEMUAT DATA VOUCHER... ]
                  </td>
                </tr>
              ) : tokens.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-500 uppercase font-mono">
                    <Key className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    [ BELUM ADA VOUCHER LISENSI DITERBITKAN ]
                  </td>
                </tr>
              ) : (
                tokens.map((t) => {
                  const isUsed = t.status === 'REDEEMED' || t.status === 'USED';

                  return (
                    <tr key={t.id} className="hover:bg-amber-50/40 transition-colors">
                      <td className="p-3.5 font-black text-slate-900 tracking-wider">
                        {t.token_code}
                      </td>

                      <td className="p-3.5">
                        <span className="bg-[#CCFF00] text-slate-900 px-2 py-0.5 text-[10px] rounded-lg border border-slate-800 font-bold">
                          {t.tier_id}
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-700 font-bold">{t.duration_days} HARI</td>

                      <td className="p-3.5 text-center">
                        {isUsed ? (
                          <span className="text-[9px] font-black bg-slate-100 text-slate-600 border border-slate-300 px-2 py-0.5 rounded-lg uppercase">
                            DIAKTIFKAN
                          </span>
                        ) : (
                          <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-lg uppercase">
                            TERSEDIA
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-slate-600 truncate max-w-[220px]">
                        {t.notes || '-'}
                      </td>

                      <td className="p-3.5 text-slate-500 text-[11px]">
                        {t.created_at ? new Date(t.created_at).toLocaleString('id-ID') : '-'}
                      </td>

                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleCopy(t.token_code)}
                          title="Salin Token"
                          className="bg-white hover:bg-slate-100 text-slate-800 px-2.5 py-1 text-[10px] rounded-lg border-2 border-slate-800 uppercase font-black shadow-[1px_1px_0_#1E293B] cursor-pointer"
                        >
                          SALIN
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
