"use client";

import React, { useState, useMemo, useRef } from 'react';
import {
  Coins,
  Banknote,
  PiggyBank,
  Receipt,
  CheckCircle2,
  X,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { calculateFifoDebtDeduction, formatRupiah } from '@/utils/smartChangeEngine';
import { useFocusTrap } from '@/hooks/useFocusTrap';

export default function SmartChangeModal({
  isOpen,
  onClose,
  totalOmzet = 0,
  cashReceived = 0,
  selectedCustomer = null,
  customerPiutang = 0,
  customerBalance = 0,
  customerDebts = [],
  onConfirmAllocation,
}) {
  const changeAmount = Math.max(0, cashReceived - totalOmzet);

  // Alokasi FIFO kasbon tertua
  const fifoResult = useMemo(() => {
    return calculateFifoDebtDeduction(changeAmount, customerDebts);
  }, [changeAmount, customerDebts]);

  // Pilihan alokasi: 'FIFO_DEBT' (potong kasbon) | 'DEPOSIT' (celengan penuh) | 'CASH' (kembalikan tunai)
  const [allocationMode, setAllocationMode] = useState(() => {
    if (fifoResult.totalDeducted > 0) return 'FIFO_DEBT';
    if (selectedCustomer) return 'DEPOSIT';
    return 'CASH';
  });

  // Opsi penanganan sisa kembalian setelah potong kasbon: 'DEPOSIT' (celengan) atau 'CASH' (tunai)
  const [leftoverAction, setLeftoverAction] = useState('DEPOSIT');

  const modalRef = useRef(null);

  useFocusTrap(modalRef, isOpen, {
    onEscape: onClose,
    stepDependencies: [allocationMode, leftoverAction, changeAmount],
  });

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (allocationMode === 'FIFO_DEBT') {
      onConfirmAllocation({
        type: 'KASBON',
        amount: fifoResult.totalDeducted,
        allocations: fifoResult.allocations,
        leftoverAmount: fifoResult.leftoverChange,
        leftoverAction: fifoResult.leftoverChange > 0 ? leftoverAction : 'NONE',
        customer: selectedCustomer,
      });
    } else if (allocationMode === 'DEPOSIT') {
      onConfirmAllocation({
        type: 'DEPOSIT',
        amount: changeAmount,
        allocations: [],
        leftoverAmount: 0,
        leftoverAction: 'NONE',
        customer: selectedCustomer,
      });
    } else {
      onConfirmAllocation({
        type: 'NONE',
        amount: 0,
        allocations: [],
        leftoverAmount: changeAmount,
        leftoverAction: 'CASH',
        customer: selectedCustomer,
      });
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
        {/* Top Accent */}
        <div className="bg-[#CCFF00] h-2.5 w-full border-b border-slate-800" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
          aria-label="Tutup"
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        <div className="p-6 space-y-5 font-mono">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-lime-100 border border-lime-300 rounded-xl text-slate-900">
              <Coins size={24} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-black text-lg text-slate-900 uppercase tracking-tight">
                  Smart Change Reconciler
                </h3>
                <span className="text-[10px] bg-slate-900 text-[#CCFF00] font-bold px-2 py-0.5 rounded">
                  FIFO Kasbon
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Alokasi kembalian belanja untuk potongan piutang &amp; celengan
              </p>
            </div>
          </div>

          {/* Ringkasan Uang Kembalian */}
          <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B]">
            <div>
              <span className="text-[10px] uppercase text-slate-400 block font-bold">
                Total Kembalian Belanja:
              </span>
              <span className="text-xl font-black text-[#CCFF00]">
                {formatRupiah(changeAmount)}
              </span>
            </div>
            <div className="text-right text-xs">
              <span className="text-slate-400 block">Pelanggan:</span>
              <span className="font-bold text-white">
                {selectedCustomer ? selectedCustomer.nama : 'Umum (Tanpa Akun)'}
              </span>
            </div>
          </div>

          {/* Opsi Alokasi */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            {fifoResult.allocations.length > 0 && (
              <button
                type="button"
                onClick={() => setAllocationMode('FIFO_DEBT')}
                className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  allocationMode === 'FIFO_DEBT'
                    ? 'border-slate-900 bg-amber-50 text-amber-950 font-bold shadow-[2px_2px_0px_#1E293B]'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FileText size={16} className="mb-1 text-amber-600" strokeWidth={2.5} />
                <div className="font-bold">Potong Kasbon</div>
                <div className="text-[10px] text-slate-500">Urut FIFO Tertua</div>
              </button>
            )}

            {selectedCustomer && (
              <button
                type="button"
                onClick={() => setAllocationMode('DEPOSIT')}
                className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  allocationMode === 'DEPOSIT'
                    ? 'border-slate-900 bg-emerald-50 text-emerald-950 font-bold shadow-[2px_2px_0px_#1E293B]'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <PiggyBank size={16} className="mb-1 text-emerald-600" strokeWidth={2.5} />
                <div className="font-bold">Celengan Belanja</div>
                <div className="text-[10px] text-slate-500">Simpan Saldo</div>
              </button>
            )}

            <button
              type="button"
              onClick={() => setAllocationMode('CASH')}
              className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                allocationMode === 'CASH'
                  ? 'border-slate-900 bg-blue-50 text-blue-950 font-bold shadow-[2px_2px_0px_#1E293B]'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Banknote size={16} className="mb-1 text-blue-600" strokeWidth={2.5} />
              <div className="font-bold">Kembalian Fisik</div>
              <div className="text-[10px] text-slate-500">Uang Tunai Pas</div>
            </button>
          </div>

          {/* ── DETAIL MINI-LEDGER (Jika Mode Potong Kasbon Aktif) ───── */}
          {allocationMode === 'FIFO_DEBT' && fifoResult.allocations.length > 0 && (
            <div className="space-y-2 border-2 border-slate-200 rounded-xl p-3 bg-slate-50">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Rincian Nota Terpotong (Mini-Ledger):</span>
                <span className="text-amber-700">{fifoResult.allocations.length} Bon Terpilih</span>
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 text-xs">
                {fifoResult.allocations.map((alloc) => (
                  <div
                    key={alloc.debtId}
                    className="p-2 bg-white rounded-lg border border-slate-300 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <span>#{alloc.bonNumber}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            alloc.isSettled
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {alloc.isSettled ? 'LUNAS' : 'SISA SEBAGIAN'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Tgl: {alloc.debtDate} | Hutang: {formatRupiah(alloc.originalOwed)}
                      </div>
                    </div>
                    <div className="text-right font-bold text-emerald-700">
                      -{formatRupiah(alloc.deductedAmount)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Sisa Kembalian setelah Kasbon */}
              {fifoResult.leftoverChange > 0 && (
                <div className="pt-2 border-t border-slate-300 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-600 block">Sisa Kembalian:</span>
                    <span className="font-bold text-slate-900">
                      {formatRupiah(fifoResult.leftoverChange)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setLeftoverAction('DEPOSIT')}
                      className={`px-2 py-1 rounded text-[10px] font-bold border ${
                        leftoverAction === 'DEPOSIT'
                          ? 'bg-emerald-600 text-white border-emerald-700'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      Masuk Celengan
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeftoverAction('CASH')}
                      className={`px-2 py-1 rounded text-[10px] font-bold border ${
                        leftoverAction === 'CASH'
                          ? 'bg-blue-600 text-white border-blue-700'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      Kembalikan Fisik
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 border-2 border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 h-12 bg-slate-900 text-[#CCFF00] rounded-xl text-xs font-black flex items-center justify-center gap-2 hover:bg-slate-800 shadow-[2px_2px_0px_#E2E8F0] transition-all cursor-pointer"
            >
              <ShieldCheck size={16} strokeWidth={2.5} />
              <span>Terapkan Alokasi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
