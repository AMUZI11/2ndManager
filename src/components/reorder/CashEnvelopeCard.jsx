"use client";
import React from 'react';
import { Banknote, AlertTriangle, CheckCircle2, Printer, Moon, ArrowRight } from 'lucide-react';
import { calculateCashEnvelopeBreakdown } from '@/utils/procurementEngine';

const formatRupiah = (val) => `Rp ${Number(val || 0).toLocaleString('id-ID')}`;

/**
 * Kartu Rincian Amplop Kas Belanja Fisik Pasar Subuh
 */
export default function CashEnvelopeCard({
  totalEstimatedCost = 0,
  leftoverDrawerCash = 0,
  onOpenMarketMode,
  onPrintSlip,
}) {
  const breakdown = calculateCashEnvelopeBreakdown(totalEstimatedCost, leftoverDrawerCash);

  return (
    <div className="bg-white border-3 border-[#0B0F17] rounded-2xl shadow-[6px_6px_0px_#0B0F17] p-5 md:p-6 space-y-5 font-sans">
      {/* Header & Total Modal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-200 pb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400 border-2 border-slate-900 flex items-center justify-center text-slate-900 shadow-[2px_2px_0px_#0B0F17] shrink-0 mt-0.5">
            <Banknote size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="font-display font-black text-lg md:text-xl text-[#0B0F17] uppercase tracking-tight">
              Estimator Amplop Kas Belanja Fisik
            </h2>
            <p className="text-xs text-slate-600 font-sans">
              Pecahan lembaran uang tunai yang disarankan dibawa juragan ke pasar subuh
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right bg-amber-50 sm:bg-transparent p-3 sm:p-0 rounded-xl border border-amber-300 sm:border-0">
          <span className="text-[10px] font-mono font-bold uppercase text-slate-500 block">
            Estimasi Total Modal:
          </span>
          <span className="font-display font-black text-2xl md:text-3xl text-slate-900">
            {formatRupiah(totalEstimatedCost)}
          </span>
        </div>
      </div>

      {/* Grid Denominasi Pecahan Fisik */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {breakdown.denominations.map((denom) => (
          <div
            key={denom.label}
            className="bg-slate-50 border-2 border-slate-800 rounded-xl p-3 shadow-[2px_2px_0px_#1E293B] space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-black text-slate-900">{denom.label}</span>
              <span className="px-2 py-0.5 bg-slate-900 text-[#CCFF00] font-mono font-black text-[11px] rounded">
                {denom.count} lbr
              </span>
            </div>
            <p className="font-mono text-xs font-bold text-slate-600">
              {formatRupiah(denom.total)}
            </p>
          </div>
        ))}
      </div>

      {/* Sisa Uang Pas / Receh */}
      {breakdown.exactReceh > 0 && (
        <div className="flex items-center justify-between bg-slate-100 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono">
          <span className="text-slate-600">Alokasi Uang Pas / Receh Koin:</span>
          <strong className="text-slate-900">{formatRupiah(breakdown.exactReceh)}</strong>
        </div>
      )}

      {/* Komparasi Brankas Toko & Warning */}
      <div className="pt-1">
        {breakdown.isDeficit ? (
          <div className="p-3.5 bg-rose-50 border-2 border-rose-500 rounded-xl flex items-start gap-2.5 text-rose-950 text-xs">
            <AlertTriangle size={18} strokeWidth={2.5} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">
                Estimasi belanja melebihi sisa uang brankas kasir semalam ({formatRupiah(leftoverDrawerCash)}).
              </p>
              <p className="text-rose-800">
                Diperlukan tambahan modal tunai luar sebesar{' '}
                <strong className="font-mono underline">{formatRupiah(breakdown.deficit)}</strong>.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-emerald-50 border-2 border-emerald-500 rounded-xl flex items-center gap-2.5 text-emerald-950 text-xs">
            <CheckCircle2 size={18} strokeWidth={2.5} className="text-emerald-600 shrink-0" />
            <span>
              Sisa kas brankas toko ({formatRupiah(leftoverDrawerCash)}) mencukupi untuk memenuhi estimasi belanja pasar subuh ini.
            </span>
          </div>
        )}
      </div>

      {/* Action CTA Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2">
          {onPrintSlip && (
            <button
              type="button"
              onClick={onPrintSlip}
              className="btn-arcade px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] font-mono text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all active:translate-y-0.5"
            >
              <Printer size={15} strokeWidth={2.5} />
              <span>Cetak Slip Belanja Fisik</span>
            </button>
          )}
        </div>

        {onOpenMarketMode && (
          <button
            type="button"
            onClick={onOpenMarketMode}
            className="btn-arcade px-4 py-2.5 bg-[#0B0F17] hover:bg-slate-900 text-amber-400 border-2 border-[#0B0F17] shadow-[3px_3px_0px_#F59E0B] font-mono text-xs font-black uppercase rounded-xl flex items-center gap-2 cursor-pointer transition-all active:translate-y-0.5"
          >
            <Moon size={15} strokeWidth={2.5} className="text-amber-400" />
            <span>Masuk Mode Pasar Subuh</span>
            <ArrowRight size={14} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
}
