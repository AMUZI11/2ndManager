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
    <div className="space-y-6 font-sans max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Layers size={20} className="text-[#CCFF00]" />
            <h2 className="font-heading font-black text-xl text-zinc-100 uppercase tracking-tight">
              Master 11 Kategori Retail &amp; Grosir Indonesia
            </h2>
          </div>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Standar taksonomi katalog produk FMCG, warung, sembako, dan minimarket
          </p>
        </div>
      </div>

      {/* Seeder Box */}
      <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-3">
        <div className="flex items-center space-x-2 text-xs font-mono text-[#CCFF00] font-bold">
          <Sparkles size={14} />
          <span>INJEKTOR SEEDER KATEGORI KE PENYEWA</span>
        </div>
        <p className="text-xs text-zinc-400">
          Suntikkan secara instan 11 kategori ritel standar ke toko baru tanpa menimpa kategori lama.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <select
            value={selectedShopId}
            onChange={(e) => setSelectedShopId(e.target.value)}
            className="h-8 px-3 bg-zinc-950 border border-zinc-700 rounded text-xs text-zinc-200 font-sans focus:outline-none"
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
            className="h-8 px-4 bg-[#CCFF00] hover:bg-[#b3e600] text-black font-black text-xs rounded border border-black flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Send size={12} />
            <span>{seeding ? 'Menyuntikkan...' : 'SUNTIKKAN KE TOKO'}</span>
          </button>

          {message && (
            <span className="text-xs font-mono text-emerald-400 font-bold animate-fade-in">
              ✓ {message}
            </span>
          )}
        </div>
      </div>

      {/* 11 Categories High-Density Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-sans">
        {categories.map((cat, idx) => (
          <div
            key={cat.id}
            className="p-3.5 bg-zinc-900/50 border border-zinc-800 rounded-lg flex items-start space-x-3 hover:border-zinc-700 transition-colors"
          >
            <span className="w-7 h-7 rounded bg-zinc-950 border border-zinc-700 font-mono text-xs text-[#CCFF00] font-black flex items-center justify-center shrink-0">
              {idx + 1}
            </span>
            <div className="space-y-0.5 truncate">
              <div className="flex items-center space-x-2">
                <span className="font-heading font-black text-xs text-zinc-100 uppercase">
                  {cat.category_name}
                </span>
                <span className="text-[10px] font-mono text-zinc-500 font-bold">
                  [{cat.category_code}]
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-sans line-clamp-2">
                {cat.description || 'Kategori ritel standar'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
