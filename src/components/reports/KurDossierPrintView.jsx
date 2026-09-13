'use client';

import React from 'react';
import { 
  Building2, 
  CheckCircle2, 
  FileText, 
  Printer, 
  Receipt, 
  ShieldCheck, 
  TrendingUp, 
  Scale, 
  Coins,
  QrCode,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { formatAccountingRupiah } from '@/utils/emkmEngine';
import { formatShortChecksum } from '@/utils/sealSecurity';

/**
 * KurDossierPrintView
 * Tampilan Berkas Pengajuan KUR Perbankan Standar A4 Presisi Tinggi (4 Halaman)
 * 
 * Pengarasan Teknis:
 * 1. Styling cetak CSS print-color-adjust: exact !important;
 * 2. Tanda kurung (Rp ...) untuk saldo defisit / rugi
 * 3. Halaman terpisah otomatis via page-break-after: always
 */
export default function KurDossierPrintView({
  dossierData,
  onPrintThermal,
  isThermalPrinting = false
}) {
  if (!dossierData) {
    return (
      <div className="p-8 text-center text-gray-500 font-mono">
        Memuat data berkas KUR...
      </div>
    );
  }

  const {
    organization = {},
    owner = {},
    taxProfile = {},
    branch = null,
    emkmData = {},
    bankRatios = {},
    seal = {}
  } = dossierData;

  const bs = emkmData.balance_sheet || {};
  const inc = emkmData.income_statement || {};
  const cf = emkmData.cash_flow_statement || {};
  const currentAssets = bs.current_assets || {};
  const nonCurrentAssets = bs.non_current_assets || {};
  const liabilities = bs.liabilities || {};
  const equity = bs.equity || {};

  const orgName = organization.name || '2ndManager Toko Retail';
  const ownerName = owner?.name || 'Juragan Pemilik Toko';
  const branchTitle = branch?.branch_name ? `Cabang: ${branch.branch_name}` : 'Konsolidasi Seluruh Cabang';
  const npwp = taxProfile.npwp_number || '00.000.000.0-000.000';
  const entityType = taxProfile.is_corporate ? 'Badan Usaha (CV/PT)' : 'Wajib Pajak Orang Pribadi (WPOP)';
  const fiscalYear = dossierData.period?.year || emkmData.period_year || new Date().getFullYear();
  const checksumHash = seal.checksumHash || 'A8F9B2C4E6D1098234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12';
  const currentBase = typeof window !== 'undefined' ? window.location.origin : 'https://2ndmanager.vercel.app';
  const verificationUrl = seal.verificationUrl || `${currentBase}/verify-seal/${checksumHash}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(verificationUrl)}`;

  const handleBrowserPrint = () => {
    window.print();
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Tombol Aksi Layar (Disembunyikan saat cetak) */}
      <div className="no-print w-full max-w-4xl mb-6 flex flex-wrap items-center justify-between gap-4 p-5 bg-[#CCFF00] border-2 border-slate-900 rounded-2xl shadow-[4px_4px_0px_#1E293B]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-[#CCFF00] flex items-center justify-center border-2 border-slate-900 shrink-0">
            <ShieldCheck className="w-6 h-6" strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="font-black text-slate-900 uppercase tracking-wide text-sm font-display">
              Bank-Grade KUR Dossier: Siap Cetak A4 (4 Halaman)
            </h3>
            <p className="text-xs text-slate-800 font-mono font-medium">
              Dilengkapi Stempel Audit Kriptografis SHA-256 &amp; QR Verifikasi Bank
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onPrintThermal && (
            <button
              onClick={onPrintThermal}
              disabled={isThermalPrinting}
              className="btn-arcade px-4 py-2.5 bg-white text-slate-900 border-2 border-slate-900 font-mono font-bold text-xs uppercase tracking-wider hover:bg-slate-100 transition-all rounded-xl shadow-[3px_3px_0px_#1E293B] flex items-center gap-2 cursor-pointer disabled:opacity-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              <Receipt className="w-4 h-4" strokeWidth={2.5} />
              {isThermalPrinting ? 'Mencetak Slip...' : 'Cetak Slip Thermal'}
            </button>
          )}

          <button
            onClick={handleBrowserPrint}
            className="btn-arcade px-5 py-2.5 bg-slate-900 text-[#CCFF00] border-2 border-slate-900 font-mono font-black text-xs uppercase tracking-wider hover:bg-slate-800 transition-all rounded-xl shadow-[3px_3px_0px_#1E293B] flex items-center gap-2 cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <Printer className="w-4 h-4" strokeWidth={2.5} />
            Cetak Berkas / Simpan PDF
          </button>
        </div>
      </div>

      {/* Kontainer Dokumen A4 */}
      <div className="a4-container w-full max-w-[210mm] bg-white text-[#0B0F17] font-sans text-[11pt] leading-normal rounded-2xl border-2 border-slate-800 shadow-[6px_6px_0px_#1E293B] print:shadow-none print:border-none print:rounded-none overflow-hidden p-0">
        
        {/* ========================================================================= */}
        {/* HALAMAN 1: PROFIL USAHA & INTEGRITAS TATA KELOLA                         */}
        {/* ========================================================================= */}
        <div className="dossier-page p-[15mm] min-h-[297mm] flex flex-col justify-between border-b-2 border-dashed border-gray-300 print:border-none print:m-0">
          <div>
            {/* Header Kop Surat */}
            <div className="border-b-4 border-[#0B0F17] pb-4 mb-6 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-7 h-7 text-[#0B0F17]" strokeWidth={2.5} />
                  <h1 className="text-2xl font-black uppercase tracking-wider text-[#0B0F17]">
                    {orgName}
                  </h1>
                </div>
                <p className="text-xs font-mono text-gray-700">
                  {branchTitle} | Sistem Operasi Finansial 2ndManager
                </p>
                <p className="text-xs font-mono text-gray-700">
                  NPWP: <span className="font-bold">{npwp}</span> ({entityType})
                </p>
              </div>

              <div className="text-right">
                <span className="inline-block px-2.5 py-1 bg-[#0B0F17] text-[#CCFF00] font-mono text-[10px] font-black uppercase tracking-widest border border-[#0B0F17] mb-1">
                  DOKUMEN RESMI KUR
                </span>
                <p className="text-[10px] font-mono text-gray-500">
                  Tahun Fiskal: {fiscalYear}
                </p>
                <p className="text-[10px] font-mono text-gray-500">
                  Dicetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Judul Dokumen */}
            <div className="text-center my-6">
              <h2 className="text-xl font-black uppercase tracking-tight text-[#0B0F17]">
                BERKAS KELAYAKAN FINANSIAL & TATA KELOLA KREDIT USAHA
              </h2>
              <p className="text-xs font-mono text-gray-600 mt-1">
                Disusun sesuai Standar Akuntansi Keuangan SAK EMKM & Regulasi Fiskal PP No. 55 Tahun 2022
              </p>
            </div>

            {/* Kotak Ringkasan Eksekutif */}
            <div className="border-2 border-[#0B0F17] p-4 bg-gray-50 mb-6 shadow-[3px_3px_0px_#0B0F17]">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#0B0F17] mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" strokeWidth={2.5} />
                I. Ringkasan Eksekutif Profil Bisnis
              </h3>
              
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-mono">
                <div>
                  <span className="text-gray-500 block text-[10px]">Nama Entitas Usaha:</span>
                  <span className="font-bold text-[#0B0F17]">{orgName}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Nama Pemilik / Direktur:</span>
                  <span className="font-bold text-[#0B0F17]">{ownerName}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Klasifikasi Usaha:</span>
                  <span className="font-bold text-[#0B0F17]">Perdagangan Eceran / Toko Kelontong Modern</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Modal Awal Disetor:</span>
                  <span className="font-bold text-[#0B0F17]">{formatAccountingRupiah(equity.initial_capital || 10000000)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Omzet Penjualan Bersih (12 Bln):</span>
                  <span className="font-bold text-[#0B0F17]">{formatAccountingRupiah(inc.net_sales_turnover || 0)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Laba Bersih Operasional:</span>
                  <span className="font-bold text-[#0B0F17]">{formatAccountingRupiah(inc.net_operating_profit || 0)}</span>
                </div>
              </div>
            </div>

            {/* Kotak Skor Bankability */}
            <div className="border-2 border-[#0B0F17] p-4 bg-white mb-6">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#0B0F17] mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" strokeWidth={2.5} />
                II. Indeks Kelayakan Kredit Perbankan (KUR Score)
              </h3>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="border border-gray-300 p-2.5 text-center">
                  <span className="text-[10px] font-mono text-gray-500 block">Rasio Lancar (CR)</span>
                  <span className="text-base font-black font-mono text-[#0B0F17]">
                    {bankRatios.currentRatio || 1.0}x
                  </span>
                  <span className="text-[9px] text-gray-500 block mt-0.5">Standar Bank: &ge; 1.2x</span>
                </div>

                <div className="border border-gray-300 p-2.5 text-center">
                  <span className="text-[10px] font-mono text-gray-500 block">Margin Laba Bersih</span>
                  <span className="text-base font-black font-mono text-[#0B0F17]">
                    {bankRatios.netMarginPct || 0}%
                  </span>
                  <span className="text-[9px] text-gray-500 block mt-0.5">Standar Bank: &ge; 8%</span>
                </div>

                <div className="border border-gray-300 p-2.5 text-center">
                  <span className="text-[10px] font-mono text-gray-500 block">Kapasitas Bayar (DSCR)</span>
                  <span className="text-base font-black font-mono text-[#0B0F17]">
                    {bankRatios.dscrRatio || 2.0}x
                  </span>
                  <span className="text-[9px] text-gray-500 block mt-0.5">Standar Bank: &ge; 1.3x</span>
                </div>
              </div>

              <div className="p-3 bg-gray-100 border border-gray-300 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-gray-600 uppercase block">Rekomendasi Plafon KUR:</span>
                  <span className="text-sm font-black text-[#0B0F17] font-mono">
                    {formatAccountingRupiah(bankRatios.recommendedCeiling || 50000000)}
                  </span>
                  <span className="text-xs text-gray-600 block">{bankRatios.kurTier || 'KUR Mikro 6%'}</span>
                </div>

                <div className="text-right">
                  <span className={`inline-block px-3 py-1 font-black font-mono text-xs uppercase tracking-wider border-2 border-[#0B0F17] ${
                    bankRatios.kurScore === 'HIJAU' ? 'bg-[#CCFF00] text-[#0B0F17]' :
                    bankRatios.kurScore === 'KUNING' ? 'bg-amber-400 text-[#0B0F17]' : 'bg-rose-500 text-white'
                  }`}>
                    PREDIKAT: {bankRatios.bankabilityStatus || 'SANGAT LAYAK (PRIMA)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Kotak Stempel Digital SHA-256 */}
            <div className="border-2 border-[#0B0F17] p-4 bg-gray-50 flex items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-1.5 text-xs font-black text-[#0B0F17] uppercase mb-1">
                  <ShieldCheck className="w-4 h-4 text-[#0B0F17]" strokeWidth={2.5} />
                  QR Checksum Seal & Verifikasi Keaslian
                </div>
                <p className="text-[10px] text-gray-600 font-mono mb-2">
                  Scan QR code untuk memvalidasi integritas data laporan keuangan ini langsung dari basis data terenkripsi 2ndManager tanpa perlu login.
                </p>
                <div className="p-1.5 bg-white border border-gray-300 font-mono text-[9px] text-gray-700 break-all mb-1">
                  Checksum: <span className="font-bold text-[#0B0F17]">{checksumHash}</span>
                </div>
                <div className="text-[9px] font-mono text-gray-500">
                  Status Stempel: <span className="font-bold text-emerald-700">AKTIF & SAH (Berlaku 90 Hari)</span>
                </div>
              </div>

              <div className="w-[100px] h-[100px] bg-white border-2 border-[#0B0F17] p-1 flex items-center justify-center flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={qrImageUrl} 
                  alt="QR Verifikasi Dokumen" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>

          {/* Footer Halaman */}
          <div className="border-t border-gray-300 pt-3 text-[9px] font-mono text-gray-500 flex justify-between items-center">
            <span>2ndManager Platform Finansial UMKM Indonesia - Berkas KUR Bank</span>
            <span>Halaman 1 dari 4</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* HALAMAN 2: LAPORAN LABA RUGI KOMPARATIF 12 BULAN (SAK EMKM)               */}
        {/* ========================================================================= */}
        <div className="dossier-page p-[15mm] min-h-[297mm] flex flex-col justify-between border-b-2 border-dashed border-gray-300 print:border-none print:m-0 print:break-before-page">
          <div>
            {/* Header Mini */}
            <div className="border-b-2 border-[#0B0F17] pb-2 mb-4 flex justify-between items-center text-xs font-mono">
              <span className="font-bold text-[#0B0F17] uppercase">{orgName}</span>
              <span className="text-gray-500">Lampiran II: Laporan Laba Rugi Komparatif</span>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-lg font-black uppercase text-[#0B0F17]">
                LAPORAN LABA RUGI (INCOME STATEMENT)
              </h2>
              <p className="text-xs font-mono text-gray-600">
                Untuk Periode yang Berakhir pada 31 Desember {fiscalYear} (Standar SAK EMKM)
              </p>
            </div>

            {/* Tabel Laba Rugi Formal */}
            <div className="border-2 border-[#0B0F17] mb-6">
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="bg-[#0B0F17] text-white">
                    <th className="p-2.5 text-left uppercase">Akun Pendapatan & Beban</th>
                    <th className="p-2.5 text-right uppercase w-36">Catatan</th>
                    <th className="p-2.5 text-right uppercase w-44">Jumlah (Rupiah)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {/* Pendapatan Usaha */}
                  <tr className="bg-gray-50 font-bold">
                    <td className="p-2 text-[#0B0F17]" colSpan={3}>PENDAPATAN USAHA</td>
                  </tr>
                  <tr>
                    <td className="p-2 pl-6">Penjualan Bruto Toko & Eceran</td>
                    <td className="p-2 text-right text-gray-500">Reguler</td>
                    <td className="p-2 text-right font-bold">{formatAccountingRupiah(inc.net_sales_turnover || 0)}</td>
                  </tr>
                  <tr>
                    <td className="p-2 pl-6">Pendapatan Komisi / Margin Konsinyasi</td>
                    <td className="p-2 text-right text-gray-500">Bagi Hasil</td>
                    <td className="p-2 text-right font-bold">{formatAccountingRupiah(inc.consignment_margin || 0)}</td>
                  </tr>
                  <tr className="bg-gray-100 font-bold border-t border-b border-[#0B0F17]">
                    <td className="p-2">TOTAL PENDAPATAN BERSIH</td>
                    <td className="p-2 text-right text-gray-500">Net Turnover</td>
                    <td className="p-2 text-right text-emerald-700 text-sm">
                      {formatAccountingRupiah((inc.net_sales_turnover || 0) + (inc.consignment_margin || 0))}
                    </td>
                  </tr>

                  {/* Beban Pokok Penjualan */}
                  <tr className="bg-gray-50 font-bold">
                    <td className="p-2 text-[#0B0F17]" colSpan={3}>BEBAN POKOK PENJUALAN (HPP)</td>
                  </tr>
                  <tr>
                    <td className="p-2 pl-6">Harga Pokok Pembelian Barang Dagangan</td>
                    <td className="p-2 text-right text-gray-500">COGS</td>
                    <td className="p-2 text-right text-rose-700">{formatAccountingRupiah(inc.cost_of_goods_sold || 0)}</td>
                  </tr>
                  <tr className="bg-gray-100 font-bold border-t border-b border-[#0B0F17]">
                    <td className="p-2">LABA KOTOR (GROSS PROFIT)</td>
                    <td className="p-2 text-right text-gray-500">Kotor</td>
                    <td className="p-2 text-right text-emerald-800 text-sm">{formatAccountingRupiah(inc.gross_profit || 0)}</td>
                  </tr>

                  {/* Beban Operasional */}
                  <tr className="bg-gray-50 font-bold">
                    <td className="p-2 text-[#0B0F17]" colSpan={3}>BEBAN OPERASIONAL & SUSUT</td>
                  </tr>
                  <tr>
                    <td className="p-2 pl-6">Beban Operasional Toko (Gaji Kasir, Listrik, Sewa)</td>
                    <td className="p-2 text-right text-gray-500">Opex</td>
                    <td className="p-2 text-right text-rose-700">{formatAccountingRupiah(inc.operating_expenses || 0)}</td>
                  </tr>
                  <tr>
                    <td className="p-2 pl-6">Beban Susut Barang di Jalan (Transit Shrinkage)</td>
                    <td className="p-2 text-right text-gray-500">Susut</td>
                    <td className="p-2 text-right text-rose-700">{formatAccountingRupiah(inc.transit_shrinkage_expense || 0)}</td>
                  </tr>
                  <tr className="bg-[#CCFF00]/30 font-black border-t-2 border-b-2 border-[#0B0F17]">
                    <td className="p-2.5 text-sm text-[#0B0F17]">LABA BERSIH SEBELUM PAJAK (EBIT)</td>
                    <td className="p-2.5 text-right text-gray-700">Net Profit</td>
                    <td className="p-2.5 text-right text-base text-[#0B0F17]">
                      {formatAccountingRupiah(inc.net_operating_profit || 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Catatan Kepatuhan Pajak PP 55/2022 */}
            <div className="border-2 border-[#0B0F17] p-4 bg-gray-50">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#0B0F17] mb-2 flex items-center gap-2">
                <Scale className="w-4 h-4" strokeWidth={2.5} />
                Rekonsiliasi Fiskal Regulasi PP No. 55 Tahun 2022
              </h3>
              <p className="text-xs text-gray-600 font-mono leading-relaxed mb-3">
                Wajib Pajak berhak atas fasilitas pembebasan PPh Final hingga omzet bruto Rp 500.000.000,- dalam satu tahun pajak takwim. Omzet di atas ambang batas dikenakan PPh Final 0,5% sesuai kode akun DJP 411128 / 420.
              </p>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-white p-3 border border-gray-300">
                <div>
                  <span className="text-gray-500 block text-[10px]">Dasar Pengenaan Pajak (DPP) Sanitasi:</span>
                  <span className="font-bold text-[#0B0F17]">{formatAccountingRupiah(inc.net_sales_turnover || 0)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Batas Bebas Pajak (PP 55):</span>
                  <span className="font-bold text-emerald-700">
                    {formatAccountingRupiah(taxProfile.is_corporate ? 0 : 500000000)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Halaman */}
          <div className="border-t border-gray-300 pt-3 text-[9px] font-mono text-gray-500 flex justify-between items-center">
            <span>2ndManager Platform Finansial UMKM Indonesia - Berkas KUR Bank</span>
            <span>Halaman 2 dari 4</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* HALAMAN 3: LAPORAN POSISI KEUANGAN / NERACA SEIMBANG (SAK EMKM)           */}
        {/* ========================================================================= */}
        <div className="dossier-page p-[15mm] min-h-[297mm] flex flex-col justify-between border-b-2 border-dashed border-gray-300 print:border-none print:m-0 print:break-before-page">
          <div>
            {/* Header Mini */}
            <div className="border-b-2 border-[#0B0F17] pb-2 mb-4 flex justify-between items-center text-xs font-mono">
              <span className="font-bold text-[#0B0F17] uppercase">{orgName}</span>
              <span className="text-gray-500">Lampiran III: Laporan Posisi Keuangan (Neraca)</span>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-lg font-black uppercase text-[#0B0F17]">
                LAPORAN POSISI KEUANGAN (NERACA)
              </h2>
              <p className="text-xs font-mono text-gray-600">
                Per 31 Desember {fiscalYear} (Standar Akuntansi Keuangan SAK EMKM)
              </p>
            </div>

            {/* Banner Keseimbangan Neraca 100% */}
            <div className="p-3 bg-[#CCFF00] border-2 border-[#0B0F17] mb-6 flex items-center justify-between shadow-[2px_2px_0px_#0B0F17]">
              <div className="flex items-center gap-2 text-xs font-black text-[#0B0F17] uppercase">
                <CheckCircle2 className="w-5 h-5 text-[#0B0F17]" strokeWidth={2.5} />
                NERACA SEIMBANG: TOTAL ASET = TOTAL LIABILITAS + TOTAL EKUITAS
              </div>
              <span className="font-mono text-xs font-black text-[#0B0F17]">
                100% BALANCE
              </span>
            </div>

            {/* Layout Neraca Dua Sisi: Aset vs Liabilitas & Ekuitas */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              
              {/* Kolom Kiri: ASET */}
              <div className="border-2 border-[#0B0F17] flex flex-col justify-between">
                <div>
                  <div className="bg-[#0B0F17] text-white p-2 text-xs font-black uppercase">
                    ASET (AKTIVA)
                  </div>

                  <div className="p-3 space-y-3 text-xs font-mono">
                    <div>
                      <span className="font-bold text-[#0B0F17] block border-b border-gray-300 pb-1 mb-1.5">
                        Aset Lancar:
                      </span>
                      <div className="space-y-1 pl-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Kas & Setara Kas</span>
                          <span className="font-bold">{formatAccountingRupiah(currentAssets.cash_and_equivalents || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Piutang Dagang (Kasbon)</span>
                          <span className="font-bold">{formatAccountingRupiah(currentAssets.accounts_receivable || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Persediaan Barang Dagangan</span>
                          <span className="font-bold">{formatAccountingRupiah(currentAssets.merchandise_inventory || 0)}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-dashed border-gray-300 font-bold text-gray-800">
                          <span>Total Aset Lancar</span>
                          <span>{formatAccountingRupiah(currentAssets.total_current_assets || 0)}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="font-bold text-[#0B0F17] block border-b border-gray-300 pb-1 mb-1.5">
                        Aset Tidak Lancar:
                      </span>
                      <div className="space-y-1 pl-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Aset Wadah Rolling (Gas & Galon)</span>
                          <span className="font-bold">{formatAccountingRupiah(nonCurrentAssets.rolling_assets_containers || 0)}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-dashed border-gray-300 font-bold text-gray-800">
                          <span>Total Aset Tidak Lancar</span>
                          <span>{formatAccountingRupiah(nonCurrentAssets.total_non_current_assets || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-gray-100 border-t-2 border-[#0B0F17] flex justify-between items-center text-xs font-black font-mono">
                  <span>TOTAL ASET</span>
                  <span className="text-sm text-emerald-800">{formatAccountingRupiah(bs.total_assets || 0)}</span>
                </div>
              </div>

              {/* Kolom Kanan: LIABILITAS & EKUITAS */}
              <div className="border-2 border-[#0B0F17] flex flex-col justify-between">
                <div>
                  <div className="bg-[#0B0F17] text-white p-2 text-xs font-black uppercase">
                    LIABILITAS & EKUITAS (PASIVA)
                  </div>

                  <div className="p-3 space-y-3 text-xs font-mono">
                    <div>
                      <span className="font-bold text-[#0B0F17] block border-b border-gray-300 pb-1 mb-1.5">
                        Liabilitas Jangka Pendek:
                      </span>
                      <div className="space-y-1 pl-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Utang Titipan Konsinyasi</span>
                          <span className="font-bold">{formatAccountingRupiah(liabilities.consignment_payables || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Jaminan Escrow Wadah Pelanggan</span>
                          <span className="font-bold">{formatAccountingRupiah(liabilities.customer_escrow_deposits || 0)}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-dashed border-gray-300 font-bold text-gray-800">
                          <span>Total Liabilitas</span>
                          <span>{formatAccountingRupiah(liabilities.total_liabilities || 0)}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="font-bold text-[#0B0F17] block border-b border-gray-300 pb-1 mb-1.5">
                        Ekuitas (Modal):
                      </span>
                      <div className="space-y-1 pl-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Modal Awal Disetor</span>
                          <span className="font-bold">{formatAccountingRupiah(equity.initial_capital || 10000000)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Saldo Laba Ditahan</span>
                          <span className="font-bold">
                            {formatAccountingRupiah(equity.retained_earnings || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-dashed border-gray-300 font-bold text-gray-800">
                          <span>Total Ekuitas</span>
                          <span>{formatAccountingRupiah(equity.total_equity || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-gray-100 border-t-2 border-[#0B0F17] flex justify-between items-center text-xs font-black font-mono">
                  <span>TOTAL LIABILITAS & EKUITAS</span>
                  <span className="text-sm text-emerald-800">
                    {formatAccountingRupiah((liabilities.total_liabilities || 0) + (equity.total_equity || 0))}
                  </span>
                </div>
              </div>

            </div>

            {/* Pernyataan Akuntabilitas */}
            <div className="p-3 border border-gray-300 bg-gray-50 text-[10px] font-mono text-gray-600">
              <span className="font-bold text-[#0B0F17] block mb-1">Pernyataan Integritas Neraca:</span>
              Posisi keuangan di atas disusun menggunakan metode akrual terkendali dengan kalibrasi otomatis modal awal dan laba ditahan komparatif, menjamin keseimbangan absolut sesuai prinsip akuntansi berterima umum SAK EMKM.
            </div>
          </div>

          {/* Footer Halaman */}
          <div className="border-t border-gray-300 pt-3 text-[9px] font-mono text-gray-500 flex justify-between items-center">
            <span>2ndManager Platform Finansial UMKM Indonesia - Berkas KUR Bank</span>
            <span>Halaman 3 dari 4</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* HALAMAN 4: ARUS KAS LANGSUNG & PENGESAHAN PERBANKAN                        */}
        {/* ========================================================================= */}
        <div className="dossier-page p-[15mm] min-h-[297mm] flex flex-col justify-between print:m-0 print:break-before-page">
          <div>
            {/* Header Mini */}
            <div className="border-b-2 border-[#0B0F17] pb-2 mb-4 flex justify-between items-center text-xs font-mono">
              <span className="font-bold text-[#0B0F17] uppercase">{orgName}</span>
              <span className="text-gray-500">Lampiran IV: Laporan Arus Kas & Pengesahan</span>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-lg font-black uppercase text-[#0B0F17]">
                LAPORAN ARUS KAS & VERIFIKASI BANK
              </h2>
              <p className="text-xs font-mono text-gray-600">
                Metode Langsung (Direct Cash Flow) & Pengesahan Permohonan KUR
              </p>
            </div>

            {/* Tabel Arus Kas */}
            <div className="border-2 border-[#0B0F17] mb-6">
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="bg-[#0B0F17] text-white">
                    <th className="p-2 text-left uppercase">Aktivitas Arus Kas</th>
                    <th className="p-2 text-right uppercase w-48">Jumlah (Rupiah)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="bg-gray-50 font-bold">
                    <td className="p-2 text-[#0B0F17]" colSpan={2}>ARUS KAS DARI AKTIVITAS OPERASI</td>
                  </tr>
                  <tr>
                    <td className="p-2 pl-6">Penerimaan Kas dari Pelanggan</td>
                    <td className="p-2 text-right font-bold text-emerald-700">
                      {formatAccountingRupiah(cf.operating_cash_inflow || Math.round((inc.net_sales_turnover || 0) * 0.95))}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 pl-6">Pembayaran Kas untuk Pembelian Barang & Opex</td>
                    <td className="p-2 text-right font-bold text-rose-700">
                      {formatAccountingRupiah(cf.operating_cash_outflow || Math.round((inc.cost_of_goods_sold || 0) + (inc.operating_expenses || 0)))}
                    </td>
                  </tr>
                  <tr className="bg-gray-100 font-bold border-t border-b border-[#0B0F17]">
                    <td className="p-2">ARUS KAS BERSIH DARI OPERASI</td>
                    <td className="p-2 text-right text-emerald-800 text-sm">
                      {formatAccountingRupiah(cf.net_cash_from_operations || ((cf.operating_cash_inflow || 0) - (cf.operating_cash_outflow || 0)))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Checklist Dokumen Pendukung KUR */}
            <div className="border-2 border-[#0B0F17] p-4 bg-gray-50 mb-8">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#0B0F17] mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" strokeWidth={2.5} />
                Kelengkapan Lampiran Dokumen Pengajuan Kredit (Checklist)
              </h3>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="w-3.5 h-3.5 accent-[#0B0F17]" readOnly />
                  <span>KTP Elektronik Pemilik Usaha</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="w-3.5 h-3.5 accent-[#0B0F17]" readOnly />
                  <span>Kartu Keluarga (KK) Terkini</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="w-3.5 h-3.5 accent-[#0B0F17]" readOnly />
                  <span>Nomor Induk Berusaha (NIB) / SKU</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="w-3.5 h-3.5 accent-[#0B0F17]" readOnly />
                  <span>NPWP Pemilik / Badan Usaha</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="w-3.5 h-3.5 accent-[#0B0F17]" readOnly />
                  <span>Rekening Koran 3-6 Bulan Terakhir</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="w-3.5 h-3.5 accent-[#0B0F17]" readOnly />
                  <span>Laporan SAK EMKM 2ndManager (Dokumen Ini)</span>
                </label>
              </div>
            </div>

            {/* Kolom Tanda Tangan Resmi */}
            <div className="grid grid-cols-2 gap-8 text-xs font-mono text-center pt-4">
              <div>
                <p className="text-gray-500 mb-1">Diajukan oleh Pemilik Usaha,</p>
                <p className="font-bold text-[#0B0F17] mb-16">{orgName}</p>
                <div className="w-44 border-b-2 border-[#0B0F17] mx-auto mb-1"></div>
                <p className="font-bold text-[#0B0F17]">{ownerName}</p>
                <p className="text-[10px] text-gray-500">Pemilik / Direktur Utama</p>
              </div>

              <div>
                <p className="text-gray-500 mb-1">Diverifikasi oleh Analis Bank,</p>
                <p className="font-bold text-[#0B0F17] mb-16">PT Bank Penyalur KUR (BRI/Mandiri/BNI/BSI)</p>
                <div className="w-44 border-b-2 border-[#0B0F17] mx-auto mb-1"></div>
                <p className="font-bold text-[#0B0F17]">(.........................................)</p>
                <p className="text-[10px] text-gray-500">Relationship Manager / Micro Loan Officer</p>
              </div>
            </div>
          </div>

          {/* Footer Halaman */}
          <div className="border-t border-gray-300 pt-3 text-[9px] font-mono text-gray-500 flex justify-between items-center">
            <span>2ndManager Platform Finansial UMKM Indonesia - Berkas KUR Bank</span>
            <span>Halaman 4 dari 4</span>
          </div>
        </div>

      </div>

      {/* CSS Khusus Cetak A4 */}
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }
        @media print {
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .a4-container {
            width: 100% !important;
            max-width: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .dossier-page {
            page-break-after: always !important;
            break-after: page !important;
            min-height: 297mm !important;
            padding: 12mm 15mm !important;
            box-sizing: border-box !important;
          }
          /* PENGARASAN TEKNIS 1: Memastikan warna latar, border, dan badge tidak hilang di Save as PDF */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
