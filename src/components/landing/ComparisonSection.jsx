"use client";
import React from 'react';

export function ComparisonSection() {
  return (
    <section className="py-24 px-4 sm:px-6 bg-[#0a0a0a]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-heading font-bold text-vault-cream mb-6">Metode Lama vs Klola OS</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {/* Metode Lama */}
          <div className="p-8 border border-vault-coffee/50 rounded-sm bg-[#111] opacity-70 grayscale-[50%] hover:grayscale-0 transition-all duration-300">
            <h3 className="text-2xl font-heading font-bold text-vault-cream/50 mb-6 border-b border-vault-coffee/50 pb-4">Buku Catatan Sobek</h3>
            <ul className="space-y-6 text-vault-cream/60">
              <li className="flex items-start gap-4">
                <span className="text-vault-brick-light mt-1 text-xl font-bold">✗</span>
                <span className="text-base">Buku bisa hilang, ketumpahan kopi, atau sengaja disembunyikan.</span>
              </li>
              <li className="flex items-start gap-4">
                <span className="text-vault-brick-light mt-1 text-xl font-bold">✗</span>
                <span className="text-base">Sulit ditagih karena tidak ada bukti fisik yang kuat saat pelanggan menyangkal.</span>
              </li>
              <li className="flex items-start gap-4">
                <span className="text-vault-brick-light mt-1 text-xl font-bold">✗</span>
                <span className="text-base">Menghitung untung rugi akhir bulan butuh waktu berjam-jam.</span>
              </li>
            </ul>
          </div>

          {/* Klola OS */}
          <div className="p-8 border-2 border-vault-gold/40 rounded-sm bg-vault-oxblood/20 relative shadow-[0_0_30px_rgba(197,160,89,0.1)]">
            <div className="absolute -top-4 -right-4 w-10 h-10 bg-vault-gold rounded-full flex items-center justify-center text-vault-midnight shadow-[0_4px_10px_rgba(0,0,0,0.5)] font-bold text-xl">✓</div>
            <h3 className="text-2xl font-heading font-bold text-vault-gold mb-6 border-b border-vault-gold/20 pb-4">Brankas Digital</h3>
            <ul className="space-y-6 text-vault-cream">
              <li className="flex items-start gap-4">
                <span className="text-vault-gold mt-1 text-xl font-bold">✓</span>
                <span className="text-base">Tersimpan aman di cloud. HP hilang, data tetap utuh.</span>
              </li>
              <li className="flex items-start gap-4">
                <span className="text-vault-gold mt-1 text-xl font-bold">✓</span>
                <span className="text-base">Bukti digital tak terbantahkan, dilengkapi riwayat transaksi jelas.</span>
              </li>
              <li className="flex items-start gap-4">
                <span className="text-vault-gold mt-1 text-xl font-bold">✓</span>
                <span className="text-base">Laporan laba rugi instan dengan satu sentuhan.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
