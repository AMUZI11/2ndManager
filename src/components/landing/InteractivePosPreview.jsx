"use client";
import React, { useState } from 'react';
import { 
  ShoppingCart, Users, Package, BarChart3, CheckCircle, Percent, 
  Printer, ArrowUpRight, Search, Plus, Calendar, AlertTriangle, ShieldCheck, ChevronRight
} from 'lucide-react';

export default function InteractivePosPreview() {
  const [activeTab, setActiveTab] = useState('kasir');

  const tabs = [
    { id: 'kasir', label: '1. Kasir & Bon Bertingkat', icon: ShoppingCart },
    { id: 'pelanggan', label: '2. Kasbon & CRM Pelanggan', icon: Users },
    { id: 'produk', label: '3. Stok & Katalog Produk', icon: Package },
    { id: 'laporan', label: '4. Laporan Laba/Rugi Real-Time', icon: BarChart3 },
  ];

  return (
    <section id="demo" className="py-20 bg-[#2C120A] border-t border-b border-[#4E271B] relative overflow-hidden text-white">
      {/* AMBIENT LIGHT */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-[#C97B1A]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#6B4F3A]/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center w-full max-w-3xl mx-auto mb-12 space-y-4">
          <span className="text-xs font-black text-amber-200 uppercase tracking-widest px-3 py-1 bg-[#C97B1A]/20 border border-[#C97B1A]/40 rounded-xl">
            Pratinjau Langsung Aplikasi Kasir
          </span>
          <h2 className="w-full text-3xl sm:text-5xl font-black text-white tracking-tight font-heading">
            Antarmuka Kasir &amp; Pembukuan <br />
            <span className="text-[#C97B1A] underline decoration-[#C97B1A]/40 underline-offset-4">
              2ndManager POS
            </span>
          </h2>
          <p className="w-full text-amber-100/80 text-sm sm:text-base">
            Klik tab di bawah ini untuk mensimulasikan fitur kasir, pengawasan kasbon pelanggan, stok barang, dan laporan keuangan.
          </p>
        </div>

        {/* DEMO CONTAINER MOCKUP */}
        <div className="max-w-5xl mx-auto bg-[#3D1A0F] border border-[#4E271B] rounded-3xl shadow-2xl overflow-hidden">
          
          {/* WINDOW HEADER / TAB BAR */}
          <div className="bg-[#2C120A] px-4 py-3 border-b border-[#4E271B] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 text-xs font-mono text-amber-100/60 font-medium hidden sm:inline">
                https://pos.2ndManager.com/dashboard
              </span>
            </div>

            {/* INTERACTIVE MODULE TABS */}
            <div className="flex items-center gap-1 bg-[#3D1A0F] p-1 rounded-xl border border-[#4E271B] overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                      isActive 
                        ? 'bg-[#C97B1A] text-white shadow-md shadow-[#C97B1A]/30' 
                        : 'text-amber-100/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TAB CONTENT DEMO SCREEN */}
          <div className="p-6 md:p-8 min-h-[480px] flex flex-col justify-between bg-[#3D1A0F]">
            
            {/* 1. KASIR TAB */}
            {activeTab === 'kasir' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 bg-[#2C120A] p-4 rounded-2xl border border-[#4E271B]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#C97B1A]/20 text-[#C97B1A] flex items-center justify-center font-bold border border-[#C97B1A]/30">
                      #8492
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Bon Kasir Baru</h4>
                      <p className="text-xs text-amber-100/70">Pelanggan: <strong className="text-amber-300">Toko Jaya Abadi (Grosir)</strong></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-3 py-1 rounded-xl bg-[#C97B1A]/20 text-amber-200 font-bold border border-[#C97B1A]/40">
                      Diskon Bertingkat Aktif (10% + 5%)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Cart List */}
                  <div className="md:col-span-2 space-y-3">
                    <div className="text-xs font-bold text-amber-100/60 uppercase tracking-wider">Item Transaksi (3 Barang)</div>
                    <div className="bg-[#2C120A] rounded-xl p-3.5 border border-[#4E271B] flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-white">Kopi Arabika Premium 1kg</div>
                        <div className="text-xs text-amber-100/70">Harga Modal: Rp 75.000 • Selling: Rp 120.000</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-extrabold text-[#C97B1A]">2x @ Rp 102.600</div>
                        <div className="text-[10px] text-amber-300 font-bold">Diskon 10%+5% Applied</div>
                      </div>
                    </div>

                    <div className="bg-[#2C120A] rounded-xl p-3.5 border border-[#4E271B] flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-white">Gula Aren Organik 500g</div>
                        <div className="text-xs text-amber-100/70">Harga Modal: Rp 18.000 • Selling: Rp 30.000</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-extrabold text-[#C97B1A]">5x @ Rp 25.650</div>
                        <div className="text-[10px] text-amber-300 font-bold">Diskon 10%+5% Applied</div>
                      </div>
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="bg-[#2C120A] border border-[#4E271B] rounded-2xl p-5 flex flex-col justify-between space-y-4">
                    <div>
                      <span className="text-xs text-amber-100/70 font-bold block mb-1">Total Tagihan Bersih</span>
                      <div className="text-3xl font-black text-[#C97B1A] font-mono">
                        Rp 333.450
                      </div>
                      <div className="text-[11px] text-amber-100/80 mt-2 space-y-1">
                        <div className="flex justify-between"><span>Subtotal Nominal:</span> <span>Rp 390.000</span></div>
                        <div className="flex justify-between text-amber-300"><span>Hemat Diskon (10%+5%):</span> <span>- Rp 56.550</span></div>
                        <div className="flex justify-between text-emerald-400"><span>Estimasi Profit:</span> <span>+ Rp 93.450</span></div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <button className="w-full py-2.5 rounded-xl bg-[#C97B1A] text-white font-extrabold text-xs flex items-center justify-center gap-2 hover:bg-[#b06a14] active:scale-[0.97] transition-all cursor-pointer shadow-md">
                        <CheckCircle size={14} /> Cetak Bon & Simpan
                      </button>
                      <button className="w-full py-2 rounded-xl bg-[#3D1A0F] text-amber-100 border border-[#4E271B] font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#4E271B] transition-colors cursor-pointer">
                        <Printer size={14} /> Cetak Termal 58mm
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. PELANGGAN TAB */}
            {activeTab === 'pelanggan' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-bold text-white">Buku Kasbon & Limit Piutang Pelanggan</h4>
                    <p className="text-xs text-amber-100/70">Otomatis hitung batas kasbon & pengingat jatuh tempo</p>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-xl bg-[#C97B1A]/20 text-amber-200 font-bold border border-[#C97B1A]/40">
                    Total Piutang Toko: Rp 4.250.000
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="bg-[#2C120A] border border-[#4E271B] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#C97B1A]/20 text-[#C97B1A] font-black flex items-center justify-center border border-[#C97B1A]/30">
                        PA
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">Pak Ahmad (Toko Kelontong Berkah)</div>
                        <div className="text-xs text-amber-100/70">Limit Kasbon: Rp 5.000.000 • Terpakai: Rp 2.800.000</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-black text-rose-300 font-mono">Rp 2.800.000</div>
                        <div className="text-[10px] text-amber-300 font-bold">Jatuh Tempo: 3 hari lagi</div>
                      </div>
                      <button className="px-3 py-1.5 rounded-xl bg-[#C97B1A] text-white text-xs font-bold transition-all active:scale-[0.97] cursor-pointer">
                        Kirim WA Reminder
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#2C120A] border border-[#4E271B] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-300 font-black flex items-center justify-center border border-emerald-500/30">
                        BU
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">Bu Utami (Kantin Resto Utama)</div>
                        <div className="text-xs text-amber-100/70">Limit Kasbon: Rp 3.000.000 • Terpakai: Rp 1.450.000</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-black text-emerald-400 font-mono">Rp 1.450.000</div>
                        <div className="text-[10px] text-emerald-300 font-bold">Status: Lancar</div>
                      </div>
                      <button className="px-3 py-1.5 rounded-xl bg-[#3D1A0F] text-amber-100 border border-[#4E271B] text-xs font-bold transition-all cursor-pointer">
                        Pelunasan Bulan Ini
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. PRODUK TAB */}
            {activeTab === 'produk' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h4 className="text-base font-bold text-white">Katalog Produk & Alert Stok Menipis</h4>
                    <p className="text-xs text-amber-100/70">Otomatisasi Margin Modal HPP & Peringatan Re-order</p>
                  </div>
                  <button className="px-3.5 py-1.5 rounded-xl bg-[#C97B1A] text-white text-xs font-black flex items-center gap-1.5">
                    <Plus size={14} /> Tambah Produk
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-[#2C120A] p-4 rounded-2xl border border-[#4E271B] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#C97B1A]">Kategori: Biji Kopi</div>
                      <div className="text-sm font-bold text-white">Espresso Blend Signature 1kg</div>
                      <div className="text-xs text-amber-100/70">Modal: Rp 80.000 | Jual: Rp 135.000</div>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-black border border-emerald-500/30">
                        Stok: 48 Pack
                      </span>
                      <div className="text-[10px] text-amber-300 mt-1">Margin: 40.7%</div>
                    </div>
                  </div>

                  <div className="bg-[#2C120A] p-4 rounded-2xl border border-[#4E271B] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#C97B1A]">Kategori: Sirup & Perasa</div>
                      <div className="text-sm font-bold text-white">Sirup Vanilla Premium 750ml</div>
                      <div className="text-xs text-amber-100/70">Modal: Rp 45.000 | Jual: Rp 75.000</div>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-300 text-xs font-black border border-rose-500/30">
                        Stok Menipis (3 Botol)
                      </span>
                      <div className="text-[10px] text-amber-300 mt-1">Order Ulang Segera</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. LAPORAN TAB */}
            {activeTab === 'laporan' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-bold text-white">Laporan Keuangan Audit-Ready (Bulan Ini)</h4>
                    <p className="text-xs text-amber-100/70">Penjualan bersih, HPP modal, laba kotor & bersih terhitung otomatis</p>
                  </div>
                  <span className="text-xs text-[#C97B1A] font-bold bg-[#C97B1A]/20 px-3 py-1 rounded-xl border border-[#C97B1A]/40">
                    Auto-Calculated
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-[#2C120A] p-4 rounded-2xl border border-[#4E271B]">
                    <span className="text-xs text-amber-100/70 font-semibold">Total Omzet Penjualan</span>
                    <div className="text-2xl font-black text-white font-mono mt-1">Rp 48.250.000</div>
                    <span className="text-[10px] text-emerald-400 font-bold">↑ +14.2% dari bulan lalu</span>
                  </div>

                  <div className="bg-[#2C120A] p-4 rounded-2xl border border-[#4E271B]">
                    <span className="text-xs text-amber-100/70 font-semibold">Total HPP Modal Barang</span>
                    <div className="text-2xl font-black text-amber-100/80 font-mono mt-1">Rp 31.100.000</div>
                    <span className="text-[10px] text-amber-100/60 font-bold">Harga Pokok Penjualan</span>
                  </div>

                  <div className="bg-[#2C120A] p-4 rounded-2xl border border-[#C97B1A]/50 bg-[#C97B1A]/10">
                    <span className="text-xs text-amber-200 font-semibold">Laba Bersih Toko</span>
                    <div className="text-2xl font-black text-[#C97B1A] font-mono mt-1">Rp 17.150.000</div>
                    <span className="text-[10px] text-amber-300 font-bold">Margin Laba: 35.5%</span>
                  </div>
                </div>
              </div>
            )}

            {/* DEMO FOOTER BANNER */}
            <div className="mt-8 pt-4 border-t border-[#4E271B] flex flex-wrap items-center justify-between gap-3 text-xs text-amber-100/70">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#C97B1A]" />
                <span>Mode Simulasi Interaktif • Data tersinkronisasi tanpa delay</span>
              </div>
              <a href="#harga" className="text-[#C97B1A] font-extrabold hover:underline inline-flex items-center gap-1">
                <span>Coba Sistem Selengkapnya</span>
                <ChevronRight size={14} />
              </a>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
