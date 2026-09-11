"use client";
import React from 'react';
import { motion } from 'framer-motion';

export const ConciergeSection = () => {
  return (
    <section className="relative py-32 bg-vault-midnight overflow-hidden z-20">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-20">
          
          {/* Left: Copy */}
          <div className="w-full lg:w-1/2">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
            >
              <h2 className="font-heading font-bold text-5xl md:text-6xl text-vault-cream mb-8 leading-tight">
                VIP Concierge <br />
                <span className="text-vault-gold drop-shadow-[0_0_10px_rgba(197,160,89,0.5)]">Setup & Migrasi</span>
              </h2>
              <p className="text-2xl text-vault-cream/80 leading-relaxed font-medium mb-10">
                Lupakan buku panduan tebal. Anda adalah VIP. Tim Concierge kami akan memigrasikan data stok lama Anda, 
                mengatur sistem kasbon, dan memandu Anda secara personal via WhatsApp Video Call. 
                Bisnis jalan terus, transisi mulus.
              </p>
              
              <ul className="space-y-6">
                {[
                  "Migrasi data Excel/Buku ke Klola OS 100% dibantu",
                  "Video Call privat untuk panduan aplikasi",
                  "Grup WhatsApp VIP untuk kendala darurat 24/7"
                ].map((item, idx) => (
                  <motion.li 
                    key={idx}
                    className="flex items-center text-xl text-vault-cream font-medium"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 + (idx * 0.1) }}
                  >
                    <div className="w-8 h-8 rounded-full bg-vault-gold/20 border border-vault-gold flex items-center justify-center mr-6 shadow-[0_0_10px_rgba(197,160,89,0.3)]">
                      <div className="w-2.5 h-2.5 bg-vault-gold rounded-full" />
                    </div>
                    {item}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Right: Pure CSS 3D Smartphone Mockup */}
          <div className="w-full lg:w-1/2 flex justify-center perspective-1000">
            {/* The Background Glow to lift the phone */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-vault-gold blur-[120px] opacity-40 mix-blend-color-dodge rounded-full pointer-events-none -z-10" />
            
            <motion.div
              className="relative w-[320px] h-[640px] transform-style-3d"
              initial={{ opacity: 0, rotateY: 30, rotateX: 20, y: 50 }}
              whileInView={{ opacity: 1, rotateY: -15, rotateX: 10, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 1.2, type: "spring", bounce: 0.3 }}
            >
              {/* Phone Chassis (Thick Border & Shadow) */}
              <div className="absolute inset-0 bg-vault-oxblood border-[14px] border-vault-coffee rounded-[40px] shadow-[-30px_40px_60px_rgba(0,0,0,0.9),_inset_0_0_20px_rgba(255,255,255,0.05)] overflow-hidden flex flex-col">
                
                {/* Dynamic Island / Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-vault-coffee rounded-b-3xl z-30" />
                
                {/* Screen Content */}
                <div className="flex-1 bg-vault-midnight p-6 flex flex-col pt-12 relative">
                   {/* Internal Aurora */}
                   <div className="absolute top-0 left-0 w-full h-1/2 bg-vault-gold opacity-10 blur-3xl pointer-events-none mix-blend-screen" />
                   
                   <div className="w-full h-40 bg-vault-oxblood/50 border border-vault-gold/30 rounded-2xl mb-6 shadow-inner p-4 flex flex-col justify-between relative z-10">
                     <div className="w-12 h-12 bg-vault-gold/20 rounded-full flex items-center justify-center">
                        <div className="w-6 h-6 bg-vault-gold rounded-full shadow-[0_0_15px_rgba(197,160,89,1)]" />
                     </div>
                     <div>
                       <div className="w-3/4 h-3 bg-vault-cream/40 rounded-full mb-2" />
                       <div className="w-1/2 h-2 bg-vault-cream/20 rounded-full" />
                     </div>
                   </div>

                   <div className="space-y-4 relative z-10">
                     {[1,2,3].map(i => (
                       <div key={i} className="w-full h-16 bg-vault-coffee/40 border border-vault-cream/5 rounded-xl p-3 flex items-center shadow-inner">
                          <div className="w-10 h-10 bg-vault-midnight rounded-lg mr-4 border border-vault-cream/5" />
                          <div className="flex-1">
                            <div className="w-full h-2 bg-vault-cream/30 rounded-full mb-2" />
                            <div className="w-2/3 h-2 bg-vault-cream/10 rounded-full" />
                          </div>
                       </div>
                     ))}
                   </div>

                   {/* Floating CTA in Phone */}
                   <div className="absolute bottom-6 left-6 right-6 h-14 bg-vault-gold rounded-xl flex items-center justify-center shadow-[0_10px_20px_rgba(197,160,89,0.4)] z-10">
                     <div className="w-1/2 h-3 bg-vault-midnight/50 rounded-full" />
                   </div>
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
};
