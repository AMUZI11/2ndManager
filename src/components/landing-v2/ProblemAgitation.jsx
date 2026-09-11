"use client";
import React from 'react';
import { motion } from 'framer-motion';

const painPoints = [
  {
    title: "Piutang Lupa Dicatat",
    description: "Buku lecek, catatan hilang, pelanggan ngeles. Uang Anda menguap tanpa jejak.",
    icon: "📓"
  },
  {
    title: "Stok Barang Selisih",
    description: "Kelihatannya laris, tapi pas dihitung akhir bulan uangnya nggak ada. Bocor halus yang mematikan.",
    icon: "📦"
  },
  {
    title: "Karyawan Susah Diawasi",
    description: "Anda tidak bisa 24 jam di warung. Celah kecurangan terbuka lebar saat Anda tidak ada.",
    icon: "👁️"
  }
];

export function ProblemAgitation() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: 'spring', stiffness: 300, damping: 30 }
    }
  };

  return (
    <section className="py-24 md:py-32 px-4 sm:px-6 max-w-6xl mx-auto border-t border-vault-coffee/50">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
        
        {/* Left Aligned Editorial */}
        <div className="lg:col-span-5 relative">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-vault-cream mb-6 leading-tight">
              Realitanya, Warung Anda Sedang <span className="text-vault-brick-light">Berdarah</span>.
            </h2>
            <p className="text-lg text-vault-cream/80 leading-relaxed font-sans">
              Setiap kali Anda menunda memperbaiki sistem, Anda sedang mensubsidi kebocoran. 
              Bukan karena warung sepi, tapi karena sistem manual Anda tidak bisa lagi menahan laju transaksi.
            </p>
          </motion.div>
        </div>

        {/* Icon Grid */}
        <div className="lg:col-span-7">
          <motion.div 
            className="flex flex-col gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {painPoints.map((point, index) => (
              <motion.div 
                key={index} 
                variants={itemVariants}
                className="flex items-start gap-6 group"
              >
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-vault-oxblood border border-vault-coffee flex items-center justify-center text-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] group-hover:border-vault-gold/30 transition-colors duration-300">
                  {point.icon}
                </div>
                <div>
                  <h3 className="text-xl font-heading font-bold text-vault-cream mb-2 group-hover:text-vault-gold transition-colors duration-300">{point.title}</h3>
                  <p className="text-vault-cream/70 leading-relaxed">{point.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

      </div>
    </section>
  );
}
