"use client";
import React from 'react';
import { motion } from 'framer-motion';

export function ConciergeWorkflow() {
  const steps = [
    {
      title: "Purchase & Serah Terima",
      desc: "Anda mendaftar, tim Concierge kami langsung mengambil alih persiapan teknis.",
      image: "https://images.unsplash.com/photo-1556761175-5973dc0f32b7?q=80&w=400&h=300&fit=crop"
    },
    {
      title: "Migrasi Data Warisan",
      desc: "Kami pindahkan data dari buku lecek Anda ke sistem tanpa Anda perlu mengetik.",
      image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=400&h=300&fit=crop"
    },
    {
      title: "Video Call Privat",
      desc: "Sesi 1-on-1 bersama pakar kami, khusus untuk mengajarkan Anda tanpa jargon rumit.",
      image: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=400&h=300&fit=crop"
    },
    {
      title: "Klub VIP 24/7",
      desc: "Grup WA khusus untuk Anda bertanya kapan saja. Kami selalu siap membantu.",
      image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=400&h=300&fit=crop"
    }
  ];

  return (
    <section className="py-24 px-4 sm:px-6 bg-vault-midnight overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-heading font-bold text-vault-cream mb-6">Jalur Pewarisan (VIP Concierge)</h2>
          <p className="text-vault-cream/70 text-lg max-w-2xl mx-auto font-light">
            Kami tahu Bapak/Ibu takut ribet. Anda tidak perlu menyentuh pengaturan rumit; biar kami yang mengurusnya.
          </p>
        </div>

        <div className="relative">
          {/* Garis emas tipis (Timeline) untuk Desktop */}
          <div className="hidden md:block absolute top-[120px] left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-vault-gold/50 to-transparent"></div>
          {/* Garis emas tipis (Timeline) untuk Mobile */}
          <div className="block md:hidden absolute left-[30px] top-[10%] bottom-[10%] w-[1px] bg-gradient-to-b from-transparent via-vault-gold/50 to-transparent"></div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-6 relative">
            {steps.map((step, idx) => (
              <motion.div 
                key={idx} 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: idx * 0.15 }}
                className="relative flex md:flex-col items-center md:text-center gap-6 md:gap-0"
              >
                {/* Timeline node */}
                <div className="hidden md:block w-3 h-3 bg-vault-midnight border-2 border-vault-gold rounded-full absolute -top-[5.5px] z-10"></div>
                
                {/* Number indicator for mobile */}
                <div className="md:hidden flex-shrink-0 w-8 h-8 rounded-full bg-vault-oxblood border border-vault-gold flex items-center justify-center text-vault-gold font-heading z-10 ml-[15px]">
                  {idx + 1}
                </div>
                
                <div className="flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32 md:w-32 md:h-32 rounded-sm overflow-hidden md:mb-6 border border-vault-coffee grayscale hover:grayscale-0 transition-all duration-500 z-20 bg-vault-midnight shadow-[0_10px_20px_rgba(0,0,0,0.5)] md:mt-16">
                  <img src={step.image} alt={step.title} className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" />
                </div>
                
                <div className="flex-grow">
                  <div className="hidden md:flex w-8 h-8 mx-auto rounded-full bg-vault-oxblood border border-vault-gold items-center justify-center text-vault-gold font-heading mb-4 text-sm">
                    {idx + 1}
                  </div>
                  <h4 className="text-xl font-heading font-bold text-vault-cream mb-2 md:mb-3">{step.title}</h4>
                  <p className="text-vault-cream/60 text-sm md:px-2 leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
