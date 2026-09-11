"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Check, X, ShoppingBag, Store, RotateCcw, Sparkles } from 'lucide-react';
import useFocusTrap from '@/hooks/useFocusTrap';
import { toggleMarketItemPurchased, syncReorderSnapshot } from '@/utils/procurementEngine';

const formatRupiah = (val) => `Rp ${Number(val || 0).toLocaleString('id-ID')}`;

/**
 * Mode Pasar Subuh Taktil (One-Thumb Mobile-First Reorder Modal)
 * Desain layar penuh gelap kontras tinggi (#0B0F17) ramah navigasi satu jempol di pasar
 */
export default function MarketModeModal({
  isOpen,
  onClose,
  reorderData = null,
  shopId = null,
}) {
  const modalRef = useRef(null);
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'PENDING' | 'BOUGHT'
  const [items, setItems] = useState(() => {
    if (reorderData?.all_reorder_items) {
      return reorderData.all_reorder_items.map((it) => ({
        ...it,
        is_purchased: it.is_purchased || false,
      }));
    }
    return [];
  });

  useFocusTrap(modalRef, isOpen, {
    onEscape: onClose,
    stepDependencies: [filterMode, items.length],
    autoFocusFirst: true,
  });

  useEffect(() => {
    if (items.length > 0) {
      syncReorderSnapshot(shopId, { ...reorderData, all_reorder_items: items });
    }
  }, [items, shopId, reorderData]);

  if (!isOpen) return null;

  const toggleItemBought = async (itemId) => {
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

  const boughtCount = items.filter((i) => i.is_purchased).length;
  const totalCount = items.length;
  const totalBoughtCost = items
    .filter((i) => i.is_purchased)
    .reduce((sum, i) => sum + Number(i.estimated_cost || 0), 0);
  const totalTargetCost = items.reduce((sum, i) => sum + Number(i.estimated_cost || 0), 0);

  // Urutkan: Barang yang belum dibeli di atas, yang sudah dibeli di bawah
  const sortedItems = [...items].sort((a, b) => {
    if (a.is_purchased === b.is_purchased) return 0;
    return a.is_purchased ? 1 : -1;
  });

  const displayedItems = sortedItems.filter((i) => {
    if (filterMode === 'PENDING') return !i.is_purchased;
    if (filterMode === 'BOUGHT') return i.is_purchased;
    return true;
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] bg-[#0B0F17] text-white flex flex-col font-sans overflow-hidden">
        <motion.div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="market-mode-title"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="flex flex-col h-full w-full max-w-4xl mx-auto"
        >
          {/* Top Sticky Header */}
          <header className="p-4 sm:p-5 bg-[#141B26] border-b-3 border-amber-400 shrink-0 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black border-2 border-slate-900 shadow-[2px_2px_0px_#CCFF00]">
                  <Moon size={22} strokeWidth={2.5} />
                </div>
                <div>
                  <h1 id="market-mode-title" className="font-display font-black text-lg sm:text-xl uppercase tracking-tight text-amber-400">
                    Mode Pasar Subuh
                  </h1>
                  <p className="text-[11px] font-mono text-slate-400">
                    Navigasi Cepat Satu Jempol &bull; Offline-Ready
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border-2 border-slate-600 rounded-xl font-mono text-xs font-bold transition-all active:translate-y-0.5 flex items-center gap-1.5 cursor-pointer"
                aria-label="Tutup Mode Pasar Subuh"
              >
                <X size={16} strokeWidth={2.5} />
                <span className="hidden sm:inline">Selesai / Tutup</span>
              </button>
            </div>

            {/* Metrik Progres & Realisasi Belanja */}
            <div className="grid grid-cols-2 gap-3 bg-[#0B0F17] p-3 rounded-xl border border-slate-800 font-mono">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Progres Belanjaan:
                </span>
                <span className="text-base sm:text-lg font-black text-white">
                  {boughtCount} / {totalCount}{' '}
                  <span className="text-xs text-slate-400 font-normal">SKU Selesai</span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Realisasi Modal:
                </span>
                <span className="text-base sm:text-lg font-black text-[#CCFF00]">
                  {formatRupiah(totalBoughtCost)}
                  <span className="text-xs text-slate-400 font-normal block">
                    Target: {formatRupiah(totalTargetCost)}
                  </span>
                </span>
              </div>
            </div>

            {/* Filter Pill Tab */}
            <div className="flex items-center gap-2 pt-1 font-mono text-xs">
              <button
                type="button"
                onClick={() => setFilterMode('ALL')}
                className={`px-3 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer ${
                  filterMode === 'ALL'
                    ? 'bg-amber-400 text-slate-950 border-amber-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                Semua ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('PENDING')}
                className={`px-3 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer ${
                  filterMode === 'PENDING'
                    ? 'bg-amber-400 text-slate-950 border-amber-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                Belum Beli ({totalCount - boughtCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('BOUGHT')}
                className={`px-3 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer ${
                  filterMode === 'BOUGHT'
                    ? 'bg-emerald-400 text-slate-950 border-emerald-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                Sudah ({boughtCount})
              </button>
            </div>
          </header>

          {/* List Kartu Belanja Satu Jempol (Scrollable) */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
            {displayedItems.length === 0 ? (
              <div className="text-center py-16 space-y-3 border-2 border-dashed border-slate-800 rounded-2xl p-6">
                <ShoppingBag size={40} className="mx-auto text-slate-600" strokeWidth={1.5} />
                <p className="font-mono text-sm font-bold text-slate-400">
                  Tidak ada barang di kategori ini.
                </p>
              </div>
            ) : (
              displayedItems.map((item) => {
                const packaging =
                  item.packaging_display || `${item.suggested_packs || item.suggested_pcs} Pcs`;

                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItemBought(item.id)}
                    className={`rounded-2xl border-2 p-4 transition-all flex items-center justify-between gap-3 cursor-pointer select-none ${
                      item.is_purchased
                        ? 'bg-[#141B26]/60 border-slate-800 opacity-60'
                        : 'bg-[#141B26] border-slate-700 hover:border-amber-400 shadow-[4px_4px_0px_#000000]'
                    }`}
                  >
                    {/* Info Barang */}
                    <div className="space-y-1.5 flex-1 pr-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {item.supplier?.name || item.supplier_name || 'Pasar Umum'}
                        </span>
                        {item.is_urgent && (
                          <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                            STOK HABIS
                          </span>
                        )}
                      </div>

                      <h2
                        className={`text-base sm:text-lg font-black tracking-tight ${
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
                      className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-3 flex flex-col items-center justify-center font-mono font-black text-xs uppercase shrink-0 transition-transform active:scale-95 cursor-pointer shadow-md ${
                        item.is_purchased
                          ? 'bg-emerald-500 border-slate-900 text-slate-950'
                          : 'bg-amber-400 border-slate-900 text-slate-950 hover:bg-amber-300'
                      }`}
                      aria-label={item.is_purchased ? 'Tandai belum dibeli' : 'Tandai sudah dibeli'}
                    >
                      {item.is_purchased ? (
                        <>
                          <Check size={26} strokeWidth={3} />
                          <span className="text-[9px] mt-0.5">SUDAH</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag size={22} strokeWidth={2.5} />
                          <span className="text-[10px] mt-0.5">BELI</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </main>

          {/* Bottom Footer Status */}
          <footer className="p-3.5 bg-[#141B26] border-t-2 border-slate-800 text-center font-mono text-[11px] text-slate-400 shrink-0">
            <span>
              Tap kartu atau tombol BELI untuk mencentang barang. Progres otomatis tersimpan di HP.
            </span>
          </footer>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
