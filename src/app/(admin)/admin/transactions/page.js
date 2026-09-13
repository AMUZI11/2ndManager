"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Printer, Loader2, Receipt, Search, Download, ArrowUpRight, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { api } from '@/utils/api';

export default function AdminTransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [customers, setCustomers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'LUNAS' | 'PIUTANG' | 'VOID'

  useEffect(() => {
    let isMounted = true;

    async function fetchData(isBackground = false) {
      try {
        const [txData, custData] = await Promise.all([
          api.getTransactions(),
          api.getCustomers()
        ]);
        
        if (!isMounted) return;

        const sortedTx = (txData || []).sort((a, b) => 
          new Date(b.tanggal || b.created_at) - new Date(a.tanggal || a.created_at)
        );
        setTransactions(sortedTx);

        const custMap = {};
        (custData || []).forEach(c => {
          custMap[c.id] = c.nama;
        });
        setCustomers(custMap);
      } catch (err) {
        console.error("Gagal memuat transaksi:", err);
        if (!isBackground) setError("Gagal memuat data transaksi.");
      } finally {
        if (!isBackground) setLoading(false);
      }
    }

    fetchData();
    const intervalId = setInterval(() => {
      fetchData(true);
    }, 6000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(val || 0);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year} ${hours}:${mins}`;
  };

  const stats = useMemo(() => {
    let lunasCount = 0;
    let lunasNominal = 0;
    let piutangCount = 0;
    let piutangNominal = 0;
    let voidCount = 0;

    transactions.forEach(t => {
      const statusUpper = (t.status || 'LUNAS').toUpperCase();
      if (statusUpper === 'VOID') {
        voidCount += 1;
      } else if (statusUpper === 'PIUTANG') {
        piutangCount += 1;
        piutangNominal += Number(t.amount_owed || t.omzet_total || 0);
      } else {
        lunasCount += 1;
        lunasNominal += Number(t.omzet_total || 0);
      }
    });

    return {
      totalNota: transactions.length,
      lunasCount,
      lunasNominal,
      piutangCount,
      piutangNominal,
      voidCount
    };
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const statusUpper = (tx.status || 'LUNAS').toUpperCase();

      if (activeTab === 'LUNAS' && statusUpper !== 'LUNAS') return false;
      if (activeTab === 'PIUTANG' && statusUpper !== 'PIUTANG') return false;
      if (activeTab === 'VOID' && statusUpper !== 'VOID') return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const customerName = (tx.customers?.nama || customers[tx.customer_id] || '').toLowerCase();
      const bonNumber = (tx.nomor_bon || tx.id || '').toLowerCase();
      const cashierName = (tx.operator || tx.cashier_name || '').toLowerCase();

      return customerName.includes(q) || bonNumber.includes(q) || cashierName.includes(q);
    });
  }, [transactions, activeTab, searchQuery, customers]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3 font-mono">
        <Loader2 className="w-8 h-8 animate-spin text-slate-800" />
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
          [ MEMUAT AUDIT TRANSAKSI POS... ]
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 font-sans">
      {/* ─── 1. HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b-2 border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-slate-500 tracking-widest mb-1.5 uppercase">
            <span className="w-2.5 h-2.5 bg-[#CCFF00] rounded-full inline-block border border-slate-800" />
            AUDIT BUKU BESAR TRANSAKSI
          </div>
          <h1 className="text-3xl sm:text-4xl font-black font-display text-slate-900 tracking-tight uppercase">
            Monitor Transaksi Kasir
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
            Riwayat lengkap penjualan, status pembayaran tempo/kasbon, dan deteksi pembatalan (void).
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="h-10 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 border-2 border-slate-800 shadow-[2px_2px_0px_0px_#1e293b] flex items-center space-x-2 text-xs font-mono font-bold transition-all cursor-pointer"
        >
          <Printer size={14} />
          <span>CETAK LAPORAN</span>
        </button>
      </div>

      {/* ─── 2. BENTO METRICS SUMMARY ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_0px_#1e293b] p-4 space-y-1">
          <span className="text-[10px] font-mono font-extrabold text-slate-500 uppercase">TOTAL NOTA</span>
          <p className="text-2xl font-black font-mono text-slate-900">{stats.totalNota}</p>
          <span className="text-[10px] font-mono font-bold text-slate-500">Semua transaksi</span>
        </div>

        <div className="bg-white rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_0px_#1e293b] p-4 space-y-1">
          <span className="text-[10px] font-mono font-extrabold text-slate-500 uppercase">TOTAL LUNAS</span>
          <p className="text-2xl font-black font-mono text-slate-900">{formatRupiah(stats.lunasNominal)}</p>
          <span className="text-[10px] font-mono font-bold text-emerald-600 font-bold">{stats.lunasCount} nota beres</span>
        </div>

        <div className="bg-white rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_0px_#1e293b] p-4 space-y-1">
          <span className="text-[10px] font-mono font-extrabold text-slate-500 uppercase">PIUTANG KASBON</span>
          <p className="text-2xl font-black font-mono text-amber-700">{formatRupiah(stats.piutangNominal)}</p>
          <span className="text-[10px] font-mono font-bold text-amber-600 font-bold">{stats.piutangCount} belum lunas</span>
        </div>

        <div className="bg-white rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_0px_#1e293b] p-4 space-y-1">
          <span className="text-[10px] font-mono font-extrabold text-slate-500 uppercase">TRANSAKSI VOID</span>
          <p className="text-2xl font-black font-mono text-rose-600">{stats.voidCount}</p>
          <span className="text-[10px] font-mono font-bold text-rose-600 font-bold">Dibatalkan</span>
        </div>
      </div>

      {/* ─── 3. FILTER TABS & SEARCH BAR ─── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Tab Group */}
        <div className="flex items-center gap-1.5 p-1 bg-white border-2 border-slate-800 rounded-2xl shadow-[2px_2px_0px_0px_#1e293b] overflow-x-auto">
          {[
            { id: 'ALL', label: 'SEMUA', count: stats.totalNota },
            { id: 'LUNAS', label: 'LUNAS', count: stats.lunasCount },
            { id: 'PIUTANG', label: 'KASBON', count: stats.piutangCount },
            { id: 'VOID', label: 'VOID', count: stats.voidCount },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-black transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-[#CCFF00] shadow-[2px_2px_0_#1E293B] border-2 border-slate-900'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {tab.label} <span className="opacity-75 text-[10px]">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="CARI NOTA / PELANGGAN / KASIR..."
            className="w-full h-10 pl-9 pr-4 bg-white border-2 border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none shadow-[2px_2px_0px_0px_#1e293b] uppercase"
          />
        </div>
      </div>

      {/* ─── 4. LIST NOTA TRANSAKSI ─── */}
      <div className="space-y-4">
        {filteredTransactions.length === 0 ? (
          <div className="bg-white border-2 border-slate-800 rounded-2xl p-12 text-center shadow-[4px_4px_0px_0px_#1e293b]">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-mono font-black text-slate-600 text-sm uppercase">[ TIDAK ADA NOTA TRANSAKSI SESUAI FILTER ]</p>
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const rawItems = tx.transaction_items || tx.items || [];
            const isLunas = (tx.status || 'LUNAS').toUpperCase() === 'LUNAS';
            const isPiutang = (tx.status || '').toUpperCase() === 'PIUTANG';
            const isVoid = (tx.status || '').toUpperCase() === 'VOID';
            const customerName = tx.customers?.nama || customers[tx.customer_id] || 'Pelanggan Umum';
            const cashierName = tx.operator || tx.cashier_name || 'Kasir';
            const bonNumber = tx.nomor_bon || tx.id?.slice(0, 10) || 'TRX-000';

            return (
              <div
                key={tx.id}
                className="bg-white rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_0px_#1e293b] hover:-translate-y-0.5 transition-all p-5 sm:p-6 space-y-3.5"
              >
                {/* Header Nota */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-900 font-mono font-black text-base flex items-center gap-1.5 tracking-tight">
                        <span className="text-slate-400">◆</span> {bonNumber}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono font-semibold text-slate-500 uppercase">
                      {formatDateTime(tx.tanggal || tx.created_at)} • KASIR: <strong className="text-slate-800">{cashierName}</strong> • PELANGGAN: <strong className="text-slate-800">{customerName}</strong>
                    </p>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isLunas && (
                      <span className="inline-block bg-lime-200 text-slate-900 font-mono font-black text-xs px-3.5 py-1 rounded-full border border-slate-800 uppercase shadow-sm">
                        LUNAS
                      </span>
                    )}
                    {isPiutang && (
                      <span className="inline-block bg-amber-200 text-slate-900 font-mono font-black text-xs px-3.5 py-1 rounded-full border border-slate-800 uppercase shadow-sm">
                        KASBON
                      </span>
                    )}
                    {isVoid && (
                      <span className="inline-block bg-rose-200 text-rose-950 font-mono font-black text-xs px-3.5 py-1 rounded-full border border-slate-800 uppercase shadow-sm">
                        VOID
                      </span>
                    )}
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-1.5 pt-1">
                  {rawItems.length > 0 ? (
                    rawItems.map((item, idx) => {
                      const itemName = item.products?.nama || item.product_name || item.product_type_snapshot || 'Item';
                      const itemQty = item.quantity || 1;
                      const itemPrice = item.line_total || item.total_price || (item.harga_jual * itemQty) || 0;

                      return (
                        <div
                          key={idx}
                          className="flex items-baseline justify-between text-xs font-mono text-slate-700"
                        >
                          <span className="shrink-0 font-medium">
                            {itemQty} PCS {itemName.toUpperCase()}
                          </span>
                          <span className="flex-1 mx-2 border-b-2 border-dotted border-slate-300 self-center" />
                          <span className="shrink-0 font-bold tabular-nums text-slate-900">
                            {formatRupiah(itemPrice)}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex items-baseline justify-between text-xs font-mono text-slate-700">
                      <span className="shrink-0 font-medium">1 TRANSAKSI PENJUALAN</span>
                      <span className="flex-1 mx-2 border-b-2 border-dotted border-slate-300 self-center" />
                      <span className="shrink-0 font-bold tabular-nums text-slate-900">
                        {formatRupiah(tx.omzet_total || tx.amount_owed)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Total Line Footer */}
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-right font-mono">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    METODE: {tx.metode_pembayaran || 'TUNAI'}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">TOTAL:</span>
                    <span className="text-lg font-black text-slate-900 tracking-tight">
                      {formatRupiah(tx.omzet_total || tx.amount_owed)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
