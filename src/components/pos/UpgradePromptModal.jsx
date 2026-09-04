"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { ShieldAlert, Zap, CheckCircle2, X, ArrowRight, Lock } from 'lucide-react';

export default function UpgradePromptModal({ isOpen, onClose, errorData }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentCount = errorData?.current || 50;
  const limit = errorData?.limit || 50;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-zinc-950 border-2 border-red-500 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.25)] overflow-hidden font-sans text-zinc-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Accent Strip */}
        <div className="bg-gradient-to-r from-red-600 via-amber-500 to-red-600 h-2 w-full animate-pulse" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          aria-label="Tutup Modal"
        >
          <X size={18} />
        </button>

        <div className="p-6 sm:p-7 space-y-5">
          {/* Header Badge & Title */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-950/80 border border-red-700 rounded-full font-mono text-[11px] font-black uppercase text-red-300">
              <ShieldAlert size={14} className="text-red-400" />
              <span>[ CHOKEPOINT: KUOTA TRANSAKSI PENUH ]</span>
            </div>
            <h3 className="font-heading font-black text-xl sm:text-2xl text-white uppercase tracking-tight">
              Batas 50 Struk Kontrak Magang Tercapai!
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              Toko Anda telah mencapai kuota transaksi bulanan ({currentCount}/{limit} struk). 
              Transaksi ke-{currentCount + 1} dan seterusnya memerlukan peningkatan kontrak ke <strong className="text-[#CCFF00]">Supervisor Shift</strong>.
            </p>
          </div>

          {/* Value Comparison Card */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
              <div>
                <p className="font-mono text-[11px] uppercase font-bold text-[#CCFF00]">Solusi Rekomendasi:</p>
                <h4 className="font-heading font-black text-lg text-white uppercase">Supervisor Shift</h4>
              </div>
              <div className="text-right">
                <span className="font-mono font-black text-lg text-[#CCFF00]">Rp 149.000</span>
                <span className="text-[10px] font-mono text-zinc-400 block">/ bulan</span>
              </div>
            </div>

            <div className="space-y-2 font-mono text-xs">
              <div className="flex items-start gap-2 text-zinc-200">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Transaksi (Struk) Unlimited:</strong> Bebas proses tanpa batas kuota</span>
              </div>
              <div className="flex items-start gap-2 text-zinc-200">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Multi-Kasir:</strong> Buka hingga 2 akun kasir aktif</span>
              </div>
              <div className="flex items-start gap-2 text-zinc-200">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Fitur Kasbon &amp; WA Tagihan:</strong> Catat piutang otomatis</span>
              </div>
              <div className="flex items-start gap-2 text-zinc-400 line-through">
                <Lock size={14} className="text-red-400 shrink-0 mt-0.5" />
                <span>Batas kuota 50 struk/bulan (Tier Magang terkunci)</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            <Link
              href="/billing?plan=SUPERVISOR"
              onClick={onClose}
              className="w-full py-3 px-4 bg-[#CCFF00] hover:bg-[#b5e600] text-black font-heading font-black text-sm uppercase rounded-xl border-2 border-black flex items-center justify-center gap-2 shadow-[3px_3px_0px_#000] hover:shadow-[1px_1px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer text-center"
            >
              <Zap size={16} className="fill-black" />
              <span>UPGRADE KE SUPERVISOR SHIFT SEKARANG</span>
              <ArrowRight size={16} />
            </Link>

            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 font-mono text-xs font-bold uppercase rounded-xl border border-zinc-700 transition-colors cursor-pointer text-center"
            >
              Kembali ke Mesin POS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
