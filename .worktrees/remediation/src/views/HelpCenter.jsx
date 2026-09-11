"use client";
import React, { useState, useEffect } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, BookOpen, RefreshCw, Play, CheckCircle } from 'lucide-react';
import { useTutorial } from '../components/TutorialEngine';
import { api } from '../utils/api';

const TUTORIAL_TOPICS = [
  { id: "TUT-01", title: "Cara Menambah Pelanggan Baru", category: "DASAR (Pemula)", duration: "~3 menit" },
  { id: "TUT-02", title: "Cara Menambah Produk Baru", category: "DASAR (Pemula)", duration: "~2 menit" },
  { id: "TUT-03", title: "Cara Membuat Bon Penjualan", category: "DASAR (Pemula)", duration: "~5 menit", interactive: true },
  { id: "TUT-04", title: "Cara Melihat Daftar Piutang", category: "DASAR (Pemula)", duration: "~2 menit" },
  { id: "TUT-05", title: "Cara Melunaskan Bon (1 bon)", category: "MENENGAH", duration: "~2 menit" },
  { id: "TUT-06", title: "Cara Melunaskan Seluruh Bulan", category: "MENENGAH", duration: "~2 menit" },
  { id: "TUT-07", title: "Cara Mengatur Diskon Pelanggan", category: "MENENGAH", duration: "~4 menit" },
  { id: "TUT-08", title: "Cara Melihat Laporan & Export PDF", category: "MENENGAH", duration: "~3 menit" },
  { id: "TUT-09", title: "Cara Membuat Bon Bonus", category: "LANJUTAN", duration: "~4 menit" },
  { id: "TUT-10", title: "Memahami Omzet, Laba, dan Piutang", category: "LANJUTAN", duration: "~5 menit" },
  { id: "TUT-11", title: "Cara Mengedit dan Menghapus Data", category: "LANJUTAN", duration: "~3 menit" },
  { id: "TUT-12", title: "Cara Pembayaran Cicilan / Pelunasan Sebagian", category: "LANJUTAN", duration: "~4 menit", interactive: true }
];

const FAQS = [
  {
    q: "Apa bedanya Piutang dan Lunas?",
    a: "Piutang berarti pelanggan belum membayar pesanan mereka (uang Anda masih berada di luar). Lunas berarti uang pembayaran sudah Anda terima. Omzet dan Laba bersih Anda hanya dihitung dari transaksi yang statusnya sudah 'Lunas' (menggunakan dasar kas / cash basis)."
  },
  {
    q: "Kenapa jumlah diskon bertingkat yang dihitung aplikasi berbeda dari penjumlahan biasa?",
    a: "Diskon di aplikasi ini dihitung secara bertahap / bertingkat (cascading), bukan langsung dijumlahkan. Contoh: diskon 20% + 10% BUKAN berarti 30%, melainkan dihitung: Harga × 80% (diskon 20%), lalu hasilnya dikali lagi 90% (diskon 10%). Cara ini adalah standard perhitungan bisnis yang akurat untuk menghindari kerugian."
  },
  {
    q: "Bagaimana cara tahu pelanggan berhak dapat bonus produk gratis?",
    a: "Aplikasi ini akan otomatis memantau riwayat belanjaan pelanggan yang berstatus 'Lunas'. Begitu nilai akumulasinya melewati batas target target bonus (Threshold) yang Anda atur, notifikasi kuning peringatan bonus akan menyala di Dashboard. Anda tidak perlu menghitung manual lagi."
  },
  {
    q: "Jika saya menghapus pelanggan, apakah nota bon transaksinya ikut terhapus?",
    a: "Tidak. Menghapus pelanggan menggunakan sistem soft-delete. Nama pelanggan hanya akan disembunyikan dari pilihan saat membuat bon baru, namun seluruh riwayat nota penjualan dan rekap keuangan di bulan-bulan sebelumnya tetap aman disimpan."
  },
  {
    q: "Bagaimana cara cetak laporan bulanan untuk disimpan?",
    a: "Buka menu Laporan, pilih bulan dan tahun yang ingin Anda cetak di pojok kanan atas, lalu klik tombol 'Unduh PDF Rekap Keseluruhan'. Dokumen laporan rapi akan terbuka dan siap untuk dicetak atau disimpan di HP/Laptop Anda."
  },
  {
    q: "Apa itu Ongkir dan apakah mempengaruhi laba?",
    a: "Ongkir (Ongkos Kirim) adalah biaya kirim barang yang dititipkan pelanggan. Uang ongkir ini sifatnya hanya diteruskan (pass-through) ke kurir/driver Anda. Karena itu, ongkir ditambahkan ke total tagihan pelanggan, namun TIDAK dihitung dalam keuntungan bersih (Laba) bisnis Anda."
  },
  {
    q: "Jika saya salah isi data bon penjualan, apakah bisa diubah?",
    a: "Bisa. Buka menu Laporan atau Buka detail pelanggan terkait, cari nota bon yang salah, lalu klik tombol 'Ubah'. Anda bisa memperbaiki produk, jumlah quantity, atau ongkir. Saat disimpan, seluruh nilai total, omzet, dan laba akan dihitung ulang secara otomatis."
  },
  {
    q: "Kenapa nomor bon nota tidak boleh sama?",
    a: "Setiap transaksi harus memiliki nomor bon yang unik sebagai pembeda utama agar tidak membingungkan saat pencatatan keuangan dan penagihan piutang. Jika Anda mengetik nomor bon yang sudah ada, aplikasi akan memberikan peringatan merah."
  },
  {
    q: "Bagaimana cara mengulangi panduan tutorial jika lupa?",
    a: "Cukup buka menu Bantuan ini, lalu lihat daftar topik tutorial di bawah. Pilih topik yang ingin Anda latih, lalu klik tombol 'Mulai'. Sistem akan memandu Anda secara interaktif."
  }
];

