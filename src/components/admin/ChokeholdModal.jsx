"use client";

import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, Clock, X, Check } from 'lucide-react';

export default function ChokeholdModal({ isOpen, onClose, shop, onSuccess }) {
  const [action, setAction] = useState('DISPENSASI'); // 'DISPENSASI' | 'CHOKEHOLD' | 'RELEASE'
  const [days, setDays] = useState(3);
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !shop) return null;

  const isChokehold = action === 'CHOKEHOLD';
  const isRelease = action === 'RELEASE';
  const isFormValid = reason.trim().length >= 10 && (isRelease || !isChokehold || confirmText.toUpperCase() === 'KONFIRMASI');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    try {
      setLoading(true);
      setError('');

      const res = await fetch(`/api/v1/admin/tenants/${shop.id}/chokehold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          days: action === 'DISPENSASI' ? Number(days) : 0,
          reason: reason.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.message || 'Gagal mengeksekusi penegakan status toko.');
      }

      onSuccess && onSuccess(json.data);
      onClose();
    } catch (err) {
      console.error('[Chokehold Error]', err);
      setError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="w-full max-w-lg bg-zinc-950 border-2 border-zinc-700 shadow-[0_25px_50px_rgba(0,0,0,0.9)] rounded-xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className={`p-4 border-b border-zinc-800 flex items-center justify-between ${
          isChokehold ? 'bg-red-950/40' : isRelease ? 'bg-emerald-950/40' : 'bg-amber-950/40'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center border font-bold ${
              isChokehold 
                ? 'bg-[#E30022] text-white border-red-500' 
                : isRelease
                ? 'bg-emerald-500 text-black border-emerald-400'
                : 'bg-amber-500 text-black border-amber-400'
            }`}>
              {isChokehold ? <ShieldAlert size={18} /> : isRelease ? <Check size={18} /> : <Clock size={18} />}
            </div>
            <div>
              <h3 className="font-heading font-black text-sm text-zinc-100 uppercase tracking-tight">
                Penegakan Tagihan &amp; Chokehold
              </h3>
              <p className="text-[11px] font-mono text-zinc-400">
                Toko: <span className="text-zinc-200 font-bold">{shop.name}</span> (#{shop.id.slice(0, 8)})
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs font-mono rounded">
              {error}
            </div>
          )}

          {/* Action Type Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
              Pilihan Tindakan Operasional
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAction('DISPENSASI')}
                className={`p-2.5 rounded border text-xs font-bold transition-all text-left flex flex-col justify-between h-18 ${
                  action === 'DISPENSASI'
                    ? 'bg-amber-950/40 border-amber-500 text-amber-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <span className="font-mono text-[10px] text-amber-500 font-extrabold">[ DISPENSASI ]</span>
                <span className="text-[11px]">Beri Masa Tenggang</span>
              </button>

              <button
                type="button"
                onClick={() => setAction('CHOKEHOLD')}
                className={`p-2.5 rounded border text-xs font-bold transition-all text-left flex flex-col justify-between h-18 ${
                  action === 'CHOKEHOLD'
                    ? 'bg-red-950/60 border-[#E30022] text-red-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <span className="font-mono text-[10px] text-[#E30022] font-extrabold">[ KUNCI AKSES ]</span>
                <span className="text-[11px]">Enforce Chokehold</span>
              </button>

              <button
                type="button"
                onClick={() => setAction('RELEASE')}
                className={`p-2.5 rounded border text-xs font-bold transition-all text-left flex flex-col justify-between h-18 ${
                  action === 'RELEASE'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <span className="font-mono text-[10px] text-emerald-500 font-extrabold">[ PULIHKAN ]</span>
                <span className="text-[11px]">Buka Kunci Normal</span>
              </button>
            </div>
          </div>

          {/* Conditional: Days selection for Dispensasi */}
          {action === 'DISPENSASI' && (
            <div className="space-y-1.5 bg-zinc-900/50 p-3 rounded border border-zinc-800">
              <label className="text-xs text-zinc-300 font-semibold block">
                Durasi Tambahan Masa Tenggang (Grace Period):
              </label>
              <div className="flex items-center space-x-2">
                {[1, 3, 5, 7].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    className={`px-3 py-1.5 rounded text-xs font-mono font-bold border transition-colors ${
                      days === d
                        ? 'bg-amber-500 text-black border-amber-400'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    +{d} Hari
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reason Field */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-bold flex justify-between">
              <span>Justifikasi / Alasan (Wajib diisi)</span>
              <span className="text-zinc-500 font-normal">{reason.trim().length}/10 min</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tulis alasan tindakan operasional ini (tercatat di immutable audit ledger)..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded p-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 font-sans resize-none"
            />
          </div>

          {/* Safety Guard for Chokehold */}
          {isChokehold && (
            <div className="space-y-2 bg-red-950/30 border border-red-900/60 p-3 rounded">
              <p className="text-xs text-red-300 font-mono flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-red-400 shrink-0" />
                <span>Ketik <strong>KONFIRMASI</strong> untuk mengunci akses kasir secara instan:</span>
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Ketik KONFIRMASI"
                className="w-full bg-zinc-950 border border-red-800 rounded px-3 py-1.5 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 uppercase"
              />
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3 rounded border border-zinc-700 text-zinc-300 text-xs hover:bg-zinc-900 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!isFormValid || loading}
              className={`h-8 px-4 rounded text-xs font-extrabold flex items-center space-x-1.5 transition-all cursor-pointer ${
                !isFormValid || loading
                  ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                  : isChokehold
                  ? 'bg-[#E30022] hover:bg-red-600 text-white border border-red-400 shadow-[0_0_12px_rgba(227,0,34,0.4)]'
                  : isRelease
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black border border-emerald-400'
                  : 'bg-amber-500 hover:bg-amber-400 text-black border border-amber-400'
              }`}
            >
              <span>{loading ? 'Memproses...' : isChokehold ? 'KUNCI SEKARANG' : isRelease ? 'PULIHKAN AKSES' : 'TERAPKAN DISPENSASI'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
