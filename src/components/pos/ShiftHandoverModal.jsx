"use client";

import React, { useState, useMemo } from 'react';
import {
  Lock,
  CheckCircle2,
  AlertTriangle,
  Send,
  X,
  Coins,
  Receipt,
  UserCheck,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { api } from '@/utils/api';

export default function ShiftHandoverModal({
  isOpen,
  onClose,
  activeShift,
  cashiers = [],
  tierFeatures = {},
  onShiftClosed,
}) {
  // Pecahan Denominasi Fisik
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

  const [handoverTo, setHandoverTo] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [reconciliationResult, setReconciliationResult] = useState(null);

  const denomSpecs = [
    { key: '100k', label: 'Rp 100.000', val: 100000, color: 'text-red-600 bg-red-50' },
    { key: '50k', label: 'Rp 50.000', val: 50000, color: 'text-blue-600 bg-blue-50' },
    { key: '20k', label: 'Rp 20.000', val: 20000, color: 'text-emerald-700 bg-emerald-50' },
    { key: '10k', label: 'Rp 10.000', val: 10000, color: 'text-purple-600 bg-purple-50' },
    { key: '5k', label: 'Rp 5.000', val: 5000, color: 'text-amber-700 bg-amber-50' },
    { key: '2k', label: 'Rp 2.000', val: 2000, color: 'text-slate-600 bg-slate-100' },
    { key: '1k', label: 'Rp 1.000', val: 1000, color: 'text-teal-700 bg-teal-50' },
  ];

  // Hitung total fisik dari lembaran & koin secara real-time di frontend
  const countedTotal = useMemo(() => {
    let sum = 0;
    denomSpecs.forEach((spec) => {
      const count = parseInt(denominations[spec.key], 10) || 0;
      sum += count * spec.val;
    });
    const coinAmt = parseInt(denominations.coins, 10) || 0;
    sum += coinAmt;
    return sum;
  }, [denominations]);

  if (!isOpen) return null;

  const formatRupiah = (num) => `Rp ${Number(num || 0).toLocaleString('id-ID')}`;

  const handleDenomChange = (key, val) => {
    const clean = val.replace(/\D/g, '');
    setDenominations((prev) => ({ ...prev, [key]: clean }));
  };

  const handleQuickAdd = (key, increment = 1) => {
    setDenominations((prev) => {
      const current = parseInt(prev[key] || 0, 10);
      return { ...prev, [key]: (current + increment).toString() };
    });
  };

  const handleSubmitClose = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      const payload = {
        shift_id: activeShift?.id,
        denominations,
        actual_cash: countedTotal,
        handover_to: handoverTo || null,
        notes: notes.trim() || null,
      };

      const res = await api.closeShift(payload);
      setReconciliationResult(res);
      if (onShiftClosed) {
        onShiftClosed(res);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Gagal menutup shift kasir.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenWhatsApp = (text) => {
    if (!text) return;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div
        className="relative w-full max-w-lg bg-white border-2 border-slate-800 rounded-2xl shadow-[10px_10px_0px_#1E293B] overflow-hidden font-sans text-slate-900 my-4"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Accent Strip */}
        <div className="bg-slate-900 h-2.5 w-full flex">
          <div className="bg-[#CCFF00] w-1/3 h-full" />
          <div className="bg-amber-400 w-1/3 h-full" />
          <div className="bg-red-500 w-1/3 h-full" />
        </div>

        {/* Close Button */}
        {!reconciliationResult && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        )}

        {/* ── STEP 1: INPUT DENOMINASI FISIK (BLIND CLOSING FORM) ── */}
        {!reconciliationResult ? (
          <form onSubmit={handleSubmitClose} className="p-5 sm:p-6 space-y-4">
            {/* Header */}
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-[#CCFF00] border border-slate-800 rounded-full font-mono text-[11px] font-black uppercase">
                <Lock size={12} />
                <span>[ PROTOKOL BLIND CLOSING 60 DETIK ]</span>
              </div>
              <h3 className="font-heading font-black text-xl sm:text-2xl text-slate-900 tracking-tight">
                Serah Terima & Hitung Kas Fisik
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Hitung seluruh lembaran uang & koin di laci kasir secara independen. 
                Sistem tidak menampilkan target kas untuk menjamin integritas audit kasir.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border-2 border-red-500 rounded-xl text-xs font-mono font-bold text-red-700 flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 text-red-600 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Total Fisik Live Counter Banner */}
            <div className="p-3.5 bg-slate-900 text-white rounded-xl border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">
                  Total Kas Fisik Dihitung:
                </span>
                <span className="text-2xl font-heading font-black text-[#CCFF00]">
                  {formatRupiah(countedTotal)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-400 block">Status Shift</span>
                <span className="text-xs font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40">
                  Shift #{activeShift?.shift_number || 1}
                </span>
              </div>
            </div>

            {/* Denomination Inputs Grid */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              <span className="text-[11px] font-mono font-bold uppercase text-slate-500 block">
                Pecahan Lembaran Kertas:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {denomSpecs.map((spec) => (
                  <div
                    key={spec.key}
                    className="flex items-center justify-between bg-slate-50 border border-slate-300 rounded-xl p-2 gap-2"
                  >
                    <div className="flex items-center gap-1.5 min-w-[95px]">
                      <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${spec.color}`}>
                        {spec.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={denominations[spec.key]}
                        onChange={(e) => handleDenomChange(spec.key, e.target.value)}
                        placeholder="0"
                        className="w-14 h-8 bg-white border border-slate-400 focus:border-slate-800 rounded-lg text-center font-mono font-black text-xs text-slate-900 outline-none"
                      />
                      <span className="text-[10px] font-mono text-slate-500">lbr</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Koin & Receh */}
              <div className="pt-1">
                <div className="flex items-center justify-between bg-amber-50 border border-amber-300 rounded-xl p-2.5">
                  <div className="flex items-center gap-1.5">
                    <Coins size={16} className="text-amber-700" />
                    <span className="text-xs font-mono font-bold text-amber-900">
                      Total Koin / Receh (Rp)
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-mono font-bold text-slate-500">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={denominations.coins}
                      onChange={(e) => handleDenomChange('coins', e.target.value)}
                      placeholder="0"
                      className="w-28 h-8 bg-white border border-amber-400 focus:border-slate-800 rounded-lg text-right px-2 font-mono font-black text-xs text-slate-900 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Kasir Penerima & Catatan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-mono font-bold uppercase text-slate-700 flex items-center gap-1">
                  <UserCheck size={13} /> Serah Terima Ke:
                </label>
                <select
                  value={handoverTo}
                  onChange={(e) => setHandoverTo(e.target.value)}
                  className="w-full h-9 bg-slate-50 border border-slate-300 focus:border-slate-800 rounded-xl px-2.5 text-xs font-mono font-bold text-slate-800 outline-none"
                >
                  <option value="">-- Pilih Kasir Pengganti --</option>
                  {cashiers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nama || c.username} ({c.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono font-bold uppercase text-slate-700">
                  Catatan Kasir:
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Keterangan kondisi laci..."
                  className="w-full h-9 bg-slate-50 border border-slate-300 focus:border-slate-800 rounded-xl px-2.5 text-xs font-sans text-slate-800 outline-none"
                />
              </div>
            </div>

            {/* Action Buttons */}
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
                disabled={submitting}
                className="btn-arcade bg-slate-900 hover:bg-slate-800 text-[#CCFF00] border-2 border-slate-800 font-mono text-xs font-black py-3 rounded-xl shadow-[3px_3px_0px_#1E293B] transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <span>Merekonsiliasi...</span>
                ) : (
                  <>
                    <Lock size={15} /> Kunci & Tutup Shift
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* ── STEP 2: HASIL REKONSILIASI KAS LACI (RECONCILIATION AUDIT) ── */
          <div className="p-5 sm:p-6 space-y-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 border border-emerald-600 rounded-full font-mono text-[11px] font-black uppercase text-emerald-900">
                <CheckCircle2 size={13} className="text-emerald-700" />
                <span>[ SHIFT BERHASIL DITUTUP & DIAUDIT ]</span>
              </div>
              <h3 className="font-heading font-black text-xl sm:text-2xl text-slate-900 tracking-tight">
                Hasil Rekonsiliasi Kas Laci
              </h3>
            </div>

            {/* Diff Status Card */}
            {(() => {
              const diff = reconciliationResult.reconciliation?.difference || 0;
              const isPas = diff === 0;
              const isSurplus = diff > 0;

              return (
                <div
                  className={`p-4 rounded-xl border-2 text-center space-y-1 ${
                    isPas
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-950'
                      : isSurplus
                      ? 'bg-blue-50 border-blue-600 text-blue-950'
                      : 'bg-red-50 border-red-600 text-red-950'
                  }`}
                >
                  <div className="font-mono text-xs font-black uppercase tracking-wider">
                    {isPas ? '✅ HASIL: PAS (BALANCE)' : isSurplus ? '🟢 HASIL: SURPLUS (LEBIH)' : '🔴 HASIL: DEFISIT (KURANG)'}
                  </div>
                  <div className="text-3xl font-heading font-black font-mono">
                    {isPas ? 'Rp 0' : `${diff > 0 ? '+' : ''}${formatRupiah(diff)}`}
                  </div>
                  <p className="text-[11px]">
                    {isPas
                      ? 'Uang fisik di laci cocok 100% dengan rekapitulasi sistem.'
                      : isSurplus
                      ? 'Terdapat kelebihan kas fisik di laci toko.'
                      : 'Terdapat kekurangan kas fisik di laci toko (kasir wajib memeriksa nota bon).'}
                  </p>
                </div>
              );
            })()}

            {/* Comprehensive Cash Flow Breakdown */}
            <div className="bg-slate-50 border border-slate-300 rounded-xl p-3.5 space-y-2 text-xs font-mono">
              <div className="text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200 pb-1 flex justify-between">
                <span>Arus Kas Laci Sesi Ini</span>
                <span>Nominal</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Modal Awal Laci:</span>
                <span className="font-bold">{formatRupiah(reconciliationResult.reconciliation?.starting_cash)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>+ Penjualan POS Tunai:</span>
                <span className="font-bold">+{formatRupiah(reconciliationResult.reconciliation?.cash_sales_total)}</span>
              </div>
              {Number(reconciliationResult.reconciliation?.cash_debt_payments_total || 0) > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>+ Pelunasan Kasbon Tunai:</span>
                  <span className="font-bold">+{formatRupiah(reconciliationResult.reconciliation?.cash_debt_payments_total)}</span>
                </div>
              )}
              {Number(reconciliationResult.reconciliation?.cash_savings_deposits_total || 0) > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>+ Deposit Celengan Tunai:</span>
                  <span className="font-bold">+{formatRupiah(reconciliationResult.reconciliation?.cash_savings_deposits_total)}</span>
                </div>
              )}
              {Number(reconciliationResult.reconciliation?.cash_drawer_in_total || 0) > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>+ Kas Masuk Laci Tambahan:</span>
                  <span className="font-bold">+{formatRupiah(reconciliationResult.reconciliation?.cash_drawer_in_total)}</span>
                </div>
              )}
              {Number(reconciliationResult.reconciliation?.cash_drawer_out_total || 0) > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>- Kas Keluar Operasional:</span>
                  <span className="font-bold">-{formatRupiah(reconciliationResult.reconciliation?.cash_drawer_out_total)}</span>
                </div>
              )}
              {Number(reconciliationResult.reconciliation?.cash_consignment_payouts_total || 0) > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>- Pelunasan Konsinyasi Tunai:</span>
                  <span className="font-bold">-{formatRupiah(reconciliationResult.reconciliation?.cash_consignment_payouts_total)}</span>
                </div>
              )}
              <div className="border-t border-slate-300 pt-1.5 flex justify-between font-bold text-slate-900">
                <span>Target Kas Harusnya (Expected):</span>
                <span>{formatRupiah(reconciliationResult.reconciliation?.expected_cash)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900">
                <span>Fisik Kas Dihitung (Actual):</span>
                <span className="text-emerald-700">{formatRupiah(reconciliationResult.reconciliation?.actual_cash)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-1">
              {reconciliationResult.wa_recap_text ? (
                <button
                  type="button"
                  onClick={() => handleOpenWhatsApp(reconciliationResult.wa_recap_text)}
                  className="w-full btn-arcade bg-emerald-600 hover:bg-emerald-500 text-white border-2 border-emerald-800 font-mono text-xs font-black py-3 rounded-xl shadow-[3px_3px_0px_#064E3B] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send size={15} /> Kirim Rekap Shift ke WhatsApp Pemilik
                </button>
              ) : null}

              <button
                type="button"
                onClick={onClose}
                className="w-full btn-arcade bg-slate-900 hover:bg-slate-800 text-white border-2 border-slate-800 font-mono text-xs font-bold py-3 rounded-xl shadow-[2px_2px_0px_#1E293B] transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                Selesai & Tutup Sesi
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
