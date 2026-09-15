'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Download, Copy, Check, ShieldCheck, Camera, Sparkles, AlertCircle } from 'lucide-react';

export default function QrisPaymentCard({ totalAmount = 0, onProceedToUpload }) {
  const [copiedNmid, setCopiedNmid] = useState(false);
  const NMID = 'ID1026593940004';

  const handleCopyNmid = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(NMID);
        setCopiedNmid(true);
        setTimeout(() => setCopiedNmid(false), 3000);
      }
    } catch (e) {
      console.warn('Gagal menyalin NMID:', e);
    }
  };

  const handleDownloadQr = () => {
    const link = document.createElement('a');
    link.href = '/images/qris-2ndmanager.png';
    link.download = 'qris-2ndmanager.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white border-2 border-slate-800 rounded-3xl p-5 sm:p-7 shadow-[6px_6px_0px_#1E293B] max-w-lg mx-auto text-center space-y-5">
      {/* Badge Verifikasi Resmi Bank Indonesia & ASPI */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 border-2 border-slate-800 text-xs font-mono font-bold text-slate-900 shadow-[2px_2px_0px_#1E293B]">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
        <ShieldCheck size={14} className="text-emerald-800 shrink-0" />
        <span className="truncate">QRIS RESMI TERVERIFIKASI BANK INDONESIA / ASPI</span>
      </div>

      {/* Frame Gambar QRIS Taktil */}
      <div className="space-y-2">
        <div className="bg-white p-3 sm:p-4 border-2 border-slate-800 rounded-2xl inline-block shadow-[4px_4px_0px_#1E293B]">
          <div className="relative w-[280px] h-[302px] sm:w-[320px] sm:h-[345px] mx-auto overflow-hidden rounded-xl">
            <Image
              src="/images/qris-2ndmanager.png"
              alt="QRIS 2ndManager - 2ND MANAGER BOOK STORE"
              fill
              sizes="(max-width: 640px) 280px, 320px"
              className="object-contain"
              priority
            />
          </div>
        </div>
        <p className="text-[11px] font-mono text-slate-500">
          Mendukung semua aplikasi e-wallet &amp; mobile banking berlogo QRIS
        </p>
      </div>

      {/* Banner Penegasan Nama Merchant Resmi (Mitigasi Keraguan Nama Toko) */}
      <div className="bg-amber-50 border-2 border-slate-800 rounded-2xl p-4 text-left space-y-1.5 shadow-[3px_3px_0px_#1E293B]">
        <div className="text-[11px] font-mono font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles size={13} className="text-amber-600" />
          <span>Konfirmasi Nama Penerima di Layar HP:</span>
        </div>
        <div className="text-sm font-black font-mono text-slate-900 flex items-center justify-between gap-2 border-b border-amber-200 pb-2">
          <span className="truncate">2ND MANAGER BOOK STORE</span>
          <span className="text-[10px] bg-emerald-300 text-emerald-950 font-mono font-black px-2 py-0.5 rounded-md border border-slate-800 shrink-0 shadow-[1px_1px_0px_#1E293B]">
            ✓ COCOK / VALID
          </span>
        </div>
        <p className="text-xs text-slate-700 font-sans leading-relaxed pt-1">
          *Nama entitas legal terdaftar resmi pada jaringan Bank &amp; QRIS Nasional. Saldo dan aktivasi akun Anda <b>100% aman</b> dan otomatis langsung tersambung ke sistem kasir 2ndManager Anda.
        </p>
      </div>

      {/* Tampilan Nominal Transfer Pas */}
      <div className="space-y-1.5">
        <div className="bg-slate-100 border-2 border-slate-800 rounded-2xl p-3.5 shadow-[3px_3px_0px_#1E293B]">
          <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">
            NOMINAL PEMBAYARAN PERSIS
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-slate-950">
            Rp {totalAmount.toLocaleString('id-ID')}
          </div>
        </div>
        <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-rose-600 font-bold px-2">
          <AlertCircle size={13} className="shrink-0" />
          <span>Masukkan nominal di m-banking tepat hingga angka terakhir.</span>
        </div>
      </div>

      {/* Tombol Aksi Cepat Taktil (Unduh QR & Salin NMID) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        <button
          type="button"
          onClick={handleDownloadQr}
          className="btn-arcade bg-[#CCFF00] hover:bg-[#b8e600] text-slate-950 border-2 border-slate-800 rounded-xl py-3 px-3 font-mono font-black text-xs shadow-[3px_3px_0px_#1E293B] active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-2 w-full transition-all cursor-pointer"
        >
          <Download size={15} strokeWidth={2.5} />
          <span>[ 📥 UNDUH GAMBAR QR ]</span>
        </button>

        <button
          type="button"
          onClick={handleCopyNmid}
          className="btn-arcade bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-800 rounded-xl py-3 px-3 font-mono font-bold text-xs shadow-[3px_3px_0px_#1E293B] active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-2 w-full transition-all cursor-pointer"
        >
          {copiedNmid ? (
            <>
              <Check size={15} className="text-emerald-600" strokeWidth={2.5} />
              <span className="text-emerald-700 font-black font-mono">NMID DISALIN!</span>
            </>
          ) : (
            <>
              <Copy size={15} strokeWidth={2.5} />
              <span className="truncate">[ 📋 SALIN NMID ]</span>
            </>
          )}
        </button>
      </div>

      {/* Panduan 3 Langkah Bayar via Galeri HP */}
      <div className="text-left text-xs font-sans text-slate-700 bg-slate-50 border-2 border-slate-800 rounded-2xl p-4 space-y-2 shadow-[2px_2px_0px_#1E293B]">
        <div className="font-bold text-slate-900 font-mono flex items-center gap-2">
          <span className="p-1 bg-[#CCFF00] border border-slate-800 rounded text-xs">📱</span>
          <span>Cara Bayar Jika Buka Web dari HP:</span>
        </div>
        <ol className="list-decimal list-inside space-y-1.5 text-slate-600 font-sans text-[12px] leading-relaxed">
          <li>
            Klik tombol <b className="text-slate-900 font-mono font-bold">Unduh Gambar QR</b> di atas.
          </li>
          <li>
            Buka aplikasi BCA/BRImo/Livin/GoPay/Dana/OVO/ShopeePay &gt; Pilih menu{' '}
            <b className="text-slate-900 font-mono font-bold">QRIS / Scan</b>.
          </li>
          <li>
            Klik ikon <b className="text-slate-900 font-mono font-bold">Galeri / Foto</b> di aplikasi Anda, lalu pilih gambar QR yang baru diunduh.
          </li>
        </ol>
      </div>

      {/* Tombol Utama Penghubung Alur: Scroll ke Form Bukti Bayar */}
      {onProceedToUpload && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onProceedToUpload}
            className="btn-arcade w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-950 text-[#CCFF00] font-mono text-xs sm:text-sm font-black rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_#1E293B] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer uppercase transition-all flex items-center justify-center gap-2"
          >
            <Camera size={16} strokeWidth={2.5} />
            <span>[ 📸 SAYA SUDAH SCAN &amp; BAYAR — UNGGAH BUKTI ]</span>
          </button>
        </div>
      )}
    </div>
  );
}
