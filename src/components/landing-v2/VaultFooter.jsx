"use client";
import React from 'react';
import { motion } from 'framer-motion';

export function VaultFooter() {
  return (
    <footer className="bg-vault-midnight border-t border-vault-coffee relative overflow-hidden pt-20 pb-8 px-4 sm:px-6">
      
      {/* Background seal/glow */}
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-vault-gold/5 blur-[120px] pointer-events-none rounded-full"></div>
      
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          
          <div className="col-span-1 md:col-span-2">
            <div className="text-vault-cream font-heading font-bold text-2xl tracking-wide mb-6">
              KLOLA<span className="text-vault-gold">.</span>OS
            </div>
            <p className="text-vault-cream/60 max-w-sm mb-8 leading-relaxed">
              Sistem keamanan operasional untuk warung modern. Hentikan kebocoran omzet, kendalikan stok, dan pastikan setiap rupiah tercatat.
            </p>
            {/* The Guarantee Seal */}
            <div className="inline-flex items-center gap-4 bg-vault-oxblood/50 border border-vault-coffee p-4 rounded-xl">
              <div className="w-12 h-12 bg-vault-gold/10 rounded-full flex items-center justify-center shrink-0 border border-vault-gold/20 text-vault-gold">
                🛡️
              </div>
              <div>
                <p className="font-heading font-bold text-vault-cream text-sm">Garansi 30 Hari</p>
                <p className="text-xs text-vault-cream/50">Uang kembali jika tidak puas.</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-heading font-bold text-vault-cream mb-6 uppercase tracking-widest text-sm">Produk</h4>
            <ul className="space-y-4 text-vault-cream/60">
              <li><a href="#" className="hover:text-vault-gold transition-colors">Mesin Kasir (POS)</a></li>
              <li><a href="#" className="hover:text-vault-gold transition-colors">Manajemen Stok</a></li>
              <li><a href="#" className="hover:text-vault-gold transition-colors">Buku Piutang</a></li>
              <li><a href="#" className="hover:text-vault-gold transition-colors">Laporan Keuangan</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-bold text-vault-cream mb-6 uppercase tracking-widest text-sm">Perusahaan</h4>
            <ul className="space-y-4 text-vault-cream/60">
              <li><a href="#" className="hover:text-vault-gold transition-colors">Tentang Kami</a></li>
              <li><a href="#" className="hover:text-vault-gold transition-colors">Layanan Concierge</a></li>
              <li><a href="#" className="hover:text-vault-gold transition-colors">Syarat & Ketentuan</a></li>
              <li><a href="#" className="hover:text-vault-gold transition-colors">Kebijakan Privasi</a></li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-vault-coffee/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-vault-cream/40 text-sm">
            &copy; {new Date().getFullYear()} Klola OS. Hak Cipta Dilindungi.
          </p>
          <div className="flex gap-4">
            {/* Social Links placeholders */}
            <div className="w-8 h-8 rounded-full bg-vault-coffee flex items-center justify-center text-vault-cream/50 hover:bg-vault-gold hover:text-vault-midnight transition-colors cursor-pointer">
              ig
            </div>
            <div className="w-8 h-8 rounded-full bg-vault-coffee flex items-center justify-center text-vault-cream/50 hover:bg-vault-gold hover:text-vault-midnight transition-colors cursor-pointer">
              wa
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
