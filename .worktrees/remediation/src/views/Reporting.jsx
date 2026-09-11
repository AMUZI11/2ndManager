"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { formatRupiah } from '@/utils/format';
import { Printer, Gift, Download } from 'lucide-react';
import { api } from '../utils/api';
import { useTutorial } from '../components/TutorialEngine';
import { MonthlyTrendChart, CategoryPieChart } from '../components/AnalyticsCharts';
import { exportToCSV } from '../utils/export';

export default function Reporting() {
  const { registerTrigger } = useTutorial();
  const [selectedMonth, setSelectedMonth] = useState(""); // YYYY-MM
  const [availableMonths, setAvailableMonths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      try {
        const [txs, custs] = await Promise.all([
          api.getTransactions({ page_size: 9999 }),
          api.getCustomers({ page_size: 9999 })
        ]);
        setAllTransactions(txs);
        setCustomers(custs);

        const months = Array.from(new Set(txs.map(t => t.tanggal.slice(0, 7)))).sort().reverse();
        setAvailableMonths(months);

        const currentMonthStr = new Date().toISOString().slice(0, 7);
        setSelectedMonth(prev => {
          if (months.length > 0) {
            if (!prev || !months.includes(prev)) {
              return months[0];
            }
            return prev;
          }
          return currentMonthStr;
        });
      } catch (err) {
        console.error("Gagal memuat rekap laporan:", err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  const trendData = useMemo(() => {
    if (allTransactions.length === 0) return [];
    const monthlyGroups = {};
    allTransactions.forEach(t => {
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
    const monthlyTx = allTransactions.filter(t => t.tanggal.startsWith(selectedMonth));

    // Ledger variables
    let omzet_lm = 0;
    let omzet_br = 0;
    let laba_total = 0;
    let piutang = 0;
    let paid = 0;

    const categoryOmzets = {};
    monthlyTx.forEach(t => {
      if (t.status === "Lunas") {
        paid += t.amount_owed;
        
        t.items.forEach(item => {
          const type = item.product_type_snapshot || 'LM';
          categoryOmzets[type] = (categoryOmzets[type] || 0) + Number(item.line_omzet || 0);

          if (type === "LM") {
            omzet_lm += item.line_omzet;
          } else if (type === "BR") {
            omzet_br += item.line_omzet;
          }
          laba_total += item.line_laba;
        });
      } else {
        piutang += t.amount_owed;
      }
    });

    const omzet_total = omzet_lm + omzet_br;

    const totals = {
      omzet_lm,
      omzet_br,
      omzet_total,
      laba_total,
      piutang,
      paid
    };

    // Breakdown per customer
    const summaries = customers.map(c => {
      const cTx = monthlyTx.filter(t => t.customer_id === c.id);
      
      const cPiutang = cTx.filter(t => t.status === "Piutang").reduce((sum, t) => sum + t.amount_owed, 0);
      const cPaid = cTx.filter(t => t.status === "Lunas").reduce((sum, t) => sum + t.amount_owed, 0);
      
      let cOmzetLm = 0;
      let cOmzetBr = 0;
      let cLaba = 0;

      cTx.filter(t => t.status === "Lunas").forEach(t => {
        t.items.forEach(item => {
          if (item.product_type_snapshot === "LM") {
            cOmzetLm += item.line_omzet;
          } else {
            cOmzetBr += item.line_omzet;
          }
          cLaba += item.line_laba;
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

    // Filter bonus logs for selected month
    const bonuses = monthlyTx.filter(t => t.is_bonus);

    return {
      totals,
      customerSummaries: summaries,
      bonusLogs: bonuses,
      categoryOmzets
    };
  }, [selectedMonth, allTransactions, customers]);

  const { totals, customerSummaries, bonusLogs } = ledgerData;


  const handleExportOverallCSV = () => {
    const headers = ['Laporan Parameter', 'Nilai Nominal'];
    const rows = [
      ['Periode Laporan', selectedMonth],
      ['Total Omzet Lunas', totals.omzet_total],
      ['Omzet Kategori LM', totals.omzet_lm],
      ['Omzet Kategori BR', totals.omzet_br],
      ['Laba Bersih Lunas', totals.laba_total],
      ['Outstanding Piutang', totals.piutang],
      ['Total Setoran Masuk', totals.paid]
    ];
    exportToCSV(`Rekap_Bulanan_${selectedMonth}.csv`, headers, rows);
  };

  const handleExportCustomersCSV = () => {
    const headers = ['Nama Pelanggan', 'Omzet Lunas (Rp)', 'Laba Lunas (Rp)', 'Outstanding Piutang (Rp)', 'Total Setoran Masuk (Rp)'];
    const rows = customerSummaries.map(s => [
      s.nama,
      s.omzet,
      s.laba,
      s.piutang,
      s.paid
    ]);
    exportToCSV(`Breakdown_Pelanggan_${selectedMonth}.csv`, headers, rows);
  };

  const handlePrintOverall = () => {
    const printWindow = window.open("", "_blank");
    
    const [year, month] = selectedMonth.split("-");
    const d = new Date(year, month - 1);
    const monthName = d.toLocaleString('id-ID', { month: 'long', year: 'numeric' });

    const formatRupiahPrint = (val) => {
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
    };

    let tableRows = customerSummaries.map(s => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${s.nama}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">${formatRupiahPrint(s.omzet)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">${formatRupiahPrint(s.laba)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right; color: red;">${formatRupiahPrint(s.piutang)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right; color: green;">${formatRupiahPrint(s.paid)}</td>
      </tr>
    `).join("");

    if (customerSummaries.length === 0) {
      tableRows = `<tr><td colspan="5" style="padding: 24px; text-align: center; color: #888;">Tidak ada data aktivitas penjualan.</td></tr>`;
    }

    const htmlContent = `
      <html>
        <head>
          <title>Rekap Bulanan Keseluruhan</title>
          <style>
            body { font-family: 'Arial', sans-serif; color: #333; margin: 40px; }
            .header { border-bottom: 3px double #333; padding-bottom: 15px; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; text-transform: uppercase; margin: 0; }
            .sub { font-size: 14px; color: #666; margin-top: 5px; }
            .meta { margin-bottom: 30px; line-height: 1.6; }
            .meta strong { min-width: 150px; display: inline-block; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f5f5f5; padding: 12px; border-bottom: 2px solid #333; text-align: left; }
            .total-box { margin-top: 30px; padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 8px; width: 100%; box-sizing: border-box; }
            .total-grid { display: grid; grid-template-cols: repeat(3, 1fr); gap: 20px; }
            .total-card { border-right: 1px solid #ddd; padding-right: 15px; }
            .total-card:last-child { border: none; }
            .total-label { font-size: 12px; color: #666; text-transform: uppercase; font-weight: bold; }
            .total-val { font-size: 20px; font-weight: bold; margin-top: 5px; }
            .footer { margin-top: 50px; border-top: 1px solid #ccc; padding-top: 15px; text-align: center; font-size: 12px; color: #888; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">Laporan Keuangan Bulanan HL</h1>
            <p class="sub">Keseluruhan Pelanggan • Cash Basis Ledger</p>
          </div>
          
          <div class="meta">
            <p><strong>Periode Laporan:</strong> ${monthName}</p>
            <p><strong>Tanggal Cetak:</strong> ${new Date().toLocaleDateString('id-ID')}</p>
          </div>

          <div class="total-box">
            <div class="total-grid">
              <div class="total-card">
                <div class="total-label">Total Penjualan Lunas</div>
                <div class="total-val" style="color: navy;">${formatRupiahPrint(totals.omzet_total)}</div>
              </div>
              <div class="total-card">
                <div class="total-label">Laba Bersih Lunas</div>
                <div class="total-val" style="color: purple;">${formatRupiahPrint(totals.laba_total)}</div>
              </div>
              <div class="total-card">
                <div class="total-label">Outstanding Piutang</div>
                <div class="total-val" style="color: red;">${formatRupiahPrint(totals.piutang)}</div>
              </div>
            </div>
          </div>

          <h2 style="font-size: 18px; margin-top: 40px; border-bottom: 1px solid #eee; padding-bottom: 8px;">Breakdown Pelanggan</h2>
          <table>
            <thead>
              <tr>
                <th>Nama Pelanggan</th>
                <th style="text-align: right;">Omzet Lunas</th>
                <th style="text-align: right;">Laba Lunas</th>
                <th style="text-align: right;">Piutang Outstanding</th>
                <th style="text-align: right;">Total Dibayar</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="footer">
            Dokumen Rekapitulasi Laporan Bulanan HL Manager Pro.
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const getMonthLabel = (mStr) => {
    if (!mStr) return "";
    const [year, month] = mStr.split("-");
    const d = new Date(year, month - 1);
    return d.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
  };



  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-navy-bright border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-charcoal-medium">Memuat Laporan Keuangan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white rounded-2xl p-6 border border-gray-100 shadow-sm gap-4">
        <div>
          <h1 className="text-hero text-xl">📋 Rekapitulasi Laporan Bulanan</h1>
          <p className="text-gray-500 text-xs mt-1">Laporan kinerja omzet, laba bersih, piutang tertunggak lintas semua pelanggan.</p>
        </div>

        {/* Month Filter Selector */}
        <div className="relative w-full sm:w-auto">
          <select 
            id="report-month-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full sm:w-56 h-12 bg-navy-light text-navy-deep border-2 border-navy-ice rounded-xl px-4 text-xs font-bold outline-none transition-all cursor-pointer"
          >
            {availableMonths.length === 0 ? (
              <option value={selectedMonth}>{getMonthLabel(selectedMonth)}</option>
            ) : (
              availableMonths.map(m => (
                <option key={m} value={m}>{getMonthLabel(m)}</option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Ledger Stats Row */}
      <div id="report-stats-cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Omzet */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">💰 Total Omzet Lunas</p>
          <p className="text-2xl font-extrabold text-navy-deep tabular-nums">{formatRupiah(totals.omzet_total)}</p>
          <div className="text-[10px] text-gray-500 space-y-0.5 mt-1 border-t border-gray-50 pt-1.5">
            <p>LM: {formatRupiah(totals.omzet_lm)}</p>
            <p>BR: {formatRupiah(totals.omzet_br)}</p>
          </div>
        </div>

        {/* Metric 2: Laba Bersih */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">💜 Laba Bersih Lunas (HL)</p>
          <p className="text-2xl font-extrabold text-purple-700 tabular-nums">{formatRupiah(totals.laba_total)}</p>
          <p className="text-[11px] text-gray-500 mt-1">Keuntungan yang sudah terealisasi</p>
        </div>

        {/* Metric 3: Piutang */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide text-rose-deep">🔴 Piutang Outstanding</p>
          <p className="text-2xl font-extrabold text-rose-deep tabular-nums">{formatRupiah(totals.piutang)}</p>
          <p className="text-[11px] text-gray-500 mt-1">Uang tertunggak di pelanggan</p>
        </div>

        {/* Metric 4: Total Dibayar */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide text-emerald-deep">🟢 Total Setoran Masuk</p>
          <p className="text-2xl font-extrabold text-emerald-deep tabular-nums">{formatRupiah(totals.paid)}</p>
          <p className="text-[11px] text-gray-500 mt-1">Omzet Lunas + Ongkir Lunas</p>
        </div>
      </div>

      {/* Action export card */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <span className="text-xs text-[#6B4F3A] font-bold">Unduh laporan keuangan ({selectedMonth}):</span>
        <div className="flex flex-wrap gap-2.5">
          <button 
            id="report-pdf-btn"
            onClick={() => {
              handlePrintOverall();
              registerTrigger("report-pdf-btn", "click");
            }}
            className="flex items-center gap-1.5 px-4 h-11 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
          >
            <Printer size={15} /> Cetak/PDF Rekap
          </button>
          <button 
            onClick={handleExportOverallCSV}
            className="flex items-center gap-1.5 px-4 h-11 bg-[#C97B1A] hover:bg-[#A85F10] text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
          >
            <Download size={15} /> CSV Rekap Bulanan
          </button>
          <button 
            onClick={handleExportCustomersCSV}
            className="flex items-center gap-1.5 px-4 h-11 bg-[#FAF7F0] hover:bg-[#E8DCC8] border border-[#E8DCC8] text-[#3D1A0F] text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
          >
            <Download size={15} /> CSV Breakdown Pelanggan
          </button>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MonthlyTrendChart data={trendData} />
        <CategoryPieChart data={ledgerData.categoryOmzets} />
      </div>

      {/* Main Grid: Breakdown table & Bonus Logs */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Table of customers performance (col-span 2) */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-heading text-base">Breakdown Kinerja per Pelanggan</h2>

          <div className="overflow-x-auto">
            {customerSummaries.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">Tidak ada aktivitas pelanggan di periode ini.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase font-semibold pb-3">
                    <th className="pb-3">Nama Pelanggan</th>
                    <th className="pb-3 text-right">Omzet Lunas</th>
                    <th className="pb-3 text-right">Laba Lunas</th>
                    <th className="pb-3 text-right">Outstanding Piutang</th>
                    <th className="pb-3 text-right">Setoran Masuk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {customerSummaries.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 font-semibold text-charcoal-black">{s.nama}</td>
                      <td className="py-3 text-right font-semibold tabular-nums">{formatRupiah(s.omzet)}</td>
                      <td className="py-3 text-right text-purple-700 font-bold tabular-nums">{formatRupiah(s.laba)}</td>
                      <td className="py-3 text-right text-rose-deep font-bold tabular-nums">{formatRupiah(s.piutang)}</td>
                      <td className="py-3 text-right text-emerald-deep font-bold tabular-nums">{formatRupiah(s.paid)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Bonus grants logs (col-span 1) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-heading text-base flex items-center gap-1.5">
            <Gift className="text-amber-gold" /> Log Bon Bonus Bulan Ini
          </h2>
          <p className="text-gray-500 text-xs leading-relaxed">
            Daftar bon penukaran hadiah produk gratis. Nilai omzet dan laba bon bonus tidak dihitung dalam laba HL utama.
          </p>

          <hr className="border-gray-50" />

          {bonusLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs">Belum ada bon bonus di periode ini.</div>
          ) : (
            <div className="space-y-3">
              {bonusLogs.map((tx) => {
                const c = customers.find(cust => cust.id === tx.customer_id);
                const totalQty = tx.items.reduce((s, i) => s + i.quantity, 0);
                return (
                  <div key={tx.id} className="p-3 bg-amber-cream/40 border border-amber-soft/50 rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between font-bold text-charcoal-black">
                      <span>{tx.nomor_bon}</span>
                      <span>{totalQty} Box</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>{c ? c.nama : "Umum"}</span>
                      <span>{tx.tanggal}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
