"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronRight, Calendar, CreditCard, Gift, Printer, CheckCircle2, ChevronLeft, X, Download, Flame, PiggyBank, Coins, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { api } from '../utils/api';
import ConfirmModal from '../components/ConfirmModal';
import { useTutorial } from '../components/TutorialEngine';
import { exportToCSV } from '../utils/export';
import AssetLoanModal from '../components/customers/AssetLoanModal';

export default function CustomerDetail({ customerId, setView, setEditTransactionId }) {
  const { registerTrigger } = useTutorial();
  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(""); // YYYY-MM
  const [availableMonths, setAvailableMonths] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settleType, setSettleType] = useState(""); // "single" or "month"
  const [settleTxId, setSettleTxId] = useState(null);
  const [tanggalLunas, setTanggalLunas] = useState(() => new Date().toISOString().split('T')[0]);
  const [deleteTxId, setDeleteTxId] = useState(null);

  // Asset Loans Modal State
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [assetModalMode, setAssetModalMode] = useState('RETURN');

  // Celengan Saldo (Fase 2)
  const [balanceInfo, setBalanceInfo] = useState({ balance: 0, mutations: [] });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const customers = await api.getCustomers();
      const cust = customers.find(c => c.id === customerId);
      setCustomer(cust);

      // Load Celengan Saldo
      try {
        const bal = await api.getCustomerBalance(customerId);
        setBalanceInfo(bal || { balance: 0, mutations: [] });
      } catch (e) {
        console.warn('[CustomerDetail] Gagal load balance:', e);
      }

      const allTx = await api.getTransactions();
      const filteredTx = allTx.filter(t => t.customer_id === customerId);
      setTransactions(filteredTx);

      // Extract unique months from transactions (format YYYY-MM)
      const months = Array.from(new Set(filteredTx.map(t => t.tanggal.slice(0, 7)))).sort().reverse();
      setAvailableMonths(months);

      // Set initial month to the latest available month, or current month if empty
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
      console.error("Gagal memuat detail pelanggan:", err);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (!customerId) return;
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [customerId, loadData]);

  // Recalculate monthly totals on month change using useMemo
  const summary = useMemo(() => {
    if (!selectedMonth || transactions.length === 0) {
      return { piutang: 0, lunas: 0, omzet_lm: 0, omzet_br: 0, omzet_total: 0, laba_total: 0 };
    }

    const filtered = transactions.filter(t => t.tanggal.startsWith(selectedMonth));

    const piutang = filtered.filter(t => t.status === "Piutang").reduce((sum, t) => sum + t.amount_owed, 0);
    const lunas = filtered.filter(t => t.status === "Lunas").reduce((sum, t) => sum + t.amount_owed, 0);

    // Filter items in paid transactions for omzet breakdowns
    let omzet_lm = 0;
    let omzet_br = 0;
    let laba_total = 0;

    filtered.filter(t => t.status === "Lunas").forEach(t => {
      t.items.forEach(item => {
        if (item.product_type_snapshot === "LM") {
          omzet_lm += item.line_omzet;
        } else {
          omzet_br += item.line_omzet;
        }
        laba_total += item.line_laba;
      });
    });

    const omzet_total = omzet_lm + omzet_br;

    return {
      piutang,
      lunas,
      omzet_lm,
      omzet_br,
      omzet_total,
      laba_total
    };
  }, [selectedMonth, transactions]);

  if (loading || !customer) {
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-kw-bg">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-kw-terra border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-lg font-semibold text-kw-text">Memuat data pelanggan...</p>
        </div>
      </div>
    );
  }

  const handleOpenSettleSingle = (txId) => {
    setSettleType("single");
    setSettleTxId(txId);
    setTanggalLunas(new Date().toISOString().split('T')[0]);
    setIsSettleModalOpen(true);
  };

  const handleOpenSettleMonth = () => {
    setSettleType("month");
    setTanggalLunas(new Date().toISOString().split('T')[0]);
    setIsSettleModalOpen(true);
  };

  const handleConfirmSettle = async (e) => {
    e.preventDefault();
    try {
      if (settleType === "single") {
        await api.settleTransaction(settleTxId, tanggalLunas);
      } else {
        const [year, month] = selectedMonth.split("-");
        await api.settleMonth(customerId, year, month, tanggalLunas);
      }
      registerTrigger("settle-confirm-btn", "click");
      setIsSettleModalOpen(false);
      await loadData();
    } catch (err) {
      alert(err.message || "Gagal memproses pelunasan.");
    }
  };


  const handlePrint = (title, type) => {
    const printWindow = window.open("", "_blank");
    
    // Monthly display string
    const [year, month] = selectedMonth.split("-");
    const date = new Date(year, month - 1);
    const monthName = date.toLocaleString('id-ID', { month: 'long', year: 'numeric' });

    const filtered = transactions.filter(t => t.tanggal.startsWith(selectedMonth));
    const isPiutangOnly = type === "piutang";
    const reportTx = isPiutangOnly ? filtered.filter(t => t.status === "Piutang") : filtered;

    const formatRupiahPrint = (val) => {
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
    };

    let tableRows = reportTx.map(t => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${t.nomor_bon}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${t.tanggal}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatRupiahPrint(t.omzet_total)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatRupiahPrint(t.ongkir)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">${formatRupiahPrint(t.amount_owed)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center; font-weight: bold; color: ${t.status === 'Lunas' ? 'green' : 'red'};">${t.status}</td>
      </tr>
    `).join("");

    if (reportTx.length === 0) {
      tableRows = `<tr><td colspan="6" style="padding: 24px; text-align: center; color: #888;">Tidak ada data transaksi.</td></tr>`;
    }

    const htmlContent = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: 'Arial', sans-serif; color: #333; margin: 40px; }
            .header { border-bottom: 3px double #333; padding-bottom: 15px; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; text-transform: uppercase; margin: 0; }
            .sub { font-size: 14px; color: #666; margin-top: 5px; }
            .meta { margin-bottom: 30px; line-height: 1.6; }
            .meta strong { min-width: 150px; display: inline-block; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f5f5f5; padding: 10px; border-bottom: 2px solid #333; text-align: left; }
            .footer { margin-top: 50px; border-top: 1px solid #ccc; padding-top: 15px; text-align: center; font-size: 12px; color: #888; }
            .total-box { margin-top: 30px; padding: 15px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 8px; display: inline-block; min-width: 300px; float: right; }
            .total-line { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 5px; }
            .clear { clear: both; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">${title}</h1>
            <p class="sub">2ndManager • Master Financial Record</p>
          </div>
          
          <div class="meta">
            <p><strong>Nama Pelanggan:</strong> ${customer.nama}</p>
            <p><strong>Periode Laporan:</strong> ${monthName}</p>
            <p><strong>Tanggal Cetak:</strong> ${new Date().toLocaleDateString('id-ID')}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>No. Bon</th>
                <th>Tanggal</th>
                <th style="text-align: right;">Omzet</th>
                <th style="text-align: right;">Ongkir</th>
                <th style="text-align: right;">Total Tagihan</th>
                <th style="text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="total-box">
            <div class="total-line">
              <span>Total Lunas:</span>
              <strong>${formatRupiahPrint(summary.lunas)}</strong>
            </div>
            <div class="total-line" style="color: red;">
              <span>Total Piutang (Belum Bayar):</span>
              <strong>${formatRupiahPrint(summary.piutang)}</strong>
            </div>
            <hr />
            <div class="total-line" style="font-size: 16px; font-weight: bold;">
              <span>Total Omzet Lunas:</span>
              <strong>${formatRupiahPrint(summary.omzet_total)}</strong>
            </div>
          </div>
          <div class="clear"></div>

          <div class="footer">
            Dokumen ini dihasilkan secara otomatis oleh 2ndManager. Cetakan sah tanpa tanda tangan fisik.
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

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const filteredMonthTx = transactions.filter(t => t.tanggal.startsWith(selectedMonth));

  const handleExportCSV = () => {
    if (!customer) return;
    const headers = ['Nomor Bon', 'Tanggal', 'Ongkir (Rp)', 'Total Tagihan (Rp)', 'Status', 'Tanggal Lunas'];
    const rows = filteredMonthTx.map(t => [
      t.nomor_bon,
      t.tanggal,
      Number(t.ongkir || 0),
      Number(t.amount_owed || 0),
      t.status,
      t.tanggal_lunas || '-'
    ]);
    exportToCSV(`Transaksi_${customer.nama.replace(/\s+/g, '_')}_${selectedMonth}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6 pb-32">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white rounded-2xl p-6 border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setView("customers")} 
            className="btn-arcade p-2.5 bg-white hover:bg-slate-50 border-2 border-slate-800 rounded-xl text-slate-900 transition-colors shadow-[2px_2px_0px_#1E293B] cursor-pointer"
            title="Kembali ke Daftar Pelanggan"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display uppercase tracking-tight">{customer.nama}</h1>
              <div className="flex gap-1.5 font-mono text-[10px] flex-wrap">
                {customer.discounts && Object.keys(customer.discounts).length > 0 ? (
                  Object.entries(customer.discounts)
                    .filter(([_, steps]) => Array.isArray(steps) && steps.some(d => Number(d) > 0))
                    .map(([code, steps]) => (
                      <span key={code} className="bg-slate-100 text-slate-900 font-bold px-2 py-0.5 border border-slate-300 rounded shadow-sm">
                        {code}: {steps.filter(d => Number(d) > 0).map(d => `${d}%`).join(' + ')}
                      </span>
                    ))
                ) : (
                  <>
                    <span className="bg-slate-100 text-slate-900 font-bold px-2 py-0.5 border border-slate-300 rounded">
                      LM: {customer.discounts_lm && customer.discounts_lm.length > 0 ? customer.discounts_lm.map(d => `${d}%`).join(' + ') : '0%'}
                    </span>
                    <span className="bg-slate-100 text-slate-900 font-bold px-2 py-0.5 border border-slate-300 rounded">
                      BR: {customer.discounts_br && customer.discounts_br.length > 0 ? customer.discounts_br.map(d => `${d}%`).join(' + ') : '0%'}
                    </span>
                  </>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-600 font-mono mt-1">Buku Kasbon &amp; Riwayat Belanja. Target Bonus: {formatRupiah(customer.bonus_threshold)}</p>
          </div>
        </div>

        {/* Month Selector Dropdown */}
        <div className="w-full sm:w-auto">
          <select 
            id="cust-detail-month-select"
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              registerTrigger("cust-detail-month-select", "change");
            }}
            className="w-full sm:w-56 h-11 bg-slate-50 text-slate-900 border-2 border-slate-800 rounded-xl px-3 text-xs font-mono font-bold outline-none transition-all cursor-pointer focus:ring-2 focus:ring-[#CCFF00]"
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

      {/* Pelacak Tabung Gas & Galon (Fase 1) */}
      {customer && (
        <div className="bg-white border-2 border-slate-800 rounded-2xl p-5 shadow-[4px_4px_0px_#1E293B] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-500" />
              <h3 className="font-extrabold text-sm text-slate-900 font-display uppercase tracking-tight">
                Status Pinjaman Tabung Gas &amp; Galon
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAssetModalMode('RETURN');
                  setIsAssetModalOpen(true);
                }}
                className="btn-arcade text-[11px] font-mono font-bold uppercase bg-emerald-400 hover:bg-emerald-300 text-slate-900 px-3 py-1.5 rounded-xl border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] cursor-pointer"
              >
                ↩️ Terima Pengembalian
              </button>
              <button
                onClick={() => {
                  setAssetModalMode('LOAN');
                  setIsAssetModalOpen(true);
                }}
                className="btn-arcade text-[11px] font-mono font-bold uppercase bg-white hover:bg-slate-100 text-slate-900 px-3 py-1.5 rounded-xl border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] cursor-pointer"
              >
                ➕ Catat Pinjam
              </button>
            </div>
          </div>

          {(() => {
            const activeLoans = Object.entries(customer.loaned_assets || {})
              .filter(([_, qty]) => parseInt(qty, 10) > 0);
            if (activeLoans.length === 0) {
              return (
                <p className="text-xs font-mono text-slate-500 py-1">
                  ✅ Tidak ada aset fisik tabung gas atau galon yang sedang dipinjam oleh {customer.nama}.
                </p>
              );
            }
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                {activeLoans.map(([assetType, qty]) => (
                  <div key={assetType} className="p-3 bg-amber-50 border-2 border-slate-800 rounded-xl">
                    <div className="text-[10px] font-mono font-bold text-slate-600 uppercase truncate">
                      {assetType}
                    </div>
                    <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
                      {qty} <span className="text-xs font-bold text-slate-500">Unit</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Celengan & Tabungan Saldo Pelanggan (Fase 2) */}
      {customer && (
        <div className="bg-white border-2 border-slate-800 rounded-2xl p-5 shadow-[4px_4px_0px_#1E293B] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 font-display uppercase tracking-tight">
                  Celengan &amp; Saldo Tabungan Pelanggan
                </h3>
                <p className="text-[11px] text-slate-500 font-sans">
                  Sisa kembalian belanja yang disimpan dan dapat dipakai belanja berikutnya
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-500">Saldo Aktif:</span>
              <span className="text-xl font-black font-mono text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-300">
                {formatRupiah(balanceInfo.balance)}
              </span>
            </div>
          </div>

          {/* Riwayat Mutasi Celengan */}
          {balanceInfo.mutations && balanceInfo.mutations.length > 0 ? (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">
                5 Mutasi Terakhir:
              </span>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs font-sans">
                {balanceInfo.mutations.slice(0, 5).map((m) => (
                  <div key={m.id} className="p-2.5 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                        m.mutation_type === 'DEPOSIT' ? 'bg-emerald-100 text-emerald-800' :
                        m.mutation_type === 'KASBON_PAYMENT' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {m.mutation_type === 'DEPOSIT' ? '↓' : m.mutation_type === 'KASBON_PAYMENT' ? '✓' : '↑'}
                      </span>
                      <div>
                        <span className="font-bold text-slate-800 block">
                          {m.mutation_type === 'DEPOSIT' ? 'Tabungan Kembalian' :
                           m.mutation_type === 'KASBON_PAYMENT' ? 'Pelunasan Kasbon' :
                           m.mutation_type === 'WITHDRAW' ? 'Dipakai Belanja' : 'Penyesuaian Saldo'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(m.created_at).toLocaleDateString('id-ID')} • {m.notes || '-'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <span className={`font-bold block ${
                        m.mutation_type === 'DEPOSIT' ? 'text-emerald-700' :
                        m.mutation_type === 'KASBON_PAYMENT' ? 'text-indigo-700' :
                        'text-slate-900'
                      }`}>
                        {m.mutation_type === 'DEPOSIT' ? '+' : '-'}{formatRupiah(m.amount)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Saldo: {formatRupiah(m.current_balance)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs font-mono text-slate-500 py-1">
              Belum ada mutasi celengan untuk pelanggan ini. Kembalian belanja di POS dapat disimpan ke celengan.
            </p>
          )}
        </div>
      )}

      {/* Monthly Stats Cards Row (The Comic Quartet) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Monthly Piutang */}
        <div id="cust-detail-piutang-card" className="bg-white border-2 border-slate-800 rounded-2xl p-5 space-y-2 shadow-[3px_3px_0px_#1E293B]">
          <p className="text-xs font-mono font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-rose-500 rounded-full border border-slate-800 block" /> Piutang Bulan Ini
          </p>
          <p className="text-2xl font-extrabold font-mono text-rose-600 tabular-nums">{formatRupiah(summary.piutang)}</p>
          {summary.piutang > 0 ? (
            <button 
              id="cust-detail-settle-month-btn"
              onClick={() => {
                handleOpenSettleMonth();
                registerTrigger("cust-detail-settle-month-btn", "click");
              }}
              className="btn-arcade text-[10px] font-mono font-bold uppercase bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg mt-1 block cursor-pointer"
            >
              Setor Pelunasan Bulan Ini &rarr;
            </button>
          ) : (
            <p className="text-[11px] font-mono font-bold text-emerald-700 mt-1 flex items-center gap-1">
              <CheckCircle2 size={13} /> Lunas sepenuhnya
            </p>
          )}
        </div>

        {/* Card 2: Monthly Paid */}
        <div className="bg-white border-2 border-slate-800 rounded-2xl p-5 space-y-2 shadow-[3px_3px_0px_#1E293B]">
          <p className="text-xs font-mono font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-slate-900 rounded-full border border-slate-800 block" /> Terbayar Bulan Ini
          </p>
          <p className="text-2xl font-extrabold font-mono text-slate-900 tabular-nums">{formatRupiah(summary.lunas)}</p>
          <p className="text-[10px] font-mono text-slate-500 mt-1">Uang tunai kasir masuk</p>
        </div>

        {/* Card 3: Omzet Breakdown (LM vs BR) */}
        <div className="bg-white border-2 border-slate-800 rounded-2xl p-5 space-y-2 shadow-[3px_3px_0px_#1E293B]">
          <p className="text-xs font-mono font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-[#CCFF00] rounded-full border border-slate-800 block" /> Omzet Lunas
          </p>
          <p className="text-xs font-mono font-bold text-slate-900 tabular-nums mt-2">
            LM: {formatRupiah(summary.omzet_lm)}
          </p>
          <p className="text-xs font-mono font-bold text-slate-900 tabular-nums">
            BR: {formatRupiah(summary.omzet_br)}
          </p>
        </div>

        {/* Card 4: Monthly Laba */}
        <div className="bg-white border-2 border-slate-800 rounded-2xl p-5 space-y-2 shadow-[3px_3px_0px_#1E293B]">
          <p className="text-xs font-mono font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full border border-slate-800 block" /> Laba Bersih
          </p>
          <p className="text-2xl font-extrabold font-mono text-emerald-800 tabular-nums">{formatRupiah(summary.laba_total)}</p>
          <p className="text-[10px] font-mono text-slate-500 mt-1">Laba real setelah HPP</p>
        </div>
      </div>

      {/* Export Report Actions Card */}
      <div className="bg-white rounded-2xl p-4 border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B] flex flex-wrap gap-3">
        <button 
          id="cust-detail-print-transactions-btn"
          onClick={() => handlePrint(`Laporan Transaksi - ${customer.nama}`, "all")}
          className="btn-arcade flex items-center gap-1.5 px-4 py-2 border-2 border-slate-800 rounded-xl hover:bg-slate-50 text-xs font-mono font-bold uppercase text-slate-900 transition-all cursor-pointer shadow-[2px_2px_0px_#1E293B]"
        >
          <Printer size={15} /> Cetak Rekap Transaksi (PDF)
        </button>

        <button 
          id="cust-detail-print-piutang-btn"
          onClick={() => {
            handlePrint(`Surat Tagihan Piutang - ${customer.nama}`, "piutang");
            registerTrigger("cust-detail-print-piutang-btn", "click");
          }}
          className="btn-arcade flex items-center gap-1.5 px-4 py-2 border-2 border-slate-800 bg-rose-50 hover:bg-rose-100 rounded-xl text-xs font-mono font-bold uppercase text-rose-900 transition-all cursor-pointer shadow-[2px_2px_0px_#1E293B]"
        >
          <Printer size={15} /> Cetak Surat Piutang (PDF)
        </button>

        <button 
          onClick={handleExportCSV}
          className="btn-arcade flex items-center gap-1.5 px-4 py-2 border-2 border-slate-800 bg-slate-50 hover:bg-slate-100 text-xs font-mono font-bold uppercase text-slate-900 transition-all cursor-pointer shadow-[2px_2px_0px_#1E293B]"
        >
          <Download size={15} /> Unduh CSV Riwayat
        </button>
      </div>

      {/* Transaction List Card (Zona Mesin) */}
      <div className="bg-white rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-base font-extrabold text-slate-900 font-display uppercase">
            Daftar Nota Bulan {getMonthLabel(selectedMonth)}
          </h3>
          <span className="text-xs font-mono font-bold text-slate-500">
            TOTAL: {filteredMonthTx.length} NOTA
          </span>
        </div>

        <div className="overflow-x-auto">
          {filteredMonthTx.length === 0 ? (
            <div className="text-center py-8 text-slate-400 font-mono text-xs">Tidak ada transaksi di bulan ini.</div>
          ) : (
            <table className="w-full text-left border-collapse border border-slate-800 bg-white rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-800 text-[11px] font-mono text-slate-700 font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">NO. BON</th>
                  <th className="py-3 px-3">TANGGAL</th>
                  <th className="py-3 px-3 text-right">OMZET</th>
                  <th className="py-3 px-3 text-right">ONGKIR</th>
                  <th className="py-3 px-3 text-right">TOTAL</th>
                  <th className="py-3 px-3 text-center">STATUS</th>
                  <th className="py-3 px-3 text-center">TGL BAYAR</th>
                  <th className="py-3 px-3 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs font-mono text-slate-900">
                {filteredMonthTx.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">
                      <span>{t.nomor_bon}</span>
                      {t.is_bonus && (
                        <span className="ml-1.5 bg-[#CCFF00] border border-slate-800 text-slate-900 text-[9px] px-1.5 py-0.2 rounded font-bold uppercase">Bonus</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{t.tanggal}</td>
                    <td className="py-3 px-3 text-right font-bold tabular-nums">{formatRupiah(t.omzet_total)}</td>
                    <td className="py-3 px-3 text-right text-slate-500 tabular-nums">{formatRupiah(t.ongkir)}</td>
                    <td className="py-3 px-3 text-right font-extrabold tabular-nums text-slate-900">{formatRupiah(t.amount_owed)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 border-2 rounded font-mono text-[10px] font-bold uppercase shadow-[1px_1px_0px_#1E293B] ${
                        t.status === 'Lunas' 
                          ? 'border-slate-800 bg-[#CCFF00] text-slate-900' 
                          : 'border-rose-600 bg-rose-100 text-rose-800'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-500">{t.tanggal_lunas || "-"}</td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {t.status === "Piutang" ? (
                          <button 
                            id={`cust-detail-settle-btn-${t.id}`}
                            onClick={() => {
                              handleOpenSettleSingle(t.id);
                              registerTrigger(`cust-detail-settle-btn-${t.id}`, "click");
                            }}
                            className="btn-arcade bg-[#CCFF00] hover:bg-[#b3e600] border border-slate-800 text-slate-900 text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                          >
                            Setor Lunas
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[10px] font-mono">Selesai</span>
                        )}
                        <button 
                          id={`cust-detail-edit-btn-${t.id}`}
                          onClick={() => {
                            setEditTransactionId(t.id);
                            setView("transaction-form");
                            registerTrigger(`cust-detail-edit-btn-${t.id}`, "click");
                          }}
                          className="text-[11px] font-mono font-bold text-slate-900 hover:underline cursor-pointer"
                        >
                          Ubah
                        </button>
                        <button 
                          onClick={() => setDeleteTxId(t.id)}
                          className="text-[11px] font-mono font-bold text-rose-600 hover:underline cursor-pointer"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Settle Modal (Pop-Art Glass) */}
      {isSettleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-white border-2 border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-[8px_8px_0px_#1E293B] relative">
            <button 
              onClick={() => setIsSettleModalOpen(false)}
              className="absolute right-5 top-5 p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              <X size={20} />
            </button>

            <h2 className="text-base font-extrabold mb-1 flex items-center gap-1.5 text-slate-900 font-display uppercase">
              <CreditCard size={18} /> Setor Pelunasan
            </h2>
            <p className="text-slate-600 text-xs font-sans mb-4">
              {settleType === "single" 
                ? "Simpan pelunasan nota ini ke kas." 
                : `Simpan pelunasan semua nota outstanding bulan ${getMonthLabel(selectedMonth)}.`}
            </p>

            <form onSubmit={handleConfirmSettle} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase">Tanggal Pelunasan *</label>
                <input 
                  type="date" 
                  id="settle-date-input"
                  value={tanggalLunas} 
                  onChange={(e) => setTanggalLunas(e.target.value)}
                  className="w-full h-11 bg-slate-50 border-2 border-slate-800 rounded-xl px-3 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#CCFF00] outline-none transition-all"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsSettleModalOpen(false)}
                  className="btn-arcade flex-1 border-2 border-slate-800 bg-white text-slate-700 font-mono font-bold text-xs uppercase h-11 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  id="settle-confirm-btn"
                  className="btn-arcade flex-1 bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] font-mono font-bold text-xs uppercase h-11 rounded-xl transition-colors cursor-pointer"
                >
                  Konfirmasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteTxId !== null}
        title="Hapus Transaksi"
        message="Apakah Anda yakin ingin menghapus bon ini secara permanen? Tindakan ini tidak dapat dibatalkan."
        onConfirm={async () => {
          try {
            await api.deleteTransaction(deleteTxId);
            setDeleteTxId(null);
            await loadData();
          } catch (err) {
            alert(err.message || "Gagal menghapus transaksi.");
          }
        }}
        onCancel={() => setDeleteTxId(null)}
        confirmLabel="YA, HAPUS"
        cancelLabel="BATAL"
      />

      {/* Asset Loan Modal */}
      {customer && (
        <AssetLoanModal
          customer={customer}
          isOpen={isAssetModalOpen}
          initialMode={assetModalMode}
          onClose={() => setIsAssetModalOpen(false)}
          onSuccess={async () => {
            await loadData();
          }}
        />
      )}
    </div>
  );
}
