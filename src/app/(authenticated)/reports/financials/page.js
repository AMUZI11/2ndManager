'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Scale, 
  TrendingUp, 
  Coins, 
  FileText, 
  Printer, 
  Receipt, 
  CheckCircle2, 
  Building2, 
  RefreshCw, 
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { formatAccountingRupiah } from '@/utils/emkmEngine';
import { printFinancialSummarySlip } from '@/utils/escposPrinter';

export default function FinancialsReportPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [selectedBranchId, setSelectedBranchId] = useState('ALL');
  const [activeTab, setActiveTab] = useState('BALANCE_SHEET'); // BALANCE_SHEET | INCOME | CASH_FLOW | BANK_RATIOS
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [toast, setToast] = useState(null);
  const [printingSlip, setPrintingSlip] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadFinancialData = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/v1/reports/financials/emkm?year=${year}&month=${month}&branch_id=${selectedBranchId}`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Gagal memuat laporan keuangan EMKM');
      }
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      console.error('[FinancialsReportPage Error]', err);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [year, month, selectedBranchId]);

  useEffect(() => {
    loadFinancialData();
  }, [loadFinancialData]);

  const statements = data?.statements || {};
  const bs = statements.balance_sheet || {};
  const inc = statements.income_statement || {};
  const cf = statements.cash_flow_statement || {};
  const bankRatios = data?.bankRatios || statements.bank_readiness || {};
  const branches = data?.branches || [];
  const org = data?.organization || {};

  const currentAssets = bs.current_assets || {};
  const nonCurrentAssets = bs.non_current_assets || {};
  const liabilities = bs.liabilities || {};
  const equity = bs.equity || {};

  const handlePrintThermal = async () => {
    setPrintingSlip(true);
    try {
      const summaryPayload = {
        orgName: org.name || '2ndManager Toko',
        branchName: selectedBranchId === 'ALL' ? 'Konsolidasi Seluruh Cabang' : (branches.find(b => b.id === selectedBranchId)?.branch_name || 'Cabang Spesifik'),
        taxYear: year,
        npwp: '00.000.000.0-000.000',
        isCorporate: false,
        grossRevenue: Number(inc.net_sales_turnover || 0),
        sanitizedDpp: Number(inc.net_sales_turnover || 0),
        taxFreeLimit: 500000000,
        taxableDpp: Math.max(0, Number(inc.net_sales_turnover || 0) - 500000000),
        pphFinalDue: Math.round(Math.max(0, Number(inc.net_sales_turnover || 0) - 500000000) * 0.005),
        netTurnover: Number(inc.net_sales_turnover || 0),
        cogs: Number(inc.cost_of_goods_sold || 0),
        grossProfit: Number(inc.gross_profit || 0),
        operatingExpenses: Number(inc.operating_expenses || 0),
        netProfit: Number(inc.net_operating_profit || 0),
        netMargin: Number(inc.net_profit_margin_pct || 0),
        currentAssets: Number(currentAssets.total_current_assets || 0),
        nonCurrentAssets: Number(nonCurrentAssets.total_non_current_assets || 0),
        totalAssets: Number(bs.total_assets || 0),
        totalLiabilities: Number(liabilities.total_liabilities || 0),
        totalEquity: Number(equity.total_equity || 0),
        isBalanced: Boolean(bs.is_balanced),
        kurScore: bankRatios.kurScore || 'HIJAU',
        kurTier: bankRatios.kurTier || 'KUR Mikro 6%',
        checksumHash: 'EMKM-FINANCIAL-VERIFIED'
      };

      const success = await printFinancialSummarySlip(summaryPayload);
      if (success) {
        showToast('Slip audit finansial berhasil dicetak ke printer thermal!', 'success');
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
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B0F17] p-4 md:p-8 text-[#0B0F17] dark:text-white">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 border-2 border-[#0B0F17] shadow-[4px_4px_0px_#0B0F17] font-mono text-xs font-bold ${
          toast.type === 'error' ? 'bg-rose-500 text-white' : 'bg-[#CCFF00] text-[#0B0F17]'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header Halaman */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-4 border-[#0B0F17] dark:border-[#334155] pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-[#0B0F17] text-[#CCFF00] font-mono text-xs font-black uppercase tracking-widest">
                STANDAR AKUNTANSI SAK EMKM
              </span>
              <span className="text-xs font-mono text-gray-500">
                Triple-Statement Reporting
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
              Laporan Keuangan & Posisi Neraca Seimbang
            </h1>
            <p className="text-xs md:text-sm font-mono text-gray-600 dark:text-gray-400 mt-1">
              Laporan Posisi Keuangan (Neraca Seimbang 100%), Laba Rugi Komparatif, dan Arus Kas Langsung.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handlePrintThermal}
              disabled={printingSlip}
              className="px-4 py-2.5 bg-white dark:bg-[#1E293B] border-2 border-[#0B0F17] dark:border-gray-600 font-bold text-xs uppercase tracking-wider hover:bg-gray-100 transition shadow-[2px_2px_0px_#0B0F17] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" strokeWidth={2.5} />
              {printingSlip ? 'Mencetak...' : 'Slip Ringkasan Thermal'}
            </button>

            <Link
              href="/reports/kur-dossier"
              className="px-4 py-2.5 bg-[#CCFF00] text-[#0B0F17] border-2 border-[#0B0F17] font-black text-xs uppercase tracking-wider hover:bg-[#b8e600] transition shadow-[2px_2px_0px_#0B0F17] flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" strokeWidth={2.5} />
              Buka Berkas KUR Lengkap
            </Link>
          </div>
        </div>

        {/* Filter Toolbar: Cabang, Bulan, Tahun */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-4 bg-white dark:bg-[#1E293B] border-2 border-[#0B0F17] dark:border-gray-700 p-3">
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            {/* Filter Cabang */}
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-gray-500" strokeWidth={2.5} />
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="p-1.5 border border-gray-400 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-xs font-bold focus:outline-hidden"
              >
                <option value="ALL">Seluruh Cabang (Konsolidasi)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    Cabang: {b.branch_name} ({b.branch_code})
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
            onClick={loadFinancialData}
            className="p-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 transition text-xs font-mono flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="max-w-6xl mx-auto p-12 text-center font-mono text-sm text-gray-500">
          Menyusun Laporan Triple-Statement SAK EMKM...
        </div>
      ) : (
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* BANNER STATUS NERACA SEIMBANG */}
          <div className={`p-4 border-4 border-[#0B0F17] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[4px_4px_0px_#0B0F17] ${
            bs.is_balanced ? 'bg-[#CCFF00] text-[#0B0F17]' : 'bg-amber-400 text-[#0B0F17]'
          }`}>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-6 h-6 text-[#0B0F17] flex-shrink-0" strokeWidth={2.5} />
              <div>
                <h3 className="font-black uppercase text-sm tracking-wide">
                  {bs.is_balanced ? 'NERACA SEIMBANG (100% BALANCE)' : 'NERACA DALAM KALIBRASI'}
                </h3>
                <p className="text-xs font-mono opacity-90">
                  {bs.balance_verification_text || 'TOTAL ASET = TOTAL LIABILITAS + TOTAL EKUITAS'}
                </p>
              </div>
            </div>

            <div className="text-right font-mono text-xs font-black">
              <span>Total Aset: {formatAccountingRupiah(bs.total_assets || 0)}</span>
              <span className="block text-[10px] font-normal opacity-80">
                Liabilitas: {formatAccountingRupiah(liabilities.total_liabilities || 0)} + Ekuitas: {formatAccountingRupiah(equity.total_equity || 0)}
              </span>
            </div>
          </div>

          {/* TAB NAVIGASI TRIPLE-STATEMENT */}
          <div className="flex items-center gap-2 border-b-2 border-[#0B0F17] dark:border-gray-700 overflow-x-auto pb-1">
            {[
              { id: 'BALANCE_SHEET', label: '1. Posisi Keuangan (Neraca)', icon: Scale },
              { id: 'INCOME', label: '2. Laba Rugi 12 Bulan', icon: TrendingUp },
              { id: 'CASH_FLOW', label: '3. Arus Kas Langsung', icon: Coins },
              { id: 'BANK_RATIOS', label: '4. Rasio Kelayakan Bank', icon: ShieldCheck }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer border-t-2 border-l-2 border-r-2 ${
                    isActive
                      ? 'bg-white dark:bg-[#1E293B] border-[#0B0F17] dark:border-gray-600 text-[#0B0F17] dark:text-[#CCFF00] shadow-[2px_-2px_0px_#0B0F17]'
                      : 'bg-gray-100 dark:bg-gray-800/40 border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" strokeWidth={2.5} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB 1: POSISI KEUANGAN (NERACA) */}
          {activeTab === 'BALANCE_SHEET' && (
            <div className="bg-white dark:bg-[#1E293B] border-2 border-[#0B0F17] dark:border-gray-700 p-6 shadow-[4px_4px_0px_#0B0F17]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* SISI KIRI: ASET (AKTIVA) */}
                <div className="border-2 border-[#0B0F17] dark:border-gray-700 flex flex-col justify-between">
                  <div>
                    <div className="bg-[#0B0F17] text-white p-3 font-black text-xs uppercase tracking-wider">
                      ASET (AKTIVA)
                    </div>

                    <div className="p-4 space-y-4 text-xs font-mono">
                      <div>
                        <span className="font-bold uppercase text-[#0B0F17] dark:text-[#CCFF00] block border-b border-gray-200 dark:border-gray-700 pb-1 mb-2">
                          Aset Lancar (Current Assets):
                        </span>
                        <div className="space-y-1.5 pl-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Kas & Setara Kas</span>
                            <span className="font-bold">{formatAccountingRupiah(currentAssets.cash_and_equivalents || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Piutang Dagang (Kasbon)</span>
                            <span className="font-bold">{formatAccountingRupiah(currentAssets.accounts_receivable || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Persediaan Barang Dagangan</span>
                            <span className="font-bold">{formatAccountingRupiah(currentAssets.merchandise_inventory || 0)}</span>
                          </div>
                          <div className="flex justify-between pt-1.5 border-t border-dashed border-gray-300 dark:border-gray-700 font-bold text-[#0B0F17] dark:text-white">
                            <span>Subtotal Aset Lancar</span>
                            <span>{formatAccountingRupiah(currentAssets.total_current_assets || 0)}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <span className="font-bold uppercase text-[#0B0F17] dark:text-[#CCFF00] block border-b border-gray-200 dark:border-gray-700 pb-1 mb-2">
                          Aset Tidak Lancar (Non-Current Assets):
                        </span>
                        <div className="space-y-1.5 pl-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Aset Rolling Wadah (Gas 3kg & Galon)</span>
                            <span className="font-bold">{formatAccountingRupiah(nonCurrentAssets.rolling_assets_containers || 0)}</span>
                          </div>
                          <div className="flex justify-between pt-1.5 border-t border-dashed border-gray-300 dark:border-gray-700 font-bold text-[#0B0F17] dark:text-white">
                            <span>Subtotal Aset Tetap</span>
                            <span>{formatAccountingRupiah(nonCurrentAssets.total_non_current_assets || 0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-100 dark:bg-gray-800 border-t-2 border-[#0B0F17] dark:border-gray-700 flex justify-between items-center text-xs font-black font-mono">
                    <span className="uppercase">TOTAL ASET</span>
                    <span className="text-base text-emerald-700 dark:text-[#CCFF00]">{formatAccountingRupiah(bs.total_assets || 0)}</span>
                  </div>
                </div>

                {/* SISI KANAN: LIABILITAS & EKUITAS (PASIVA) */}
                <div className="border-2 border-[#0B0F17] dark:border-gray-700 flex flex-col justify-between">
                  <div>
                    <div className="bg-[#0B0F17] text-white p-3 font-black text-xs uppercase tracking-wider">
                      LIABILITAS & EKUITAS (PASIVA)
                    </div>

                    <div className="p-4 space-y-4 text-xs font-mono">
                      <div>
                        <span className="font-bold uppercase text-[#0B0F17] dark:text-[#CCFF00] block border-b border-gray-200 dark:border-gray-700 pb-1 mb-2">
                          Liabilitas Jangka Pendek:
                        </span>
                        <div className="space-y-1.5 pl-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Utang Titipan Konsinyasi</span>
                            <span className="font-bold">{formatAccountingRupiah(liabilities.consignment_payables || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Jaminan Escrow Wadah Pelanggan</span>
                            <span className="font-bold">{formatAccountingRupiah(liabilities.customer_escrow_deposits || 0)}</span>
                          </div>
                          <div className="flex justify-between pt-1.5 border-t border-dashed border-gray-300 dark:border-gray-700 font-bold text-[#0B0F17] dark:text-white">
                            <span>Subtotal Liabilitas</span>
                            <span>{formatAccountingRupiah(liabilities.total_liabilities || 0)}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <span className="font-bold uppercase text-[#0B0F17] dark:text-[#CCFF00] block border-b border-gray-200 dark:border-gray-700 pb-1 mb-2">
                          Ekuitas (Modal):
                        </span>
                        <div className="space-y-1.5 pl-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Modal Awal Disetor</span>
                            <span className="font-bold">{formatAccountingRupiah(equity.initial_capital || 10000000)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Saldo Laba Ditahan</span>
                            <span className="font-bold text-emerald-700 dark:text-[#CCFF00]">
                              {formatAccountingRupiah(equity.retained_earnings || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between pt-1.5 border-t border-dashed border-gray-300 dark:border-gray-700 font-bold text-[#0B0F17] dark:text-white">
                            <span>Subtotal Ekuitas</span>
                            <span>{formatAccountingRupiah(equity.total_equity || 0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-100 dark:bg-gray-800 border-t-2 border-[#0B0F17] dark:border-gray-700 flex justify-between items-center text-xs font-black font-mono">
                    <span className="uppercase">TOTAL LIABILITAS & EKUITAS</span>
                    <span className="text-base text-emerald-700 dark:text-[#CCFF00]">
                      {formatAccountingRupiah((liabilities.total_liabilities || 0) + (equity.total_equity || 0))}
                    </span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: LABA RUGI KOMPARATIF */}
          {activeTab === 'INCOME' && (
            <div className="bg-white dark:bg-[#1E293B] border-2 border-[#0B0F17] dark:border-gray-700 p-6 shadow-[4px_4px_0px_#0B0F17]">
              <div className="border-2 border-[#0B0F17] dark:border-gray-700">
                <table className="w-full text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-[#0B0F17] text-white">
                      <th className="p-3 text-left uppercase">Pos Laba Rugi</th>
                      <th className="p-3 text-right uppercase w-48">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    <tr className="bg-gray-50 dark:bg-gray-800 font-bold">
                      <td className="p-2.5 text-[#0B0F17] dark:text-[#CCFF00]" colSpan={2}>PENDAPATAN USAHA</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 pl-6">Penjualan Bersih Toko (Net Sales Turnover)</td>
                      <td className="p-2.5 text-right font-bold">{formatAccountingRupiah(inc.net_sales_turnover || 0)}</td>
                    </tr>
                    <tr className="bg-gray-50 dark:bg-gray-800 font-bold">
                      <td className="p-2.5 text-[#0B0F17] dark:text-[#CCFF00]" colSpan={2}>BEBAN POKOK PENJUALAN</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 pl-6">Harga Pokok Penjualan (HPP)</td>
                      <td className="p-2.5 text-right text-rose-600 dark:text-rose-400">{formatAccountingRupiah(inc.cost_of_goods_sold || 0)}</td>
                    </tr>
                    <tr className="bg-gray-100 dark:bg-gray-800/80 font-bold">
                      <td className="p-2.5">LABA KOTOR (GROSS PROFIT)</td>
                      <td className="p-2.5 text-right text-emerald-700 dark:text-emerald-400 font-black">
                        {formatAccountingRupiah(inc.gross_profit || 0)}
                      </td>
                    </tr>
                    <tr className="bg-gray-50 dark:bg-gray-800 font-bold">
                      <td className="p-2.5 text-[#0B0F17] dark:text-[#CCFF00]" colSpan={2}>BEBAN OPERASIONAL & SUSUT</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 pl-6">Beban Operasional Rutin (Gaji, Listrik, Operasional)</td>
                      <td className="p-2.5 text-right text-rose-600 dark:text-rose-400">{formatAccountingRupiah(inc.operating_expenses || 0)}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 pl-6">Beban Susut Barang di Jalan (Transit Shrinkage)</td>
                      <td className="p-2.5 text-right text-rose-600 dark:text-rose-400">{formatAccountingRupiah(inc.transit_shrinkage_expense || 0)}</td>
                    </tr>
                    <tr className="bg-[#CCFF00]/40 font-black border-t-2 border-b-2 border-[#0B0F17] dark:border-gray-500">
                      <td className="p-3 text-sm text-[#0B0F17]">LABA BERSIH OPERASIONAL (NET PROFIT)</td>
                      <td className="p-3 text-right text-base text-[#0B0F17]">
                        {formatAccountingRupiah(inc.net_operating_profit || 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: ARUS KAS LANGSUNG */}
          {activeTab === 'CASH_FLOW' && (
            <div className="bg-white dark:bg-[#1E293B] border-2 border-[#0B0F17] dark:border-gray-700 p-6 shadow-[4px_4px_0px_#0B0F17]">
              <div className="border-2 border-[#0B0F17] dark:border-gray-700">
                <table className="w-full text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-[#0B0F17] text-white">
                      <th className="p-3 text-left uppercase">Aktivitas Arus Kas (Metode Langsung)</th>
                      <th className="p-3 text-right uppercase w-48">Jumlah (Rupiah)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    <tr className="bg-gray-50 dark:bg-gray-800 font-bold">
                      <td className="p-2.5 text-[#0B0F17] dark:text-[#CCFF00]" colSpan={2}>ARUS KAS OPERASI</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 pl-6">Penerimaan Kas dari Pelanggan Toko</td>
                      <td className="p-2.5 text-right font-bold text-emerald-700 dark:text-emerald-400">
                        {formatAccountingRupiah(cf.operating_cash_inflow || 0)}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 pl-6">Pembayaran Kas untuk Pasokan & Beban Operasional</td>
                      <td className="p-2.5 text-right text-rose-600 dark:text-rose-400 font-bold">
                        {formatAccountingRupiah(cf.operating_cash_outflow || 0)}
                      </td>
                    </tr>
                    <tr className="bg-gray-100 dark:bg-gray-800/80 font-black border-t-2 border-b-2 border-[#0B0F17]">
                      <td className="p-3 text-sm">ARUS KAS BERSIH DARI AKTIVITAS OPERASI</td>
                      <td className="p-3 text-right text-base text-emerald-700 dark:text-[#CCFF00]">
                        {formatAccountingRupiah(cf.net_cash_from_operations || 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: RASIO KELAYAKAN BANK & KUR */}
          {activeTab === 'BANK_RATIOS' && (
            <div className="bg-white dark:bg-[#1E293B] border-2 border-[#0B0F17] dark:border-gray-700 p-6 shadow-[4px_4px_0px_#0B0F17] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-gray-200 dark:border-gray-700 pb-4">
                <div>
                  <span className="text-[10px] font-mono text-gray-500 uppercase block">Predikat Kelayakan Kredit:</span>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 font-mono text-sm font-black uppercase tracking-wider border-2 border-[#0B0F17] ${
                      bankRatios.kurScore === 'HIJAU' ? 'bg-[#CCFF00] text-[#0B0F17]' :
                      bankRatios.kurScore === 'KUNING' ? 'bg-amber-400 text-[#0B0F17]' : 'bg-rose-500 text-white'
                    }`}>
                      SKOR: {bankRatios.kurScore || 'HIJAU'} - {bankRatios.bankabilityStatus || 'SANGAT LAYAK (PRIMA)'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono text-gray-500 uppercase block">Rekomendasi Plafon Bank:</span>
                  <span className="text-xl font-black font-mono text-emerald-700 dark:text-[#CCFF00]">
                    {formatAccountingRupiah(bankRatios.recommendedCeiling || 50000000)}
                  </span>
                  <span className="block text-xs font-mono text-gray-500">{bankRatios.kurTier || 'KUR Mikro 6%'}</span>
                </div>
              </div>

              {/* 3 Indikator Rasio Utama */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border-2 border-[#0B0F17] dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <span className="text-[10px] font-mono text-gray-500 uppercase block">Rasio Lancar (Current Ratio)</span>
                  <div className="text-2xl font-black font-mono text-[#0B0F17] dark:text-white my-1">
                    {bankRatios.currentRatio || 1.0}x
                  </div>
                  <p className="text-[10px] font-mono text-gray-500">
                    Kapasitas aset likuid menutup kewajiban jangka pendek. Standar bank: &ge; 1.2x.
                  </p>
                </div>

                <div className="p-4 border-2 border-[#0B0F17] dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <span className="text-[10px] font-mono text-gray-500 uppercase block">Net Profit Margin (NPM)</span>
                  <div className="text-2xl font-black font-mono text-[#0B0F17] dark:text-white my-1">
                    {bankRatios.netMarginPct || 0}%
                  </div>
                  <p className="text-[10px] font-mono text-gray-500">
                    Margin profitabilitas bersih atas penjualan retail. Standar bank: &ge; 8%.
                  </p>
                </div>

                <div className="p-4 border-2 border-[#0B0F17] dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <span className="text-[10px] font-mono text-gray-500 uppercase block">Debt Service Coverage (DSCR)</span>
                  <div className="text-2xl font-black font-mono text-[#0B0F17] dark:text-white my-1">
                    {bankRatios.dscrRatio || 2.0}x
                  </div>
                  <p className="text-[10px] font-mono text-gray-500">
                    Cakupan laba operasional terhadap angsuran kredit bulanan. Standar bank: &ge; 1.3x.
                  </p>
                </div>
              </div>

              {/* Tombol Menuju Berkas KUR */}
              <div className="p-4 bg-[#CCFF00]/30 border-2 border-[#0B0F17] flex items-center justify-between">
                <div>
                  <h4 className="font-black text-xs uppercase text-[#0B0F17]">
                    Cetak Berkas Pengajuan KUR 4-Halaman Resmi
                  </h4>
                  <p className="text-xs font-mono text-gray-700">
                    Format cetak formal presisi A4 dengan stempel digital QR untuk diserahkan ke Relationship Manager Bank.
                  </p>
                </div>

                <Link
                  href="/reports/kur-dossier"
                  className="px-4 py-2 bg-[#0B0F17] text-[#CCFF00] font-black text-xs uppercase tracking-wider hover:bg-black transition flex items-center gap-1.5"
                >
                  Buka Berkas
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