const GLOSSARY = [
  { term: "Bon", desc: "Nota bukti transaksi penjualan produk." },
  { term: "LM (Langsung Minum)", desc: "Kategori tipe produk yang siap dikonsumsi langsung." },
  { term: "BR (Berbagai Rasa)", desc: "Kategori tipe produk dengan varian aneka rasa." },
  { term: "Omzet", desc: "Total uang hasil kotor penjualan (sebelum dikurangi modal, tidak termasuk ongkir)." },
  { term: "Laba Bersih", desc: "Keuntungan bersih yang diperoleh (Harga Jual Diskon dikurangi Harga Modal beli)." },
  { term: "Piutang", desc: "Tagihan pembayaran yang belum dibayar oleh pelanggan." },
  { term: "Lunas", desc: "Status transaksi di mana pelanggan sudah membayar tagihan penuh." },
  { term: "Ongkir", desc: "Ongkos kirim barang — diteruskan langsung, tidak masuk hitungan laba." },
  { term: "Threshold", desc: "Batas minimum akumulasi omzet lunas pelanggan untuk mendapatkan bonus gratis." },
  { term: "Cash Basis", desc: "Sistem pengakuan keuangan di mana omzet/laba hanya dihitung setelah uang benar-benar diterima (status Lunas)." }
];

