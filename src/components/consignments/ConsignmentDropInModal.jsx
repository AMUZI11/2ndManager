"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PackagePlus, User, Store, DollarSign, X, CheckCircle2,
  AlertCircle, Sparkles, Plus, RefreshCw
} from 'lucide-react';
import { api } from '@/utils/api';

export default function ConsignmentDropInModal({
  isOpen,
  onClose,
  onSuccess,
  products = [],
  vendors = [],
  onReloadVendors,
}) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Mode vendor: 'SELECT' or 'NEW'
  const [isAddingVendor, setIsAddingVendor] = useState(false);
  const [newVendorNama, setNewVendorNama] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');

  // Form states
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [useExistingProduct, setUseExistingProduct] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [receivedQty, setReceivedQty] = useState('20');
  const [vendorPrice, setVendorPrice] = useState('1500');
  const [sellingPrice, setSellingPrice] = useState('2000');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setIsAddingVendor(false);
      if (vendors.length > 0) setSelectedVendorId(vendors[0].id);
      if (products.length > 0) setSelectedProductId(products[0].id);
    }
  }, [isOpen, vendors, products]);

  if (!isOpen) return null;

  const numQty = parseInt(receivedQty, 10) || 0;
  const numVendorPrice = parseInt(vendorPrice, 10) || 0;
  const numSellingPrice = parseInt(sellingPrice, 10) || 0;
  const marginPerUnit = numSellingPrice - numVendorPrice;
  const potentialProfit = marginPerUnit * numQty;
  const potentialPayout = numVendorPrice * numQty;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    let finalVendorId = selectedVendorId;

    setLoading(true);
    try {
      // 1. Jika mode tambah vendor baru aktif, buat vendor terlebih dahulu
      if (isAddingVendor) {
        if (!newVendorNama.trim()) {
          throw new Error('Nama vendor titip jual wajib diisi.');
        }
        const createdVendor = await api.createConsignmentVendor({
          nama_vendor: newVendorNama.trim(),
          phone: newVendorPhone.trim() || null,
        });
        finalVendorId = createdVendor.id;
        if (onReloadVendors) onReloadVendors();
      }

      if (!finalVendorId) {
        throw new Error('Pilih atau buat vendor titip jual.');
      }

      const payload = {
        vendor_id: finalVendorId,
        received_qty: numQty,
        vendor_price_per_unit: numVendorPrice,
        selling_price_per_unit: numSellingPrice,
        notes: notes.trim() || null,
      };

      if (useExistingProduct && selectedProductId) {
        payload.product_id = selectedProductId;
      } else {
        if (!newProductName.trim()) {
          throw new Error('Nama barang titipan baru wajib diisi.');
        }
        payload.product_name = newProductName.trim();
      }

      await api.createConsignmentBatch(payload);

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Gagal mencatat penerimaan konsinyasi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 20, opacity: 0 }}
          className="bg-white rounded-2xl max-w-lg w-full shadow-[8px_8px_0px_#1E293B] border-2 border-slate-800 overflow-hidden flex flex-col font-sans"
        >
          {/* Header */}
          <div className="bg-slate-900 text-[#CCFF00] p-4 flex items-center justify-between border-b-2 border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#CCFF00]/20 flex items-center justify-center border border-[#CCFF00]/40">
                <PackagePlus size={18} className="text-[#CCFF00]" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wider font-mono">
                  Buku Konsinyasi: Titip Masuk (Drop-In)
                </h3>
                <p className="text-[11px] text-white/70 font-sans">
                  Catat barang titipan tanpa keluar modal kas di awal
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border-2 border-rose-500 rounded-xl text-rose-800 text-xs font-mono font-bold flex items-center gap-2">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Vendor Selection */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-mono font-bold text-slate-800 uppercase">
                  Vendor Titip Jual
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingVendor(!isAddingVendor)}
                  className="text-[11px] font-mono text-indigo-700 hover:text-indigo-900 font-bold underline cursor-pointer"
                >
                  {isAddingVendor ? '← Pilih Vendor Ada' : '+ Vendor Baru'}
                </button>
              </div>

              {isAddingVendor ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-slate-50 border-2 border-slate-800 rounded-xl">
                  <div>
                    <label className="text-[10px] font-mono font-bold text-slate-600 block mb-1">
                      Nama Vendor *
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Bu Sri Gorengan"
                      value={newVendorNama}
                      onChange={(e) => setNewVendorNama(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold text-slate-600 block mb-1">
                      No. WhatsApp (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="08123456789"
                      value={newVendorPhone}
                      onChange={(e) => setNewVendorPhone(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              ) : (
                <select
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-800 rounded-xl text-xs font-bold text-slate-900"
                  required
                >
                  <option value="" disabled>-- Pilih Vendor --</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nama_vendor} {v.phone ? `(${v.phone})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Product Selection / New */}
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setUseExistingProduct(true)}
                  className={`flex-1 py-1.5 text-xs font-mono font-bold rounded-lg border-2 transition ${
                    useExistingProduct ? 'bg-slate-900 text-[#CCFF00] border-slate-900' : 'bg-white text-slate-600 border-slate-300'
                  }`}
                >
                  Produk Ada di Warung
                </button>
                <button
                  type="button"
                  onClick={() => setUseExistingProduct(false)}
                  className={`flex-1 py-1.5 text-xs font-mono font-bold rounded-lg border-2 transition ${
                    !useExistingProduct ? 'bg-slate-900 text-[#CCFF00] border-slate-900' : 'bg-white text-slate-600 border-slate-300'
                  }`}
                >
                  + Produk Titipan Baru
                </button>
              </div>

              {useExistingProduct ? (
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-800 rounded-xl text-xs font-bold text-slate-900"
                >
                  <option value="" disabled>-- Pilih Produk Toko --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama} (Stok saat ini: {p.stock || 0})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Nama Produk Baru (contoh: Donat Keju Bu RT)"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border-2 border-slate-800 rounded-xl text-xs font-bold text-slate-900"
                  required
                />
              )}
            </div>

            {/* Quantities and Prices */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-mono font-bold text-slate-700 block mb-1 uppercase">
                  Jumlah Titip (Pcs)
                </label>
                <input
                  type="number"
                  min="1"
                  value={receivedQty}
                  onChange={(e) => setReceivedQty(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-800 rounded-xl text-sm font-mono font-bold text-slate-900 text-center"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-mono font-bold text-slate-700 block mb-1 uppercase">
                  Harga Setor Vendor
                </label>
                <input
                  type="number"
                  min="0"
                  value={vendorPrice}
                  onChange={(e) => setVendorPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-800 rounded-xl text-sm font-mono font-bold text-slate-900 text-center"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-mono font-bold text-slate-700 block mb-1 uppercase">
                  Harga Jual Kasir
                </label>
                <input
                  type="number"
                  min="0"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-800 rounded-xl text-sm font-mono font-bold text-slate-900 text-center"
                  required
                />
              </div>
            </div>

            {/* Live Financial Projection Card */}
            <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Margin Warung / Pcs:</span>
                <span className={`font-bold ${marginPerUnit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  Rp {marginPerUnit.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Estimasi Setor Vendor:</span>
                <span>Rp {potentialPayout.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-slate-900">
                <span>Potensi Keuntungan Bersih:</span>
                <span className="text-emerald-800">Rp {potentialProfit.toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <input
                type="text"
                placeholder="Catatan tambahan (misal: titip pagi jam 06:00)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-sans"
              />
            </div>

            {/* Footer */}
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-mono font-bold text-slate-600 hover:text-slate-900"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-arcade px-5 py-2.5 bg-[#CCFF00] hover:bg-[#b3e600] disabled:opacity-50 text-slate-900 font-extrabold text-xs font-mono uppercase rounded-xl border-2 border-slate-800 shadow-[3px_3px_0_#1E293B] flex items-center gap-2 cursor-pointer"
              >
                {loading ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                Simpan &amp; Tambah Stok
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
