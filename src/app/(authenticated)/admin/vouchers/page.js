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
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-mono">
      {/* ─── 1. HEADER ─── */}
      <div className="no-print bg-[#0F172A] border-2 border-[#1E293B] p-4 sm:p-5 shadow-[3px_3px_0px_#000000] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-[#CCFF00] tracking-widest uppercase">
            <span className="w-2.5 h-2.5 bg-[#CCFF00] inline-block border border-black" />
            <span>SUPERADMIN ENGINE — TAHAP 10</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight mt-1">
            PENERBITAN VOUCHER LISENSI KRIPTOGRAFIS
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase">
            HMAC-SHA256 Signed 16-Digit Offline Cryptographic Activation Tokens (4x4 Blocks)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadTokens}
            disabled={loading}
            className="flex items-center gap-1.5 bg-[#161F36] hover:bg-[#223055] text-slate-300 border border-[#334155] px-3 py-2 text-xs font-bold uppercase transition-all cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>REFRESH</span>
          </button>

          {newlyMinted.length > 0 && (
            <button
              type="button"
              onClick={handlePrintSheet}
              className="flex items-center gap-1.5 bg-[#CCFF00] hover:bg-[#b8e600] text-black font-black text-xs uppercase px-4 py-2 border-2 border-black shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
            >
              <Printer size={15} />
              <span>CETAK LEMBAR VOUCHER FISIK</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="no-print bg-rose-950/60 border-2 border-rose-600 text-rose-300 p-3 text-xs font-bold uppercase">
          PERINGATAN: {error}
        </div>
      )}

      {/* ─── 2. MINTING CONSOLE FORM ─── */}
      <div className="no-print bg-[#0F172A] border-2 border-[#1E293B] p-5 shadow-[3px_3px_0px_#000000] space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#1E293B] text-xs font-black uppercase text-white">
          <Key size={16} className="text-[#CCFF00]" />
          <span>MINTING CONSOLE LISENSI BARU</span>
        </div>

        <form onSubmit={handleMintTokens} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Tier Selection */}
            <div>
              <label className="block text-slate-300 font-bold uppercase mb-1">
                TIER PAKET LISENSI
              </label>
              <select
                value={tierId}
                onChange={(e) => setTierId(e.target.value)}
                className="w-full bg-[#161F36] border-2 border-[#334155] focus:border-[#CCFF00] text-white px-3 py-2 text-xs font-bold uppercase focus:outline-none cursor-pointer"
              >
                <option value="SUPERVISOR">SUPERVISOR (1 CABANG / RP 49.000)</option>
                <option value="MANAJER">MANAJER (2 CABANG / RP 99.000)</option>
                <option value="EKSEKUTIF">EKSEKUTIF (3 CABANG / RP 149.000)</option>
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-slate-300 font-bold uppercase mb-1">
                MASA AKTIF LISENSI
              </label>
              <select
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                className="w-full bg-[#161F36] border-2 border-[#334155] focus:border-[#CCFF00] text-white px-3 py-2 text-xs font-bold uppercase focus:outline-none cursor-pointer"
              >
                <option value="30">30 HARI (1 BULAN)</option>
                <option value="90">90 HARI (3 BULAN)</option>
                <option value="180">180 HARI (6 BULAN)</option>
                <option value="365">365 HARI (1 TAHUN PENUH)</option>
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-slate-300 font-bold uppercase mb-1">
                JUMLAH TOKEN DICETAK
              </label>
              <select
                value={count}
                onChange={(e) => setCount(e.target.value)}
                className="w-full bg-[#161F36] border-2 border-[#334155] focus:border-[#CCFF00] text-white px-3 py-2 text-xs font-bold uppercase focus:outline-none cursor-pointer"
              >
                <option value="1">1 KEPING TOKEN</option>
                <option value="5">BATCH 5 KEPING</option>
                <option value="10">BATCH 10 KEPING</option>
                <option value="25">BATCH 25 KEPING</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-bold uppercase mb-1">
              CATATAN PENERBITAN / NAMA DISTRIBUTOR
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="CONTOH: KONSINYASI MITRA PAGUYUBAN MADURA JABODETABEK"
              className="w-full bg-[#161F36] border-2 border-[#334155] focus:border-[#CCFF00] text-white px-3 py-2 uppercase focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#CCFF00] hover:bg-[#b8e600] text-black font-black uppercase px-6 py-2.5 border-2 border-black shadow-[3px_3px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'MEMPRODUKSI TOKEN HMAC...' : '⚡ TERBITKAN VOUCHER SEKARANG'}
            </button>
          </div>
        </form>
      </div>

      {/* ─── 3. NEWLY MINTED CARDS (4x4 SEGMENTED PRINTABLE) ─── */}
      {newlyMinted.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b-2 border-[#1E293B] pb-2">
            <h2 className="text-sm font-black uppercase text-[#CCFF00] flex items-center gap-1.5">
              <Sparkles size={16} />
              <span>TOKEN HASIL PENERBITAN BARU ({newlyMinted.length} KEPING)</span>
            </h2>
            <span className="text-[10px] text-slate-400 uppercase">
              SIAP DICETAK ATAU DIBAGIKAN
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {newlyMinted.map((item, idx) => (
              <div
                key={idx}
                className="bg-[#0F172A] border-2 border-[#CCFF00] p-4 shadow-[3px_3px_0px_#000000] space-y-3 relative"
              >
                <div className="flex items-center justify-between border-b border-[#1E293B] pb-2">
                  <span className="text-[10px] font-black bg-[#CCFF00] text-black px-1.5 py-0.5">
                    {item.tier_id || tierId}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {item.duration_days || durationDays} HARI
                  </span>
                </div>

                {/* 4x4 Segmented Code */}
                <div className="text-center py-2 bg-black border border-slate-800">
                  <span className="text-lg font-black text-[#CCFF00] tracking-widest block select-all">
                    {item.token_code}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 uppercase truncate max-w-[140px]">
                    HMAC SIGNED
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(item.token_code)}
                    className="flex items-center gap-1 bg-[#161F36] hover:bg-[#202c4b] text-slate-300 hover:text-white px-2 py-1 border border-[#334155] uppercase font-bold transition-colors cursor-pointer"
                  >
                    {copiedCode === item.token_code ? (
                      <>
                        <Check size={12} className="text-emerald-400" />
                        <span className="text-emerald-400">TERSALIN!</span>
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
      <div className="bg-[#0F172A] border-2 border-[#1E293B] shadow-[3px_3px_0px_#000000] overflow-x-auto space-y-2 p-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
          <h2 className="text-xs font-black uppercase text-white">
            BUKU BESAR AUDIT VOUCHER LISENSI
          </h2>
          <span className="text-[10px] text-slate-400">
            TOTAL: {tokens.length} RECORD
          </span>
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#161F36] border-b-2 border-[#1E293B] text-[11px] font-black uppercase text-slate-300">
              <th className="p-3 w-48">KODE TOKEN (4x4)</th>
              <th className="p-3 w-32">TIER PAKET</th>
              <th className="p-3 w-28">DURASI</th>
              <th className="p-3 w-36 text-center">STATUS</th>
              <th className="p-3 min-w-[200px]">CATATAN / PENEBUS</th>
              <th className="p-3 w-40">TANGGAL DIBUAT</th>
              <th className="p-3 w-24 text-center">AKSI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B]">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400 uppercase">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#CCFF00]" />
                  [ MEMUAT DATA VOUCHER... ]
                </td>
              </tr>
            ) : tokens.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-slate-400 uppercase">
                  <Key className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  [ BELUM ADA VOUCHER LISENSI DITERBITKAN ]
                </td>
              </tr>
            ) : (
              tokens.map((t) => {
                const isUsed = t.status === 'REDEEMED' || t.status === 'USED';

                return (
                  <tr key={t.id} className="hover:bg-[#161F36]/80 transition-colors">
                    <td className="p-3 font-black text-white tracking-wider">
                      {t.token_code}
                    </td>

                    <td className="p-3">
                      <span className="bg-black text-[#CCFF00] px-1.5 py-0.5 text-[10px] border border-slate-800 font-bold">
                        {t.tier_id}
                      </span>
                    </td>

                    <td className="p-3 text-slate-300">{t.duration_days} HARI</td>

                    <td className="p-3 text-center">
                      {isUsed ? (
                        <span className="text-[9px] font-black bg-slate-900 text-slate-400 border border-slate-700 px-1.5 py-0.5 uppercase">
                          [ DIAKTIFKAN ]
                        </span>
                      ) : (
                        <span className="text-[9px] font-black bg-emerald-950 text-emerald-300 border border-emerald-700 px-1.5 py-0.5 uppercase">
                          [ TERSEDIA ]
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-slate-400 truncate max-w-[220px]">
                      {t.notes || '-'}
                    </td>

                    <td className="p-3 text-slate-400 text-[11px]">
                      {t.created_at ? new Date(t.created_at).toLocaleString('id-ID') : '-'}
                    </td>

                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleCopy(t.token_code)}
                        title="Salin Token"
                        className="bg-[#161F36] hover:bg-[#202c4b] text-slate-300 px-2 py-1 text-[10px] border border-[#334155] uppercase"
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
  );
}
