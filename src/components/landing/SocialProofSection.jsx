"use client";
import React from 'react';

export function SocialProofSection() {
  const testimonials = [
    {
      name: "Pak Budi Sutanto",
      warung: "Warung Sembako Budi Mulyo",
      city: "Solo",
      quote: "Saya kaget waktu tahu Rp3,2 juta kasbon ternyata nggak pernah kecatet di buku sobek. Setelah pakai ini, semua ketagih dalam 2 bulan. Sistemnya gampang banget, saya yang gaptek aja langsung bisa diajarin lewat video call.",
      date: "12 Agustus 2023"
    },
    {
      name: "Bu Ningsih",
      warung: "Toko Kelontong Ningsih",
      city: "Yogyakarta",
      quote: "Dulu sering berantem sama karyawan masalah stok rokok yang sering kurang. Sekarang tiap hari cocok. Harganya sangat sepadan dengan tenang pikiran saya. Nyesel nggak pakai dari dulu.",
      date: "5 November 2023"
    }
  ];

  return (
    <section className="py-24 px-4 sm:px-6 bg-vault-midnight relative overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-heading font-bold text-vault-cream mb-6">Kisah Nyata, Bukan Teori</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {testimonials.map((testi, idx) => (
            <div key={idx} className={`bg-vault-cream p-8 md:p-10 shadow-[0_10px_30px_rgba(0,0,0,0.8)] relative transform ${idx % 2 === 0 ? 'rotate-1' : '-rotate-1'} hover:rotate-0 transition-transform duration-300`}>
              <div className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="text-6xl text-vault-gold/40 font-serif mb-2 leading-none absolute -top-4 -left-2">"</div>
                <p className="text-vault-coffee text-lg leading-relaxed mb-8 italic flex-grow z-10">
                  {testi.quote}
                </p>
                
                <div className="flex flex-col sm:flex-row justify-between sm:items-end border-t border-vault-coffee/20 pt-6 gap-4 sm:gap-0">
                  <div>
                    <h4 className="font-heading font-bold text-vault-coffee text-lg">{testi.name}</h4>
                    <p className="text-vault-coffee/70 text-sm">{testi.warung} — {testi.city}</p>
                  </div>
                  <div className="font-serif italic text-vault-coffee/60 text-sm">
                    {testi.date}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
