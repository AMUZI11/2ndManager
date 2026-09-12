"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Package,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  AlertTriangle,
  ArrowUpDown,
  Filter,
  PackagePlus,
  X,
  Check,
  ChevronDown,
  Store,
  Layers,
  Barcode,
} from 'lucide-react';
import { api } from '@/utils/api';
import { createClient } from '@/lib/supabase/client';

export default function AdminInventoryPage() {
  const supabase = createClient();
  const searchInputRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [stockFilter, setStockFilter] = useState('ALL'); // ALL, LOW, OUT
  const [selectedBranch, setSelectedBranch] = useState('ALL');

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isQuickStockOpen, setIsQuickStockOpen] = useState(false);
  const [quickStockTarget, setQuickStockTarget] = useState(null);
  const [stockAddAmount, setStockAddAmount] = useState('10');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formNama, setFormNama] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formKategori, setFormKategori] = useState('LM');
  const [formHargaJual, setFormHargaJual] = useState('');
  const [formHargaModal, setFormHargaModal] = useState('');
  const [formStok, setFormStok] = useState('0');
  const [formMinStok, setFormMinStok] = useState('5');
  const [formShopId, setFormShopId] = useState('');

  // Keyboard shortcut '/' to search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        if (!['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [prods, cats, ownedShops] = await Promise.all([
        api.getProducts().catch(() => []),
        api.getCategories().catch(() => []),
        supabase
          .from('shops')
          .select('id, name')
          .order('created_at', { ascending: true })
          .then(({ data }) => data || []),
      ]);

      setProducts(prods || []);
      setCategories(cats || []);
      setShops(ownedShops || []);

      if (ownedShops?.length > 0 && !formShopId) {
        setFormShopId(ownedShops[0].id);
      }
    } catch (err) {
      console.error('[Inventory Load Error]', err);
      setError('Gagal memuat data inventaris produk.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // KPI Calculations
  const stats = useMemo(() => {
    let totalValue = 0;
    let totalUnits = 0;
    let lowCount = 0;
    let outCount = 0;

    products.forEach((p) => {
      const s = Number(p.stok || 0);
      const cost = Number(p.harga_modal || 0);
      const min = Number(p.reorder_threshold || p.min_stok || 5);

      if (s <= 0) outCount++;
      else if (s <= min) lowCount++;

      totalUnits += Math.max(0, s);
      totalValue += Math.max(0, s) * cost;
    });

    return {
      totalSku: products.length,
      totalValue,
      totalUnits,
      lowCount,
      outCount,
    };
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Branch filter
      if (selectedBranch !== 'ALL' && p.shop_id !== selectedBranch) return false;

      // Category filter
      if (selectedCategory !== 'ALL') {
        const cat = (p.tipe || p.kategori || '').toUpperCase();
        if (cat !== selectedCategory.toUpperCase()) return false;
      }

      // Stock status filter
      const s = Number(p.stok || 0);
      const min = Number(p.reorder_threshold || p.min_stok || 5);
      if (stockFilter === 'LOW' && (s <= 0 || s > min)) return false;
      if (stockFilter === 'OUT' && s > 0) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nama = (p.nama || '').toLowerCase();
        const barcode = (p.barcode || '').toLowerCase();
        return nama.includes(q) || barcode.includes(q);
      }

      return true;
    });
  }, [products, selectedBranch, selectedCategory, stockFilter, searchQuery]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormNama('');
    setFormBarcode(`BRC-${Math.floor(100000 + Math.random() * 900000)}`);
    setFormKategori(categories[0]?.code || 'LM');
    setFormHargaJual('');
    setFormHargaModal('');
    setFormStok('0');
    setFormMinStok('5');
    setFormShopId(shops[0]?.id || '');
    setIsFormModalOpen(true);
  };

  const openEditModal = (p) => {
    setEditingProduct(p);
    setFormNama(p.nama || '');
    setFormBarcode(p.barcode || '');
    setFormKategori(p.tipe || p.kategori || 'LM');
    setFormHargaJual(String(p.harga_jual || ''));
    setFormHargaModal(String(p.harga_modal || ''));
    setFormStok(String(p.stok || '0'));
    setFormMinStok(String(p.reorder_threshold || p.min_stok || '5'));
    setFormShopId(p.shop_id || (shops[0]?.id || ''));
    setIsFormModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!formNama.trim()) {
      alert('Nama produk wajib diisi!');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        nama: formNama.trim(),
        barcode: formBarcode.trim(),
        tipe: formKategori,
        harga_jual: Number(formHargaJual) || 0,
        harga_modal: Number(formHargaModal) || 0,
        stok: Number(formStok) || 0,
        reorder_threshold: Number(formMinStok) || 5,
        shop_id: formShopId || undefined,
      };

      if (editingProduct) {
        await api.updateProduct(editingProduct.id, payload);
      } else {
        await api.createProduct(payload);
      }

      setIsFormModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('[Save Product Error]', err);
      alert('Gagal menyimpan produk: ' + (err.message || 'Kesalahan server'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteTarget) return;
    try {
      setSubmitting(true);
      await api.deleteProduct(deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      console.error('[Delete Product Error]', err);
      alert('Gagal menghapus produk: ' + (err.message || 'Kesalahan server'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickAddStock = async (e) => {
    e.preventDefault();
    if (!quickStockTarget) return;

    const addVal = Number(stockAddAmount);
    if (isNaN(addVal) || addVal <= 0) {
      alert('Jumlah tambahan stok harus lebih dari 0.');
      return;
    }

    try {
      setSubmitting(true);
      const newStock = Number(quickStockTarget.stok || 0) + addVal;
      await api.updateProduct(quickStockTarget.id, { stok: newStock });
      setIsQuickStockOpen(false);
      setQuickStockTarget(null);
      await loadData();
    } catch (err) {
      console.error('[Quick Stock Error]', err);
      alert('Gagal menambahkan stok: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ─── 1. HEADER & ACTIONS ─── */}
      <div className="bg-[#0F172A] border-2 border-[#1E293B] p-4 sm:p-5 shadow-[3px_3px_0px_#000000] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-[#CCFF00] tracking-widest uppercase">
            <span className="w-2.5 h-2.5 bg-[#CCFF00] inline-block border border-black" />
            <span>MODUL INVENTARIS & STOK GERAI</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-mono font-black uppercase text-white tracking-tight mt-1">
            KATALOG INVENTARIS BARANG
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 bg-[#161F36] hover:bg-[#223055] text-slate-300 border border-[#334155] px-3 py-2 text-xs font-mono font-bold uppercase transition-all cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>REFRESH</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 bg-[#CCFF00] hover:bg-[#b8e600] text-black font-mono font-black text-xs uppercase px-4 py-2 border-2 border-black shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
          >
            <Plus size={15} className="stroke-[3]" />
            <span>+ TAMBAH PRODUK BARU</span>
          </button>
        </div>
      </div>

      {/* ─── 2. KPI SUMMARY BAR ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#0F172A] border-2 border-[#1E293B] p-3.5 shadow-[2px_2px_0px_#000000]">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">TOTAL SKU AKTIF</span>
          <strong className="text-xl font-mono font-black text-white">{stats.totalSku} ITEM</strong>
        </div>
        <div className="bg-[#0F172A] border-2 border-[#1E293B] p-3.5 shadow-[2px_2px_0px_#000000]">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">NILAI ASET MODAL</span>
          <strong className="text-xl font-mono font-black text-[#CCFF00]">{formatRupiah(stats.totalValue)}</strong>
        </div>
        <div className="bg-[#0F172A] border-2 border-[#1E293B] p-3.5 shadow-[2px_2px_0px_#000000]">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">STOK MENIPIS</span>
          <strong className="text-xl font-mono font-black text-amber-400">{stats.lowCount} SKU</strong>
        </div>
        <div className="bg-[#0F172A] border-2 border-[#1E293B] p-3.5 shadow-[2px_2px_0px_#000000]">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">STOK HABIS (0)</span>
          <strong className="text-xl font-mono font-black text-rose-400">{stats.outCount} SKU</strong>
        </div>
      </div>

      {/* ─── 3. SEARCH & TACTICAL FILTER DECK ─── */}
      <div className="bg-[#0F172A] border-2 border-[#1E293B] p-4 shadow-[2px_2px_0px_#000000] space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="CARI NAMA ATAU KODE BARCODE... (TEKAN '/' UNTUK FOKUS)"
              className="w-full bg-[#161F36] border-2 border-[#334155] focus:border-[#CCFF00] text-white placeholder:text-slate-500 text-xs font-mono font-bold uppercase px-4 py-2.5 focus:outline-none transition-colors"
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
              className="w-full appearance-none bg-[#161F36] border-2 border-[#334155] focus:border-[#CCFF00] text-white text-xs font-mono font-bold uppercase px-3 py-2.5 focus:outline-none cursor-pointer"
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

        {/* Status & Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {/* Stock Condition */}
          <button
            type="button"
            onClick={() => setStockFilter('ALL')}
            className={`px-3 py-1 text-[11px] font-mono font-bold uppercase border transition-colors cursor-pointer ${
              stockFilter === 'ALL'
                ? 'bg-[#CCFF00] text-black border-black font-black'
                : 'bg-[#161F36] text-slate-300 border-[#334155] hover:border-slate-400'
            }`}
          >
            SEMUA STOK
          </button>
          <button
            type="button"
            onClick={() => setStockFilter('LOW')}
            className={`px-3 py-1 text-[11px] font-mono font-bold uppercase border transition-colors cursor-pointer ${
              stockFilter === 'LOW'
                ? 'bg-amber-400 text-black border-black font-black'
                : 'bg-[#161F36] text-amber-300 border-[#334155] hover:border-amber-500'
            }`}
          >
            [ MENIPIS: {stats.lowCount} ]
          </button>
          <button
            type="button"
            onClick={() => setStockFilter('OUT')}
            className={`px-3 py-1 text-[11px] font-mono font-bold uppercase border transition-colors cursor-pointer ${
              stockFilter === 'OUT'
                ? 'bg-rose-500 text-white border-black font-black'
                : 'bg-[#161F36] text-rose-300 border-[#334155] hover:border-rose-500'
            }`}
          >
            [ HABIS: {stats.outCount} ]
          </button>

          <span className="h-4 w-px bg-slate-700 mx-1 hidden sm:inline-block" />

          {/* Categories */}
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase border transition-colors cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-white text-black border-black font-black'
                : 'bg-[#161F36] text-slate-400 border-[#334155] hover:text-white'
            }`}
          >
            SEMUA KATEGORI
          </button>
          {categories.map((c) => (
            <button
              key={c.id || c.code}
              type="button"
              onClick={() => setSelectedCategory(c.code)}
              className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase border transition-colors cursor-pointer ${
                selectedCategory === c.code
                  ? 'bg-white text-black border-black font-black'
                  : 'bg-[#161F36] text-slate-400 border-[#334155] hover:text-white'
              }`}
            >
              {c.name || c.code}
            </button>
          ))}
        </div>
      </div>

      {/* ─── 4. HIGH-DENSITY DATA TABLE ─── */}
      <div className="bg-[#0F172A] border-2 border-[#1E293B] shadow-[3px_3px_0px_#000000] overflow-x-auto">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="bg-[#161F36] border-b-2 border-[#1E293B] text-[11px] font-black uppercase text-slate-300">
              <th className="p-3 w-36">KODE / BARCODE</th>
              <th className="p-3 min-w-[200px]">NAMA PRODUK</th>
              <th className="p-3 w-28 text-center">STOK FISIK</th>
              <th className="p-3 w-32 text-right">HARGA MODAL</th>
              <th className="p-3 w-32 text-right">HARGA JUAL</th>
              <th className="p-3 w-28 text-right">MARGIN</th>
              <th className="p-3 w-32">CABANG</th>
              <th className="p-3 w-40 text-center">AKSI CEPAT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B]">
            {loading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400 uppercase">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#CCFF00]" />
                  [ MEMUAT DATA KATALOG PRODUK... ]
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-10 text-center text-slate-400 uppercase">
                  <Package className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  [ TIDAK ADA PRODUK SESUAI FILTER PENCARIAN ]
                </td>
              </tr>
            ) : (
              filteredProducts.map((prod) => {
                const stock = Number(prod.stok || 0);
                const min = Number(prod.reorder_threshold || prod.min_stok || 5);
                const cost = Number(prod.harga_modal || 0);
                const price = Number(prod.harga_jual || 0);
                const marginRp = price - cost;
                const marginPct = price > 0 ? Math.round((marginRp / price) * 100) : 0;
                const shopName = shops.find((s) => s.id === prod.shop_id)?.name || 'CABANG UTAMA';

                return (
                  <tr
                    key={prod.id}
                    className="hover:bg-[#161F36]/80 transition-colors group"
                  >
                    {/* Barcode */}
                    <td className="p-3 text-slate-400 font-bold">
                      <span className="bg-black/60 border border-slate-800 px-1.5 py-0.5 text-[10px]">
                        {prod.barcode || 'NO-BARCODE'}
                      </span>
                    </td>

                    {/* Nama */}
                    <td className="p-3">
                      <div className="font-bold text-white uppercase text-sm group-hover:text-[#CCFF00] transition-colors">
                        {prod.nama}
                      </div>
                      <span className="text-[10px] text-slate-500 uppercase">
                        KAT: {prod.tipe || prod.kategori || 'UMUM'}
                      </span>
                    </td>

                    {/* Stok Fisik & Badge */}
                    <td className="p-3 text-center">
                      <div className="font-black text-sm text-white">{stock}</div>
                      {stock <= 0 ? (
                        <span className="text-[9px] font-black bg-rose-950 text-rose-300 border border-rose-700 px-1 py-0.2 uppercase">
                          [ HABIS ]
                        </span>
                      ) : stock <= min ? (
                        <span className="text-[9px] font-black bg-amber-950 text-amber-300 border border-amber-700 px-1 py-0.2 uppercase">
                          [ MENIPIS ]
                        </span>
                      ) : (
                        <span className="text-[9px] font-black bg-emerald-950 text-emerald-300 border border-emerald-700 px-1 py-0.2 uppercase">
                          [ AMAN ]
                        </span>
                      )}
                    </td>

                    {/* Harga Modal */}
                    <td className="p-3 text-right text-slate-300">
                      {formatRupiah(cost)}
                    </td>

                    {/* Harga Jual */}
                    <td className="p-3 text-right font-bold text-white">
                      {formatRupiah(price)}
                    </td>

                    {/* Margin */}
                    <td className="p-3 text-right">
                      <span
                        className={`font-bold ${
                          marginRp >= 0 ? 'text-[#CCFF00]' : 'text-rose-400'
                        }`}
                      >
                        {marginPct}%
                      </span>
                      <span className="text-[9px] text-slate-500 block">
                        +{formatRupiah(marginRp)}
                      </span>
                    </td>

                    {/* Cabang */}
                    <td className="p-3">
                      <span className="text-[10px] bg-black border border-[#334155] px-1.5 py-0.5 text-slate-300 font-bold uppercase truncate max-w-[120px] inline-block">
                        {shopName}
                      </span>
                    </td>

                    {/* Aksi Cepat */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setQuickStockTarget(prod);
                            setStockAddAmount('10');
                            setIsQuickStockOpen(true);
                          }}
                          title="Tambah Stok Kilat"
                          className="bg-[#161F36] hover:bg-[#202c4b] text-[#CCFF00] border border-[#334155] px-2 py-1 text-[10px] font-black uppercase transition-colors"
                        >
                          +STOK
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(prod)}
                          title="Edit Data Produk"
                          className="bg-[#161F36] hover:bg-[#202c4b] text-slate-300 hover:text-white border border-[#334155] p-1 transition-colors"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(prod)}
                          title="Hapus Produk"
                          className="bg-[#161F36] hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-[#334155] hover:border-rose-700 p-1 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ─── 5. MODAL FORM: TAMBAH / EDIT PRODUK ─── */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0F172A] border-2 border-[#CCFF00] shadow-[6px_6px_0px_#000000] max-w-xl w-full p-6 space-y-4 font-mono max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-2 border-[#1E293B] pb-3">
              <div className="flex items-center gap-2">
                <Package className="text-[#CCFF00]" size={18} />
                <h3 className="text-base font-black uppercase text-white">
                  {editingProduct ? 'EDIT DATA PRODUK' : 'TAMBAH PRODUK BARU'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 border border-[#334155]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              {/* Nama Produk */}
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">
                  NAMA PRODUK *
                </label>
                <input
                  type="text"
                  required
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="CONTOH: MIE INSTAN GORENG SPESIAL"
                  className="w-full bg-[#161F36] border-2 border-[#334155] focus:border-[#CCFF00] text-white px-3 py-2 font-mono uppercase focus:outline-none"
                />
              </div>

              {/* Barcode & Kategori */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-1">
                    KODE BARCODE
                  </label>
                  <input
                    type="text"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    placeholder="BRC-000000"
                    className="w-full bg-[#161F36] border-2 border-[#334155] focus:border-[#CCFF00] text-white px-3 py-2 font-mono uppercase focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-1">
                    KATEGORI
                  </label>
                  <select
                    value={formKategori}
                    onChange={(e) => setFormKategori(e.target.value)}
                    className="w-full bg-[#161F36] border-2 border-[#334155] focus:border-[#CCFF00] text-white px-3 py-2 font-mono uppercase focus:outline-none cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.id || c.code} value={c.code}>
                        {c.name || c.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Harga Modal & Harga Jual */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-1">
                    HARGA MODAL (HPP) (RP)
                  </label>
                  <input
                    type="number"
                    value={formHargaModal}
                    onChange={(e) => setFormHargaModal(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full bg-[#161F36] border-2 border-[#334155] focus:border-[#CCFF00] text-white px-3 py-2 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#CCFF00] font-bold uppercase mb-1">
                    HARGA JUAL KASIR (RP) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formHargaJual}
                    onChange={(e) => setFormHargaJual(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full bg-[#161F36] border-2 border-[#334155] focus:border-[#CCFF00] text-white px-3 py-2 font-mono focus:outline-none"
                  />
                </div>
              </div>

              {/* Stok & Minimum Stok Reorder */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-1">
                    STOK SAAT INI
                  </label>
                  <input
                    type="number"
                    value={formStok}
                    onChange={(e) => setFormStok(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full bg-[#161F36] border-2 border-[#334155] focus:border-[#CCFF00] text-white px-3 py-2 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-1">
                    BATAS MINIMUM STOK (ALERT)
                  </label>
                  <input
                    type="number"
                    value={formMinStok}
                    onChange={(e) => setFormMinStok(e.target.value)}
                    placeholder="5"
                    min="1"
                    className="w-full bg-[#161F36] border-2 border-[#334155] focus:border-[#CCFF00] text-white px-3 py-2 font-mono focus:outline-none"
                  />
                </div>
              </div>

              {/* Cabang Penugasan */}
              {shops.length > 1 && (
                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-1">
                    CABANG PENUGASAN PRODUK
                  </label>
                  <select
                    value={formShopId}
                    onChange={(e) => setFormShopId(e.target.value)}
                    className="w-full bg-[#161F36] border-2 border-[#334155] focus:border-[#CCFF00] text-white px-3 py-2 font-mono uppercase focus:outline-none cursor-pointer"
                  >
                    {shops.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#1E293B] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="bg-[#161F36] hover:bg-[#202c4b] text-slate-300 px-4 py-2 font-bold uppercase border border-[#334155]"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#CCFF00] hover:bg-[#b8e600] text-black px-5 py-2 font-black uppercase border-2 border-black shadow-[2px_2px_0px_#000000] disabled:opacity-50"
                >
                  {submitting ? 'MENYIMPAN...' : 'SIMPAN PRODUK'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 6. MODAL QUICK STOCK ADJUSTMENT ─── */}
      {isQuickStockOpen && quickStockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0F172A] border-2 border-[#CCFF00] shadow-[6px_6px_0px_#000000] max-w-sm w-full p-5 space-y-4 font-mono">
            <div className="flex items-center justify-between border-b-2 border-[#1E293B] pb-2">
              <h3 className="text-sm font-black uppercase text-white flex items-center gap-1.5">
                <PackagePlus size={16} className="text-[#CCFF00]" />
                <span>TAMBAH STOK KILAT</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsQuickStockOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={15} />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              TAMBAH STOK UNTUK <strong className="text-white uppercase">{quickStockTarget.nama}</strong>
              <span className="block text-[10px] text-slate-500 mt-0.5">
                STOK SAAT INI: {quickStockTarget.stok || 0} UNIT
              </span>
            </p>

            <form onSubmit={handleQuickAddStock} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  JUMLAH BARANG MASUK (PCS)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={stockAddAmount}
                  onChange={(e) => setStockAddAmount(e.target.value)}
                  className="w-full bg-[#161F36] border-2 border-[#334155] focus:border-[#CCFF00] text-white px-3 py-2 text-sm font-black focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                {[5, 10, 24, 50].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setStockAddAmount(String(num))}
                    className="bg-[#161F36] hover:bg-[#223055] text-slate-300 border border-[#334155] py-1 font-bold"
                  >
                    +{num}
                  </button>
                ))}
              </div>

              <div className="pt-3 border-t border-[#1E293B] flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickStockOpen(false)}
                  className="flex-1 bg-[#161F36] text-slate-300 border border-[#334155] py-2 text-xs font-bold uppercase"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#CCFF00] text-black border-2 border-black py-2 text-xs font-black uppercase shadow-[2px_2px_0px_#000000]"
                >
                  {submitting ? 'MEMPROSES...' : 'TAMBAH STOK'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 7. CONFIRM DELETE MODAL ─── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0F172A] border-2 border-rose-600 shadow-[6px_6px_0px_#000000] max-w-sm w-full p-5 space-y-4 font-mono">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle size={20} />
              <h3 className="text-sm font-black uppercase text-white">
                KONFIRMASI HAPUS PRODUK
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Anda yakin ingin menghapus produk <strong className="text-white uppercase">{deleteTarget.nama}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 bg-[#161F36] text-slate-300 border border-[#334155] py-2 text-xs font-bold uppercase"
              >
                BATAL
              </button>
              <button
                type="button"
                onClick={handleDeleteProduct}
                disabled={submitting}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white border-2 border-black py-2 text-xs font-black uppercase shadow-[2px_2px_0px_#000000]"
              >
                {submitting ? 'MENGHAPUS...' : 'HAPUS PERMANEN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
