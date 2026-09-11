"use client";
import React, { useState, useEffect } from 'react';
import { formatRupiah, getTerbacaRupiah } from '@/utils/format';
import { Plus, Edit2, Trash2, X, Search, Package, Tags, ChevronRight } from 'lucide-react';
import { api } from '../utils/api';
import ConfirmModal from '../components/ConfirmModal';
import { useTutorial, ContextualTooltip } from '../components/TutorialEngine';
import { TableSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';



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
  
  const [errorMsg, setErrorMsg] = useState("");
  const [generalError, setGeneralError] = useState("");
  
  // Custom Modals State
  const [deleteProductId, setDeleteProductId] = useState(null);
  const [showPriceWarning, setShowPriceWarning] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);

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
      const data = await api.getProducts(null, { page_size: 9999 });
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

    if (isNaN(basePrice) || basePrice < 0 || isNaN(modalPrice) || modalPrice < 0) {
      setErrorMsg("Harga Jual dan Harga Modal harus berupa angka ≥ 0.");
      return;
    }

    if (modalPrice > basePrice && !bypassWarning) {
      setPendingPayload({
        nama,
        harga_base: basePrice,
        harga_modal: modalPrice,
        tipe
      });
      setShowPriceWarning(true);
      return;
    }

    const payload = {
      nama,
      harga_base: basePrice,
      harga_modal: modalPrice,
      tipe
    };

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

  const handleDelete = (id) => {
    setDeleteProductId(id);
  };

  // Filter & Search Logic
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.nama.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "ALL" || p.tipe === typeFilter;
    return matchesSearch && matchesType;
  });



  if (loading) {
    return <TableSkeleton rows={5} />;
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white rounded-2xl p-6 border border-gray-100 shadow-sm gap-4">
        <div>
          <h1 className="text-hero text-xl">Katalog Produk</h1>
          <p className="text-gray-500 text-xs mt-1">Daftar minuman dan produk yang dijual beserta harga modal rahasia dan harga jual dasar.</p>
        </div>
        <button 
          id="prod-add-btn"
          onClick={openAddModal}
          className="bg-cta hover:bg-cta/90 text-primary font-bold text-sm h-12 px-5 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer font-mono"
        >
          <Plus size={18} /> Produk Baru
        </button>
      </div>

      {generalError && (
        <div className="bg-rose-light border border-rose-medium text-rose-deep p-4 rounded-2xl text-sm font-semibold flex items-center justify-between">
          <span>Peringatan: {generalError}</span>
          <button onClick={() => setGeneralError("")} className="text-rose-deep font-bold hover:underline cursor-pointer">Tutup</button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3 items-center">
        {/* Search Input */}
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <Search size={18} />
          </span>
          <input 
            type="text" 
            placeholder="Cari nama produk..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 bg-gray-50 border-2 border-gray-200 rounded-xl pl-12 pr-4 text-sm focus:border-navy-bright focus:bg-white outline-none transition-all"
          />
        </div>

        {/* Segmented Filter — dynamic categories */}
        <div className="flex bg-gray-100 p-1.5 rounded-xl border border-gray-200/50 flex-wrap gap-0.5">
          <button 
            onClick={() => setTypeFilter("ALL")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              typeFilter === "ALL" ? "bg-white text-navy-deep shadow-sm" : "text-gray-500 hover:text-charcoal-medium"
            }`}
          >
            Semua
          </button>
          {categories.map(cat => (
            <button 
              key={cat.code}
              onClick={() => setTypeFilter(cat.code)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                typeFilter === cat.code ? "bg-navy-deep text-white shadow-sm" : "text-gray-500 hover:text-charcoal-medium"
              }`}
            >
              {cat.name} ({cat.code})
            </button>
          ))}
        </div>

        {/* Category Management Button */}
        <button
          onClick={() => setShowCatPanel(v => !v)}
          className="flex items-center gap-2 h-10 px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-xl transition-all border border-gray-200"
          title="Kelola Kategori"
        >
          <Tags size={15} />
          Kategori
          <ChevronRight size={13} className={`transition-transform ${showCatPanel ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {/* Category Management Panel */}
      {showCatPanel && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-charcoal-black flex items-center gap-2"><Tags size={15}/> Manajemen Kategori Produk</h3>
          {catError && <p className="text-rose-deep text-xs font-semibold bg-rose-light p-2 rounded-lg">{catError}</p>}

          {/* Existing categories */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {categories.map(cat => (
              <div key={cat.code} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                <div>
                  <span className="font-bold text-xs text-navy-deep">{cat.code}</span>
                  <span className="text-gray-500 text-xs ml-2">{cat.name}</span>
                </div>
                {!['LM','BR'].includes(cat.code) && (
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
                    className="text-rose-deep hover:text-white hover:bg-rose-deep p-1 rounded-lg transition-all"
                    title="Hapus kategori"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add new category form */}
          <div className="flex gap-2 items-end">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Kode (maks 50 huruf)</label>
              <input
                type="text"
                value={newCatCode}
                onChange={e => setNewCatCode(e.target.value.toUpperCase())}
                placeholder="Contoh: PR"
                maxLength={50}
                className="h-10 w-28 bg-gray-50 border-2 border-gray-200 rounded-xl px-3 text-sm font-bold focus:border-navy-bright outline-none transition-all"
              />
            </div>
            <div className="space-y-1 flex-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Nama Kategori</label>
              <input
                type="text"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="Contoh: Premium Rasa"
                className="h-10 w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-3 text-sm focus:border-navy-bright outline-none transition-all"
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
              className="h-10 px-4 bg-cta hover:bg-cta/90 text-primary font-bold text-xs rounded-xl transition-all shadow-sm whitespace-nowrap"
            >
              + Tambah
            </button>
          </div>
          <p className="text-xs text-gray-400">Kategori default (LM, BR) tidak bisa dihapus. Kategori hanya bisa dihapus jika tidak ada produk aktif yang menggunakannya.</p>
        </div>
      )}

      {/* Product List Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {products.length === 0 ? (
            <EmptyState 
              icon={Package}
              title="Katalog Produk Kosong"
              message="Bapak/Ibu belum memasukkan produk apa pun ke dalam sistem."
              actionLabel="Tambah Produk Baru"
              onAction={openAddModal}
            />
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-[#6B4F3A] font-semibold text-sm bg-[#FAF7F0] border border-[#E8DCC8] rounded-3xl p-6">
              Produk dengan pencarian &quot;{searchQuery}&quot; tidak ditemukan.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase font-bold">
                  <th className="p-4 pl-6">Nama Produk</th>
                  <th className="p-4">Tipe</th>
                  <th className="p-4 text-right">Harga Jual (Base)</th>
                  <th className="p-4 text-right flex items-center justify-end gap-1">
                    Harga Modal
                    <ContextualTooltip id="tip-modal-cost" content="Harga modal rahasia Anda. Hanya digunakan untuk menghitung keuntungan bersih (laba) di sistem, tidak akan dicetak di bon pelanggan." />
                  </th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-all">
                    <td className="p-4 pl-6 font-semibold text-charcoal-black flex items-center gap-3">
                      <div className={`p-2 rounded-lg text-xs font-bold ${
                        p.tipe === 'LM' ? 'bg-navy-light text-navy-deep' : 'bg-emerald-mint text-emerald-deep'
                      }`}>
                        <Package size={16} />
                      </div>
                      {p.nama}
                    </td>
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold ${
                        p.tipe === 'LM' ? 'bg-navy-light text-navy-deep border border-navy-ice' 
                        : p.tipe === 'BR' ? 'bg-emerald-mint text-emerald-deep border border-emerald-mint'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {p.tipe}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold tabular-nums">{formatRupiah(p.harga_base)}</td>
                    <td className="p-4 text-right text-gray-500 font-semibold tabular-nums italic bg-gray-50/20">{formatRupiah(p.harga_modal)}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => openEditModal(p)}
                          className="bg-navy-ice hover:bg-navy-bright hover:text-white text-navy-deep p-2 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(p.id)}
                          className="bg-rose-light hover:bg-rose-medium hover:text-white text-rose-deep p-2 rounded-lg transition-all cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-[#FAF7F0] border-4 border-[#E8DCC8] rounded-3xl max-w-md w-full shadow-2xl p-6 relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute right-6 top-6 p-1 text-gray-400 hover:bg-gray-100 rounded-full"
            >
              <X size={20} />
            </button>

            <h2 className="text-heading text-lg mb-4">
              {editingId ? "Ubah Data Produk" : "Tambah Produk Baru"}
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              {errorMsg && (
                <div className="bg-rose-light text-rose-deep p-3 rounded-xl text-xs font-semibold">
                  Peringatan: {errorMsg}
                </div>
              )}

              {/* Input: Nama */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-charcoal-medium uppercase">Nama Produk *</label>
                <input 
                  type="text" 
                  id="prod-name-input"
                  value={nama} 
                  onChange={(e) => {
                    setNama(e.target.value);
                    registerTrigger("prod-name-input", "input");
                  }}
                  placeholder="Contoh: LM Jeruk Nipis Madu 500ml"
                  className="w-full h-12 bg-gray-50 border-2 border-gray-200 rounded-xl px-4 text-sm focus:border-navy-bright focus:bg-white outline-none transition-all"
                />
              </div>

              {/* Input: Tipe */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-charcoal-medium uppercase">Kategori Produk</label>
                <select
                  id="prod-type-select"
                  value={tipe}
                  onChange={(e) => setTipe(e.target.value)}
                  className="w-full h-12 bg-gray-50 border-2 border-gray-200 rounded-xl px-4 text-sm focus:border-navy-bright focus:bg-white outline-none transition-all font-semibold"
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
              <div className="space-y-2">
                <label className="block text-xs font-bold text-charcoal-medium uppercase">Harga Jual Dasar (Base Price) *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">Rp</span>
                  <input 
                    type="number" 
                    id="prod-base-price-input"
                    value={hargaBase} 
                    onChange={(e) => {
                      setHargaBase(e.target.value);
                      registerTrigger("prod-base-price-input", "input");
                    }}
                    placeholder="Contoh: 15000"
                    className="w-full h-12 bg-gray-50 border-2 border-gray-200 rounded-xl pl-10 pr-4 text-sm focus:border-navy-bright focus:bg-white outline-none transition-all font-semibold"
                  />
                </div>
                {parseInt(hargaBase) > 0 && (
                  <p className="text-[11px] font-extrabold text-[#C97B1A] mt-1.5 animate-slide-in">
                    {getTerbacaRupiah(hargaBase)}
                  </p>
                )}
              </div>

              {/* Input: Harga Modal */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-charcoal-medium uppercase flex items-center">
                  Harga Modal (Beli Supplier) *
                  <ContextualTooltip id="tip-form-modal" content="Harga modal beli barang. Dipakai menghitung keuntungan bersih Anda secara otomatis." />
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">Rp</span>
                  <input 
                    type="number" 
                    id="prod-modal-price-input"
                    value={hargaModal} 
                    onChange={(e) => {
                      setHargaModal(e.target.value);
                      registerTrigger("prod-modal-price-input", "input");
                    }}
                    placeholder="Contoh: 8000"
                    className="w-full h-12 bg-gray-50 border-2 border-gray-200 rounded-xl pl-10 pr-4 text-sm focus:border-navy-bright focus:bg-white outline-none transition-all font-semibold"
                  />
                </div>
                {parseInt(hargaModal) > 0 && (
                  <p className="text-[11px] font-extrabold text-[#C97B1A] mt-1.5 animate-slide-in">
                    {getTerbacaRupiah(hargaModal)}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 border-2 border-gray-200 text-charcoal-medium font-bold h-12 rounded-xl text-sm hover:bg-gray-50 cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  id="prod-save-btn"
                  className="flex-1 bg-[#C97B1A] hover:bg-[#A85F10] text-white font-bold h-12 rounded-xl text-sm shadow-md cursor-pointer font-mono"
                >
                  {editingId ? "Simpan Perubahan" : "Tambah Produk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modals */}
      <ConfirmModal
        isOpen={showPriceWarning}
        title="Peringatan Harga Modal"
        message="Peringatan: Harga Modal lebih besar dari Harga Jual. Apakah Bapak/Ibu yakin ingin melanjutkan?"
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
        message="Apakah Bapak/Ibu yakin ingin menghapus produk ini? Data transaksi lama yang mencatat produk ini tidak akan berubah."
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
    </div>
  );
}
