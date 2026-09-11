import React from 'react';
import { Scale, FileText, AlertCircle, ShieldAlert, Cpu } from 'lucide-react';
import Breadcrumbs from '@/components/public/Breadcrumbs';

export const metadata = {
  title: 'Syarat & Ketentuan Layanan (Terms of Service)',
  description:
    'Ketentuan penggunaan platform kasir warung 2ndManager, batasan tier langganan, SLA ketersediaan 99.5%, dan batasan tanggung jawab audit uang fisik.',
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Semantic Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Beranda', href: '/' },
          { label: 'Syarat & Ketentuan' },
        ]}
      />

      {/* Header Banner */}
      <div className="bg-[#F59E0B] border-3 border-[#0B0F17] rounded-2xl p-6 md:p-8 shadow-[6px_6px_0px_#0B0F17]">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#0B0F17] text-white font-mono font-black text-xs uppercase mb-3">
          <Scale size={16} /> KONTRAK LAYANAN DIGITAL
        </div>
        <h1 className="font-display font-black text-2xl md:text-4xl text-[#0B0F17] uppercase tracking-tight">
          Syarat &amp; Ketentuan Layanan
        </h1>
        <p className="text-sm md:text-base text-slate-900 font-sans font-medium mt-2">
          Ketentuan Hak, Kewajiban, dan Batasan Tanggung Jawab Operasional Penggunaan Platform 2ndManager.
        </p>
        <p className="text-xs font-mono font-bold text-slate-800 mt-3">
          Berlaku Efektif: 1 Januari 2026 • Versi Dokumen: 2.4-Arcade
        </p>
      </div>

      {/* Main Content Sections */}
      <div className="bg-white border-3 border-[#0B0F17] rounded-2xl p-6 md:p-10 shadow-[6px_6px_0px_#0B0F17] space-y-8 font-sans text-slate-800 leading-relaxed text-sm md:text-base">
        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="font-display font-black text-lg md:text-xl text-[#0B0F17] uppercase flex items-center gap-2 border-b-2 border-slate-200 pb-2">
            <span className="w-7 h-7 rounded-lg bg-amber-400 text-slate-900 font-mono font-black text-sm flex items-center justify-center border border-slate-900">
              1
            </span>
            Definisi &amp; Ruang Lingkup Layanan
          </h2>
          <p>
            <strong>2ndManager</strong> adalah platform perangkat lunak manajemen operasional titik penjualan (Point of Sale / POS), pelacakan inventaris multi-satuan, dan sistem pencegah kebocoran kas yang ditujukan untuk usaha mikro, kecil, dan menengah (UMKM) ritel kelontong di Indonesia.
          </p>
          <p>
            Dengan mendaftar, mengakses, atau menggunakan layanan ini, Anda menyatakan bahwa Anda adalah pemilik toko atau perwakilan resmi yang memiliki wewenang hukum untuk menyetujui seluruh ketentuan ini.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="font-display font-black text-lg md:text-xl text-[#0B0F17] uppercase flex items-center gap-2 border-b-2 border-slate-200 pb-2">
            <span className="w-7 h-7 rounded-lg bg-amber-400 text-slate-900 font-mono font-black text-sm flex items-center justify-center border border-slate-900">
              2
            </span>
            Batasan Tier &amp; Integritas Akun
          </h2>
          <p>
            Layanan 2ndManager tersedia dalam 4 tingkatan (Tier):
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
            <li><strong>Paket Magang (Rp 0):</strong> Dibatasi maksimal 50 pencatatan transaksi/bulan untuk masa orientasi warung.</li>
            <li><strong>Paket Supervisor (Rp 149.000/bln):</strong> Transaksi tanpa batas dengan batas 15 SKU multi-unit dan 20 tabung rolling.</li>
            <li><strong>Paket Manajer (Rp 349.000/bln):</strong> Akses penuh sistem telemetri siluman, PIN override jual rugi, dan audit estafet laci.</li>
            <li><strong>Paket Eksekutif (Rp 399.000/bln):</strong> Hak multi-cabang (hingga 3 toko fisik) dan asisten radar belanja pasar subuh.</li>
          </ul>
          <p className="text-xs text-slate-600 italic">
            Pemilik toko dilarang merekayasa celah kode untuk melampaui kuota tier tanpa upgrade resmi.
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="font-display font-black text-lg md:text-xl text-[#0B0F17] uppercase flex items-center gap-2 border-b-2 border-slate-200 pb-2">
            <span className="w-7 h-7 rounded-lg bg-amber-400 text-slate-900 font-mono font-black text-sm flex items-center justify-center border border-slate-900">
              3
            </span>
            Batasan Tanggung Jawab Audit Uang Kas Fisik
          </h2>
          <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-xl space-y-2 text-slate-900 text-sm">
            <p className="font-bold flex items-center gap-2 text-[#0B0F17]">
              <AlertCircle size={18} className="text-amber-600" />
              PENTING: Batasan Perangkat Lunak vs Fisik
            </p>
            <p>
              2ndManager adalah <strong>alat bantu audit matematis dan forensik digital</strong>. Sistem kami memberikan bukti pencatatan, kalkulasi selisih expected vs actual, dan jejak waktu serah terima kasir.
            </p>
            <p>
              Namun demikian, <strong>pengawasan fisik atas uang tunai di laci, brankas toko, dan tindakan pencurian langsung oleh oknum karyawan tetap merupakan tanggung jawab mutlak pemilik toko (merchant)</strong>. 2ndManager tidak bertindak sebagai penjamin asuransi uang tunai fisik.
            </p>
          </div>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="font-display font-black text-lg md:text-xl text-[#0B0F17] uppercase flex items-center gap-2 border-b-2 border-slate-200 pb-2">
            <span className="w-7 h-7 rounded-lg bg-amber-400 text-slate-900 font-mono font-black text-sm flex items-center justify-center border border-slate-900">
              4
            </span>
            SLA Ketersediaan 99.5% &amp; Ketahanan Offline-First
          </h2>
          <p>
            Kami menjamin ketersediaan layanan cloud (SLA) minimal <strong>99.5%</strong> per bulan kalender.
          </p>
          <p>
            Jika terjadi gangguan internet ISP, server down, atau listrik padam di lokasi toko Anda, antarmuka kasir <strong>POS 2ndManager dirancang untuk tetap dapat beroperasi secara mandiri (Offline-First)</strong> menggunakan database lokal IndexedDB browser, dan akan melakukan auto-sinkronisasi data seketika saat jaringan kembali terhubung.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="font-display font-black text-lg md:text-xl text-[#0B0F17] uppercase flex items-center gap-2 border-b-2 border-slate-200 pb-2">
            <span className="w-7 h-7 rounded-lg bg-amber-400 text-slate-900 font-mono font-black text-sm flex items-center justify-center border border-slate-900">
              5
            </span>
            Penyelesaian Sengketa &amp; Hukum yang Berlaku
          </h2>
          <p>
            Seluruh syarat dan ketentuan ini diatur dan ditafsirkan sesuai dengan hukum Republik Indonesia. Segala sengketa yang timbul dari penggunaan platform ini akan diselesaikan terlebih dahulu melalui musyawarah untuk mufakat dalam waktu 30 hari kalender, dan jika tidak tercapai mufakat, akan diajukan ke Pengadilan Negeri Jakarta Selatan.
          </p>
        </section>
      </div>
    </div>
  );
}
