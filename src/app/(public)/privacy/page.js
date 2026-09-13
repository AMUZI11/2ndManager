import React from 'react';
import { ShieldCheck, Lock, EyeOff, Database, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';
import Breadcrumbs from '@/components/public/Breadcrumbs';

export const metadata = {
  title: 'Kebijakan Privasi & Kepatuhan UU PDP No. 27/2022',
  description:
    'Kebijakan privasi resmi 2ndManager berstandar UU PDP No. 27/2022. Perlindungan mutlak data omzet, utang kasbon warga, dan nomor WhatsApp toko.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Semantic Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Beranda', href: '/' },
          { label: 'Kebijakan Privasi' },
        ]}
      />

      {/* Header Banner */}
      <div className="bg-[#CCFF00] border-3 border-[#0B0F17] rounded-2xl p-6 md:p-8 shadow-[6px_6px_0px_#0B0F17]">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#0B0F17] text-amber-400 font-mono font-black text-xs uppercase mb-3">
          <ShieldCheck size={16} /> DOKUMEN HUKUM RESMI
        </div>
        <h1 className="font-display font-black text-2xl md:text-4xl text-[#0B0F17] uppercase tracking-tight">
          Kebijakan Privasi &amp; Kepatuhan UU PDP
        </h1>
        <p className="text-sm md:text-base text-slate-800 font-sans font-medium mt-2">
          Komitmen Perlindungan Data Pribadi Berdasarkan Undang-Undang Republik Indonesia Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP).
        </p>
        <p className="text-xs font-mono font-bold text-slate-700 mt-3">
          Berlaku Efektif: 1 Januari 2026 • Terakhir Diperbarui: September 2026
        </p>
      </div>

      {/* Core Principles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border-3 border-[#0B0F17] rounded-xl p-5 shadow-[4px_4px_0px_#0B0F17]">
          <Database className="text-amber-500 mb-2" size={24} />
          <h3 className="font-display font-black text-base text-[#0B0F17]">100% Hak Milik Toko</h3>
          <p className="text-xs text-slate-600 mt-1">
            Seluruh data transaksi, harga beli modal, omzet, dan nama pelanggan adalah milik sah pemilik warung.
          </p>
        </div>
        <div className="bg-white border-3 border-[#0B0F17] rounded-xl p-5 shadow-[4px_4px_0px_#0B0F17]">
          <EyeOff className="text-emerald-600 mb-2" size={24} />
          <h3 className="font-display font-black text-base text-[#0B0F17]">Anti-Jual Data Kasbon</h3>
          <p className="text-xs text-slate-600 mt-1">
            Data utang kasbon warga dan nomor WhatsApp tidak akan pernah dijual atau disewakan ke pihak pinjol/fintech manapun.
          </p>
        </div>
        <div className="bg-white border-3 border-[#0B0F17] rounded-xl p-5 shadow-[4px_4px_0px_#0B0F17]">
          <Lock className="text-blue-600 mb-2" size={24} />
          <h3 className="font-display font-black text-base text-[#0B0F17]">Bebas Pelacak Iklan</h3>
          <p className="text-xs text-slate-600 mt-1">
            Hanya menggunakan cookie teknis autentikasi sesi Supabase. Nol pixel Facebook, Google Ads, atau spyware pihak ketiga.
          </p>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="bg-white border-3 border-[#0B0F17] rounded-2xl p-6 md:p-10 shadow-[6px_6px_0px_#0B0F17] space-y-8 font-sans text-slate-800 leading-relaxed text-sm md:text-base">
        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="font-display font-black text-lg md:text-xl text-[#0B0F17] uppercase flex items-center gap-2 border-b-2 border-slate-200 pb-2">
            <span className="w-7 h-7 rounded-lg bg-amber-400 text-slate-900 font-mono font-black text-sm flex items-center justify-center border border-slate-900">
              1
            </span>
            Kepatuhan terhadap UU PDP No. 27 Tahun 2022
          </h2>
          <p>
            Platform <strong>2ndManager</strong> (dioperasikan oleh PT Klola Warung Teknologi Nusantara) mematuhi secara penuh amanat Undang-Undang Republik Indonesia Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP). Dalam arsitektur sistem kami:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
            <li>Pemilik Toko (Merchant) berkedudukan sebagai <strong>Pengendali Data Pribadi (Data Controller)</strong> atas data pelanggan warungnya.</li>
            <li>2ndManager bertindak semata-mata sebagai <strong>Prosesor Data Pribadi (Data Processor)</strong> yang mengamankan dan memproses data sesuai instruksi tertulis dan operasional merchant.</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="font-display font-black text-lg md:text-xl text-[#0B0F17] uppercase flex items-center gap-2 border-b-2 border-slate-200 pb-2">
            <span className="w-7 h-7 rounded-lg bg-amber-400 text-slate-900 font-mono font-black text-sm flex items-center justify-center border border-slate-900">
              2
            </span>
            Data yang Kami Kumpulkan &amp; Batasan Pemrosesan
          </h2>
          <p>
            Kami hanya mengumpulkan data yang mutlak diperlukan untuk keberlangsungan aplikasi kasir:
          </p>
          <div className="space-y-2 text-sm bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p><strong>A. Data Akun Pemilik Warung:</strong> Nama lengkap, alamat email, nomor WhatsApp untuk notifikasi dan pemulihan akun, serta nama toko/warung.</p>
            <p><strong>B. Data Operasional Kasir:</strong> Riwayat transaksi kas, harga modal, harga jual, stok produk, deposit tabung gas/galon rolling, dan rekonsiliasi kasir estafet.</p>
            <p><strong>C. Data Buku Kasbon Warga:</strong> Nama panggilan/identitas pelanggan lokal, batas limit piutang, dan saldo kembalian receh yang dititipkan.</p>
          </div>
          <div className="p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-900 text-xs font-mono font-bold flex items-center gap-2">
            <ShieldAlert size={16} strokeWidth={2.5} className="text-red-700 shrink-0" />
            <span>PERNYATAAN MUTLAK: Kami TIDAK PERNAH mengumpulkan NIK KTP warga, foto buku tabungan, atau data biometrik untuk fitur buku kasbon.</span>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="font-display font-black text-lg md:text-xl text-[#0B0F17] uppercase flex items-center gap-2 border-b-2 border-slate-200 pb-2">
            <span className="w-7 h-7 rounded-lg bg-amber-400 text-slate-900 font-mono font-black text-sm flex items-center justify-center border border-slate-900">
              3
            </span>
            Klausul Keamanan Buku Kasbon &amp; Nomor WhatsApp
          </h2>
          <p>
            Kami memahami bahwa hubungan utang-piutang antara pemilik warung dan warga sekitar adalah hal yang sangat privat dan sensitif. Oleh karena itu:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Tidak Ada Pihak Ketiga Penagih:</strong> 2ndManager bukan pinjaman online (pinjol). Kami tidak pernah menyewa debt collector atau membagikan data utang kasbon ke pihak luar.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Zero-Cost WhatsApp Direct:</strong> Pengiriman struk atau tagihan kasbon dilakukan langsung dari peramban pemilik toko melalui protokol <code>wa.me</code> resmi WhatsApp tanpa melalui server perantara berbayar.</span>
            </li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="font-display font-black text-lg md:text-xl text-[#0B0F17] uppercase flex items-center gap-2 border-b-2 border-slate-200 pb-2">
            <span className="w-7 h-7 rounded-lg bg-amber-400 text-slate-900 font-mono font-black text-sm flex items-center justify-center border border-slate-900">
              4
            </span>
            Kebijakan Cookie &amp; Penyimpanan Lokal (Offline-First)
          </h2>
          <p>
            Untuk mendukung operasi kasir saat listrik padam atau jaringan internet terputus, 2ndManager menyimpan data katalog dan antrean transaksi secara terenkripsi pada <strong>IndexedDB browser lokal</strong> perangkat Anda.
          </p>
          <p>
            Cookie yang digunakan pada domain <code>2ndmanager.vercel.app</code> adalah murni <em>Strictly Necessary Session Cookies</em> (HTTP-Only, Secure) yang dikelola oleh Supabase Auth untuk menjaga sesi login tetap aman.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="font-display font-black text-lg md:text-xl text-[#0B0F17] uppercase flex items-center gap-2 border-b-2 border-slate-200 pb-2">
            <span className="w-7 h-7 rounded-lg bg-amber-400 text-slate-900 font-mono font-black text-sm flex items-center justify-center border border-slate-900">
              5
            </span>
            Hak Pemilik Data &amp; Kontak Resmi DPO
          </h2>
          <p>
            Sesuai Pasal 5 hingga Pasal 13 UU PDP, pemilik toko berhak mengajukan penghapusan akun (Right to be Forgotten) dan pengunduhan seluruh riwayat data toko (Data Portability) dalam format spreadsheet/JSON kapan saja.
          </p>
          <div className="bg-slate-100 border border-slate-300 rounded-xl p-4 text-xs font-mono">
            <p className="font-bold text-slate-900">Petugas Perlindungan Data (Data Protection Officer):</p>
            <p className="text-slate-700 mt-1">Email: legal@2ndmanager.com</p>
            <p className="text-slate-700">WhatsApp Resmi: +62 812-3456-7890</p>
            <p className="text-slate-700">Alamat: Sentra Niaga Kelontong Indonesia, Jakarta Selatan, DKI Jakarta 12430</p>
          </div>
        </section>
      </div>
    </div>
  );
}
