"use client";
import React from 'react';
import { SmokedGlassPlate } from '../ui/SmokedGlassPlate';
import { ShieldCheck, Eye, History } from 'lucide-react';

export function FeaturesSection() {
  const features = [
    {
      title: "Detektor Stok Presisi",
      outcome: "Karyawan tidak bisa lagi bilang barangnya emang segitu dari sononya. Anda tahu ada kebocoran sebelum mereka sempat menutupinya.",
      icon: ShieldCheck
    },
    {
      title: "Pengawasan Piutang Otomatis",
      outcome: "Tidak ada lagi buku catatan yang hilang. Anda tahu persis siapa yang berutang, berapa, dan sejak kapan.",
      icon: Eye
    },
    {
      title: "Jejak Audit Harga Modal",
      outcome: "Perubahan harga modal terekam permanen. Anda bisa menaikkan harga jual tepat waktu sebelum rugi.",
      icon: History
    }
  ];

  return (
    <section className="relative py-24 px-4 sm:px-6 overflow-hidden bg-vault-midnight">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-vault-oxblood/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none"></div>
      
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-heading font-bold text-vault-cream mb-6">Sistem Pengunci Kebocoran</h2>
          <p className="text-vault-cream/70 text-lg max-w-2xl mx-auto font-light">
            Dirancang bukan sekadar untuk mencatat, tapi untuk melindungi.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feat, idx) => (
            <SmokedGlassPlate key={idx} className="flex flex-col h-full">
              <div className="mb-6 text-vault-gold">
                <feat.icon size={48} strokeWidth={1} />
              </div>
              <h3 className="text-xl md:text-2xl font-heading font-bold text-vault-cream mb-4">{feat.title}</h3>
              <p className="text-vault-cream/80 text-sm md:text-base leading-relaxed flex-grow">
                {feat.outcome}
              </p>
            </SmokedGlassPlate>
          ))}
        </div>
      </div>
    </section>
  );
}
