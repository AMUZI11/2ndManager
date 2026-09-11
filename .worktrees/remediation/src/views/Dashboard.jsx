"use client";
import React, { useState, useEffect } from 'react';
import { formatRupiah } from '@/utils/format';
import { useRouter } from 'next/navigation';
import { Plus, Users, Package, AlertCircle, ArrowRight, ChevronRight, Gift, TrendingUp, DollarSign, FileText } from 'lucide-react';
import { api } from '../utils/api';
import { useTutorial } from '../components/TutorialEngine';
import { BentoSkeleton, TableSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';

export default function Dashboard({ setView, setSelectedCustomerId }) {
  const router = useRouter();
  const { registerTrigger } = useTutorial();
  const [stats, setStats] = useState({ piutang: 0, omzet: 0, laba: 0, count: 0 });
  const [recentTx, setRecentTx] = useState([]);
  const [bonusAlerts, setBonusAlerts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerOmzets, setCustomerOmzets] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [transactions, customersData, alerts] = await Promise.all([
          api.getTransactions({ page_size: 9999 }),
          api.getCustomers({ page_size: 9999 }),
          api.getBonusAlerts()
        ]);
        
        setCustomers(customersData);

        // Sum overall stats
        const piutang = transactions
          .filter(t => t.status === "Piutang")
          .reduce((sum, t) => sum + Number(t.amount_owed || 0), 0);

        const omzet = transactions
          .filter(t => t.status === "Lunas")
          .reduce((sum, t) => sum + Number(t.omzet_total || 0), 0);

        const laba = transactions
          .filter(t => t.status === "Lunas")
          .reduce((sum, t) => sum + Number(t.laba_total || 0), 0);

        setStats({ piutang, omzet, laba, count: transactions.length });

        // Calculate total lunas omzet per customer
        const omzets = {};
        transactions.forEach(t => {
          if (t.status === "Lunas") {
            omzets[t.customer_id] = (omzets[t.customer_id] || 0) + Number(t.omzet_total || 0);
          }
        });
        setCustomerOmzets(omzets);

        // Recent 3 transactions
        const sorted = [...transactions].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
        setRecentTx(sorted.slice(0, 3));

        setBonusAlerts(alerts);
      } catch (err) {
        console.error("Gagal mengambil data dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleCreateBonClick = () => {
    registerTrigger("tour-nav-bon-baru", "click");
    setView("transaction-form");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <BentoSkeleton />
        <TableSkeleton rows={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Welcome Banner */}
      <div className="bg-[#3D1A0F] border border-[#4E271B] text-white rounded-[2rem] p-6 shadow-sm relative overflow-hidden">
        <div className="relative z-10 space-y-1.5 max-w-xl">
          <h1 className="text-display text-white text-xl md:text-2xl">Selamat Bekerja, Bapak/Ibu!</h1>
          <p className="text-white/80 text-xs">Aplikasi pencatatan penjualan HL Manager Pro siap membantu Anda memantau kas, diskon bertingkat, dan tagihan piutang tanpa ribet.</p>
        </div>
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center justify-center pr-8 pointer-events-none">
          <TrendingUp size={120} />
        </div>
      </div>

      {/* Bento Grid: Stats Cards */}
      <div id="tour-dashboard-stats" className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Stat 1: Piutang (Double-Bezel Card) */}
        <div className="bg-rose-50/50 ring-1 ring-rose-100 p-1.5 rounded-[2rem] shadow-sm">
          <div className="bg-white border border-rose-100/50 rounded-[calc(2rem-0.375rem)] p-5 flex flex-col justify-between h-full">
            <div>
              <p className="text-rose-600 font-bold text-xs tracking-wider uppercase flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-600" /> TOTAL PIUTANG (Belum Bayar)
              </p>
              <p className="text-2xl font-extrabold tracking-tight mt-1 text-primary font-mono tabular-nums">{formatRupiah(stats.piutang)}</p>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-rose-600 font-bold">
              <span>Uang di luar yang harus ditagih</span>
              <button onClick={() => setView("customers")} className="underline hover:text-rose-700 flex items-center gap-1 cursor-pointer">Cek Daftar &rarr;</button>
            </div>
          </div>
        </div>

        {/* Stat 2: Omzet Lunas (Double-Bezel Card) */}
        <div className="bg-emerald-50/50 ring-1 ring-emerald-100 p-1.5 rounded-[2rem] shadow-sm">
          <div className="bg-white border border-emerald-100/50 rounded-[calc(2rem-0.375rem)] p-5 flex flex-col justify-between h-full">
            <div>
              <p className="text-emerald-600 font-bold text-xs tracking-wider uppercase flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-600" /> PENJUALAN LUNAS (Bulan Ini)
              </p>
              <p className="text-2xl font-extrabold tracking-tight mt-1 text-primary font-mono tabular-nums">{formatRupiah(stats.omzet)}</p>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-emerald-600 font-bold">
              <span>Dana tunai yang sudah diterima</span>
              <button onClick={() => setView("reporting")} className="underline hover:text-emerald-700 flex items-center gap-1 cursor-pointer">Laporan &rarr;</button>
            </div>
          </div>
        </div>

        {/* Stat 3: Keuntungan Bersih (Double-Bezel Card) */}
        <div className="bg-blue-50/50 ring-1 ring-blue-100 p-1.5 rounded-[2rem] shadow-sm">
          <div className="bg-white border border-blue-100/50 rounded-[calc(2rem-0.375rem)] p-5 flex flex-col justify-between h-full">
            <div>
              <p className="text-blue-600 font-bold text-xs tracking-wider uppercase flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600" /> KEUNTUNGAN BERSIH (Laba Lunas)
              </p>
              <p className="text-2xl font-extrabold tracking-tight mt-1 text-primary font-mono tabular-nums">{formatRupiah(stats.laba)}</p>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-blue-600 font-bold">
              <span>Laba bersih kas dikurangi modal</span>
              <span className="opacity-75">Bebas Pajak</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bonus Alerts Panel */}
      {bonusAlerts.length > 0 && (
        <div id="tour-bonus-alerts" className="space-y-3">
          <h2 className="text-heading text-lg flex items-center gap-2 font-heading">
            <Gift className="text-cta animate-bounce" size={20} /> Pengingat Bonus Pelanggan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bonusAlerts.map(({ customer, available }) => (
              <div 
                key={customer.id} 
                className="bg-amber-50/80 border border-amber-100 rounded-3xl p-5 shadow-sm flex items-center justify-between transition-all duration-300 hover:shadow-md"
              >
                <div className="space-y-1">
                  <p className="font-extrabold text-primary text-base">{customer.nama}</p>
                  <p className="text-xs text-cta font-bold">
                    Berhak mendapat <span className="bg-cta text-white px-2 py-0.5 rounded-full text-xs font-black">{available} Box</span> gratis!
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedCustomerId(customer.id);
                    setView("customer-detail");
                  }} 
                  className="bg-primary hover:bg-primary/90 text-white text-xs font-bold px-4 py-2.5 rounded-full transition-all flex items-center gap-1 cursor-pointer"
                >
                  Buka Profil <ChevronRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Asymmetrical Bento Section: Recent Transactions & Threshold Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bento Column 1 & 2: Recent Transactions */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-150/40 p-6 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.015)]">
          <div className="flex justify-between items-center">
            <h2 className="text-heading text-lg font-heading">Nota Penjualan Terbaru</h2>
            <button onClick={() => setView("reporting")} className="text-xs text-primary font-bold hover:underline">Lihat Semua Laporan</button>
          </div>

          <div className="overflow-x-auto">
            {recentTx.length === 0 ? (
              <EmptyState 
                icon={FileText}
                title="Belum Ada Bon Penjualan"
                message="Bapak/Ibu belum mencatat bon penjualan apa pun untuk saat ini."
                actionLabel="Buat Bon Baru"
                onAction={handleCreateBonClick}
              />
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E8DCC8] text-xs text-[#6B4F3A] uppercase font-bold">
                    <th className="pb-2">No. Bon</th>
                    <th className="pb-2">Pelanggan</th>
                    <th className="pb-2">Tanggal</th>
                    <th className="pb-2 text-right">Total Tagihan</th>
                    <th className="pb-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {recentTx.map((tx) => {
                    const cust = customers.find(c => c.id === tx.customer_id);
                    return (
                      <tr 
                        key={tx.id} 
                        onClick={() => router.push(`/transactions/${tx.id}`)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                      >
                        <td className="py-4 font-bold text-primary group-hover:text-cta">{tx.nomor_bon}</td>
                        <td className="py-4 text-primary/80 font-medium">{cust ? cust.nama : "Umum"}</td>
                        <td className="py-4 text-gray-500 font-medium">{tx.tanggal}</td>
                        <td className="py-4 text-right font-bold text-primary font-mono tabular-nums">{formatRupiah(tx.amount_owed)}</td>
                        <td className="py-4 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-black ${
                            tx.status === 'Lunas' 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-rose-100 text-rose-700'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Bento Column 3: Threshold Progress & Menu Cepat */}
        <div className="space-y-6">
          {/* Target Bonus Threshold Progress */}
          <div className="bg-white rounded-3xl border border-gray-150/40 p-6 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.015)]">
            <h2 className="text-heading text-lg font-heading flex items-center gap-2">
              <DollarSign size={18} className="text-cta" /> Target Bonus Pelanggan
            </h2>
            <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
              {customers.filter(c => c.bonus_threshold > 0).length === 0 ? (
                <div className="text-center py-4 text-gray-400 text-xs font-medium">Tidak ada target bonus aktif.</div>
              ) : (
                customers.filter(c => c.bonus_threshold > 0).map(c => {
                  const currentOmzet = customerOmzets[c.id] || 0;
                  const pct = Math.min((currentOmzet / c.bonus_threshold) * 100, 100);
                  const isEligible = pct >= 100;
                  return (
                    <div key={c.id} className="space-y-2 border-b border-gray-50 pb-3 last:border-b-0 last:pb-0">
                      <div className="flex justify-between text-xs font-bold text-primary">
                        <span>{c.nama}</span>
                        <span className="font-mono">{Math.round(pct)}%</span>
                      </div>
                      <div className="w-full bg-gray-150/50 h-2.5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${isEligible ? 'bg-emerald-500 animate-pulse' : 'bg-cta'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-gray-400">
                        <span>Omzet: {formatRupiah(currentOmzet)}</span>
                        <span>Target: {formatRupiah(c.bonus_threshold)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Navigation Menu */}
          <div className="bg-white rounded-3xl border border-gray-150/40 p-6 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.015)]">
            <h2 className="text-heading text-lg font-heading">Menu Cepat</h2>
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => setView("customers")} 
                className="flex items-center gap-3 p-3 bg-gray-50/50 hover:bg-primary hover:text-white border border-gray-100 rounded-2xl transition-all text-left group"
              >
                <div className="p-3 bg-primary/5 text-primary group-hover:bg-white/10 group-hover:text-white rounded-xl transition-all">
                  <Users size={18} />
                </div>
                <div>
                  <p className="font-bold text-sm text-primary group-hover:text-white transition-all">Pelanggan</p>
                  <p className="text-xs text-gray-500 group-hover:text-white/70 transition-all">Diskon bertingkat & bonus</p>
                </div>
              </button>

              <button 
                onClick={() => setView("products")} 
                className="flex items-center gap-3 p-3 bg-gray-50/50 hover:bg-primary hover:text-white border border-gray-100 rounded-2xl transition-all text-left group"
              >
                <div className="p-3 bg-primary/5 text-primary group-hover:bg-white/10 group-hover:text-white rounded-xl transition-all">
                  <Package size={18} />
                </div>
                <div>
                  <p className="font-bold text-sm text-primary group-hover:text-white transition-all">Katalog Produk</p>
                  <p className="text-xs text-gray-500 group-hover:text-white/70 transition-all">Barang jual & harga modal</p>
                </div>
              </button>

              <button 
                onClick={() => setView("help")} 
                className="flex items-center gap-3 p-3 bg-gray-50/50 hover:bg-primary hover:text-white border border-gray-100 rounded-2xl transition-all text-left group"
              >
                <div className="p-3 bg-primary/5 text-primary group-hover:bg-white/10 group-hover:text-white rounded-xl transition-all">
                  <AlertCircle size={18} />
                </div>
                <div>
                  <p className="font-bold text-sm text-primary group-hover:text-white transition-all">Bantuan & FAQ</p>
                  <p className="text-xs text-gray-500 group-hover:text-white/70 transition-all">Glosarium & ulangi latihan</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button (Mobile spotlight targets bottom bar, desktop has this helper) */}
      <button
        onClick={handleCreateBonClick}
        className="fixed bottom-24 right-6 lg:bottom-8 lg:right-8 z-40 bg-cta hover:bg-cta/90 text-primary p-4 rounded-full shadow-2xl hidden lg:flex items-center gap-2 font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer"
        title="Buat Bon Baru"
      >
        <Plus size={24} />
        <span className="pr-1 text-sm hidden md:inline">BON BARU</span>
      </button>
    </div>
  );
}