export default function HelpCenter({ setView }) {
  const { restartOnboarding, startTutorial } = useTutorial();
  const [openFaq, setOpenFaq] = useState(null);
  const [search, setSearch] = useState("");
  const [completedList, setCompletedList] = useState([]);


  useEffect(() => {
    let active = true;
    api.getTutorialProgress().then(progress => {
      if (active && progress) {
        setCompletedList(progress.tutorials_completed || []);
      }
    }).catch(console.error);
    return () => { active = false; };
  }, []);

  const handleStartTutorial = (id) => {
    let targetView = "dashboard";
    if (id === "TUT-01" || id === "TUT-04" || id === "TUT-05" || id === "TUT-06" || id === "TUT-07" || id === "TUT-11" || id === "TUT-12") {
      targetView = "customers";
    } else if (id === "TUT-02") {
      targetView = "products";
    } else if (id === "TUT-03" || id === "TUT-09") {
      targetView = "transaction-form";
    } else if (id === "TUT-08") {
      targetView = "reporting";
    } else if (id === "TUT-10") {
      targetView = "dashboard";
    }

    setView(targetView);
    setTimeout(() => startTutorial(id), 150);
  };

  const filteredFaqs = FAQS.filter(f => 
    f.q.toLowerCase().includes(search.toLowerCase()) || 
    f.a.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-gold to-amber-deep text-white rounded-3xl p-6 md:p-8 shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-2 max-w-xl">
          <h1 className="text-display text-white text-2xl md:text-3xl">Pusat Bantuan & Panduan</h1>
          <p className="text-white/95 text-sm md:text-base">Butuh bantuan? Silakan cari jawaban FAQ di bawah, baca glosarium istilah, atau ulangi tur latihan interaktif kapan saja.</p>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col (2 Columns): Interactive Tutorials & FAQ */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 1: Interactive Guided Tutorials */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-50 pb-3">
              <h2 className="text-heading text-base flex items-center gap-1.5 text-navy-deep">
                <BookOpen size={20} /> Latihan Langkah-demi-Langkah
              </h2>
              <button 
                onClick={restartOnboarding}
                className="text-xs font-bold text-navy-bright hover:underline flex items-center gap-1 bg-navy-light px-3 py-1.5 rounded-lg"
              >
                <RefreshCw size={12} /> Ulangi Tur Pengenalan
              </button>
            </div>

            <div className="space-y-2.5">
              {TUTORIAL_TOPICS.map((t) => {
                const isCompleted = completedList.includes(t.id);
                return (
                  <div key={t.id} className="p-3 bg-gray-50 rounded-xl flex items-center justify-between border border-gray-100 hover:border-navy-ice/30 transition-all">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] bg-navy-ice text-navy-deep font-extrabold px-1.5 py-0.5 rounded">{t.id}</span>
                        <h4 className="text-xs font-bold text-charcoal-black">{t.title}</h4>
                      </div>
                      <p className="text-[10px] text-gray-400 font-semibold">{t.category} • Estimasi {t.duration}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {isCompleted && (
                        <span className="text-[10px] text-emerald-deep font-bold flex items-center gap-0.5 bg-emerald-mint px-2 py-1 rounded-md">
                          <CheckCircle size={12} /> Selesai
                        </span>
                      )}
                      <button 
                        onClick={() => handleStartTutorial(t.id)}
                        className={`text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                          t.id === 'TUT-03' 
                            ? 'bg-cta hover:bg-cta/90 text-primary font-extrabold font-mono' 
                            : 'bg-white hover:bg-gray-100 border border-gray-200 text-charcoal-medium'
                        }`}
                      >
                        <Play size={10} fill="currentColor" /> {isCompleted ? "Ulangi" : "Mulai"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: FAQ Accordions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="text-heading text-base">Pertanyaan yang Sering Ditanyakan (FAQ)</h2>
            
            {/* Search FAQ */}
            <div className="relative">
              <input 
                type="text"
                placeholder="Ketik pertanyaan untuk mencari..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-11 bg-gray-50 border-2 border-gray-200 rounded-xl px-4 text-xs focus:border-navy-bright outline-none transition-all"
              />
            </div>

            <div className="space-y-2.5">
              {filteredFaqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div key={index} className="border border-gray-100 rounded-xl overflow-hidden">
                    <button 
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      className="w-full p-4 bg-gray-50 hover:bg-gray-100/70 text-left font-bold text-xs text-charcoal-black flex justify-between items-center transition-colors"
                    >
                      <span>{faq.q}</span>
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {isOpen && (
                      <div className="p-4 bg-white text-xs text-charcoal-medium leading-relaxed border-t border-gray-50">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Col (1 Column): Glosarium istilah */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-heading text-base flex items-center gap-1 text-charcoal-black">
            <HelpCircle size={20} className="text-navy-bright" /> Glosarium Istilah
          </h2>
          <p className="text-gray-500 text-xs leading-relaxed border-b border-gray-50 pb-3">
            Kamus istilah pembukuan dan administrasi sederhana yang digunakan dalam aplikasi.
          </p>

          <div className="space-y-4">
            {GLOSSARY.map((g, idx) => (
              <div key={idx} className="space-y-0.5">
                <span className="text-xs font-bold text-navy-deep">{g.term}</span>
                <p className="text-xs text-charcoal-medium leading-relaxed">{g.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
