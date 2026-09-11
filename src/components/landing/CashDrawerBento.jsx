"use client";
import React from 'react';
import { BookOpen, Calculator, KeySquare, ShieldCheck, Receipt, Barcode } from 'lucide-react';

export default function CashDrawerBento() {
  return (
    <section id="fitur" className="py-32 md:py-48 bg-transparent relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl max-w-4xl mx-auto font-extrabold tracking-tight text-kw-accent mb-6 drop-shadow-md">
            Laci Uang Anda, Terkunci Rapat.
          </h2>
          <p className="text-kw-text max-w-2xl mx-auto text-xl font-medium">
            Tidak ada lagi &quot;lupa catat&quot; atau &quot;salah hitung&quot;. Sistem ini dirancang sekeras brankas bank, semudah menekan kalkulator.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 grid-flow-dense mt-16">
          {/* Card 1: Buku Kasbon (Span 2) */}
          <div className="md:col-span-2 bg-[#8C2818]/40 backdrop-blur-md border border-kw-border rounded-3xl p-8 shadow-[8px_8px_16px_#1A0F0A,_-4px_-4px_12px_rgba(197,160,89,0.1)] relative overflow-hidden group hover:translate-y-[-4px] transition-all duration-500 ease-out flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1 z-10 relative">
              <BookOpen className="w-12 h-12 text-kw-accent mb-6" />
              <h3 className="text-3xl font-bold text-kw-accent mb-4">Buku Kasbon Anti-Lupa</h3>
              <p className="text-kw-text text-lg leading-relaxed mb-6">
                Tetangga ngutang rokok? Catat dengan 2 ketukan jari. Sistem menolak kasbon jika melewati batas limit. Kirim tagihan via WhatsApp dengan 1 klik saat jatuh tempo.
              </p>
            </div>
            {/* Dummy UI Nota Melayang */}
            <div className="flex-1 relative w-full h-48 md:h-full min-h-[200px]">
              <div className="absolute top-4 right-0 transform translate-x-4 rotate-6 bg-kw-card p-4 rounded-xl shadow-[4px_4px_10px_#1A0F0A] border border-kw-border w-48 group-hover:rotate-12 group-hover:scale-105 transition-transform duration-700 ease-out">
                <div className="flex justify-between items-center border-b border-kw-border pb-2 mb-2">
                  <span className="text-xs font-bold text-kw-text">#INV-001</span>
                  <span className="text-xs font-bold text-kw-accent">BELUM LUNAS</span>
                </div>
                <div className="space-y-2 text-kw-text">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Beras 5kg</span>
                    <span className="text-sm">70k</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Rokok 1 slop</span>
                    <span className="text-sm">230k</span>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-4 left-4 transform -rotate-3 bg-kw-card p-4 rounded-xl shadow-[4px_4px_10px_#1A0F0A] border border-kw-border w-48 group-hover:-rotate-6 group-hover:scale-105 transition-transform duration-700 ease-out z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-kw-accent/20 flex items-center justify-center">
                    <Receipt className="w-4 h-4 text-kw-accent" />
                  </div>
                  <span className="text-sm font-bold text-kw-text">Budi (Mandor)</span>
                </div>
                <div className="text-xl font-extrabold text-kw-accent">Rp 450.000</div>
                <div className="text-xs text-kw-text mt-1">Jatuh Tempo: Besok</div>
              </div>
            </div>
          </div>

          {/* Card 2: Kasir 3 Detik (Span 1) */}
          <div className="md:col-span-1 bg-[#8C2818]/40 backdrop-blur-md border border-kw-border rounded-3xl p-8 shadow-[8px_8px_16px_#1A0F0A,_-4px_-4px_12px_rgba(197,160,89,0.1)] relative overflow-hidden group hover:translate-y-[-4px] transition-all duration-500 ease-out flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 bg-kw-card rounded-2xl border border-kw-border flex items-center justify-center mb-6">
                <Barcode className="w-8 h-8 text-kw-accent" />
              </div>
              <h3 className="text-2xl font-bold text-kw-accent mb-4">Kasir 3 Detik</h3>
              <p className="text-kw-text text-lg">
                Ketik nama atau scan barcode. Total terhitung instan tanpa pusing cari kalkulator.
              </p>
            </div>
            <div className="mt-8 relative h-20 overflow-hidden rounded-xl bg-kw-bg border border-kw-border p-3">
              <div className="flex justify-between items-center animate-pulse">
                <div className="h-4 w-24 bg-kw-card rounded"></div>
                <div className="h-6 w-16 bg-[#8C2818] rounded"></div>
              </div>
              <div className="flex justify-between items-center mt-3">
                <div className="h-8 w-32 bg-kw-card rounded"></div>
                <div className="h-10 w-24 bg-kw-accent rounded-lg"></div>
              </div>
            </div>
          </div>

          {/* Card 3: PIN Otorisasi (Span 1) */}
          <div className="md:col-span-1 bg-[#8C2818]/40 backdrop-blur-md border border-kw-border rounded-3xl p-8 shadow-[8px_8px_16px_#1A0F0A,_-4px_-4px_12px_rgba(197,160,89,0.1)] relative overflow-hidden group hover:translate-y-[-4px] transition-all duration-500 ease-out">
            <KeySquare className="w-12 h-12 text-kw-accent mb-6" />
            <h3 className="text-2xl font-bold text-kw-accent mb-4">PIN Otorisasi</h3>
            <p className="text-kw-text text-lg">
              Kasir tidak bisa HAPUS barang dari struk tanpa persetujuan (PIN) Bos.
            </p>
            <div className="mt-8 flex gap-2 justify-center">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-10 h-12 rounded-lg bg-kw-card border border-kw-border flex items-center justify-center text-xl font-bold text-kw-accent">
                  *
                </div>
              ))}
            </div>
          </div>

          {/* Card 4: Rekonsiliasi Laci (Span 2) */}
          <div className="md:col-span-2 bg-[#8C2818]/40 backdrop-blur-md border border-kw-border rounded-3xl p-8 shadow-[8px_8px_16px_#1A0F0A,_-4px_-4px_12px_rgba(197,160,89,0.1)] relative overflow-hidden group hover:translate-y-[-4px] transition-all duration-500 ease-out flex flex-col justify-center">
            <div className="flex items-start gap-6">
              <ShieldCheck className="w-16 h-16 text-kw-accent shrink-0" />
              <div>
                <h3 className="text-3xl font-bold text-kw-accent mb-4">Rekonsiliasi Laci Real-Time</h3>
                <p className="text-kw-text text-lg max-w-lg">
                  Sistem menghitung pasti berapa jumlah UANG FISIK yang harus ada di laci saat pergantian shift. Selisih Rp 500 pun akan ketahuan.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
