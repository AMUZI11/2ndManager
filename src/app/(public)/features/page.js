import React from 'react';
import Link from 'next/link';
import {
  PackageOpen,
  ShieldAlert,
  Coins,
  Flame,
  Cake,
  PiggyBank,
  Sunrise,
  WifiOff,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Check,
} from 'lucide-react';
import Breadcrumbs from '@/components/public/Breadcrumbs';

export const metadata = {
  title: 'Fitur Lengkap Kasir Warung Anti-Bocor | 2ndManager',
  description:
    'Pelajari 8 fitur operasional 2ndManager yang dirancang menghentikan kebocoran uang kas laci, pelacak tabung gas rolling, konsinyasi kue basah, dan radar pasar subuh.',
};

export default function FeaturesPage() {
  const features = [
    {
      id: '01',
      title: 'Multi-Tier Auto-Unpack',
      subtitle: 'Beli Dus / Slop, Jual Eceran Sachet Atomik',
      icon: PackageOpen,
      iconColor: 'text-amber-500',
      bgGlow: 'bg-amber-50',
      desc: 'Solusi kulakan warung: Beli Indomie kardusan dari agen, jual per bungkus atau per 5 bungkus tanpa repot memecah SKU atau merusak stok inventaris.',
      points: [
        'Konversi rasio satuan otomatis (1 Dus = 40 Pcs)',
        'Harga grosir vs eceran otomatis sesuai jumlah beli',
        'Stok terpotong atomik tanpa duplikasi master produk',
      ],
    },
    {
      id: '02',
      title: 'Double-Blind Estafet Handover',
      subtitle: 'Tutup Shift Blind Tanpa Tahu Expected Cash',
      icon: ShieldAlert,
      iconColor: 'text-red-500',
      bgGlow: 'bg-red-50',
      desc: 'Kasir keluar dan kasir masuk wajib menghitung fisik uang laci secara independen tanpa melihat angka ekspektasi komputer. Mencegah manipulasi uang sisa kasir.',
      points: [
        'Input fisik uang buta (Blind cash reconciliation)',
        'Notifikasi siluman via Supabase Realtime jika ada selisih',
        'Audit jejak serah terima modal awal shift berikutnya',
      ],
    },
    {
      id: '03',
      title: 'Radar Jual Rugi Real-Time',
      subtitle: 'Peringatan Margin Negatif & PIN Override Juragan',
      icon: Coins,
      iconColor: 'text-yellow-600',
      bgGlow: 'bg-yellow-50',
      desc: 'Mencegah kasir memberikan diskon kebablasan atau salah input harga yang membuat toko tekor di bawah harga beli pokok (HPP).',
      points: [
        'Deteksi instan harga jual < harga beli modal',
        'Mode Hard-Block atau PIN Otorisasi Khusus Pemilik',
        'Log audit transaksi jual rugi tersimpan permanen',
      ],
    },
    {
      id: '04',
      title: 'Pelacak Tabung Gas & Galon Rolling',
      subtitle: 'Amankan Aset Fisik Tabung Hijau 3kg & Galon Aqua',
      icon: Flame,
      iconColor: 'text-emerald-500',
      bgGlow: 'bg-emerald-50',
      desc: 'Sakelar taktil kasir untuk mencatat warga yang meminjam tabung gas kosong atau galon tanpa membayar deposit jaminan.',
      points: [
        'Pencatatan saldo tabung/galon pinjaman per pelanggan',
        'Peringatan otomatis saat warga berbelanja tanpa membawa tabung tukar',
        'Laporan neraca fisik tabung di warung vs tabung di warga',
      ],
    },
    {
      id: '05',
      title: 'Buku Konsinyasi Titip Jual Tripartit',
      subtitle: 'Bagi Hasil Bersih Kue Basah, Gorengan, & Kerupuk',
      icon: Cake,
      iconColor: 'text-purple-500',
      bgGlow: 'bg-purple-50',
      desc: 'Kelola titipan barang tetangga tanpa pusing kalkulasi bagi hasil manual dan potongan retur makanan basi/rusak.',
      points: [
        'Input stok titipan pagi & rekonsiliasi sisa fisik sore hari',
        'Kalkulasi otomatis porsi bagi hasil pemilik vs pembuat kue',
        'Cetak bukti pembayaran vendor langsung via WhatsApp',
      ],
    },
    {
      id: '06',
      title: 'Celengan Kembalian ke Kasbon',
      subtitle: 'Alokasi Kembalian Receh FIFO Tanpa Permen',
      icon: PiggyBank,
      iconColor: 'text-pink-500',
      bgGlow: 'bg-pink-50',
      desc: 'Solusi tidak ada uang receh: Tawarkan kembalian belanja untuk langsung memotong buku utang kasbon warga atau disimpan ke celengan belanja berikutnya.',
      points: [
        'Pemotongan utang kasbon dengan metode FIFO otomatis',
        'Penyimpanan saldo deposit kembalian per akun pelanggan',
        'Mutasi saldo terbit di struk kasir transparan',
      ],
    },
    {
      id: '07',
      title: 'Radar Belanja Pasar Subuh',
      subtitle: 'Rekomendasi Kulakan Cerdas Bebas Bias Stok Nol',
      icon: Sunrise,
      iconColor: 'text-orange-500',
      bgGlow: 'bg-orange-50',
      desc: 'Algoritma run-rate belanja yang memperhitungkan hari saat barang sempat kosong, sehingga estimasi kebutuhan kulakan pasar subuh tidak berkurang secara keliru.',
      points: [
        'Stockout-aware run-rate velocity calculator',
        'Pembulatan otomatis ke satuan kemasan grosir terbesar (Karton/Dus)',
        'Kalkulator kebutuhan uang tunai fisik sebelum berangkat ke pasar',
      ],
    },
    {
      id: '08',
      title: '100% PWA Offline-First Engine',
      subtitle: 'Transaksi Lancar Saat Mati Lampu & Sinyal Hilang',
      icon: WifiOff,
      iconColor: 'text-blue-500',
      bgGlow: 'bg-blue-50',
      desc: 'Dibangun dengan arsitektur IndexedDB browser mandiri. Kasir tetap dapat memindai barcode, membuka laci, dan mencetak struk saat internet terputus.',
      points: [
        'Antrean transaksi offline lokal di IndexedDB terenkripsi',
        'Otomatis rekonsiliasi data saat jaringan kembali pulih',
        'Mutasi saldo limit kasbon lokal mencegah over-credit offline',
      ],
    },
  ];

  return (
    <div className="space-y-12">
      {/* Semantic Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Beranda', href: '/' },
          { label: 'Fitur Kasir Anti-Bocor' },
        ]}
      />

      {/* Top Hero */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#0B0F17] text-amber-400 font-mono font-black text-xs uppercase shadow-[3px_3px_0px_#F59E0B]">
          <ShieldCheck size={15} /> SISTEM OPERASIONAL LENGKAP
        </div>
        <h1 className="font-display font-black text-3xl md:text-5xl text-[#0B0F17] uppercase tracking-tight">
          8 Fitur Pemecah Masalah Nyata Warung Kelontong
        </h1>
        <p className="text-sm md:text-base text-slate-600 font-sans leading-relaxed">
          Bukan sekadar kasir biasa. 2ndManager didesain dari realitas operasional warung: barang eceran, kasir nakal, tabung gas hilang, dan belanja subuh di pasar induk.
        </p>
      </div>

      {/* 8 Feature Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((f) => {
          const IconComponent = f.icon;
          return (
            <div
              key={f.id}
              className="bg-white border-3 border-[#0B0F17] rounded-2xl p-6 md:p-8 shadow-[6px_6px_0px_#0B0F17] flex flex-col justify-between space-y-6 hover:-translate-y-1 transition-transform duration-200"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-[#0B0F17] border-2 border-[#0B0F17] flex items-center justify-center shadow-[3px_3px_0px_#F59E0B]">
                    <IconComponent className={f.iconColor} size={24} />
                  </div>
                  <span className="font-mono font-black text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-300">
                    FITUR #{f.id}
                  </span>
                </div>

                <div>
                  <h3 className="font-display font-black text-xl md:text-2xl text-[#0B0F17] uppercase tracking-tight">
                    {f.title}
                  </h3>
                  <p className="text-xs font-mono font-bold text-amber-600 mt-0.5">
                    {f.subtitle}
                  </p>
                  <p className="text-sm text-slate-600 font-sans mt-3 leading-relaxed">
                    {f.desc}
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <ul className="space-y-2 text-xs font-sans text-slate-700">
                    {f.points.map((pt, ptIdx) => (
                      <li key={ptIdx} className="flex items-start gap-2">
                        <Check size={14} strokeWidth={2.5} className="text-amber-500 shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA Bottom Banner */}
      <div className="bg-[#0B0F17] text-white border-3 border-[#0B0F17] rounded-2xl p-8 md:p-12 shadow-[8px_8px_0px_#F59E0B] text-center space-y-6">
        <h2 className="font-display font-black text-2xl md:text-4xl uppercase tracking-tight text-white">
          Siap Mengamankan Warung Anda Sekarang?
        </h2>
        <p className="text-sm md:text-base text-slate-300 max-w-2xl mx-auto font-sans">
          Mulai gunakan kasir 2ndManager hari ini. Bebas biaya pendaftaran, tanpa perlu kartu kredit, dan langsung bisa digunakan di browser HP Anda.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link
            href="/pos"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono font-black text-sm border-2 border-white shadow-[4px_4px_0px_#FFFFFF] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles size={16} strokeWidth={2.5} className="text-slate-950 fill-slate-950" />
            <span>Buka Kasir Gratis Sekarang</span>
            <ArrowRight size={16} strokeWidth={2.5} />
          </Link>
          <Link
            href="/pricing"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#1E293B] hover:bg-slate-800 text-white font-mono font-black text-sm border-2 border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Lihat Paket Harga Lengkap</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
