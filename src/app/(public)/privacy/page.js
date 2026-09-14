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
            Platform <strong>2ndManager</strong> (dioperasikan secara resmi oleh <strong>PT Klola Warung Teknologi Nusantara</strong>) mematuhi secara penuh amanat Undang-Undang Republik Indonesia Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP). Dalam arsitektur sistem kami:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
            <li>Pemilik Toko (Juragan / Merchant) berkedudukan hukum sebagai <strong>Pengendali Data Pribadi (Data Controller)</strong> atas seluruh data transaksi dan profil pelanggan tokonya.</li>
            <li>2ndManager bertindak semata-mata sebagai <strong>Prosesor Data Pribadi (Data Processor)</strong> yang mengamankan, menyimpan, dan memproses data sesuai instruksi sah merchant tanpa mengklaim kepemilikan.</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="font-display font-black text-lg md:text-xl text-[#0B0F17] uppercase flex items-center gap-2 border-b-2 border-slate-200 pb-2">
            <span className="w-7 h-7 rounded-lg bg-amber-400 text-slate-900 font-mono font-black text-sm flex items-center justify-center border border-slate-900">
              2
            </span>
            Data yang Kami Proses &amp; Penegasan Anti-Jual Data
          </h2>
          <p>
            Kami hanya mengumpulkan dan memproses data yang mutlak esensial bagi operasional kasir, kepatuhan fiskal, dan logistik warung:
          </p>
          <div className="space-y-2 text-sm bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p><strong>A. Identitas Pemilik &amp; Akun Usaha:</strong> Nama pemilik usaha, alamat email terverifikasi, nomor WhatsApp aktif, serta nama dan alamat cabang usaha toko kelontong.</p>
            <p><strong>B. Data Transaksi &amp; Rekonsiliasi Fiskal (PP No. 55/2022):</strong> Riwayat penjualan kasir, harga pokok penjualan (HPP), omzet harian, dan ringkasan peredaran bruto untuk mempermudah pemenuhan kewajiban perpajakan UMKM (PP 55/2022 / NIK-NPWP integrasi bila relevan). Seluruh transmisi diamankan dengan enkripsi TLS 1.3 dan tersimpan dengan enkripsi AES-256 (encryption at rest).</p>
            <p><strong>C. Data Buku Kasbon &amp; Piutang Warga:</strong> Catatan utang kasbon pelanggan warung (nama panggilan/identitas lokal yang diinput kasir), limit piutang, dan riwayat cicilan pelunasan.</p>
          </div>
          <div className="p-3.5 bg-red-50 border-2 border-red-400 rounded-xl text-red-950 text-xs font-mono font-bold flex items-start gap-2.5">
            <ShieldAlert size={18} strokeWidth={2.5} className="text-red-700 shrink-0 mt-0.5" />
            <div>
              <p className="uppercase tracking-wide font-black text-red-900">Jaminan Mutlak Perlindungan Hak:</p>
              <p className="mt-0.5 text-red-800 font-sans font-medium text-xs">
                2ndManager TIDAK AKAN PERNAH memperjualbelikan, menyewakan, atau mendistribusikan data transaksi, buku kasbon warga, nomor telepon, atau data omzet toko Anda kepada lembaga pembiayaan pinjaman online (pinjol), pialang periklanan, atau pihak ketiga manapun.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="font-display font-black text-lg md:text-xl text-[#0B0F17] uppercase flex items-center gap-2 border-b-2 border-slate-200 pb-2">
            <span className="w-7 h-7 rounded-lg bg-amber-400 text-slate-900 font-mono font-black text-sm flex items-center justify-center border border-slate-900">
              3
            </span>
            Klausul Keamanan Buku Kasbon &amp; Pengiriman Struk
          </h2>
          <p>
            Kami memahami bahwa hubungan utang-piutang antara pemilik warung dan warga sekitar adalah hal yang sangat privat, kekeluargaan, dan sensitif. Oleh karena itu:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Bebas Dari Penagih Pihak Ketiga:</strong> 2ndManager bukan pinjaman online (P2P lending/pinjol). Kami tidak pernah menyewa debt collector atau membagikan data utang kasbon ke pihak luar.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Zero-Cost WhatsApp Direct:</strong> Pengiriman struk belanja atau pengingat tagihan kasbon dilakukan secara mandiri oleh browser perangkat Anda via tautan resmi <code>wa.me</code> WhatsApp tanpa melewati server perantara berbayar.</span>
            </li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="font-display font-black text-lg md:text-xl text-[#0B0F17] uppercase flex items-center gap-2 border-b-2 border-slate-200 pb-2">
            <span className="w-7 h-7 rounded-lg bg-amber-400 text-slate-900 font-mono font-black text-sm flex items-center justify-center border border-slate-900">
              4
            </span>
            Hak-Hak Subjek Data Pribadi (UU PDP Pasal 5 - 13)
          </h2>
          <p>
            Sebagai pemilik data, Anda dan pelanggan Anda memiliki hak-hak yang dijamin oleh hukum dan didukung penuh oleh platform 2ndManager:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-sans">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <strong className="text-slate-900 block font-mono text-[11px] uppercase mb-1">1. Hak Akses &amp; Informasi</strong>
              Hak untuk memperoleh kejelasan identitas, dasar kepentingan hukum, dan tujuan pemrosesan data.
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <strong className="text-slate-900 block font-mono text-[11px] uppercase mb-1">2. Hak Pembaruan &amp; Koreksi</strong>
              Hak untuk memperbarui dan membetulkan ketidakakuratan data profil atau inventaris toko sewaktu-waktu.
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <strong className="text-slate-900 block font-mono text-[11px] uppercase mb-1">3. Hak Penghapusan (Right to Erasure)</strong>
              Hak untuk mengakhiri pemrosesan, menghapus, atau memusnahkan data akun toko dari basis data 2ndManager.
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <strong className="text-slate-900 block font-mono text-[11px] uppercase mb-1">4. Hak Portabilitas Data</strong>
              Hak untuk mengunduh seluruh arsip transaksi dan master produk dalam format standar CSV/JSON yang dapat dibaca mesin.
            </div>
          </div>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="font-display font-black text-lg md:text-xl text-[#0B0F17] uppercase flex items-center gap-2 border-b-2 border-slate-200 pb-2">
            <span className="w-7 h-7 rounded-lg bg-amber-400 text-slate-900 font-mono font-black text-sm flex items-center justify-center border border-slate-900">
              5
            </span>
            Penyimpanan Lokal (Offline-First) &amp; Kuki Teknis
          </h2>
          <p>
            Untuk mendukung operasi kasir saat listrik padam atau jaringan seluler terputus, 2ndManager mengandalkan <strong>IndexedDB browser lokal</strong> pada perangkat Anda.
          </p>
          <p>
            Kuki yang digunakan pada domain <code>2ndmanager.vercel.app</code> murni merupakan <em>Strictly Necessary Session Cookies</em> (HTTP-Only, SameSite, Secure) yang dikelola oleh Supabase Auth untuk menjaga keamanan sesi login. Kami tidak memasang piksel pelacak periklanan pihak ketiga.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="font-display font-black text-lg md:text-xl text-[#0B0F17] uppercase flex items-center gap-2 border-b-2 border-slate-200 pb-2">
            <span className="w-7 h-7 rounded-lg bg-amber-400 text-slate-900 font-mono font-black text-sm flex items-center justify-center border border-slate-900">
              6
            </span>
            Kontak Petugas Perlindungan Data (DPO)
          </h2>
          <p>
            Untuk pertanyaan terkait privasi, permohonan eksekusi hak subjek data, atau pelaporan insiden keamanan, hubungi Petugas Perlindungan Data (DPO) resmi kami:
          </p>
          <div className="bg-slate-100 border-2 border-slate-300 rounded-xl p-4 text-xs font-mono space-y-1">
            <p className="font-bold text-slate-900 text-sm">PT Klola Warung Teknologi Nusantara</p>
            <p className="text-slate-700">Divisi Kepatuhan Privasi &amp; Keamanan Siber (DPO Office)</p>
            <p className="text-slate-700">Email Resmi: <span className="font-bold text-slate-900">privacy@warung2ndmanager.com</span> / <span className="font-bold text-slate-900">support@warung2ndmanager.com</span></p>
            <p className="text-slate-700">Layanan Bantuan: Sentra Niaga Kelontong Indonesia, Jakarta Selatan, DKI Jakarta 12430</p>
          </div>
        </section>
      </div>
    </div>
  );
}
