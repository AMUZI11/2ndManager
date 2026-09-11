"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, X, PlusCircle, MinusCircle, Gift, User, ChevronRight, Send, MessageCircle } from 'lucide-react';
import { api, calculateCascadingDiscount } from '../utils/api';
import ConfirmModal from '../components/ConfirmModal';
import { useTutorial, ContextualTooltip } from '../components/TutorialEngine';
import { CardGridSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';

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
      const data = await api.getCustomers();
      const safeData = Array.isArray(data) ? data : [];
      setCustomers(safeData);
      
      const statusMap = {};
      if (safeData.length > 0) {
        await Promise.all(safeData.map(async (c) => {
          try {
            const status = await api.getCustomerBonusStatus(c.id);
            statusMap[c.id] = status;
          } catch (e) {
            console.error('Gagal mengambil bonus status untuk pelanggan:', c.id, e);
          }
        }));
      }
      setBonusStatuses(statusMap);

      // Fetch unpaid transactions to calculate active piutang per customer
      const unpaidTx = await api.getTransactions({ status: "Piutang" });
      const safeTx = Array.isArray(unpaidTx) ? unpaidTx : [];
      const piutangMap = {};
      safeTx.forEach(t => {
        if (t && t.status === "Piutang") {
          piutangMap[t.customer_id] = (piutangMap[t.customer_id] || 0) + Number(t.amount_owed || 0);
        }
      });
      setCustomerPiutangs(piutangMap);
    } catch (err) {
      console.error("Gagal memuat data pelanggan:", err);
    } finally {
      setLoading(false);
    }
  }

  const [selectedDiscountCategories, setSelectedDiscountCategories] = useState([]);

  const openAddModal = () => {
    setEditingId(null);
    setNama("");
    setBonusThreshold("10000000");
    setSelectedDiscountCategories([]);
    setDiscountsMap({});
    setErrorMsg("");
    setIsModalOpen(true);
    registerTrigger("cust-add-btn", "click");
  };

  const openEditModal = (c) => {
    setEditingId(c.id);
    setNama(c.nama);
    setBonusThreshold((c.bonus_threshold ?? 10000000).toString());
    
    // Build discountsMap from full discounts dict (new) or legacy fallback
    const map = {};
    if (c.discounts && typeof c.discounts === 'object') {
      for (const [code, steps] of Object.entries(c.discounts)) {
        if (Array.isArray(steps)) {
          map[code] = steps.map(d => Math.min(100, Math.max(0, parseInt(d) || 0)));
        }
      }
    } else {
      if (Array.isArray(c.discounts_lm) && c.discounts_lm.length > 0) {
        map['LM'] = c.discounts_lm.map(d => Math.min(100, Math.max(0, parseInt(d) || 0)));
      }
      if (Array.isArray(c.discounts_br) && c.discounts_br.length > 0) {
        map['BR'] = c.discounts_br.map(d => Math.min(100, Math.max(0, parseInt(d) || 0)));
      }
    }

    const activeCodes = Object.keys(map).filter(code => (map[code] || []).some(d => d > 0));
    setSelectedDiscountCategories(activeCodes);
    setDiscountsMap(map);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleAddDiscountCategory = () => {
    const available = categories.find(cat => !selectedDiscountCategories.includes(cat.code));
    if (!available) return;
    setSelectedDiscountCategories(prev => [...prev, available.code]);
    setDiscountsMap(prev => ({
      ...prev,
      [available.code]: [5, 0]
    }));
  };

  const handleRemoveDiscountCategory = (catCode) => {
    setSelectedDiscountCategories(prev => prev.filter(c => c !== catCode));
    setDiscountsMap(prev => {
      const copy = { ...prev };
      delete copy[catCode];
      return copy;
    });
  };

  const handleCategoryCodeChange = (oldCode, newCode) => {
    if (oldCode === newCode) return;
    if (selectedDiscountCategories.includes(newCode)) return;

    setSelectedDiscountCategories(prev => prev.map(c => c === oldCode ? newCode : c));
    setDiscountsMap(prev => {
      const copy = { ...prev };
      copy[newCode] = copy[oldCode] || [0, 0];
      delete copy[oldCode];
      return copy;
    });
  };

  const handleUpdateDiscountStage = (catCode, stageIndex, val) => {
    const num = Math.min(100, Math.max(0, parseInt(val) || 0));
    setDiscountsMap(prev => {
      const current = prev[catCode] ? [...prev[catCode]] : [0, 0];
      while (current.length <= stageIndex) current.push(0);
      current[stageIndex] = num;
      return { ...prev, [catCode]: current };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!nama.trim()) {
      setErrorMsg("Nama pelanggan wajib diisi.");
      return;
    }

    // Build normalized discounts payload
    const normalizedDiscounts = {};
    selectedDiscountCategories.forEach(code => {
      const steps = (discountsMap[code] || [])
        .map(d => parseInt(d) || 0)
        .filter(d => d > 0);
      if (steps.length > 0) {
        normalizedDiscounts[code] = steps;
      }
    });

    const payload = {
      nama: nama.trim(),
      bonus_threshold: parseInt(bonusThreshold) || 0,
      discounts: normalizedDiscounts,
      discounts_lm: normalizedDiscounts['LM'] || [],
      discounts_br: normalizedDiscounts['BR'] || [],
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

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  // Top debtors for Hall of Fame Leaderboard
  const topDebtors = useMemo(() => {
    return customers
      .map(c => ({
        ...c,
        debt: customerPiutangs[c.id] || 0
      }))
      .filter(c => c.debt > 0)
      .sort((a, b) => b.debt - a.debt)
      .slice(0, 3);
  }, [customers, customerPiutangs]);

  if (loading) {
    return <CardGridSkeleton count={3} />;
  }

  return (
    <div className="space-y-8 pb-32">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white rounded-2xl p-6 border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display uppercase tracking-tight">👥 Buku Kasbon &amp; Pelanggan</h1>
            <span className="text-[10px] font-mono font-bold bg-slate-900 text-[#CCFF00] px-2 py-0.5 rounded border border-slate-800">
              RADAR PIUTANG
            </span>
          </div>
          <p className="text-xs font-sans text-slate-600 mt-1 max-w-xl">
            Pantau limit kasbon pelanggan, diskon bertingkat, dan tagih utang via WhatsApp sebelum jatuh tempo.
          </p>
        </div>

        <button 
          id="cust-add-btn"
          onClick={openAddModal}
          className="btn-arcade bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 font-mono font-bold text-xs uppercase px-6 py-3.5 rounded-xl border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B] transition-all flex items-center gap-2 cursor-pointer shrink-0 min-h-[48px]"
        >
          <Plus size={18} /> + TAMBAH PELANGGAN
        </button>
      </div>

      {/* HALL OF FAME KASBON LEADERBOARD (Pop-Art Comic Badges) */}
      {topDebtors.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-rose-500 rounded-full border border-slate-800" />
              🏆 HALL OF FAME: TOP 3 KASBON TERBESAR
            </h2>
            <span className="text-[10px] font-mono text-slate-500">PRIORITAS PENAGIHAN HARI INI</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topDebtors.map((c, idx) => {
              const badgeColors = [
                "bg-amber-400 text-slate-900 border-amber-600",
                "bg-slate-200 text-slate-900 border-slate-400",
                "bg-amber-700 text-white border-amber-900"
              ];
              const cardBg = idx === 0 ? "bg-amber-500/10 border-amber-500" : "bg-white border-slate-800";
              const rankLabels = ["JUARA 1 KASBON", "PERINGKAT 2", "PERINGKAT 3"];

              return (
                <div 
                  key={c.id}
                  className={`${cardBg} border-2 rounded-2xl p-5 shadow-[4px_4px_0px_#1E293B] flex flex-col justify-between space-y-4 relative overflow-hidden`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${badgeColors[idx]}`}>
                        #{idx + 1} {rankLabels[idx]}
                      </span>
                      <h3 className="font-extrabold text-slate-900 text-base font-sans mt-2 uppercase">{c.nama}</h3>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Total Piutang Belum Lunas:</span>
                    <p className="text-2xl font-extrabold font-mono text-rose-600 tabular-nums">
                      {formatRupiah(c.debt)}
                    </p>
                  </div>

                  {/* Instant WhatsApp Collector Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const phone = c.phone ? c.phone.replace(/[^0-9]/g, '') : '';
                      const amountStr = formatRupiah(c.debt);
                      const text = `Halo Bpk/Ibu ${c.nama}, menginfokan sisa catatan kasbon/piutang warung sebesar ${amountStr}. Mohon bantuannya untuk pembayaran ya. Terima kasih! 🙏`;
                      if (phone) {
                        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
                      } else {
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                      }
                    }}
                    className="btn-arcade w-full bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold uppercase py-2.5 rounded-xl border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send size={13} /> TAGIH VIA WA SEKARANG
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Customer List Card Grid / Empty State */}
      {customers.length === 0 ? (
        <div className="bg-white border-2 border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-[5px_5px_0px_#1E293B] max-w-lg mx-auto my-6">
          <div className="w-14 h-14 bg-slate-100 border-2 border-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-800 shadow-[2px_2px_0px_#1E293B]">
            <Gift size={28} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 font-display uppercase">Belum Ada Pelanggan Dicatat</h3>
            <p className="text-xs text-slate-600 font-sans">
              Catat nama pelanggan setia dan pantau riwayat belanja serta sisa utang mereka secara terpusat.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="btn-arcade bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 font-mono text-xs font-bold uppercase px-6 py-3.5 rounded-xl border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B] transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <Plus size={16} /> + TAMBAH PELANGGAN PERTAMA
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-xs font-mono font-bold text-slate-900 uppercase tracking-widest">
            DAFTAR SELURUH PELANGGAN ({customers.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {customers.map((c) => {
              const bStatus = bonusStatuses[c.id] || { bonuses_available: 0 };
              const debtAmount = customerPiutangs[c.id] || 0;
              return (
                <div 
                  key={c.id} 
                  className="bg-white rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] p-5 flex flex-col justify-between space-y-4 hover:-translate-y-1 hover:shadow-[6px_6px_0px_#1E293B] transition-all group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-slate-900 text-[#CCFF00] border-2 border-slate-800 rounded-xl shadow-[2px_2px_0px_#1E293B]">
                          <User size={18} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm font-sans line-clamp-1 uppercase">{c.nama}</h3>
                          <span className="text-[10px] font-mono text-slate-500 block">
                            Target Bonus: {formatRupiah(c.bonus_threshold)}
                          </span>
                        </div>
                      </div>

                      {debtAmount > 0 && (
                        <span className="bg-rose-100 text-rose-800 border border-rose-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">
                          Kasbon Aktif
                        </span>
                      )}
                    </div>

                    {/* Piutang Box */}
                    {debtAmount > 0 && (
                      <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-mono text-rose-700 block">Sisa Kasbon:</span>
                          <span className="font-mono font-bold text-sm text-rose-900">{formatRupiah(debtAmount)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const phone = c.phone ? c.phone.replace(/[^0-9]/g, '') : '';
                            const amountStr = formatRupiah(debtAmount);
                            const text = `Halo Bpk/Ibu ${c.nama}, menginfokan sisa catatan kasbon/piutang warung sebesar ${amountStr}. Mohon bantuannya untuk pembayaran ya. Terima kasih! 🙏`;
                            if (phone) {
                              window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
                            } else {
                              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                            }
                          }}
                          className="btn-arcade bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-1 cursor-pointer"
                        >
                          <Send size={11} /> Tagih WA
                        </button>
                      </div>
                    )}

                    {/* Discount summaries */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 border border-slate-300 p-2 rounded-lg font-mono">
                        <p className="text-[10px] text-slate-500">Diskon LM</p>
                        <p className="font-bold text-slate-900">
                          {c.discounts_lm?.length > 0 ? c.discounts_lm.map(d => `${d}%`).join(' + ') : '0%'}
                        </p>
                      </div>
                      <div className="bg-slate-50 border border-slate-300 p-2 rounded-lg font-mono">
                        <p className="text-[10px] text-slate-500">Diskon BR</p>
                        <p className="font-bold text-slate-900">
                          {c.discounts_br?.length > 0 ? c.discounts_br.map(d => `${d}%`).join(' + ') : '0%'}
                        </p>
                      </div>
                    </div>

                    {/* Bonus details */}
                    {bStatus.bonuses_available > 0 && (
                      <div className="bg-[#CCFF00]/30 border border-slate-800 p-2 rounded-lg flex items-center gap-2 text-xs text-slate-900 font-mono font-bold">
                        <Gift size={14} />
                        <span>Ada {bStatus.bonuses_available} bonus box tersedia!</span>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-2 border-t border-slate-200">
                    <button 
                      id={`cust-detail-btn-${c.id}`}
                      onClick={() => {
                        setSelectedCustomerId(c.id);
                        setView("customer-detail");
                        registerTrigger(`cust-detail-btn-${c.id}`, "click");
                      }} 
                      className="btn-arcade flex-1 bg-slate-900 text-white hover:bg-slate-800 border-2 border-slate-800 font-mono font-bold text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      Buka Buku Kasbon <ChevronRight size={14} />
                    </button>
                    <button 
                      id={`cust-edit-btn-${c.id}`}
                      onClick={() => {
                        openEditModal(c);
                        registerTrigger(`cust-edit-btn-${c.id}`, "click");
                      }}
                      className="btn-arcade bg-slate-50 hover:bg-slate-100 text-slate-900 border-2 border-slate-800 p-2 rounded-xl transition-all cursor-pointer"
                      title="Ubah Data"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button 
                      onClick={() => setDeleteCustId(c.id)}
                      className="btn-arcade bg-rose-50 hover:bg-rose-100 text-rose-700 border-2 border-rose-500 p-2 rounded-xl transition-all cursor-pointer"
                      title="Hapus"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add/Edit Modal overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-white border-2 border-slate-800 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-[8px_8px_0px_#1E293B] p-6 relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute right-5 top-5 p-1 text-slate-500 hover:text-slate-900 rounded-full"
            >
              <X size={20} />
            </button>

            <h2 className="text-base font-extrabold text-slate-900 font-display uppercase mb-4">
              {editingId ? "Ubah Data Pelanggan" : "Tambah Pelanggan Baru"}
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              {errorMsg && (
                <div className="bg-rose-50 border-2 border-rose-500 text-rose-900 p-3 rounded-xl text-xs font-mono font-bold">
                  Peringatan: {errorMsg}
                </div>
              )}

              {/* Input: Nama */}
              <div className="space-y-1">
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase">Nama Pelanggan *</label>
                <input 
                  type="text" 
                  id="cust-name-input"
                  value={nama} 
                  onChange={(e) => {
                    setNama(e.target.value);
                    registerTrigger("cust-name-input", "input");
                  }}
                  placeholder="Contoh: Toko Barokah Abadi"
                  className="w-full h-11 bg-slate-50 border-2 border-slate-800 rounded-xl px-3 text-sm font-sans font-medium text-slate-900 focus:ring-2 focus:ring-[#CCFF00] outline-none transition-all"
                />
              </div>

              {/* Input: Bonus Threshold */}
              <div className="space-y-1">
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase flex items-center">
                  Batas Target Bonus (Rupiah)
                  <ContextualTooltip id="tip-threshold" content="Pelanggan akan mendapat bonus produk gratis setiap kali jumlah belanjaan LUNAS-nya mencapai nominal ini." />
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
                  className="w-full h-11 bg-slate-50 border-2 border-slate-800 rounded-xl px-3 text-sm font-mono font-medium text-slate-900 focus:ring-2 focus:ring-[#CCFF00] outline-none transition-all"
                />
                {parseInt(bonusThreshold) > 0 && (
                  <p className="text-[11px] font-bold font-mono text-slate-600 mt-1">
                    {getTerbacaRupiah(bonusThreshold)}
                  </p>
                )}
              </div>

              {/* VIP DISCOUNT ENGINE — Progressive Disclosure */}
              <div className="space-y-3 pt-2 border-t-2 border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-extrabold text-slate-900 uppercase flex items-center gap-1.5">
                    <Gift size={14} className="text-purple-600" />
                    Otoritas Diskon Bertingkat (VIP Engine)
                    <ContextualTooltip id="tip-vip-engine" content="Berikan diskon khusus pelanggan per kategori produk. Potongan dihitung bertingkat saat transaksi POS." />
                  </label>
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                    {selectedDiscountCategories.length} Kategori Aktif
                  </span>
                </div>

                {selectedDiscountCategories.length === 0 ? (
                  <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-4 text-center space-y-1">
                    <p className="text-xs font-mono font-bold text-slate-600">Pelanggan ini belum memiliki diskon khusus kategori.</p>
                    <p className="text-[11px] font-sans text-slate-400">Berlaku harga jual standar tanpa potongan.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDiscountCategories.map((catCode) => {
                      const categoryObj = categories.find(c => c.code === catCode) || { code: catCode, name: catCode };
                      const currentSteps = discountsMap[catCode] || [0, 0];
                      const step1 = currentSteps[0] || 0;
                      const step2 = currentSteps[1] || 0;
                      const activeSteps = [step1, step2].filter(d => d > 0);
                      const simulatedPrice = calculateCascadingDiscount(100000, activeSteps);
                      const effectivePct = activeSteps.length > 0 ? (((100000 - simulatedPrice) / 100000) * 100).toFixed(1) : 0;

                      return (
                        <div key={catCode} className="bg-white/80 backdrop-blur border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B] rounded-xl p-3.5 space-y-3">
                          {/* Card Header: Category selector & Cadmium Red remove button */}
                          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="bg-slate-900 text-[#CCFF00] font-mono font-bold text-xs px-2 py-0.5 rounded border border-slate-800">
                                {categoryObj.code}
                              </span>
                              <select
                                value={catCode}
                                onChange={(e) => handleCategoryCodeChange(catCode, e.target.value)}
                                className="h-8 bg-slate-50 border border-slate-300 rounded-lg px-2 text-xs font-sans font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
                              >
                                {categories.map(c => (
                                  <option key={c.code} value={c.code} disabled={selectedDiscountCategories.includes(c.code) && c.code !== catCode}>
                                    {c.code} — {c.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveDiscountCategory(catCode)}
                              className="btn-arcade p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg border-2 border-slate-800 shadow-[1.5px_1.5px_0px_#1E293B] transition-all cursor-pointer"
                              title="Hapus Otoritas Diskon"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          {/* Two-Stage Numeric Input with Numpad Mobile Lock */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {/* Input 1: Potongan Utama (%) */}
                            <div className="space-y-1">
                              <label className="block text-[10px] font-mono font-bold text-slate-700 uppercase">
                                Potongan Utama (%) *
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="1"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={step1 || ''}
                                  onChange={(e) => handleUpdateDiscountStage(catCode, 0, e.target.value)}
                                  placeholder="0"
                                  className="w-full h-10 bg-slate-50 border-2 border-slate-800 rounded-xl px-3 pr-8 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#CCFF00] outline-none"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono font-bold text-xs">%</span>
                              </div>
                            </div>

                            {/* Input 2: Potongan Ekstra (%) */}
                            <div className="space-y-1">
                              <label className="block text-[10px] font-mono font-bold text-slate-700 uppercase">
                                Potongan Ekstra (%) (Opsional)
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="1"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={step2 || ''}
                                  onChange={(e) => handleUpdateDiscountStage(catCode, 1, e.target.value)}
                                  placeholder="0"
                                  className="w-full h-10 bg-slate-50 border-2 border-slate-800 rounded-xl px-3 pr-8 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#CCFF00] outline-none"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono font-bold text-xs">%</span>
                              </div>
                            </div>
                          </div>

                          {/* Live Calculation Simulation */}
                          <div className="bg-slate-100 rounded-lg p-2 flex items-center justify-between text-[11px] font-mono font-bold text-slate-700">
                            <span>Simulasi Rp 100.000:</span>
                            <span className="text-slate-900">
                              {activeSteps.length > 0 ? (
                                <>
                                  {activeSteps.map(s => `${s}%`).join(' + ')} ➔ <strong className="text-emerald-700">Rp {simulatedPrice.toLocaleString('id-ID')}</strong> ({effectivePct}%)
                                </>
                              ) : (
                                <span className="text-slate-400 italic">0% (Harga normal)</span>
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add Category Discount Button */}
                {selectedDiscountCategories.length < categories.length && (
                  <button
                    type="button"
                    onClick={handleAddDiscountCategory}
                    className="btn-arcade w-full py-2.5 bg-white hover:bg-slate-50 text-slate-900 font-mono font-bold text-xs uppercase rounded-xl border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B] flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <PlusCircle size={15} className="text-purple-600" />
                    + Tambah Otoritas Diskon
                  </button>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="btn-arcade flex-1 border-2 border-slate-800 text-slate-700 font-mono font-bold text-xs uppercase h-11 rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  id="cust-save-btn"
                  className="btn-arcade flex-1 bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] font-mono font-bold text-xs uppercase h-11 rounded-xl cursor-pointer"
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
        message="Apakah Anda yakin ingin menghapus data pelanggan ini? Data histori transaksi akan tetap disimpan."
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
