"use client";
import React from 'react';
import { AlertCircle, CheckCircle2, TrendingUp, ShieldAlert, Zap, Layers, Lock, Cpu } from 'lucide-react';

export default function ProblemSolutionBento() {
  return (
    <section id="solusi" className="py-24 bg-[#3D1A0F] text-white relative border-t border-[#4E271B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* SECTION HEADER */}
        <div className="text-center w-full max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-black text-amber-200 uppercase tracking-widest px-3.5 py-1 bg-[#C97B1A]/20 border border-[#C97B1A]/40 rounded-xl">
            Mengapa Memilih 2ndManager
          </span>
          <h2 className="w-full text-3xl sm:text-5xl font-black tracking-tight font-heading leading-tight text-white">
            Hentikan Kebocoran Kas. <br />
            <span className="text-[#C97B1A] underline decoration-[#C97B1A]/40 underline-offset-4">
              Otomatiskan Setiap Transaksi
            </span>
          </h2>
          <p className="w-full text-amber-100/80 text-sm sm:text-base">
            Banyak usaha retail dan grosir mengalami selisih kas dan piutang macet akibat pencatatan bon kertas yang tercecer. 2ndManager menyelesaikan masalah ini hingga ke akarnya.
          </p>
        </div>

        {/* ASYMMETRIC BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* BENTO CARD 1 (Large - Spans 2 Columns on Desktop) */}
          <div className="md:col-span-2 bg-[#2C120A] p-8 rounded-3xl border border-[#4E271B] relative overflow-hidden group hover:border-[#C97B1A]/60 transition-all duration-300 shadow-xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#C97B1A]/10 rounded-full blur-[80px] pointer-events-none" />
            
            <div className="relative z-10 space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-[#C97B1A]/20 text-[#C97B1A] flex items-center justify-center border border-[#C97B1A]/30">
                <ShieldAlert size={24} />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white font-heading">
                  Pencegahan Kasbon Macet & Kontrol Limit Otomatis
                </h3>
                <p className="text-amber-100/80 text-sm leading-relaxed">
                  Tidak ada lagi buku utang fisik yang hilang atau piutang tanpa kejelasan. Sistem secara otomatis membatasi bon kasir jika pelanggan melampaui limit kredit dan mengirimkan pengingat WhatsApp ketika mendekati tenggat waktu.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 space-y-1">
                  <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase">
                    <AlertCircle size={14} /> Bon Kertas Tradisional
                  </div>
                  <p className="text-xs text-amber-100/70">Bon kertas tercecer, lupa menagih kasbon, batas kredit pelanggan tidak terkontrol.</p>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs uppercase">
                    <CheckCircle2 size={14} /> Sistem Digital 2ndManager
                  </div>
                  <p className="text-xs text-amber-100/70">Limit otomatis mengunci kasbon, pelunasan bulanan rapi, catatan digital akurat 100%.</p>
                </div>
              </div>
            </div>
          </div>

          {/* BENTO CARD 2 (Single Column) */}
          <div className="bg-[#2C120A] p-8 rounded-3xl border border-[#4E271B] relative overflow-hidden group hover:border-[#C97B1A]/60 transition-all duration-300 shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#C97B1A]/20 text-[#C97B1A] flex items-center justify-center border border-[#C97B1A]/30">
                <Zap size={24} />
              </div>
              <h3 className="text-xl font-bold text-white font-heading">
                Diskon Bertingkat (10%+5%) Otomatis
              </h3>
              <p className="text-amber-100/80 text-xs leading-relaxed">
                Kasir tidak perlu menghitung potongan harga berantai dengan kalkulator manual. Masukkan persen diskon, dan total bersih langsung terhitung tepat hingga pecahan terendah.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#4E271B] flex items-center justify-between text-xs text-amber-300 font-bold">
              <span>0% Kesalahan Hitung Kasir</span>
              <TrendingUp size={16} />
            </div>
          </div>

          {/* BENTO CARD 3 (Single Column) */}
          <div className="bg-[#2C120A] p-8 rounded-3xl border border-[#4E271B] relative overflow-hidden group hover:border-[#C97B1A]/60 transition-all duration-300 shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#C97B1A]/20 text-[#C97B1A] flex items-center justify-center border border-[#C97B1A]/30">
                <Layers size={24} />
              </div>
              <h3 className="text-xl font-bold text-white font-heading">
                Laporan Profitabilitas HPP Real-Time
              </h3>
              <p className="text-amber-100/80 text-xs leading-relaxed">
                Saat kasir menyimpan transaksi, sistem otomatis mengurangkan modal HPP produk dan menyajikan angka laba bersih usaha Anda pada saat itu juga.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#4E271B] flex items-center justify-between text-xs text-amber-300 font-bold">
              <span>Laporan Laba Audit-Ready</span>
              <CheckCircle2 size={16} />
            </div>
          </div>

          {/* BENTO CARD 4 (Spans 2 Columns on Desktop) */}
          <div className="md:col-span-2 bg-[#2C120A] p-8 rounded-3xl border border-[#4E271B] relative overflow-hidden group hover:border-[#C97B1A]/60 transition-all duration-300 shadow-xl">
            <div className="relative z-10 space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-[#C97B1A]/20 text-[#C97B1A] flex items-center justify-center border border-[#C97B1A]/30">
                <Cpu size={24} />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white font-heading">
                  Arsitektur Offline-First & Akses Multi-Device
                </h3>
                <p className="text-amber-100/80 text-sm leading-relaxed">
                  Jika koneksi internet terputus di toko, transaksi kasir tetap dapat berjalan secara lokal dan akan tersinkronisasi otomatis begitu internet kembali terhubung.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-amber-100/90">
                <div className="px-3.5 py-1.5 rounded-xl bg-[#3D1A0F] border border-[#4E271B]">⚡ Mode Kasir Cepat</div>
                <div className="px-3.5 py-1.5 rounded-xl bg-[#3D1A0F] border border-[#4E271B]">🔒 Hak Akses Kasir & Owner</div>
                <div className="px-3.5 py-1.5 rounded-xl bg-[#3D1A0F] border border-[#4E271B]">📱 Laptop, Tablet & HP</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
