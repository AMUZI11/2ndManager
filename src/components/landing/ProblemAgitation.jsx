"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LeakCalculator } from './LeakCalculator';
import { FileWarning, PackageMinus, HandCoins } from 'lucide-react';

const VaultDoor = ({ title, description, icon: Icon, isOpen, onClick }) => {
  return (
    <div className="relative perspective-1000 w-full aspect-[4/5] md:aspect-auto md:h-80 max-w-sm mx-auto cursor-pointer" onClick={onClick}>
      <div className="absolute inset-0 bg-[#0a0a0a] border border-vault-coffee rounded-sm p-6 flex flex-col items-center justify-center text-center">
        <Icon className="w-12 h-12 text-vault-brick-light mb-4 opacity-80" />
        <p className="text-vault-cream/90 text-sm md:text-base leading-relaxed">{description}</p>
      </div>

      <motion.div
        className="absolute inset-0 origin-left transform-style-3d bg-vault-oxblood/80 backdrop-blur-md border border-vault-gold/40 shadow-[inset_1px_1px_0_rgba(212,175,55,0.4),_5px_5px_15px_rgba(0,0,0,0.8)] rounded-sm flex flex-col items-center justify-center p-6"
        animate={{ rotateY: isOpen ? -105 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 60 }}
        style={{ backfaceVisibility: 'hidden' }}
      >
        <div className="w-16 h-16 rounded-full border-4 border-vault-gold/50 mb-6 flex items-center justify-center shadow-inner">
          <div className="w-8 h-8 rounded-full border-2 border-vault-gold/80 flex items-center justify-center">
             <div className="w-2 h-2 bg-vault-gold rounded-full"></div>
          </div>
        </div>
        <h4 className="text-xl font-heading font-bold text-vault-gold text-center">{title}</h4>
        <div className="mt-4 text-xs uppercase tracking-widest text-vault-cream/50">Ketuk untuk buka</div>
      </motion.div>
    </div>
  );
};

export function ProblemAgitation() {
  const [openDoors, setOpenDoors] = useState([false, false, false]);

  const toggleDoor = (index) => {
    const newDoors = [...openDoors];
    newDoors[index] = !newDoors[index];
    setOpenDoors(newDoors);
  };

  const problems = [
    {
      title: "Uang Kasbon Menguap",
      description: "Catatan utang di buku lecek sering hilang atau sulit ditagih. Uang warung tertahan berminggu-minggu tanpa kejelasan.",
      icon: HandCoins
    },
    {
      title: "Stok Barang Susut",
      description: "Karyawan Bapak/Ibu bisa saja bilang stoknya emang segitu. Sistem ini yang akan membuktikan sebaliknya.",
      icon: PackageMinus
    },
    {
      title: "Harga Modal Lupa",
      description: "Kulakan beda harga tapi jual tetap sama. Margin keuntungan tergerus pelan-pelan tanpa disadari.",
      icon: FileWarning
    }
  ];

  return (
    <section className="relative py-24 px-4 sm:px-6 bg-[#0f1115]">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-vault-gold/30 to-transparent"></div>
      
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-heading font-bold text-vault-cream mb-6">3 Pencuri Terbesar di Warung Anda</h2>
          <p className="text-vault-cream/70 text-lg max-w-2xl mx-auto font-light">
            Mereka tidak masuk lewat pintu depan. Mereka sembunyi di balik catatan yang berantakan dan ingatan yang terbatas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 mb-20">
          {problems.map((prob, idx) => (
            <VaultDoor 
              key={idx} 
              title={prob.title} 
              description={prob.description} 
              icon={prob.icon}
              isOpen={openDoors[idx]} 
              onClick={() => toggleDoor(idx)} 
            />
          ))}
        </div>

        <LeakCalculator />
      </div>
    </section>
  );
}
