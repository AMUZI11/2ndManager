"use client";
import React from 'react';
import Link from 'next/link';

export default function LandingFooter() {
  return (
    <footer className="bg-kw-bg border-t border-kw-border pt-16 pb-8 text-kw-text">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-kw-accent rounded-lg flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]">
                <span className="text-kw-bg font-black text-xl tracking-tighter">K</span>
              </div>
              <span className="text-xl font-bold font-sans tracking-tighter text-kw-text">2ndManager</span>
            </div>
            <p className="text-kw-text text-sm max-w-sm leading-relaxed">
              Sistem POS kelas minimarket yang dirancang khusus untuk warung dan toko kelontong. Hentikan kebocoran, mulai profit yang benar.
            </p>
          </div>
          
          <div>
            <h3 className="text-kw-accent font-sans font-bold tracking-tight mb-4 uppercase text-sm">Produk</h3>
            <ul className="space-y-3">
              <li><Link href="#fitur" className="hover:text-kw-accent transition-colors text-sm">Fitur POS</Link></li>
              <li><Link href="#kalkulator" className="hover:text-kw-accent transition-colors text-sm">Kalkulator Kasbon</Link></li>
              <li><Link href="#harga" className="hover:text-kw-accent transition-colors text-sm">Harga</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-kw-accent font-sans font-bold tracking-tight mb-4 uppercase text-sm">Perusahaan</h3>
            <ul className="space-y-3">
              <li><Link href="/about" className="hover:text-kw-accent transition-colors text-sm">Tentang Kami</Link></li>
              <li><Link href="/kontak" className="hover:text-kw-accent transition-colors text-sm">Kontak</Link></li>
              <li><Link href="/privacy" className="hover:text-kw-accent transition-colors text-sm">Privasi</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-kw-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm">
            &copy; {new Date().getFullYear()} 2ndManager. Semua hak cipta dilindungi.
          </p>
          <div className="flex gap-4">
            <span className="text-xs opacity-50 uppercase tracking-widest">Made for Indonesia's local business</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
