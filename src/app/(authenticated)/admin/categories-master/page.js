"use client";

import React, { useState, useEffect } from 'react';
import { Layers, Plus, Check, RefreshCw, Send, Sparkles } from 'lucide-react';

export default function CategoriesMasterPage() {
  const [categories, setCategories] = useState([]);
  const [shops, setShops] = useState([]);
  const [selectedShopId, setSelectedShopId] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchCategories();
    fetchShops();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/v1/admin/categories');
      const json = await res.json();
      if (res.ok && json.data?.categories) {
        setCategories(json.data.categories);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchShops = async () => {
    try {
      const res = await fetch('/api/v1/admin/tenants?limit=100');
      const json = await res.json();
      if (res.ok && json.data?.tenants) {
        setShops(json.data.tenants);
        if (json.data.tenants[0]) setSelectedShopId(json.data.tenants[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSeed = async () => {
    if (!selectedShopId) return;
    try {
      setSeeding(true);
      setMessage('');
      const res = await fetch('/api/v1/admin/categories/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_shop_id: selectedShopId }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setMessage(json.data.message || 'Kategori berhasil disuntikkan!');
      }
    } catch (e) {
      console.error(e);
      setMessage('Gagal menyuntikkan kategori.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6 font-sans max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md border-2 border-slate-800 rounded-2xl p-5 shadow-[3px_3px_0_#1E293B] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 bg-[#CCFF00] inline-block rounded-full border border-slate-800" />
            <h2 className="font-heading font-black text-xl text-slate-900 uppercase tracking-tight">
              Master 11 Kategori Retail &amp; Grosir Indonesia
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Standar taksonomi katalog produk FMCG, warung, sembako, dan minimarket
          </p>
        </div>
      </div>

      {/* Seeder Box */}
      <div className="p-5 rounded-2xl bg-white/90 backdrop-blur-md border-2 border-slate-800 shadow-[3px_3px_0_#1E293B] space-y-3">
        <div className="flex items-center space-x-2 text-xs font-mono text-slate-800 font-black">
          <Sparkles size={15} className="text-amber-500" />
          <span>INJEKTOR SEEDER KATEGORI KE PENYEWA</span>
        </div>
        <p className="text-xs text-slate-600">
          Suntikkan secara instan 11 kategori ritel standar ke toko baru tanpa menimpa kategori lama.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <select
            value={selectedShopId}
            onChange={(e) => setSelectedShopId(e.target.value)}
            className="h-10 px-3.5 bg-white border-2 border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none shadow-[1px_1px_0_#1E293B]"
          >
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} (#{s.id.slice(0, 8)})
              </option>
            ))}
          </select>

          <button
            onClick={handleSeed}
            disabled={seeding || !selectedShopId}
            className="h-10 px-4 bg-[#CCFF00] hover:bg-[#b8e600] text-slate-900 font-mono font-black text-xs rounded-xl border-2 border-slate-800 shadow-[2px_2px_0_#1E293B] flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <Send size={13} />
            <span>{seeding ? 'Menyuntikkan...' : 'SUNTIKKAN KE TOKO'}</span>
          </button>

          {message && (
            <span className="text-xs font-mono text-emerald-700 font-bold bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg animate-fade-in">
              ✓ {message}
            </span>
          )}
        </div>
      </div>

      {/* 11 Categories High-Density Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 font-sans">
        {categories.map((cat, idx) => (
          <div
            key={cat.id}
            className="p-4 bg-white/90 backdrop-blur-md border-2 border-slate-800 rounded-2xl shadow-[3px_3px_0_#1E293B] flex items-start space-x-3.5 hover:-translate-y-0.5 transition-all"
          >
            <span className="w-8 h-8 rounded-xl bg-slate-900 text-[#CCFF00] border-2 border-slate-900 font-mono text-xs font-black flex items-center justify-center shrink-0 shadow-sm">
              {idx + 1}
            </span>
            <div className="space-y-1 truncate">
              <div className="flex items-center space-x-2">
                <span className="font-heading font-black text-xs text-slate-900 uppercase">
                  {cat.category_name}
                </span>
                <span className="text-[10px] font-mono text-slate-500 font-bold">
                  [{cat.category_code}]
                </span>
              </div>
              <p className="text-[11px] text-slate-600 font-sans line-clamp-2">
                {cat.description || 'Kategori ritel standar'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
