"use client";

import React, { useState } from 'react';
import { DollarSign, Clock, CheckCircle2, AlertCircle, X, Store } from 'lucide-react';
import { api } from '@/utils/api';

export default function StartShiftModal({
  isOpen,
  onClose,
  onShiftStarted,
  cashierName = 'Kasir',
}) {
  const [startingCash, setStartingCash] = useState('100000');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const presets = [50000, 100000, 200000, 500000];

  const formatRupiah = (num) => `Rp ${Number(num || 0).toLocaleString('id-ID')}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cashVal = parseInt(startingCash, 10);
    if (isNaN(cashVal) || cashVal < 0) {
      setErrorMsg('Modal awal harus berupa angka 0 atau lebih.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const newShift = await api.startShift({
        starting_cash: cashVal,
        notes: notes.trim() || null,
      });
      onShiftStarted(newShift);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memulai shift kasir.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-md bg-white border-2 border-slate-800 rounded-2xl shadow-[8px_8px_0px_#1E293B] overflow-hidden font-sans text-slate-900"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Accent Strip */}
        <div className="bg-[#CCFF00] h-2.5 w-full border-b border-slate-800" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
          aria-label="Tutup"
        >
          <X size={18} />
        </button>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Header */}
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#CCFF00]/40 border border-slate-800 rounded-full font-mono text-[11px] font-black uppercase text-slate-900">
              <Clock size={13} />
              <span>[ BUKA SESI SHIFT KASIR ]</span>
            </div>
            <h3 className="font-heading font-black text-2xl text-slate-900 tracking-tight">
              Mulai Shift Kasir
            </h3>
            <p className="text-xs text-slate-600">
              Halo, <strong className="text-slate-900">{cashierName}</strong>! Masukkan jumlah modal awal uang fisik di dalam laci kasir sebelum melayani pelanggan.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border-2 border-red-500 rounded-xl text-xs font-mono font-bold text-red-700 flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 text-red-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Modal Awal Input */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold uppercase text-slate-700 flex items-center justify-between">
              <span>Modal Awal Laci (Starting Cash)</span>
              <span className="text-[#10B981] font-black">{formatRupiah(startingCash)}</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-sm text-slate-500">
                Rp
              </span>
              <input
                type="number"
                min="0"
                step="1000"
                value={startingCash}
                onChange={(e) => setStartingCash(e.target.value)}
                placeholder="0"
                required
                className="w-full h-12 bg-slate-50 border-2 border-slate-800 focus:border-slate-800 focus:ring-2 focus:ring-[#CCFF00] rounded-xl pl-11 pr-4 font-mono font-bold text-base text-slate-900 outline-none transition-all shadow-[2px_2px_0px_#1E293B]"
              />
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-4 gap-1.5 pt-1 font-mono text-xs">
              {presets.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setStartingCash(amt.toString())}
                  className={`py-1.5 rounded-lg border font-bold transition-all cursor-pointer ${
                    startingCash === amt.toString()
                      ? 'bg-slate-900 text-[#CCFF00] border-slate-800 shadow-[2px_2px_0px_#1E293B]'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-slate-800'
                  }`}
                >
                  {amt >= 1000000 ? `${amt / 1000000} Jt` : `${amt / 1000}k`}
                </button>
              ))}
            </div>
          </div>

          {/* Catatan Sesi */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold uppercase text-slate-700">
              Catatan Sesi (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Termasuk uang receh koin Rp 20.000"
              className="w-full h-10 bg-slate-50 border border-slate-300 focus:border-slate-800 rounded-xl px-3 text-xs font-sans text-slate-900 outline-none transition-all"
            />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-arcade bg-slate-100 hover:bg-slate-200 text-slate-700 border-2 border-slate-300 font-mono text-xs font-bold py-3 rounded-xl transition-all cursor-pointer"
            >
              Nanti Saja
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-arcade bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 border-2 border-slate-800 font-mono text-xs font-black py-3 rounded-xl shadow-[3px_3px_0px_#1E293B] transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <span>Membuka...</span>
              ) : (
                <>
                  <CheckCircle2 size={16} /> Buka Laci Kasir
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
