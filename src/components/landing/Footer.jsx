"use client";
import React from 'react';
import { WaxSealBadge } from '../ui/WaxSealBadge';
import { Phone, Mail, MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="relative bg-[#050608] pt-20 pb-10 px-4 sm:px-6 border-t border-vault-coffee">
      {/* Peta Nusantara motif as background overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')]"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
          <div className="md:col-span-5">
            <h3 className="text-3xl font-heading font-bold text-vault-gold mb-6">Klola OS</h3>
            <p className="text-vault-cream/70 leading-relaxed mb-8 max-w-sm">
              Sistem operasi warung yang mengembalikan kendali dan ketenangan pikiran Anda. Dipercaya oleh ratusan pemilik warung di seluruh Indonesia.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full border border-vault-coffee flex items-center justify-center text-vault-gold hover:bg-vault-oxblood transition-colors font-serif font-bold text-lg">
                <span className="sr-only">Facebook</span>f
              </a>
              <a href="#" className="w-10 h-10 rounded-full border border-vault-coffee flex items-center justify-center text-vault-gold hover:bg-vault-oxblood transition-colors font-serif font-bold text-lg">
                <span className="sr-only">Instagram</span>i
              </a>
            </div>
          </div>

          <div className="md:col-span-3">
            <h4 className="font-heading font-bold text-vault-cream mb-6 tracking-wide text-lg">Hubungi Kami</h4>
            <ul className="space-y-4 text-vault-cream/70 text-sm md:text-base">
              <li className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-vault-gold shrink-0 mt-0.5" />
                <span>0851-8878-9773 (WA)</span>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-vault-gold shrink-0 mt-0.5" />
                <span>bantuan@klola.os</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-vault-gold shrink-0 mt-0.5" />
                <span>Jl. Slamet Riyadi No. 123,<br/>Surakarta, Jawa Tengah 57141</span>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4 relative mt-8 md:mt-0">
            <div className="bg-vault-oxblood/30 border border-vault-gold/20 p-6 md:p-8 rounded-sm shadow-xl">
              <div className="absolute -top-8 -right-4 md:-right-8">
                <WaxSealBadge text="Garansi 100%" className="w-20 h-20" />
              </div>
              <h4 className="font-heading font-bold text-vault-gold mb-4 text-xl">Jaminan Kunci Emas</h4>
              <p className="text-vault-cream/80 text-sm leading-relaxed">
                Garansi uang kembali 100% dalam 30 hari jika Klola OS tidak berhasil menghentikan kebocoran di warung Anda. Tidak ada pertanyaan, tidak ada syarat tersembunyi.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-vault-coffee/50 pt-8 flex flex-col md:flex-row justify-between items-center text-vault-cream/50 text-sm">
          <p>© {new Date().getFullYear()} Klola OS. Hak Cipta Dilindungi.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-vault-gold transition-colors">Kebijakan Privasi</a>
            <a href="#" className="hover:text-vault-gold transition-colors">Syarat & Ketentuan</a>
          </div>
        </div>
      </div>

      {/* Floating WA CTA */}
      <a 
        href="https://wa.me/6285188789773" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-vault-gold text-vault-midnight pl-4 pr-6 py-3 md:py-4 rounded-full font-heading font-bold tracking-wide shadow-vault-btn border-2 border-vault-gold/80 hover:scale-105 transition-transform flex items-center gap-3"
      >
        <div className="w-8 h-8 md:w-10 md:h-10 bg-[#25D366] rounded-full flex items-center justify-center text-white">
          <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm.029 18.88c-1.161 0-2.305-.292-3.318-.844l-3.677.964.984-3.595c-.607-1.052-.927-2.246-.926-3.468.001-3.825 3.113-6.937 6.937-6.937 3.825 0 6.938 3.112 6.938 6.937 0 3.825-3.113 6.938-6.938 6.938z"/></svg>
        </div>
        Konsultasi via WA
      </a>
    </footer>
  );
}
