"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../ui/GlassCard';

export const AgitationSection = () => {
  return (
    <section className="relative py-32 bg-vault-midnight z-20">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div 
          className="text-center mb-24"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
        >
          <h2 className="font-heading font-bold text-5xl md:text-6xl text-vault-cream mb-8">
            Pencuri Terbesar Bukanlah Pesaing Anda
          </h2>
          <p className="text-2xl text-vault-cream/80 max-w-3xl mx-auto leading-relaxed">
            Mereka adalah sistem yang rapuh. Kami membangun Klola OS untuk menjaga agar hasil keringat Anda
            tidak menguap begitu saja.
          </p>
        </motion.div>

        {/* Gapless / Asymmetrical Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Card 1: Wide */}
          <motion.div
            className="lg:col-span-2 h-full"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.8, delay: 0.1, type: "spring", bounce: 0.3 }}
          >
            <GlassCard className="transition-all duration-500 hover:border-vault-gold/80 hover:shadow-[0_0_40px_rgba(197,160,89,0.15)]" withAurora={false}>
              <div className="flex flex-col h-full justify-between gap-8">
                <div className="bg-vault-midnight/80 rounded-xl p-8 border-t border-l border-vault-gold/10 border-r border-b border-black flex items-center justify-center min-h-[200px] shadow-inner">
                  {/* Abstract representation of debt */}
                  <div className="flex space-x-3 w-full max-w-[80%]">
                    <div className="w-1/4 h-3 bg-vault-brick-dark rounded-full shadow-[0_0_10px_rgba(130,32,18,0.8)]" />
                    <div className="w-1/4 h-3 bg-vault-brick-light rounded-full shadow-[0_0_15px_rgba(179,54,34,0.8)]" />
                    <div className="w-1/2 h-3 bg-vault-gold rounded-full shadow-[0_0_20px_rgba(197,160,89,0.8)]" />
                  </div>
                </div>
                <div>
                  <h3 className="font-heading font-bold text-4xl text-vault-cream drop-shadow-md mb-4">Kasbon Macet</h3>
                  <p className="text-vault-cream/80 text-xl leading-relaxed font-medium">
                    Setiap rupiah kasbon yang tidak tercatat adalah keringat Anda yang dicuri perlahan. 
                    Sistem piutang Klola OS adalah benteng psikologis Anda—mencatat otomatis tanpa celah bantahan, 
                    menghilangkan rasa sungkan saat menagih hak keluarga Anda.
                  </p>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Card 2: Tall */}
          <motion.div
            className="lg:col-span-1 h-full"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.8, delay: 0.2, type: "spring", bounce: 0.3 }}
          >
            <GlassCard className="transition-all duration-500 hover:border-vault-gold/80 hover:shadow-[0_0_40px_rgba(197,160,89,0.15)]" withAurora={false}>
              <div className="flex flex-col h-full justify-between gap-8">
                <div className="bg-vault-midnight/80 rounded-xl p-8 border-t border-l border-vault-gold/10 border-r border-b border-black flex flex-col items-center justify-center space-y-6 min-h-[200px] shadow-inner">
                  {/* Abstract representation of inventory */}
                  <div className="w-full h-10 border border-vault-gold/30 bg-vault-coffee/50 rounded-lg flex items-center px-3 shadow-inner"><div className="w-3/4 h-2 bg-vault-gold/80 rounded-full drop-shadow-[0_0_5px_rgba(197,160,89,0.8)]" /></div>
                  <div className="w-full h-10 border border-vault-brick-light/50 bg-vault-brick-dark/30 rounded-lg flex items-center px-3 shadow-inner"><div className="w-1/2 h-2 bg-vault-brick-light rounded-full drop-shadow-[0_0_5px_rgba(179,54,34,0.8)]" /></div>
                </div>
                <div>
                  <h3 className="font-heading font-bold text-4xl text-vault-cream drop-shadow-md mb-4">Stok Selisih</h3>
                  <p className="text-vault-cream/80 text-xl leading-relaxed font-medium">
                    Malam hari Anda lelah, namun jumlah barang dan uang tidak pernah sinkron. 
                    Hentikan pendarahan ini. Pantau pergerakan setiap item secara real-time. Tidak ada lagi stok gaib.
                  </p>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Card 3: Wide Full */}
          <motion.div
            className="md:col-span-2 lg:col-span-3 h-full mt-2"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.8, delay: 0.3, type: "spring", bounce: 0.3 }}
          >
            <GlassCard className="transition-all duration-500 hover:border-vault-gold/80 hover:shadow-[0_0_60px_rgba(197,160,89,0.2)]" withAurora={true}>
              <div className="flex flex-col md:flex-row items-center gap-12">
                <div className="flex-1">
                  <h3 className="font-heading font-bold text-4xl text-vault-cream drop-shadow-md mb-4">Harga Modal Bocor</h3>
                  <p className="text-vault-cream/80 text-xl leading-relaxed font-medium">
                    Harga beli dari suplier naik diam-diam, namun staf Anda tetap menjual dengan harga lama. 
                    Warisan bisnis Anda perlahan tergerus inflasi terselubung ini. Klola OS secara otomatis memblokir 
                    penjualan di bawah modal. Sebuah perisai pelindung margin yang aktif 24/7.
                  </p>
                </div>
                <div className="w-full md:w-1/3 bg-vault-midnight/80 rounded-xl p-10 border-t border-l border-vault-gold/30 border-r border-b border-black flex items-center justify-center shadow-inner relative overflow-hidden">
                  <div className="absolute inset-0 bg-vault-gold opacity-10 mix-blend-color-dodge pointer-events-none" />
                  <div className="text-center relative z-10">
                    <p className="text-vault-cream/70 uppercase text-sm tracking-widest mb-3 font-bold">Margin Guard</p>
                    <p className="text-vault-gold font-bold text-4xl drop-shadow-[0_0_15px_rgba(197,160,89,0.8)] tracking-tight">ACTIVE</p>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>

        </div>
      </div>
    </section>
  );
};
