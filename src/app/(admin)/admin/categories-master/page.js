"use client";

import React, { useState, useEffect } from 'react';
import { Layers, Plus, Check, RefreshCw, Send, Sparkles, CheckCircle2, Store } from 'lucide-react';

export default function CategoriesMasterPage() {
  const [categories, setCategories] = useState([]);
  const [shops, setShops] = useState([]);
  const [selectedShopId, setSelectedShopId] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

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
      setIsError(false);
      const res = await fetch('/api/v1/admin/categories/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_shop_id: selectedShopId }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setMessage(json.data.message || 'Kategori ritel berhasil disuntikkan ke toko!');
      } else {
        setIsError(true);
        setMessage(json.error?.message || 'Gagal menyuntikkan kategori.');
      }
    } catch (e) {
      console.error(e);
      setIsError(true);
      setMessage('Gagal menyuntikkan kategori ke penyewa.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6 font-sans max-w-7xl mx-auto pb-12">
      {/* Header Bento Card */}
      <div className="bg-white border-2 border-slate-800 rounded-2xl p-6 shadow-[4px_4px_0px_0px_#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-[#CCFF00] border-2 border-slate-800 rounded-xl shadow-[2px_2px_0px_0px_#1e293b]">
              <Layers className="w-5 h-5 text-slate-900" />
            </span>
            <h1 className="font-display font-black text-2xl text-slate-900 tracking-tight">
              Master 11 Kategori Ritel &amp; Grosir
            </h1>
          </div>
          <p className="text-slate-600 text-sm font-medium">
            Standar taksonomi katalog produk FMCG, warung kelontong, sembako, dan minimarket Indonesia.
          </p>
        </div>
      </div>

      {/* Seeder Box Bento Card */}
      <div className="bg-white border-2 border-slate-800 rounded-2xl p-6 shadow-[4px_4px_0px_0px_#1e293b] space-y-4">
        <div className="flex items-center space-x-2 text-xs font-mono font-black text-slate-900 uppercase">
          <span className="p-1.5 bg-[#CCFF00] border border-slate-800 rounded-lg">
            <Sparkles size={14} />
          </span>
          <span>Injektor Seeder Kategori ke Toko / Penyewa</span>
        </div>
        <p className="text-xs text-slate-600 font-medium">
          Suntikkan secara instan 11 kategori ritel standar ke toko baru tanpa menimpa kategori unik yang telah dibuat sebelumnya.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <div className="flex items-center space-x-2">
            <Store size={16} className="text-slate-500" />
            <select
              value={selectedShopId}
              onChange={(e) => setSelectedShopId(e.target.value)}
              className="bg-white border-2 border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold shadow-[2px_2px_0px_0px_#1e293b] focus:outline-none focus:ring-2 focus:ring-[#CCFF00]"
            >
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (#{s.id.slice(0, 8)})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSeed}
            disabled={seeding || !selectedShopId}
            className="px-4 py-2 bg-[#CCFF00] border-2 border-slate-800 rounded-xl text-slate-900 font-mono font-black text-xs shadow-[3px_3px_0px_0px_#1e293b] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <Send size={13} />
            <span>{seeding ? 'MENYUNTIKKAN...' : 'SUNTIKKAN KE TOKO'}</span>
          </button>
        </div>

        {message && (
          <div className={`p-3 rounded-xl border-2 border-slate-800 text-xs font-mono font-bold flex items-center space-x-2 shadow-[2px_2px_0px_0px_#1e293b] ${
            isError ? 'bg-rose-100 text-rose-800' : 'bg-lime-100 text-slate-900'
          }`}>
            <CheckCircle2 size={16} className={isError ? 'text-rose-600' : 'text-emerald-700'} />
            <span>{message}</span>
          </div>
        )}
      </div>

      {/* 11 Categories High-Density Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-sans">
        {categories.map((cat, idx) => (
          <div
            key={cat.id}
            className="bg-white border-2 border-slate-800 rounded-2xl p-4 shadow-[4px_4px_0px_0px_#1e293b] flex items-start space-x-3.5 hover:-translate-y-0.5 transition-transform"
          >
            <span className="w-8 h-8 rounded-xl bg-[#CCFF00] border-2 border-slate-800 font-mono text-xs text-slate-900 font-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_#1e293b]">
              {idx + 1}
            </span>
            <div className="space-y-1 truncate">
              <div className="flex items-center space-x-2">
                <span className="font-display font-black text-sm text-slate-900 uppercase tracking-tight">
                  {cat.category_name}
                </span>
                <span className="text-[10px] font-mono text-slate-700 font-bold bg-slate-100 border border-slate-800 px-1.5 py-0.5 rounded">
                  {cat.category_code}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium line-clamp-2">
                {cat.description || 'Kategori ritel standar platform'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
