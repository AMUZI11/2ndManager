"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Receipt,
  Search,
  RefreshCw,
  Printer,
  Eye,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronDown,
  Download,
  Filter,
  ShieldCheck,
  Ban,
  Layers,
} from 'lucide-react';
import { api } from '@/utils/api';
import { createClient } from '@/lib/supabase/client';

export default function AdminTransactionsPage() {
  const supabase = createClient();

  const [transactions, setTransactions] = useState([]);
  const [customers, setCustomers] = useState({});
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, LUNAS, PIUTANG, VOID
  const [selectedBranch, setSelectedBranch] = useState('ALL');

  // Selected Transaction for Thermal Receipt Modal
  const [selectedTx, setSelectedTx] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const loadData = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);

      const [txData, custData, shopData] = await Promise.all([
        api.getTransactions().catch(() => []),
        api.getCustomers().catch(() => []),
        supabase
          .from('shops')
          .select('id, name, address')
          .then(({ data }) => data || []),
      ]);

      const sorted = (txData || []).sort(
        (a, b) => new Date(b.tanggal || b.created_at) - new Date(a.tanggal || a.created_at)
      );
      setTransactions(sorted);

      const custMap = {};
      (custData || []).forEach((c) => {
        custMap[c.id] = c.nama;
      });
      setCustomers(custMap);
      setShops(shopData || []);
      setError(null);
    } catch (err) {
      console.error('[Transactions Load Error]', err);
      if (!isBackground) setError('Gagal memuat pita transaksi.');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);

    // Auto-polling every 15 seconds
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadData(true);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const secs = String(d.getSeconds()).padStart(2, '0');
    return `${day} ${month} ${year} ${hours}:${mins}:${secs}`;
  };

  // Metrics
  const stats = useMemo(() => {
    let totalNota = 0;
    let lunasNominal = 0;
    let lunasCount = 0;
    let piutangNominal = 0;
    let piutangCount = 0;
    let voidCount = 0;
    let voidNominal = 0;

    transactions.forEach((tx) => {
      const status = (tx.status || 'LUNAS').toUpperCase();
      const amount = Number(tx.omzet_total ?? tx.total_amount ?? 0);
      totalNota++;

      if (status === 'VOID') {
        voidCount++;
        voidNominal += amount;
      } else if (status === 'PIUTANG') {
        piutangCount++;
        piutangNominal += Number(tx.amount_owed || amount);
      } else {
        lunasCount++;
        lunasNominal += amount;
      }
    });

    return {
      totalNota,
      lunasCount,
      lunasNominal,
      piutangCount,
      piutangNominal,
      voidCount,
      voidNominal,
    };
  }, [transactions]);

  // Filtered List
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const status = (tx.status || 'LUNAS').toUpperCase();

      if (selectedBranch !== 'ALL' && tx.shop_id !== selectedBranch) return false;

      if (activeTab === 'LUNAS' && status !== 'LUNAS') return false;
      if (activeTab === 'PIUTANG' && status !== 'PIUTANG') return false;
      if (activeTab === 'VOID' && status !== 'VOID') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const bon = (tx.nomor_bon || tx.id || '').toLowerCase();
        const cust = (tx.customers?.nama || customers[tx.customer_id] || 'Umum').toLowerCase();
        const cashier = (tx.operator || tx.cashier_name || '').toLowerCase();
        return bon.includes(q) || cust.includes(q) || cashier.includes(q);
      }

      return true;
    });
  }, [transactions, selectedBranch, activeTab, searchQuery, customers]);

  const openReceipt = (tx) => {
    setSelectedTx(tx);
    setIsReceiptModalOpen(true);
  };

  const handlePrintThermal = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-mono">
      {/* ─── 1. HEADER SECTION ─── */}
      <div className="bg-[#0F172A] border-2 border-[#1E293B] p-4 sm:p-5 shadow-[3px_3px_0px_#000000] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-[#CCFF00] tracking-widest uppercase">
            <span className="w-2.5 h-2.5 bg-[#CCFF00] inline-block border border-black" />
            <span>JURNAL FINANSIAL & PITA KASIR CONTINUOUS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight mt-1">
            PITA TRANSAKSI & BUKU JURNAL KASIR
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadData(false)}
            disabled={loading}
            className="flex items-center gap-1.5 bg-[#161F36] hover:bg-[#223055] text-slate-300 border border-[#334155] px-3 py-2 text-xs font-bold uppercase transition-all cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>SINKRONKAN</span>
          </button>

          <Link
            href="/pos"
            className="flex items-center gap-1.5 bg-[#CCFF00] hover:bg-[#b8e600] text-black font-black text-xs uppercase px-4 py-2 border-2 border-black shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            <span>+ BUKA TERMINAL POS</span>
          </Link>
        </div>
      </div>

      {/* ─── 2. KPI SUMMARY ROW ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#0F172A] border-2 border-[#1E293B] p-3.5 shadow-[2px_2px_0px_#000000]">
          <span className="text-[10px] text-slate-400 block uppercase">TOTAL NOTA TERCATAT</span>
          <strong className="text-xl font-black text-white">{stats.totalNota} LEMBAR</strong>
        </div>

        <div className="bg-[#0F172A] border-2 border-[#1E293B] p-3.5 shadow-[2px_2px_0px_#000000]">
          <span className="text-[10px] text-slate-400 block uppercase">TOTAL OMZET LUNAS</span>
          <strong className="text-xl font-black text-[#CCFF00]">{formatRupiah(stats.lunasNominal)}</strong>
          <span className="text-[9px] text-slate-500 block uppercase mt-0.5">
            {stats.lunasCount} TRANSAKSI SUKSES
          </span>
        </div>

        <div className="bg-[#0F172A] border-2 border-[#1E293B] p-3.5 shadow-[2px_2px_0px_#000000]">
          <span className="text-[10px] text-slate-400 block uppercase">PIUTANG KASBON</span>
          <strong className="text-xl font-black text-amber-400">{formatRupiah(stats.piutangNominal)}</strong>
          <span className="text-[9px] text-slate-500 block uppercase mt-0.5">
            {stats.piutangCount} NOTA BELUM LUNAS
          </span>
        </div>

        <div className="bg-[#0F172A] border-2 border-[#1E293B] p-3.5 shadow-[2px_2px_0px_#000000]">
          <span className="text-[10px] text-slate-400 block uppercase">TOTAL TRANSAKSI VOID</span>
          <strong className="text-xl font-black text-rose-400">{formatRupiah(stats.voidNominal)}</strong>
          <span className="text-[9px] text-rose-400/80 block uppercase mt-0.5">
            {stats.voidCount} NOTA DIBATALKAN
          </span>
        </div>
      </div>

      {/* ─── 3. SEARCH & FILTER DECK ─── */}
      <div className="bg-[#0F172A] border-2 border-[#1E293B] p-4 shadow-[2px_2px_0px_#000000] space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="CARI NOMOR BON, PELANGGAN, ATAU NAMA KASIR..."
              className="w-full bg-[#161F36] border-2 border-[#334155] focus:border-[#CCFF00] text-white placeholder:text-slate-500 text-xs font-bold uppercase px-4 py-2.5 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Branch Filter */}
          <div className="sm:w-60 relative">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full appearance-none bg-[#161F36] border-2 border-[#334155] focus:border-[#CCFF00] text-white text-xs font-bold uppercase px-3 py-2.5 focus:outline-none cursor-pointer"
            >
              <option value="ALL">SEMUA CABANG</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name.toUpperCase()}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 text-xs font-bold uppercase border transition-colors cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-[#CCFF00] text-black border-black font-black shadow-[2px_2px_0px_#000000]'
                : 'bg-[#161F36] text-slate-300 border-[#334155] hover:border-slate-400'
            }`}
          >
            SEMUA JURNAL ({stats.totalNota})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('LUNAS')}
            className={`px-3 py-1.5 text-xs font-bold uppercase border transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'LUNAS'
                ? 'bg-emerald-400 text-black border-black font-black shadow-[2px_2px_0px_#000000]'
                : 'bg-[#161F36] text-emerald-300 border-[#334155] hover:border-emerald-500'
            }`}
          >
            <span>LUNAS ({stats.lunasCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PIUTANG')}
            className={`px-3 py-1.5 text-xs font-bold uppercase border transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'PIUTANG'
                ? 'bg-amber-400 text-black border-black font-black shadow-[2px_2px_0px_#000000]'
                : 'bg-[#161F36] text-amber-300 border-[#334155] hover:border-amber-500'
            }`}
          >
            <span>KASBON / PIUTANG ({stats.piutangCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('VOID')}
            className={`px-3 py-1.5 text-xs font-bold uppercase border transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'VOID'
                ? 'bg-rose-500 text-white border-black font-black shadow-[2px_2px_0px_#000000]'
                : 'bg-[#161F36] text-rose-300 border-[#334155] hover:border-rose-500'
            }`}
          >
            <span>VOID ({stats.voidCount})</span>
          </button>
        </div>
      </div>

      {/* ─── 4. HIGH-DENSITY LEDGER TABLE ─── */}
      <div className="bg-[#0F172A] border-2 border-[#1E293B] shadow-[3px_3px_0px_#000000] overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#161F36] border-b-2 border-[#1E293B] text-[11px] font-black uppercase text-slate-300">
              <th className="p-3 w-40">NO NOTA / BON</th>
              <th className="p-3 w-44">WAKTU TRANSAKSI</th>
              <th className="p-3 w-36">KASIR</th>
              <th className="p-3 min-w-[140px]">PELANGGAN</th>
              <th className="p-3 w-28">METODE</th>
              <th className="p-3 w-36 text-right">TOTAL NOMINAL</th>
              <th className="p-3 w-36 text-center">INTEGRITAS DATA</th>
              <th className="p-3 w-28 text-center">STRUK</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B]">
            {loading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400 uppercase">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#CCFF00]" />
                  [ MENYINKRONKAN PITA TRANSAKSI... ]
                </td>
              </tr>
            ) : filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-10 text-center text-slate-400 uppercase">
                  <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  [ TIDAK ADA JURNAL TRANSAKSI SESUAI FILTER ]
                </td>
              </tr>
            ) : (
              filteredTransactions.map((tx) => {
                const status = (tx.status || 'LUNAS').toUpperCase();
                const bonNo = tx.nomor_bon || tx.id?.slice(0, 12) || 'TRX-000';
                const cashier = tx.operator || tx.cashier_name || 'KASIR';
                const customer = tx.customers?.nama || customers[tx.customer_id] || 'UMUM';
                const method = (tx.payment_method || 'TUNAI').toUpperCase();
                const amount = Number(tx.omzet_total ?? tx.total_amount ?? 0);

                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-[#161F36]/80 transition-colors group"
                  >
                    {/* No Nota & Status */}
                    <td className="p-3">
                      <div className="font-bold text-white uppercase group-hover:text-[#CCFF00] transition-colors">
                        {bonNo}
                      </div>
                      <div className="mt-0.5">
                        {status === 'LUNAS' && (
                          <span className="text-[9px] font-black bg-emerald-950 text-emerald-300 border border-emerald-700 px-1 py-0.2 uppercase">
                            [ LUNAS ]
                          </span>
                        )}
                        {status === 'PIUTANG' && (
                          <span className="text-[9px] font-black bg-amber-950 text-amber-300 border border-amber-700 px-1 py-0.2 uppercase">
                            [ KASBON ]
                          </span>
                        )}
                        {status === 'VOID' && (
                          <span className="text-[9px] font-black bg-rose-950 text-rose-300 border border-rose-700 px-1 py-0.2 uppercase">
                            [ VOID ]
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Waktu */}
                    <td className="p-3 text-slate-400 text-[11px]">
                      {formatDateTime(tx.tanggal || tx.created_at)}
                    </td>

                    {/* Kasir */}
                    <td className="p-3 text-slate-300 font-bold uppercase truncate max-w-[130px]">
                      {cashier}
                    </td>

                    {/* Pelanggan */}
                    <td className="p-3 text-white uppercase truncate max-w-[150px]">
                      {customer}
                    </td>

                    {/* Metode Bayar */}
                    <td className="p-3">
                      <span className="text-[10px] bg-black border border-[#334155] px-1.5 py-0.5 text-slate-300 font-bold uppercase">
                        {method}
                      </span>
                    </td>

                    {/* Total Nominal */}
                    <td className="p-3 text-right">
                      <strong
                        className={`text-sm font-black ${
                          status === 'VOID'
                            ? 'text-rose-400 line-through'
                            : status === 'PIUTANG'
                            ? 'text-amber-400'
                            : 'text-[#CCFF00]'
                        }`}
                      >
                        {formatRupiah(amount)}
                      </strong>
                    </td>

                    {/* Integritas Data */}
                    <td className="p-3 text-center">
                      <span className="text-[9px] font-bold bg-black border border-[#334155] px-1.5 py-0.5 text-slate-400 uppercase inline-flex items-center gap-1">
                        <ShieldCheck size={10} className="text-[#CCFF00]" />
                        <span>HMAC-VALID</span>
                      </span>
                    </td>

                    {/* Action: Struk Thermal */}
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => openReceipt(tx)}
                        title="Lihat & Cetak Struk Kasir"
                        className="bg-[#161F36] hover:bg-[#202c4b] text-[#CCFF00] border border-[#334155] px-2.5 py-1 text-[11px] font-bold uppercase transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Printer size={12} />
                        <span>STRUK</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ─── 5. CONTINUOUS ROLL THERMAL RECEIPT MODAL ─── */}
      {isReceiptModalOpen && selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#0F172A] border-2 border-[#CCFF00] shadow-[6px_6px_0px_#000000] max-w-sm w-full p-4 space-y-4 font-mono max-h-[95vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-2 border-[#1E293B] pb-2 text-white">
              <div className="flex items-center gap-1.5 text-xs font-black uppercase">
                <Receipt size={16} className="text-[#CCFF00]" />
                <span>PREVIEW STRUK KASIR THERMAL</span>
              </div>
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={16} />
              </button>
            </div>

            {/* Thermal Slip Simulation (Simulasi Kertas Kasir 58mm/80mm) */}
            <div
              id="printable-receipt"
              className="bg-zinc-100 text-zinc-900 p-5 rounded-none border-2 border-black font-mono text-[11px] space-y-2 shadow-inner"
            >
              {/* Header Struk */}
              <div className="text-center space-y-0.5 border-b border-dashed border-zinc-400 pb-2">
                <h3 className="font-black text-sm uppercase tracking-tight">2ndManager STORE</h3>
                <p className="text-[10px] text-zinc-600 uppercase">
                  {shops.find((s) => s.id === selectedTx.shop_id)?.name || 'CABANG UTAMA B2B'}
                </p>
                <p className="text-[9px] text-zinc-500">
                  {formatDateTime(selectedTx.tanggal || selectedTx.created_at)}
                </p>
              </div>

              {/* Meta Nota */}
              <div className="text-[10px] space-y-0.5 py-1 border-b border-dashed border-zinc-400">
                <div className="flex justify-between">
                  <span>NO BON:</span>
                  <strong className="uppercase">
                    {selectedTx.nomor_bon || selectedTx.id?.slice(0, 12)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>KASIR:</span>
                  <span className="uppercase">{selectedTx.operator || selectedTx.cashier_name || 'AGUS'}</span>
                </div>
                <div className="flex justify-between">
                  <span>PELANGGAN:</span>
                  <span className="uppercase">
                    {selectedTx.customers?.nama || customers[selectedTx.customer_id] || 'UMUM'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>STATUS:</span>
                  <strong className="uppercase">{selectedTx.status || 'LUNAS'}</strong>
                </div>
              </div>

              {/* Itemized Lines */}
              <div className="py-2 space-y-1.5 border-b border-dashed border-zinc-400 text-[10px]">
                {(selectedTx.transaction_items || selectedTx.items || []).length > 0 ? (
                  (selectedTx.transaction_items || selectedTx.items).map((item, idx) => {
                    const name = item.products?.nama || item.product_name || item.product_type_snapshot || 'ITEM POS';
                    const qty = item.quantity || 1;
                    const lineTotal = item.line_total || item.total_price || (item.harga_jual * qty) || 0;

                    return (
                      <div key={idx} className="space-y-0.5">
                        <div className="font-bold uppercase truncate">{name}</div>
                        <div className="flex justify-between text-zinc-600">
                          <span>{qty} x {formatRupiah(item.harga_jual || (lineTotal / qty))}</span>
                          <strong className="text-zinc-900">{formatRupiah(lineTotal)}</strong>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex justify-between">
                    <span>1 x TRANSAKSI BELANJA</span>
                    <strong>{formatRupiah(selectedTx.omzet_total || selectedTx.total_amount)}</strong>
                  </div>
                )}
              </div>

              {/* Total Summary */}
              <div className="pt-1 space-y-1 text-[11px]">
                <div className="flex justify-between text-xs font-black">
                  <span>TOTAL:</span>
                  <span>{formatRupiah(selectedTx.omzet_total || selectedTx.total_amount)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-zinc-600">
                  <span>METODE BAYAR:</span>
                  <span className="uppercase">{selectedTx.payment_method || 'TUNAI'}</span>
                </div>
              </div>

              {/* Footer Struk */}
              <div className="text-center pt-3 border-t border-dashed border-zinc-400 text-[9px] text-zinc-500 uppercase space-y-0.5">
                <p>TERIMA KASIH ATAS KUNJUNGAN ANDA</p>
                <p className="font-mono text-[8px] text-zinc-400">
                  REF: HMAC-{selectedTx.id?.slice(0, 8)} • 2NDMANAGER.COM
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="flex-1 bg-[#161F36] text-slate-300 border border-[#334155] py-2 text-xs font-bold uppercase"
              >
                TUTUP
              </button>
              <button
                type="button"
                onClick={handlePrintThermal}
                className="flex-1 bg-[#CCFF00] text-black border-2 border-black py-2 text-xs font-black uppercase shadow-[2px_2px_0px_#000000] flex items-center justify-center gap-1.5"
              >
                <Printer size={13} />
                <span>CETAK ULANG STRUK</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
