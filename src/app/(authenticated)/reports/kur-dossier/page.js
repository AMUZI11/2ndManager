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
  ExternalLink
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
    <div className="min-h-screen bg-gray-100 dark:bg-[#0B0F17] p-4 md:p-8 text-[#0B0F17] dark:text-white">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 border-2 border-[#0B0F17] shadow-[4px_4px_0px_#0B0F17] font-mono text-xs font-bold ${
          toast.type === 'error' ? 'bg-rose-500 text-white' : 'bg-[#CCFF00] text-[#0B0F17]'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header Halaman (no-print) */}
      <div className="no-print max-w-6xl mx-auto mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-4 border-[#0B0F17] dark:border-[#334155] pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/reports/financials"
                className="text-xs font-mono font-bold hover:underline flex items-center gap-1 text-gray-600 dark:text-gray-400"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Kembali ke Laporan SAK EMKM
              </Link>
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
              Pusat Berkas KUR Perbankan & Stempel Digital
            </h1>
            <p className="text-xs md:text-sm font-mono text-gray-600 dark:text-gray-400 mt-1">
              Dokumen pengajuan resmi kredit usaha (KUR BRI/Mandiri/BNI/BSI) berstandar presisi A4 dengan QR Seal.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopyVerificationUrl}
              className="px-4 py-2.5 bg-white dark:bg-[#1E293B] border-2 border-[#0B0F17] dark:border-gray-600 font-bold text-xs uppercase tracking-wider hover:bg-gray-100 transition shadow-[2px_2px_0px_#0B0F17] flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-4 h-4" strokeWidth={2.5} />
              {copiedLink ? 'Link Tersalin!' : 'Salin Link Verifikasi Bank'}
            </button>

            {dossierData?.seal?.verificationUrl && (
              <a
                href={dossierData.seal.verificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2.5 bg-gray-200 dark:bg-gray-700 border-2 border-[#0B0F17] dark:border-gray-600 font-bold text-xs hover:bg-gray-300 transition flex items-center gap-1"
                title="Buka Portal Verifikasi Publik"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Toolbar Parameter Berkas */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-4 bg-white dark:bg-[#1E293B] border-2 border-[#0B0F17] dark:border-gray-700 p-3 shadow-[3px_3px_0px_#0B0F17]">
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            {/* Filter Cabang */}
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-gray-500" strokeWidth={2.5} />
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="p-1.5 border border-gray-400 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-xs font-bold focus:outline-hidden"
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
              <span className="text-gray-500 uppercase">Bulan:</span>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                className="p-1.5 border border-gray-400 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-xs font-bold focus:outline-hidden"
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
              <span className="text-gray-500 uppercase">Tahun:</span>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
                className="p-1.5 border border-gray-400 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-xs font-bold focus:outline-hidden"
              >
                {[2024, 2025, 2026].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={loadDossier}
            className="p-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 transition text-xs font-mono flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Perbarui Dokumen
          </button>
        </div>
      </div>

      {/* Konten Berkas A4 Presisi */}
      {loading ? (
        <div className="max-w-4xl mx-auto p-16 text-center font-mono text-sm text-gray-500">
          Membangun Berkas Standar Bank & Menghitung SHA-256 Checksum...
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
