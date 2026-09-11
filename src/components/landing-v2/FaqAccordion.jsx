"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const faqs = [
  {
    q: "Apakah data saya aman kalau HP hilang?",
    a: "100% Aman. Data Anda tersimpan di server cloud (brankas digital) kami, bukan di memori HP. Tinggal login di HP baru, semua data, stok, dan piutang langsung kembali seperti semula."
  },
  {
    q: "Gimana kalau warung saya susah sinyal internet?",
    a: "Klola OS dirancang dengan teknologi 'Offline-First'. Anda tetap bisa mencatat transaksi dan hutang meski tanpa internet. Saat sinyal kembali, sistem akan otomatis sinkronisasi ke server."
  },
  {
    q: "Saya gaptek, takut nggak ngerti pakainya.",
    a: "Itu sebabnya kami punya Layanan Concierge. Kami yang akan memasukkan data barang dan harga Anda di awal. Kami juga akan mendampingi Anda sampai benar-benar lancar menggunakannya. Ini komitmen kami."
  },
  {
    q: "Apakah ada biaya tersembunyi selain langganan bulanan?",
    a: "Tidak ada. Rp 199.000/bulan adalah harga nett. Sudah termasuk update sistem, backup data, dan bantuan customer service prioritas."
  }
];

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="py-24 md:py-32 px-4 sm:px-6 max-w-4xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-heading font-bold text-vault-cream mb-6">
          Pertanyaan <span className="text-vault-gold">Pemilik Warung</span>
        </h2>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          
          return (
            <div 
              key={idx}
              className={`border transition-colors duration-300 rounded-lg overflow-hidden ${isOpen ? 'border-vault-gold/40 bg-vault-oxblood/40' : 'border-vault-coffee bg-vault-midnight'}`}
            >
              <button
                onClick={() => setOpenIndex(isOpen ? -1 : idx)}
                className="w-full text-left px-6 py-6 flex items-center justify-between gap-4 focus:outline-none"
              >
                <span className={`font-heading font-bold text-lg md:text-xl transition-colors ${isOpen ? 'text-vault-gold' : 'text-vault-cream'}`}>
                  {faq.q}
                </span>
                <span className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-vault-coffee/50 text-vault-gold">
                  {isOpen ? '−' : '+'}
                </span>
              </button>
              
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="px-6 pb-6 text-vault-cream/70 leading-relaxed">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
