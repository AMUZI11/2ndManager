"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coins, Banknote, PiggyBank, Receipt, UserPlus, CheckCircle2,
  X, ArrowRight, ShieldCheck, AlertCircle, Sparkles
} from 'lucide-react';
import { api } from '@/utils/api';

export default function SmartChangeModal({
  isOpen,
  onClose,
  totalOmzet = 0,
  cashReceived = 0,
  selectedCustomer = null,
  customerPiutang = 0,
  customerBalance = 0,
  onConfirmAllocation, // ({ type: 'NONE' | 'KASBON' | 'DEPOSIT', amount: number, customer: object | null })
}) {
  const changeAmount = Math.max(0, cashReceived - totalOmzet);

  // Selected mode: 'NONE' (kembalian fisik), 'KASBON' (potong hutang), 'DEPOSIT' (masuk celengan)
  const [allocationType, setAllocationType] = useState('NONE');
  
  // Quick-Guest State
  const [isQuickGuestOpen, setIsQuickGuestOpen] = useState(false);
  const [quickNama, setQuickNama] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [creatingGuest, setCreatingGuest] = useState(false);
  const [guestError, setGuestError] = useState('');
  const [createdCustomer, setCreatedCustomer] = useState(null);

  const activeCustomer = selectedCustomer || createdCustomer;

  useEffect(() => {
    if (isOpen) {
      setAllocationType('NONE');
      setIsQuickGuestOpen(false);
      setQuickNama('');
      setQuickPhone('');
      setGuestError('');
      setCreatedCustomer(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatRupiah = (val) => `Rp ${Number(val || 0).toLocaleString('id-ID')}`;

  const handleQuickCustomerCreate = async () => {
    if (!quickNama.trim()) {
      setGuestError('Ketik nama panggilan pelanggan.');
      return;
    }
    setCreatingGuest(true);
    setGuestError('');
    try {
      const newCust = await api.addCustomer({
        nama: quickNama.trim(),
        phone: quickPhone.trim() || null,
        bonus_threshold: 10000000,
      });
      setCreatedCustomer(newCust);
      setAllocationType('DEPOSIT');
      setIsQuickGuestOpen(false);
    } catch (err) {
      setGuestError(err.message || 'Gagal menyimpan pelanggan.');
    } finally {
      setCreatingGuest(false);
    }
  };

  const handleConfirm = () => {
    onConfirmAllocation({
      type: allocationType,
      amount: changeAmount,
      customer: activeCustomer,
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 20, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="bg-white rounded-2xl max-w-md w-full shadow-[8px_8px_0px_#1E293B] border-2 border-slate-800 overflow-hidden flex flex-col font-sans"
        >
          {/* Header */}
          <div className="bg-slate-900 text-[#CCFF00] p-4 flex items-center justify-between border-b-2 border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#CCFF00]/20 flex items-center justify-center border border-[#CCFF00]/40">
                <Coins size={18} className="text-[#CCFF00]" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wider font-mono">
                  Smart Change (Celengan & Kembalian)
                </h3>
                <p className="text-[11px] text-white/70 font-sans">
                  Pilih alokasi kembalian uang kasir
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {/* Display Kembalian Nominal */}
            <div className="bg-slate-50 border-2 border-slate-800 p-4 rounded-xl text-center space-y-1">
              <span className="text-[11px] font-mono uppercase font-bold text-slate-500">
                Sisa Kembalian Pembeli
              </span>
              <div className="text-3xl font-extrabold font-mono text-slate-900 tracking-tight">
                {formatRupiah(changeAmount)}
              </div>
              <div className="flex justify-center items-center gap-2 text-xs font-mono text-slate-600 pt-1">
                <span>Diterima: {formatRupiah(cashReceived)}</span>
                <span>•</span>
                <span>Tagihan: {formatRupiah(totalOmzet)}</span>
              </div>
            </div>

            {/* Status Pelanggan Terkait */}
            {activeCustomer ? (
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 uppercase block">
                    Pelanggan Terdaftar
                  </span>
                  <p className="text-xs font-extrabold text-slate-900">{activeCustomer.nama}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-500 block">Saldo Tabungan:</span>
                  <span className="text-xs font-mono font-extrabold text-emerald-800">
                    {formatRupiah(customerBalance)}
                  </span>
                </div>
              </div>
            ) : (
              /* Quick-Guest 1-Kolom Prompt */
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-3 bg-slate-50">
                {!isQuickGuestOpen ? (
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-600">
                      <span className="font-bold text-slate-800 block">Pelanggan Umum (Non-Member)</span>
                      <span className="text-[11px] text-slate-500">Bisa simpan kembalian ke nama panggilan</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsQuickGuestOpen(true)}
                      className="px-2.5 py-1.5 bg-slate-900 text-[#CCFF00] font-mono text-xs font-bold rounded-lg border border-slate-800 flex items-center gap-1.5 hover:bg-slate-800 transition"
                    >
                      <UserPlus size={13} /> + Catat Nama
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-800">
                        ⚡ Quick-Guest (Buat Langsung dari POS)
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsQuickGuestOpen(false)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Nama Panggilan (Wajib)"
                        value={quickNama}
                        onChange={(e) => setQuickNama(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-sans focus:outline-none focus:border-slate-800"
                        autoFocus
                      />
                      <input
                        type="text"
                        placeholder="No. WhatsApp (Opsional)"
                        value={quickPhone}
                        onChange={(e) => setQuickPhone(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:border-slate-800"
                      />
                    </div>
                    {guestError && (
                      <p className="text-[11px] text-rose-600 font-mono">{guestError}</p>
                    )}
                    <button
                      type="button"
                      disabled={creatingGuest}
                      onClick={handleQuickCustomerCreate}
                      className="w-full py-1.5 bg-slate-900 text-[#CCFF00] font-mono text-xs font-bold rounded-lg border border-slate-800 hover:bg-slate-800 transition"
                    >
                      {creatingGuest ? 'Menyimpan...' : 'Simpan & Aktifkan Celengan'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Allocation Options */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-mono uppercase font-bold text-slate-500 block">
                Pilih Aksi Kembalian:
              </span>

              {/* Option 1: Kembalikan Tunai Fisik */}
              <button
                type="button"
                onClick={() => setAllocationType('NONE')}
                className={`w-full p-3 rounded-xl border-2 text-left flex items-center justify-between transition cursor-pointer ${
                  allocationType === 'NONE'
                    ? 'border-slate-900 bg-amber-50/60 shadow-[2px_2px_0_#1E293B]'
                    : 'border-slate-200 bg-white hover:border-slate-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                    allocationType === 'NONE' ? 'bg-amber-400 text-slate-900 border-slate-900' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    <Banknote size={18} />
                  </div>
                  <div>
                    <span className="text-xs font-bold font-sans text-slate-900 block">
                      Kembalikan Tunai Fisik
                    </span>
                    <span className="text-[11px] text-slate-500 font-sans">
                      Serahkan uang kembalian pecahan fisik ke pembeli
                    </span>
                  </div>
                </div>
                <div className="font-mono font-bold text-xs text-slate-800">
                  {formatRupiah(changeAmount)}
                </div>
              </button>

              {/* Option 2: Potong Kasbon Pelanggan (Jika Punya Kasbon) */}
              {activeCustomer && customerPiutang > 0 && (
                <button
                  type="button"
                  onClick={() => setAllocationType('KASBON')}
                  className={`w-full p-3 rounded-xl border-2 text-left flex items-center justify-between transition cursor-pointer ${
                    allocationType === 'KASBON'
                      ? 'border-indigo-900 bg-indigo-50 shadow-[2px_2px_0_#1E293B]'
                      : 'border-slate-200 bg-white hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                      allocationType === 'KASBON' ? 'bg-indigo-600 text-white border-indigo-900' : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      <Receipt size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold font-sans text-slate-900">
                          Potong Kasbon Pelanggan
                        </span>
                        <span className="bg-rose-100 text-rose-800 text-[10px] font-mono px-1.5 py-0.2 rounded font-bold">
                          Utang: {formatRupiah(customerPiutang)}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-sans block">
                        Alokasikan {formatRupiah(Math.min(changeAmount, customerPiutang))} memotong bon tertua
                      </span>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-xs text-indigo-950">
                    Sisa: {formatRupiah(Math.max(0, customerPiutang - changeAmount))}
                  </div>
                </button>
              )}

              {/* Option 3: Simpan ke Celengan Saldo */}
              {activeCustomer && (
                <button
                  type="button"
                  onClick={() => setAllocationType('DEPOSIT')}
                  className={`w-full p-3 rounded-xl border-2 text-left flex items-center justify-between transition cursor-pointer ${
                    allocationType === 'DEPOSIT'
                      ? 'border-emerald-800 bg-emerald-50 shadow-[2px_2px_0_#1E293B]'
                      : 'border-slate-200 bg-white hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                      allocationType === 'DEPOSIT' ? 'bg-emerald-500 text-slate-900 border-slate-900' : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      <PiggyBank size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-bold font-sans text-slate-900 block">
                        Simpan ke Celengan Saldo
                      </span>
                      <span className="text-[11px] text-slate-500 font-sans">
                        Disimpan sebagai deposit tabungan belanja berikutnya
                      </span>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-xs text-emerald-900">
                    Total: {formatRupiah(customerBalance + changeAmount)}
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-100 border-t-2 border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono font-bold text-slate-600 hover:text-slate-900"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="btn-arcade px-5 py-2.5 bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 font-extrabold text-xs font-mono uppercase rounded-xl border-2 border-slate-800 shadow-[3px_3px_0_#1E293B] flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 size={15} /> Konfirmasi &amp; Cetak
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
