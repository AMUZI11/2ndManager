"use client";
import React, { useState, useEffect, useMemo } from 'react';
import {
  Printer, Download, Flame, Trophy, ShieldAlert, FileText, Clock,
  Lock, Sparkles, AlertTriangle, X, CheckCircle2
} from 'lucide-react';
import { api } from '../utils/api';
import { useTutorial } from '../components/TutorialEngine';
import { MonthlyTrendChart, CategoryPieChart } from '../components/AnalyticsCharts';
import { exportToCSV } from '../utils/export';
import { canAccessFeature, checkQuotaLimit, normalizePlan, getPlanConfig } from '../lib/subscription';

export default function Reporting() {
  const { registerTrigger } = useTutorial();
  const [activeTab, setActiveTab] = useState('rekap'); // 'rekap' | 'heatmap' | 'top_products' | 'void_logs' | 'audit_logs'
  const [selectedMonth, setSelectedMonth] = useState(""); // YYYY-MM
  const [availableMonths, setAvailableMonths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [voidLogs, setVoidLogs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Tier Gating State
  const [userPlan, setUserPlan] = useState('FREE'); // 'FREE' | 'STARTER' | 'PRO'
  const [showProModal, setShowProModal] = useState(false);
  const [dateCapError, setDateCapError] = useState('');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      try {
        const [txs, custs, vLogs, aLogs, billingData] = await Promise.all([
          api.getTransactions(),
          api.getCustomers(),
          api.getVoidLogs().catch(() => []),
          api.getAuditLogs().catch(() => []),
          api.getBilling().catch(() => null)
        ]);

        setAllTransactions(txs || []);
        setCustomers(custs || []);
        setVoidLogs(vLogs || []);
        setAuditLogs(aLogs || []);

        // Read subscription plan from /api/v1/billing or session fallback
        const sessionUser = api.getCurrentSession();
        const planFromBilling = billingData?.plan || billingData?.subscription?.plan || billingData?.tier;
        const planFromSession = sessionUser?.plan || sessionUser?.subscription_plan;
        const activePlan = (planFromBilling || planFromSession || 'MAGANG').toUpperCase();
        setUserPlan(activePlan);

        // Generate last 12 months fallback so dropdown is never empty
        const getRecentMonths = () => {
          const list = [];
          const now = new Date();
          for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            list.push(`${yyyy}-${mm}`);
          }
          return list;
        };

        const txMonths = (txs || []).map(t => t.tanggal?.slice(0, 7)).filter(Boolean);
        const allMonthsSet = new Set([...txMonths, ...getRecentMonths()]);
        const months = Array.from(allMonthsSet).sort().reverse();
        setAvailableMonths(months);

        const currentMonthStr = new Date().toISOString().slice(0, 7);
        const initialMonth = months.includes(currentMonthStr) ? currentMonthStr : (months[0] || currentMonthStr);
        setSelectedMonth(initialMonth);

        // Set default date range to first day of month to today/end of month
        if (initialMonth) {
          const [year, month] = initialMonth.split("-");
          const firstDay = `${initialMonth}-01`;
          const lastDayNum = new Date(Number(year), Number(month), 0).getDate();
          // Cap default range to max 30 days
          const endDayNum = Math.min(lastDayNum, 30);
          const lastDay = `${initialMonth}-${String(endDayNum).padStart(2, '0')}`;
          setExportStartDate(firstDay);
          setExportEndDate(lastDay);
        }
      } catch (err) {
        console.error("Gagal memuat rekap laporan:", err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  const handleMonthChange = (monthStr) => {
    setSelectedMonth(monthStr);
    if (monthStr) {
      const [year, month] = monthStr.split("-");
      const firstDay = `${monthStr}-01`;
      const lastDayNum = new Date(Number(year), Number(month), 0).getDate();
      const endDayNum = Math.min(lastDayNum, 30);
      const lastDay = `${monthStr}-${String(endDayNum).padStart(2, '0')}`;
      setExportStartDate(firstDay);
      setExportEndDate(lastDay);
      setDateCapError('');
    }
  };

  // Realtime plan change listener
  useEffect(() => {
    const handlePlanChange = (e) => {
      if (e.detail?.plan) setUserPlan(e.detail.plan);
    };
    window.addEventListener('hl-plan-changed', handlePlanChange);
    return () => window.removeEventListener('hl-plan-changed', handlePlanChange);
  }, []);

  const planConfig = getPlanConfig(userPlan);
  const isFree = normalizePlan(userPlan) === 'MAGANG';
  const isPro = canAccessFeature(userPlan, 'export_csv');
  const maxReportDays = planConfig?.limits?.max_report_days || 30;

  const handleStartDateChange = (val) => {
    setExportStartDate(val);
    if (!isPro && val && exportEndDate) {
      const diffDays = (new Date(exportEndDate) - new Date(val)) / (1000 * 3600 * 24);
      if (diffDays > maxReportDays) {
        setDateCapError(`Rentang tanggal maksimal ${maxReportDays} hari untuk ${planConfig.name}. Upgrade Kontrak Anda untuk laporan historis lebih luas.`);
      } else {
        setDateCapError('');
      }
    }
  };

  const handleEndDateChange = (val) => {
    setExportEndDate(val);
    if (!isPro && exportStartDate && val) {
      const diffDays = (new Date(val) - new Date(exportStartDate)) / (1000 * 3600 * 24);
      if (diffDays > maxReportDays) {
        setDateCapError(`Rentang tanggal maksimal ${maxReportDays} hari untuk ${planConfig.name}. Upgrade Kontrak Anda untuk laporan historis lebih luas.`);
      } else {
        setDateCapError('');
      }
    }
  };

  const trendData = useMemo(() => {
    if (allTransactions.length === 0) return [];
    const monthlyGroups = {};
    allTransactions.forEach(t => {
      if (!t.tanggal) return;
      const yyyymm = t.tanggal.slice(0, 7);
      if (!monthlyGroups[yyyymm]) {
        monthlyGroups[yyyymm] = { omzet: 0, piutang: 0 };
      }
      if (t.status === 'Lunas') {
        monthlyGroups[yyyymm].omzet += Number(t.amount_owed || 0);
      } else {
        monthlyGroups[yyyymm].piutang += Number(t.amount_owed || 0);
      }
    });

    const sortedMonths = Object.keys(monthlyGroups).sort();
    return sortedMonths.map(mStr => {
      const [year, month] = mStr.split("-");
      const d = new Date(year, month - 1);
      const label = d.toLocaleString('id-ID', { month: 'short', year: '2-digit' });
      return {
        monthLabel: label,
        omzet: monthlyGroups[mStr].omzet,
        piutang: monthlyGroups[mStr].piutang
      };
    });
  }, [allTransactions]);

  // Compute ledger data on selected month or data changes using useMemo
  const ledgerData = useMemo(() => {
    if (!selectedMonth || allTransactions.length === 0) {
      return {
        totals: { omzet_lm: 0, omzet_br: 0, omzet_total: 0, laba_total: 0, piutang: 0, paid: 0 },
        customerSummaries: [],
        bonusLogs: [],
        categoryOmzets: {}
      };
    }

    // Filter by selected month
    const monthlyTx = allTransactions.filter(t => t.tanggal && t.tanggal.startsWith(selectedMonth));

    // Ledger variables
    let omzet_lm = 0;
    let omzet_br = 0;
    let laba_total = 0;
    let piutang = 0;
    let paid = 0;

    const categoryOmzets = {};
    monthlyTx.forEach(t => {
      if (t.status === "Lunas") {
        paid += Number(t.amount_owed || 0);

        t.items?.forEach(item => {
          const type = item.product_type_snapshot || 'LM';
          categoryOmzets[type] = (categoryOmzets[type] || 0) + Number(item.line_omzet || 0);

          if (type === "LM") {
            omzet_lm += Number(item.line_omzet || 0);
          } else if (type === "BR") {
            omzet_br += Number(item.line_omzet || 0);
          }
          laba_total += Number(item.line_laba || 0);
        });
      } else {
        piutang += Number(t.amount_owed || 0);
      }
    });

    const omzet_total = omzet_lm + omzet_br;

    const totals = { omzet_lm, omzet_br, omzet_total, laba_total, piutang, paid };

    // Breakdown per customer
    const summaries = customers.map(c => {
      const cTx = monthlyTx.filter(t => t.customer_id === c.id);

      const cPiutang = cTx.filter(t => t.status === "Piutang").reduce((sum, t) => sum + Number(t.amount_owed || 0), 0);
      const cPaid = cTx.filter(t => t.status === "Lunas").reduce((sum, t) => sum + Number(t.amount_owed || 0), 0);

      let cOmzetLm = 0;
      let cOmzetBr = 0;
      let cLaba = 0;

      cTx.filter(t => t.status === "Lunas").forEach(t => {
        t.items?.forEach(item => {
          if (item.product_type_snapshot === "LM") {
            cOmzetLm += Number(item.line_omzet || 0);
          } else {
            cOmzetBr += Number(item.line_omzet || 0);
          }
          cLaba += Number(item.line_laba || 0);
        });
      });

      return {
        id: c.id,
        nama: c.nama,
        piutang: cPiutang,
        paid: cPaid,
        omzet: cOmzetLm + cOmzetBr,
        laba: cLaba
      };
    }).filter(s => s.omzet > 0 || s.piutang > 0 || s.paid > 0);

    const bonuses = monthlyTx.filter(t => t.is_bonus);

    return { totals, customerSummaries: summaries, bonusLogs: bonuses, categoryOmzets };
  }, [selectedMonth, allTransactions, customers]);

  // Heatmap Jam Sibuk (Perhitungan distribusi jam transaksi 00:00 - 23:00)
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0, omzet: 0 }));
    allTransactions.forEach(t => {
      if (t.created_at) {
        const hour = new Date(t.created_at).getHours();
        hours[hour].count += 1;
        hours[hour].omzet += Number(t.omzet_total || t.amount_owed || 0);
      }
    });
    return hours;
  }, [allTransactions]);

  const maxHourlyCount = Math.max(1, ...hourlyData.map(h => h.count));

  // Top 10 Produk Terlaris
  const topProducts = useMemo(() => {
    const productMap = {};
    allTransactions.forEach(t => {
      t.items?.forEach(item => {
        const name = item.product_name || item.product_type_snapshot || 'Produk';
        if (!productMap[name]) {
          productMap[name] = { name, totalQty: 0, totalOmzet: 0 };
        }
        productMap[name].totalQty += item.quantity || 1;
        productMap[name].totalOmzet += item.line_omzet || 0;
      });
    });

    return Object.values(productMap)
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 10);
  }, [allTransactions]);

  const { totals } = ledgerData;

  const handleExportOverallCSV = () => {
    // Paywall check for CSV Export using centralized canAccessFeature
    if (!canAccessFeature(userPlan, 'export_csv')) {
      setShowProModal(true);
      return;
    }

    // Enforce date range limit via checkQuotaLimit
    if (exportStartDate && exportEndDate) {
      const start = new Date(exportStartDate);
      const end = new Date(exportEndDate);
      const diffTime = end.getTime() - start.getTime();

      if (diffTime < 0) {
        setDateCapError("Tanggal akhir harus setelah atau sama dengan tanggal awal.");
        return;
      }

      const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
      const dayQuotaCheck = checkQuotaLimit(userPlan, diffDays, 'max_report_days');
      if (!dayQuotaCheck.allowed) {
        setDateCapError(dayQuotaCheck.message);
        return;
      }
    }

    setDateCapError('');

    // Filter transactions by export date range
    let filteredTxs = allTransactions;
    if (exportStartDate && exportEndDate) {
      filteredTxs = allTransactions.filter(t => {
        const d = t.tanggal ? t.tanggal.slice(0, 10) : '';
        return d >= exportStartDate && d <= exportEndDate;
      });
    } else if (selectedMonth) {
      filteredTxs = allTransactions.filter(t => t.tanggal && t.tanggal.startsWith(selectedMonth));
    }

    let expOmzetLm = 0;
    let expOmzetBr = 0;
    let expLabaTotal = 0;
    let expPiutang = 0;
    let expPaid = 0;

    filteredTxs.forEach(t => {
      if (t.status === "Lunas") {
        expPaid += Number(t.amount_owed || 0);
        t.items?.forEach(item => {
          const type = item.product_type_snapshot || 'LM';
          if (type === "LM") expOmzetLm += Number(item.line_omzet || 0);
          else expOmzetBr += Number(item.line_omzet || 0);
          expLabaTotal += Number(item.line_laba || 0);
        });
      } else {
        expPiutang += Number(t.amount_owed || 0);
      }
    });

    const expOmzetTotal = expOmzetLm + expOmzetBr;

    const headers = ['Laporan Parameter', 'Nilai Nominal'];
    const rows = [
      ['Periode Laporan', exportStartDate && exportEndDate ? `${exportStartDate} s/d ${exportEndDate}` : selectedMonth],
      ['Total Omzet Lunas', expOmzetTotal],
      ['Omzet Kategori LM', expOmzetLm],
      ['Omzet Kategori BR', expOmzetBr],
      ['Laba Bersih Lunas', expLabaTotal],
      ['Outstanding Piutang', expPiutang],
      ['Total Setoran Masuk', expPaid]
    ];

    const filename = `Rekap_Keuangan_${exportStartDate || selectedMonth}_sd_${exportEndDate || selectedMonth}.csv`;
    exportToCSV(filename, headers, rows);
  };

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <div className="w-10 h-10 border-4 border-slate-900 border-t-[#CCFF00] rounded-full animate-spin" />
        <span className="text-xs font-mono font-bold text-slate-700">Memuat Laporan Keuangan &amp; Radar Analitik...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32">

      {/* HEADER PAGE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display uppercase tracking-tight">📊 Laporan &amp; Analitik Bisnis</h1>
            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg border font-mono ${
              normalizePlan(userPlan) === 'EKSEKUTIF' ? 'bg-[#CCFF00] text-slate-900 border-slate-800 shadow-[1px_1px_0px_#1E293B]' :
              normalizePlan(userPlan) === 'MANAJER' ? 'bg-purple-100 text-purple-900 border-purple-500' :
              normalizePlan(userPlan) === 'SUPERVISOR' ? 'bg-blue-100 text-blue-900 border-blue-500' :
              'bg-slate-100 text-slate-700 border-slate-300'
            }`}>
              {planConfig?.badge || `PAKET ${userPlan}`}
            </span>
          </div>
          <p className="text-xs font-sans text-slate-600 mt-1">Pantau performa penjualan, radar batal kasir, grafik jam sibuk, dan audit trail.</p>
        </div>

        {/* TAB BUTTONS (Pop-Art Glass Capsule) */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('rekap')}
            className={`btn-arcade px-3.5 py-2 border-2 border-slate-800 text-xs font-mono font-bold uppercase rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'rekap' ? 'bg-slate-900 text-[#CCFF00] shadow-[2px_2px_0px_#1E293B]' : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            <FileText size={14} /> Rekap
          </button>
          <button
            onClick={() => setActiveTab('heatmap')}
            className={`btn-arcade px-3.5 py-2 border-2 border-slate-800 text-xs font-mono font-bold uppercase rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'heatmap' ? 'bg-slate-900 text-[#CCFF00] shadow-[2px_2px_0px_#1E293B]' : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Flame size={14} className={activeTab === 'heatmap' ? 'text-[#CCFF00]' : 'text-amber-500'} /> Heatmap
            {isFree && (
              <span className="bg-slate-100 text-slate-700 text-[9px] font-bold px-1.5 py-0.2 rounded border border-slate-300 flex items-center gap-0.5 ml-1">
                <Lock size={9} /> Pro
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('top_products')}
            className={`btn-arcade px-3.5 py-2 border-2 border-slate-800 text-xs font-mono font-bold uppercase rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'top_products' ? 'bg-slate-900 text-[#CCFF00] shadow-[2px_2px_0px_#1E293B]' : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Trophy size={14} className={activeTab === 'top_products' ? 'text-[#CCFF00]' : 'text-amber-500'} /> Top 10
            {isFree && (
              <span className="bg-slate-100 text-slate-700 text-[9px] font-bold px-1.5 py-0.2 rounded border border-slate-300 flex items-center gap-0.5 ml-1">
                <Lock size={9} /> Pro
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('void_logs')}
            className={`btn-arcade px-3.5 py-2 border-2 border-slate-800 text-xs font-mono font-bold uppercase rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'void_logs' ? 'bg-slate-900 text-[#CCFF00] shadow-[2px_2px_0px_#1E293B]' : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            <ShieldAlert size={14} /> Void Log ({voidLogs.length})
            {isFree && (
              <span className="bg-slate-100 text-slate-700 text-[9px] font-bold px-1.5 py-0.2 rounded border border-slate-300 flex items-center gap-0.5 ml-1">
                <Lock size={9} /> Pro
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── TAB 1: REKAP KEUANGAN ── */}
      {activeTab === 'rekap' && (
        <div className="space-y-6">
          {/* 1. TOP METRICS (The Comic Trio) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Stat 1: Total Omzet Lunas */}
            <div className="bg-white p-6 rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] space-y-1">
              <p className="text-xs font-mono font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-[#CCFF00] border border-slate-800 rounded-full block" /> TOTAL OMZET LUNAS
              </p>
              <p className="text-3xl font-extrabold font-mono text-slate-900 tabular-nums">
                {formatRupiah(totals.omzet_total)}
              </p>
              <p className="text-[10px] font-mono text-slate-500">Total kas tunai dari transaksi lunas</p>
            </div>

            {/* Stat 2: Laba Bersih Lunas */}
            <div className="bg-white p-6 rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] space-y-1">
              <p className="text-xs font-mono font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-500 border border-slate-800 rounded-full block" /> LABA BERSIH (PROFIT)
              </p>
              <p className="text-3xl font-extrabold font-mono text-emerald-800 tabular-nums">
                {formatRupiah(totals.laba_total)}
              </p>
              <p className="text-[10px] font-mono text-slate-500">Laba riil setelah dipotong modal HPP</p>
            </div>

            {/* Stat 3: Outstanding Piutang */}
            <div className="bg-white p-6 rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] space-y-1">
              <p className="text-xs font-mono font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-rose-500 border border-slate-800 rounded-full block" /> OUTSTANDING PIUTANG
              </p>
              <p className="text-3xl font-extrabold font-mono text-rose-600 tabular-nums">
                {formatRupiah(totals.piutang)}
              </p>
              <p className="text-[10px] font-mono text-slate-500">Uang bon di luar yang belum ditagih</p>
            </div>
          </div>

          {/* 2. COMPACT FILTER ROW & EXPORT CSV BUTTON */}
          <div className="bg-white p-5 rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] space-y-4 w-full">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center flex-wrap gap-4">
                
                {/* Month Dropdown */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="text-xs font-mono font-bold text-slate-700 uppercase whitespace-nowrap hidden sm:block">
                    Pilih Bulan:
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => handleMonthChange(e.target.value)}
                    className="w-full sm:w-auto bg-slate-50 border-2 border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#CCFF00] outline-none cursor-pointer min-w-[180px]"
                  >
                    {availableMonths.map(m => {
                      const parts = m.split('-');
                      const year = parts[0];
                      const monthIdx = parseInt(parts[1], 10) - 1;
                      const monthNames = [
                        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                      ];
                      const monthLabel = monthNames[monthIdx] ? `${monthNames[monthIdx]} ${year}` : m;
                      return (
                        <option key={m} value={m}>
                          {monthLabel}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Date Range Inputs */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                  <label className="text-xs font-mono font-bold text-slate-700 uppercase whitespace-nowrap hidden sm:block">
                    Rentang:
                  </label>
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                    <input
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      className="flex-1 sm:flex-none bg-slate-50 border-2 border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#CCFF00] min-w-[130px]"
                    />
                    <span className="text-xs text-slate-500 font-mono font-bold">s/d</span>
                    <input
                      type="date"
                      value={exportEndDate}
                      max={!isPro && exportStartDate ? new Date(new Date(exportStartDate).getTime() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0] : undefined}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                      className="flex-1 sm:flex-none bg-slate-50 border-2 border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#CCFF00] min-w-[130px]"
                    />
                  </div>
                </div>

              </div>

              {/* Unduh CSV Button */}
              <button
                onClick={handleExportOverallCSV}
                className="btn-arcade w-full lg:w-auto bg-[#CCFF00] hover:bg-[#b3e600] border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] text-slate-900 text-xs font-mono font-bold uppercase px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Download size={15} />
                <span>Unduh CSV Rekap</span>
                {!isPro && (
                  <span className="bg-slate-900 text-[#CCFF00] text-[9px] font-black px-1.5 py-0.2 rounded border border-slate-800 ml-1">
                    PRO
                  </span>
                )}
              </button>
            </div>

            {dateCapError && (
              <p className="text-xs font-mono font-bold text-rose-900 bg-rose-50 p-2.5 rounded-xl border border-rose-300">
                {dateCapError}
              </p>
            )}
          </div>

          {/* 3. CHARTS ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MonthlyTrendChart data={trendData} />
            <CategoryPieChart data={ledgerData.categoryOmzets} />
          </div>
        </div>
      )}

      {/* ── TAB 2: HEATMAP JAM SIBUK (Gated for FREE) ── */}
      {activeTab === 'heatmap' && (
        <div className="relative">
          <div className={`bg-white p-6 rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] space-y-6 ${
            isFree ? 'filter blur-sm opacity-35 pointer-events-none select-none' : ''
          }`}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 font-display uppercase flex items-center gap-2">
                  <Flame size={18} className="text-amber-500" /> Heatmap Jam Sibuk Warung (Jam Rame Pembeli)
                </h2>
                <p className="text-xs font-sans text-slate-600 mt-0.5">Visualisasi distribusi jam transaksi untuk optimasi jadwal kerja kasir &amp; stok.</p>
              </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-3 pt-2">
              {hourlyData.map(h => {
                const intensity = h.count / maxHourlyCount;
                return (
                  <div key={h.hour} className="flex flex-col items-center gap-1.5 group">
                    <div className="w-full bg-slate-50 border-2 border-slate-800 rounded-xl h-28 flex flex-col justify-end p-1 relative overflow-hidden">
                      <div
                        className="w-full transition-all duration-500 bg-[#CCFF00] rounded-lg border border-slate-800"
                        style={{ height: `${Math.max(10, Math.round(intensity * 100))}%`, opacity: h.count > 0 ? 1 : 0.3 }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-slate-900/90 text-[#CCFF00] text-[10px] font-mono font-bold transition-all rounded-lg">
                        {h.count} Trx
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-600">{String(h.hour).padStart(2, '0')}:00</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Paywall Overlay for FREE tier */}
          {isFree && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-2xl p-6 text-center border-2 border-slate-800 shadow-[6px_6px_0px_#1E293B]">
              <div className="w-12 h-12 bg-slate-900 text-[#CCFF00] border-2 border-slate-800 rounded-2xl flex items-center justify-center mb-3 shadow-[2px_2px_0px_#1E293B]">
                <Lock size={24} />
              </div>
              <span className="text-[10px] font-mono font-black tracking-widest uppercase bg-slate-100 text-slate-800 px-3 py-1 rounded border border-slate-300 mb-2">
                FITUR PAKET STARTER &amp; PRO
              </span>
              <h3 className="text-base font-extrabold text-slate-900 font-display uppercase">Heatmap Jam Sibuk Terkunci</h3>
              <p className="text-xs font-sans text-slate-600 max-w-md mt-1 mb-4">
                Analisis jam rame pembeli untuk optimasi staf toko Anda. Upgrade kontrak Anda untuk membuka akses.
              </p>
              <a
                href="/billing"
                className="btn-arcade inline-flex items-center gap-2 bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B] font-mono font-bold text-xs uppercase px-5 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                <Sparkles size={14} /> Upgrade Paket Sekarang
              </a>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: TOP 10 PRODUK (Gated for FREE) ── */}
      {activeTab === 'top_products' && (
        <div className="relative">
          <div className={`bg-white p-6 rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] space-y-4 ${
            isFree ? 'filter blur-sm opacity-35 pointer-events-none select-none' : ''
          }`}>
            <h2 className="text-base font-extrabold text-slate-900 font-display uppercase flex items-center gap-2 border-b border-slate-200 pb-3">
              <Trophy size={18} className="text-amber-500" /> Top 10 Produk Paling Laku
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse border border-slate-800 bg-white rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-800 font-mono text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">PERINGKAT</th>
                    <th className="py-3 px-4">NAMA PRODUK</th>
                    <th className="py-3 px-4 text-center">TOTAL TERJUAL</th>
                    <th className="py-3 px-4 text-right">TOTAL OMZET</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-slate-900">
                  {topProducts.length > 0 ? (
                    topProducts.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-all">
                        <td className="py-3 px-4 font-bold">
                          <span className={`w-7 h-7 border-2 border-slate-800 rounded-lg inline-flex items-center justify-center text-[10px] font-black ${
                            idx === 0 ? 'bg-[#CCFF00] text-slate-900' : idx === 1 ? 'bg-slate-200 text-slate-900' : idx === 2 ? 'bg-amber-100 text-amber-900' : 'bg-slate-50 text-slate-700'
                          }`}>
                            #{idx + 1}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold font-sans text-sm">{p.name}</td>
                        <td className="py-3 px-4 text-center font-bold">{p.totalQty} Pcs</td>
                        <td className="py-3 px-4 text-right font-extrabold tabular-nums">{formatRupiah(p.totalOmzet)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="text-center py-8 text-slate-500 font-sans">Belum ada data penjualan produk.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paywall Overlay for FREE tier */}
          {isFree && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-2xl p-6 text-center border-2 border-slate-800 shadow-[6px_6px_0px_#1E293B]">
              <div className="w-12 h-12 bg-slate-900 text-[#CCFF00] border-2 border-slate-800 rounded-2xl flex items-center justify-center mb-3 shadow-[2px_2px_0px_#1E293B]">
                <Lock size={24} />
              </div>
              <span className="text-[10px] font-mono font-black tracking-widest uppercase bg-slate-100 text-slate-800 px-3 py-1 rounded border border-slate-300 mb-2">
                FITUR PAKET STARTER &amp; PRO
              </span>
              <h3 className="text-base font-extrabold text-slate-900 font-display uppercase">Top 10 Produk Terkunci</h3>
              <p className="text-xs font-sans text-slate-600 max-w-md mt-1 mb-4">
                Pantau 10 barang paling laris beserta kontribusi omzetnya. Upgrade kontrak Anda untuk membuka data lengkap.
              </p>
              <a
                href="/billing"
                className="btn-arcade inline-flex items-center gap-2 bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B] font-mono font-bold text-xs uppercase px-5 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                <Sparkles size={14} /> Upgrade Paket Sekarang
              </a>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: VOID LOGS (Gated for FREE) ── */}
      {activeTab === 'void_logs' && (
        <div className="relative">
          <div className={`bg-white p-6 rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] space-y-4 ${
            isFree ? 'filter blur-sm opacity-35 pointer-events-none select-none' : ''
          }`}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 font-display uppercase flex items-center gap-2">
                  <ShieldAlert size={18} className="text-rose-600" /> Void Log (Radar Batal Kasir)
                </h2>
                <p className="text-xs font-sans text-slate-600 mt-0.5">Merekam otomatis setiap kali kasir menghapus barang dari keranjang belanja.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse border border-slate-800 bg-white rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-800 font-mono text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">WAKTU BATAL</th>
                    <th className="py-3 px-4">NAMA KASIR</th>
                    <th className="py-3 px-4">PRODUK DIBATALKAN</th>
                    <th className="py-3 px-4 text-center">QTY DIHAPUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-slate-900">
                  {voidLogs.length > 0 ? (
                    voidLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-all">
                        <td className="py-3 px-4 text-slate-500 font-medium">
                          {new Date(log.voided_at || log.created_at).toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-4 font-bold">{log.cashier_name}</td>
                        <td className="py-3 px-4 font-bold font-sans text-sm">{log.product_name}</td>
                        <td className="py-3 px-4 text-center font-black">
                          <span className="bg-rose-100 border border-rose-400 text-rose-800 px-2 py-0.5 rounded font-mono text-xs">
                            -{log.quantity}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="text-center py-8 text-slate-500 font-sans">Tidak ada riwayat pembatalan item (Void Log bersih).</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paywall Overlay for FREE tier */}
          {isFree && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-2xl p-6 text-center border-2 border-slate-800 shadow-[6px_6px_0px_#1E293B]">
              <div className="w-12 h-12 bg-slate-900 text-[#CCFF00] border-2 border-slate-800 rounded-2xl flex items-center justify-center mb-3 shadow-[2px_2px_0px_#1E293B]">
                <Lock size={24} />
              </div>
              <span className="text-[10px] font-mono font-black tracking-widest uppercase bg-slate-100 text-slate-800 px-3 py-1 rounded border border-slate-300 mb-2">
                FITUR PAKET STARTER &amp; PRO
              </span>
              <h3 className="text-base font-extrabold text-slate-900 font-display uppercase">Radar Batal Kasir Terkunci</h3>
              <p className="text-xs font-sans text-slate-600 max-w-md mt-1 mb-4">
                Pengawasan pembatalan item kasir real-time untuk mencegah kecurangan toko.
              </p>
              <a
                href="/billing"
                className="btn-arcade inline-flex items-center gap-2 bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B] font-mono font-bold text-xs uppercase px-5 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                <Sparkles size={14} /> Upgrade Paket Sekarang
              </a>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL PAYWALL CSV EXPORT (Non-PRO Users) ── */}
      {showProModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white border-2 border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-[8px_8px_0px_#1E293B] relative">
            <button
              onClick={() => setShowProModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="w-12 h-12 bg-slate-900 text-[#CCFF00] border-2 border-slate-800 rounded-2xl flex items-center justify-center font-bold shadow-[2px_2px_0px_#1E293B]">
              <Sparkles size={22} />
            </div>

            <div>
              <span className="text-[10px] font-mono font-black uppercase tracking-wider bg-slate-100 text-slate-900 px-2.5 py-0.5 rounded border border-slate-300">
                KHUSUS PAKET BERBAYAR
              </span>
              <h3 className="text-base font-extrabold text-slate-900 font-display uppercase mt-2">
                Fitur Unduh CSV Terkunci
              </h3>
              <p className="text-xs font-sans text-slate-600 mt-1">
                Ekspor data laporan keuangan ke format spreadsheet memerlukan paket <strong className="text-slate-900">Supervisor, Manajer, atau Eksekutif</strong>.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-300 p-4 rounded-xl text-xs font-sans space-y-2">
              <p className="font-bold flex items-center gap-1.5 text-slate-900 font-mono uppercase text-[11px]">
                <CheckCircle2 size={15} className="text-emerald-600" /> Benefit Upgrade Paket:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-700 pl-1">
                <li>Unduh data laporan &amp; rekap keuangan ke format CSV tanpa batas</li>
                <li>Mendukung banyak akun kasir &amp; multi-cabang (Paket Eksekutif)</li>
                <li>Audit Log Immutable &amp; Rekonsiliasi Otomatis</li>
              </ul>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowProModal(false)}
                className="btn-arcade flex-1 py-2.5 border-2 border-slate-800 text-slate-700 font-mono font-bold text-xs uppercase bg-white hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                Nanti Saja
              </button>
              <a
                href="/billing"
                className="btn-arcade flex-1 py-2.5 bg-[#CCFF00] hover:bg-[#b3e600] border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] text-slate-900 font-mono font-bold text-xs uppercase text-center rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles size={14} /> Lihat Paket Langganan
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DATE RANGE CAP ERROR (Max 30 Days) ── */}
      {dateCapError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white border-2 border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-[8px_8px_0px_#1E293B] relative">
            <button
              onClick={() => setDateCapError('')}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="w-12 h-12 bg-rose-100 border-2 border-rose-500 text-rose-800 rounded-2xl flex items-center justify-center font-bold shadow-[2px_2px_0px_#E30022]">
              <AlertTriangle size={22} />
            </div>

            <div>
              <span className="text-[10px] font-mono font-black uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-300 px-2.5 py-0.5 rounded">
                BATAS RENTANG EKSPOR CSV
              </span>
              <h3 className="text-base font-extrabold text-slate-900 font-display uppercase mt-2">
                Batas Maksimal 30 Hari Ekspor
              </h3>
              <p className="text-xs font-sans text-slate-600 mt-1">
                {dateCapError}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setDateCapError('')}
                className="btn-arcade px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-[#CCFF00] border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] font-mono font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
              >
                Mengerti &amp; Sesuaikan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
