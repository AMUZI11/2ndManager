"use client";
import React, { useState, useEffect } from 'react';
import { X, PackagePlus, AlertTriangle, ArrowUpRight, TrendingDown, Check, Sparkles, History, Layers } from 'lucide-react';
import { api } from '@/utils/api';
import UpgradePromptModal from '@/components/pos/UpgradePromptModal';

export default function StockInModal({ isOpen, onClose, onStockAdded, initialProduct = null }) {
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [totalSpend, setTotalSpend] = useState("");
  const [autoReprice, setAutoReprice] = useState(false);
  const [printLabelQueue, setPrintLabelQueue] = useState(false);
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [historyList, setHistoryList] = useState([]);

  // Paywall modal
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeModalData, setUpgradeModalData] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadProducts();
      setErrorMsg("");
      setSuccessMsg("");
      if (initialProduct) {
        setSelectedProductId(initialProduct.id);
      }
    }
  }, [isOpen, initialProduct]);

  useEffect(() => {
    if (selectedProductId && products.length > 0) {
      const prod = products.find(p => p.id === selectedProductId);
      setSelectedProduct(prod || null);
      if (prod && prod.product_units && prod.product_units.length > 0) {
        // Default to largest unit if available, or base unit
        const sorted = [...prod.product_units].sort((a, b) => b.multiplier_to_base - a.multiplier_to_base);
        setSelectedUnitId(sorted[0].id);
      }
      loadHistory(selectedProductId);
    }
  }, [selectedProductId, products]);

  async function loadProducts() {
    try {
      const list = await api.getProducts();
      setProducts(list || []);
      if (!selectedProductId && list?.length > 0 && !initialProduct) {
        setSelectedProductId(list[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function loadHistory(prodId) {
    try {
      const hist = await api.getStockInHistory(prodId, 5);
      setHistoryList(hist || []);
    } catch (err) {
      console.error(err);
    }
  }

  // Active unit calculation
  const currentUnit = selectedProduct?.product_units?.find(u => u.id === selectedUnitId) || {
    unit_name: 'Pcs',
    multiplier_to_base: 1,
    price: selectedProduct?.harga_base || 0,
  };

  const multiplier = currentUnit.multiplier_to_base || 1;
  const qtyNum = parseInt(quantity, 10) || 0;
  const spendNum = parseInt(totalSpend, 10) || 0;
  const baseQtyTotal = qtyNum * multiplier;

  const previousHPP = Number(selectedProduct?.harga_modal) || 0;
  const newHPP = baseQtyTotal > 0 && spendNum > 0 ? Math.round(spendNum / baseQtyTotal) : previousHPP;
  const isHPPIncreased = spendNum > 0 && newHPP > previousHPP;

  const currentPrice = Number(selectedProduct?.harga_base) || 0;
  const prevMarginPct = currentPrice > 0 ? (((currentPrice - previousHPP) / currentPrice) * 100).toFixed(1) : 0;
  const newMarginPct = currentPrice > 0 ? (((currentPrice - newHPP) / currentPrice) * 100).toFixed(1) : 0;

  // Rekomendasi harga baru untuk mempertahankan margin awal
  const targetMargin = Math.max(15, parseFloat(prevMarginPct) || 20);
  const recommendedPrice = Math.ceil((newHPP / (1 - (targetMargin / 100))) / 500) * 500;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedProductId) {
      setErrorMsg("Pilih produk terlebih dahulu.");
      return;
    }
    if (qtyNum <= 0) {
      setErrorMsg("Jumlah pembelian harus lebih dari 0.");
      return;
    }
    if (spendNum <= 0) {
      setErrorMsg("Total uang kulakan harus lebih dari Rp 0.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");
      const res = await api.createStockIn({
        product_id: selectedProductId,
        unit_id: selectedUnitId || null,
        quantity: qtyNum,
        total_spend: spendNum,
        auto_reprice: autoReprice,
        notes: notes.trim() || undefined,
      });

      setSuccessMsg(`Kulakan berhasil dicatat! Stok atomik bertambah +${baseQtyTotal} Pcs.`);
      setQuantity("1");
      setTotalSpend("");
      setNotes("");
      setAutoReprice(false);

      if (onStockAdded) onStockAdded();
      await loadHistory(selectedProductId);
      await loadProducts();

      setTimeout(() => {
        setSuccessMsg("");
        onClose();
      }, 1500);
    } catch (err) {
      if (err.upgradeRequired) {
        setUpgradeModalData({
          message: err.message,
          featureName: 'Auto-Reprice 1-Klik',
        });
        setIsUpgradeModalOpen(true);
      } else {
        setErrorMsg(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white border-2 border-slate-900 shadow-[8px_8px_0px_#0f172a] w-full max-w-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b-2 border-slate-900 bg-emerald-400 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-6 h-6 text-slate-900" />
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">
                Catat Kulakan / Stok Masuk
              </h2>
              <p className="text-xs font-medium text-slate-800">
                Pembaruan saldo stok atomik & deteksi alarm proteksi margin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white border-2 border-slate-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-slate-900" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-100 border-2 border-red-900 text-red-900 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-100 border-2 border-emerald-900 text-emerald-900 text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Product & Unit Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black uppercase text-slate-900 block mb-1">
                Pilih Produk
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full p-2.5 text-xs border-2 border-slate-900 bg-white font-bold focus:outline-hidden focus:bg-amber-50"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nama} (Stok: {p.stock || 0} Pcs)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-slate-900 block mb-1">
                Satuan Pembelian (Kulakan)
              </label>
              <select
                value={selectedUnitId}
                onChange={(e) => setSelectedUnitId(e.target.value)}
                className="w-full p-2.5 text-xs border-2 border-slate-900 bg-amber-50 font-bold focus:outline-hidden"
              >
                {(selectedProduct?.product_units || []).map(u => (
                  <option key={u.id} value={u.id}>
                    {u.unit_name} (×{u.multiplier_to_base} Pcs)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Qty & Spend */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black uppercase text-slate-900 block mb-1">
                Jumlah Beli ({currentUnit.unit_name})
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
                required
                className="w-full p-2.5 text-xs border-2 border-slate-900 bg-white font-bold focus:outline-hidden focus:bg-amber-50"
                placeholder="Misal: 2"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Setara: <span className="font-bold text-slate-900">{baseQtyTotal} Pcs</span> eceran atomik
              </p>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-slate-900 block mb-1">
                Total Uang Modal Dibayar (Rp)
              </label>
              <input
                type="number"
                value={totalSpend}
                onChange={(e) => setTotalSpend(e.target.value)}
                min="0"
                required
                className="w-full p-2.5 text-xs border-2 border-slate-900 bg-white font-bold focus:outline-hidden focus:bg-amber-50"
                placeholder="Misal: 224000"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                HPP Eceran Baru: <span className="font-bold text-emerald-700">Rp {newHPP.toLocaleString('id-ID')}</span> / Pcs
              </p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-black uppercase text-slate-900 block mb-1">
              Catatan / No. Faktur Agen (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Grosir Makmur Jaya Bon #0881"
              className="w-full p-2 text-xs border-2 border-slate-900 bg-white focus:outline-hidden"
            />
          </div>

          {/* MARGIN GUARD ALERT BANNER (If HPP increased) */}
          {isHPPIncreased && (
            <div className="p-4 border-2 border-red-900 bg-red-50 space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black uppercase text-red-900">
                    🚨 Alarm Kenaikan HPP (Margin Drop Guard)
                  </h4>
                  <p className="text-xs text-red-800 mt-0.5 leading-relaxed">
                    HPP modal naik dari <span className="font-bold">Rp {previousHPP.toLocaleString('id-ID')}</span> → <span className="font-black text-red-900">Rp {newHPP.toLocaleString('id-ID')}</span> (+Rp {(newHPP - previousHPP).toLocaleString('id-ID')}).
                    <br />
                    Margin keuntungan Anda drop dari <span className="font-bold">{prevMarginPct}%</span> menjadi <span className="font-black text-red-900">{newMarginPct}%</span> jika harga tidak dinaikkan!
                  </p>
                </div>
              </div>

              <div className="p-3 bg-white border border-red-300 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-600 font-medium">Harga Jual Saat Ini</div>
                  <div className="text-xs font-bold line-through text-slate-400">
                    Rp {currentPrice.toLocaleString('id-ID')}
                  </div>
                </div>

                <ArrowUpRight className="w-4 h-4 text-emerald-600" />

                <div>
                  <div className="text-[11px] text-emerald-800 font-bold">Rekomendasi Pulihkan Margin</div>
                  <div className="text-sm font-black text-emerald-700">
                    Rp {recommendedPrice.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              {/* 1-Click Auto Reprice Option */}
              <div className="space-y-2 pt-1 border-t border-red-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoReprice}
                    onChange={(e) => setAutoReprice(e.target.checked)}
                    className="w-4 h-4 accent-slate-900"
                  />
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Terapkan 1-Click Auto-Reprice ke Semua Satuan
                  </span>
                </label>
                <p className="text-[10px] text-slate-500 ml-6">
                  Sistem otomatis menyesuaikan harga jual eceran dan dus/renceng untuk menjaga margin keuntungan warung.
                </p>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printLabelQueue}
                    onChange={(e) => setPrintLabelQueue(e.target.checked)}
                    className="w-4 h-4 accent-slate-900"
                  />
                  <span className="text-xs font-bold text-slate-700">
                    🏷️ Masukkan ke antrean cetak ulang label rak toko
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider border-2 border-slate-900 cursor-pointer shadow-[4px_4px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2"
          >
            <PackagePlus className="w-4 h-4 text-emerald-400" />
            {loading ? "Menyimpan Kulakan..." : "Simpan Kulakan & Tambah Stok"}
          </button>

          {/* Recent History Table */}
          {historyList.length > 0 && (
            <div className="pt-3 border-t-2 border-slate-900">
              <div className="flex items-center gap-1 mb-2">
                <History className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-black uppercase text-slate-900 tracking-wider">
                  Riwayat Kulakan Produk Ini
                </span>
              </div>
              <div className="border border-slate-300 divide-y divide-slate-200 text-xs bg-slate-50">
                {historyList.map(h => (
                  <div key={h.id} className="p-2 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-900">+{h.quantity_units} {h.unit_name}</span>
                      <span className="text-slate-500 ml-1">({h.quantity_base} Pcs)</span>
                      <div className="text-[10px] text-slate-400">
                        {new Date(h.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} • {h.notes || 'Restock'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-slate-900">Rp {Number(h.total_spend || 0).toLocaleString('id-ID')}</div>
                      <div className="text-[10px] text-slate-500">HPP: Rp {h.new_cost}/pcs</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Paywall Upgrade Modal */}
      <UpgradePromptModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        data={upgradeModalData}
      />
    </div>
  );
}
