"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, Users, Package, AlertCircle, ArrowRight, ChevronRight, Gift, 
  TrendingUp, DollarSign, FileText, Flame, Trophy, Lock, Sparkles, 
  ShieldAlert, X, AlertTriangle, ArrowUpRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';
import { api } from '../utils/api';
import { useTutorial } from '../components/TutorialEngine';
import { BentoSkeleton, TableSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import ParanoiaMarketingAlert from '../components/ParanoiaMarketingAlert';
import FomoPaywallCard from '../components/FomoPaywallCard';
import { supabase } from '../lib/supabase/client';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

export default function Dashboard({ setView, setSelectedCustomerId }) {
  const router = useRouter();
  const { registerTrigger } = useTutorial();
  const [stats, setStats] = useState({ piutang: 0, omzet: 0, laba: 0, count: 0 });
  const [allTransactions, setAllTransactions] = useState([]);
  const [recentTx, setRecentTx] = useState([]);
  const [bonusAlerts, setBonusAlerts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerOmzets, setCustomerOmzets] = useState({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Tier Gating & Psychological Triggers State
  const [userPlan, setUserPlan] = useState('FREE'); // 'FREE' | 'STARTER' | 'PLUS' | 'PRO'
  const [showFomoModal, setShowFomoModal] = useState(false);
  const [closingDiscrepancy, setClosingDiscrepancy] = useState(null);
  
  // Realtime & Header UI State
  const [currentDate, setCurrentDate] = useState('');
  const [shopName, setShopName] = useState('Memuat...');
  
  const containerRef = React.useRef();

  useGSAP(() => {
    if (loading || !containerRef.current) return;
    
    // Stagger stats cards
    const statCards = containerRef.current.querySelectorAll('.gsap-stat-card');
    if (statCards.length > 0) {
      gsap.from(statCards, {
        y: 30,
        opacity: 0,
        stagger: 0.1,
        duration: 0.6,
        ease: 'power2.out',
        delay: 0.1
      });
    }

    // Stagger recent tx rows on scroll
    const txContainer = containerRef.current.querySelector('.gsap-tx-container');
    const txRows = containerRef.current.querySelectorAll('.gsap-tx-row');
    if (txContainer && txRows.length > 0) {
      gsap.from(txRows, {
        scrollTrigger: {
          trigger: txContainer,
          start: 'top 85%',
        },
        y: 15,
        opacity: 0,
        stagger: 0.08,
        duration: 0.5,
        ease: 'power2.out'
      });
    }
  }, { scope: containerRef, dependencies: [loading, allTransactions.length] });

  useEffect(() => {
    const handleShopUpdate = (e) => {
      if (e.detail?.name) setShopName(e.detail.name);
    };
    const handlePlanUpdate = (e) => {
      if (e.detail?.plan) setUserPlan(e.detail.plan);
    };
    window.addEventListener('hl-shop-changed', handleShopUpdate);
    window.addEventListener('hl-plan-changed', handlePlanUpdate);
    return () => {
      window.removeEventListener('hl-shop-changed', handleShopUpdate);
      window.removeEventListener('hl-plan-changed', handlePlanUpdate);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    async function loadData(isBackground = false) {
      try {
        const [transactions, customersData, alerts, billingData] = await Promise.all([
          api.getTransactions(),
          api.getCustomers(),
          api.getBonusAlerts(),
          api.getBilling().catch(() => null)
        ]);
        
        if (!isMounted) return;

        setAllTransactions(transactions || []);
        setCustomers(customersData || []);

        // Initialize Header Data
        if (isMounted) {
          const date = new Date().toLocaleDateString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric'
          }).toUpperCase();
          setCurrentDate(date);
          
          try {
            const shopProfile = await api.getShopProfile();
            if (shopProfile?.name) {
              setShopName(shopProfile.name);
            } else {
              const savedName = typeof window !== 'undefined' ? localStorage.getItem('hl_current_shop_name') : null;
              setShopName(savedName || 'Toko Utama');
            }
          } catch (e) {
            const savedName = typeof window !== 'undefined' ? localStorage.getItem('hl_current_shop_name') : null;
            setShopName(savedName || 'Toko Utama');
          }
        }

        // Read active subscription plan
        const sessionUser = api.getCurrentSession();
        const planFromBilling = billingData?.plan || billingData?.subscription?.plan || billingData?.tier;
        const planFromSession = sessionUser?.plan || sessionUser?.subscription_plan;
        const activePlan = (planFromBilling || planFromSession || shopProfile?.subscription_tier || 'MAGANG').toUpperCase();
        setUserPlan(activePlan);

        // Check shift closing discrepancy from localStorage
        if (typeof window !== 'undefined') {
          try {
            const savedDiscrepancy = localStorage.getItem('hl_shift_discrepancy') || localStorage.getItem('hl_last_closing_selisih');
            if (savedDiscrepancy !== null) {
              setClosingDiscrepancy(Number(savedDiscrepancy));
            } else {
              const lastClosingRaw = localStorage.getItem('hl_last_shift_closing');
              if (lastClosingRaw) {
                const parsed = JSON.parse(lastClosingRaw);
                if (typeof parsed.selisih === 'number') {
                  setClosingDiscrepancy(parsed.selisih);
                }
              }
            }
          } catch (e) {
            console.warn("Error reading shift discrepancy:", e);
          }
        }

        // Sum overall stats & detailed metrics
        let piutang = 0;
        let omzet = 0;
        let laba = 0;
        let activeCount = 0;
        let voidCount = 0;
        let unpaidCount = 0;

        (transactions || []).forEach(t => {
          if (t.status === "Void") {
            voidCount++;
          } else {
            activeCount++;
            if (t.status === "Piutang") {
              piutang += Number(t.amount_owed || 0);
              unpaidCount++;
            } else if (t.status === "Lunas") {
              omzet += Number(t.omzet_total || 0);
              laba += Number(t.laba_total || 0);
            }
          }
        });

        setStats({ piutang, omzet, laba, count: activeCount, voidCount, unpaidCount });

        // Calculate total lunas omzet per customer
        const omzets = {};
        (transactions || []).forEach(t => {
          if (t.status === "Lunas") {
            omzets[t.customer_id] = (omzets[t.customer_id] || 0) + Number(t.omzet_total || 0);
          }
        });
        setCustomerOmzets(omzets);

        // Recent 5 transactions
        const sorted = [...(transactions || [])].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
        setRecentTx(sorted.slice(0, 5));

        setBonusAlerts(alerts || []);
      } catch (err) {
        console.error("Gagal mengambil data dashboard:", err);
        if (!isBackground) setFetchError(err.message || 'Gagal memuat data');
      } finally {
        if (!isBackground) setLoading(false);
      }
    }
    
    // Initial Load
    loadData();

    // REAL-TIME AUTO POLLING EVERY 5 SECONDS
    const intervalId = setInterval(() => {
      loadData(true); // background fetch, no loading spinner
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  // Heatmap Jam Sibuk Data
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0, omzet: 0 }));
    allTransactions.forEach(t => {
      if (t.created_at || t.tanggal) {
        const dateObj = t.created_at ? new Date(t.created_at) : new Date(t.tanggal);
        if (!isNaN(dateObj.getTime())) {
          const hour = dateObj.getHours();
          hours[hour].count += 1;
          hours[hour].omzet += Number(t.omzet_total || t.amount_owed || 0);
        }
      }
    });
    return hours;
  }, [allTransactions]);

  const maxHourlyCount = Math.max(1, ...hourlyData.map(h => h.count));

  // Top 10 Produk Terlaris Data
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

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val || 0);
  };

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

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 animate-fade-in">
        <div className="p-6 bg-white border-2 border-black shadow-[4px_4px_0px_#000000] text-black">
          <AlertTriangle size={36} />
        </div>
        <h2 className="text-xl font-bold font-mono text-black uppercase">Gagal Memuat Data</h2>
        <p className="text-sm font-mono text-zinc-600 max-w-sm text-center">{fetchError}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-[#CCFF00] text-black border-2 border-black shadow-[2px_2px_0px_#000000] px-6 py-2 font-mono font-bold text-xs uppercase"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <motion.div 
      ref={containerRef}
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.3 }}
      className="space-y-6 pb-32 bg-transparent"
    >
      {/* ─── 1. HEADER DASHBOARD UTAMA ─── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-2 mb-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-slate-400 tracking-widest mb-1 uppercase">
            <span className="w-2.5 h-2.5 bg-[#CCFF00] rounded-full inline-block shadow-[0_0_8px_#CCFF00]" />
            RUANG AUDIT — {currentDate}
          </div>
          <h1 className="text-4xl sm:text-5xl font-black font-display tracking-tight flex items-center gap-2">
            <span className="text-slate-900">Dashboard</span>
            <span className="text-slate-200" style={{ WebkitTextStroke: '1px #cbd5e1' }}>Utama</span>
          </h1>
        </div>
        
        <div className="bg-white border border-slate-200 px-4 py-2 rounded-full shadow-sm flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-500">AREA:</span>
          <span className="font-bold text-slate-900">{shopName}</span>
        </div>
      </div>

      {/* ─── 2. PARANOIA AUDIT ALERT (Pindah ke Atas) ─── */}
      <ParanoiaMarketingAlert closingDiscrepancy={closingDiscrepancy} />

      {/* ─── 3. TOP METRIC CARDS ─── */}
      <div id="tour-dashboard-stats" className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Metric 1: Keuntungan Bersih */}
        <div className="gsap-stat-card bg-[#fafff5] border border-lime-200/90 rounded-[26px] p-6 space-y-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-mono font-extrabold text-slate-400 uppercase tracking-wider leading-relaxed">
              KEUNTUNGAN BERSIH (TRANSAKSI LUNAS)
            </span>
            <span className="w-2.5 h-2.5 bg-[#CCFF00] rounded-full border border-slate-700 shrink-0 mt-0.5" />
          </div>
          <div>
            <p className="text-3xl sm:text-[34px] font-black font-display text-slate-900 tracking-tight leading-none">
              {formatRupiah(stats.laba)}
            </p>
            <p className="text-xs font-mono font-bold text-slate-400 mt-2">
              {stats.count} transaksi aktif • {stats.voidCount} void
            </p>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-[#CCFF00] h-full rounded-full" style={{ width: '100%' }} />
          </div>
          <button 
            onClick={() => setView('reporting')}
            className="w-full py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold text-slate-800 transition-colors shadow-sm flex items-center justify-center gap-1 cursor-pointer"
          >
            LIHAT LAPORAN ▸
          </button>
        </div>

        {/* Metric 2: Total Piutang */}
        <div className="gsap-stat-card bg-white border border-slate-200/90 rounded-[26px] p-6 space-y-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-mono font-extrabold text-slate-400 uppercase tracking-wider leading-relaxed">
              TOTAL PIUTANG (BUKU KASBON)
            </span>
            <span className="w-2.5 h-2.5 bg-[#CCFF00] rounded-full border border-slate-700 shrink-0 mt-0.5" />
          </div>
          <div>
            <p className="text-3xl sm:text-[34px] font-black font-display text-slate-900 tracking-tight leading-none">
              {formatRupiah(stats.piutang)}
            </p>
            <p className="text-xs font-mono font-bold text-slate-400 mt-2">
              {stats.unpaidCount} nota belum lunas
            </p>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-slate-900 h-full rounded-full transition-all duration-500" 
              style={{ width: stats.omzet > 0 ? `${Math.min(100, Math.round((stats.piutang / (stats.omzet + stats.piutang)) * 100))}%` : "10%" }} 
            />
          </div>
          <button 
            onClick={() => setView('customers')}
            className="w-full py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold text-slate-800 transition-colors shadow-sm flex items-center justify-center gap-1 cursor-pointer"
          >
            AUDIT PELANGGAN ▸
          </button>
        </div>

        {/* Metric 3: Penjualan Lunas */}
        <div className="gsap-stat-card bg-white border border-slate-200/90 rounded-[26px] p-6 space-y-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-mono font-extrabold text-slate-400 uppercase tracking-wider leading-relaxed">
              PENJUALAN LUNAS (CASH IN)
            </span>
            <span className="w-2.5 h-2.5 bg-[#CCFF00] rounded-full border border-slate-700 shrink-0 mt-0.5" />
          </div>
          <div>
            <p className="text-3xl sm:text-[34px] font-black font-display text-slate-900 tracking-tight leading-none">
              {formatRupiah(stats.omzet)}
            </p>
            <p className="text-xs font-mono font-bold text-slate-400 mt-2">
              Kas masuk tercatat sistem
            </p>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 h-full rounded-full" style={{ width: "85%" }} />
          </div>
          <button 
            onClick={() => setView('reporting')}
            className="w-full py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold text-slate-800 transition-colors shadow-sm flex items-center justify-center gap-1 cursor-pointer"
          >
            LIHAT LAPORAN ▸
          </button>
        </div>
      </div>

      {/* QUICK COMMAND BAR (Zona Mesin) */}
      <div className="bg-white rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase font-display">OPERASIONAL KASIR &amp; STOK</h2>
            <p className="text-xs font-mono text-slate-500">PILIH MENU CEPAT UNTUK MEMULAI AKTIVITAS HARIAN</p>
          </div>
          <span className="self-start sm:self-auto text-[11px] font-mono font-bold bg-slate-900 text-[#CCFF00] px-3 py-1 rounded-md border border-slate-800">
            AUTOPILOT READY
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <button
            onClick={() => router.push('/pos')}
            className="btn-arcade flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-[#CCFF00] text-slate-900 border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] transition-all cursor-pointer text-left group min-h-[64px]"
          >
            <div className="w-10 h-10 bg-slate-900 text-[#CCFF00] border-2 border-slate-800 rounded-lg flex items-center justify-center font-black font-mono shrink-0 shadow-[2px_2px_0px_#1E293B]">
              01
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-tight text-slate-900">Kasir POS</p>
              <p className="text-xs font-mono text-slate-600">Scan &amp; Cetak Bon Struk</p>
            </div>
          </button>

          <button
            onClick={() => setView("customers")}
            className="btn-arcade flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-[#CCFF00] text-slate-900 border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] transition-all cursor-pointer text-left group min-h-[64px]"
          >
            <div className="w-10 h-10 bg-slate-900 text-[#CCFF00] border-2 border-slate-800 rounded-lg flex items-center justify-center font-black font-mono shrink-0 shadow-[2px_2px_0px_#1E293B]">
              02
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-tight text-slate-900">Kasbon Pelanggan</p>
              <p className="text-xs font-mono text-slate-600">Rekap Piutang &amp; Tagih WA</p>
            </div>
          </button>

          <button
            onClick={() => setView("products")}
            className="btn-arcade flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-[#CCFF00] text-slate-900 border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] transition-all cursor-pointer text-left group min-h-[64px]"
          >
            <div className="w-10 h-10 bg-slate-900 text-[#CCFF00] border-2 border-slate-800 rounded-lg flex items-center justify-center font-black font-mono shrink-0 shadow-[2px_2px_0px_#1E293B]">
              03
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-tight text-slate-900">Inventori &amp; Modal</p>
              <p className="text-xs font-mono text-slate-600">Katalog Barang &amp; HPP</p>
            </div>
          </button>
        </div>
      </div>

      {/* PROTOCOL SECURITY ALERT (Frosted Glass with Refraction) */}
      <div className="bg-white/70 backdrop-blur-xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[#CCFF00] text-slate-900 border-2 border-slate-800 rounded-xl shadow-[2px_2px_0px_#1E293B] shrink-0">
            <AlertTriangle size={24} />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase bg-slate-900 text-white px-2 py-0.5 rounded tracking-wider">
              PROTOKOL KEAMANAN DATA
            </span>
            <h3 className="font-extrabold text-base uppercase text-slate-900 font-display">
              Sistem Sinkronisasi Autopilot Berjalan
            </h3>
            <p className="text-xs font-sans text-slate-600 max-w-xl leading-relaxed">
              Seluruh rekap penjualan, mutasi stok barang, dan audit kasir diamankan dengan enkripsi cloud multi-cabang.
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push('/billing')}
          className="btn-arcade bg-slate-900 text-[#CCFF00] hover:bg-[#CCFF00] hover:text-slate-900 border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] px-6 py-3 font-mono font-bold text-xs uppercase rounded-xl transition-all shrink-0 cursor-pointer"
        >
          KELOLA KONTRAK &rarr;
        </button>
      </div>

      {/* Bonus Alerts Panel */}
      {bonusAlerts.length > 0 && (
        <div id="tour-bonus-alerts" className="space-y-3">
          <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2">
            <Gift className="text-slate-900" size={16} /> REWARD BONUS PELANGGAN
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bonusAlerts.map(({ customer, available }) => (
              <div 
                key={customer.id} 
                className="bg-white rounded-2xl border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B] p-4 flex items-center justify-between"
              >
                <div className="space-y-1">
                  <p className="font-black text-slate-900 text-sm uppercase">{customer.nama}</p>
                  <p className="text-xs font-mono text-slate-600">
                    Klaim Bonus: <span className="bg-[#CCFF00] border border-slate-800 text-slate-900 px-1.5 py-0.5 font-bold font-mono rounded">{available} Box</span>
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedCustomerId(customer.id);
                    setView("customer-detail");
                  }} 
                  className="btn-arcade bg-slate-900 text-white hover:bg-[#CCFF00] hover:text-slate-900 border-2 border-slate-800 font-mono text-xs font-bold px-3.5 py-2 rounded-lg transition-all cursor-pointer"
                >
                  PROFIL &rarr;
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upsell Trap / Radar Kasir Card */}
      <FomoPaywallCard userPlan={userPlan} />

      {/* 2-COLUMN ANALYTICS & INSIGHTS: HEATMAP & TOP PRODUCTS (Zona Mesin) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Heatmap Jam Sibuk */}
        <div className="bg-white rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] p-6 space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-base font-black uppercase text-slate-900 font-display flex items-center gap-2">
                <Flame size={18} className="text-orange-500" /> Heatmap Jam Sibuk
              </h2>
              <p className="text-xs font-mono text-slate-500">DISTRIBUSI TRANSAKSI 24 JAM</p>
            </div>
            <button 
              onClick={() => setView("reporting")} 
              className="text-xs font-mono font-bold text-slate-900 hover:underline"
            >
              DETAIL &rarr;
            </button>
          </div>

          {/* Heatmap Mechanical Columns */}
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 pt-2">
            {hourlyData.map(h => {
              const intensity = h.count / maxHourlyCount;
              return (
                <div key={h.hour} className="flex flex-col items-center gap-1">
                  <div className="w-full bg-slate-100 h-24 rounded-lg flex flex-col justify-end p-0.5 relative overflow-hidden border border-slate-800">
                    <div
                      className="w-full bg-gradient-to-t from-[#CCFF00] to-amber-400 border-t border-slate-800 transition-all duration-300 rounded-b-md"
                      style={{ height: `${Math.max(10, Math.round(intensity * 100))}%`, opacity: h.count > 0 ? 1 : 0.2 }}
                    />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-600">{String(h.hour).padStart(2, '0')}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 10 Product Ledger */}
        <div className="bg-white rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] p-6 space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-base font-black uppercase text-slate-900 font-display flex items-center gap-2">
                <Trophy size={18} className="text-amber-500" /> Top Produk Terlaris
              </h2>
              <p className="text-xs font-mono text-slate-500">PERINGKAT BARANG PALING LAKU</p>
            </div>
            <button 
              onClick={() => setView("reporting")} 
              className="text-xs font-mono font-bold text-slate-900 hover:underline"
            >
              SEMUA &rarr;
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-slate-800 bg-white rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-800 font-mono text-[11px] text-slate-700 uppercase tracking-wider">
                  <th className="py-2.5 px-3 font-bold">#</th>
                  <th className="py-2.5 px-3 font-bold">PRODUK</th>
                  <th className="py-2.5 px-3 font-bold text-center">QTY</th>
                  <th className="py-2.5 px-3 font-bold text-right">OMZET</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-xs text-slate-900">
                {topProducts.length > 0 ? (
                  topProducts.slice(0, 5).map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-bold">
                        <span className={`w-5 h-5 inline-flex items-center justify-center text-[10px] font-mono font-bold border border-slate-800 rounded ${
                          idx === 0 ? 'bg-[#CCFF00] text-slate-900' : 'bg-slate-900 text-white'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold truncate max-w-[150px] uppercase font-sans text-xs">{p.name}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{p.totalQty} PCS</td>
                      <td className="py-2.5 px-3 text-right font-bold tabular-nums font-mono">{formatRupiah(p.totalOmzet)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center py-6 font-mono text-slate-500 text-xs">Belum ada data transaksi.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RECENT INVOICES & TARGET BONUS (Zona Mesin) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices Ledger */}
        <div className="lg:col-span-2 bg-white rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-base font-black uppercase text-slate-900 font-display">Nota Penjualan Terbaru</h2>
              <p className="text-xs font-mono text-slate-500">5 TRANSAKSI TERAKHIR DARI KASIR</p>
            </div>
            <button 
              onClick={() => router.push('/transactions')}
              className="btn-arcade bg-[#CCFF00] text-slate-900 border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] px-3.5 py-1.5 font-mono text-xs font-bold uppercase rounded-lg hover:bg-slate-900 hover:text-white transition-all cursor-pointer"
            >
              LOG STRUK &rarr;
            </button>
          </div>

          <div className="overflow-x-auto">
            {recentTx.length === 0 ? (
              <EmptyState 
                icon={FileText}
                title="Belum Ada Transaksi"
                message="Belum ada transaksi kasir yang dicatat hari ini."
                actionLabel="Buka Kasir"
                onAction={handleCreateBonClick}
              />
            ) : (
              <table className="w-full text-left border-collapse border border-slate-800 bg-white rounded-xl overflow-hidden gsap-tx-container">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-800 font-mono text-[11px] text-slate-700 uppercase tracking-wider">
                    <th className="py-2.5 px-3 font-bold">NO. BON</th>
                    <th className="py-2.5 px-3 font-bold">PELANGGAN</th>
                    <th className="py-2.5 px-3 font-bold">TANGGAL</th>
                    <th className="py-2.5 px-3 font-bold text-right">TOTAL</th>
                    <th className="py-2.5 px-3 font-bold text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-xs text-slate-900">
                  {recentTx.map((tx) => {
                    const cust = customers.find(c => c.id === tx.customer_id);
                    return (
                      <tr 
                        key={tx.id} 
                        onClick={() => router.push(`/transactions/${tx.id}`)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors group gsap-tx-row"
                      >
                        <td className="py-3 px-3 font-bold group-hover:underline font-mono">{tx.nomor_bon}</td>
                        <td className="py-3 px-3 uppercase font-sans font-medium">{cust ? cust.nama : "Umum"}</td>
                        <td className="py-3 px-3 text-slate-600 font-mono">{tx.tanggal}</td>
                        <td className="py-3 px-3 text-right font-bold tabular-nums font-mono">{formatRupiah(tx.amount_owed)}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-block px-2.5 py-0.5 font-mono text-[10px] font-bold border border-slate-800 uppercase rounded ${
                            tx.status === 'Lunas' 
                              ? 'bg-slate-900 text-white' 
                              : 'bg-[#CCFF00] text-slate-900'
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

        {/* Target Bonus Threshold & Quick Nav */}
        <div className="space-y-6">
          {/* Target Bonus Box */}
          <div className="bg-white rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] p-6 space-y-4">
            <h2 className="text-base font-black uppercase text-slate-900 font-display flex items-center gap-2 border-b border-slate-200 pb-3">
              <DollarSign size={18} className="text-slate-900" /> Target Bonus
            </h2>
            <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
              {customers.filter(c => c.bonus_threshold > 0).length === 0 ? (
                <div className="text-center py-4 font-mono text-slate-500 text-xs">Tidak ada target bonus aktif.</div>
              ) : (
                customers.filter(c => c.bonus_threshold > 0).map(c => {
                  const currentOmzet = customerOmzets[c.id] || 0;
                  const pct = Math.min((currentOmzet / c.bonus_threshold) * 100, 100);
                  const isEligible = pct >= 100;
                  return (
                    <div key={c.id} className="space-y-1.5 border-b border-slate-200 pb-3 last:border-b-0 last:pb-0">
                      <div className="flex justify-between text-xs font-mono font-bold text-slate-900 uppercase">
                        <span>{c.nama}</span>
                        <span>{Math.round(pct)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden border border-slate-800">
                        <div className={`h-full transition-all duration-500 ${isEligible ? 'bg-slate-900' : 'bg-[#CCFF00]'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-500">
                        <span>{formatRupiah(currentOmzet)}</span>
                        <span>TARGET: {formatRupiah(c.bonus_threshold)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Nav Links */}
          <div className="bg-white rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] p-6 space-y-3">
            <h2 className="text-base font-black uppercase text-slate-900 font-display border-b border-slate-200 pb-2">
              Menu Cepat
            </h2>
            <div className="space-y-2">
              <button 
                onClick={() => setView("customers")} 
                className="btn-arcade w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-900 border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] text-xs font-mono font-bold uppercase rounded-xl transition-all cursor-pointer"
              >
                <span>DATABASE PELANGGAN</span>
                <ArrowUpRight size={16} />
              </button>
              <button 
                onClick={() => setView("products")} 
                className="btn-arcade w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-900 border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] text-xs font-mono font-bold uppercase rounded-xl transition-all cursor-pointer"
              >
                <span>KATALOG &amp; HPP MODAL</span>
                <ArrowUpRight size={16} />
              </button>
              <button 
                onClick={() => setView("help")} 
                className="btn-arcade w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-900 border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] text-xs font-mono font-bold uppercase rounded-xl transition-all cursor-pointer"
              >
                <span>PANDUAN &amp; BANTUAN</span>
                <ArrowUpRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={handleCreateBonClick}
        className="btn-arcade fixed bottom-8 right-8 z-40 bg-[#CCFF00] text-slate-900 border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] px-6 py-4 font-mono font-black text-sm uppercase flex items-center gap-2 hover:bg-slate-900 hover:text-[#CCFF00] transition-all cursor-pointer rounded-2xl"
        title="Buat Bon Baru"
      >
        <Plus size={20} />
        <span>BON BARU</span>
      </button>
    </motion.div>
  );
}
