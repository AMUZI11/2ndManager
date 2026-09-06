"use client";
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Search, Package, Tags, ChevronRight, Barcode, AlertTriangle, ArrowUpRight, PackagePlus, Layers } from 'lucide-react';
import { api } from '../utils/api';
import ConfirmModal from '../components/ConfirmModal';
import { useTutorial, ContextualTooltip } from '../components/TutorialEngine';
import { TableSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import UnitConversionModal from '@/components/products/UnitConversionModal';
import StockInModal from '@/components/products/StockInModal';

const getTerbacaRupiah = (amountStr) => {
  const num = parseInt(amountStr);
  if (isNaN(num) || num <= 0) return '';
  const formatted = new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR', 
    minimumFractionDigits: 0 
  }).format(num);
  
  if (num >= 1000000) {
    const juta = num / 1000000;
    return `Terbaca: ${formatted} (${juta % 1 === 0 ? juta : juta.toFixed(2)} Juta)`;
  } else if (num >= 1000) {
    const ribu = num / 1000;
    return `Terbaca: ${formatted} (${ribu % 1 === 0 ? ribu : ribu.toFixed(1)} Ribu)`;
  }
  return `Terbaca: ${formatted}`;
};

export default function ProductManagement() {
  const { registerTrigger } = useTutorial();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL"); // ALL or any category code

  // Category management state
  const [showCatPanel, setShowCatPanel] = useState(false);
  const [newCatCode, setNewCatCode] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [catError, setCatError] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Form States
  const [nama, setNama] = useState("");
  const [hargaBase, setHargaBase] = useState("");
  const [hargaModal, setHargaModal] = useState("");
  const [tipe, setTipe] = useState("LM");
  const [stock, setStock] = useState("0");
  const [barcode, setBarcode] = useState("");
  const [reorderThreshold, setReorderThreshold] = useState("5");
  
  // Quick Add Stock Modal State
  const [quickStockProduct, setQuickStockProduct] = useState(null);
  const [stockToAdd, setStockToAdd] = useState("10");

  const [errorMsg, setErrorMsg] = useState("");
  const [generalError, setGeneralError] = useState("");
  
  // Custom Modals State
  const [deleteProductId, setDeleteProductId] = useState(null);
  const [showPriceWarning, setShowPriceWarning] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);

  // Fase 1: Multi-Unit & Stock-In Modals
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [selectedUnitProduct, setSelectedUnitProduct] = useState(null);
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const cats = await api.getCategories();
      setCategories(cats);
    } catch (err) {
      console.error('Gagal memuat kategori:', err);
    }
  }

  async function loadProducts() {
    setLoading(true);
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      console.error("Gagal memuat produk:", err);
      setGeneralError("Gagal memuat katalog produk.");
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setNama("");
    setHargaBase("");
    setHargaModal("");
    setTipe(categories[0]?.code || "LM");
    setStock("0");
    setBarcode("");
    setReorderThreshold("5");
    setErrorMsg("");
    setIsModalOpen(true);
    registerTrigger("prod-add-btn", "click");
  };

  const openEditModal = (p) => {
    setEditingId(p.id);
    setNama(p.nama);
    setHargaBase(p.harga_base.toString());
    setHargaModal(p.harga_modal.toString());
    setTipe(p.tipe);
    setStock((p.stock ?? 0).toString());
    setBarcode(p.barcode || "");
    setReorderThreshold((p.reorder_threshold ?? 5).toString());
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleSave = async (e, bypassWarning = false) => {
    if (e) e.preventDefault();
    if (!nama.trim()) {
      setErrorMsg("Nama produk wajib diisi.");
      return;
    }

    const basePrice = parseInt(hargaBase);
    const modalPrice = parseInt(hargaModal);
    const stockQty = parseInt(stock || 0);
    const thresholdQty = parseInt(reorderThreshold || 5);

    if (isNaN(basePrice) || basePrice < 0 || isNaN(modalPrice) || modalPrice < 0) {
      setErrorMsg("Harga Jual dan Harga Modal harus berupa angka ≥ 0.");
      return;
    }

    const payload = {
      nama: nama.trim(),
      harga_base: basePrice,
      harga_modal: modalPrice,
      tipe: tipe.trim(),
      stock: stockQty,
      barcode: barcode.trim() || null,
      reorder_threshold: thresholdQty
    };

    if (modalPrice > basePrice && !bypassWarning) {
      setPendingPayload(payload);
      setShowPriceWarning(true);
      return;
    }

    try {
      if (editingId) {
        await api.updateProduct(editingId, payload);
        registerTrigger("prod-save-btn", "click");
      } else {
        await api.addProduct(payload);
        registerTrigger("prod-save-btn", "click");
      }
      setIsModalOpen(false);
      await loadProducts();
    } catch (err) {
      setErrorMsg(err.message || "Gagal menyimpan produk.");
    }
  };

  const handleQuickStockAdd = async () => {
    if (!quickStockProduct) return;
    const addQty = parseInt(stockToAdd || 0);
    if (isNaN(addQty) || addQty <= 0) return;

    try {
      const currentStock = quickStockProduct.stock || 0;
      const newStock = currentStock + addQty;
      await api.updateProduct(quickStockProduct.id, { stock: newStock });
      setQuickStockProduct(null);
      setStockToAdd("10");
      await loadProducts();
    } catch (err) {
      setGeneralError(err.message || "Gagal memperbarui stok.");
    }
  };

  const handleDelete = (id) => {
    setDeleteProductId(id);
  };

  // Filter & Search Logic
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.nama.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "ALL" || p.tipe === typeFilter;
    return matchesSearch && matchesType;
  });

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  if (loading) {
    return <TableSkeleton rows={5} />;
  }

  return (
    <div className="space-y-6 pb-32">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white rounded-2xl p-6 border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display uppercase tracking-tight">📦 Radar Stok &amp; Katalog Produk</h1>
            <span className="text-[10px] font-mono font-bold bg-slate-900 text-[#CCFF00] px-2 py-0.5 rounded border border-slate-800">
              INVENTORY RADAR
            </span>
          </div>
          <p className="text-xs font-sans text-slate-600 mt-1">
            Pantau stok sisa, radar batas kritis, harga beli modal (HPP rahasia), dan harga jual dasar per box.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button 
            onClick={() => setIsStockInModalOpen(true)}
            className="btn-arcade bg-emerald-400 hover:bg-emerald-300 text-slate-900 font-mono font-bold text-xs uppercase h-11 px-4 rounded-xl border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B] transition-all flex items-center gap-2 cursor-pointer"
          >
            <PackagePlus size={16} /> + CATAT KULAKAN
          </button>
          <button 
            id="prod-add-btn"
            onClick={openAddModal}
            className="btn-arcade bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 font-mono font-bold text-xs uppercase h-11 px-5 rounded-xl border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B] transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} /> + PRODUK BARU
          </button>
        </div>
      </div>

      {generalError && (
        <div className="bg-rose-50 border-2 border-rose-500 text-rose-900 p-4 rounded-xl text-xs font-mono font-bold flex items-center justify-between shadow-[3px_3px_0px_#E30022]">
          <span>Peringatan: {generalError}</span>
          <button onClick={() => setGeneralError("")} className="text-rose-900 font-bold hover:underline cursor-pointer">Tutup</button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] flex flex-col md:flex-row gap-3 items-center">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <Search size={16} />
          </span>
          <input 
            type="text" 
            placeholder="Cari nama atau barcode produk..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 bg-slate-50 border-2 border-slate-800 rounded-xl pl-10 pr-3 text-xs font-sans font-medium text-slate-900 focus:ring-2 focus:ring-[#CCFF00] outline-none transition-all"
          />
        </div>

        {/* Segmented Filter — Category Buttons */}
        <div className="flex bg-slate-100 p-1 rounded-xl border-2 border-slate-800 flex-wrap gap-1 w-full md:w-auto">
          <button 
            onClick={() => setTypeFilter("ALL")}
            className={`btn-arcade px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-lg transition-all ${
              typeFilter === "ALL" 
                ? "bg-slate-900 text-[#CCFF00] shadow-[2px_2px_0px_#1E293B]" 
                : "text-slate-700 hover:bg-slate-200"
            }`}
          >
            Semua
          </button>
          {categories.map(cat => (
            <button 
              key={cat.code}
              onClick={() => setTypeFilter(cat.code)}
              className={`btn-arcade px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-lg transition-all ${
                typeFilter === cat.code 
                  ? "bg-slate-900 text-[#CCFF00] shadow-[2px_2px_0px_#1E293B]" 
                  : "text-slate-700 hover:bg-slate-200"
              }`}
            >
              {cat.code}
            </button>
          ))}
        </div>

        {/* Category Management Button */}
        <button
          onClick={() => setShowCatPanel(v => !v)}
          className="btn-arcade flex items-center gap-1.5 h-11 px-3.5 bg-slate-50 hover:bg-slate-100 text-slate-900 text-xs font-mono font-bold uppercase rounded-xl transition-all border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] cursor-pointer"
          title="Kelola Kategori"
        >
          <Tags size={14} />
          Kategori
          <ChevronRight size={13} className={`transition-transform ${showCatPanel ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {/* Category Management Panel */}
      {showCatPanel && (
        <div className="bg-white rounded-2xl p-5 border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-slate-100 pb-3">
            <h3 className="font-extrabold text-sm text-slate-900 font-display uppercase flex items-center gap-2">
              <Tags size={16} /> Manajemen Kategori Produk
            </h3>
            <button
              onClick={async () => {
                setCatError("");
                try {
                  const res = await api.seedDefaultCategories();
                  await loadCategories();
                  if (res?.seeded_count > 0) {
                    setCatError(`Sukses menambahkan ${res.seeded_count} kategori standar retail baru!`);
                  } else {
                    setCatError("Semua kategori standar sudah lengkap terpasang.");
                  }
                } catch (err) {
                  setCatError(err.message);
                }
              }}
              className="btn-arcade flex items-center gap-1.5 px-3.5 py-2 bg-emerald-400 hover:bg-emerald-500 text-slate-900 font-mono font-bold text-[11px] uppercase rounded-xl border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] transition-all cursor-pointer self-start sm:self-auto"
            >
              <Package size={13} /> + Muat 11 Kategori Standar Warung
            </button>
          </div>

          {catError && (
            <p className={`text-xs font-mono font-bold p-2.5 rounded-xl border-2 ${
              catError.includes('Sukses') || catError.includes('lengkap')
                ? 'bg-emerald-50 border-emerald-600 text-emerald-900'
                : 'bg-rose-50 border-rose-500 text-rose-900'
            }`}>
              {catError}
            </p>
          )}

          {/* Existing categories */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {categories.map(cat => (
              <div key={cat.code} className="flex items-center justify-between bg-slate-50 border-2 border-slate-800 rounded-xl px-3 py-2 hover:bg-slate-100 transition-colors">
                <div>
                  <span className="font-bold text-xs font-mono text-slate-900 bg-white border border-slate-300 px-1.5 py-0.5 rounded mr-1.5">{cat.code}</span>
                  <span className="text-slate-700 text-xs font-medium">{cat.name}</span>
                </div>
                <button
                  onClick={async () => {
                    setCatError("");
                    try {
                      await api.deleteCategory(cat.code);
                      await loadCategories();
                    } catch (err) {
                      setCatError(err.message);
                    }
                  }}
                  className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                  title="Hapus kategori"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          {/* Add new custom category form */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end pt-2 border-t border-slate-100">
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-slate-700 uppercase">Kode Baru</label>
              <input
                type="text"
                value={newCatCode}
                onChange={e => setNewCatCode(e.target.value.toUpperCase())}
                placeholder="Contoh: PR"
                maxLength={10}
                className="h-10 w-full sm:w-24 bg-slate-50 border-2 border-slate-800 rounded-xl px-3 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#CCFF00] outline-none"
              />
            </div>
            <div className="space-y-1 flex-1">
              <label className="text-[10px] font-mono font-bold text-slate-700 uppercase">Nama Kategori</label>
              <input
                type="text"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="Contoh: Perlengkapan Elektronik"
                className="h-10 w-full bg-slate-50 border-2 border-slate-800 rounded-xl px-3 text-xs font-sans font-medium text-slate-900 focus:ring-2 focus:ring-[#CCFF00] outline-none"
              />
            </div>
            <button
              onClick={async () => {
                setCatError("");
                if (!newCatCode.trim() || !newCatName.trim()) { setCatError("Kode dan nama kategori wajib diisi."); return; }
                try {
                  await api.addCategory(newCatCode.trim(), newCatName.trim());
                  setNewCatCode("");
                  setNewCatName("");
                  await loadCategories();
                } catch (err) {
                  setCatError(err.message);
                }
              }}
              className="btn-arcade h-10 px-4 bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 font-mono font-bold text-xs uppercase border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] rounded-xl transition-all cursor-pointer whitespace-nowrap"
            >
              + Tambah Kategori
            </button>
          </div>
        </div>
      )}

      {/* Product List Table (Zona Mesin) */}
      <div className="bg-white rounded-2xl shadow-[4px_4px_0px_#1E293B] border-2 border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          {products.length === 0 ? (
            <div className="py-8 px-4">
              <EmptyState 
                icon={Package}
                title="Katalog Produk Kosong"
                message="Tambahkan produk jualan Anda untuk mulai mencatat stok dan menghitung laba bersih otomatis."
                actionLabel="+ Tambah Produk Baru"
                onAction={openAddModal}
              />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-mono text-xs p-6">
              Produk dengan pencarian &quot;{searchQuery}&quot; tidak ditemukan.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-800 text-[11px] font-mono text-slate-700 uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">NAMA PRODUK</th>
                  <th className="py-3 px-3">KATEGORI</th>
                  <th className="py-3 px-3 text-center">STOK SISA</th>
                  <th className="py-3 px-3 text-right">HARGA JUAL</th>
                  <th className="py-3 px-3 text-right">
                    <span className="flex items-center justify-end gap-1">
                      HARGA MODAL (HPP)
                      <ContextualTooltip id="tip-modal-cost" content="Harga modal rahasia Anda. Hanya digunakan untuk menghitung keuntungan bersih di sistem." />
                    </span>
                  </th>
                  <th className="py-3 px-4 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs font-mono text-slate-900">
                {filteredProducts.map((p) => {
                  const currentStock = p.stock ?? 0;
                  const threshold = p.reorder_threshold ?? 5;
                  const isLowStock = currentStock > 0 && currentStock <= threshold;
                  const isOutOfStock = currentStock <= 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-all">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-slate-900 text-[#CCFF00] border border-slate-800 shadow-[1px_1px_0px_#1E293B]">
                            <Package size={15} />
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 font-sans text-sm">{p.nama}</div>
                            {p.barcode && (
                              <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                                <Barcode size={12} /> {p.barcode}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-100 text-slate-900 border border-slate-300">
                          {p.tipe}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono">
                        <div className="flex flex-col items-center gap-1">
                          {/* Floating Comic Stock Warning Badge */}
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-black flex items-center gap-1 border ${
                            isOutOfStock ? 'bg-rose-100 text-rose-800 border-rose-500 shadow-[2px_2px_0px_#E30022] animate-pulse' :
                            isLowStock ? 'bg-amber-100 text-amber-900 border-amber-500 shadow-[2px_2px_0px_#F59E0B]' :
                            'bg-emerald-50 text-emerald-800 border-emerald-300'
                          }`}>
                            {isOutOfStock && <AlertTriangle size={12} />}
                            {currentStock} Pcs
                          </span>

                          {/* Multi-Tier Unit Breakdown */}
                          {p.product_units && p.product_units.length > 1 && (
                            <span className="text-[10px] text-slate-500 font-mono font-medium block">
                              {(() => {
                                const nonBase = [...p.product_units].filter(u => !u.is_base_unit).sort((a, b) => b.multiplier_to_base - a.multiplier_to_base)[0];
                                if (nonBase && nonBase.multiplier_to_base > 1) {
                                  const fullUnits = Math.floor(currentStock / nonBase.multiplier_to_base);
                                  const remainder = currentStock % nonBase.multiplier_to_base;
                                  return `≈ ${fullUnits} ${nonBase.unit_name}${remainder > 0 ? ` + ${remainder} pcs` : ''}`;
                                }
                                return null;
                              })()}
                            </span>
                          )}

                          <button
                            onClick={() => {
                              setSelectedProduct(p);
                              setIsStockInModalOpen(true);
                            }}
                            className="btn-arcade text-[10px] font-mono font-bold uppercase text-slate-900 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded border border-slate-800 transition-all cursor-pointer"
                            title="Catat Kulakan Stok"
                          >
                            + Kulakan
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold tabular-nums text-slate-900">{formatRupiah(p.harga_base)}</td>
                      <td className="py-3.5 px-3 text-right text-slate-600 font-semibold tabular-nums italic bg-slate-50/50">{formatRupiah(p.harga_modal)}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            onClick={() => {
                              setSelectedUnitProduct(p);
                              setIsUnitModalOpen(true);
                            }}
                            className="btn-arcade bg-amber-100 hover:bg-amber-200 text-slate-900 border border-slate-800 px-2 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                            title="Kelola Satuan Bertingkat"
                          >
                            <Layers size={13} />
                            Satuan
                          </button>
                          <button 
                            onClick={() => openEditModal(p)}
                            className="btn-arcade bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-800 p-1.5 rounded-lg transition-all cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button 
                            onClick={() => handleDelete(p.id)}
                            className="btn-arcade bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-400 p-1.5 rounded-lg transition-all cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-white border-2 border-slate-800 rounded-3xl max-w-md w-full shadow-[8px_8px_0px_#1E293B] p-6 relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute right-5 top-5 p-1 text-slate-500 hover:text-slate-900 rounded-full cursor-pointer"
            >
              <X size={20} />
            </button>

            <h2 className="text-base font-extrabold text-slate-900 font-display uppercase mb-4">
              {editingId ? "Ubah Data Produk" : "Tambah Produk Baru"}
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              {errorMsg && (
                <div className="bg-rose-50 border-2 border-rose-500 text-rose-900 p-3 rounded-xl text-xs font-mono font-bold">
                  Peringatan: {errorMsg}
                </div>
              )}

              {/* Input: Nama */}
              <div className="space-y-1">
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase">Nama Produk *</label>
                <input 
                  type="text" 
                  id="prod-name-input"
                  value={nama} 
                  onChange={(e) => {
                    setNama(e.target.value);
                    registerTrigger("prod-name-input", "input");
                  }}
                  placeholder="Contoh: LM Jeruk Nipis Madu 500ml"
                  className="w-full h-11 bg-slate-50 border-2 border-slate-800 rounded-xl px-3 text-sm font-sans font-medium text-slate-900 focus:ring-2 focus:ring-[#CCFF00] outline-none transition-all"
                />
              </div>

              {/* Input: Tipe */}
              <div className="space-y-1">
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase">Kategori Produk</label>
                <select
                  id="prod-type-select"
                  value={tipe}
                  onChange={(e) => setTipe(e.target.value)}
                  className="w-full h-11 bg-slate-50 border-2 border-slate-800 rounded-xl px-3 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#CCFF00] outline-none transition-all"
                >
                  {categories.length === 0 && (
                    <option value="LM">LM — Langsung Minum</option>
                  )}
                  {categories.map(cat => (
                    <option key={cat.code} value={cat.code}>{cat.code} — {cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Input: Harga Jual (Base) */}
              <div className="space-y-1">
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase">Harga Jual Dasar (Base Price) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">Rp</span>
                  <input 
                    type="number" 
                    id="prod-base-price-input"
                    value={hargaBase} 
                    onChange={(e) => {
                      setHargaBase(e.target.value);
                      registerTrigger("prod-base-price-input", "input");
                    }}
                    placeholder="Contoh: 15000"
                    className="w-full h-11 bg-slate-50 border-2 border-slate-800 rounded-xl pl-9 pr-3 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#CCFF00] outline-none transition-all"
                  />
                </div>
                {parseInt(hargaBase) > 0 && (
                  <p className="text-[11px] font-mono text-slate-600 mt-1">
                    {getTerbacaRupiah(hargaBase)}
                  </p>
                )}
              </div>

              {/* Input: Harga Modal */}
              <div className="space-y-1">
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase flex items-center">
                  Harga Modal Beli (HPP) *
                  <ContextualTooltip id="tip-form-modal" content="Harga modal beli barang dari supplier. Digunakan untuk menghitung laba bersih." />
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">Rp</span>
                  <input 
                    type="number" 
                    id="prod-modal-price-input"
                    value={hargaModal} 
                    onChange={(e) => {
                      setHargaModal(e.target.value);
                      registerTrigger("prod-modal-price-input", "input");
                    }}
                    placeholder="Contoh: 8000"
                    className="w-full h-11 bg-slate-50 border-2 border-slate-800 rounded-xl pl-9 pr-3 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#CCFF00] outline-none transition-all"
                  />
                </div>
                {parseInt(hargaModal) > 0 && (
                  <p className="text-[11px] font-mono text-slate-600 mt-1">
                    {getTerbacaRupiah(hargaModal)}
                  </p>
                )}
              </div>

              {/* Input: Stok & Barcode Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-mono font-bold text-slate-700 uppercase">Stok Awal (Unit) *</label>
                  <input 
                    type="number" 
                    value={stock} 
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="50"
                    className="w-full h-11 bg-slate-50 border-2 border-slate-800 rounded-xl px-3 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#CCFF00] outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-mono font-bold text-slate-700 uppercase">Batas Stok Kritis</label>
                  <input 
                    type="number" 
                    value={reorderThreshold} 
                    onChange={(e) => setReorderThreshold(e.target.value)}
                    placeholder="5"
                    className="w-full h-11 bg-slate-50 border-2 border-slate-800 rounded-xl px-3 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#CCFF00] outline-none transition-all"
                  />
                </div>
              </div>

              {/* Input: Barcode */}
              <div className="space-y-1">
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase flex items-center gap-1">
                  <Barcode size={13} /> Barcode / SKU (Opsional)
                </label>
                <input 
                  type="text" 
                  value={barcode} 
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Scan barcode (Contoh: 8992388100404)"
                  className="w-full h-11 bg-slate-50 border-2 border-slate-800 rounded-xl px-3 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-[#CCFF00] outline-none transition-all"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="btn-arcade flex-1 border-2 border-slate-800 text-slate-700 font-mono font-bold text-xs uppercase h-11 rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  id="prod-save-btn"
                  className="btn-arcade flex-1 bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] font-mono font-bold text-xs uppercase h-11 rounded-xl cursor-pointer"
                >
                  {editingId ? "Simpan Perubahan" : "Tambah Produk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Stock Modal */}
      {quickStockProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 border-2 border-slate-800 shadow-[8px_8px_0px_#1E293B] animate-slide-in">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 font-display uppercase flex items-center gap-2">
                <Package size={16} /> Restok Cepat Produk
              </h3>
              <button 
                onClick={() => setQuickStockProduct(null)}
                className="text-slate-400 hover:text-slate-900 font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-0.5">
              <h4 className="font-bold text-sm text-slate-900 font-sans uppercase">{quickStockProduct.nama}</h4>
              <p className="text-xs font-mono text-slate-600">Stok Saat Ini: <strong className="text-slate-900 font-bold">{quickStockProduct.stock || 0} Pcs</strong></p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-mono font-bold text-slate-700 uppercase">Jumlah Tambah Stok (Pcs):</label>
              <input 
                type="number" 
                value={stockToAdd} 
                onChange={(e) => setStockToAdd(e.target.value)}
                placeholder="10"
                className="w-full bg-slate-50 border-2 border-slate-800 rounded-xl px-3 py-2 text-sm font-bold font-mono text-slate-900 focus:ring-2 focus:ring-[#CCFF00] outline-none"
              />

              {/* Quick Preset Buttons */}
              <div className="flex gap-2 pt-1">
                {[10, 20, 50, 100].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setStockToAdd(val.toString())}
                    className="btn-arcade flex-1 bg-slate-100 hover:bg-[#CCFF00] border border-slate-800 text-slate-900 text-xs font-mono font-bold py-1.5 rounded-lg transition-all cursor-pointer"
                  >
                    +{val}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="button"
                onClick={() => setQuickStockProduct(null)}
                className="btn-arcade flex-1 border-2 border-slate-800 text-slate-700 font-mono font-bold text-xs uppercase py-2.5 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button 
                type="button"
                onClick={handleQuickStockAdd}
                className="btn-arcade flex-1 bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] font-mono font-bold text-xs uppercase py-2.5 rounded-xl cursor-pointer"
              >
                Simpan Stok
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modals */}
      <ConfirmModal
        isOpen={showPriceWarning}
        title="Peringatan Harga Modal"
        message="Peringatan: Harga Modal lebih besar dari Harga Jual. Apakah Anda yakin ingin melanjutkan?"
        onConfirm={async () => {
          setShowPriceWarning(false);
          if (pendingPayload) {
            try {
              if (editingId) {
                await api.updateProduct(editingId, pendingPayload);
              } else {
                await api.addProduct(pendingPayload);
              }
              setIsModalOpen(false);
              setPendingPayload(null);
              await loadProducts();
            } catch (err) {
              setErrorMsg(err.message || "Gagal menyimpan produk.");
            }
          }
        }}
        onCancel={() => {
          setShowPriceWarning(false);
          setPendingPayload(null);
        }}
        confirmLabel="YA, SIMPAN"
        cancelLabel="BATAL"
      />

      <ConfirmModal
        isOpen={deleteProductId !== null}
        title="Hapus Produk"
        message="Apakah Anda yakin ingin menghapus produk ini? Data transaksi lama yang mencatat produk ini tidak akan berubah."
        onConfirm={async () => {
          const id = deleteProductId;
          setDeleteProductId(null);
          try {
            await api.deleteProduct(id);
            await loadProducts();
          } catch (err) {
            setGeneralError(err.message || "Gagal menghapus produk.");
          }
        }}
        onCancel={() => setDeleteProductId(null)}
        confirmLabel="YA, HAPUS"
        cancelLabel="BATAL"
      />

      {/* Fase 1 Modals */}
      <UnitConversionModal
        product={selectedUnitProduct}
        isOpen={isUnitModalOpen}
        onClose={() => {
          setIsUnitModalOpen(false);
          setSelectedUnitProduct(null);
        }}
        onUpdated={async () => {
          await loadProducts();
        }}
      />

      <StockInModal
        isOpen={isStockInModalOpen}
        initialProduct={selectedProduct}
        onClose={() => {
          setIsStockInModalOpen(false);
        }}
        onStockAdded={async () => {
          await loadProducts();
        }}
      />
    </div>
  );
}
