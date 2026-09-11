import React from 'react';
import Link from 'next/link';
import { Check, ShieldCheck, Zap, Sparkles, HelpCircle, ArrowRight } from 'lucide-react';
import Breadcrumbs from '@/components/public/Breadcrumbs';

export const metadata = {
  title: 'Harga Paket Langganan | 2ndManager - OS Kasir Warung',
  description:
    'Pilihan harga transparan software kasir warung 2ndManager. Mulai gratis hingga paket autopilot anti-kebocoran kas, serah terima estafet, dan radar pasar subuh.',
};

export default function PricingPage() {
  const tiers = [
    {
      name: 'Magang',
      price: 'Rp 0',
      period: '/ bulan selamanya',
      desc: 'Cocok untuk warung pemula yang ingin mencoba sistem pencatatan digital rapi.',
      badge: 'GRATIS',
      badgeBg: 'bg-slate-200 text-slate-800',
      ctaText: 'Mulai Gratis Tanpa Kartu',
      ctaHref: '/pos',
      highlight: false,
      features: [
        'Batas 50 transaksi / bulan',
        'Pencatatan kasir & cetak struk',
        'Buku utang kasbon warga (dasar)',
        'Katalog produk mandiri',
        'Bebas biaya WhatsApp (wa.me)',
      ],
    },
    {
      name: 'Supervisor',
      price: 'Rp 149.000',
      period: '/ bulan',
      desc: 'Untuk warung kelontong mandiri yang ramai dengan ribuan transaksi bulanan.',
      badge: 'WARUNG MANDIRI',
      badgeBg: 'bg-blue-100 text-blue-900 border border-blue-400',
      ctaText: 'Pilih Paket Supervisor',
      ctaHref: '/login?plan=SUPERVISOR',
      highlight: false,
      features: [
        'Transaksi struk TANPA BATAS',
        'Maksimal 15 SKU Multi-Satuan (Dus ke Renceng)',
        'Pelacak hingga 20 Tabung Gas & Galon',
        'Maksimal 3 Vendor Titip Jual (Konsinyasi)',
        'PWA Offline-First saat internet mati',
        'Ekspor laporan penjualan Excel',
      ],
    },
    {
      name: 'Manajer',
      price: 'Rp 349.000',
      period: '/ bulan',
      desc: 'Senjata lengkap juragan warung yang ingin lepas toko tanpa was-was uang kas laci tekor.',
      badge: 'PALING BANYAK DIPILIH',
      badgeBg: 'bg-amber-400 text-slate-950 font-black border-2 border-slate-900 shadow-[2px_2px_0px_#0B0F17]',
      ctaText: 'Pilih Paket Manajer (Anti-Bocor)',
      ctaHref: '/login?plan=MANAJER',
      highlight: true,
      features: [
        'Semua fitur Supervisor TANPA BATAS',
        'Double-Blind Estafet Shift Handover',
        'Radar Jual Rugi & PIN Override Kasir',
        'Notifikasi Siluman Selisih Kasir Realtime',
        'Pelacak Tabung Gas & Galon Tanpa Batas',
        'Konsinyasi Kue Basah Tripartit Penuh',
        'Garansi 7 Hari 100% Uang Kembali',
      ],
    },
    {
      name: 'Eksekutif',
      price: 'Rp 399.000',
      period: '/ bulan',
      desc: 'Autopilot penuh untuk bos warung pemilik banyak cabang & belanja grosir pasar induk.',
      badge: 'MULTI-CABANG AUTOPILOT',
      badgeBg: 'bg-emerald-400 text-slate-950 font-black border-2 border-slate-900 shadow-[2px_2px_0px_#0B0F17]',
      ctaText: 'Pilih Paket Eksekutif',
      ctaHref: '/login?plan=EKSEKUTIF',
      highlight: false,
      features: [
        'Semua fitur Manajer lengkap',
        'Multi-Cabang (Hingga 3 Toko Sekaligus)',
        'Radar Belanja Pasar Subuh (Run-Rate Bebas Bias)',
        'Kalkulator Uang Tunai Belanja Kulakan',
        'Prioritas WhatsApp Bantuan Dedicated VIP',
        'Konsultasi Operasional Toko 1-on-1',
      ],
    },
  ];

  const faqs = [
    {
      q: 'Apakah ada garansi jika warung saya merasa tidak cocok?',
      a: 'Tentu saja! Kami memberikan Garansi 7 Hari 100% Uang Kembali tanpa syarat rumit. Jika dalam 7 hari pertama Anda merasa 2ndManager sulit dipelajari kasir Anda, hubungi WhatsApp kami dan dana Anda dikembalikan utuh 2x24 jam kerja.',
    },
    {
      q: 'Apakah saya harus membayar biaya per pesan WhatsApp?',
      a: 'Sama sekali TIDAK. 2ndManager 100% menggunakan tautan protokol langsung (wa.me). Struk dan tagihan kasbon dikirim langsung dari browser perangkat Anda tanpa biaya langganan API WhatsApp pihak ketiga.',
    },
    {
      q: 'Apakah sistem bisa berjalan di HP / Tablet Android murah?',
      a: 'Bisa! 2ndManager dibangun dengan teknologi PWA modern dan dynamic code-splitting yang sangat hemat RAM. Perangkat Android dengan RAM 2GB dapat menjalankan kasir dengan lancar.',
    },
    {
      q: 'Bagaimana jika internet di warung saya mati atau listrik padam?',
      a: 'Kasir tetap bisa melayani pembeli! Aplikasi kasir kami bekerja secara Offline-First dengan database lokal IndexedDB. Seluruh transaksi akan otomatis disinkronisasi ke server saat koneksi internet kembali pulih.',
    },
  ];

  return (
    <div className="space-y-12">
      {/* Semantic Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Beranda', href: '/' },
          { label: 'Harga Paket' },
        ]}
      />

      {/* Top Hero */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#0B0F17] text-amber-400 font-mono font-black text-xs uppercase shadow-[3px_3px_0px_#F59E0B]">
          <Sparkles size={15} /> BIAYA INVESTASI JURAGAN WARUNG
        </div>
        <h1 className="font-display font-black text-3xl md:text-5xl text-[#0B0F17] uppercase tracking-tight">
          Investasi Kecil untuk Mencegah Kebocoran Jutaan Rupiah
        </h1>
        <p className="text-sm md:text-base text-slate-600 font-sans leading-relaxed">
          Pilih paket yang sesuai dengan ukuran warung Anda. Tanpa biaya tersembunyi, tanpa komisi per transaksi, dan dilindungi garansi 100% uang kembali.
        </p>
      </div>

      {/* 4 Tier Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
        {tiers.map((t, idx) => (
          <div
            key={idx}
            className={`rounded-2xl border-3 border-[#0B0F17] flex flex-col justify-between p-6 transition-transform hover:-translate-y-1 duration-200 ${
              t.highlight
                ? 'bg-[#FFFBEB] shadow-[8px_8px_0px_#0B0F17] ring-2 ring-amber-400'
                : 'bg-white shadow-[6px_6px_0px_#0B0F17]'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded ${t.badgeBg}`}>
                  {t.badge}
                </span>
                {t.highlight && (
                  <span className="text-xs font-mono font-black text-amber-600 uppercase flex items-center gap-1">
                    <Sparkles size={12} strokeWidth={2.5} className="text-amber-600 fill-amber-600" />
                    REKOMENDASI
                  </span>
                )}
              </div>

              <div>
                <h3 className="font-display font-black text-2xl text-[#0B0F17] uppercase">
                  {t.name}
                </h3>
                <p className="text-xs text-slate-600 mt-1 min-h-[36px]">{t.desc}</p>
              </div>

              <div className="border-y-2 border-slate-200 py-3">
                <span className="font-display font-black text-3xl text-[#0B0F17]">{t.price}</span>
                <span className="text-xs font-mono font-bold text-slate-500 ml-1">{t.period}</span>
              </div>

              <ul className="space-y-2.5 text-xs font-sans text-slate-700">
                {t.features.map((f, fIdx) => (
                  <li key={fIdx} className="flex items-start gap-2">
                    <Check size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-snug">{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-6 mt-4 border-t border-slate-100">
              <Link
                href={t.ctaHref}
                className={`w-full py-3 rounded-xl font-mono font-black text-xs text-center border-2 border-[#0B0F17] shadow-[3px_3px_0px_#0B0F17] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  t.highlight
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-900'
                    : 'bg-white hover:bg-slate-100 text-slate-900'
                }`}
              >
                <span>{t.ctaText}</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Warung FAQs Section */}
      <div className="bg-white border-3 border-[#0B0F17] rounded-2xl p-6 md:p-10 shadow-[6px_6px_0px_#0B0F17] space-y-6 mt-12">
        <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-3">
          <HelpCircle size={24} className="text-amber-500" />
          <h2 className="font-display font-black text-xl text-[#0B0F17] uppercase">
            Pertanyaan Sering Diajukan Pemilik Warung
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {faqs.map((faq, fIdx) => (
            <div key={fIdx} className="space-y-2">
              <h4 className="font-display font-black text-sm text-slate-900 flex items-start gap-2">
                <span className="text-amber-500 font-mono font-bold">Q:</span>
                {faq.q}
              </h4>
              <p className="text-xs text-slate-600 font-sans leading-relaxed pl-5">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
