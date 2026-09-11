"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Lock,
  Coins,
  Receipt,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Printer,
  X,
  User,
  ShieldCheck,
  KeyRound,
  WifiOff,
} from 'lucide-react';
import { api } from '@/utils/api';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { saveOfflineShiftHandover } from '@/utils/posOfflineDb';
import { printReceiptDirect } from '@/utils/escposPrinter';

const DENOM_SPECS = [
  { key: '100k', label: 'Rp 100.000', val: 100000, color: 'text-rose-700 bg-rose-50' },
  { key: '50k', label: 'Rp 50.000', val: 50000, color: 'text-blue-700 bg-blue-50' },
  { key: '20k', label: 'Rp 20.000', val: 20000, color: 'text-emerald-700 bg-emerald-50' },
  { key: '10k', label: 'Rp 10.000', val: 10000, color: 'text-purple-700 bg-purple-50' },
  { key: '5k', label: 'Rp 5.000', val: 5000, color: 'text-amber-700 bg-amber-50' },
  { key: '2k', label: 'Rp 2.000', val: 2000, color: 'text-slate-700 bg-slate-100' },
  { key: '1k', label: 'Rp 1.000', val: 1000, color: 'text-teal-700 bg-teal-50' },
];

export default function CloseShiftModal({
  isOpen,
  onClose,
  activeShift,
  cashiers = [],
  tierFeatures = {},
  onShiftClosed,
  onShiftHandover,
}) {
  const [step, setStep] = useState(1); // 1: Blind Kasir Keluar | 2: Blind Kasir Masuk & Autentikasi
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

  const [manualTotalInput, setManualTotalInput] = useState('');
  const [isManualInput, setIsManualInput] = useState(false);

  // Step 2 States: Kasir Masuk
  const [incomingCashierId, setIncomingCashierId] = useState('');
  const [incomingPin, setIncomingPin] = useState('');
  const [incomingDenominations, setIncomingDenominations] = useState({
    '100k': '',
    '50k': '',
    '20k': '',
    '10k': '',
    '5k': '',
    '2k': '',
    '1k': '',
    coins: '',
  });
  const [isIncomingManual, setIsIncomingManual] = useState(false);
  const [incomingManualTotal, setIncomingManualTotal] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [closeSuccess, setCloseSuccess] = useState(false);
  const [isOfflineHandover, setIsOfflineHandover] = useState(false);
  const [closedSlipData, setClosedSlipData] = useState(null);

  const modalRef = useRef(null);

  useFocusTrap(modalRef, isOpen, {
    onEscape: onClose,
    stepDependencies: [step, closeSuccess],
  });

  // Hitung total fisik Kasir Keluar
  const countedDenomTotal = useMemo(() => {
    let sum = 0;
    DENOM_SPECS.forEach((spec) => {
      const count = parseInt(denominations[spec.key], 10) || 0;
      sum += count * spec.val;
    });
    const coinAmt = parseInt(denominations.coins, 10) || 0;
    sum += coinAmt;
    return sum;
  }, [denominations]);

  const totalOutgoingCash = isManualInput
    ? parseInt(manualTotalInput, 10) || 0
    : countedDenomTotal;

  // Hitung total fisik Kasir Masuk
  const countedIncomingDenomTotal = useMemo(() => {
    let sum = 0;
    DENOM_SPECS.forEach((spec) => {
      const count = parseInt(incomingDenominations[spec.key], 10) || 0;
      sum += count * spec.val;
    });
    const coinAmt = parseInt(incomingDenominations.coins, 10) || 0;
    sum += coinAmt;
    return sum;
  }, [incomingDenominations]);

  const totalIncomingCash = isIncomingManual
    ? parseInt(incomingManualTotal, 10) || 0
    : countedIncomingDenomTotal;

  // Daftar kasir yang memenuhi syarat (exclude kasir saat ini jika ada pilihan lain)
  const availableCashiers = useMemo(() => {
    if (!Array.isArray(cashiers) || cashiers.length === 0) return [];
    return cashiers;
  }, [cashiers]);

  // Hitung fallback kasir masuk otomatis tanpa cascading render
  const defaultIncomingCashierId = useMemo(() => {
    if (!availableCashiers.length) return '';
    const otherCashier = availableCashiers.find(
      (c) => c.id !== activeShift?.cashier?.id && c.id !== activeShift?.cashier_id
    );
    return otherCashier ? otherCashier.id : availableCashiers[0].id;
  }, [availableCashiers, activeShift]);

  const effectiveIncomingCashierId = incomingCashierId || defaultIncomingCashierId;


  if (!isOpen) return null;

  const formatRupiah = (num) => `Rp ${Number(num || 0).toLocaleString('id-ID')}`;

  const handleDenomChange = (key, val, isIncoming = false) => {
    const clean = val.replace(/\D/g, '');
    if (isIncoming) {
      setIncomingDenominations((prev) => ({ ...prev, [key]: clean }));
    } else {
      setDenominations((prev) => ({ ...prev, [key]: clean }));
    }
  };

  const handleQuickAdd = (key, inc = 1, isIncoming = false) => {
    if (isIncoming) {
      setIncomingDenominations((prev) => {
        const current = parseInt(prev[key] || 0, 10);
        return { ...prev, [key]: (current + inc).toString() };
      });
    } else {
      setDenominations((prev) => {
        const current = parseInt(prev[key] || 0, 10);
        return { ...prev, [key]: (current + inc).toString() };
      });
    }
  };

  const handleNextToStep2 = () => {
    if (totalOutgoingCash < 0 || isNaN(totalOutgoingCash)) {
      setErrorMsg('Total uang fisik kasir keluar tidak valid.');
      return;
    }
    setErrorMsg('');
    setStep(2);
  };

  // Cetak slip serah terima estafet
  const handlePrintHandoverSlip = (slip) => {
    try {
      const printWin = window.open('', '_blank', 'width=320,height=520');
      if (!printWin) return;

      printWin.document.write(`
        <html>
          <head>
            <title>Slip Serah Terima Shift Kasir</title>
            <style>
              body { font-family: monospace; font-size: 11px; margin: 0; padding: 12px; color: #000; }
              .center { text-align: center; }
              .bold { font-weight: bold; }
              .line { border-top: 1px dashed #000; margin: 6px 0; }
              .row { display: flex; justify-content: space-between; margin: 2px 0; }
              .alert { background: #eee; padding: 4px; border: 1px solid #000; text-align: center; margin: 6px 0; }
            </style>
          </head>
          <body>
            <div class="center bold">${slip.shop_name || '2NDMANAGER WARUNG'}</div>
            <div class="center bold">SLIP SERAH TERIMA SHIFT (ESTAFET)</div>
            ${slip.is_offline ? '<div class="alert bold">[ OFFLINE SHIFT HANDOVER ]</div>' : ''}
            <div class="line"></div>
            <div class="row"><span>Waktu:</span><span>${new Date(slip.handover_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span></div>
            <div class="row"><span>Kasir Keluar:</span><span class="bold">${slip.outgoing_cashier_name}</span></div>
            <div class="row"><span>Kasir Pengganti:</span><span class="bold">${slip.incoming_cashier_name}</span></div>
            <div class="line"></div>
            <div class="row"><span>Fisik Kasir Keluar:</span><span class="bold">${formatRupiah(slip.outgoing_cash_count)}</span></div>
            <div class="row"><span>Fisik Kasir Masuk:</span><span class="bold">${formatRupiah(slip.incoming_cash_count)}</span></div>
            <div class="line"></div>
            <div class="row bold"><span>Selisih Serah Terima:</span><span>${formatRupiah(Math.abs(slip.diff_handoff || 0))}</span></div>
            ${slip.notes ? `<div class="row"><span>Catatan:</span><span>${slip.notes}</span></div>` : ''}
            <div class="line"></div>
            <div class="center" style="font-size: 9px; margin-top: 8px;">
              Dicatat pada ${new Date().toLocaleDateString('id-ID')} - Double-Blind Anti-Theft Protocol
            </div>
          </body>
        </html>
      `);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        printWin.print();
        printWin.close();
      }, 250);
    } catch (e) {
      console.warn('[Print Handover Error]', e);
    }
  };

  // Eksekusi Serah Terima Shift Estafet
  const handleExecuteHandover = async () => {
    const finalIncomingCashierId = incomingCashierId || effectiveIncomingCashierId;
    if (!finalIncomingCashierId) {
      setErrorMsg('Pilih kasir pengganti yang menerima laci.');
      return;
    }
    if (totalIncomingCash < 0 || isNaN(totalIncomingCash)) {
      setErrorMsg('Nominal modal awal kasir masuk tidak valid.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const targetCashier = availableCashiers.find((c) => c.id === finalIncomingCashierId);
    const incomingName = targetCashier?.username || targetCashier?.full_name || 'Kasir Pengganti';

    const payload = {
      shift_id: activeShift?.id,
      outgoing_cash_count: totalOutgoingCash,
      incoming_cash_count: totalIncomingCash,
      incoming_cashier_id: finalIncomingCashierId,
      incoming_pin: incomingPin.trim() || null,
      notes: notes.trim() || null,
    };

    // ── Jalur A: Offline Fail-Safe Handover (Patch #2) ─────────────────────────
    if (typeof window !== 'undefined' && !navigator.onLine) {
      try {
        const offlineRecord = await saveOfflineShiftHandover(payload);
        const slipData = {
          shop_name: '2ndManager Warung',
          outgoing_cashier_name: activeShift?.cashier?.username || 'Kasir Keluar',
          incoming_cashier_name: incomingName,
          handover_time: new Date().toISOString(),
          outgoing_cash_count: totalOutgoingCash,
          incoming_cash_count: totalIncomingCash,
          diff_handoff: totalOutgoingCash - totalIncomingCash,
          is_offline: true,
          notes: notes.trim() || null,
        };

        setIsOfflineHandover(true);
        setClosedSlipData(slipData);
        setCloseSuccess(true);
        handlePrintHandoverSlip(slipData);

        // Buat shift lokal sementara agar POS tetap berjalan lancar
        const syntheticNewShift = {
          id: offlineRecord?.id || `local_shift_${Date.now()}`,
          shift_number: (activeShift?.shift_number || 1) + 1,
          starting_cash: totalIncomingCash,
          start_time: new Date().toISOString(),
          cashier_id: incomingCashierId,
          cashier: targetCashier,
          status: 'OPEN',
          is_offline_pending: true,
        };

        if (onShiftHandover) {
          onShiftHandover(syntheticNewShift, targetCashier, slipData);
        } else if (onShiftClosed) {
          onShiftClosed(slipData);
        }
        return;
      } catch (offErr) {
        console.error('[Offline Handover Store Error]', offErr);
        setErrorMsg('Gagal menyimpan serah terima offline.');
        setLoading(false);
        return;
      }
    }

    // ── Jalur B: Online API Handover ───────────────────────────────────────────
    try {
      const res = await api.handoverShift(payload);

      const slipData = res?.print_slip || {
        shop_name: '2ndManager Warung',
        outgoing_cashier_name: activeShift?.cashier?.username || 'Kasir Keluar',
        incoming_cashier_name: incomingName,
        handover_time: new Date().toISOString(),
        outgoing_cash_count: totalOutgoingCash,
        incoming_cash_count: totalIncomingCash,
        diff_handoff: res?.diff_handoff || (totalOutgoingCash - totalIncomingCash),
        is_offline: false,
        notes: notes.trim() || null,
      };

      setClosedSlipData(slipData);
      setCloseSuccess(true);
      handlePrintHandoverSlip(slipData);

      const newShiftObj = {
        id: res?.new_shift_id,
        shift_number: res?.new_shift_number,
        starting_cash: totalIncomingCash,
        start_time: new Date().toISOString(),
        cashier_id: incomingCashierId,
        cashier: targetCashier,
        status: 'OPEN',
      };

      if (onShiftHandover) {
        onShiftHandover(newShiftObj, targetCashier, slipData);
      } else if (onShiftClosed) {
        onShiftClosed(res);
      }
    } catch (err) {
      console.warn('[Online Handover Failed -> Fallback to Offline]', err);
      // Fallback otomatis ke IndexedDB jika request jaringan gagal
      try {
        const offlineRecord = await saveOfflineShiftHandover(payload);
        const slipData = {
          shop_name: '2ndManager Warung',
          outgoing_cashier_name: activeShift?.cashier?.username || 'Kasir Keluar',
          incoming_cashier_name: incomingName,
          handover_time: new Date().toISOString(),
          outgoing_cash_count: totalOutgoingCash,
          incoming_cash_count: totalIncomingCash,
          diff_handoff: totalOutgoingCash - totalIncomingCash,
          is_offline: true,
          notes: notes.trim() || null,
        };

        setIsOfflineHandover(true);
        setClosedSlipData(slipData);
        setCloseSuccess(true);
        handlePrintHandoverSlip(slipData);

        const syntheticNewShift = {
          id: offlineRecord?.id || `local_shift_${Date.now()}`,
          shift_number: (activeShift?.shift_number || 1) + 1,
          starting_cash: totalIncomingCash,
          start_time: new Date().toISOString(),
          cashier_id: incomingCashierId,
          cashier: targetCashier,
          status: 'OPEN',
          is_offline_pending: true,
        };

        if (onShiftHandover) {
          onShiftHandover(syntheticNewShift, targetCashier, slipData);
        } else if (onShiftClosed) {
          onShiftClosed(slipData);
        }
      } catch {
        setErrorMsg(err.message || 'Gagal serah terima shift.');
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div
        ref={modalRef}
        className="relative w-full max-w-lg bg-white border-2 border-slate-800 rounded-2xl shadow-[8px_8px_0px_#1E293B] overflow-hidden font-sans text-slate-900"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Strip */}
        <div className="bg-amber-400 h-2.5 w-full border-b border-slate-800" />

        {/* Close Button */}
        {!closeSuccess && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        )}

        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 border border-amber-300 rounded-xl text-amber-900">
              <Lock size={24} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-black text-lg text-slate-900 uppercase tracking-tight">
                  Serah Terima Shift Estafet
                </h3>
                <span className="text-[10px] font-mono bg-slate-900 text-[#CCFF00] font-bold px-2 py-0.5 rounded">
                  Double-Blind
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {step === 1
                  ? 'Langkah 1: Kasir Keluar menghitung uang fisik laci'
                  : 'Langkah 2: Kasir Masuk memverifikasi modal awal'}
              </p>
            </div>
          </div>

          {/* Stepper Indicator */}
          {!closeSuccess && (
            <div className="flex items-center justify-between bg-slate-50 p-2 border-2 border-slate-200 rounded-xl">
              <div className={`flex items-center gap-2 text-xs font-mono font-bold ${step === 1 ? 'text-amber-700' : 'text-slate-400'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 1 ? 'bg-amber-400 text-slate-900' : 'bg-slate-200 text-slate-600'}`}>
                  1
                </span>
                Kasir Keluar
              </div>
              <div className="h-0.5 w-8 bg-slate-300" />
              <div className={`flex items-center gap-2 text-xs font-mono font-bold ${step === 2 ? 'text-amber-700' : 'text-slate-400'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? 'bg-amber-400 text-slate-900' : 'bg-slate-200 text-slate-600'}`}>
                  2
                </span>
                Kasir Pengganti
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs flex items-center gap-2 font-mono">
              <AlertTriangle size={16} className="text-rose-600 shrink-0" strokeWidth={2.5} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ── SUKSES STATE ────────────────────────────────────────── */}
          {closeSuccess ? (
            <div className="py-6 text-center space-y-4 font-mono">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500">
                <CheckCircle2 size={32} strokeWidth={2.5} />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900 uppercase">
                  Serah Terima Berhasil Disimpan
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  {isOfflineHandover
                    ? 'Tersimpan di penyimpanan lokal offline. Otomatis sinkron saat online.'
                    : 'Shift kasir telah beralih in-place tanpa memutus operasional POS.'}
                </p>
              </div>

              {isOfflineHandover && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-xs font-bold">
                  <WifiOff size={14} strokeWidth={2.5} />
                  <span>[OFFLINE SHIFT HANDOVER]</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1 text-left">
                <div className="flex justify-between">
                  <span className="text-slate-500">Kasir Keluar:</span>
                  <span className="font-bold">{closedSlipData?.outgoing_cashier_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kasir Pengganti:</span>
                  <span className="font-bold">{closedSlipData?.incoming_cashier_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fisik Kasir Masuk:</span>
                  <span className="font-bold text-emerald-700">{formatRupiah(closedSlipData?.incoming_cash_count)}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handlePrintHandoverSlip(closedSlipData)}
                  className="flex-1 h-12 bg-slate-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Printer size={16} strokeWidth={2.5} />
                  <span>Cetak Ulang Slip</span>
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 h-12 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs hover:bg-emerald-400 transition-colors cursor-pointer"
                >
                  Lanjut Transaksi POS
                </button>
              </div>
            </div>
          ) : step === 1 ? (
            /* ── LANGKAH 1: KASIR KELUAR ───────────────────────────── */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-600 font-bold">Pecahan Uang Fisik Laci:</span>
                <button
                  type="button"
                  onClick={() => setIsManualInput(!isManualInput)}
                  className="text-amber-700 hover:underline font-bold cursor-pointer"
                >
                  {isManualInput ? 'Mode Per Pecahan' : 'Mode Input Manual'}
                </button>
              </div>

              {isManualInput ? (
                <div className="space-y-1.5 font-mono">
                  <label className="text-xs font-bold text-slate-700">Total Uang Fisik (Rp)</label>
                  <input
                    type="text"
                    value={manualTotalInput}
                    onChange={(e) => setManualTotalInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="Contoh: 500000"
                    className="w-full h-12 px-3 border-2 border-slate-800 rounded-xl text-base font-bold text-slate-900 bg-slate-50 focus:ring-2 focus:ring-amber-400 outline-none"
                    autoFocus
                  />
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1 font-mono">
                  {DENOM_SPECS.map((spec) => (
                    <div
                      key={spec.key}
                      className="flex items-center justify-between p-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                    >
                      <span className={`font-bold px-2 py-0.5 rounded ${spec.color}`}>
                        {spec.label}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleQuickAdd(spec.key, 1, false)}
                          className="w-7 h-7 bg-white border border-slate-300 rounded-lg text-slate-800 font-bold hover:bg-slate-100 cursor-pointer"
                        >
                          +1
                        </button>
                        <input
                          type="text"
                          value={denominations[spec.key]}
                          onChange={(e) => handleDenomChange(spec.key, e.target.value, false)}
                          placeholder="0"
                          className="w-16 h-7 px-2 border border-slate-300 rounded-lg text-center font-bold bg-white text-slate-900"
                        />
                      </div>
                    </div>
                  ))}
                  {/* Koin */}
                  <div className="flex items-center justify-between p-2 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                    <span className="font-bold px-2 py-0.5 rounded text-slate-700 bg-slate-200">
                      Total Receh / Koin
                    </span>
                    <input
                      type="text"
                      value={denominations.coins}
                      onChange={(e) => handleDenomChange('coins', e.target.value, false)}
                      placeholder="Rp 0"
                      className="w-28 h-7 px-2 border border-slate-300 rounded-lg text-right font-bold bg-white text-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* Total Card */}
              <div className="p-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-between font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Total Fisik Terhitung:</span>
                  <span className="text-base font-black text-[#CCFF00]">
                    {formatRupiah(totalOutgoingCash)}
                  </span>
                </div>
                <Coins size={20} className="text-amber-400" strokeWidth={2.5} />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-12 border-2 border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleNextToStep2}
                  className="flex-1 h-12 bg-amber-400 border-2 border-slate-900 rounded-xl font-mono text-xs font-black text-slate-950 flex items-center justify-center gap-2 hover:bg-amber-300 shadow-[2px_2px_0px_#0F172A] transition-all cursor-pointer"
                >
                  <span>Lanjut Kasir Pengganti</span>
                  <ArrowRight size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          ) : (
            /* ── LANGKAH 2: KASIR PENGGANTI ─────────────────────────── */
            <div className="space-y-4 font-mono">
              {/* Pilih Kasir Masuk */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <User size={14} strokeWidth={2.5} />
                  <span>Kasir Pengganti (Menerima Laci)</span>
                </label>
                <select
                  value={effectiveIncomingCashierId}
                  onChange={(e) => setIncomingCashierId(e.target.value)}
                  className="w-full h-11 px-3 border-2 border-slate-800 rounded-xl text-xs font-bold bg-slate-50 text-slate-900 focus:ring-2 focus:ring-amber-400 outline-none cursor-pointer"
                >
                  {availableCashiers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.username || c.full_name || 'Kasir'} ({c.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* PIN Kasir Masuk */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <KeyRound size={14} strokeWidth={2.5} />
                  <span>PIN Kasir Pengganti (6 Digit)</span>
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={incomingPin}
                  onChange={(e) => setIncomingPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Masukkan 6 angka PIN"
                  className="w-full h-11 px-3 border-2 border-slate-800 rounded-xl text-center text-sm font-bold tracking-widest bg-slate-50 text-slate-900 focus:ring-2 focus:ring-amber-400 outline-none"
                />
              </div>

              {/* Hitungan Buta Modal Awal Diterima */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Modal Fisik Diterima Kasir Pengganti:</span>
                </div>
                <input
                  type="text"
                  value={incomingManualTotal}
                  onChange={(e) => setIncomingManualTotal(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ketik total uang fisik yang diterima kasir masuk"
                  className="w-full h-11 px-3 border-2 border-slate-800 rounded-xl text-xs font-bold bg-slate-50 text-slate-900 focus:ring-2 focus:ring-amber-400 outline-none"
                />
              </div>

              {/* Catatan Serah Terima */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Catatan Estafet (Opsional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Laci pas, titip uang kembalian 20k"
                  className="w-full h-10 px-3 border border-slate-300 rounded-xl text-xs bg-slate-50 text-slate-900 focus:ring-2 focus:ring-amber-400 outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="w-24 h-12 border-2 border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ArrowLeft size={14} strokeWidth={2.5} />
                  <span>Kembali</span>
                </button>
                <button
                  type="button"
                  onClick={handleExecuteHandover}
                  disabled={loading}
                  className="flex-1 h-12 bg-slate-900 border-2 border-slate-900 text-[#CCFF00] rounded-xl font-mono text-xs font-black flex items-center justify-center gap-2 hover:bg-slate-800 shadow-[2px_2px_0px_#E2E8F0] transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <span>Memproses Estafet...</span>
                  ) : (
                    <>
                      <ShieldCheck size={16} strokeWidth={2.5} />
                      <span>Kunci &amp; Buka Shift Baru</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
