"use client";
import React from 'react';
import { Star } from 'lucide-react';

export default function TestimonialsSection() {
  const testimonials = [
    {
      name: "Koh Aseng",
      role: "Pemilik Grosir Sembako",
      content: "Dulu pusing tiap akhir bulan hitung kasbon di buku lecek, banyak yang ngeles. Sejak pakai ini, tagihan jelas ada struk digitalnya. Selisih kasir hilang 100%.",
    },
    {
      name: "Bu Siti",
      role: "Juragan Warung Madura",
      content: "Malam-malam warung rame, kasir sering bilang uang pas-pasan. Pasang fitur CCTV log dari 2ndManager, ketahuan ada yang void rokok. Sangat berguna buat jaga aset.",
    },
    {
      name: "Pak Budi",
      role: "Toko Kelontong Berkah",
      content: "Saya pikir aplikasi kasir itu ribet. Ternyata cuma 2 menit langsung bisa jualan. Scan barcode cepet banget, gak ada delay sama sekali walau pakai HP Android murah.",
    }
  ];

  return (
    <section className="py-32 md:py-48 bg-transparent relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-sans font-extrabold tracking-tighter text-kw-accent mb-6 drop-shadow-md">
            Dipercaya Oleh Mereka Yang Telah Sadar.
          </h2>
          <p className="text-kw-text max-w-2xl mx-auto text-xl">
            Bergabunglah dengan ribuan pemilik usaha yang telah menutup kebocoran omzet mereka.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testi, index) => (
            <div key={index} className="bg-[#8C2818]/40 backdrop-blur-md border border-kw-border rounded-3xl p-8 shadow-[8px_8px_16px_#1A0F0A,_-4px_-4px_12px_rgba(197,160,89,0.1)] group hover:-translate-y-2 transition-transform duration-500 ease-out">
              <div className="flex gap-1 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-5 h-5 fill-[#C5A059] text-kw-accent" />
                ))}
              </div>
              <p className="text-kw-text mb-8 leading-relaxed font-medium text-lg">
                "{testi.content}"
              </p>
              <div className="border-t border-kw-border pt-6">
                <p className="text-kw-accent font-bold tracking-tight text-lg">{testi.name}</p>
                <p className="text-kw-text text-sm">{testi.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
