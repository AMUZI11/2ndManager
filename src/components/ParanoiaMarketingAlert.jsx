"use client";
import React from 'react';
import { useRouter } from 'next/navigation';

export default function ParanoiaMarketingAlert({ closingDiscrepancy }) {
  const router = useRouter();

  if (closingDiscrepancy === null || closingDiscrepancy >= 0) return null;

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val || 0);
  };

  const handleClear = () => {
    localStorage.removeItem('hl_shift_discrepancy');
    localStorage.removeItem('hl_last_closing_selisih');
    // Force a reload or a state update in the parent would be ideal, 
    // but for now reloading is a surefire way to clear it:
    window.location.reload();
  };

  return (
    <div className="bg-[#fff4eb] border-2 border-[#ffc9a8] rounded-[26px] p-6 shadow-sm space-y-3">
      <div className="flex items-center gap-2 text-[11px] font-mono font-black text-[#e05600] uppercase tracking-wider">
        <span className="w-2.5 h-2.5 bg-[#e05600] rounded-full block animate-pulse" />
        PARANOIA AUDIT ALERT
      </div>
      
      <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display tracking-tight">
        Selisih kas minus terdeteksi saat tutup shift
      </h2>
      
      <p className="text-[13px] font-mono font-bold text-[#b44800]">
        SELISIH: <span className="underline decoration-rose-500">Rp {formatRupiah(closingDiscrepancy)}</span> — Periksa nota yang dibatalkan kasir sebelum uang kembali &quot;hilang&quot; hari ini.
      </p>
      
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button 
          onClick={() => router.push('/transactions?tab=void')}
          className="bg-black hover:bg-slate-800 text-[#CCFF00] font-mono font-black text-xs px-5 py-2.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_#CCFF00] cursor-pointer transition-all uppercase"
        >
          AUDIT LOG NOTA
        </button>
        <button 
          onClick={handleClear}
          className="bg-white hover:bg-orange-50 text-[#e05600] font-mono font-black text-xs px-5 py-2.5 rounded-xl border-2 border-[#e05600] cursor-pointer transition-all uppercase"
        >
          SUDAH DIAUDIT — BERSIHKAN
        </button>
      </div>
    </div>
  );
}
