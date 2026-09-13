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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="w-full max-w-lg bg-white border-3 border-slate-800 shadow-[8px_8px_0px_#1E293B] rounded-2xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className={`p-5 border-b-2 border-slate-800 flex items-center justify-between ${
          isChokehold ? 'bg-rose-50' : isRelease ? 'bg-emerald-50' : 'bg-amber-50'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 border-slate-800 shadow-[2px_2px_0_#1E293B] font-bold ${
              isChokehold 
                ? 'bg-rose-500 text-white' 
                : isRelease
                ? 'bg-emerald-400 text-slate-900'
                : 'bg-amber-400 text-slate-900'
            }`}>
              {isChokehold ? <ShieldAlert size={20} /> : isRelease ? <Check size={20} /> : <Clock size={20} />}
            </div>
            <div>
              <h3 className="font-display font-black text-sm text-slate-900 uppercase tracking-tight">
                Penegakan Tagihan &amp; Chokehold
              </h3>
              <p className="text-[11px] font-mono text-slate-600 font-semibold">
                Toko: <span className="text-slate-900 font-bold">{shop.name}</span> (#{shop.id.slice(0, 8)})
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border-2 border-rose-500 text-rose-900 text-xs font-mono rounded-xl font-bold">
              {error}
            </div>
          )}

          {/* Action Type Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-slate-600 font-black">
              Pilihan Tindakan Operasional
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setAction('DISPENSASI')}
                className={`p-3 rounded-xl border-2 text-xs font-bold transition-all text-left flex flex-col justify-between h-20 cursor-pointer ${
                  action === 'DISPENSASI'
                    ? 'bg-amber-300 border-slate-800 text-slate-900 shadow-[3px_3px_0_#1E293B] -translate-y-0.5'
                    : 'bg-white border-slate-300 text-slate-700 hover:border-slate-800'
                }`}
              >
                <span className="font-mono text-[10px] text-amber-900 font-black">[ DISPENSASI ]</span>
                <span className="text-[11px] leading-tight font-extrabold">Masa Tenggang</span>
              </button>

              <button
                type="button"
                onClick={() => setAction('CHOKEHOLD')}
                className={`p-3 rounded-xl border-2 text-xs font-bold transition-all text-left flex flex-col justify-between h-20 cursor-pointer ${
                  action === 'CHOKEHOLD'
                    ? 'bg-rose-500 border-slate-800 text-white shadow-[3px_3px_0_#1E293B] -translate-y-0.5'
                    : 'bg-white border-slate-300 text-slate-700 hover:border-slate-800'
                }`}
              >
                <span className="font-mono text-[10px] text-rose-200 font-black">[ KUNCI AKSES ]</span>
                <span className="text-[11px] leading-tight font-extrabold">Kunci Toko</span>
              </button>

              <button
                type="button"
                onClick={() => setAction('RELEASE')}
                className={`p-3 rounded-xl border-2 text-xs font-bold transition-all text-left flex flex-col justify-between h-20 cursor-pointer ${
                  action === 'RELEASE'
                    ? 'bg-emerald-400 border-slate-800 text-slate-900 shadow-[3px_3px_0_#1E293B] -translate-y-0.5'
                    : 'bg-white border-slate-300 text-slate-700 hover:border-slate-800'
                }`}
              >
                <span className="font-mono text-[10px] text-emerald-900 font-black">[ PULIHKAN ]</span>
                <span className="text-[11px] leading-tight font-extrabold">Buka Normal</span>
              </button>
            </div>
          </div>

          {/* Conditional: Days selection for Dispensasi */}
          {action === 'DISPENSASI' && (
            <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border-2 border-slate-800 shadow-[2px_2px_0_#1E293B]">
              <label className="text-xs text-slate-800 font-extrabold block font-mono">
                DURASI TAMBAHAN MASA TENGGANG:
              </label>
              <div className="flex items-center space-x-2">
                {[1, 3, 7, 14].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-black border-2 transition-all cursor-pointer ${
                      days === d
                        ? 'bg-amber-400 text-slate-900 border-slate-800 shadow-[2px_2px_0_#1E293B]'
                        : 'bg-white text-slate-700 border-slate-400 hover:border-slate-800'
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
            <label className="text-[11px] font-mono uppercase tracking-wider text-slate-700 font-black flex justify-between">
              <span>Justifikasi / Alasan (Wajib diisi)</span>
              <span className="text-slate-500 font-bold">{reason.trim().length}/10 min</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tulis alasan tindakan operasional ini (tercatat di immutable audit ledger)..."
              className="w-full bg-slate-50 border-2 border-slate-800 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white font-sans resize-none shadow-[2px_2px_0_#1E293B]"
            />
          </div>

          {/* Safety Guard for Chokehold */}
          {isChokehold && (
            <div className="space-y-2 bg-rose-50 border-2 border-rose-400 p-3.5 rounded-xl shadow-[2px_2px_0_#1E293B]">
              <p className="text-xs text-rose-900 font-mono flex items-center gap-1.5 font-bold">
                <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                <span>Ketik <strong>KONFIRMASI</strong> untuk mengunci akses kasir secara instan:</span>
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Ketik KONFIRMASI"
                className="w-full bg-white border-2 border-rose-500 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 placeholder-slate-400 focus:outline-none uppercase"
              />
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t-2 border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-xl border-2 border-slate-800 text-slate-700 bg-white hover:bg-slate-100 font-mono font-bold text-xs cursor-pointer shadow-[2px_2px_0_#1E293B] transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!isFormValid || loading}
              className={`h-10 px-5 rounded-xl text-xs font-mono font-black flex items-center space-x-1.5 transition-all cursor-pointer border-2 border-slate-800 shadow-[3px_3px_0_#1E293B] ${
                !isFormValid || loading
                  ? 'bg-slate-200 text-slate-400 border-slate-400 shadow-none cursor-not-allowed'
                  : isChokehold
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : isRelease
                  ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-900'
                  : 'bg-amber-400 hover:bg-amber-300 text-slate-900'
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
