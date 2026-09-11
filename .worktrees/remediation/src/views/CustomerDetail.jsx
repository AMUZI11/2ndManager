"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronRight, Calendar, CreditCard, Gift, Printer, CheckCircle2, ChevronLeft, X, Download } from 'lucide-react';
import { api } from '../utils/api';
import ConfirmModal from '../components/ConfirmModal';
import { useTutorial } from '../components/TutorialEngine';
import { exportToCSV } from '../utils/export';

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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const customers = await api.getCustomers();
      const cust = customers.find(c => c.id === customerId);
      setCustomer(cust);

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
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-navy-bright border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-charcoal-medium">Memuat data pelanggan...</p>
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
            <p class="sub">HL Manager Pro • Master Financial Record</p>
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
            Dokumen ini dihasilkan secara otomatis oleh HL Manager Pro. Cetakan sah tanpa tanda tangan fisik.
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
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white rounded-2xl p-6 border border-gray-100 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setView("customers")} 
            className="p-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200/60 rounded-xl text-gray-500 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-hero text-xl">{customer.nama}</h1>
              <div className="flex gap-2">
                <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                  LM: {customer.discounts_lm && customer.discounts_lm.length > 0 ? customer.discounts_lm.map(d => `${d}%`).join(' + ') : '0%'}
                </span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                  BR: {customer.discounts_br && customer.discounts_br.length > 0 ? customer.discounts_br.map(d => `${d}%`).join(' + ') : '0%'}
                </span>
              </div>
            </div>
            <p className="text-gray-500 text-xs mt-1">Status dan riwayat transaksi bulanan lengkap. Target Bonus: {formatRupiah(customer.bonus_threshold)}</p>
          </div>
        </div>

        {/* Month Selector Dropdown */}
        <div className="relative w-full sm:w-auto">
          <select 
            id="cust-detail-month-select"
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              registerTrigger("cust-detail-month-select", "change");
            }}
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

      {/* Monthly Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Monthly Piutang */}
        <div id="cust-detail-piutang-card" className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">🔴 Piutang Bulan Ini</p>
          <p className="text-2xl font-extrabold text-rose-deep tabular-nums">{formatRupiah(summary.piutang)}</p>
          {summary.piutang > 0 ? (
            <button 
              id="cust-detail-settle-month-btn"
              onClick={() => {
                handleOpenSettleMonth();
                registerTrigger("cust-detail-settle-month-btn", "click");
              }}
              className="text-[11px] font-bold text-emerald-deep hover:underline mt-1 block"
            >
              Setor Pelunasan Bulan Ini
            </button>
          ) : (
            <p className="text-[11px] font-semibold text-emerald-deep mt-1 flex items-center gap-1">
              <CheckCircle2 size={12} /> Lunas sepenuhnya
            </p>
          )}
        </div>

        {/* Card 2: Monthly Paid */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">🟢 Terbayar Bulan Ini</p>
          <p className="text-2xl font-extrabold text-emerald-deep tabular-nums">{formatRupiah(summary.lunas)}</p>
          <p className="text-[11px] text-gray-500 mt-1">Uang tunai yang sudah diterima</p>
        </div>

        {/* Card 3: Omzet Breakdown (LM vs BR) */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 space-y-2 lg:col-span-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">📊 Omzet Lunas (LM / BR)</p>
          <p className="text-sm font-bold text-charcoal-medium tabular-nums mt-2">
            LM: {formatRupiah(summary.omzet_lm)}
          </p>
          <p className="text-sm font-bold text-charcoal-medium tabular-nums">
            BR: {formatRupiah(summary.omzet_br)}
          </p>
        </div>

        {/* Card 4: Monthly Laba */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">💜 Laba Bersih Bulan Ini</p>
          <p className="text-2xl font-extrabold text-navy-deep tabular-nums">{formatRupiah(summary.laba_total)}</p>
          <p className="text-[11px] text-gray-500 mt-1">Untung bersih recognized (Lunas)</p>
        </div>
      </div>

      {/* Export Report Actions Card */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-wrap gap-3">
        <button 
          id="cust-detail-print-transactions-btn"
          onClick={() => handlePrint(`Laporan Transaksi - ${customer.nama}`, "all")}
          className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-xs font-bold text-charcoal-medium transition-all cursor-pointer"
        >
          <Printer size={16} /> Cetak Rekap Transaksi (PDF)
        </button>

        <button 
          id="cust-detail-print-piutang-btn"
          onClick={() => {
            handlePrint(`Surat Tagihan Piutang - ${customer.nama}`, "piutang");
            registerTrigger("cust-detail-print-piutang-btn", "click");
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 border border-rose-light bg-rose-light/10 rounded-xl hover:bg-rose-light/20 text-xs font-bold text-rose-deep transition-all cursor-pointer"
        >
          <Printer size={16} /> Cetak Surat Piutang (PDF)
        </button>

        <button 
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-4 py-2.5 border border-amber-soft bg-amber-cream/40 rounded-xl hover:bg-amber-soft/20 text-xs font-bold text-amber-deep transition-all cursor-pointer"
        >
          <Download size={16} /> Unduh CSV Riwayat
        </button>
      </div>

      {/* Transaction List Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h3 className="text-subheading text-base">
          Daftar Nota Bulan <strong>{getMonthLabel(selectedMonth)}</strong>
        </h3>

        <div className="overflow-x-auto">
          {filteredMonthTx.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Tidak ada transaksi di bulan ini.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase font-semibold pb-3">
                  <th className="pb-3">No. Bon</th>
                  <th className="pb-3">Tanggal</th>
                  <th className="pb-3 text-right">Omzet</th>
                  <th className="pb-3 text-right">Ongkir</th>
                  <th className="pb-3 text-right">Total Tagihan</th>
                  <th className="pb-3 text-center">Status</th>
                  <th className="pb-3 text-center">Tanggal Bayar</th>
                  <th className="pb-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {filteredMonthTx.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 font-semibold text-charcoal-black flex items-center gap-1">
                      {t.nomor_bon}
                      {t.is_bonus && (
                        <span className="bg-amber-gold/20 text-amber-deep text-[10px] px-1 rounded font-bold uppercase">Bonus</span>
                      )}
                    </td>
                    <td className="py-3 text-gray-500">{t.tanggal}</td>
                    <td className="py-3 text-right font-semibold tabular-nums">{formatRupiah(t.omzet_total)}</td>
                    <td className="py-3 text-right text-gray-500 tabular-nums">{formatRupiah(t.ongkir)}</td>
                    <td className="py-3 text-right font-bold tabular-nums text-navy-deep">{formatRupiah(t.amount_owed)}</td>
                    <td className="py-3 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                        t.status === 'Lunas' 
                          ? 'bg-emerald-mint text-emerald-deep' 
                          : 'bg-rose-light text-rose-deep'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 text-center text-xs text-gray-500 font-semibold">{t.tanggal_lunas || "-"}</td>
                    <td className="py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {t.status === "Piutang" ? (
                          <button 
                            id={`cust-detail-settle-btn-${t.id}`}
                            onClick={() => {
                              handleOpenSettleSingle(t.id);
                              registerTrigger(`cust-detail-settle-btn-${t.id}`, "click");
                            }}
                            className="bg-emerald-medium hover:bg-emerald-deep text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                          >
                            Setor Lunas
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs font-semibold">Selesai</span>
                        )}
                        <button 
                          id={`cust-detail-edit-btn-${t.id}`}
                          onClick={() => {
                            setEditTransactionId(t.id);
                            setView("transaction-form");
                            registerTrigger(`cust-detail-edit-btn-${t.id}`, "click");
                          }}
                          className="text-xs text-navy-bright hover:underline font-bold"
                        >
                          Ubah
                        </button>
                        <button 
                          onClick={() => setDeleteTxId(t.id)}
                          className="text-xs text-rose-deep hover:underline font-bold cursor-pointer"
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

      {/* Settle Modal */}
      {isSettleModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl p-6 relative">
            <button 
              onClick={() => setIsSettleModalOpen(false)}
              className="absolute right-6 top-6 p-1 text-gray-400 hover:bg-gray-100 rounded-full"
            >
              <X size={20} />
            </button>

            <h2 className="text-heading text-lg mb-2 flex items-center gap-1.5 text-emerald-deep">
              <CreditCard /> Setor Pelunasan
            </h2>
            <p className="text-gray-500 text-xs mb-4">
              {settleType === "single" 
                ? "Simpan pelunasan nota ini ke kas." 
                : `Simpan pelunasan semua nota outstanding bulan ${getMonthLabel(selectedMonth)}.`}
            </p>

            <form onSubmit={handleConfirmSettle} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-charcoal-medium uppercase">Tanggal Pelunasan *</label>
                <input 
                  type="date" 
                  id="settle-date-input"
                  value={tanggalLunas} 
                  onChange={(e) => setTanggalLunas(e.target.value)}
                  className="w-full h-12 bg-gray-50 border-2 border-gray-200 rounded-xl px-4 text-sm focus:border-navy-bright focus:bg-white outline-none transition-all font-semibold"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsSettleModalOpen(false)}
                  className="flex-1 border-2 border-gray-200 text-charcoal-medium font-bold h-12 rounded-xl text-sm hover:bg-gray-50"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  id="settle-confirm-btn"
                  className="flex-1 bg-gradient-to-r from-emerald-medium to-emerald-deep hover:from-emerald-deep hover:to-emerald-medium text-white font-bold h-12 rounded-xl text-sm shadow-md"
                >
                  Konfirmasi Lunas
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
        message="Apakah Bapak/Ibu yakin ingin menghapus bon ini secara permanen? Tindakan ini tidak dapat dibatalkan."
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
    </div>
  );
}
