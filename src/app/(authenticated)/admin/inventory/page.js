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
      if (selectedBranch !== 'ALL' && p.shop_id !== selectedBranch) return false;

      if (selectedCategory !== 'ALL') {
        const cat = (p.tipe || p.kategori || '').toUpperCase();
        if (cat !== selectedCategory.toUpperCase()) return false;
      }

      const s = Number(p.stok || 0);
      const min = Number(p.reorder_threshold || p.min_stok || 5);
      if (stockFilter === 'LOW' && (s <= 0 || s > min)) return false;
      if (stockFilter === 'OUT' && s > 0) return false;

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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ─── 1. HEADER & ACTIONS ─── */}
      <div className="bg-white/90 backdrop-blur-md border-2 border-slate-800 rounded-2xl p-5 shadow-[3px_3px_0_#1E293B] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-slate-600 tracking-widest uppercase">
            <span className="w-2.5 h-2.5 bg-[#CCFF00] inline-block rounded-full border border-slate-800" />
            <span>MODUL INVENTARIS & STOK GERAI</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-black uppercase text-slate-900 tracking-tight mt-1">
            KATALOG INVENTARIS BARANG
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono font-bold uppercase transition-all shadow-[2px_2px_0_#1E293B] cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>REFRESH</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 bg-[#CCFF00] hover:bg-[#b8e600] text-slate-900 font-mono font-black text-xs uppercase px-4 py-2 rounded-xl border-2 border-slate-800 shadow-[3px_3px_0_#1E293B] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
          >
            <Plus size={15} className="stroke-[3]" />
            <span>+ TAMBAH PRODUK BARU</span>
          </button>
        </div>
      </div>

      {/* ─── 2. KPI SUMMARY BAR ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border-2 border-slate-800 p-4 shadow-[3px_3px_0_#1E293B]">
          <span className="text-[10px] font-mono text-slate-500 block uppercase">TOTAL SKU AKTIF</span>
          <strong className="text-xl font-mono font-black text-slate-900">{stats.totalSku} ITEM</strong>
        </div>
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border-2 border-slate-800 p-4 shadow-[3px_3px_0_#1E293B]">
          <span className="text-[10px] font-mono text-slate-500 block uppercase">NILAI ASET MODAL</span>
          <strong className="text-xl font-mono font-black text-slate-900">{formatRupiah(stats.totalValue)}</strong>
        </div>
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border-2 border-slate-800 p-4 shadow-[3px_3px_0_#1E293B]">
          <span className="text-[10px] font-mono text-slate-500 block uppercase">STOK MENIPIS</span>
          <strong className="text-xl font-mono font-black text-amber-600">{stats.lowCount} SKU</strong>
        </div>
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border-2 border-slate-800 p-4 shadow-[3px_3px_0_#1E293B]">
          <span className="text-[10px] font-mono text-slate-500 block uppercase">STOK HABIS (0)</span>
          <strong className="text-xl font-mono font-black text-rose-600">{stats.outCount} SKU</strong>
        </div>
      </div>

      {/* ─── 3. SEARCH & TACTICAL FILTER DECK ─── */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border-2 border-slate-800 p-4 shadow-[3px_3px_0_#1E293B] space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="CARI NAMA ATAU KODE BARCODE... (TEKAN '/' UNTUK FOKUS)"
              className="w-full bg-white border-2 border-slate-800 rounded-xl text-slate-900 placeholder:text-slate-400 text-xs font-mono font-bold uppercase px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors shadow-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
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
              className="w-full appearance-none bg-white border-2 border-slate-800 rounded-xl text-slate-900 text-xs font-mono font-bold uppercase px-3.5 py-2.5 focus:outline-none cursor-pointer shadow-sm"
            >
              <option value="ALL">SEMUA CABANG</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name.toUpperCase()}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
          </div>
        </div>

        {/* Status & Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setStockFilter('ALL')}
            className={`px-3 py-1 text-[11px] font-mono font-bold uppercase rounded-full border transition-colors cursor-pointer ${
              stockFilter === 'ALL'
                ? 'bg-slate-900 text-[#CCFF00] border-slate-900 font-black shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
            }`}
          >
            SEMUA STOK
          </button>
          <button
            type="button"
            onClick={() => setStockFilter('LOW')}
            className={`px-3 py-1 text-[11px] font-mono font-bold uppercase rounded-full border transition-colors cursor-pointer ${
              stockFilter === 'LOW'
                ? 'bg-amber-400 text-slate-900 border-slate-900 font-black shadow-sm'
                : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
            }`}
          >
            [ MENIPIS: {stats.lowCount} ]
          </button>
          <button
            type="button"
            onClick={() => setStockFilter('OUT')}
            className={`px-3 py-1 text-[11px] font-mono font-bold uppercase rounded-full border transition-colors cursor-pointer ${
              stockFilter === 'OUT'
                ? 'bg-rose-600 text-white border-slate-900 font-black shadow-sm'
                : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
            }`}
          >
            [ HABIS: {stats.outCount} ]
          </button>

          <span className="h-4 w-px bg-slate-300 mx-1 hidden sm:inline-block" />

          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-lg border transition-colors cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900 font-black'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
          >
            SEMUA KATEGORI
          </button>
          {categories.map((c) => (
            <button
              key={c.id || c.code}
              type="button"
              onClick={() => setSelectedCategory(c.code)}
              className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-lg border transition-colors cursor-pointer ${
                selectedCategory === c.code
                  ? 'bg-slate-900 text-white border-slate-900 font-black'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {c.name || c.code}
            </button>
          ))}
        </div>
      </div>

      {/* ─── 4. HIGH-DENSITY DATA TABLE (Gaya Web App) ─── */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0_#1E293B] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-slate-100/90 border-b-2 border-slate-800 text-[11px] font-black uppercase text-slate-700">
                <th className="p-3.5 w-36">KODE / BARCODE</th>
                <th className="p-3.5 min-w-[200px]">NAMA PRODUK</th>
                <th className="p-3.5 w-28 text-center">STOK FISIK</th>
                <th className="p-3.5 w-32 text-right">HARGA MODAL</th>
                <th className="p-3.5 w-32 text-right">HARGA JUAL</th>
                <th className="p-3.5 w-28 text-right">MARGIN</th>
                <th className="p-3.5 w-32">CABANG</th>
                <th className="p-3.5 w-36 text-center">AKSI CEPAT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-600 uppercase">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-900" />
                    [ MEMUAT DATA KATALOG PRODUK... ]
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-500 uppercase">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-400" />
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
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Barcode */}
                      <td className="p-3.5 text-slate-500 font-bold">
                        <span className="bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-[10px]">
                          {prod.barcode || 'NO-BARCODE'}
                        </span>
                      </td>

                      {/* Nama */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 uppercase text-sm group-hover:text-amber-600 transition-colors">
                          {prod.nama}
                        </div>
                        <span className="text-[10px] text-slate-500 uppercase">
                          KAT: {prod.tipe || prod.kategori || 'UMUM'}
                        </span>
                      </td>

                      {/* Stok Fisik & Badge */}
                      <td className="p-3.5 text-center">
                        <div className="font-black text-sm text-slate-900">{stock}</div>
                        {stock <= 0 ? (
                          <span className="text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.2 rounded-full uppercase">
                            HABIS
                          </span>
                        ) : stock <= min ? (
                          <span className="text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.2 rounded-full uppercase">
                            MENIPIS
                          </span>
                        ) : (
                          <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.2 rounded-full uppercase">
                            AMAN
                          </span>
                        )}
                      </td>

                      {/* Harga Modal */}
                      <td className="p-3.5 text-right text-slate-600">
                        {formatRupiah(cost)}
                      </td>

                      {/* Harga Jual */}
                      <td className="p-3.5 text-right font-bold text-slate-900">
                        {formatRupiah(price)}
                      </td>

                      {/* Margin */}
                      <td className="p-3.5 text-right">
                        <span
                          className={`font-bold ${
                            marginRp >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {marginPct}%
                        </span>
                        <span className="text-[9px] text-slate-400 block">
                          +{formatRupiah(marginRp)}
                        </span>
                      </td>

                      {/* Cabang */}
                      <td className="p-3.5">
                        <span className="text-[10px] bg-slate-100 border border-slate-300 rounded px-2 py-0.5 text-slate-700 font-bold uppercase truncate max-w-[120px] inline-block">
                          {shopName}
                        </span>
                      </td>

                      {/* Aksi Cepat */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setQuickStockTarget(prod);
                              setStockAddAmount('10');
                              setIsQuickStockOpen(true);
                            }}
                            title="Tambah Stok Kilat"
                            className="bg-[#CCFF00] hover:bg-[#b8e600] text-slate-900 border border-slate-900 rounded-lg px-2 py-1 text-[10px] font-black uppercase transition-colors shadow-sm"
                          >
                            +STOK
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(prod)}
                            title="Edit Data Produk"
                            className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg p-1.5 transition-colors shadow-sm"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(prod)}
                            title="Hapus Produk"
                            className="bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-300 hover:border-rose-300 rounded-lg p-1.5 transition-colors shadow-sm"
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
      </div>

      {/* ─── 5. MODAL FORM: TAMBAH / EDIT PRODUK (Gaya Web App) ─── */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white/95 backdrop-blur-2xl border-2 border-slate-800 shadow-[8px_8px_0px_#1E293B] rounded-2xl max-w-xl w-full p-6 space-y-4 font-mono max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Package className="text-slate-900" size={18} />
                <h3 className="text-base font-heading font-black uppercase text-slate-900">
                  {editingProduct ? 'EDIT DATA PRODUK' : 'TAMBAH PRODUK BARU'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-500 hover:text-slate-900 p-1 rounded-lg border border-slate-300"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">
                  NAMA PRODUK *
                </label>
                <input
                  type="text"
                  required
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="CONTOH: MIE INSTAN GORENG SPESIAL"
                  className="w-full bg-white border-2 border-slate-800 rounded-xl text-slate-900 px-3 py-2 font-mono uppercase focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">
                    KODE BARCODE
                  </label>
                  <input
                    type="text"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    placeholder="BRC-000000"
                    className="w-full bg-white border-2 border-slate-800 rounded-xl text-slate-900 px-3 py-2 font-mono uppercase focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">
                    KATEGORI
                  </label>
                  <select
                    value={formKategori}
                    onChange={(e) => setFormKategori(e.target.value)}
                    className="w-full bg-white border-2 border-slate-800 rounded-xl text-slate-900 px-3 py-2 font-mono uppercase focus:outline-none cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.id || c.code} value={c.code}>
                        {c.name || c.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">
                    HARGA MODAL (HPP) (RP)
                  </label>
                  <input
                    type="number"
                    value={formHargaModal}
                    onChange={(e) => setFormHargaModal(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full bg-white border-2 border-slate-800 rounded-xl text-slate-900 px-3 py-2 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-900 font-bold uppercase mb-1">
                    HARGA JUAL KASIR (RP) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formHargaJual}
                    onChange={(e) => setFormHargaJual(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full bg-white border-2 border-slate-800 rounded-xl text-slate-900 px-3 py-2 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">
                    STOK SAAT INI
                  </label>
                  <input
                    type="number"
                    value={formStok}
                    onChange={(e) => setFormStok(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full bg-white border-2 border-slate-800 rounded-xl text-slate-900 px-3 py-2 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">
                    BATAS MINIMUM STOK (ALERT)
                  </label>
                  <input
                    type="number"
                    value={formMinStok}
                    onChange={(e) => setFormMinStok(e.target.value)}
                    placeholder="5"
                    min="1"
                    className="w-full bg-white border-2 border-slate-800 rounded-xl text-slate-900 px-3 py-2 font-mono focus:outline-none"
                  />
                </div>
              </div>

              {shops.length > 1 && (
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">
                    CABANG PENUGASAN PRODUK
                  </label>
                  <select
                    value={formShopId}
                    onChange={(e) => setFormShopId(e.target.value)}
                    className="w-full bg-white border-2 border-slate-800 rounded-xl text-slate-900 px-3 py-2 font-mono uppercase focus:outline-none cursor-pointer"
                  >
                    {shops.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="bg-white hover:bg-slate-100 text-slate-700 px-4 py-2 font-bold uppercase border-2 border-slate-800 rounded-xl"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#CCFF00] hover:bg-[#b8e600] text-slate-900 px-5 py-2 font-black uppercase border-2 border-slate-800 rounded-xl shadow-[3px_3px_0_#1E293B] disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white/95 backdrop-blur-2xl border-2 border-slate-800 shadow-[6px_6px_0px_#1E293B] rounded-2xl max-w-sm w-full p-5 space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-1.5">
                <PackagePlus size={16} className="text-slate-900" />
                <span>TAMBAH STOK KILAT</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsQuickStockOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={15} />
              </button>
            </div>

            <p className="text-xs text-slate-700">
              TAMBAH STOK UNTUK <strong className="text-slate-900 uppercase">{quickStockTarget.nama}</strong>
              <span className="block text-[10px] text-slate-500 mt-0.5">
                STOK SAAT INI: {quickStockTarget.stok || 0} UNIT
              </span>
            </p>

            <form onSubmit={handleQuickAddStock} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  JUMLAH BARANG MASUK (PCS)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={stockAddAmount}
                  onChange={(e) => setStockAddAmount(e.target.value)}
                  className="w-full bg-white border-2 border-slate-800 rounded-xl text-slate-900 px-3 py-2 text-sm font-black focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                {[5, 10, 24, 50].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setStockAddAmount(String(num))}
                    className="bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-800 rounded-lg py-1 font-bold shadow-sm"
                  >
                    +{num}
                  </button>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-200 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickStockOpen(false)}
                  className="flex-1 bg-white text-slate-700 border-2 border-slate-800 rounded-xl py-2 text-xs font-bold uppercase"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#CCFF00] text-slate-900 border-2 border-slate-800 rounded-xl py-2 text-xs font-black uppercase shadow-[2px_2px_0_#1E293B]"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border-2 border-rose-600 shadow-[8px_8px_0px_#1E293B] rounded-2xl max-w-sm w-full p-5 space-y-4 font-mono">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle size={20} />
              <h3 className="text-sm font-black uppercase">
                KONFIRMASI HAPUS PRODUK
              </h3>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              Anda yakin ingin menghapus produk <strong className="text-slate-900 uppercase">{deleteTarget.nama}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 bg-white text-slate-700 border-2 border-slate-800 rounded-xl py-2 text-xs font-bold uppercase"
              >
                BATAL
              </button>
              <button
                type="button"
                onClick={handleDeleteProduct}
                disabled={submitting}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white border-2 border-slate-800 rounded-xl py-2 text-xs font-black uppercase shadow-[2px_2px_0_#1E293B]"
              >
                {submitting ? 'MENGHAPUS...' : 'HAPUS'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
