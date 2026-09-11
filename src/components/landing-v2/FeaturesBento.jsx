"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { VaultGlass } from '@/components/ui/VaultGlass';

const features = [
  {
    title: "Mesin Kasir Tanpa Sinyal",
    description: "Internet mati? Listrik byar-pet? Kasir tetap jalan. Data akan sinkron otomatis saat koneksi kembali. Jangan biarkan gangguan teknis menghentikan omzet Anda.",
    colSpan: "col-span-1 md:col-span-2 lg:col-span-2",
    icon: "🔌"
  },
  {
    title: "Buku Piutang Anti-Ngelak",
    description: "Catat hutang pelanggan dengan bukti digital. Kirim tagihan profesional via WhatsApp dengan satu klik.",
    colSpan: "col-span-1 lg:col-span-1",
    icon: "📱"
  },
  {
    title: "Laporan Arus Kas Level Bank",
    description: "Lupakan buku catatan lecek. Pantau uang masuk, keluar, dan laba bersih secara real-time dari HP Anda, kapan saja, di mana saja.",
    colSpan: "col-span-1 lg:col-span-1",
    icon: "📊"
  },
  {
    title: "Manajemen Stok Otomatis",
    description: "Peringatan stok habis sebelum barang benar-benar kosong. Cegah penolakan pembeli yang merusak reputasi warung Anda.",
    colSpan: "col-span-1 md:col-span-2 lg:col-span-2",
    icon: "📦"
  }
];

export function FeaturesBento() {
  return (
    <section className="py-24 md:py-32 px-4 sm:px-6 max-w-6xl mx-auto border-t border-vault-coffee/50">
      
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-heading font-bold text-vault-cream mb-6">
          Sistem <span className="text-vault-gold">Pertahanan</span> Warung
        </h2>
        <p className="text-lg text-vault-cream/70 max-w-2xl mx-auto">
          Fitur yang dirancang bukan untuk terlihat canggih, tapi untuk menutup celah kebocoran uang Anda tanpa ampun.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: idx * 0.1, ease: "easeOut" }}
            className={feature.colSpan}
          >
            <VaultGlass tier={2} className="h-full p-8 flex flex-col justify-between group hover:border-vault-gold/40 transition-colors duration-500">
              <div>
                <div className="text-4xl mb-6 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all origin-left duration-500">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-heading font-bold text-vault-cream mb-4">
                  {feature.title}
                </h3>
                <p className="text-vault-cream/70 leading-relaxed">
                  {feature.description}
                </p>
              </div>
              
              {/* Optional mechanical detail line at the bottom */}
              <div className="w-8 h-[2px] bg-vault-coffee mt-8 group-hover:bg-vault-gold/50 group-hover:w-16 transition-all duration-500"></div>
            </VaultGlass>
          </motion.div>
        ))}
      </div>
      
    </section>
  );
}
