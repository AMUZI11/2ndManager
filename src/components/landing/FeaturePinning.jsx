"use client";
import React, { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import GlassCard from './GlassCard';

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function FeaturePinning() {
  const container = useRef(null);
  const scrollWrapper = useRef(null);

  useGSAP(() => {
    // Determine how much we need to scroll horizontally based on the content width
    const getScrollAmount = () => {
      let wrapperWidth = scrollWrapper.current.scrollWidth;
      return -(wrapperWidth - window.innerWidth);
    };

    const tween = gsap.to(scrollWrapper.current, {
      x: getScrollAmount,
      ease: "none"
    });

    ScrollTrigger.create({
      trigger: container.current,
      start: "top top",
      end: () => `+=${getScrollAmount() * -1}`,
      pin: true,
      animation: tween,
      scrub: 1,
      invalidateOnRefresh: true,
    });
    
    return () => {
      tween.kill();
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, { scope: container });

  const features = [
    {
      title: "Pencatatan Penjualan",
      description: "Kasir dapat mencatat penjualan dengan sangat cepat tanpa perlu pelatihan khusus.",
      icon: "💵"
    },
    {
      title: "Stok Opname Terpusat",
      description: "Lacak jumlah barang secara akurat. Draf oleh kasir, persetujuan hanya oleh Anda.",
      icon: "📦"
    },
    {
      title: "Laporan & Export CSV",
      description: "Unduh laporan penjualan dan stok lengkap ke dalam Excel dengan satu klik.",
      icon: "📊"
    },
    {
      title: "Audit Kasir & Rekap Shift",
      description: "Pantau kepatuhan blind closing, selisih laci kasir, dan ringkasan omzet harian secara real-time.",
      icon: "🛡️"
    }
  ];

  return (
    <section ref={container} id="features" className="relative h-screen bg-[#3D1A0F] overflow-hidden flex items-center">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#6B2D1C] rounded-full blur-[150px] opacity-30 pointer-events-none"></div>

      <div className="absolute top-12 left-4 md:left-12 z-20">
        <h2 className="text-[#C2A36B] text-xl md:text-3xl font-bold font-['Cabinet_Grotesk',sans-serif] tracking-wider">
          FITUR PREMIUM
        </h2>
      </div>

      <div ref={scrollWrapper} className="flex flex-nowrap h-[60vh] md:h-[50vh] min-w-max items-center px-4 md:px-[20vw] gap-8 mt-16">
        {features.map((feature, i) => (
          <div key={i} className="w-[85vw] md:w-[35vw] h-full shrink-0">
            <GlassCard glow={true}>
              <div className="text-4xl md:text-6xl mb-6">{feature.icon}</div>
              <h3 className="text-2xl md:text-3xl font-bold text-[#F5F2EA] mb-4 font-['Cabinet_Grotesk',sans-serif]">
                {feature.title}
              </h3>
              <p className="text-[#F5F2EA]/80 text-lg md:text-xl font-['Satoshi',sans-serif] leading-relaxed">
                {feature.description}
              </p>
            </GlassCard>
          </div>
        ))}
      </div>
    </section>
  );
}
