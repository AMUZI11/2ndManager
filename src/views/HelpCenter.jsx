"use client";
import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, ChevronDown, ChevronUp, BookOpen, 
  Gamepad2, Search, ShieldAlert, MessageCircle, 
  CheckCircle2, ArrowRight, ShoppingCart, Users, 
  Package, FileText, Check, PhoneCall
} from 'lucide-react';
import CashierSandbox from '../components/CashierSandbox';
import PanicHelpModal from '../components/PanicHelpModal';
import { api } from '../utils/api';

const GUIDE_MODULES = [
  {
    id: 'kasir-bon',
    title: '1. Alur Transaksi & Input Bon Kasir',
    badge: 'KASIR POS',
    icon: ShoppingCart,
    desc: 'Langkah mencatat penjualan harian, diskon bertingkat, dan status pembayaran.',
    steps: [
      'Buka menu [Kasir POS] di bilah navigasi sebelah kiri.',
      'Ketik nomor bon yang unik (contoh: BON-001). Jangan gunakan nomor yang sama dua kali.',
      'Pilih nama pelanggan. Jika pelanggan VIP, diskon bertingkat (LM/BR) otomatis aktif.',
      'Klik [+ Tambah Produk] lalu pilih barang dan masukkan jumlah (qty). Harga diskon langsung terhitung.',
      'Tentukan status: pilih "Piutang" jika belum bayar, atau "Lunas" jika uang kas sudah diterima penuh.',
      'Klik [SIMPAN BON]. Nota langsung tercatat ke sistem dan siap dicetak struk.'
    ]
  },
  {
    id: 'pelanggan-kasbon',
    title: '2. Kelola Pelanggan & Skema Diskon VIP',
    badge: 'PELANGGAN',
    icon: Users,
    desc: 'Cara mencatat langganan toko, diskon berjenjang, dan radar batas bonus belanja.',
    steps: [
      'Buka menu [Pelanggan] untuk melihat daftar semua langganan toko Anda.',
      'Klik [+ Tambah Pelanggan] untuk mendaftarkan nama pelanggan baru.',
      'Atur "Target Bonus Belanja" (misal Rp 10.000.000). Sistem akan menyalakan radar saat target tercapai.',
      'Atur diskon bertingkat per kategori (misal LM: Tahap 1 = 20%, Tahap 2 = 10%).',
      'Untuk melihat utang pelanggan atau mencetak surat piutang, klik tombol [Transaksi ➔] di baris pelanggan.'
    ]
  },
  {
    id: 'katalog-stok',
    title: '3. Katalog Produk & Pantau Stok Kritis',
    badge: 'INVENTORY',
    icon: Package,
    desc: 'Cara menyimpan barang jualan, memisahkan harga modal rahasia, dan radar restock.',
    steps: [
      'Buka menu [Produk] untuk melihat stok sisa dan status barang.',
      'Klik [+ Produk Baru] untuk menambah barang baru.',
      'Isi "Harga Beli Modal (HPP Rahasia)". Angka ini aman dan tidak akan pernah terlihat oleh pelanggan.',
      'Isi "Harga Jual Dasar" dan "Batas Kritis Stok" (misal 5 box).',
      'Jika stok sisa berada di bawah batas kritis, kartu produk akan berwarna oranye sebagai pengingat restock.'
    ]
  },
  {
    id: 'tutup-shift',
    title: '4. Tutup Shift & Rekap Finansial Bulanan',
    badge: 'KEUANGAN',
    icon: FileText,
    desc: 'Cara menyamakan kas laci saat tutup shift kasir dan mengunduh laporan PDF.',
    steps: [
      'Saat tutup shift kasir, buka [Dashboard Utama] untuk melihat "Penjualan Lunas" hari ini.',
      'Hitung fisik uang tunai di laci kasir dan pastikan sama dengan nominal Penjualan Lunas.',
      'Jika ada selisih kas, periksa log di menu [Pita Transaksi] atau klik tombol merah Bantuan Darurat.',
      'Di akhir bulan, buka menu [Laporan], pilih bulan yang diinginkan, lalu klik [Unduh PDF Rekap Keseluruhan].'
    ]
  }
];

