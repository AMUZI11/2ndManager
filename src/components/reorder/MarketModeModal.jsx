"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Moon, Check, X, ShoppingBag, Store, RotateCcw, 
  Search, CheckCircle2, Circle, ArrowLeft, Zap
} from 'lucide-react';
import useFocusTrap from '@/hooks/useFocusTrap';
import { toggleMarketItemPurchased, syncReorderSnapshot } from '@/utils/procurementEngine';

const formatRupiah = (val) => `Rp ${Number(val || 0).toLocaleString('id-ID')}`;

/**
 * Mode Pasar Subuh Taktil (One-Thumb Mobile-First Reorder Modal)
 * Desain layar penuh gelap kontras tinggi (#0B0F17) ramah navigasi satu jempol di pasar
 * Menggunakan React Portal (document.body) agar bebas dari CSS Stacking Context layout sidebar.
 */
export default function MarketModeModal({
  isOpen,
  onClose,
  reorderData = null,
  shopId = null,
}) {
  const modalRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'PENDING' | 'BOUGHT'
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState(() => {
    if (reorderData?.all_reorder_items) {
      return reorderData.all_reorder_items.map((it) => ({
        ...it,
        is_purchased: it.is_purchased || false,
      }));
    }
    return [];
  });

  // Client-side mount check untuk aman dari SSR hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Kunci scroll background saat modal aktif
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Sinkronisasi data saat modal dibuka atau reorderData di-fetch
  useEffect(() => {
    if (isOpen && reorderData?.all_reorder_items) {
      setItems((prev) => {
        const prevStatusMap = new Map(prev.map((i) => [i.id, i.is_purchased]));
        return reorderData.all_reorder_items.map((it) => ({
          ...it,
          is_purchased: prevStatusMap.has(it.id) ? prevStatusMap.get(it.id) : (it.is_purchased || false),
        }));
      });
    }
  }, [isOpen, reorderData]);

  // Accessible Focus Trap dengan auto focus tombol close
  useFocusTrap(modalRef, isOpen, {
    onEscape: onClose,
    stepDependencies: [filterMode, items.length, searchQuery],
  });

  // Sinkronisasi ke cache IndexedDB saat item berubah
  useEffect(() => {
    if (items.length > 0) {
      syncReorderSnapshot(shopId, { ...reorderData, all_reorder_items: items });
    }
  }, [items, shopId, reorderData]);

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      try {
        navigator.vibrate(40);
      } catch {
        // Safe fallback
      }
    }
  };

  const toggleItemBought = async (itemId) => {
    triggerHaptic();
    const updated = items.map((it) => {
      if (it.id === itemId) {
        return { ...it, is_purchased: !it.is_purchased };
      }
      return it;
    });

    setItems(updated);

    const targetItem = updated.find((i) => i.id === itemId);
    if (targetItem) {
      await toggleMarketItemPurchased(shopId, itemId, targetItem.is_purchased);
    }
  };

  const handleResetAll = async () => {
    if (typeof window !== 'undefined' && window.confirm('Reset semua centang belanjaan menjadi belum dibeli?')) {
      const resetItems = items.map((it) => ({ ...it, is_purchased: false }));
      setItems(resetItems);
      for (const it of items) {
        if (it.is_purchased) {
          await toggleMarketItemPurchased(shopId, it.id, false);
        }
      }
    }
  };

  const boughtCount = items.filter((i) => i.is_purchased).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((boughtCount / totalCount) * 100) : 0;
  const totalBoughtCost = items
    .filter((i) => i.is_purchased)
    .reduce((sum, i) => sum + Number(i.estimated_cost || 0), 0);
  const totalTargetCost = items.reduce((sum, i) => sum + Number(i.estimated_cost || 0), 0);

  // Filter & Search dengan pengurutan: barang belum dibeli di atas, sudah dibeli di bawah
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        if (filterMode === 'PENDING' && item.is_purchased) return false;
        if (filterMode === 'BOUGHT' && !item.is_purchased) return false;
        
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const nameMatch = (item.nama || '').toLowerCase().includes(q);
          const supplierMatch = (item.supplier?.name || item.supplier_name || '').toLowerCase().includes(q);
          return nameMatch || supplierMatch;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.is_purchased === b.is_purchased) return 0;
        return a.is_purchased ? 1 : -1;
      });
  }, [items, filterMode, searchQuery]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="market-mode-fullscreen-portal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[99999] bg-[#070A0F] text-white flex flex-col font-sans overflow-hidden select-none"
        >
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="market-mode-title"
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="flex flex-col h-full w-full max-w-3xl mx-auto bg-[#0B0F17] md:border-x-2 md:border-slate-800 shadow-[0_0_60px_rgba(0,0,0,0.8)]"
          >
            {/* Top Sticky Header */}
            <header className="p-4 sm:p-5 bg-[#141B26] border-b-2 border-slate-800 shrink-0 shadow-xl space-y-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black border-2 border-slate-900 shadow-[2px_2px_0px_#CCFF00] shrink-0">
                    <Moon size={22} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h1 id="market-mode-title" className="font-display font-black text-lg sm:text-xl uppercase tracking-tight text-amber-400 truncate">
                        Mode Pasar Subuh
                      </h1>
                      <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        OFFLINE READY
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 truncate">
                      Navigasi Cepat Satu Jempol &bull; Kontras Gelap Pasar
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border-2 border-slate-600 rounded-xl font-mono text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shrink-0"
                  aria-label="Tutup Mode Pasar Subuh"
                >
                  <X size={16} strokeWidth={2.5} />
                  <span>Tutup</span>
                </button>
              </div>

              {/* Metrik Progres & Realisasi Belanja */}
              <div className="bg-[#0B0F17] p-3.5 rounded-xl border border-slate-800 font-mono space-y-2">
                <div className="grid grid-cols-2 gap-3 items-end">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                      Progres Belanja:
                    </span>
                    <div className="text-base sm:text-lg font-black text-white flex items-baseline gap-1.5">
                      <span>{boughtCount} / {totalCount}</span>
                      <span className="text-xs text-amber-400 font-bold">({progressPercent}%)</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                      Realisasi Modal:
                    </span>
                    <span className="text-base sm:text-lg font-black text-[#CCFF00] block">
                      {formatRupiah(totalBoughtCost)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal block">
                      Target: {formatRupiah(totalTargetCost)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar Dinamis */}
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-[#CCFF00] transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Quick Search & Filters */}
              <div className="space-y-2 pt-1">
                {totalCount > 4 && (
                  <div className="relative">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari nama barang atau agen/supplier..."
                      className="w-full pl-9 pr-8 py-2 bg-[#0B0F17] border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
                        aria-label="Bersihkan pencarian"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}

                {/* Filter Pills */}
                <div className="flex items-center justify-between gap-2 font-mono text-xs">
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    <button
                      type="button"
                      onClick={() => setFilterMode('ALL')}
                      className={`px-3 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer whitespace-nowrap active:scale-95 ${
                        filterMode === 'ALL'
                          ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-[1px_1px_0px_#CCFF00]'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      Semua ({totalCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterMode('PENDING')}
                      className={`px-3 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer whitespace-nowrap active:scale-95 ${
                        filterMode === 'PENDING'
                          ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-[1px_1px_0px_#CCFF00]'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      Belum Beli ({totalCount - boughtCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterMode('BOUGHT')}
                      className={`px-3 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer whitespace-nowrap active:scale-95 ${
                        filterMode === 'BOUGHT'
                          ? 'bg-emerald-400 text-slate-950 border-emerald-400 shadow-[1px_1px_0px_#10B981]'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      Sudah ({boughtCount})
                    </button>
                  </div>

                  {boughtCount > 0 && (
                    <button
                      type="button"
                      onClick={handleResetAll}
                      className="text-[10px] font-mono text-slate-400 hover:text-rose-400 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-800 cursor-pointer shrink-0 transition-colors"
                      title="Reset semua centang belanjaan"
                    >
                      <RotateCcw size={12} />
                      <span className="hidden sm:inline">Reset</span>
                    </button>
                  )}
                </div>
              </div>
            </header>

            {/* List Kartu Belanja Satu Jempol (Scrollable) */}
            <main className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3">
              {filteredItems.length === 0 ? (
                <div className="text-center py-16 space-y-3 border-2 border-dashed border-slate-800 rounded-2xl p-6">
                  <ShoppingBag size={40} className="mx-auto text-slate-600" strokeWidth={1.5} />
                  <p className="font-mono text-sm font-bold text-slate-400">
                    {searchQuery ? `Tidak ada barang cocok dengan "${searchQuery}"` : 'Tidak ada barang di kategori ini.'}
                  </p>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-xs font-mono text-amber-400 underline hover:text-amber-300 cursor-pointer"
                    >
                      Hapus kata kunci pencarian
                    </button>
                  )}
                </div>
              ) : (
                filteredItems.map((item) => {
                  const packaging =
                    item.packaging_display || `${item.suggested_packs || item.suggested_pcs} Pcs`;

                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleItemBought(item.id)}
                      className={`rounded-2xl border-2 p-3.5 sm:p-4 transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer select-none active:scale-[0.99] ${
                        item.is_purchased
                          ? 'bg-[#141B26]/50 border-slate-800/80 opacity-60'
                          : 'bg-[#141B26] border-slate-700 hover:border-amber-400 shadow-[3px_3px_0px_#000000]'
                      }`}
                    >
                      {/* Info Barang */}
                      <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 max-w-[160px] truncate">
                            {item.supplier?.name || item.supplier_name || 'Pasar Umum'}
                          </span>
                          {item.is_urgent && (
                            <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                              STOK HABIS
                            </span>
                          )}
                        </div>

                        <h2
                          className={`text-base sm:text-lg font-black tracking-tight truncate ${
                            item.is_purchased
                              ? 'line-through text-slate-500'
                              : 'text-white font-display'
                          }`}
                        >
                          {item.nama}
                        </h2>

                        <div className="flex flex-wrap items-baseline gap-2 font-mono">
                          <span className="text-amber-400 font-black text-sm sm:text-base">
                            {packaging}
                          </span>
                          <span className="text-slate-400 text-xs">
                            &bull; Est: {formatRupiah(item.estimated_cost || 0)}
                          </span>
                        </div>
                      </div>

                      {/* Tombol Raksasa Satu Jempol */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleItemBought(item.id);
                        }}
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-3 flex flex-col items-center justify-center font-mono font-black text-xs uppercase shrink-0 transition-transform active:scale-90 cursor-pointer shadow-md ${
                          item.is_purchased
                            ? 'bg-emerald-500 border-slate-900 text-slate-950'
                            : 'bg-amber-400 border-slate-900 text-slate-950 hover:bg-amber-300 shadow-[2px_2px_0px_#000000]'
                        }`}
                        aria-label={item.is_purchased ? 'Tandai belum dibeli' : 'Tandai sudah dibeli'}
                      >
                        {item.is_purchased ? (
                          <>
                            <Check size={26} strokeWidth={3} />
                            <span className="text-[9px] mt-0.5 font-black">SUDAH</span>
                          </>
                        ) : (
                          <>
                            <ShoppingBag size={22} strokeWidth={2.5} />
                            <span className="text-[10px] mt-0.5 font-black">BELI</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </main>

            {/* Bottom Footer Status */}
            <footer className="p-3.5 sm:p-4 bg-[#141B26] border-t-2 border-slate-800 flex items-center justify-between gap-3 font-mono text-xs shrink-0">
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 min-w-0">
                <Zap size={14} className="text-amber-400 shrink-0" />
                <span className="truncate">
                  {totalCount - boughtCount === 0
                    ? '🎉 Semua belanjaan pasar telah selesai dicentang!'
                    : `Sisa ${totalCount - boughtCount} barang belum dibeli.`}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_#000000] cursor-pointer transition-transform active:scale-95 shrink-0"
              >
                Selesai Belanja
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
