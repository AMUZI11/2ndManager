"use client";
import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import PremiumButton from './PremiumButton';
import { useRouter } from 'next/navigation';

export default function Hero() {
  const container = useRef(null);
  const router = useRouter();

  useGSAP(() => {
    // Cinematic Fade & Reveal - stagger elements
    gsap.from(".hero-element", {
      y: 40,
      opacity: 0,
      scale: 0.95,
      duration: 1.2,
      stagger: 0.15,
      ease: "power3.out",
      delay: 0.2
    });
  }, { scope: container });

  return (
    <section 
      ref={container}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#3D1A0F] px-4 md:px-8 py-32"
    >
      {/* Background Gradient/Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#6B2D1C] rounded-full blur-[120px] opacity-50 pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center text-center">
        
        {/* Badge */}
        <div className="hero-element mb-8">
          <span className="px-4 py-1.5 rounded-full border border-[#C2A36B]/30 bg-[#C2A36B]/10 text-[#C2A36B] font-medium tracking-wide text-sm md:text-base backdrop-blur-md">
            Khusus Pemilik Bisnis HL
          </span>
        </div>

        {/* Main Headline */}
        <h1 className="hero-element font-['Cabinet_Grotesk',sans-serif] text-[clamp(2.5rem,6vw,5.5rem)] font-bold text-[#F5F2EA] leading-[1.1] tracking-tight mb-8">
          Kelola Bisnis Anda <br className="hidden md:block"/> 
          <span className="text-[#C2A36B]">Tanpa Menguras Waktu.</span>
        </h1>

        {/* Subtitle */}
        <p className="hero-element text-lg md:text-2xl text-[#F5F2EA]/80 max-w-2xl font-['Satoshi',sans-serif] mb-12 leading-relaxed">
          Sistem pembukuan premium yang dirancang khusus untuk kemudahan dan keamanan pencatatan transaksi kasir Anda.
        </p>

        {/* CTA */}
        <div className="hero-element flex flex-col sm:flex-row items-center gap-4">
          <PremiumButton variant="primary" onClick={() => router.push('/login')}>
            Masuk ke Sistem
          </PremiumButton>
          <PremiumButton variant="glass" onClick={() => {
            const featureSection = document.getElementById('features');
            if(featureSection) {
              featureSection.scrollIntoView({ behavior: 'smooth' });
            }
          }}>
            Lihat Fitur
          </PremiumButton>
        </div>

      </div>
    </section>
  );
}
