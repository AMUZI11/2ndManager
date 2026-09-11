"use client";
import React, { useState, useEffect } from 'react';
import { formatRupiah, getTerbacaRupiah } from '@/utils/format';
import { Plus, Edit2, Trash2, X, PlusCircle, MinusCircle, Gift, User, ChevronRight } from 'lucide-react';
import { api, calculateCascadingDiscount } from '../utils/api';
import ConfirmModal from '../components/ConfirmModal';
import { useTutorial, ContextualTooltip } from '../components/TutorialEngine';
import { CardGridSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';

export default function CustomerManagement({ setView, setSelectedCustomerId }) {
  const { registerTrigger } = useTutorial();
  const [customers, setCustomers] = useState([]);
  const [bonusStatuses, setBonusStatuses] = useState({});
  const [customerPiutangs, setCustomerPiutangs] = useState({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteCustId, setDeleteCustId] = useState(null);
  
  // Form States
  const [nama, setNama] = useState("");
  const [bonusThreshold, setBonusThreshold] = useState("10000000");
  const [categories, setCategories] = useState([]);
  // discountsMap: { [categoryCode]: number[] }
  const [discountsMap, setDiscountsMap] = useState({ LM: [20], BR: [10] });
  
  // Validation State
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    loadCustomers();
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

  async function loadCustomers() {
    setLoading(true);
    try {
      const data = await api.getCustomers({ page_size: 9999 });
      setCustomers(data);
      
      const statusMap = {};
      await Promise.all(data.map(async (c) => {
        const status = await api.getCustomerBonusStatus(c.id);
        statusMap[c.id] = status;
      }));
      setBonusStatuses(statusMap);

      // Fetch unpaid transactions to calculate active piutang per customer
      const unpaidTx = await api.getTransactions({ status: "Piutang" });
      const piutangMap = {};
      unpaidTx.forEach(t => {
        if (t.status === "Piutang") {
          piutangMap[t.customer_id] = (piutangMap[t.customer_id] || 0) + Number(t.amount_owed || 0);
        }
      });
      setCustomerPiutangs(piutangMap);
    } catch (err) {
      console.error("Gagal memuat data pelanggan:", err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setNama("");
    setBonusThreshold("10000000");
    // Initialize empty steps for every loaded category
    const initial = {};
    categories.forEach(cat => { initial[cat.code] = []; });
    if (!initial['LM']) initial['LM'] = [20];
    if (!initial['BR']) initial['BR'] = [10];
    setDiscountsMap(initial);
    setErrorMsg("");
    setIsModalOpen(true);
    registerTrigger("cust-add-btn", "click");
  };

  const openEditModal = (c) => {
    setEditingId(c.id);
    setNama(c.nama);
    setBonusThreshold(c.bonus_threshold.toString());
    // Build discountsMap from full discounts dict (new) or legacy fallback
    const map = {};
    if (c.discounts && typeof c.discounts === 'object') {
      for (const [code, steps] of Object.entries(c.discounts)) {
        map[code] = steps.map(d => parseFloat(d));
      }
    } else {
      map['LM'] = (c.discounts_lm || []).map(d => parseFloat(d));
      map['BR'] = (c.discounts_br || []).map(d => parseFloat(d));
    }
    // Ensure all loaded categories are present
    categories.forEach(cat => {
      if (!map[cat.code]) map[cat.code] = [];
    });
    setDiscountsMap(map);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!nama.trim()) {
      setErrorMsg("Nama pelanggan wajib diisi.");
      return;
    }

    // Validate discounts
    const allSteps = Object.values(discountsMap).flat();
    const invalid = allSteps.some(d => isNaN(d) || d < 0 || d > 100);
    if (invalid) {
      setErrorMsg("Semua nilai diskon harus berupa angka antara 0 dan 100.");
      return;
    }

    // Build payload: send both legacy fields (LM/BR) and full discounts dict
    const payload = {
      nama,
      bonus_threshold: parseInt(bonusThreshold) || 0,
      discounts_lm: (discountsMap['LM'] || []).filter(d => d > 0),
      discounts_br: (discountsMap['BR'] || []).filter(d => d > 0),
      discounts: Object.fromEntries(
        Object.entries(discountsMap).map(([code, steps]) => [code, steps.filter(d => d > 0)])
      ),
    };

    try {
      if (editingId) {
        await api.updateCustomer(editingId, payload);
        registerTrigger("cust-save-btn", "click");
      } else {
        await api.addCustomer(payload);
        registerTrigger("cust-save-btn", "click");
      }
      setIsModalOpen(false);
      await loadCustomers();
    } catch (err) {
      setErrorMsg(err.message || "Gagal menyimpan pelanggan.");
    }
  };


  // Step Management — works for any category code
  const addStep = (code) => {
    setDiscountsMap(prev => ({ ...prev, [code]: [...(prev[code] || []), 10] }));
  };

  const removeStep = (code, index) => {
    setDiscountsMap(prev => {
      const copy = [...(prev[code] || [])];
      copy.splice(index, 1);
      return { ...prev, [code]: copy };
    });
  };

  const updateStepValue = (code, index, val) => {
    const floatVal = parseFloat(val) || 0;
    setDiscountsMap(prev => {
      const copy = [...(prev[code] || [])];
      copy[index] = floatVal;
      if (code === 'LM' && index === 1) {
        registerTrigger("cust-lm-discount-1", "input");
      }
      return { ...prev, [code]: copy };
    });
  };

  // Preview Cascading Calculation
  const renderPreview = (base, steps) => {
    const finalPrice = calculateCascadingDiscount(base, steps);
    const totalDiscPct = ((base - finalPrice) / base) * 100;
    return (
      <div className="bg-navy-light border border-navy-ice rounded-xl p-3 text-xs text-navy-deep space-y-1 mt-2">
        <p className="font-semibold">Simulasi Hitung (Harga Jual Rp{base.toLocaleString('id-ID')})</p>
        <p>Potongan bertahap: {steps.length > 0 ? steps.map(s => `${s}%`).join(' ➔ ') : 'Tidak ada'}</p>
        <p>Harga Akhir: <strong className="text-sm font-bold text-navy-deep">Rp{finalPrice.toLocaleString('id-ID')}</strong> (Diskon efektif: {totalDiscPct.toFixed(1)}%)</p>
      </div>
    );
  };



  if (loading) {
    return <CardGridSkeleton count={3} />;
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex justify-between items-center bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-hero text-xl">👥 Pengaturan Pelanggan</h1>
          <p className="text-gray-500 text-xs mt-1">Kelola data pembeli, tingkat potongan harga diskon, dan batas bonus belanja.</p>
        </div>
        <button 
          id="cust-add-btn"
          onClick={openAddModal}
          className="bg-cta hover:bg-cta/90 text-primary font-bold text-sm h-12 px-5 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer font-mono"
        >
          <Plus size={18} /> Pelanggan Baru
        </button>
      </div>

      {/* Customer List Card Grid */}
      {customers.length === 0 ? (
        <EmptyState 
          icon={User}
          title="Belum Ada Pelanggan"
          message="Bapak/Ibu belum menambahkan pelanggan apa pun ke dalam sistem."
          actionLabel="Tambah Pelanggan Baru"
          onAction={openAddModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {customers.map((c) => {
          const bStatus = bonusStatuses[c.id] || { bonuses_available: 0 };
          return (
            <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between space-y-5 hover:border-navy-ice hover-card-effect">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gray-50 text-gray-400 rounded-xl">
                      <User size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-charcoal-black text-base line-clamp-1">{c.nama}</h3>
                        {customerPiutangs[c.id] > 0 && (
                          <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap">
                            Piutang: {formatRupiah(customerPiutangs[c.id])}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">Threshold: {formatRupiah(c.bonus_threshold)}</span>
                    </div>
                  </div>
                </div>

                <hr className="border-gray-50" />

                {/* Discount summaries */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-navy-light/40 border border-navy-ice/20 p-2.5 rounded-xl">
                    <p className="font-semibold text-gray-500 mb-1">Diskon LM</p>
                    <p className="font-bold text-navy-deep">
                      {c.discounts_lm.length > 0 ? c.discounts_lm.map(d => `${d}%`).join(' + ') : '0%'}
                    </p>
                  </div>
                  <div className="bg-emerald-mint/20 border border-emerald-mint p-2.5 rounded-xl">
                    <p className="font-semibold text-gray-500 mb-1">Diskon BR</p>
                    <p className="font-bold text-emerald-deep">
                      {c.discounts_br.length > 0 ? c.discounts_br.map(d => `${d}%`).join(' + ') : '0%'}
                    </p>
                  </div>
                </div>

                {/* Bonus details */}
                {bStatus.bonuses_available > 0 && (
                  <div className="bg-amber-cream border border-amber-soft p-3 rounded-xl flex items-center gap-2 text-xs text-amber-deep font-bold animate-pulse-glow">
                    <Gift size={16} className="text-amber-gold" />
                    <span>Ada {bStatus.bonuses_available} bonus gratis tersedia!</span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button 
                  id={`cust-detail-btn-${c.id}`}
                  onClick={() => {
                    setSelectedCustomerId(c.id);
                    setView("customer-detail");
                    registerTrigger(`cust-detail-btn-${c.id}`, "click");
                  }} 
                  className="flex-1 bg-gray-50 hover:bg-navy-ice/30 border border-gray-100 text-charcoal-medium font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1"
                >
                  Transaksi <ChevronRight size={14} />
                </button>
                <button 
                  id={`cust-edit-btn-${c.id}`}
                  onClick={() => {
                    openEditModal(c);
                    registerTrigger(`cust-edit-btn-${c.id}`, "click");
                  }}
                  className="bg-navy-ice hover:bg-navy-bright hover:text-white text-navy-deep p-2.5 rounded-xl transition-all"
                  title="Ubah Data"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => setDeleteCustId(c.id)}
                  className="bg-rose-light hover:bg-rose-medium hover:text-white text-rose-deep p-2.5 rounded-xl transition-all cursor-pointer"
                  title="Hapus"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Add/Edit Modal overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-[#FAF7F0] border-4 border-[#E8DCC8] rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute right-6 top-6 p-1 text-gray-400 hover:bg-gray-100 rounded-full"
            >
              <X size={20} />
            </button>

            <h2 className="text-heading text-lg mb-4">
              {editingId ? "Ubah Data Pelanggan" : "Tambah Pelanggan Baru"}
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              {errorMsg && (
                <div className="bg-rose-light text-rose-deep p-3 rounded-xl text-xs font-semibold">
                  Peringatan: {errorMsg}
                </div>
              )}

              {/* Input: Nama */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-charcoal-medium uppercase">Nama Pelanggan *</label>
                <input 
                  type="text" 
                  id="cust-name-input"
                  value={nama} 
                  onChange={(e) => {
                    setNama(e.target.value);
                    registerTrigger("cust-name-input", "input");
                  }}
                  placeholder="Contoh: Toko Barokah Abadi"
                  className="w-full h-12 bg-gray-50 border-2 border-gray-200 rounded-xl px-4 text-sm focus:border-navy-bright focus:bg-white outline-none transition-all"
                />
              </div>

              {/* Input: Bonus Threshold */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-charcoal-medium uppercase flex items-center">
                  Batas Target Bonus (Rupiah)
                  <ContextualTooltip id="tip-threshold" content="Pelanggan akan mendapat bonus produk gratis setiap kali jumlah belanjaan LUNAS-nya mencapai nominal ini. Contoh: Rp10.000.000." />
                </label>
                <input 
                  type="number" 
                  id="cust-threshold-input"
                  value={bonusThreshold} 
                  onChange={(e) => {
                    setBonusThreshold(e.target.value);
                    registerTrigger("cust-threshold-input", "input");
                  }}
                  placeholder="Contoh: 10000000"
                  className="w-full h-12 bg-gray-50 border-2 border-gray-200 rounded-xl px-4 text-sm focus:border-navy-bright focus:bg-white outline-none transition-all"
                />
                {parseInt(bonusThreshold) > 0 && (
                  <p className="text-[11px] font-extrabold text-[#C97B1A] mt-1.5 animate-slide-in">
                    {getTerbacaRupiah(bonusThreshold)}
                  </p>
                )}
              </div>

              {/* Dynamic Cascading Discounts for each loaded category */}
              {categories.map(cat => {
                const steps = discountsMap[cat.code] || [];
                return (
                  <div key={cat.code} className="space-y-2 bg-gray-50/50 border border-gray-100 p-4 rounded-2xl">
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-charcoal-medium uppercase flex items-center">
                        Diskon {cat.code} — {cat.name} (%)
                        <ContextualTooltip id={`tip-diskon-${cat.code}`} content={`Diskon bertingkat untuk produk kategori ${cat.name}. Dihitung secara beruntun (cascading).`} />
                      </label>
                      <button 
                        type="button"
                        id={`cust-add-${cat.code}-step-btn`}
                        onClick={() => {
                          addStep(cat.code);
                          if (cat.code === 'LM') registerTrigger("cust-add-lm-step-btn", "click");
                        }}
                        className="text-xs font-bold text-navy-bright flex items-center gap-0.5 hover:underline"
                      >
                        <PlusCircle size={14} /> Tambah Tahap
                      </button>
                    </div>

                    <div className="space-y-2">
                      {steps.length === 0 && (
                        <p className="text-xs text-gray-400 italic">Tidak ada diskon (harga penuh). Klik &quot;Tambah Tahap&quot; untuk mengatur.</p>
                      )}
                      {steps.map((d, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 font-bold w-12">Tahap {index + 1}</span>
                          <div className="relative flex-1">
                            <input 
                              type="number"
                              step="any"
                              id={cat.code === 'LM' ? `cust-lm-discount-${index}` : `cust-${cat.code.toLowerCase()}-discount-${index}`}
                              value={d} 
                              onChange={(e) => updateStepValue(cat.code, index, e.target.value)}
                              className="w-full h-10 bg-white border border-gray-200 rounded-xl px-3 pr-8 text-xs focus:border-navy-bright outline-none"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">%</span>
                          </div>
                          {steps.length > 0 && (
                            <button 
                              type="button" 
                              onClick={() => removeStep(cat.code, index)}
                              className="text-rose-deep hover:text-rose-medium"
                            >
                              <MinusCircle size={18} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {steps.length > 0 && renderPreview(100000, steps)}
                  </div>
                );
              })}

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 border-2 border-gray-200 text-charcoal-medium font-bold h-12 rounded-xl text-sm hover:bg-gray-50"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  id="cust-save-btn"
                  className="flex-1 bg-[#C97B1A] hover:bg-[#A85F10] text-white font-bold h-12 rounded-xl text-sm shadow-md cursor-pointer font-mono"
                >
                  {editingId ? "Simpan Perubahan" : "Tambah Pelanggan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Custom Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteCustId !== null}
        title="Hapus Pelanggan"
        message="Apakah Bapak/Ibu yakin ingin menghapus pelanggan ini? Data riwayat transaksi lama akan tetap disimpan."
        onConfirm={async () => {
          try {
            await api.deleteCustomer(deleteCustId);
            setDeleteCustId(null);
            await loadCustomers();
          } catch (err) {
            alert(err.message || "Gagal menghapus pelanggan.");
          }
        }}
        onCancel={() => setDeleteCustId(null)}
        confirmLabel="YA, HAPUS"
        cancelLabel="BATAL"
      />
    </div>
  );
}
