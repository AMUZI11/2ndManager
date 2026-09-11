import React, { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { Package, Lock, ShieldAlert, CheckCircle2, Search } from 'lucide-react';
import Link from 'next/link';

export default function StokOpname() {
  const [session, setSession] = useState(null);
  const [products, setProducts] = useState([]);
  const [counts, setCounts] = useState({});
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const currentSession = api.getCurrentSession();
    setSession(currentSession);
    
    async function fetchData() {
      try {
        const prods = await api.getProducts();
        setProducts(prods);
        const initialCounts = {};
        prods.forEach(p => {
          initialCounts[p.id] = p.stok || 0;
        });
        setCounts(initialCounts);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleIncrement = (id) => {
    setCounts(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const handleDecrement = (id) => {
    setCounts(prev => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) - 1) }));
  };

  if (isLoading) {
    return <div className="p-8 text-center text-charcoal-medium font-bold">Memuat Stok Opname...</div>;
  }

  // Check paywall condition: default to locked if no session, or if tier is FREE/STARTER
  // Assuming subscription_tier might not exist on old sessions, default to 'FREE'
  const subscriptionTier = session?.subscription_tier || 'FREE';
  const isLocked = subscriptionTier === 'FREE' || subscriptionTier === 'STARTER';

  const filteredProducts = products.filter(p => p.nama.toLowerCase().includes(search.toLowerCase()) || p.kode.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 animate-slide-in relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary font-heading tracking-tight flex items-center gap-3">
            <Package className="text-[#8C2818]" size={32} />
            Stok Opname (Mode Cepat)
          </h1>
          <p className="text-amber-900/70 font-semibold mt-1">Hitung dan sesuaikan fisik stok barang di toko dengan cepat.</p>
        </div>
      </div>

      <div className="relative">
        {/* Search Bar (behind paywall if locked, but still part of UI) */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 mb-6">
          <Search className="text-gray-400" size={24} />
          <input 
            type="text" 
            placeholder="Cari nama atau kode produk..." 
            className="flex-1 text-lg outline-none font-semibold text-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={isLocked}
          />
        </div>

        {isLocked && (
          <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[8px] rounded-3xl flex flex-col items-center justify-center border border-amber-200/50 p-6 min-h-[500px]">
            <div className="bg-gradient-to-b from-amber-50 to-orange-100 p-8 rounded-3xl shadow-2xl border border-amber-200 max-w-md w-full text-center hover-card-effect">
              <div className="w-20 h-20 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/30">
                <Lock className="text-white" size={40} />
              </div>
              <h2 className="text-2xl font-black text-amber-900 mb-3">Fitur Terkunci</h2>
              <p className="text-amber-800/80 font-semibold mb-6">
                Stok Opname Cepat hanya tersedia untuk pengguna <strong>Paket PLUS</strong> ke atas. Tingkatkan paket Anda untuk membuka fitur ini.
              </p>
              <ul className="text-left space-y-3 mb-8">
                <li className="flex items-center gap-3 text-amber-900 font-bold">
                  <CheckCircle2 className="text-emerald-500" size={20} />
                  Tombol Plus/Minus Raksasa (Tactile UI)
                </li>
                <li className="flex items-center gap-3 text-amber-900 font-bold">
                  <CheckCircle2 className="text-emerald-500" size={20} />
                  Perhitungan Stok Lebih Cepat & Akurat
                </li>
                <li className="flex items-center gap-3 text-amber-900 font-bold">
                  <CheckCircle2 className="text-emerald-500" size={20} />
                  Sangat Ramah Pengguna Senior
                </li>
              </ul>
              <button className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-lg py-4 rounded-xl shadow-lg shadow-orange-500/30 hover:scale-105 transition-transform active:scale-95">
                UPGRADE KE PLUS SEKARANG
              </button>
            </div>
          </div>
        )}

        <div className={`space-y-4 ${isLocked ? 'pointer-events-none opacity-40 blur-[2px]' : ''}`}>
          {filteredProducts.map((p) => (
            <div key={p.id} className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all hover:border-gray-200">
              <div className="flex-1 w-full text-left">
                <h3 className="text-xl md:text-2xl font-black text-primary">{p.nama}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm font-bold bg-gray-100 text-charcoal-medium px-3 py-1 rounded-xl">{p.kode}</span>
                  <span className="text-sm font-semibold text-gray-500">Stok Sistem: {p.stok || 0}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4 md:gap-6 bg-gray-50 p-2 md:p-3 rounded-[2rem] border border-gray-100">
                <button 
                  onClick={() => handleDecrement(p.id)}
                  disabled={isLocked}
                  className="h-16 w-16 md:h-20 md:w-20 rounded-2xl md:rounded-3xl bg-gray-200 text-charcoal-dark font-black text-4xl md:text-5xl flex items-center justify-center hover:bg-gray-300 active:scale-95 transition-all shadow-inner"
                >
                  -
                </button>
                <div className="w-20 md:w-24 text-center">
                  <span className="tabular-nums text-4xl md:text-5xl font-black text-primary">{counts[p.id]}</span>
                </div>
                <button 
                  onClick={() => handleIncrement(p.id)}
                  disabled={isLocked}
                  className="h-16 w-16 md:h-20 md:w-20 rounded-2xl md:rounded-3xl bg-[#8C2818] text-white font-black text-4xl md:text-5xl flex items-center justify-center hover:bg-[#6e1e12] active:scale-95 transition-all shadow-lg shadow-[#8C2818]/30"
                >
                  +
                </button>
              </div>
            </div>
          ))}

          {filteredProducts.length === 0 && !isLoading && (
            <div className="text-center p-12 bg-gray-50 rounded-3xl border border-dashed border-gray-300">
              <Package size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-xl font-bold text-charcoal-medium">Belum ada produk untuk opname.</p>
            </div>
          )}
        </div>
      </div>
      
      {!isLocked && filteredProducts.length > 0 && (
        <div className="sticky bottom-24 lg:bottom-8 mt-8 flex justify-end z-20">
           <button className="bg-[#8C2818] hover:bg-[#6e1e12] text-white px-8 py-4 md:py-5 rounded-2xl md:rounded-3xl font-black text-lg md:text-xl shadow-xl shadow-[#8C2818]/30 hover:-translate-y-1 transition-all flex items-center gap-3 active:scale-95">
             <ShieldAlert size={28} />
             SIMPAN HASIL OPNAME
           </button>
        </div>
      )}
    </div>
  );
}
