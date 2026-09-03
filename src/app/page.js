"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import LandingNavbar from "@/components/landing/LandingNavbar";

export default function LandingPage() {
  const revealVariant = {
    hidden: { opacity: 0, y: 40 },
    visible: (custom = 0) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1],
        delay: custom * 0.1,
      },
    }),
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden bg-[#fdfaf6] relative">
      {/* Navbar */}
      <LandingNavbar />

      {/* Hero Section */}
      <main className="hero-gradient pt-28 sm:pt-36 pb-16 sm:pb-24 px-4 min-h-[100dvh] flex items-center relative overflow-hidden border-b-4 border-black">
        <div className="hidden xl:block absolute left-4 top-1/2 -rotate-90 origin-left text-[10px] font-mono-custom text-gray-400 tracking-[0.3em] opacity-50 pointer-events-none">
          SYSTEM.ACTIVE // V.2.0
        </div>

        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center z-10">
          <motion.div
            variants={revealVariant}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 bg-white brutal-border rounded-full px-3.5 py-1 sm:px-4 sm:py-1.5 mb-6 sm:mb-8 text-[11px] sm:text-xs font-mono-custom font-bold text-black shadow-brutal-sm max-w-full truncate">
              <span className="w-2 h-2 bg-neon rounded-full border border-black shrink-0"></span>
              <span className="truncate">2NDMANAGER • SISTEM AUTOPILOT WARUNG</span>
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-[84px] font-black tracking-tighter leading-[0.92] mb-6 text-black uppercase">
              WARUNG ANDA, <br />
              <span className="font-serif-italic font-normal tracking-normal text-3xl sm:text-5xl md:text-6xl lg:text-[72px] lowercase">
                sepenuhnya
              </span>{" "}
              <br />
              BERES.
              <div className="w-2/3 max-w-[280px] h-2.5 sm:h-3 bg-neon mt-2 border-black border-2 rounded-full"></div>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-gray-700 mb-8 sm:mb-10 max-w-md leading-relaxed">
              2ndManager adalah <strong>manajer kedua</strong> yang bekerja 24
              jam — mencatat stok, mengawasi kasir, dan mengirim
              laporan ke HP Anda setiap pukul <strong>06:00</strong>. Anda cukup
              tidur.
            </p>

            <div className="flex flex-col sm:flex-row gap-3.5 sm:gap-4 items-stretch sm:items-center w-full">
              <Link href="/login?mode=register" className="w-full sm:w-auto block">
                <motion.button
                  whileHover={{ x: 3, y: 3, boxShadow: "2px 2px 0px #000" }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-neon text-black brutal-border brutal-shadow rounded-2xl px-6 sm:px-8 py-3.5 sm:py-4 font-bold text-base sm:text-lg flex items-center gap-2 w-full justify-center uppercase min-h-[50px] active:translate-x-0.5 active:translate-y-0.5"
                >
                  REKRUT 2NDMANAGER
                </motion.button>
              </Link>
              <Link href="/login?mode=register" className="w-full sm:w-auto block">
                <motion.button
                  whileHover={{ x: 3, y: 3, boxShadow: "2px 2px 0px #000" }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-white text-black brutal-border brutal-shadow rounded-2xl px-6 sm:px-8 py-3.5 sm:py-4 font-bold text-base sm:text-lg flex items-center gap-2 w-full justify-center uppercase min-h-[50px] active:translate-x-0.5 active:translate-y-0.5"
                >
                  AKTIFKAN SISTEM
                </motion.button>
              </Link>
            </div>

            <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] font-mono-custom text-gray-500 tracking-wider font-bold uppercase">
              <span>TANPA INSTALL RUMIT</span> •
              <span>SETUP 1 HARI</span> •
              <span>DATA AMAN</span>
            </div>
          </motion.div>

          {/* Right Mockup */}
          <motion.div
            variants={revealVariant}
            custom={2}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="relative w-full max-w-md sm:max-w-lg mx-auto lg:ml-auto perspective-1000 mt-8 lg:mt-0"
          >
            <motion.div
              animate={{ y: [-4, 4, -4] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="absolute -top-4 right-2 sm:-top-4 sm:right-8 bg-neon text-black brutal-border brutal-shadow px-3 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-xs font-bold font-mono-custom rotate-[-3deg] sm:rotate-[-6deg] z-20"
            >
              SISTEM ANTI-BOCOR ⚡
            </motion.div>

            <motion.div
              whileHover={{ rotate: 0 }}
              className="bg-white brutal-border brutal-shadow sm:brutal-shadow-lg rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 relative z-10 rotate-0 sm:rotate-1 transition-transform duration-500 text-black border-2 sm:border-[3px]"
            >
              <div className="flex justify-between items-center mb-4 border-b-2 border-gray-100 pb-3">
                <div className="flex items-center gap-2 text-[10px] font-mono-custom font-bold text-gray-500 tracking-widest uppercase">
                  <span className="w-2 h-2 bg-neon rounded-full border border-black"></span>{" "}
                  LIVE · WARUNG MANG AFAT
                </div>
                <div className="text-[10px] font-mono-custom text-gray-400">
                  ID: WM-041
                </div>
              </div>

              <div className="bg-black text-white rounded-xl p-4 mb-4 font-mono-custom text-sm flex items-center gap-2">
                <span className="text-neon">[06:00 AM]</span> LAPORAN: KLOP
                <div className="w-3 h-3 bg-[#00ff88] rounded-full ml-1 shadow-[0_0_8px_#00ff88]"></div>
                <div className="w-2 h-4 bg-neon animate-pulse ml-1"></div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center border-2 border-gray-200 rounded-xl p-3 text-sm bg-white">
                  <span className="font-mono-custom font-bold text-xs">STOK ROKOK</span>
                  <span className="text-gray-400 text-xs font-mono-custom">↓ 3 dari semalam</span>
                  <span className="brutal-border-sm bg-gray-50 rounded-md px-2 py-0.5 font-mono-custom font-bold text-xs">
                    4 bks
                  </span>
                </div>
                <div className="flex justify-between items-center border-2 border-gray-200 rounded-xl p-3 text-sm bg-white">
                  <span className="font-mono-custom font-bold text-xs">SELISIH KAS</span>
                  <span className="text-gray-400 text-xs font-mono-custom">KLOP ✓</span>
                  <span className="brutal-border-sm bg-white text-black rounded-md px-2 py-0.5 font-mono-custom font-bold text-xs">
                    Rp 0
                  </span>
                </div>
                <div className="flex justify-between items-center border-2 border-gray-200 rounded-xl p-3 text-sm bg-white">
                  <span className="font-mono-custom font-bold text-xs">NOTA VOID</span>
                  <span className="text-gray-400 text-xs font-mono-custom">AMAN ✓</span>
                  <span className="brutal-border-sm bg-white text-black rounded-md px-2 py-0.5 font-mono-custom font-bold text-xs">
                    0
                  </span>
                </div>
                <div className="flex justify-between items-center border-2 border-gray-200 rounded-xl p-3 text-sm bg-white">
                  <span className="font-mono-custom font-bold text-xs">KASIR: RIN</span>
                  <span className="text-gray-400 text-xs font-mono-custom">0 selisih</span>
                  <span className="brutal-border-sm bg-white text-black rounded-md px-2 py-0.5 font-mono-custom font-bold text-xs">
                    shift pagi
                  </span>
                </div>
              </div>

              {/* Bottom Chart Mock */}
              <div className="mt-6 border-2 border-gray-100 rounded-xl p-4 h-24 flex items-end justify-between gap-1 overflow-hidden" style={{ WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)' }}>
                  <div className="w-full bg-black rounded-t-sm h-[20%]"></div>
                  <div className="w-full bg-black rounded-t-sm h-[40%]"></div>
                  <div className="w-full bg-black rounded-t-sm h-[30%]"></div>
                  <div className="w-full bg-black rounded-t-sm h-[60%]"></div>
                  <div className="w-full bg-black rounded-t-sm h-[80%]"></div>
                  <div className="w-full bg-black rounded-t-sm h-[50%]"></div>
                  <div className="w-full bg-black rounded-t-sm h-[90%]"></div>
                  <div className="w-full bg-black rounded-t-sm h-[70%]"></div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </main>

      {/* The Problem Section */}
      <section id="kalkulator-rugi" className="py-16 sm:py-24 lg:py-32 px-4 bg-white relative overflow-hidden border-b-4 border-black">
        <div className="max-w-6xl mx-auto text-black relative z-10">
          <motion.div
            variants={revealVariant}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mb-10 sm:mb-16"
          >
            <div className="text-[10px] font-mono-custom text-gray-500 font-bold tracking-widest mb-4 sm:mb-6 uppercase">
              02 / The Chaos - Tension &amp; Agitation
            </div>

            <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-none mb-2">
              Warung bocor di depan mata.
            </h2>
            <h3 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-serif-italic text-black">
              Anda cuma tidak lihat.
            </h3>
          </motion.div>

          <motion.div
            variants={revealVariant}
            custom={2}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="relative mt-8 sm:mt-16"
          >
            {/* Floating Badges/Stickers: Constrained & Mobile Safe */}
            <motion.div 
              animate={{ rotate: [-4, -2, -4], scale: [1, 1.03, 1] }} 
              transition={{ repeat: Infinity, duration: 4 }} 
              className="absolute -top-4 sm:-top-8 left-2 sm:left-10 bg-neon brutal-border brutal-shadow px-3 py-1 sm:px-4 sm:py-2 font-bold font-mono-custom text-xs sm:text-sm -rotate-3 sm:-rotate-6 z-20 text-black max-w-[85%]"
            >
              Banyak barang fisik hilang!
            </motion.div>
            <motion.div 
              animate={{ rotate: [3, 5, 3] }} 
              transition={{ repeat: Infinity, duration: 3 }} 
              className="hidden md:block absolute -top-16 right-10 bg-neon brutal-border brutal-shadow px-4 py-2 font-bold font-mono-custom text-sm rotate-3 z-20 text-black"
            >
              1 dari 3 warung<br/>rugi senyap ✓
            </motion.div>
            <motion.div 
              animate={{ rotate: [-2, 0, -2] }} 
              transition={{ repeat: Infinity, duration: 5 }} 
              className="hidden sm:block absolute top-1/3 -right-2 md:-right-4 bg-neon brutal-border brutal-shadow px-3 py-1 sm:px-4 sm:py-2 font-bold font-mono-custom text-xs sm:text-sm -rotate-2 z-20 text-black"
            >
              Selisih kas tiap malam
            </motion.div>
            <motion.div 
              animate={{ rotate: [3, 1, 3] }} 
              transition={{ repeat: Infinity, duration: 4.5 }} 
              className="absolute -bottom-5 sm:-bottom-8 right-2 sm:right-20 bg-neon brutal-border brutal-shadow px-3 py-1 sm:px-4 sm:py-2 font-bold font-mono-custom text-xs sm:text-sm rotate-3 sm:rotate-6 z-20 text-black max-w-[85%]"
            >
              Nota sering dibatalkan! 💸
            </motion.div>

            {/* The Table Box */}
            <div className="bg-black rounded-2xl sm:rounded-[2rem] brutal-shadow sm:brutal-shadow-lg brutal-border overflow-hidden relative z-10">
              
              {/* Header: Desktop */}
              <div className="hidden md:flex text-white font-mono-custom text-[10px] font-bold px-8 py-4 border-b-4 border-black tracking-widest uppercase items-center">
                <div className="w-12">NO.</div>
                <div className="flex-1 pl-4">YANG SEBENARNYA TERJADI</div>
                <div className="w-32 text-right">STATUS</div>
              </div>

              {/* Body Rows */}
              <div className="bg-white flex flex-col text-black divide-y divide-gray-200">
                
                {/* Row 1 */}
                <div className="flex flex-col md:flex-row gap-2.5 md:gap-4 items-start md:items-center p-4 sm:p-6 md:px-8 hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center justify-between w-full md:w-12">
                    <span className="font-mono-custom text-gray-400 font-bold text-sm sm:text-lg">01</span>
                    <span className="md:hidden brutal-border-sm bg-white rounded-md px-2 py-0.5 font-mono-custom text-[9px] font-bold uppercase">● BUANG WAKTU</span>
                  </div>
                  <div className="w-full md:w-1/4 font-bold text-base sm:text-xl group-hover:pl-1 transition-all">Catat manual</div>
                  <div className="flex-1 text-gray-600 text-xs sm:text-sm leading-relaxed">Buku tulis vs ingatan. Di penghujung hari, angkanya tidak pernah ketemu.</div>
                  <div className="hidden md:flex w-32 justify-end">
                    <span className="brutal-border-sm bg-white rounded-md px-2 py-1 font-mono-custom text-[10px] font-bold uppercase whitespace-nowrap">● BUANG WAKTU</span>
                  </div>
                </div>

                {/* Row 2 */}
                <div className="flex flex-col md:flex-row gap-2.5 md:gap-4 items-start md:items-center p-4 sm:p-6 md:px-8 hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center justify-between w-full md:w-12">
                    <span className="font-mono-custom text-gray-400 font-bold text-sm sm:text-lg">02</span>
                    <span className="md:hidden brutal-border-sm bg-white rounded-md px-2 py-0.5 font-mono-custom text-[9px] font-bold uppercase">● TERLAMBAT</span>
                  </div>
                  <div className="w-full md:w-1/4 font-bold text-base sm:text-xl group-hover:pl-1 transition-all">Tunggu laporan</div>
                  <div className="flex-1 text-gray-600 text-xs sm:text-sm leading-relaxed">Laporan bulanan datang terlambat. Setiap keputusan selalu mundur.</div>
                  <div className="hidden md:flex w-32 justify-end">
                    <span className="brutal-border-sm bg-white rounded-md px-2 py-1 font-mono-custom text-[10px] font-bold uppercase whitespace-nowrap">● TERLAMBAT</span>
                  </div>
                </div>

                {/* Row 3 */}
                <div className="flex flex-col md:flex-row gap-2.5 md:gap-4 items-start md:items-center p-4 sm:p-6 md:px-8 hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center justify-between w-full md:w-12">
                    <span className="font-mono-custom text-gray-400 font-bold text-sm sm:text-lg">03</span>
                    <span className="md:hidden brutal-border-sm bg-white rounded-md px-2 py-0.5 font-mono-custom text-[9px] font-bold uppercase">● BOCOR</span>
                  </div>
                  <div className="w-full md:w-1/4 font-bold text-base sm:text-xl group-hover:pl-1 transition-all">Kasir ngeles</div>
                  <div className="flex-1 text-gray-600 text-xs sm:text-sm leading-relaxed">&ldquo;Salah masuk, Bos.&rdquo; — padahal stok yang hilang jauh lebih banyak.</div>
                  <div className="hidden md:flex w-32 justify-end">
                    <span className="brutal-border-sm bg-white rounded-md px-2 py-1 font-mono-custom text-[10px] font-bold uppercase whitespace-nowrap">● BOCOR</span>
                  </div>
                </div>

                {/* Row 4 */}
                <div className="flex flex-col md:flex-row gap-2.5 md:gap-4 items-start md:items-center p-4 sm:p-6 md:px-8 hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center justify-between w-full md:w-12">
                    <span className="font-mono-custom text-gray-400 font-bold text-sm sm:text-lg">04</span>
                    <span className="md:hidden brutal-border-sm bg-white rounded-md px-2 py-0.5 font-mono-custom text-[9px] font-bold uppercase">● RUGI</span>
                  </div>
                  <div className="w-full md:w-1/4 font-bold text-base sm:text-xl group-hover:pl-1 transition-all">Stok gelap</div>
                  <div className="flex-1 text-gray-600 text-xs sm:text-sm leading-relaxed">Barang hilang tanpa jejak. Tidak ada yang bisa ditunjuk jarinya.</div>
                  <div className="hidden md:flex w-32 justify-end">
                    <span className="brutal-border-sm bg-white rounded-md px-2 py-1 font-mono-custom text-[10px] font-bold uppercase whitespace-nowrap">● RUGI</span>
                  </div>
                </div>

                {/* Row 5 */}
                <div className="flex flex-col md:flex-row gap-2.5 md:gap-4 items-start md:items-center p-4 sm:p-6 md:px-8 hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center justify-between w-full md:w-12">
                    <span className="font-mono-custom text-gray-400 font-bold text-sm sm:text-lg">05</span>
                    <span className="md:hidden brutal-border-sm bg-white rounded-md px-2 py-0.5 font-mono-custom text-[9px] font-bold uppercase">● CURANG</span>
                  </div>
                  <div className="w-full md:w-1/4 font-bold text-base sm:text-xl group-hover:pl-1 transition-all">Nota dibatalkan</div>
                  <div className="flex-1 text-gray-600 text-xs sm:text-sm leading-relaxed">Transaksi void terlalu sering, tanpa alasan yang masuk akal.</div>
                  <div className="hidden md:flex w-32 justify-end">
                    <span className="brutal-border-sm bg-white rounded-md px-2 py-1 font-mono-custom text-[10px] font-bold uppercase whitespace-nowrap">● CURANG</span>
                  </div>
                </div>

              </div>
            </div>
            
            <div className="text-center mt-12 sm:mt-20 max-w-2xl mx-auto text-xs sm:text-sm md:text-base text-gray-500 px-4">
              Bukan salah Anda. <strong className="text-black italic font-serif">Warung memang dirancang untuk bocor</strong> jika hanya mengandalkan kepercayaan dan buku catatan.
            </div>

          </motion.div>
        </div>
      </section>

      {/* Section: Features (The Grid) */}
      <section
        id="cara-kerja"
        className="py-16 sm:py-24 lg:py-32 px-4 bg-grid-pattern border-t-4 border-black text-black"
      >
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={revealVariant}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mb-10 sm:mb-16"
          >
            <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-none mb-3 sm:mb-4">
              Mesin yang tidak bisa <br/>
              <span className="font-serif-italic">ditembus.</span>
            </h2>
            <p className="text-gray-600 max-w-xl text-sm sm:text-base md:text-lg">
              Setiap kotak di bawah adalah mesin sungguhan — layar kacanya
              memantau warung Anda secara langsung, 24 jam sehari.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
            
            {/* Card 1: Radar Stok */}
            <motion.div
              variants={revealVariant}
              custom={1}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              whileHover={{ y: -6, boxShadow: "8px 8px 0px #000" }}
              className="bg-white brutal-border brutal-shadow sm:brutal-shadow-lg rounded-2xl sm:rounded-[2rem] p-5 sm:p-6 flex flex-col h-full transition-all"
            >
              <div className="flex justify-between items-start mb-6">
                <h4 className="font-bold text-2xl">Radar Stok</h4>
                <span className="font-mono-custom text-[10px] text-gray-400 font-bold uppercase">LIVE</span>
              </div>
              
              <div className="border-2 border-gray-200 rounded-xl p-4 font-mono-custom text-xs bg-white mb-6 flex-1">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100 text-gray-400 text-[10px]">
                  <span><span className="text-neon inline-block w-2 h-2 rounded-full mr-1"></span>LIVE STOK</span>
                  <span>SYNC 12 DTK</span>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold">ROKOK A</span> <span>8 pcs</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold">BERAS 5KG</span> <span>18 sak</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold">TELUR</span> <span>20 kg</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold">MINYAK 1L</span> <span>6 btl</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-2">Tahu persis barang yang keluar, sebelum sempat hilang.</p>
              <div className="text-[10px] font-mono-custom text-gray-400 uppercase tracking-widest">↑ MESIN TERUS MENGHITUNG - 24/7</div>
            </motion.div>

            {/* Card 2: Laporan 06:00 AM */}
            <motion.div
              variants={revealVariant}
              custom={2}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              whileHover={{ y: -8, boxShadow: "12px 12px 0px #000" }}
              className="bg-white brutal-border brutal-shadow-lg rounded-[2rem] p-6 flex flex-col h-full transition-all"
            >
              <div className="flex justify-between items-start mb-6">
                <h4 className="font-bold text-2xl">Laporan 06:00 AM</h4>
                <span className="font-mono-custom text-[10px] text-gray-400 font-bold uppercase">OTOMATIS</span>
              </div>
              
              <div className="border-2 border-gray-200 rounded-xl p-4 font-mono-custom text-xs bg-white mb-6 flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100 text-gray-400 text-[10px]">
                  <span>LAPORAN - 06:00</span>
                  <span>WM-041</span>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <span>Omzet kemarin</span> <span className="font-bold">Rp 4.820.000</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Selisih kas</span> <span className="font-bold">Rp 0 ✓</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Barang low stok</span> <span className="font-bold">3 item</span>
                  </div>
                </div>
                <div className="mt-auto bg-black text-neon text-[10px] font-bold p-2 rounded flex items-center justify-between">
                  <span>KESIMPULAN: KLOP</span> <span className="w-2 h-2 rounded-full bg-neon animate-pulse"></span>
                </div>
              </div>

              <p className="text-sm text-gray-500">Laporan lengkap masuk ke HP sebelum Anda buka gerbang.</p>
            </motion.div>

            {/* Card 3: Multi-Warung */}
            <motion.div
              variants={revealVariant}
              custom={3}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              whileHover={{ y: -8, boxShadow: "12px 12px 0px #000" }}
              className="bg-white brutal-border brutal-shadow-lg rounded-[2rem] p-6 flex flex-col h-full transition-all"
            >
              <div className="flex justify-between items-start mb-6">
                <h4 className="font-bold text-2xl">Multi-Warung</h4>
                <span className="font-mono-custom text-[10px] text-gray-400 font-bold uppercase">SKALA</span>
              </div>
              
              <div className="border-2 border-gray-200 rounded-xl p-4 font-mono-custom text-[10px] bg-white mb-6 flex-1">
                <div className="mb-4 pb-2 border-b border-gray-100 text-gray-400">
                  <span>CABANG - 6 AKTIF</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="border border-gray-200 rounded p-2 text-center bg-gray-50">
                    <div className="font-bold text-black">WM-01</div><div className="text-gray-400">2.4jt</div>
                  </div>
                  <div className="border border-gray-200 rounded p-2 text-center bg-gray-50">
                    <div className="font-bold text-black">WM-02</div><div className="text-gray-400">3.0jt</div>
                  </div>
                  <div className="border border-gray-200 rounded p-2 text-center bg-gray-50">
                    <div className="font-bold text-black">WM-03</div><div className="text-gray-400">3.6jt</div>
                  </div>
                  <div className="border border-gray-200 rounded p-2 text-center bg-gray-50">
                    <div className="font-bold text-black">WM-04</div><div className="text-gray-400">4.2jt</div>
                  </div>
                  <div className="border border-gray-200 rounded p-2 text-center bg-gray-50">
                    <div className="font-bold text-black">WM-05</div><div className="text-gray-400">4.8jt</div>
                  </div>
                  <div className="border border-gray-200 rounded p-2 text-center bg-gray-50">
                    <div className="font-bold text-black">WM-06</div><div className="text-gray-400">5.4jt</div>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-500">Kelola 10 warung dari satu layar. Satu manajer kedua untuk semuanya.</p>
            </motion.div>

            {/* Card 4: Radar Kasir Nakal */}
            <motion.div
              variants={revealVariant}
              custom={4}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              whileHover={{ y: -8, boxShadow: "12px 12px 0px #000" }}
              className="bg-white brutal-border brutal-shadow-lg rounded-[2rem] p-6 flex flex-col h-full transition-all"
            >
              <div className="flex justify-between items-start mb-6">
                <h4 className="font-bold text-2xl">Radar Kasir Nakal</h4>
                <span className="font-mono-custom text-[10px] text-gray-400 font-bold uppercase">AWAS</span>
              </div>
              
              <div className="border-2 border-gray-200 rounded-xl p-4 font-mono-custom text-xs bg-white mb-6 flex-1">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100 text-gray-400 text-[10px]">
                  <span>● RADAR KASIR</span>
                  <span>3 SHIFT</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold">RIN - pagi</span> 
                    <div className="flex items-center gap-2"><span className="bg-black text-neon px-2 rounded text-[9px]">KLOP</span> <span>Rp 0</span></div>
                  </div>
                  <div className="flex justify-between items-center border border-neon bg-[#faffcc] -mx-2 px-2 py-1 rounded">
                    <span className="font-bold">YUNI - siang</span> 
                    <div className="flex items-center gap-2"><span className="bg-neon text-black px-2 rounded text-[9px] font-bold animate-pulse">SELISIH</span> <span>Rp 12.000</span></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold">BOY - malam</span> 
                    <div className="flex items-center gap-2"><span className="bg-black text-neon px-2 rounded text-[9px]">KLOP</span> <span>Rp 0</span></div>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-500">Setiap selisih terekam. Setiap "ngeles" langsung ketahuan.</p>
            </motion.div>

            {/* Card 5: Nota Digital */}
            <motion.div
              variants={revealVariant}
              custom={5}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              whileHover={{ y: -8, boxShadow: "12px 12px 0px #000" }}
              className="bg-white brutal-border brutal-shadow-lg rounded-[2rem] p-6 flex flex-col h-full transition-all"
            >
              <div className="flex justify-between items-start mb-6">
                <h4 className="font-bold text-2xl">Nota Digital</h4>
                <span className="font-mono-custom text-[10px] text-gray-400 font-bold uppercase">AMAN</span>
              </div>
              
              <div className="border-2 border-gray-200 rounded-xl p-4 font-mono-custom text-xs bg-white mb-6 flex-1">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100 text-gray-400 text-[10px]">
                  <span>LOG NOTA</span>
                  <span>HARI INI</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>#201 - Rp 24.000</span> <span>OK</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>#202 - Rp 51.000</span> <span>OK</span>
                  </div>
                  <div className="flex justify-between items-center bg-neon border border-black rounded p-1 -mx-1 px-2 font-bold">
                    <span>#203 - VOID</span> <span>⚠️ DIREKAM</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-500">Nota tidak bisa dibatalkan diam-diam. Void tercatat permanen.</p>
            </motion.div>

            {/* Card 6: Integrasi 1 Hari */}
            <motion.div
              variants={revealVariant}
              custom={6}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              whileHover={{ y: -8, boxShadow: "12px 12px 0px #000" }}
              className="bg-white brutal-border brutal-shadow-lg rounded-[2rem] p-6 flex flex-col h-full transition-all"
            >
              <div className="flex justify-between items-start mb-6">
                <h4 className="font-bold text-2xl">Integrasi 1 Hari</h4>
                <span className="font-mono-custom text-[10px] text-gray-400 font-bold uppercase">CEPAT</span>
              </div>
              
              <div className="border-2 border-gray-200 rounded-xl p-4 font-mono-custom text-xs bg-white mb-6 flex-1">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100 text-gray-400 text-[10px]">
                  <span>TERHUBUNG DALAM 1 HARI</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-dashed border-gray-200 pb-2">
                    <span>Kasir lama</span> <span>✓</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-dashed border-gray-200 pb-2">
                    <span>Timbangan</span> <span>✓</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>WhatsApp</span> <span>✓</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-500">Nempel ke kasir & timbangan lama Anda. Tidak perlu ganti sistem.</p>
            </motion.div>

          </div>
        </div>
      </section>

      {/* The Proof / Closing Section */}
      <section id="gaji-manajer" className="py-16 sm:py-24 lg:py-32 px-4 bg-[#F4F4F5] relative overflow-hidden border-t-4 border-black">
        <div className="max-w-7xl mx-auto flex flex-col items-center">
          
          <div className="text-center mb-10 sm:mb-16">
            <div className="text-[10px] font-mono-custom text-zinc-500 font-bold tracking-widest mb-3 sm:mb-4 uppercase">
              06 / STRUKTUR KONTRAK GAJI MANAJER • POPCORN PRICING
            </div>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tighter uppercase mb-3 sm:mb-4 font-heading text-black">
              PILIH KONTRAK MANAJER
            </h2>
            <p className="text-base sm:text-xl md:text-2xl font-serif-italic text-zinc-600 max-w-3xl mx-auto px-2">
              Garansi 100% Uang Kembali Jika Manajer Kami Gagal. Tanpa biaya tersembunyi.
            </p>
          </div>

          {/* 4-Tier Grid */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 sm:gap-6 items-stretch">
            
            {/* TIER 0: KONTRAK MAGANG (The Free Trap) */}
            <motion.div
              variants={revealVariant}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="bg-zinc-100/70 border-2 border-dashed border-zinc-400 rounded-none p-6 flex flex-col justify-between text-zinc-600 transition-all hover:bg-zinc-200/50"
            >
              <div>
                <div className="flex justify-between items-center mb-6 pb-3 border-b border-dashed border-zinc-300">
                  <span className="text-[10px] font-mono-custom uppercase tracking-wider font-bold text-zinc-400">
                    TIER 0 • THE FREE TRAP
                  </span>
                  <span className="text-[9px] font-mono-custom uppercase bg-zinc-300 text-zinc-700 px-2 py-0.5 font-bold">
                    DRAFT
                  </span>
                </div>

                <h3 className="font-black text-xl uppercase tracking-tight text-zinc-700 mb-2 font-heading">
                  Kontrak Magang
                </h3>
                <p className="text-xs font-mono-custom text-zinc-500 mb-6">
                  Uji coba terbatas untuk pembuktian sistem kasir.
                </p>

                <div className="flex items-baseline gap-1 mb-6 border-b border-dashed border-zinc-300 pb-4">
                  <span className="text-4xl font-black font-mono-custom tracking-tight tabular-nums text-zinc-700">
                    Rp 0
                  </span>
                  <span className="text-xs font-mono-custom text-zinc-400">/bln</span>
                </div>

                <div className="space-y-3 mb-8 text-xs font-mono-custom">
                  <div className="flex items-start gap-2.5">
                    <span className="text-zinc-500 font-bold">✓</span>
                    <span>Mesin Kasir POS Dasar</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-zinc-500 font-bold">✓</span>
                    <span>1 Cabang &amp; 1 Akun Kasir</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-zinc-500 font-bold">✓</span>
                    <span>Maks. 50 Struk / Bulan</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-zinc-400 line-through">
                    <span>❌</span>
                    <span>Terkunci setelah 50 Struk</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-zinc-400 line-through">
                    <span>❌</span>
                    <span>Tanpa Laporan Laba/Rugi</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-zinc-400 line-through">
                    <span>❌</span>
                    <span>Tanpa Radar Anti-Fraud</span>
                  </div>
                </div>
              </div>

              <Link href="/login?mode=register" className="block w-full">
                <button className="w-full border-2 border-zinc-400 text-zinc-700 hover:bg-zinc-300 font-mono-custom text-xs font-bold py-3 uppercase tracking-wider transition-all cursor-pointer">
                  REKRUT ANAK MAGANG
                </button>
              </Link>
            </motion.div>

            {/* TIER 1: KONTRAK SUPERVISOR (The Basic Gate) */}
            <motion.div
              variants={revealVariant}
              custom={1}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="bg-white border-2 border-black rounded-none p-6 flex flex-col justify-between text-black transition-all hover:bg-zinc-50"
            >
              <div>
                <div className="flex justify-between items-center mb-6 pb-3 border-b-2 border-zinc-100">
                  <span className="text-[10px] font-mono-custom uppercase tracking-wider font-bold text-zinc-500">
                    TIER 1 • THE BASIC GATE
                  </span>
                  <span className="text-[9px] font-mono-custom uppercase bg-black text-white px-2 py-0.5 font-bold">
                    STANDAR
                  </span>
                </div>

                <h3 className="font-black text-xl uppercase tracking-tight text-black mb-2 font-heading">
                  Kontrak Supervisor
                </h3>
                <p className="text-xs font-mono-custom text-zinc-600 mb-6">
                  Operasional warung dasar tanpa batasan transaksi struk.
                </p>

                <div className="flex items-baseline gap-1 mb-6 border-b-2 border-zinc-100 pb-4">
                  <span className="text-4xl font-black font-mono-custom tracking-tight tabular-nums text-black">
                    Rp 149.000
                  </span>
                  <span className="text-xs font-mono-custom text-zinc-500">/bln</span>
                </div>

                <div className="space-y-3 mb-8 text-xs font-mono-custom">
                  <div className="flex items-start gap-2.5">
                    <span className="font-bold text-black">✓</span>
                    <span>Transaksi (Struk) Unlimited</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="font-bold text-black">✓</span>
                    <span>1 Cabang &amp; Maks. 2 Kasir</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="font-bold text-black">✓</span>
                    <span>Laporan Laba/Rugi Dasar</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="font-bold text-black">✓</span>
                    <span>Pencatatan Kasbon Pelanggan</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-zinc-400 line-through">
                    <span>❌</span>
                    <span>Radar Kasir Nakal (Anti-Fraud)</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-zinc-400 line-through">
                    <span>❌</span>
                    <span>Multi-Cabang Terhubung</span>
                  </div>
                </div>
              </div>

              <Link href="/login?mode=register" className="block w-full">
                <button className="w-full bg-black text-white hover:bg-zinc-800 font-mono-custom text-xs font-bold py-3 uppercase tracking-wider transition-all cursor-pointer border-2 border-black">
                  REKRUT SUPERVISOR
                </button>
              </Link>
            </motion.div>

            {/* TIER 2: KONTRAK MANAJER OTONOM (The Overpriced Decoy) */}
            <motion.div
              variants={revealVariant}
              custom={2}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="bg-zinc-50 border-2 border-black shadow-[4px_4px_0px_#000000] rounded-none p-6 flex flex-col justify-between text-black transition-all"
            >
              <div>
                <div className="flex justify-between items-center mb-6 pb-3 border-b-2 border-black/10">
                  <span className="text-[10px] font-mono-custom uppercase tracking-wider font-bold text-zinc-600">
                    TIER 2 • OVERPRICED DECOY
                  </span>
                  <span className="text-[9px] font-mono-custom uppercase bg-black text-white px-2 py-0.5 font-bold">
                    AUDIT PRO
                  </span>
                </div>

                <h3 className="font-black text-xl uppercase tracking-tight text-black mb-2 font-heading">
                  Manajer Otonom
                </h3>
                <p className="text-xs font-mono-custom text-zinc-600 mb-6">
                  Pengawasan anti-fraud &amp; audit stok otomatis.
                </p>

                <div className="flex items-baseline gap-1 mb-6 border-b-2 border-black/10 pb-4">
                  <span className="text-4xl font-black font-mono-custom tracking-tight tabular-nums text-black">
                    Rp 349.000
                  </span>
                  <span className="text-xs font-mono-custom text-zinc-500">/bln</span>
                </div>

                <div className="space-y-3 mb-8 text-xs font-mono-custom">
                  <div className="flex items-start gap-2.5">
                    <span className="font-bold text-black">✓</span>
                    <span className="font-bold">Radar Kasir Nakal (Void/Selisih)</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="font-bold text-black">✓</span>
                    <span>Audit Stok Real-Time &amp; HPP Modal</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="font-bold text-black">✓</span>
                    <span>1 Cabang &amp; Maksimal 5 Kasir</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="font-bold text-black">✓</span>
                    <span>Semua Fitur Supervisor</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-zinc-400 line-through">
                    <span>❌</span>
                    <span>Multi-Cabang Terhubung</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-zinc-400 line-through">
                    <span>❌</span>
                    <span>Auto-Report WA 06:00 Pagi</span>
                  </div>
                </div>
              </div>

              <Link href="/login?mode=register" className="block w-full">
                <button className="w-full bg-black text-white hover:bg-zinc-800 font-mono-custom text-xs font-bold py-3 uppercase tracking-wider transition-all cursor-pointer border-2 border-black active:translate-x-0.5 active:translate-y-0.5">
                  AKTIFKAN MANAJER
                </button>
              </Link>
            </motion.div>

            {/* TIER 3: KONTRAK EKSEKUTIF (The Ultimate Target) */}
            <motion.div
              variants={revealVariant}
              custom={3}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="bg-white border-4 border-black shadow-[8px_8px_0px_#000000] rounded-none p-6 flex flex-col justify-between text-black relative z-10 mt-2 sm:mt-0 md:-mt-2 lg:-mt-4"
            >
              {/* Popcorn Header Callout: Safe on small screens */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-black text-white font-mono-custom text-[8px] sm:text-[9px] font-bold uppercase tracking-wider px-2 sm:px-3 py-1 border border-black shadow-[2px_2px_0px_#CCFF00] max-w-[92%] truncate text-center z-20">
                CUMA +RP 50.000 DARI PAKET MANAJER
              </div>

              <div>
                <div className="flex justify-between items-center mb-6 pb-3 border-b-2 border-black pt-2">
                  <span className="text-[10px] font-mono-custom uppercase tracking-wider font-bold text-black">
                    TIER 3 • THE ULTIMATE TARGET
                  </span>
                  <span className="text-[9px] font-mono-custom uppercase bg-[#CCFF00] text-black px-2 py-0.5 font-black border border-black">
                    REKOMENDASI MUTLAK
                  </span>
                </div>

                <h3 className="font-black text-xl uppercase tracking-tight text-black mb-2 font-heading">
                  Kontrak Eksekutif
                </h3>
                <p className="text-xs font-mono-custom text-zinc-600 mb-6">
                  Sistem komando multi-cabang + asisten WhatsApp 24/7.
                </p>

                <div className="flex items-baseline gap-1 mb-6 border-b-2 border-black pb-4">
                  <span className="text-4xl font-black font-mono-custom tracking-tight tabular-nums text-black">
                    Rp 399.000
                  </span>
                  <span className="text-xs font-mono-custom text-zinc-500">/bln</span>
                </div>

                <div className="space-y-3 mb-8 text-xs font-mono-custom">
                  <div className="flex items-start gap-2.5 bg-[#CCFF00]/20 p-1.5 border border-black">
                    <span className="font-bold text-black">⭐</span>
                    <span className="font-bold text-black">Auto-Report WA Pukul 06:00 Pagi</span>
                  </div>
                  <div className="flex items-start gap-2.5 bg-[#CCFF00]/20 p-1.5 border border-black">
                    <span className="font-bold text-black">⭐</span>
                    <span className="font-bold text-black">Multi-Cabang Aktif (Maks 3 Cabang)</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="font-bold text-black">✓</span>
                    <span>Maksimal 10 Akun Kasir</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="font-bold text-black">✓</span>
                    <span>Radar Kasir Nakal &amp; Blind Closing</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="font-bold text-black">✓</span>
                    <span>VIP Support (Jalur Prioritas Bos)</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="font-bold text-black">✓</span>
                    <span>Semua Fitur Manajer Otonom</span>
                  </div>
                </div>
              </div>

              <Link href="/login?mode=register" className="block w-full">
                <button className="w-full bg-[#CCFF00] hover:bg-black hover:text-[#CCFF00] text-black font-mono-custom text-xs font-black py-4 uppercase tracking-wider transition-all cursor-pointer border-2 border-black shadow-[4px_4px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5">
                  TANDA TANGANI KONTRAK EKSEKUTIF
                </button>
              </Link>
            </motion.div>

          </div>

          {/* ADD-ON SYSTEM: Mechanical Facture Table */}
          <div className="w-full mt-16 bg-white border-2 border-black shadow-[4px_4px_0px_#000000] rounded-none p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-black pb-4 mb-6">
              <div>
                <span className="text-[10px] font-mono-custom font-bold uppercase bg-black text-white px-2 py-0.5 inline-block mb-1">
                  SKEMA EKSTENSI • UPSELL TRAP
                </span>
                <h3 className="text-xl font-black uppercase tracking-tight text-black font-heading">
                  Tabel Ekstensi Kapasitas (Add-On Faktur)
                </h3>
              </div>
              <p className="text-xs font-mono-custom text-zinc-600 max-w-md">
                Rumus Kapasitas Aktif: <strong className="text-black">(Total Aktif) ≤ (Batas Paket + Add-On)</strong>. Beli unit tambahan kapan saja tanpa perlu ganti skema pokok.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border-2 border-black p-4 flex items-center justify-between bg-zinc-50">
                <div className="space-y-0.5">
                  <span className="font-mono-custom text-xs font-bold text-black uppercase block">
                    [+] Tambah Akun Kasir
                  </span>
                  <span className="font-mono-custom text-[11px] text-zinc-500">
                    Akses login kasir tambahan aktif
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono-custom text-lg font-black text-black block">
                    Rp 50.000
                  </span>
                  <span className="font-mono-custom text-[10px] text-zinc-500">
                    / Akun / Bulan
                  </span>
                </div>
              </div>

              <div className="border-2 border-black p-4 flex items-center justify-between bg-zinc-50">
                <div className="space-y-0.5">
                  <span className="font-mono-custom text-xs font-bold text-black uppercase block">
                    [+] Tambah Cabang Toko
                  </span>
                  <span className="font-mono-custom text-[11px] text-zinc-500">
                    Ekstensi cabang toko tambahan aktif
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono-custom text-lg font-black text-black block">
                    Rp 150.000
                  </span>
                  <span className="font-mono-custom text-[10px] text-zinc-500">
                    / Cabang / Bulan
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-dashed border-zinc-300 flex flex-col sm:flex-row items-center justify-between text-xs font-mono-custom text-zinc-500 gap-2">
              <span>* Faktur Add-On digabungkan otomatis ke tagihan bulanan kontrak utama.</span>
              <span className="text-black font-bold uppercase">OTORISASI SISTEM REAL-TIME • AKTIF INSTAN</span>
            </div>
          </div>

        </div>
      </section>

      {/* Landing Footer */}
      <footer className="bg-black text-white border-t-4 border-black py-12 sm:py-16 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-8 border-b-2 border-zinc-800">
          <div className="space-y-3 max-w-sm">
            <div className="flex items-center gap-3">
              <div className="bg-neon font-bold text-sm w-8 h-8 flex items-center justify-center rounded-xl border-2 border-black text-black">
                2M
              </div>
              <span className="font-bold text-xl tracking-tight text-white font-display">2ndManager</span>
            </div>
            <p className="text-xs text-zinc-400 font-mono-custom leading-relaxed">
              Sistem operasi ritel warung otomatis 24/7. Kawal stok, audit kasir nakal, dan kirim laporan harian tepat pukul 06:00 pagi.
            </p>
          </div>

          <div className="flex flex-wrap gap-6 sm:gap-10 text-xs font-mono-custom uppercase tracking-wider text-zinc-400">
            <a href="#cara-kerja" className="hover:text-neon transition-colors">Cara Kerja</a>
            <a href="#kalkulator-rugi" className="hover:text-neon transition-colors">Kalkulator Rugi</a>
            <a href="#gaji-manajer" className="hover:text-neon transition-colors">Gaji Manajer</a>
            <Link href="/login" className="hover:text-neon transition-colors">Masuk Kasir</Link>
          </div>

          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3.5 py-2 rounded-xl text-[11px] font-mono-custom text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse"></span>
            <span>SERVER AWS JAKARTA • AKTIF 100%</span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono-custom text-zinc-500">
          <div>© 2026 2ndManager Inc. Hak cipta dilindungi undang-undang.</div>
          <div className="flex items-center gap-4">
            <span>Privasi &amp; Data Warung Terenkripsi</span>
            <span>•</span>
            <span>Garansi 100% Uang Kembali</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
