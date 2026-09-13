'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  CheckCircle2, 
  Copy, 
  FileText, 
  Printer, 
  Receipt, 
  RefreshCw, 
  ShieldCheck, 
  ArrowLeft,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import KurDossierPrintView from '@/components/reports/KurDossierPrintView';
import { printFinancialSummarySlip } from '@/utils/escposPrinter';

export default function KurDossierPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dossierData, setDossierData] = useState(null);
  const [toast, setToast] = useState(null);
  const [printingSlip, setPrintingSlip] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Ambil data cabang terlebih dahulu
  useEffect(() => {
    async function fetchBranches() {
      try {
        const res = await fetch('/api/v1/branches');
        if (res.ok) {
          const json = await res.json();
          setBranches(json.data || []);
        }
      } catch (e) {
        console.warn('Gagal memuat cabang:', e);
      }
    }
    fetchBranches();
  }, []);

  // Generate / Fetch Dossier & Cryptographic Seal
  const loadDossier = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/reports/kur-dossier/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: parseInt(year, 10),
          month: parseInt(month, 10),
          branch_id: branchId || null
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Gagal menerbitkan berkas KUR');
      }

      const json = await res.json();
      setDossierData({
        ...json.data.dossierPayload,
        seal: json.data.seal,
        period: { year, month }
      });
    } catch (err) {
      console.error('[KurDossierPage Error]', err);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [year, month, branchId]);

  useEffect(() => {
    loadDossier();
  }, [loadDossier]);

  const handleCopyVerificationUrl = () => {
    if (!dossierData?.seal?.verificationUrl) return;
    navigator.clipboard.writeText(dossierData.seal.verificationUrl);
    setCopiedLink(true);
    showToast('Link verifikasi analis bank berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handlePrintThermal = async () => {
    if (!dossierData) return;
    setPrintingSlip(true);
    try {
      const inc = dossierData.emkmData?.income_statement || {};
      const bs = dossierData.emkmData?.balance_sheet || {};
      const bankRatios = dossierData.bankRatios || {};

      const summaryPayload = {
        orgName: dossierData.organization?.name || '2ndManager Toko',
        branchName: dossierData.branch?.branch_name || 'Konsolidasi Seluruh Cabang',
        taxYear: year,
        npwp: dossierData.taxProfile?.npwp_number || '00.000.000.0-000.000',
        isCorporate: Boolean(dossierData.taxProfile?.is_corporate),
        grossRevenue: Number(inc.net_sales_turnover || 0),
        sanitizedDpp: Number(inc.net_sales_turnover || 0),
        taxFreeLimit: dossierData.taxProfile?.is_corporate ? 0 : 500000000,
        taxableDpp: Math.max(0, Number(inc.net_sales_turnover || 0) - 500000000),
        pphFinalDue: Math.round(Math.max(0, Number(inc.net_sales_turnover || 0) - 500000000) * 0.005),
        netTurnover: Number(inc.net_sales_turnover || 0),
        cogs: Number(inc.cost_of_goods_sold || 0),
        grossProfit: Number(inc.gross_profit || 0),
        operatingExpenses: Number(inc.operating_expenses || 0),
        netProfit: Number(inc.net_operating_profit || 0),
        netMargin: Number(inc.net_profit_margin_pct || 0),
        currentAssets: Number(bs.current_assets?.total_current_assets || 0),
        nonCurrentAssets: Number(bs.non_current_assets?.total_non_current_assets || 0),
        totalAssets: Number(bs.total_assets || 0),
        totalLiabilities: Number(bs.liabilities?.total_liabilities || 0),
        totalEquity: Number(bs.equity?.total_equity || 0),
        isBalanced: Boolean(bs.is_balanced),
        kurScore: bankRatios.kurScore || 'HIJAU',
        kurTier: bankRatios.kurTier || 'KUR Mikro 6%',
        checksumHash: dossierData.seal?.checksumHash || 'KUR-AUDIT-SEAL'
      };

      const success = await printFinancialSummarySlip(summaryPayload);
      if (success) {
        showToast('Ringkasan berkas KUR berhasil dicetak ke printer thermal!', 'success');
      } else {
        showToast('Gagal mengirim data cetak ke hardware printer.', 'error');
      }
    } catch (e) {
      showToast(e.message || 'Gagal cetak thermal', 'error');
    } finally {
      setPrintingSlip(false);
    }
  };

  return (
    <div className="space-y-6 pb-32 font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] font-mono text-xs font-bold animate-fade-in ${
          toast.type === 'error' ? 'bg-rose-500 text-white' : 'bg-[#CCFF00] text-slate-950'
        }`}>
          {toast.message}
        </div>
      )}

      {/* HEADER UTAMA: Light Neo-Brutalist Card (no-print) */}
      <div className="no-print bg-white p-6 sm:p-7 rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Link
              href="/reports/financials"
              className="text-xs font-mono font-bold text-slate-600 hover:text-slate-950 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Laporan SAK EMKM</span>
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-slate-900 tracking-tight">
            Pusat Berkas KUR Perbankan &amp; Stempel Digital
          </h1>
          <p className="text-xs sm:text-sm font-sans text-slate-600 max-w-2xl leading-relaxed">
            Dokumen pengajuan resmi kredit usaha (KUR BRI, Mandiri, BNI, BSI) berstandar formal A4 dengan QR Seal Kriptografis SHA-256.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={handleCopyVerificationUrl}
            className="btn-arcade px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 border-2 border-slate-800 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition shadow-[2px_2px_0px_#1E293B] flex items-center gap-1.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
          >
            <Copy className="w-4 h-4 text-slate-700" strokeWidth={2.5} />
            <span>{copiedLink ? 'Link Tersalin!' : 'Salin Link Bank'}</span>
          </button>

          {dossierData?.seal?.verificationUrl && (
            <a
              href={dossierData.seal.verificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-arcade p-2.5 bg-[#CCFF00] hover:bg-[#b3e600] text-slate-950 border-2 border-slate-800 rounded-xl font-bold text-xs transition shadow-[2px_2px_0px_#1E293B] flex items-center justify-center active:translate-x-0.5 active:translate-y-0.5"
              title="Buka Portal Verifikasi Publik"
            >
              <ExternalLink className="w-4 h-4 text-slate-950" strokeWidth={2.5} />
            </a>
          )}
        </div>
      </div>

      {/* PARAMETER TOOLBAR (no-print) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B]">
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          {/* Filter Cabang */}
          <div className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-slate-500" strokeWidth={2.5} />
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="p-1.5 rounded-lg border-2 border-slate-800 bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#CCFF00]"
            >
              <option value="">Seluruh Cabang (Konsolidasi)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  Cabang: {b.branch_name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Bulan */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 uppercase font-bold">Bulan:</span>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value, 10))}
              className="p-1.5 rounded-lg border-2 border-slate-800 bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#CCFF00]"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString('id-ID', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Tahun */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 uppercase font-bold">Tahun:</span>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className="p-1.5 rounded-lg border-2 border-slate-800 bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#CCFF00]"
            >
              {[2024, 2025, 2026].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={loadDossier}
          className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border-2 border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-800 shadow-[2px_2px_0px_#1E293B] flex items-center gap-1.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Perbarui Dokumen</span>
        </button>
      </div>

      {/* KONTEN BERKAS A4 PRESISI */}
      {loading ? (
        <div className="bg-white rounded-2xl border-2 border-slate-800 p-12 text-center font-mono text-xs text-slate-500 shadow-[4px_4px_0px_#1E293B] flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-3 border-slate-900 border-t-[#CCFF00] rounded-full animate-spin" />
          <span className="font-bold text-slate-700">Membangun Berkas Standar Bank &amp; Menghitung SHA-256 Checksum...</span>
        </div>
      ) : (
        <div className="flex justify-center pb-12">
          <KurDossierPrintView
            dossierData={dossierData}
            onPrintThermal={handlePrintThermal}
            isThermalPrinting={printingSlip}
          />
        </div>
      )}
    </div>
  );
}
