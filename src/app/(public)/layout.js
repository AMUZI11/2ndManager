import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowRight, Store, MessageCircle, HelpCircle, Sparkles, Zap } from 'lucide-react';
import CookieConsentBar from '@/components/public/CookieConsentBar';

export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0B0F17] font-sans antialiased selection:bg-[#CCFF00] selection:text-slate-900">
      {/* ── STICKY ARCADE BRUTALIST NAVBAR ── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b-3 border-[#0B0F17] px-4 md:px-8 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo & Tag */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#0B0F17] border-2 border-[#0B0F17] flex items-center justify-center text-amber-400 font-mono font-black text-xl shadow-[3px_3px_0px_#F59E0B] group-hover:-translate-y-0.5 transition-transform">
              2M
            </div>
            <div>
              <span className="font-display font-black text-xl tracking-tight text-[#0B0F17] uppercase flex items-center gap-1.5">
                2ndManager
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400 text-slate-900 border border-slate-900 font-extrabold tracking-wider">
                  OS WARUNG
                </span>
              </span>
              <p className="text-[11px] font-mono font-bold text-slate-600 tracking-tight hidden sm:block">
                Sistem Kasir Anti-Bocor
              </p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center space-x-6 text-sm font-mono font-extrabold uppercase tracking-tight">
            <Link
              href="/features"
              className="text-slate-700 hover:text-slate-900 transition-colors py-1 hover:underline decoration-2 underline-offset-4"
            >
              Fitur Anti-Bocor
            </Link>
            <Link
              href="/pricing"
              className="text-slate-700 hover:text-slate-900 transition-colors py-1 hover:underline decoration-2 underline-offset-4"
            >
              Harga Paket
            </Link>
            <Link
              href="/refund"
              className="text-slate-700 hover:text-slate-900 transition-colors py-1 hover:underline decoration-2 underline-offset-4"
            >
              Garansi 7 Hari
            </Link>
            <a
              href="https://wa.me/6281234567890?text=Halo%20Admin%202ndManager,%20saya%20ingin%20tanya%20seputar%20software%20kasir"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-700 hover:text-slate-900 transition-colors py-1 flex items-center gap-1"
            >
              <MessageCircle size={15} className="text-emerald-600" /> Bantuan
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center space-x-3">
            <Link
              href="/login"
              className="px-3.5 py-2 text-xs md:text-sm font-mono font-bold text-slate-800 hover:text-slate-950 transition-colors"
            >
              Masuk
            </Link>
            <Link
              href="/pos"
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-mono font-black text-xs md:text-sm border-2 border-[#0B0F17] shadow-[3px_3px_0px_#0B0F17] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles size={14} strokeWidth={2.5} className="text-slate-900 fill-slate-900" />
                Buka Kasir Gratis
              </span>
              <ArrowRight size={14} className="hidden sm:inline" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── PAGE CONTENT ── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        {children}
      </main>

      {/* ── TRUST & LEGAL FOOTER SUITE ── */}
      <footer className="border-t-3 border-[#0B0F17] bg-white px-4 md:px-8 py-12 mt-16 text-[#0B0F17]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Column 1: Brand & Entitas */}
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-[#0B0F17] flex items-center justify-center text-amber-400 font-mono font-black text-sm border border-[#0B0F17]">
                2M
              </div>
              <span className="font-display font-black text-lg text-[#0B0F17] tracking-tight">
                2ndManager (KlolaWarung)
              </span>
            </div>
            <p className="text-xs text-slate-600 font-sans max-w-md leading-relaxed">
              Platform operasional kasir &amp; logistik warung sembako offline-first di Indonesia. 
              Mengeliminasi kebocoran kas laci melalui audit double-blind estafet, pelacak tabung rolling, dan asisten belanja pasar subuh tanpa biaya API pihak ketiga.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-300 text-emerald-800 text-[11px] font-mono font-bold">
                <ShieldCheck size={14} className="text-emerald-600" />
                Kepatuhan UU PDP No. 27/2022
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-300 text-slate-700 text-[11px] font-mono font-bold">
                <Zap size={13} strokeWidth={2.5} className="text-amber-500 fill-amber-500" />
                99.5% Uptime Offline-First
              </span>
            </div>
          </div>

          {/* Column 2: Navigasi Produk */}
          <div className="space-y-3 font-mono text-xs">
            <h4 className="font-black text-slate-900 uppercase tracking-wider text-xs border-b border-slate-200 pb-1.5">
              Solusi &amp; Fitur
            </h4>
            <ul className="space-y-2 text-slate-600 font-bold">
              <li>
                <Link href="/features" className="hover:text-slate-900 transition-colors">
                  • 8 Fitur Anti-Bocor
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-slate-900 transition-colors">
                  • Harga &amp; 4 Paket Langganan
                </Link>
              </li>
              <li>
                <Link href="/pos" className="hover:text-slate-900 transition-colors">
                  • Aplikasi Kasir POS
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-slate-900 transition-colors">
                  • Masuk Akun Pemilik
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Legalitas & Bantuan */}
          <div className="space-y-3 font-mono text-xs">
            <h4 className="font-black text-slate-900 uppercase tracking-wider text-xs border-b border-slate-200 pb-1.5">
              Hukum &amp; Bantuan
            </h4>
            <ul className="space-y-2 text-slate-600 font-bold">
              <li>
                <Link href="/privacy" className="hover:text-slate-900 transition-colors">
                  • Kebijakan Privasi (UU PDP)
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-slate-900 transition-colors">
                  • Syarat &amp; Ketentuan Layanan
                </Link>
              </li>
              <li>
                <Link href="/refund" className="hover:text-slate-900 transition-colors">
                  • Garansi 7 Hari Uang Kembali
                </Link>
              </li>
              <li>
                <a
                  href="https://wa.me/6281234567890?text=Halo%202ndManager,%20saya%20butuh%20bantuan%20support"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-700 transition-colors text-emerald-600 flex items-center gap-1"
                >
                  <MessageCircle size={13} /> • WhatsApp Support Resmi
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="max-w-7xl mx-auto pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-slate-500 gap-2">
          <p>© 2026 2ndManager. Hak Cipta Dilindungi Undang-Undang Republik Indonesia.</p>
          <p className="flex items-center gap-2">
            <span>Dibuat Khusus untuk Warung Kelontong Indonesia</span>
          </p>
        </div>
      </footer>

      {/* UU PDP Cookie & Privacy Consent */}
      <CookieConsentBar />
    </div>
  );
}
