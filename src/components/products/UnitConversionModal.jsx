"use client";
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Layers, AlertTriangle, Sparkles, Check, Barcode } from 'lucide-react';
import { api } from '@/utils/api';
import UpgradePromptModal from '@/components/pos/UpgradePromptModal';

export default function UnitConversionModal({ product, isOpen, onClose, onUpdated }) {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // New unit form state
  const [unitName, setUnitName] = useState("");
  const [multiplier, setMultiplier] = useState("");
  const [price, setPrice] = useState("");
  const [barcode, setBarcode] = useState("");

  // Paywall modal state
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeModalData, setUpgradeModalData] = useState(null);

  useEffect(() => {
    if (isOpen && product?.id) {
      loadUnits();
      setErrorMsg("");
      setSuccessMsg("");
    }
  }, [isOpen, product]);

  async function loadUnits() {
    try {
      setLoading(true);
      const res = await api.getProductUnits(product.id);
      setUnits(res || []);
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal memuat daftar satuan.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddUnit(e) {
    if (e) e.preventDefault();
    if (!unitName.trim()) {
      setErrorMsg("Nama satuan wajib diisi.");
      return;
    }
    const multNum = parseInt(multiplier, 10);
    if (isNaN(multNum) || multNum <= 1) {
      setErrorMsg("Pengali harus lebih dari 1 (misal 10 untuk 1 Renceng = 10 Pcs).");
      return;
    }
    const priceNum = parseInt(price, 10);
    if (isNaN(priceNum) || priceNum < 0) {
      setErrorMsg("Harga jual satuan wajib diisi.");
      return;
    }

    if (units.length >= 4) {
      setErrorMsg("Maksimal 4 tingkat konversi satuan per produk.");
      return;
    }

    try {
      setErrorMsg("");
      setLoading(true);
      await api.addProductUnit(product.id, {
        unit_name: unitName.trim(),
        multiplier_to_base: multNum,
        price: priceNum,
        barcode: barcode.trim() || null,
        is_base_unit: false,
      });

      setUnitName("");
      setMultiplier("");
      setPrice("");
      setBarcode("");
      setSuccessMsg("Satuan berhasil ditambahkan!");
      setTimeout(() => setSuccessMsg(""), 3000);
      await loadUnits();
      if (onUpdated) onUpdated();
    } catch (err) {
      if (err.upgradeRequired) {
        setUpgradeModalData({
          message: err.message,
          featureName: 'Multi-Satuan Bertingkat',
          currentCount: 15,
          maxAllowed: 15,
        });
        setIsUpgradeModalOpen(true);
      } else {
        setErrorMsg(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteUnit(unitId, isBase) {
    if (isBase) return;
    if (!confirm("Yakin ingin menghapus tingkatan satuan ini?")) return;
    try {
      setLoading(true);
      await api.deleteProductUnit(product.id, unitId);
      await loadUnits();
      if (onUpdated) onUpdated();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Quick Presets
  function applyPreset(type) {
    const baseModal = Number(product?.harga_modal) || 0;
    const basePrice = Number(product?.harga_base) || 0;

    if (type === 'ROKOK') {
      setUnitName("Slop");
      setMultiplier("10");
      setPrice(String(basePrice * 10 * 0.98)); // Sedikit diskon grosir
    } else if (type === 'KOPI') {
      setUnitName("Renceng");
      setMultiplier("10");
      setPrice(String(basePrice * 10 * 0.95));
    } else if (type === 'MIE') {
      setUnitName("Dus");
      setMultiplier("40");
      setPrice(String(basePrice * 40 * 0.93));
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white border-2 border-slate-900 shadow-[8px_8px_0px_#0f172a] w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b-2 border-slate-900 bg-amber-300 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Layers className="w-6 h-6 text-slate-900" />
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">
                Konversi Satuan: {product?.nama}
              </h2>
              <p className="text-xs font-medium text-slate-700">
                Stok dasar atomik: <span className="font-bold text-slate-900">{product?.stock || 0} Pcs</span> | Modal Dasar: <span className="font-bold text-slate-900">Rp {Number(product?.harga_modal || 0).toLocaleString('id-ID')}</span>
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

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
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

          {/* Current Units List */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-black uppercase text-slate-900 tracking-wider">
                Tingkatan Satuan Aktif ({units.length}/4)
              </label>
              <span className="text-[11px] text-slate-500 font-medium">Satuan terbesar ke terkecil</span>
            </div>

            <div className="border-2 border-slate-900 divide-y-2 divide-slate-900 bg-slate-50">
              {units.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 font-medium">
                  Belum ada satuan. Satuan dasar default adalah "Pcs".
                </div>
              ) : (
                units.map((u) => {
                  const unitCost = (Number(product?.harga_modal) || 0) * u.multiplier_to_base;
                  const marginPct = u.price > 0 ? (((u.price - unitCost) / u.price) * 100).toFixed(1) : 0;
                  return (
                    <div key={u.id} className="p-3 flex items-center justify-between bg-white hover:bg-amber-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 text-[11px] font-black uppercase border border-slate-900 ${u.is_base_unit ? 'bg-slate-900 text-white' : 'bg-amber-300 text-slate-900'}`}>
                          {u.unit_name}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            1 {u.unit_name} = <span className="text-emerald-700 font-black">{u.multiplier_to_base} Pcs</span>
                            {u.barcode && (
                              <span className="ml-2 inline-flex items-center gap-1 font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 border border-slate-300">
                                <Barcode className="w-3 h-3" /> {u.barcode}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Harga: <span className="font-bold text-slate-900">Rp {Number(u.price).toLocaleString('id-ID')}</span> • HPP: Rp {unitCost.toLocaleString('id-ID')} ({marginPct}% margin)
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {u.is_base_unit ? (
                          <span className="text-[10px] font-black uppercase text-slate-400 px-2 py-1 bg-slate-100 border border-slate-300">
                            Satuan Dasar
                          </span>
                        ) : (
                          <button
                            onClick={() => handleDeleteUnit(u.id, u.is_base_unit)}
                            disabled={loading}
                            className="p-1.5 bg-red-100 hover:bg-red-200 border border-red-900 text-red-900 cursor-pointer transition-colors"
                            title="Hapus Satuan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Preset Quick Templates */}
          {units.length < 4 && (
            <div>
              <div className="flex items-center gap-1 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-black uppercase text-slate-900 tracking-wider">
                  Template Cepat 1-Klik
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('ROKOK')}
                  className="p-2 border-2 border-slate-900 bg-amber-50 hover:bg-amber-100 text-left font-bold text-xs cursor-pointer shadow-[2px_2px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                >
                  🚬 Slop (10 Pcs)
                  <p className="text-[10px] font-normal text-slate-500">Preset rokok/pack</p>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('KOPI')}
                  className="p-2 border-2 border-slate-900 bg-amber-50 hover:bg-amber-100 text-left font-bold text-xs cursor-pointer shadow-[2px_2px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                >
                  ☕ Renceng (10 Pcs)
                  <p className="text-[10px] font-normal text-slate-500">Preset sachet/kopi</p>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('MIE')}
                  className="p-2 border-2 border-slate-900 bg-amber-50 hover:bg-amber-100 text-left font-bold text-xs cursor-pointer shadow-[2px_2px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                >
                  🍜 Dus (40 Pcs)
                  <p className="text-[10px] font-normal text-slate-500">Preset karton sembako</p>
                </button>
              </div>
            </div>
          )}

          {/* Form Add New Unit */}
          {units.length < 4 ? (
            <div className="p-4 border-2 border-slate-900 bg-slate-50 space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-900 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-600" />
                Tambah Tingkat Satuan Baru
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Nama Satuan (misal: Dus, Slop, Renceng)</label>
                  <input
                    type="text"
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                    placeholder="Contoh: Renceng"
                    className="w-full p-2 text-xs border-2 border-slate-900 bg-white font-medium focus:outline-hidden focus:bg-amber-50"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Isi Berapa Pcs? (Pengali ke Eceran)</label>
                  <input
                    type="number"
                    value={multiplier}
                    onChange={(e) => setMultiplier(e.target.value)}
                    placeholder="Contoh: 10"
                    min="2"
                    className="w-full p-2 text-xs border-2 border-slate-900 bg-white font-medium focus:outline-hidden focus:bg-amber-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Harga Jual Satuan Ini (Rp)</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Contoh: 25000"
                    className="w-full p-2 text-xs border-2 border-slate-900 bg-white font-medium focus:outline-hidden focus:bg-amber-50"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Barcode Khusus Satuan (Opsional)</label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Scan barcode dus/renceng"
                    className="w-full p-2 text-xs border-2 border-slate-900 bg-white font-mono focus:outline-hidden focus:bg-amber-50"
                  />
                </div>
              </div>

              {multiplier && price && (
                <div className="text-[11px] p-2 bg-emerald-50 border border-emerald-300 text-emerald-900 font-medium">
                  💡 HPP modal otomatis untuk 1 {unitName || 'Satuan'}: <span className="font-bold">Rp {((Number(product?.harga_modal) || 0) * parseInt(multiplier || 1, 10)).toLocaleString('id-ID')}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleAddUnit}
                disabled={loading}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider border-2 border-slate-900 cursor-pointer shadow-[2px_2px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Simpan Tingkat Satuan
              </button>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold text-center">
              Maksimal 4 tingkat konversi satuan telah tercapai untuk produk ini.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t-2 border-slate-900 bg-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-200 border-2 border-slate-900 font-bold text-xs uppercase cursor-pointer transition-colors"
          >
            Tutup
          </button>
        </div>
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