const FAQS = [
  {
    q: "Apa perbedaan antara status Piutang dan Lunas?",
    cat: "KASIR",
    a: "Piutang berarti pelanggan membawa barang belanjaan namun belum membayar (uang masih berada di luar sebagai kasbon). Lunas berarti uang pembayaran sudah Anda terima secara nyata. Laba bersih dan omzet toko dihitung hanya dari nota berstatus 'Lunas' (menggunakan prinsip Cash Basis)."
  },
  {
    q: "Kenapa perhitungan diskon bertingkat (misal 20% + 10%) tidak sama dengan 30%?",
    cat: "KASIR",
    a: "Diskon bertingkat dihitung berjenjang (cascading). Contoh barang Rp10.000: Tahap 1 dipotong 20% menjadi Rp8.000. Lalu Tahap 2 dipotong 10% DARI Rp8.000 (potongan Rp800), sehingga harga akhir adalah Rp7.200 (setara potongan 28%, bukan 30%). Cara ini adalah standar baku bisnis grosir agar keuntungan toko Anda tetap aman."
  },
  {
    q: "Bagaimana cara mencatat setoran saat pelanggan melunasi utang kasbonnya?",
    cat: "PELANGGAN",
    a: "Buka menu Pelanggan, klik tombol [Transaksi ➔] pada nama pelanggan terkait. Cari nomor bon yang ingin dilunasi, lalu klik tombol [Setor Lunas]. Masukkan tanggal penerimaan uang dan simpan. Status nota akan langsung berubah menjadi hijau 'Lunas' dan omzet toko akan bertambah seketika."
  },
  {
    q: "Jika saya salah mengetik data bon yang sudah disimpan, apakah bisa diperbaiki?",
    cat: "KASIR",
    a: "Bisa. Buka menu Pita Transaksi atau buka riwayat transaksi di halaman Pelanggan. Klik tombol [Ubah] pada bon yang salah. Anda dapat mengoreksi jumlah barang atau ongkir, lalu simpan ulang. Sistem akan menghitung ulang seluruh saldo dan laba secara otomatis."
  },
  {
    q: "Apa itu Ongkir dan kenapa tidak masuk ke dalam laba bersih toko?",
    cat: "LAPORAN",
    a: "Ongkir (Ongkos Kirim) adalah uang titipan pelanggan untuk kurir atau driver pengantaran barang. Karena uang tersebut langsung diteruskan ke kurir, maka ongkir hanya ditambahkan ke total tagihan pelanggan, namun tidak diakui sebagai laba toko Anda."
  },
  {
    q: "Bagaimana cara mengubah nama warung / toko yang tampil di bagian atas?",
    cat: "PENGATURAN",
    a: "Buka menu Pengaturan, lalu pada kartu paling atas 'Profil Toko & Warung', ketik nama toko Anda yang baru dan klik [SIMPAN PROFIL TOKO]. Nama baru akan langsung muncul di Dashboard dan semua laporan."
  }
];

const GLOSSARY = [
  { term: "Bon / Nota", desc: "Bukti catatan transaksi penjualan produk per nomor unik." },
  { term: "LM (Langsung Minum)", desc: "Kategori tipe produk kemasan siap konsumsi langsung." },
  { term: "BR (Berbagai Rasa)", desc: "Kategori tipe produk varian serbuk/olahan aneka rasa." },
  { term: "Omzet Lunas", desc: "Total penerimaan uang kotor dari penjualan yang sudah dibayar tunai/transfer." },
  { term: "Laba Bersih", desc: "Keuntungan riil toko (Harga Jual setelah diskon dikurangi Harga Modal beli)." },
  { term: "Piutang (Kasbon)", desc: "Tagihan belanjaan pelanggan yang masih tertunda dan belum dibayarkan." },
  { term: "Cash Basis", desc: "Standar pembukuan di mana transaksi baru diakui saat uang fisik sudah diterima." },
  { term: "Threshold", desc: "Batas target akumulasi belanjaan pelanggan untuk berhak mendapat bonus gratis." }
];

