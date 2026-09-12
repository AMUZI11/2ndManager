"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Printer, ArrowLeft, Loader2, Plus, Receipt, Search, Download } from 'lucide-react';
import { api } from '@/utils/api';

export default function TransactionsList() {
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

        // Sort descending by date & creation time
        const sortedTx = (txData || []).sort((a, b) => 
          new Date(b.tanggal || b.created_at) - new Date(a.tanggal || a.created_at)
        );
        setTransactions(sortedTx);

        // Map customers for quick lookup
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

    // Initial load
    fetchData();

    // REAL-TIME AUTO POLLING EVERY 5 SECONDS (Silent Background Fetch)
    const intervalId = setInterval(() => {
      fetchData(true);
    }, 5000);

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
    const secs = String(d.getSeconds()).padStart(2, '0');
    return `${day} ${month} ${year} ${hours}:${mins}:${secs}`;
  };

  // Calculations for summary stats
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

  // Filtered transactions based on Tab & Search Query
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const statusUpper = (tx.status || 'LUNAS').toUpperCase();
      
      // Tab filter
      if (activeTab === 'LUNAS' && statusUpper !== 'LUNAS') return false;
      if (activeTab === 'PIUTANG' && statusUpper !== 'PIUTANG') return false;
      if (activeTab === 'VOID' && statusUpper !== 'VOID') return false;

      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const bon = (tx.nomor_bon || tx.id || '').toLowerCase();
      const cust = (tx.customers?.nama || customers[tx.customer_id] || 'Umum').toLowerCase();
      const cashier = (tx.operator || tx.cashier_name || 'Kasir').toLowerCase();
      return bon.includes(q) || cust.includes(q) || cashier.includes(q);
    });
  }, [transactions, activeTab, searchQuery, customers]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-slate-900 mb-4" />
        <p className="font-mono font-bold text-slate-800 tracking-wider">MEMUAT LOG TRANSAKSI...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative pb-36 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
      {/* ─── 1. TOP HEADER SECTION ─── */}
      <div className="no-print pt-2 space-y-2">
        <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-slate-500 tracking-widest uppercase">
          <span className="w-2.5 h-2.5 bg-[#CCFF00] rounded-full inline-block shadow-[0_0_8px_#CCFF00] border border-slate-700" />
          LOG TRANSAKSI — CONTINUOUS THERMAL RECEIPT
        </div>
        
        <h1 className="text-4xl sm:text-5xl font-black font-display tracking-tight flex items-center gap-2">
          <span className="text-slate-900">Pita</span>
          <span className="text-slate-200" style={{ WebkitTextStroke: '1px #cbd5e1' }}>Transaksi</span>
        </h1>
      </div>

      {/* ─── 2. FILTER TABS & SEARCH BAR ─── */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* SEMUA */}
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-5 py-2.5 rounded-full text-xs font-mono font-black uppercase transition-all cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-slate-900 text-[#CCFF00] shadow-[2px_2px_0px_#CCFF00] border-2 border-slate-900'
                : 'bg-white/80 hover:bg-white text-slate-800 border border-slate-200 shadow-sm'
            }`}
          >
            SEMUA
          </button>

          {/* LUNAS */}
          <button
            onClick={() => setActiveTab('LUNAS')}
            className={`px-5 py-2.5 rounded-full text-xs font-mono font-black uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'LUNAS'
                ? 'bg-slate-900 text-[#CCFF00] shadow-[2px_2px_0px_#CCFF00] border-2 border-slate-900'
                : 'bg-white/80 hover:bg-white text-slate-800 border border-slate-200 shadow-sm'
            }`}
          >
            LUNAS <span className="opacity-70">{stats.lunasCount}</span>
          </button>

          {/* PIUTANG */}
          <button
            onClick={() => setActiveTab('PIUTANG')}
            className={`px-5 py-2.5 rounded-full text-xs font-mono font-black uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'PIUTANG'
                ? 'bg-slate-900 text-[#CCFF00] shadow-[2px_2px_0px_#CCFF00] border-2 border-slate-900'
                : 'bg-white/80 hover:bg-white text-slate-800 border border-slate-200 shadow-sm'
            }`}
          >
            PIUTANG <span className="opacity-70">{stats.piutangCount}</span>
          </button>

          {/* VOID */}
          <button
            onClick={() => setActiveTab('VOID')}
            className={`px-5 py-2.5 rounded-full text-xs font-mono font-black uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'VOID'
                ? 'bg-slate-900 text-[#CCFF00] shadow-[2px_2px_0px_#CCFF00] border-2 border-slate-900'
                : 'bg-white/80 hover:bg-white text-slate-800 border border-slate-200 shadow-sm'
            }`}
          >
            VOID <span className="opacity-70">{stats.voidCount}</span>
          </button>
        </div>

        {/* Search Pill Input */}
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="CARI KODE / PELANGGAN / KASIR"
            className="w-full h-11 bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-full px-5 text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-mono focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-sm uppercase tracking-wide"
          />
        </div>
      </div>

      {/* ─── 3. SUMMARY METRICS ROW ─── */}
      <div className="no-print flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono font-bold text-slate-500 pt-1 pb-2">
        <div>
          TOTAL NOTA: <span className="text-slate-900 font-black">{stats.totalNota}</span>
        </div>
        <div>
          LUNAS: <span className="text-slate-900 font-black">{formatRupiah(stats.lunasNominal)}</span>
        </div>
        <div>
          PIUTANG: <span className="text-slate-900 font-black">{formatRupiah(stats.piutangNominal)}</span>
        </div>
        <div>
          VOID: <span className="text-rose-600 font-black">{stats.voidCount}</span>
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="bg-rose-50 border-2 border-rose-500 text-rose-900 p-4 rounded-2xl font-bold font-mono text-xs shadow-sm">
          ERROR: {error}
        </div>
      )}

      {/* ─── 4. CONTINUOUS THERMAL RECEIPT LIST ─── */}
      <div className="space-y-5">
        {filteredTransactions.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-[28px] p-12 text-center shadow-sm">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-mono font-bold text-slate-600 text-sm uppercase">[ TIDAK ADA NOTA TRANSAKSI SESUAI FILTER ]</p>
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const rawItems = tx.transaction_items || tx.items || [];
            const isLunas = (tx.status || 'LUNAS').toUpperCase() === 'LUNAS';
            const isPiutang = (tx.status || '').toUpperCase() === 'PIUTANG';
            const isVoid = (tx.status || '').toUpperCase() === 'VOID';
            const customerName = tx.customers?.nama || customers[tx.customer_id] || 'Umum';
            const cashierName = tx.operator || tx.cashier_name || 'AGUS PRASETYO';
            const bonNumber = tx.nomor_bon || tx.id?.slice(0, 12) || 'TRX-000';

            return (
              <div
                key={tx.id}
                onClick={() => router.push(`/transactions/${tx.id}`)}
                className="bg-white/90 backdrop-blur-md rounded-[28px] p-6 sm:p-7 border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-md transition-all cursor-pointer space-y-4 group"
              >
                {/* Header Nota */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-900 font-mono font-black text-base sm:text-lg flex items-center gap-1.5 tracking-tight group-hover:text-amber-600 transition-colors">
                        <span>◆</span> {bonNumber}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
                      {formatDateTime(tx.tanggal || tx.created_at)} • KASIR: {cashierName} • PEL: {customerName}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isLunas && (
                      <span className="inline-block bg-[#CCFF00] text-slate-900 font-mono font-black text-xs px-4 py-1 rounded-full border border-slate-900 uppercase shadow-sm">
                        LUNAS
                      </span>
                    )}
                    {isPiutang && (
                      <span className="inline-block bg-slate-900 text-white font-mono font-black text-xs px-4 py-1 rounded-full border border-slate-900 uppercase shadow-sm">
                        PIUTANG
                      </span>
                    )}
                    {isVoid && (
                      <span className="inline-block bg-rose-500 text-white font-mono font-black text-xs px-4 py-1 rounded-full border border-slate-900 uppercase shadow-sm">
                        VOID
                      </span>
                    )}
                  </div>
                </div>

                {/* Items List with Thermal Receipt Dotted Lines */}
                <div className="space-y-2 pt-2">
                  {rawItems.length > 0 ? (
                    rawItems.map((item, idx) => {
                      const itemName = item.products?.nama || item.product_name || item.product_type_snapshot || 'Item';
                      const itemQty = item.quantity || 1;
                      const itemPrice = item.line_total || item.total_price || (item.harga_jual * itemQty) || 0;

                      return (
                        <div
                          key={idx}
                          className="flex items-baseline justify-between text-xs sm:text-sm font-mono text-slate-800"
                        >
                          <span className="shrink-0 font-medium tracking-wide">
                            {itemQty} PCS {itemName.toUpperCase()}
                          </span>
                          <span className="flex-1 mx-2 border-b-2 border-dotted border-slate-300 self-center" />
                          <span className="shrink-0 font-bold tabular-nums">
                            {formatRupiah(itemPrice)}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex items-baseline justify-between text-xs sm:text-sm font-mono text-slate-800">
                      <span className="shrink-0 font-medium">1 TRANSAKSI POS</span>
                      <span className="flex-1 mx-2 border-b-2 border-dotted border-slate-300 self-center" />
                      <span className="shrink-0 font-bold tabular-nums">
                        {formatRupiah(tx.omzet_total || tx.amount_owed)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Total Line Footer */}
                <div className="pt-2 flex justify-end items-center text-right font-mono">
                  <span className="text-[11px] font-bold text-slate-400 uppercase mr-2 tracking-wider">
                    {isLunas ? 'TOTAL CASH' : isPiutang ? 'TOTAL KASBON' : 'TOTAL VOID'}
                  </span>
                  <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    {formatRupiah(tx.omzet_total || tx.amount_owed)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ─── 5. FLOATING ACTION BUTTON: EKSPOR PDF / CETAK AUDIT ─── */}
      <button
        onClick={handlePrint}
        className="btn-arcade no-print fixed bottom-8 right-8 z-40 bg-[#18181b] hover:bg-black text-white font-mono font-bold text-xs uppercase px-7 py-4 rounded-full shadow-[4px_4px_0px_#CCFF00] border-2 border-black flex items-center gap-2.5 transition-all cursor-pointer active:scale-95"
      >
        <Printer size={16} className="text-[#CCFF00]" />
        <span>EKSPOR PDF / CETAK AUDIT</span>
      </button>

    </div>
  );
}


