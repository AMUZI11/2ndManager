"use client";

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Lock, ShieldAlert, KeyRound, Check, X, Delete } from 'lucide-react';
import { api } from '@/utils/api';

export default function NegativeMarginOverrideModal({
  isOpen,
  onClose,
  lossItems = [],
  mode = 'HARD_BLOCK', // 'CONFIRM_ONLY' (Supervisor) | 'HARD_BLOCK' (Manajer/Eksekutif)
  onAuthorize, // Callback when authorized (passes { pin } if hard block)
}) {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(3);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMsg('');
      setIsVerifying(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (mode === 'HARD_BLOCK' && /^\d$/.test(e.key) && pin.length < 6) {
        setPin((prev) => prev + e.key);
      } else if (mode === 'HARD_BLOCK' && e.key === 'Backspace') {
        setPin((prev) => prev.slice(0, -1));
      } else if (mode === 'HARD_BLOCK' && e.key === 'Enter' && pin.length === 6) {
        handleVerifyPin();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin, mode]);

  if (!isOpen) return null;

  const formatRupiah = (num) => `Rp ${Number(num || 0).toLocaleString('id-ID')}`;

  const handleNumpadClick = (val) => {
    if (isLocked || isVerifying) return;
    if (val === 'C') {
      setPin('');
      setErrorMsg('');
    } else if (val === 'DEL') {
      setPin((prev) => prev.slice(0, -1));
    } else if (pin.length < 6) {
      const nextPin = pin + val;
      setPin(nextPin);
      setErrorMsg('');
    }
  };

  const handleVerifyPin = async () => {
    if (pin.length !== 6) {
      setErrorMsg('Masukkan tepat 6 digit PIN Pemilik.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg('');

    try {
      const res = await api.verifyShopPin(pin);
      if (res?.valid) {
        onAuthorize({ pin });
      }
    } catch (err) {
      if (err.status === 429 || err.code === 'PIN_LOCKED') {
        setIsLocked(true);
        setErrorMsg(err.message || 'PIN terkunci selama 15 menit.');
      } else {
        if (err.remainingAttempts !== undefined) {
          setRemainingAttempts(err.remainingAttempts);
        }
        setErrorMsg(err.message || 'PIN salah. Silakan coba lagi.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConfirmSupervisor = () => {
    onAuthorize({});
  };

  const totalLoss = lossItems.reduce((acc, item) => {
    const cost = Number(item.harga_modal || item.cost_price || 0);
    const sell = Number(item.discounted_unit_price || item.selling_price || 0);
    const qty = Number(item.quantity || 1);
    return acc + Math.max(0, cost - sell) * qty;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-lg bg-zinc-950 border-2 border-red-600 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.35)] overflow-hidden font-sans text-zinc-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Pulsing Cadmium Red Alert Strip */}
        <div className="bg-red-600 h-2.5 w-full animate-pulse shadow-[0_0_15px_#EF4444]" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          aria-label="Tutup"
        >
          <X size={18} />
        </button>

        <div className="p-5 sm:p-6 space-y-4">
          {/* Header */}
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-950/90 border border-red-700 rounded-full font-mono text-[11px] font-black uppercase text-red-300">
              <ShieldAlert size={14} className="text-red-400 animate-bounce" />
              <span>[ PERINGATAN: RADAR JUAL RUGI AKTIF ]</span>
            </div>
            <h3 className="font-heading font-black text-xl sm:text-2xl text-white uppercase tracking-tight flex items-center gap-2">
              Transaksi Jual Rugi Terdeteksi!
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300">
              Terdapat item dengan harga jual kasir di bawah harga modal (HPP). 
              {mode === 'HARD_BLOCK' 
                ? ' Memerlukan otorisasi PIN Pemilik Toko untuk melanjutkan.' 
                : ' Harap periksa kembali sebelum melanjutkan penjualan.'}
            </p>
          </div>

          {/* Loss Items Summary Table */}
          <div className="bg-zinc-900 border border-red-900/60 rounded-xl p-3.5 space-y-2 max-h-44 overflow-y-auto">
            <div className="text-[10px] font-mono uppercase text-zinc-400 font-bold border-b border-zinc-800 pb-1 flex justify-between">
              <span>Item Rugi</span>
              <span>Harga Modal vs Jual</span>
            </div>
            {lossItems.map((item, idx) => {
              const cost = Number(item.harga_modal || item.cost_price || 0);
              const sell = Number(item.discounted_unit_price || item.selling_price || 0);
              const lossPerUnit = cost - sell;
              const qty = item.quantity || 1;

              return (
                <div key={idx} className="flex justify-between items-center py-1 text-xs border-b border-zinc-800/60 last:border-0">
                  <div>
                    <div className="font-bold text-white leading-tight">{item.nama || `Produk #${item.product_id?.slice(0, 6)}`}</div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      {qty} x Rugi {formatRupiah(lossPerUnit)}/unit
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-zinc-400 text-[11px] line-through">{formatRupiah(cost)}</div>
                    <div className="text-red-400 font-black">{formatRupiah(sell)}</div>
                  </div>
                </div>
              );
            })}
            <div className="pt-2 border-t border-zinc-800 flex justify-between items-center font-mono font-bold text-xs">
              <span className="text-zinc-300">Total Potensi Kerugian:</span>
              <span className="text-red-400 text-sm font-black">- {formatRupiah(totalLoss)}</span>
            </div>
          </div>

          {/* Tier 1 Supervisor Mode: 1-Click Confirmation */}
          {mode === 'CONFIRM_ONLY' && (
            <div className="space-y-3 pt-2">
              <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-xl text-xs text-amber-200 flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Mode Supervisor:</strong> Sebagai pemilik/pengawas shift, Anda dapat langsung menyetujui transaksi ini dengan 1 klik konfirmasi.
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-arcade bg-zinc-800 hover:bg-zinc-700 text-white border-2 border-zinc-700 font-mono text-xs font-bold py-3 rounded-xl transition-all cursor-pointer"
                >
                  Batal / Koreksi
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSupervisor}
                  className="btn-arcade bg-red-600 hover:bg-red-500 text-white border-2 border-red-700 font-mono text-xs font-black py-3 rounded-xl shadow-[3px_3px_0px_#7F1D1D] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check size={16} /> Setujui Jual Rugi
                </button>
              </div>
            </div>
          )}

          {/* Tier 2-3 Manajer / Eksekutif Mode: Hard Block PIN Keypad */}
          {mode === 'HARD_BLOCK' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-zinc-300 flex items-center gap-1.5">
                  <KeyRound size={14} className="text-[#CCFF00]" /> Masukkan PIN Pemilik:
                </span>
                <span className="text-[11px] font-mono text-zinc-400">
                  Sisa kesempatan: <strong className="text-amber-400">{remainingAttempts}x</strong>
                </span>
              </div>

              {/* PIN Digits Display */}
              <div className="flex justify-center gap-2.5">
                {[0, 1, 2, 3, 4, 5].map((idx) => {
                  const filled = pin.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`w-10 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-mono font-black transition-all ${
                        filled
                          ? 'border-[#CCFF00] bg-zinc-900 text-[#CCFF00] shadow-[0_0_10px_rgba(204,255,0,0.3)]'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-600'
                      }`}
                    >
                      {filled ? '•' : ''}
                    </div>
                  );
                })}
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-red-950/80 border border-red-600 rounded-xl text-center text-xs font-mono font-bold text-red-200">
                  {errorMsg}
                </div>
              )}

              {/* Arcade Numpad */}
              <div className="grid grid-cols-3 gap-2 pt-1 font-mono">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map((btn) => (
                  <button
                    key={btn}
                    type="button"
                    onClick={() => handleNumpadClick(btn)}
                    disabled={isLocked || isVerifying}
                    className={`h-11 rounded-xl font-black text-sm transition-all border-2 flex items-center justify-center cursor-pointer ${
                      btn === 'C'
                        ? 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                        : btn === 'DEL'
                        ? 'bg-zinc-900 border-zinc-700 text-amber-400 hover:bg-zinc-800'
                        : 'bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 hover:border-[#CCFF00] active:scale-95 shadow-[2px_2px_0px_#1E293B]'
                    }`}
                  >
                    {btn === 'DEL' ? <Delete size={16} /> : btn}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-arcade bg-zinc-800 hover:bg-zinc-700 text-white border-2 border-zinc-700 font-mono text-xs font-bold py-3 rounded-xl transition-all cursor-pointer"
                >
                  Batal Checkout
                </button>
                <button
                  type="button"
                  onClick={handleVerifyPin}
                  disabled={pin.length !== 6 || isVerifying || isLocked}
                  className={`btn-arcade font-mono text-xs font-black py-3 rounded-xl border-2 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    pin.length === 6 && !isVerifying && !isLocked
                      ? 'bg-[#CCFF00] text-slate-900 border-slate-800 shadow-[3px_3px_0px_#1E293B] hover:bg-[#b3e600]'
                      : 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
                  }`}
                >
                  {isVerifying ? (
                    <span>Memverifikasi...</span>
                  ) : (
                    <>
                      <Lock size={14} /> Otorisasi PIN
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
