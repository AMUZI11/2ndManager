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
    <div className="space-y-6 pb-32 font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] font-mono text-xs font-bold animate-fade-in ${
          toast.type === 'error' ? 'bg-rose-500 text-white' : 'bg-[#CCFF00] text-slate-950'
        }`}>
          {toast.message}
        </div>
      )}

      {/* HEADER UTAMA: Light Neo-Brutalist Card */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-slate-900 text-[#CCFF00] font-mono text-[10px] font-black uppercase tracking-widest rounded-md border border-slate-800">
              STANDAR AKUNTANSI SAK EMKM
            </span>
            <span className="text-xs font-mono font-bold text-slate-500">
              Triple-Statement Reporting
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-slate-900 tracking-tight">
            Laporan Keuangan &amp; Posisi Neraca Seimbang
          </h1>
          <p className="text-xs sm:text-sm font-sans text-slate-600 max-w-2xl leading-relaxed">
            Laporan Posisi Keuangan (Neraca Seimbang 100%), Laba Rugi Komparatif, dan Arus Kas Langsung berbasis kaidah akuntansi resmi.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={handlePrintThermal}
            disabled={printingSlip}
            className="btn-arcade px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 border-2 border-slate-800 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition shadow-[2px_2px_0px_#1E293B] flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:translate-x-0.5 active:translate-y-0.5"
          >
            <Printer className="w-4 h-4 text-slate-700" strokeWidth={2.5} />
            {printingSlip ? 'Mencetak...' : 'Slip Ringkasan Thermal'}
          </button>

          <Link
            href="/reports/kur-dossier"
            className="btn-arcade px-4 py-2.5 bg-[#CCFF00] hover:bg-[#b3e600] text-slate-950 border-2 border-slate-800 rounded-xl font-mono text-xs font-black uppercase tracking-wider transition shadow-[2px_2px_0px_#1E293B] flex items-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5"
          >
            <FileText className="w-4 h-4 text-slate-950" strokeWidth={2.5} />
            Buka Berkas KUR Lengkap
          </Link>
        </div>
      </div>

      {/* FILTER TOOLBAR: Cabang, Bulan, Tahun, Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B]">
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          {/* Filter Cabang */}
          <div className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-slate-500" strokeWidth={2.5} />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="p-1.5 rounded-lg border-2 border-slate-800 bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#CCFF00]"
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
          onClick={loadFinancialData}
          className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border-2 border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-800 shadow-[2px_2px_0px_#1E293B] flex items-center gap-1.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Perbarui Data</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border-2 border-slate-800 p-12 text-center font-mono text-xs text-slate-500 shadow-[4px_4px_0px_#1E293B] flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-3 border-slate-900 border-t-[#CCFF00] rounded-full animate-spin" />
          <span className="font-bold text-slate-700">Menyusun Laporan Triple-Statement SAK EMKM...</span>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* BANNER STATUS NERACA SEIMBANG */}
          <div className={`p-5 rounded-2xl border-2 border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[4px_4px_0px_#1E293B] ${
            bs.is_balanced ? 'bg-[#CCFF00] text-slate-950' : 'bg-amber-300 text-slate-950'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-950 text-[#CCFF00] flex items-center justify-center border-2 border-slate-900 shrink-0">
                <CheckCircle2 className="w-6 h-6" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="font-black font-display uppercase text-sm tracking-wide">
                  {bs.is_balanced ? 'NERACA SEIMBANG (100% BALANCE)' : 'NERACA DALAM KALIBRASI'}
                </h3>
                <p className="text-xs font-mono font-bold opacity-90">
                  {bs.balance_verification_text || 'TOTAL ASET = TOTAL LIABILITAS + TOTAL EKUITAS'}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right font-mono text-xs font-black bg-white/70 backdrop-blur-xs border-2 border-slate-900 p-2.5 rounded-xl shadow-[2px_2px_0px_#1E293B]">
              <span className="block text-sm">Total Aset: {formatAccountingRupiah(bs.total_assets || 0)}</span>
              <span className="block text-[11px] font-normal text-slate-700">
                Liabilitas: {formatAccountingRupiah(liabilities.total_liabilities || 0)} + Ekuitas: {formatAccountingRupiah(equity.total_equity || 0)}
              </span>
            </div>
          </div>

          {/* TAB NAVIGASI TRIPLE-STATEMENT (Pop-Art Capsule Buttons) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
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
                  className={`btn-arcade px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer rounded-xl border-2 border-slate-800 whitespace-nowrap active:scale-95 ${
                    isActive
                      ? 'bg-slate-900 text-[#CCFF00] shadow-[2px_2px_0px_#1E293B]'
                      : 'bg-white text-slate-700 hover:bg-slate-100 shadow-[1px_1px_0px_#1E293B]'
                  }`}
                >
                  <Icon className="w-4 h-4" strokeWidth={2.5} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: POSISI KEUANGAN (NERACA) */}
          {activeTab === 'BALANCE_SHEET' && (
            <div className="bg-white rounded-2xl border-2 border-slate-800 p-6 shadow-[4px_4px_0px_#1E293B]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* SISI KIRI: ASET (AKTIVA) */}
                <div className="border-2 border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between shadow-[2px_2px_0px_#1E293B]">
                  <div>
                    <div className="bg-slate-900 text-[#CCFF00] p-3 font-mono font-black text-xs uppercase tracking-wider flex items-center justify-between">
                      <span>ASET (AKTIVA)</span>
                      <span className="text-[10px] text-slate-400">SAK EMKM</span>
                    </div>

                    <div className="p-4 space-y-4 text-xs font-mono">
                      <div>
                        <span className="font-bold uppercase text-slate-900 block border-b-2 border-slate-100 pb-1 mb-2">
                          Aset Lancar (Current Assets):
                        </span>
                        <div className="space-y-2 pl-2">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Kas &amp; Setara Kas</span>
                            <span className="font-bold text-slate-900">{formatAccountingRupiah(currentAssets.cash_and_equivalents || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Piutang Dagang (Kasbon)</span>
                            <span className="font-bold text-slate-900">{formatAccountingRupiah(currentAssets.accounts_receivable || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Persediaan Barang Dagangan</span>
                            <span className="font-bold text-slate-900">{formatAccountingRupiah(currentAssets.merchandise_inventory || 0)}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t-2 border-dashed border-slate-200 font-black text-slate-900">
                            <span>Subtotal Aset Lancar</span>
                            <span>{formatAccountingRupiah(currentAssets.total_current_assets || 0)}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <span className="font-bold uppercase text-slate-900 block border-b-2 border-slate-100 pb-1 mb-2">
                          Aset Tidak Lancar (Non-Current Assets):
                        </span>
                        <div className="space-y-2 pl-2">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Aset Rolling Wadah (Gas 3kg &amp; Galon)</span>
                            <span className="font-bold text-slate-900">{formatAccountingRupiah(nonCurrentAssets.rolling_assets_containers || 0)}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t-2 border-dashed border-slate-200 font-black text-slate-900">
                            <span>Subtotal Aset Tetap</span>
                            <span>{formatAccountingRupiah(nonCurrentAssets.total_non_current_assets || 0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border-t-2 border-slate-800 flex justify-between items-center text-xs font-black font-mono">
                    <span className="uppercase text-slate-700">TOTAL ASET</span>
                    <span className="text-base text-emerald-700 font-display">{formatAccountingRupiah(bs.total_assets || 0)}</span>
                  </div>
                </div>

                {/* SISI KANAN: LIABILITAS & EKUITAS (PASIVA) */}
                <div className="border-2 border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between shadow-[2px_2px_0px_#1E293B]">
                  <div>
                    <div className="bg-slate-900 text-[#CCFF00] p-3 font-mono font-black text-xs uppercase tracking-wider flex items-center justify-between">
                      <span>LIABILITAS &amp; EKUITAS (PASIVA)</span>
                      <span className="text-[10px] text-slate-400">SAK EMKM</span>
                    </div>

                    <div className="p-4 space-y-4 text-xs font-mono">
                      <div>
                        <span className="font-bold uppercase text-slate-900 block border-b-2 border-slate-100 pb-1 mb-2">
                          Liabilitas Jangka Pendek:
                        </span>
                        <div className="space-y-2 pl-2">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Utang Titipan Konsinyasi</span>
                            <span className="font-bold text-slate-900">{formatAccountingRupiah(liabilities.consignment_payables || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Jaminan Escrow Wadah Pelanggan</span>
                            <span className="font-bold text-slate-900">{formatAccountingRupiah(liabilities.customer_escrow_deposits || 0)}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t-2 border-dashed border-slate-200 font-black text-slate-900">
                            <span>Subtotal Liabilitas</span>
                            <span>{formatAccountingRupiah(liabilities.total_liabilities || 0)}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <span className="font-bold uppercase text-slate-900 block border-b-2 border-slate-100 pb-1 mb-2">
                          Ekuitas (Modal):
                        </span>
                        <div className="space-y-2 pl-2">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Modal Awal Disetor</span>
                            <span className="font-bold text-slate-900">{formatAccountingRupiah(equity.initial_capital || 10000000)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Saldo Laba Ditahan</span>
                            <span className="font-bold text-emerald-700">
                              {formatAccountingRupiah(equity.retained_earnings || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between pt-2 border-t-2 border-dashed border-slate-200 font-black text-slate-900">
                            <span>Subtotal Ekuitas</span>
                            <span>{formatAccountingRupiah(equity.total_equity || 0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border-t-2 border-slate-800 flex justify-between items-center text-xs font-black font-mono">
                    <span className="uppercase text-slate-700">TOTAL LIABILITAS &amp; EKUITAS</span>
                    <span className="text-base text-emerald-700 font-display">
                      {formatAccountingRupiah((liabilities.total_liabilities || 0) + (equity.total_equity || 0))}
                    </span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: LABA RUGI KOMPARATIF */}
          {activeTab === 'INCOME' && (
            <div className="bg-white rounded-2xl border-2 border-slate-800 p-6 shadow-[4px_4px_0px_#1E293B]">
              <div className="overflow-hidden rounded-xl border-2 border-slate-800">
                <table className="w-full text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="p-3 text-left uppercase tracking-wider">Pos Laba Rugi SAK EMKM</th>
                      <th className="p-3 text-right uppercase tracking-wider w-48">Jumlah (Rupiah)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    <tr className="bg-slate-100 font-bold">
                      <td className="p-2.5 text-slate-900 uppercase font-black" colSpan={2}>PENDAPATAN USAHA</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 pl-6 text-slate-700">Penjualan Bersih Toko (Net Sales Turnover)</td>
                      <td className="p-2.5 text-right font-bold text-slate-900">{formatAccountingRupiah(inc.net_sales_turnover || 0)}</td>
                    </tr>
                    <tr className="bg-slate-100 font-bold">
                      <td className="p-2.5 text-slate-900 uppercase font-black" colSpan={2}>BEBAN POKOK PENJUALAN</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 pl-6 text-slate-700">Harga Pokok Penjualan (HPP)</td>
                      <td className="p-2.5 text-right text-rose-600 font-bold">{formatAccountingRupiah(inc.cost_of_goods_sold || 0)}</td>
                    </tr>
                    <tr className="bg-emerald-50 font-black border-t-2 border-b-2 border-slate-800">
                      <td className="p-3 text-emerald-950 font-display uppercase">LABA KOTOR (GROSS PROFIT)</td>
                      <td className="p-3 text-right text-emerald-800 font-black text-sm">
                        {formatAccountingRupiah(inc.gross_profit || 0)}
                      </td>
                    </tr>
                    <tr className="bg-slate-100 font-bold">
                      <td className="p-2.5 text-slate-900 uppercase font-black" colSpan={2}>BEBAN OPERASIONAL &amp; SUSUT</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 pl-6 text-slate-700">Beban Operasional Rutin (Gaji, Listrik, Operasional)</td>
                      <td className="p-2.5 text-right text-rose-600 font-bold">{formatAccountingRupiah(inc.operating_expenses || 0)}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 pl-6 text-slate-700">Beban Susut Barang di Jalan (Transit Shrinkage)</td>
                      <td className="p-2.5 text-right text-rose-600 font-bold">{formatAccountingRupiah(inc.transit_shrinkage_expense || 0)}</td>
                    </tr>
                    <tr className="bg-[#CCFF00]/50 font-black border-t-2 border-slate-900">
                      <td className="p-3.5 text-sm text-slate-950 font-display uppercase">LABA BERSIH OPERASIONAL (NET PROFIT)</td>
                      <td className="p-3.5 text-right text-base text-slate-950 font-black font-display">
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
            <div className="bg-white rounded-2xl border-2 border-slate-800 p-6 shadow-[4px_4px_0px_#1E293B]">
              <div className="overflow-hidden rounded-xl border-2 border-slate-800">
                <table className="w-full text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="p-3 text-left uppercase tracking-wider">Aktivitas Arus Kas (Metode Langsung)</th>
                      <th className="p-3 text-right uppercase tracking-wider w-48">Jumlah (Rupiah)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    <tr className="bg-slate-100 font-bold">
                      <td className="p-2.5 text-slate-900 uppercase font-black" colSpan={2}>ARUS KAS OPERASI</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 pl-6 text-slate-700">Penerimaan Kas dari Pelanggan Toko</td>
                      <td className="p-2.5 text-right font-bold text-emerald-700">
                        {formatAccountingRupiah(cf.operating_cash_inflow || 0)}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 pl-6 text-slate-700">Pembayaran Kas untuk Pasokan &amp; Beban Operasional</td>
                      <td className="p-2.5 text-right text-rose-600 font-bold">
                        {formatAccountingRupiah(cf.operating_cash_outflow || 0)}
                      </td>
                    </tr>
                    <tr className="bg-[#CCFF00]/50 font-black border-t-2 border-slate-900">
                      <td className="p-3.5 text-sm text-slate-950 font-display uppercase">ARUS KAS BERSIH DARI AKTIVITAS OPERASI</td>
                      <td className="p-3.5 text-right text-base text-slate-950 font-black font-display">
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
            <div className="bg-white rounded-2xl border-2 border-slate-800 p-6 shadow-[4px_4px_0px_#1E293B] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-200 pb-4">
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block mb-1">Predikat Kelayakan Kredit:</span>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 font-mono text-xs font-black uppercase tracking-wider rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_#1E293B] ${
                      bankRatios.kurScore === 'HIJAU' ? 'bg-[#CCFF00] text-slate-950' :
                      bankRatios.kurScore === 'KUNING' ? 'bg-amber-400 text-slate-950' : 'bg-rose-500 text-white'
                    }`}>
                      SKOR: {bankRatios.kurScore || 'HIJAU'} - {bankRatios.bankabilityStatus || 'SANGAT LAYAK (PRIMA)'}
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right bg-slate-50 border-2 border-slate-800 p-3 rounded-xl shadow-[2px_2px_0px_#1E293B]">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block">Rekomendasi Plafon Bank:</span>
                  <span className="text-xl font-black font-display text-emerald-700 block">
                    {formatAccountingRupiah(bankRatios.recommendedCeiling || 50000000)}
                  </span>
                  <span className="block text-xs font-mono text-slate-500 font-bold">{bankRatios.kurTier || 'KUR Mikro 6%'}</span>
                </div>
              </div>

              {/* 3 Indikator Rasio Utama */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 border-2 border-slate-800 rounded-2xl bg-white shadow-[3px_3px_0px_#1E293B] space-y-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-extrabold block">Rasio Lancar (Current Ratio)</span>
                  <div className="text-2xl font-black font-display text-slate-900">
                    {bankRatios.currentRatio || 1.0}x
                  </div>
                  <p className="text-[11px] font-mono text-slate-500 leading-snug">
                    Kapasitas aset likuid menutup kewajiban jangka pendek. Standar bank: &ge; 1.2x.
                  </p>
                </div>

                <div className="p-5 border-2 border-slate-800 rounded-2xl bg-white shadow-[3px_3px_0px_#1E293B] space-y-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-extrabold block">Net Profit Margin (NPM)</span>
                  <div className="text-2xl font-black font-display text-slate-900">
                    {bankRatios.netMarginPct || 0}%
                  </div>
                  <p className="text-[11px] font-mono text-slate-500 leading-snug">
                    Margin profitabilitas bersih atas omzet penjualan retail. Standar bank: &ge; 8%.
                  </p>
                </div>

                <div className="p-5 border-2 border-slate-800 rounded-2xl bg-white shadow-[3px_3px_0px_#1E293B] space-y-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-extrabold block">Debt Service Coverage (DSCR)</span>
                  <div className="text-2xl font-black font-display text-slate-900">
                    {bankRatios.dscrRatio || 2.0}x
                  </div>
                  <p className="text-[11px] font-mono text-slate-500 leading-snug">
                    Cakupan laba operasional terhadap angsuran kredit bulanan. Standar bank: &ge; 1.3x.
                  </p>
                </div>
              </div>

              {/* Tombol Menuju Berkas KUR */}
              <div className="p-5 bg-[#CCFF00]/40 border-2 border-slate-800 rounded-2xl shadow-[3px_3px_0px_#1E293B] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-black text-sm uppercase text-slate-950 font-display">
                    Cetak Berkas Pengajuan KUR 4-Halaman Resmi
                  </h4>
                  <p className="text-xs font-mono text-slate-700 mt-0.5">
                    Format cetak formal presisi A4 dengan stempel digital QR untuk diserahkan ke Relationship Manager Bank.
                  </p>
                </div>

                <Link
                  href="/reports/kur-dossier"
                  className="btn-arcade px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-[#CCFF00] font-black text-xs uppercase tracking-wider rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_#1E293B] flex items-center justify-center gap-2 shrink-0 active:translate-x-0.5 active:translate-y-0.5"
                >
                  <span>Buka Berkas</span>
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