export default function HelpCenter() {
  const [activeHubTab, setActiveHubTab] = useState('guide'); // 'guide' | 'faq' | 'sandbox'
  const [isPanicOpen, setIsPanicOpen] = useState(false);
  const [shopName, setShopName] = useState("Toko Saya");
  
  // FAQ state
  const [faqSearch, setFaqSearch] = useState("");
  const [faqCategory, setFaqCategory] = useState("SEMUA");
  const [openFaqIndex, setOpenFaqIndex] = useState(0); // Buka FAQ pertama secara default

  useEffect(() => {
    let isMounted = true;
    async function loadShop() {
      try {
        const profile = await api.getShopProfile();
        if (isMounted && profile?.name) {
          setShopName(profile.name);
        } else {
          const cached = typeof window !== 'undefined' ? localStorage.getItem('hl_current_shop_name') : null;
          if (isMounted && cached) setShopName(cached);
        }
      } catch (e) {
        const cached = typeof window !== 'undefined' ? localStorage.getItem('hl_current_shop_name') : null;
        if (isMounted && cached) setShopName(cached);
      }
    }
    loadShop();
    return () => { isMounted = false; };
  }, []);

  const filteredFaqs = FAQS.filter(f => {
    const matchCat = faqCategory === "SEMUA" || f.cat === faqCategory;
    const matchSearch = f.q.toLowerCase().includes(faqSearch.toLowerCase()) || 
                        f.a.toLowerCase().includes(faqSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6 pb-32">
      {/* ========================================================
          HEADER WITH PROMINENT THE PANIC BUTTON (GLOBAL SOS)
      ======================================================== */}
      <div className="bg-white rounded-2xl p-6 border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-black bg-slate-900 text-[#CCFF00] px-2 py-0.5 rounded border border-slate-800">
              PUSAT BANTUAN RESMI
            </span>
            <span className="text-xs font-mono font-bold text-slate-500">
              AREA: {shopName}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-display uppercase tracking-tight mt-1">
            Bantuan, Panduan &amp; Ruang Latihan
          </h1>
          <p className="text-xs font-sans text-slate-600 mt-1">
            Panduan lengkap alur kerja harian, jawaban kendala umum, dan area simulasi kasir tanpa risiko data.
          </p>
        </div>

        {/* The Panic Button (Cadmium Red #E30022) */}
        <button
          onClick={() => setIsPanicOpen(true)}
          className="w-full md:w-auto h-12 px-5 bg-[#E30022] hover:bg-[#c2001d] text-white font-mono font-black text-xs uppercase rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_#000] flex items-center justify-center gap-2.5 cursor-pointer transition-all active:translate-y-0.5 shrink-0"
        >
          <ShieldAlert size={18} />
          <span>🆘 BANTUAN DARURAT WA</span>
        </button>
      </div>

      {/* ========================================================
          THE 3-TABBED HUB (LACI FOKUS RAMAH LANSIA)
      ======================================================== */}
      <div className="bg-white/70 backdrop-blur-md p-2 rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] grid grid-cols-3 gap-2">
        <button
          onClick={() => setActiveHubTab('guide')}
          className={`h-12 rounded-xl font-mono font-black text-xs uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeHubTab === 'guide'
              ? 'bg-[#CCFF00] text-slate-900 border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BookOpen size={16} />
          <span className="hidden sm:inline">1.</span> <span>BUKU PANDUAN</span>
        </button>

        <button
          onClick={() => setActiveHubTab('faq')}
          className={`h-12 rounded-xl font-mono font-black text-xs uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeHubTab === 'faq'
              ? 'bg-[#CCFF00] text-slate-900 border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <HelpCircle size={16} />
          <span className="hidden sm:inline">2.</span> <span>TANYA JAWAB (FAQ)</span>
        </button>

        <button
          onClick={() => setActiveHubTab('sandbox')}
          className={`h-12 rounded-xl font-mono font-black text-xs uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeHubTab === 'sandbox'
              ? 'bg-[#CCFF00] text-slate-900 border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Gamepad2 size={16} />
          <span className="hidden sm:inline">3.</span> <span>RUANG LATIHAN</span>
        </button>
      </div>

      {/* ========================================================
          TAB 1: BUKU PANDUAN (SOLID GROUND BG-WHITE)
      ======================================================== */}
      {activeHubTab === 'guide' && (
        <div className="space-y-6">
          {/* Checklist Ringkas Harian Kasir */}
          <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-5 shadow-[3px_3px_0px_#D97706] space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-base">📋</span>
              <h3 className="text-sm font-display font-black text-amber-950 uppercase tracking-wide">
                Checklist Harian Kasir Toko (Senior-Friendly)
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-sans">
              <div className="bg-white p-3.5 rounded-xl border border-amber-300 space-y-1">
                <span className="text-[10px] font-mono font-bold bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">
                  PAGI (Buka Kasir)
                </span>
                <p className="font-bold text-slate-900">Hitung Modal Kas Awal</p>
                <p className="text-slate-600 text-[11px]">Pastikan uang pecahan kecil di laci cukup untuk kembalian.</p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-amber-300 space-y-1">
                <span className="text-[10px] font-mono font-bold bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">
                  SIANG (Operasional)
                </span>
                <p className="font-bold text-slate-900">Catat Setiap Bon</p>
                <p className="text-slate-600 text-[11px]">Jangan biarkan barang keluar tanpa nomor bon tercatat di aplikasi.</p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-amber-300 space-y-1">
                <span className="text-[10px] font-mono font-bold bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">
                  MALAM (Tutup Shift)
                </span>
                <p className="font-bold text-slate-900">Samakan Fisik Kas</p>
                <p className="text-slate-600 text-[11px]">Total fisik uang laci wajib sama dengan Penjualan Lunas di Dashboard.</p>
              </div>
            </div>
          </div>

          {/* 4 Modul Panduan Utama */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {GUIDE_MODULES.map((mod) => {
              const IconComponent = mod.icon;
              return (
                <div 
                  key={mod.id}
                  className="bg-white rounded-2xl p-6 border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-[#CCFF00] border-2 border-slate-800 flex items-center justify-center font-bold shadow-[2px_2px_0px_#1E293B] shrink-0">
                        <IconComponent size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-display font-black text-slate-900 uppercase">
                          {mod.title}
                        </h3>
                        <p className="text-[11px] font-mono text-slate-500">{mod.desc}</p>
                      </div>
                    </div>
                  </div>

                  {/* Steps List */}
                  <div className="space-y-2.5">
                    {mod.steps.map((stepText, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs font-sans">
                        <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-400 text-slate-800 font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-slate-700 leading-relaxed font-medium">
                          {stepText}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: TANYA JAWAB (FAQ) & GLOSARIUM (SOLID GROUND)
      ======================================================== */}
      {activeHubTab === 'faq' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Kolom Kiri: Search & Accordions FAQ */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl p-5 border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h3 className="text-base font-display font-black text-slate-900 uppercase">
                  Pencarian Solusi Masalah Toko
                </h3>
                <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-300">
                  {filteredFaqs.length} Pertanyaan Ditemukan
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                  placeholder="Ketik kata kunci (misal: diskon, utang, kasir, ongkir)..."
                  className="w-full h-11 bg-slate-50 border-2 border-slate-800 rounded-xl pl-10 pr-4 text-xs font-sans font-medium text-slate-900 outline-none focus:ring-2 focus:ring-[#CCFF00]"
                />
              </div>

              {/* Kapsul Filter Kategori */}
              <div className="flex flex-wrap gap-1.5">
                {['SEMUA', 'KASIR', 'PELANGGAN', 'LAPORAN', 'PENGATURAN'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFaqCategory(cat)}
                    className={`h-7 px-3 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                      faqCategory === cat
                        ? 'bg-slate-900 text-[#CCFF00] border border-slate-900'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Accordion FAQ Cards */}
            <div className="space-y-3">
              {filteredFaqs.length > 0 ? (
                filteredFaqs.map((faq, index) => {
                  const isOpen = openFaqIndex === index;
                  return (
                    <div 
                      key={index}
                      className="bg-white border-2 border-slate-800 rounded-2xl overflow-hidden shadow-[3px_3px_0px_#1E293B]"
                    >
                      <button 
                        onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                        className="w-full p-4.5 bg-slate-50 hover:bg-slate-100/80 text-left font-display font-bold text-xs sm:text-sm text-slate-900 flex justify-between items-center transition-all cursor-pointer gap-3"
                      >
                        <span className="leading-snug">{faq.q}</span>
                        <div className="w-6 h-6 rounded-lg bg-white border border-slate-300 flex items-center justify-center shrink-0">
                          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                      </button>
                      {isOpen && (
                        <div className="p-5 bg-white text-xs font-sans text-slate-700 leading-relaxed border-t border-slate-200">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="bg-white p-8 rounded-2xl border-2 border-slate-800 text-center space-y-2 shadow-[3px_3px_0px_#1E293B]">
                  <p className="text-xs font-mono font-bold text-slate-600">Tidak ada pertanyaan yang sesuai kata kunci.</p>
                  <p className="text-[11px] text-slate-400">Silakan klik tombol Bantuan Darurat WA jika Anda memerlukan jawaban segera.</p>
                </div>
              )}
            </div>
          </div>

          {/* Kolom Kanan: Glosarium Istilah Pembukuan */}
          <div className="bg-white rounded-2xl p-6 border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-[#CCFF00] flex items-center justify-center font-bold">
                <HelpCircle size={16} />
              </div>
              <div>
                <h3 className="text-sm font-display font-black text-slate-900 uppercase">
                  Glosarium Istilah Toko
                </h3>
                <p className="text-[10px] font-mono text-slate-500">Kamus istilah administrasi warung</p>
              </div>
            </div>

            <div className="space-y-3">
              {GLOSSARY.map((g, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
                  <p className="text-xs font-mono font-bold text-slate-900">{g.term}</p>
                  <p className="text-[11px] font-sans text-slate-600 leading-relaxed">{g.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: RUANG LATIHAN KASIR (STATELESS SANDBOX)
      ======================================================== */}
      {activeHubTab === 'sandbox' && (
        <CashierSandbox />
      )}

      {/* ========================================================
          FLOATING PANIC BUTTON (JALUR EVAKUASI SELALU TAMPAK)
      ======================================================== */}
      <button
        onClick={() => setIsPanicOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-[#E30022] hover:bg-[#c2001d] text-white p-3.5 sm:px-5 sm:py-3.5 rounded-2xl border-2 border-slate-950 shadow-[4px_4px_0px_#000] flex items-center gap-2 font-mono font-black text-xs uppercase cursor-pointer transition-all hover:scale-105 active:scale-95"
        title="Bantuan Darurat WhatsApp"
      >
        <ShieldAlert size={18} className="animate-pulse" />
        <span className="hidden sm:inline">BANTUAN DARURAT WA</span>
      </button>

      {/* Panic Modal */}
      <PanicHelpModal 
        isOpen={isPanicOpen} 
        onClose={() => setIsPanicOpen(false)} 
        shopName={shopName} 
      />
    </div>
  );
}

