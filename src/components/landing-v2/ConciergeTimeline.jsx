"use client";
import React from 'react';
import { motion } from 'framer-motion';

const steps = [
  {
    num: "01",
    title: "Audit Kebocoran",
    desc: "Tim kami akan menganalisis titik-titik lemah dalam pencatatan manual Anda saat ini."
  },
  {
    num: "02",
    title: "Instalasi Brankas",
    desc: "Aplikasi disiapkan khusus untuk struktur produk dan harga warung Anda. Tinggal pakai."
  },
  {
    num: "03",
    title: "Kawal Sampai Bisa",
    desc: "Bukan dilepas begitu saja. Kami mendampingi Anda dan karyawan sampai sistem berjalan mulus."
  }
];

export function ConciergeTimeline() {
  return (
    <section className="py-24 md:py-32 px-4 sm:px-6 relative overflow-hidden bg-vault-oxblood/30 border-y border-vault-coffee">
      <div className="max-w-5xl mx-auto relative z-10">
        
        <div className="flex flex-col md:flex-row gap-16 items-center">
          
          <div className="md:w-1/3">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-vault-cream mb-6 leading-tight">
              Layanan <span className="text-vault-gold italic">Concierge</span>
            </h2>
            <p className="text-vault-cream/80 text-lg leading-relaxed">
              Kami tahu Anda sibuk. Anda tidak punya waktu untuk belajar software rumit. Oleh karena itu, kami yang akan bekerja untuk Anda.
            </p>
          </div>

          <div className="md:w-2/3 w-full">
            <div className="space-y-12 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-vault-coffee before:to-transparent">
              
              {steps.map((step, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: idx * 0.2 }}
                  className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-vault-midnight bg-vault-oxblood text-vault-gold shadow shadow-vault-gold/20 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10 font-mono font-bold text-sm">
                    {step.num}
                  </div>
                  
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 bg-vault-midnight/50 border border-vault-coffee rounded-xl shadow-vault-btn group-hover:border-vault-gold/30 transition-colors">
                    <h3 className="font-heading font-bold text-xl text-vault-cream mb-2">{step.title}</h3>
                    <p className="text-vault-cream/70">{step.desc}</p>
                  </div>
                </motion.div>
              ))}

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
