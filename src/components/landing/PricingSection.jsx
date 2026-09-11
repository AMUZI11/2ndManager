"use client";
import React from 'react';
import { LedgerCard } from '../ui/LedgerCard';
import { WaxSealBadge } from '../ui/WaxSealBadge';

export function PricingSection() {
  return (
    <section className="py-24 px-4 sm:px-6 bg-[#0a0a0a] relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-heading font-bold text-vault-cream mb-6">Investasi Keamanan Warung</h2>
          <p className="text-vault-cream/70 text-lg max-w-2xl mx-auto font-light">
            Satu kali investasi untuk menutup kebocoran berkali-kali lipat setiap bulan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-12 max-w-5xl mx-auto">
          <LedgerCard className="flex flex-col h-full transform transition-transform hover:-translate-y-2 mt-8 md:mt-0">
            <div className="text-center mb-8 border-b border-vault-coffee/20 pb-6">
              <h3 className="text-2xl font-heading font-bold text-vault-coffee mb-2">Paket Mandiri</h3>
              <p className="text-sm italic text-vault-coffee/70">Untuk yang baru mulai membenahi</p>
            </div>
            
            <div className="flex-grow">
              <table className="w-full text-sm md:text-base">
                <tbody>
                  <tr className="border-b border-vault-coffee/10 border-dotted">
                    <td className="py-3 font-medium">Akses Klola OS Seumur Hidup</td>
                    <td className="py-3 text-right">Rp 4.000.000</td>
                  </tr>
                  <tr className="border-b border-vault-coffee/10 border-dotted">
                    <td className="py-3 font-medium">Panduan Instalasi Video</td>
                    <td className="py-3 text-right">Termasuk</td>
                  </tr>
                  <tr className="border-b border-vault-coffee/10 border-dotted opacity-50">
                    <td className="py-3 font-medium line-through">Migrasi Data Warisan</td>
                    <td className="py-3 text-right">-</td>
                  </tr>
                  <tr className="border-b border-vault-coffee/10 border-dotted opacity-50">
                    <td className="py-3 font-medium line-through">Sesi Video Call Privat</td>
                    <td className="py-3 text-right">-</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-8 pt-6 border-t-2 border-vault-coffee border-double">
              <div className="flex justify-between items-end mb-6">
                <span className="font-heading font-bold text-lg">Total Nilai</span>
                <span className="font-heading font-bold text-3xl text-vault-brick-dark">Rp 899.000</span>
              </div>
              <button className="w-full py-4 border border-vault-coffee text-vault-coffee font-heading font-bold tracking-wide hover:bg-vault-coffee hover:text-vault-cream transition-colors">
                Pilih Paket Mandiri
              </button>
            </div>
          </LedgerCard>

          <LedgerCard className="flex flex-col h-full border-2 border-vault-gold/60 shadow-[0_20px_50px_rgba(197,160,89,0.15)] transform transition-transform hover:-translate-y-2 relative">
            <div className="absolute -top-12 -right-4 md:-right-8 z-20">
              <WaxSealBadge text="Rekomendasi Utama" />
            </div>

            <div className="text-center mb-8 border-b border-vault-coffee/20 pb-6 mt-4 md:mt-0">
              <h3 className="text-2xl font-heading font-bold text-vault-coffee mb-2">Paket VIP Concierge</h3>
              <p className="text-sm italic text-vault-coffee/70">Untuk yang serius menjaga warisan</p>
            </div>
            
            <div className="flex-grow">
              <table className="w-full text-sm md:text-base">
                <tbody>
                  <tr className="border-b border-vault-coffee/10 border-dotted">
                    <td className="py-3 font-medium">Akses Klola OS Seumur Hidup</td>
                    <td className="py-3 text-right">Rp 4.000.000</td>
                  </tr>
                  <tr className="border-b border-vault-coffee/10 border-dotted">
                    <td className="py-3 font-medium text-vault-brick-dark font-bold">Migrasi Data Warisan</td>
                    <td className="py-3 text-right font-bold">Rp 750.000</td>
                  </tr>
                  <tr className="border-b border-vault-coffee/10 border-dotted">
                    <td className="py-3 font-medium text-vault-brick-dark font-bold">Sesi Video Call Privat</td>
                    <td className="py-3 text-right font-bold">Rp 500.000</td>
                  </tr>
                  <tr className="border-b border-vault-coffee/10 border-dotted">
                    <td className="py-3 font-medium">Akses Klub VIP 24/7</td>
                    <td className="py-3 text-right">Rp 1.000.000</td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-4 text-right text-sm font-medium text-vault-coffee/60">
                Total Value: <span className="line-through">Rp 6.250.000</span>
              </div>
            </div>

            <div className="mt-4 pt-6 border-t-2 border-vault-coffee border-double">
              <div className="flex justify-between items-end mb-6">
                <span className="font-heading font-bold text-lg">Investasi Anda</span>
                <span className="font-heading font-bold text-4xl text-vault-brick-dark">Rp 1.299.000</span>
              </div>
              <button className="w-full py-4 bg-vault-coffee text-vault-gold font-heading font-bold tracking-wide hover:bg-vault-oxblood transition-colors shadow-lg">
                Pilih VIP Concierge
              </button>
            </div>
          </LedgerCard>
        </div>
      </div>
    </section>
  );
}
