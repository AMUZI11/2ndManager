"use client";

import React, { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, DollarSign, X, Check, AlertCircle } from 'lucide-react';
import { api } from '@/utils/api';

export default function CashDrawerMovementModal({
  isOpen,
  onClose,
  activeShift,
  onMovementAdded,
}) {
  const [movementType, setMovementType] = useState('CASH_OUT'); // 'CASH_OUT' | 'CASH_IN'
  const [category, setCategory] = useState('OPERATIONAL');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const formatRupiah = (num) => `Rp ${Number(num || 0).toLocaleString('id-ID')}`;

  const categories = {
    CASH_OUT: [
      { id: 'OPERATIONAL', label: 'Operasional Toko (Es, Kresek, dll)' },
      { id: 'EXPENSE', label: 'Biaya Pengeluaran Lain' },
      { id: 'OWNER_DRAW', label: 'Ambilan Pemilik Toko (Prive)' },
      { id: 'OTHER', label: 'Lainnya' },
    ],
    CASH_IN: [
      { id: 'TOPUP', label: 'Tambah Modal Uang Kembalian / Receh' },
      { id: 'OPERATIONAL', label: 'Setoran Kas Masuk' },
      { id: 'OTHER', label: 'Lainnya' },
    ],
  };

  const quickAmounts = [5000, 10000, 20000, 50000, 100000];

  const handleAddAmount = (addVal) => {
    const curr = parseInt(amount || '0', 10);
    setAmount((curr + addVal).toString());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsedAmt = parseInt(amount, 10);
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      setErrorMsg('Nominal uang harus lebih dari 0.');
      return;
    }
    if (!notes.trim()) {
      setErrorMsg('Keterangan / alasan mutasi wajib diisi.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.addCashDrawerMovement({
        shift_id: activeShift?.id || null,
        movement_type: movementType,
        category,
        amount: parsedAmt,
        notes: notes.trim(),
      });

      if (onMovementAdded) {
        onMovementAdded(res);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Gagal mencatat mutasi laci.');
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
        <div
          className={`h-2.5 w-full border-b border-slate-800 ${
            movementType === 'CASH_OUT' ? 'bg-amber-400' : 'bg-[#CCFF00]'
          }`}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
          aria-label="Tutup"
        >
          <X size={18} />
        </button>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* Header */}
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-300 rounded-full font-mono text-[11px] font-black uppercase text-slate-800">
              <DollarSign size={13} />
              <span>[ ARUS KAS LACI OPERASIONAL ]</span>
            </div>
            <h3 className="font-heading font-black text-xl text-slate-900 tracking-tight">
              Catat Uang Masuk / Keluar Laci
            </h3>
            <p className="text-xs text-slate-600">
              Catat setiap uang yang diambil atau ditambahkan ke laci kasir agar perhitungan tutup shift akurat.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border-2 border-red-500 rounded-xl text-xs font-mono font-bold text-red-700 flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 text-red-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Type Selector (CASH_OUT vs CASH_IN) */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-300 font-mono text-xs">
            <button
              type="button"
              onClick={() => {
                setMovementType('CASH_OUT');
                setCategory('OPERATIONAL');
              }}
              className={`py-2 rounded-lg font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                movementType === 'CASH_OUT'
                  ? 'bg-amber-400 text-slate-950 border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight size={15} /> Kas Keluar (-)
            </button>
            <button
              type="button"
              onClick={() => {
                setMovementType('CASH_IN');
                setCategory('TOPUP');
              }}
              className={`py-2 rounded-lg font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                movementType === 'CASH_IN'
                  ? 'bg-[#CCFF00] text-slate-950 border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft size={15} /> Kas Masuk (+)
            </button>
          </div>

          {/* Nominal Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold uppercase text-slate-700 flex items-center justify-between">
              <span>Nominal Uang</span>
              <span className="text-slate-900 font-black">{formatRupiah(amount)}</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-sm text-slate-500">
                Rp
              </span>
              <input
                type="number"
                min="500"
                step="500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                required
                className="w-full h-11 bg-slate-50 border-2 border-slate-800 focus:border-slate-800 focus:ring-2 focus:ring-[#CCFF00] rounded-xl pl-11 pr-4 font-mono font-black text-sm text-slate-900 outline-none transition-all shadow-[2px_2px_0px_#1E293B]"
              />
            </div>

            {/* Quick add chips */}
            <div className="flex flex-wrap gap-1.5 pt-1 font-mono text-[11px]">
              {quickAmounts.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleAddAmount(q)}
                  className="px-2 py-1 bg-white border border-slate-300 hover:border-slate-800 rounded-lg text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  +{q >= 1000 ? `${q / 1000}k` : q}
                </button>
              ))}
            </div>
          </div>

          {/* Kategori */}
          <div className="space-y-1">
            <label className="text-xs font-mono font-bold uppercase text-slate-700">
              Kategori Mutasi
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-10 bg-slate-50 border border-slate-300 focus:border-slate-800 rounded-xl px-3 text-xs font-sans text-slate-800 outline-none"
            >
              {categories[movementType].map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Alasan / Keterangan */}
          <div className="space-y-1">
            <label className="text-xs font-mono font-bold uppercase text-slate-700">
              Keterangan / Alasan (Wajib)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Misal: Beli es batu kristal 2 bungkus"
              required
              className="w-full h-10 bg-slate-50 border border-slate-300 focus:border-slate-800 rounded-xl px-3 text-xs font-sans text-slate-900 outline-none transition-all"
            />
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-arcade bg-slate-100 hover:bg-slate-200 text-slate-700 border-2 border-slate-300 font-mono text-xs font-bold py-3 rounded-xl transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`btn-arcade font-mono text-xs font-black py-3 rounded-xl border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                movementType === 'CASH_OUT'
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                  : 'bg-[#CCFF00] hover:bg-[#b3e600] text-slate-950'
              }`}
            >
              {loading ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <Check size={16} /> Simpan Catatan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
