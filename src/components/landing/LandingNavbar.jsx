"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function LandingNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    const handleScroll = () => {
      if (isMounted) {
        setIsScrolled(window.scrollY > 50);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      isMounted = false;
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  function scrollToSection(targetId) {
    const NAVBAR_HEIGHT = 80;
    const element = document.getElementById(targetId);
    if (!element) return;
    const targetY = element.getBoundingClientRect().top + window.scrollY - NAVBAR_HEIGHT;
    const start = window.scrollY;
    const distance = targetY - start;
    const duration = 300;
    let startTime = null;
    function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }
    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      window.scrollTo(0, start + distance * easeOutExpo(progress));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  const handleNavClick = (e, targetId) => {
    e.preventDefault();
    if (isMobileMenuOpen) setIsMobileMenuOpen(false);
    if (pathname === "/") {
      scrollToSection(targetId);
    } else {
      router.push(`/#${targetId}`);
    }
  };

  const navLinks = [
    { name: "Cara Kerja", id: "cara-kerja" },
    { name: "Kalkulator Rugi", id: "kalkulator-rugi" },
    { name: "Gaji Manajer", id: "gaji-manajer" },
  ];

  return (
    <>
      <div className="fixed w-full top-4 z-50 px-4 flex justify-center">
        <motion.nav
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 100 }}
          className={`bg-white/90 backdrop-blur-sm brutal-border brutal-shadow rounded-full px-4 flex items-center justify-between w-full max-w-6xl transition-all duration-300 ${
            isScrolled ? "py-1" : "py-2"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="bg-neon font-bold text-sm w-8 h-8 flex items-center justify-center rounded-xl border-2 border-black text-black">
              2M
            </div>
            <div className="leading-none hidden sm:block">
              <h1 className="font-bold text-lg tracking-tight text-black">2ndManager</h1>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-[11px] font-mono-custom font-bold text-gray-500 tracking-wider uppercase">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={(e) => handleNavClick(e, link.id)}
                className="hover:text-black transition-colors"
              >
                {link.name}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-xs font-bold text-black hover:underline px-4">
              Masuk
            </Link>
            <Link href="/login?mode=register" className="bg-neon text-black brutal-border brutal-shadow font-bold uppercase px-4 py-2 rounded-full text-xs hover:brutal-shadow-hover transition-all">
              REKRUT 2NDMANAGER
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center">
             <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                className="text-black p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-black/5 active:scale-95 transition-all"
                aria-label="Toggle navigasi mobile"
             >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                </svg>
             </button>
          </div>
        </motion.nav>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden"
            />
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              className="fixed top-20 left-4 right-4 bg-white brutal-border brutal-shadow-lg rounded-2xl z-40 p-5 md:hidden flex flex-col gap-4 max-w-sm mx-auto"
            >
              {navLinks.map((link) => (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  onClick={(e) => handleNavClick(e, link.id)}
                  className="text-sm font-mono-custom font-bold text-black border-b border-gray-100 pb-2.5 uppercase min-h-[44px] flex items-center hover:text-black/70 transition-colors"
                >
                  {link.name}
                </a>
              ))}
              <div className="pt-2 flex flex-col gap-3">
                <Link 
                  href="/login" 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="text-sm font-bold text-black py-2.5 text-center border-2 border-black rounded-xl hover:bg-gray-50 min-h-[44px] flex items-center justify-center font-mono-custom uppercase tracking-wider"
                >
                  Masuk Akun
                </Link>
                <Link 
                  href="/login?mode=register" 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="bg-neon text-black brutal-border brutal-shadow font-bold uppercase w-full py-3 rounded-xl text-center text-xs font-mono-custom min-h-[44px] flex items-center justify-center active:translate-x-0.5 active:translate-y-0.5"
                >
                  REKRUT 2NDMANAGER
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
