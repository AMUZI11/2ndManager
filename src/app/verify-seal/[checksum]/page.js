'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Building2, 
  CheckCircle2, 
  Calendar, 
  Scale, 
  Coins, 
  TrendingUp, 
  Clock, 
  ArrowLeft,
  AlertTriangle
} from 'lucide-react';
import { formatAccountingRupiah } from '@/utils/emkmEngine';

export default function VerifySealPublicPage({ params }) {
  const unwrappedParams = use(params);
  const rawChecksum = unwrappedParams?.checksum || '';
  
  const [loading, setLoading] = useState(true);
  const [sealData, setSealData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function verifyChecksum() {
      if (!rawChecksum) {
        setErrorMsg('Kode stempel verifikasi tidak disediakan.');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/v1/verify-seal/${rawChecksum}`);
        const json = await res.json();

        if (!res.ok || !json.verified) {
          setErrorMsg(json.message || 'Stempel dokumen tidak valid atau tidak ditemukan.');
          setSealData(null);
        } else {
          setSealData(json);
        }
      } catch (err) {
        console.error('[Verify Seal Error]', err);
        setErrorMsg('Gagal menghubungi peladen verifikasi audit.');
      } finally {
        setLoading(false);
      }
    }

    verifyChecksum();
  }, [rawChecksum]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 text-[#0B0F17]">
      {/* Header Portal */}
      <div className="w-full max-w-xl mb-4 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0B0F17] text-[#CCFF00] font-mono text-xs font-black uppercase tracking-widest border-2 border-[#0B0F17] mb-2">
          <ShieldCheck className="w-4 h-4" strokeWidth={2.5} />
          2ndManager Digital Trust Engine
        </div>
        <h1 className="text-xl font-black uppercase tracking-tight text-[#0B0F17]">
          Portal Verifikasi Keaslian Dokumen Finansial
        </h1>
        <p className="text-xs font-mono text-gray-600 mt-0.5">
          Validasi integritas berkas perbankan & kepatuhan fiskal PP 55/2022
        </p>
      </div>

      {/* Kontainer Kartu Verifikasi */}
      <div className="w-full max-w-xl bg-white border-4 border-[#0B0F17] shadow-[6px_6px_0px_#0B0F17] p-6">
        
        {loading ? (
          <div className="p-12 text-center font-mono text-xs text-gray-500">
            <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0B0F17]" />
            Memverifikasi stempel kriptografis SHA-256 pada ledger audit...
          </div>
        ) : errorMsg ? (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 border-2 border-rose-500 rounded-full flex items-center justify-center mx-auto text-rose-600">
              <ShieldAlert className="w-7 h-7" strokeWidth={2.5} />
            </div>

            <div>
              <h2 className="text-lg font-black uppercase text-rose-600">
                Stempel Tidak Terverifikasi
              </h2>
              <p className="text-xs font-mono text-gray-600 mt-2 px-4 leading-relaxed">
                {errorMsg}
              </p>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-300 font-mono text-[10px] text-gray-500 break-all">
              Checksum Input: {rawChecksum}
            </div>

            <p className="text-[10px] text-gray-400 font-mono">
              Pastikan kode hash tidak terpotong atau QR code dipindai dari dokumen resmi 2ndManager.
            </p>
          </div>
        ) : sealData ? (
          <div className="space-y-6">
            
            {/* Status Badge Header */}
            <div className={`p-4 border-2 border-[#0B0F17] flex items-center justify-between ${
              sealData.isExpired ? 'bg-amber-100' : 'bg-[#CCFF00]'
            }`}>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-6 h-6 text-[#0B0F17]" strokeWidth={2.5} />
                <div>
                  <h3 className="font-black text-sm uppercase text-[#0B0F17]">
                    {sealData.isExpired ? 'DOKUMEN KEDALUWARSA (EXPIRED)' : 'TERVERIFIKASI RESMI & SAH'}
                  </h3>
                  <p className="text-[10px] font-mono text-[#0B0F17]/80">
                    Tervalidasi langsung oleh Sistem Audit 2ndManager
                  </p>
                </div>
              </div>

              <span className="font-mono text-[10px] font-black uppercase px-2 py-1 bg-[#0B0F17] text-white">
                {sealData.documentType}
              </span>
            </div>

            {/* Checksum Box */}
            <div className="p-2.5 bg-gray-50 border border-gray-300 font-mono text-[10px]">
              <span className="text-gray-500 block">SHA-256 Cryptographic Hash:</span>
              <span className="font-bold text-[#0B0F17] break-all">{sealData.checksum}</span>
            </div>

            {/* Rincian Finansial Audit untuk Analis Bank */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#0B0F17] border-b-2 border-[#0B0F17] pb-1">
                Ringkasan Eksekutif Finansial (Bank-Grade Audit)
              </h4>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-2.5 bg-gray-50 border border-gray-200">
                  <span className="text-gray-500 block text-[10px]">Entitas Usaha:</span>
                  <span className="font-bold text-[#0B0F17]">{sealData.organizationName}</span>
                </div>

                <div className="p-2.5 bg-gray-50 border border-gray-200">
                  <span className="text-gray-500 block text-[10px]">Cabang / Unit:</span>
                  <span className="font-bold text-[#0B0F17]">{sealData.summary?.branchName || 'Konsolidasi'}</span>
                </div>

                <div className="p-2.5 bg-gray-50 border border-gray-200">
                  <span className="text-gray-500 block text-[10px]">Tahun Fiskal:</span>
                  <span className="font-bold text-[#0B0F17]">{sealData.summary?.fiscalYear}</span>
                </div>

                <div className="p-2.5 bg-gray-50 border border-gray-200">
                  <span className="text-gray-500 block text-[10px]">Status Neraca EMKM:</span>
                  <span className="font-bold text-emerald-700">
                    {sealData.summary?.isBalanced ? 'SEIMBANG (100%)' : 'SELISIH'}
                  </span>
                </div>

                <div className="p-2.5 bg-gray-50 border border-gray-200">
                  <span className="text-gray-500 block text-[10px]">Omzet Penjualan Bersih:</span>
                  <span className="font-bold text-[#0B0F17]">
                    {formatAccountingRupiah(sealData.summary?.netTurnover)}
                  </span>
                </div>

                <div className="p-2.5 bg-gray-50 border border-gray-200">
                  <span className="text-gray-500 block text-[10px]">Laba Bersih Operasional:</span>
                  <span className="font-bold text-[#0B0F17]">
                    {formatAccountingRupiah(sealData.summary?.netOperatingProfit)}
                  </span>
                </div>

                <div className="p-2.5 bg-gray-50 border border-gray-200">
                  <span className="text-gray-500 block text-[10px]">Total Aset Usaha:</span>
                  <span className="font-bold text-[#0B0F17]">
                    {formatAccountingRupiah(sealData.summary?.totalAssets)}
                  </span>
                </div>

                <div className="p-2.5 bg-gray-50 border border-gray-200">
                  <span className="text-gray-500 block text-[10px]">Skor Kelayakan KUR:</span>
                  <span className="font-black text-emerald-700">
                    {sealData.summary?.kurScore || 'HIJAU'}
                  </span>
                </div>
              </div>

              {/* Rekomendasi Plafon */}
              <div className="p-3 bg-gray-100 border border-gray-300 flex justify-between items-center text-xs font-mono">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase block">Rekomendasi Plafon KUR:</span>
                  <span className="font-black text-[#0B0F17] text-sm">
                    {formatAccountingRupiah(sealData.summary?.recommendedCeiling)}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-gray-600">
                  {sealData.summary?.kurTier || 'KUR Mikro'}
                </span>
              </div>
            </div>

            {/* Masa Berlaku */}
            <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 border-t border-gray-200 pt-3">
              <span>Diterbitkan: {new Date(sealData.generatedAt).toLocaleDateString('id-ID')}</span>
              <span>Kedaluwarsa: {new Date(sealData.expiresAt).toLocaleDateString('id-ID')}</span>
            </div>

            {/* Audit Notice */}
            <div className="p-3 bg-[#0B0F17] text-[#CCFF00] text-[10px] font-mono leading-relaxed">
              Catatan untuk Analis Bank (BRI/Mandiri/BNI/BSI): Dokumen ini dienkripsi dan diverifikasi secara matematis. Data numerik di atas mencerminkan status ledger nyata tanpa modifikasi manual.
            </div>

          </div>
        ) : null}

        {/* Footer Link */}
        <div className="mt-6 pt-4 border-t-2 border-[#0B0F17] flex justify-between items-center text-xs font-mono">
          <Link
            href="/"
            className="text-gray-600 hover:text-black font-bold flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Ke Beranda 2ndManager
          </Link>
          <span className="text-gray-400 text-[10px]">
            &copy; 2026 2ndManager Platform
          </span>
        </div>

      </div>
    </div>
  );
}
