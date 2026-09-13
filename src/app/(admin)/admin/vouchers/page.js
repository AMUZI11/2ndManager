"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Ticket, 
  Key, 
  Copy, 
  Check, 
  RefreshCw, 
  ShieldCheck, 
  Sparkles, 
  Clock, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  AlertCircle,
  Download
} from 'lucide-react';

export default function AdminVouchersPage() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [minting, setMinting] = useState(false);
  const [copiedToken, setCopiedToken] = useState(null);

  // Minting Form
  const [tierId, setTierId] = useState('SUPERVISOR');
  const [durationDays, setDurationDays] = useState(30);
  const [count, setCount] = useState(1);
  const [notes, setNotes] = useState('');

  // Table Filters & Pagination
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [tierFilter, setTierFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Notifications
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [newlyMinted, setNewlyMinted] = useState([]);

  const fetchTokens = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/admin/vouchers?status=${statusFilter}&tier=${tierFilter}&page=${page}&limit=20`);
      const json = await res.json();
      if (res.ok && json.data) {
        setTokens(json.data.tokens || []);
        setTotalPages(json.data.pagination?.totalPages || 1);
        setTotalCount(json.data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('[Fetch Tokens Error]', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, tierFilter, page]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const handleMint = async (e) => {
    e.preventDefault();
    try {
      setMinting(true);
      setErrorMsg('');
      const res = await fetch('/api/v1/admin/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tierId,
          durationDays: Number(durationDays),
          count: Number(count),
          notes: notes || 'Pencetakan Lisensi via Admin Portal',
        }),
      });

      const json = await res.json();
      if (res.ok && json.data) {
        setNewlyMinted(json.data.tokens || []);
        setSuccessMsg(`Berhasil memproduksi ${json.data.count} token voucher tier ${tierId}!`);
        setNotes('');
        fetchTokens();
      } else {
        setErrorMsg(json.error?.message || 'Gagal mencetak token voucher.');
      }
    } catch (err) {
      console.error('[Mint Token Error]', err);
      setErrorMsg('Terjadi kesalahan saat memproduksi token.');
    } finally {
      setMinting(false);
    }
  };

  const handleCopy = (tokenCode) => {
    navigator.clipboard.writeText(tokenCode);
    setCopiedToken(tokenCode);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleCopyAllNew = () => {
    if (newlyMinted.length === 0) return;
    const all = newlyMinted.map((t) => t.token_code).join('\n');
    navigator.clipboard.writeText(all);
    setSuccessMsg('Seluruh token baru disalin ke clipboard!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="space-y-6 font-sans max-w-7xl mx-auto pb-12">
      {/* Header Bento Card */}
      <div className="bg-white border-2 border-slate-800 rounded-2xl p-6 shadow-[4px_4px_0px_0px_#1e293b] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-[#CCFF00] border-2 border-slate-800 rounded-xl shadow-[2px_2px_0px_0px_#1e293b]">
              <Ticket className="w-5 h-5 text-slate-900" />
            </span>
            <h1 className="font-display font-black text-2xl text-slate-900 tracking-tight">
              Cryptographic Voucher Engine
            </h1>
          </div>
          <p className="text-slate-600 text-sm font-medium">
            Pencetakan token aktivasi offline berotentikasi HMAC-SHA256 tanpa dependensi payment gateway.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchTokens}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white border-2 border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-800 shadow-[2px_2px_0px_0px_#1e293b] hover:bg-slate-50 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>SEGARKAN</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-lime-100 border-2 border-slate-800 rounded-xl p-4 shadow-[3px_3px_0px_0px_#1e293b] flex items-center justify-between text-slate-900 font-mono text-xs font-bold animate-in fade-in duration-200">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-lime-700 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg('')}
            className="text-slate-500 hover:text-slate-800 text-sm font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-100 border-2 border-slate-800 rounded-xl p-4 shadow-[3px_3px_0px_0px_#1e293b] flex items-center justify-between text-slate-900 font-mono text-xs font-bold animate-in fade-in duration-200">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg('')}
            className="text-slate-500 hover:text-slate-800 text-sm font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Minting Form & Recent Production Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Minting Panel (Left 1 Col) */}
        <div className="bg-white border-2 border-slate-800 rounded-2xl p-6 shadow-[4px_4px_0px_0px_#1e293b] space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b-2 border-slate-800">
            <Key className="w-4 h-4 text-slate-900" />
            <h2 className="font-display font-black text-base text-slate-900">
              Pencetakan Token Baru
            </h2>
          </div>

          <form onSubmit={handleMint} className="space-y-3.5">
            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1">
                Pilih Tier Lisensi
              </label>
              <select
                value={tierId}
                onChange={(e) => setTierId(e.target.value)}
                className="w-full bg-white border-2 border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 shadow-[2px_2px_0px_0px_#1e293b] focus:outline-none focus:ring-2 focus:ring-[#CCFF00]"
              >
                <option value="SUPERVISOR">SUPERVISOR (1 Cabang / 2 Kasir)</option>
                <option value="MANAJER">MANAJER (3 Cabang / 5 Kasir)</option>
                <option value="EKSEKUTIF">EKSEKUTIF (10 Cabang / 20 Kasir)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1">
                Masa Aktif (Durasi)
              </label>
              <select
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="w-full bg-white border-2 border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 shadow-[2px_2px_0px_0px_#1e293b] focus:outline-none focus:ring-2 focus:ring-[#CCFF00]"
              >
                <option value={30}>30 Hari (1 Bulan)</option>
                <option value={90}>90 Hari (3 Bulan)</option>
                <option value={180}>180 Hari (6 Bulan)</option>
                <option value={365}>365 Hari (1 Tahun)</option>
                <option value={3650}>3650 Hari (Permanen / Seumur Hidup)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1">
                Kuantitas Token
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1)))}
                className="w-full bg-white border-2 border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 shadow-[2px_2px_0px_0px_#1e293b] focus:outline-none focus:ring-2 focus:ring-[#CCFF00]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1">
                Catatan / Memo Batch
              </label>
              <input
                type="text"
                placeholder="Contoh: Voucher Promo Warung Tebet"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-white border-2 border-slate-800 rounded-xl px-3 py-2 text-xs font-sans text-slate-900 shadow-[2px_2px_0px_0px_#1e293b] focus:outline-none focus:ring-2 focus:ring-[#CCFF00]"
              />
            </div>

            <button
              type="submit"
              disabled={minting}
              className="w-full mt-2 py-2.5 px-4 bg-[#CCFF00] border-2 border-slate-800 rounded-xl text-xs font-mono font-black text-slate-900 shadow-[3px_3px_0px_0px_#1e293b] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4" />
              <span>{minting ? 'MEMPRODUKSI TOKEN...' : 'CETAK TOKEN VOUCHER'}</span>
            </button>
          </form>
        </div>

        {/* Newly Minted Display (Right 2 Cols) */}
        <div className="lg:col-span-2 bg-white border-2 border-slate-800 rounded-2xl p-6 shadow-[4px_4px_0px_0px_#1e293b] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-800">
              <div>
                <h2 className="font-display font-black text-base text-slate-900">
                  Hasil Cetak Batch Terakhir
                </h2>
                <p className="text-xs font-mono text-slate-500">
                  Token siap dibagikan kepada merchant untuk aktivasi langsung di halaman Billing
                </p>
              </div>
              {newlyMinted.length > 0 && (
                <button
                  onClick={handleCopyAllNew}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-slate-900 text-[#CCFF00] border-2 border-slate-800 rounded-xl text-xs font-mono font-bold shadow-[2px_2px_0px_0px_#64748b] hover:bg-slate-800 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>SALIN SEMUA</span>
                </button>
              )}
            </div>

            <div className="mt-4 space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {newlyMinted.length === 0 ? (
                <div className="py-16 text-center text-slate-400 font-mono text-xs">
                  Belum ada token yang dicetak pada sesi ini. Isi formulir di samping untuk memproduksi voucher.
                </div>
              ) : (
                newlyMinted.map((token, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-slate-50 border-2 border-slate-800 rounded-xl hover:bg-lime-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-xs text-slate-400 font-bold">#{idx + 1}</span>
                      <span className="font-mono text-sm font-black text-slate-900 tracking-wider">
                        {token.token_code}
                      </span>
                      <span className="font-mono text-[10px] font-bold bg-[#CCFF00] border border-slate-800 px-1.5 py-0.5 rounded">
                        {token.tier_id}
                      </span>
                    </div>

                    <button
                      onClick={() => handleCopy(token.token_code)}
                      className="px-2.5 py-1 bg-white border border-slate-800 rounded-lg text-xs font-mono font-bold text-slate-800 hover:bg-slate-100 flex items-center space-x-1 cursor-pointer"
                    >
                      {copiedToken === token.token_code ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin</span>
                        </>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 p-3 bg-slate-100 border border-slate-300 rounded-xl text-[11px] font-mono text-slate-600 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Format token divalidasi dengan algoritma HMAC-SHA256 truncated signature sehingga kebal manipulasi client-side.</span>
          </div>
        </div>
      </div>

      {/* Historical Tokens Table Bento Card */}
      <div className="bg-white border-2 border-slate-800 rounded-2xl shadow-[4px_4px_0px_0px_#1e293b] overflow-hidden">
        <div className="p-5 border-b-2 border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
          <div>
            <h2 className="font-display font-black text-base text-slate-900 tracking-tight">
              Arsip Token Lisensi
            </h2>
            <p className="text-xs font-mono text-slate-500">
              Total {totalCount} token tercatat dalam basis data sistem
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            {/* Status Filter */}
            <div className="flex items-center bg-white border-2 border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-mono font-bold shadow-[2px_2px_0px_0px_#1e293b]">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="bg-transparent text-xs text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="ALL">SEMUA STATUS</option>
                <option value="UNUSED">UNUSED (BELUM AKTIF)</option>
                <option value="USED">USED (SUDAH AKTIF)</option>
              </select>
            </div>

            {/* Tier Filter */}
            <div className="flex items-center bg-white border-2 border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-mono font-bold shadow-[2px_2px_0px_0px_#1e293b]">
              <select
                value={tierFilter}
                onChange={(e) => { setTierFilter(e.target.value); setPage(1); }}
                className="bg-transparent text-xs text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="ALL">SEMUA TIER</option>
                <option value="SUPERVISOR">SUPERVISOR</option>
                <option value="MANAJER">MANAJER</option>
                <option value="EKSEKUTIF">EKSEKUTIF</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-800 text-[11px] font-mono font-bold text-slate-700 uppercase tracking-wider">
                <th className="py-3 px-4">Token Code</th>
                <th className="py-3 px-4">Tier</th>
                <th className="py-3 px-4">Durasi</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Catatan</th>
                <th className="py-3 px-4">Waktu Terbit</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100 font-mono text-xs">
              {loading && tokens.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-mono">
                    Memuat daftar token...
                  </td>
                </tr>
              ) : tokens.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-mono">
                    Tidak ada token yang sesuai kriteria filter.
                  </td>
                </tr>
              ) : (
                tokens.map((token) => {
                  const isUnused = token.status === 'UNUSED';
                  return (
                    <tr key={token.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <span className="bg-slate-100 border border-slate-800 px-2 py-0.5 rounded font-mono text-xs font-black tracking-wider">
                          {token.token_code}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold">
                        <span className="bg-lime-200 border border-slate-800 px-2 py-0.5 rounded text-[11px]">
                          {token.tier_id}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {token.duration_days} Hari
                      </td>
                      <td className="py-3 px-4">
                        {isUnused ? (
                          <span className="bg-[#CCFF00] text-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                            UNUSED
                          </span>
                        ) : (
                          <span className="bg-slate-200 text-slate-700 border border-slate-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                            USED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-sans text-xs truncate max-w-[180px]">
                        {token.notes || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {token.created_at ? new Date(token.created_at).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleCopy(token.token_code)}
                          className="px-2.5 py-1 bg-white border border-slate-800 rounded-lg text-xs font-mono font-bold text-slate-800 hover:bg-slate-100 inline-flex items-center space-x-1 cursor-pointer"
                        >
                          {copiedToken === token.token_code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedToken === token.token_code ? 'Tersalin' : 'Salin'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t-2 border-slate-800 bg-slate-50 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-600 font-bold">
            Halaman {page} dari {totalPages}
          </span>
          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border-2 border-slate-800 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border-2 border-slate-800 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
