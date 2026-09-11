"use client";

import React, { useState, useMemo, useRef } from 'react';
import { Clock, CheckCircle2, AlertCircle, X, Coins, Sparkles, Monitor } from 'lucide-react';
import { api } from '@/utils/api';
import { getRegisterId } from '@/utils/terminalConfig';
import { useFocusTrap } from '@/hooks/useFocusTrap';

const DENOM_SPECS = [
  { key: '100k', label: 'Rp 100.000', val: 100000, color: 'text-rose-700 bg-rose-50' },
  { key: '50k', label: 'Rp 50.000', val: 50000, color: 'text-blue-700 bg-blue-50' },
  { key: '20k', label: 'Rp 20.000', val: 20000, color: 'text-emerald-700 bg-emerald-50' },
  { key: '10k', label: 'Rp 10.000', val: 10000, color: 'text-purple-700 bg-purple-50' },
  { key: '5k', label: 'Rp 5.000', val: 5000, color: 'text-amber-700 bg-amber-50' },
  { key: '2k', label: 'Rp 2.000', val: 2000, color: 'text-slate-700 bg-slate-100' },
  { key: '1k', label: 'Rp 1.000', val: 1000, color: 'text-teal-700 bg-teal-50' },
];

export default function StartShiftModal({
  isOpen,
  onClose,
  onShiftStarted,
  cashierName = 'Kasir',
}) {
  const [activeTab, setActiveTab] = useState('QUICK'); // 'QUICK' | 'DENOM'
  const [startingCash, setStartingCash] = useState('100000');
  const [denominations, setDenominations] = useState({
    '100k': '',
    '50k': '',
    '20k': '',
    '10k': '',
    '5k': '',
    '2k': '',
    '1k': '',
    coins: '',
  });

  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const modalRef = useRef(null);

  useFocusTrap(modalRef, isOpen, {
    onEscape: onClose,
    stepDependencies: [activeTab],
  });

  const registerId = typeof window !== 'undefined' ? getRegisterId() : 'REGISTER_MAIN';

  // Hitung total fisik dari tab pecahan
  const calculatedDenomTotal = useMemo(() => {
    let sum = 0;
    DENOM_SPECS.forEach((s) => {
      const count = parseInt(denominations[s.key], 10) || 0;
      sum += count * s.val;
    });
    const coins = parseInt(denominations.coins, 10) || 0;
    sum += coins;
    return sum;
  }, [denominations]);

  if (!isOpen) return null;

  const presets = [50000, 100000, 200000, 500000];
  const formatRupiah = (num) => `Rp ${Number(num || 0).toLocaleString('id-ID')}`;

  const finalCashValue = activeTab === 'DENOM' ? calculatedDenomTotal : (parseInt(startingCash, 10) || 0);

  const handleDenomChange = (key, val) => {
    const clean = val.replace(/\D/g, '');
    setDenominations((prev) => ({ ...prev, [key]: clean }));
  };

  const handleQuickAddDenom = (key, inc = 1) => {
    setDenominations((prev) => {
      const curr = parseInt(prev[key] || 0, 10);
      return { ...prev, [key]: (curr + inc).toString() };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (finalCashValue < 0 || isNaN(finalCashValue)) {
      setErrorMsg('Modal awal laci harus berupa angka positif.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        starting_cash: finalCashValue,
        register_id: registerId,
        denominations: activeTab === 'DENOM' ? denominations : {},
        notes: notes.trim() || null,
      };

      const res = await api.startShift(payload);
      if (onShiftStarted) {
        onShiftStarted(res);
      }
      onClose();

      // Kembalikan fokus ke pencarian / barcode scanner
      setTimeout(() => {
        const searchInput = document.getElementById('pos-barcode-input') || document.querySelector('input[placeholder*="barcode"], input[placeholder*="Cari"]');
        if (searchInput) searchInput.focus();
      }, 100);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memulai shift kasir.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        ref={modalRef}
        className="relative w-full max-w-lg bg-white border-2 border-slate-800 rounded-2xl shadow-[8px_8px_0px_#1E293B] overflow-hidden font-sans text-slate-900"
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
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#CCFF00]/40 border border-slate-800 rounded-full font-mono text-[11px] font-black uppercase text-slate-900">
                <Clock size={13} />
                <span>[ PROTOKOL BLIND START SHIFT ]</span>
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-900 text-[#CCFF00] border border-slate-800 rounded font-mono text-[10px] font-black uppercase">
                <Monitor size={11} />
                <span>{registerId}</span>
              </div>
            </div>
            <h3 className="font-heading font-black text-2xl text-slate-900 tracking-tight">
              Buka Laci &amp; Mulai Shift
            </h3>
            <p className="text-xs text-slate-600">
              Halo, <strong className="text-slate-900">{cashierName}</strong>! Hitung uang kas fisik yang ada di dalam laci kasir secara mandiri sebelum melayani transaksi.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border-2 border-red-500 rounded-xl text-xs font-mono font-bold text-red-700 flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 text-red-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 gap-2 border-b-2 border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('QUICK')}
              className={`py-2 px-3 rounded-xl font-mono text-xs font-black uppercase transition-all border-2 border-slate-800 cursor-pointer ${
                activeTab === 'QUICK'
                  ? 'bg-slate-900 text-[#CCFF00] shadow-[2px_2px_0px_#1E293B]'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              Input Cepat Rupiah
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('DENOM')}
              className={`py-2 px-3 rounded-xl font-mono text-xs font-black uppercase transition-all border-2 border-slate-800 flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'DENOM'
                  ? 'bg-slate-900 text-[#CCFF00] shadow-[2px_2px_0px_#1E293B]'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Coins size={14} /> Hitung Lembaran
            </button>
          </div>

          {activeTab === 'QUICK' ? (
            /* Tab 1: Input Cepat */
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold uppercase text-slate-700 flex items-center justify-between">
                  <span>Modal Awal Fisik Laci</span>
                  <span className="text-emerald-700 font-black">{formatRupiah(startingCash)}</span>
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
                      className={`py-2 rounded-lg border-2 font-bold transition-all cursor-pointer ${
                        startingCash === amt.toString()
                          ? 'bg-slate-900 text-[#CCFF00] border-slate-800 shadow-[2px_2px_0px_#1E293B]'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-slate-800'
                      }`}
                    >
                      {amt >= 1000000 ? `${amt / 1000000} Jt` : `+${amt / 1000}k`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Tab 2: Kalkulator Denominasi Fisik */
            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
              <div className="p-3 bg-slate-900 text-[#CCFF00] rounded-xl border-2 border-slate-800 flex justify-between items-center font-mono">
                <span className="text-xs font-bold uppercase">Total Hasil Hitungan:</span>
                <span className="text-base font-black">{formatRupiah(calculatedDenomTotal)}</span>
              </div>

              <div className="space-y-1.5">
                {DENOM_SPECS.map((spec) => (
                  <div
                    key={spec.key}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-black ${spec.color}`}>
                        {spec.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleQuickAddDenom(spec.key, 1)}
                        className="px-2 py-1 bg-white border border-slate-300 hover:border-slate-800 rounded font-mono text-xs font-bold cursor-pointer"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickAddDenom(spec.key, 5)}
                        className="px-2 py-1 bg-white border border-slate-300 hover:border-slate-800 rounded font-mono text-xs font-bold cursor-pointer"
                      >
                        +5
                      </button>
                      <input
                        type="text"
                        value={denominations[spec.key]}
                        onChange={(e) => handleDenomChange(spec.key, e.target.value)}
                        placeholder="0"
                        className="w-16 h-8 text-center bg-white border border-slate-300 rounded font-mono text-xs font-bold text-slate-900 outline-none focus:border-slate-800"
                      />
                      <span className="text-[10px] font-mono text-slate-500">lbr</span>
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-black text-slate-700 bg-slate-100">
                    Total Koin/Receh
                  </span>
                  <div className="relative w-36">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-400">Rp</span>
                    <input
                      type="text"
                      value={denominations.coins}
                      onChange={(e) => handleDenomChange('coins', e.target.value)}
                      placeholder="0"
                      className="w-full h-8 pl-8 pr-2 bg-white border border-slate-300 rounded font-mono text-xs font-bold text-slate-900 outline-none focus:border-slate-800 text-right"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Catatan Sesi */}
          <div className="space-y-1">
            <label className="text-xs font-mono font-bold uppercase text-slate-700">
              Catatan Sesi (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Kondisi laci rapi, uang kembalian koin cukup"
              className="w-full h-10 bg-slate-50 border-2 border-slate-300 focus:border-slate-800 rounded-xl px-3 text-xs font-sans text-slate-900 outline-none transition-all"
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
              className="btn-arcade bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 border-2 border-slate-800 font-mono text-xs font-black py-3 rounded-xl shadow-[3px_3px_0px_#1E293B] transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <span>Membuka Shift...</span>
              ) : (
                <>
                  <CheckCircle2 size={16} /> Buka Shift &amp; Masuk POS
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
