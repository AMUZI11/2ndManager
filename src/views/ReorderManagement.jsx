"use client";
import React, { useState, useEffect } from 'react';
import {
  ShoppingBag, Store, CheckCircle2, AlertTriangle,
  RefreshCw, Plus, Edit2, Trash2, Clock,
  MessageCircle, Copy, ChevronDown, ChevronUp,
  PackagePlus, Sparkles, Check, Phone, User, AlertCircle,
  History, Building2, ShieldCheck, X, Moon, Printer
} from 'lucide-react';
import { api } from '@/utils/api';
import { normalizeIndonesianPhone } from '@/lib/phone';
import { createClient } from '@/lib/supabase/client';
import StockInModal from '@/components/products/StockInModal';
import CashEnvelopeCard from '@/components/reorder/CashEnvelopeCard';
import MarketModeModal from '@/components/reorder/MarketModeModal';
import { generateSupplierWhatsAppUrl } from '@/utils/whatsappPoFormatter';
import { printReorderSlipDirect } from '@/utils/escposPrinter';

export default function ReorderManagement() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('REORDER'); // 'REORDER' | 'HISTORY' | 'SUPPLIERS'
  
  // Data States
  const [reorderData, setReorderData] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [currentShop, setCurrentShop] = useState(null);
  const [userPlan, setUserPlan] = useState('MANAJER');
  const [isTierLocked, setIsTierLocked] = useState(false);

  // Selected Items & Quantities in Reorder Tab
  // Format: { [productId]: { selected: boolean, packs: number, unitId: string, unitName: string, multiplier: number, pricePerUnit: number } }
  const [itemSelections, setItemSelections] = useState({});

  // Accordion collapsed state for suppliers: { [supplierKey]: boolean }
  const [collapsedSuppliers, setCollapsedSuppliers] = useState({});

  // Modals
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [supplierFormData, setSupplierFormData] = useState({
    name: '',
    phone: '',
    contact_person: '',
    address: '',
    lead_time_days: '1',
    notes: '',
  });

  // Zero-Retyping Stock-In Modal
  const [isStockInOpen, setIsStockInOpen] = useState(false);
  const [stockInPo, setStockInPo] = useState(null);

  // Market Mode Modal (Pasar Subuh Taktil)
  const [isMarketModeOpen, setIsMarketModeOpen] = useState(false);

  // General Notification Toast
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Suggestions
      try {
        const sugg = await api.getReorderSuggestions();
        setReorderData(sugg);
        setIsTierLocked(false);
        
        // Inisialisasi itemSelections dengan saran default sistem
        const initialMap = {};
        if (sugg?.all_reorder_items) {
          sugg.all_reorder_items.forEach(it => {
            initialMap[it.id] = {
              selected: true,
              packs: it.suggested_packs || 1,
              unitId: it.available_units?.[0]?.id || null,
              unitName: it.pack_unit_name || 'Pcs',
              multiplier: it.pack_multiplier || 1,
              costPerBase: it.harga_modal || 0,
            };
          });
        }
        setItemSelections(initialMap);
      } catch (suggErr) {
        if (suggErr?.status === 403 || suggErr?.code === 'TIER_LOCKED') {
          setIsTierLocked(true);
        } else {
          console.warn('Gagal memuat reorder suggestions:', suggErr);
        }
      }

      // 2. Fetch Suppliers & POs & Shop Profile
      const [supList, poList, shopProfile] = await Promise.all([
        api.getSuppliers().catch(() => []),
        api.getPurchaseOrders().catch(() => []),
        api.getShopProfile().catch(() => null),
      ]);
      setSuppliers(supList || []);
      setPurchaseOrders(poList || []);

      // 3. User Shop & Tier
      if (shopProfile?.subscription_tier) {
        setUserPlan(shopProfile.subscription_tier);
        setCurrentShop(shopProfile);
      } else {
        const savedPlan = sessionStorage.getItem('hl_current_plan') || 'MANAJER';
        setUserPlan(savedPlan);
      }
    } catch (err) {
      console.error('[ReorderManagement] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAllData();

    // ─── SUPABASE REALTIME SUBSCRIPTION (Live Sync) ──────────────────────────
    const supabase = createClient();
    const channel = supabase
      .channel('reorder-live-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        loadAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_orders' }, () => {
        loadAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, () => {
        loadAllData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatRupiah = (val) => `Rp ${Number(val || 0).toLocaleString('id-ID')}`;

  // ─── HANDLERS ITEM SELECTION & MODIFICATION ────────────────────────────────
  const toggleItemSelection = (productId) => {
    setItemSelections(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        selected: !prev[productId]?.selected,
      }
    }));
  };

  const updateItemPacks = (productId, newPacks) => {
    const parsed = Math.max(1, parseInt(newPacks, 10) || 1);
    setItemSelections(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        packs: parsed,
      }
    }));
  };

  const updateItemUnit = (productId, unit) => {
    setItemSelections(prev => {
      const current = prev[productId];
      const mult = Number(unit.multiplier_to_base || 1);
      return {
        ...prev,
        [productId]: {
          ...current,
          unitId: unit.id,
          unitName: unit.unit_name,
          multiplier: mult,
        }
      };
    });
  };

  // ─── KALKULASI TOTAL KAS TUNAI PASAR ───────────────────────────────────────
  const calculateSupplierTotal = (supplierGroup) => {
    let total = 0;
    for (const item of supplierGroup.items) {
      const sel = itemSelections[item.id];
      if (sel?.selected) {
        const baseQty = (sel.packs || 1) * (sel.multiplier || 1);
        total += baseQty * (item.harga_modal || 0);
      }
    }
    return total;
  };

  const calculateGrandTotal = () => {
    if (!reorderData?.all_reorder_items) return 0;
    let grand = 0;
    for (const item of reorderData.all_reorder_items) {
      const sel = itemSelections[item.id];
      if (sel?.selected) {
        const baseQty = (sel.packs || 1) * (sel.multiplier || 1);
        grand += baseQty * (item.harga_modal || 0);
      }
    }
    return grand;
  };

  const getSelectedItemsCount = () => {
    return Object.values(itemSelections).filter(s => s?.selected).length;
  };

  // ─── GENERATE PO & WHATSAPP DEEP LINK (Patch 4: Template Padat) ────────────
  const handleSendPOWhatsApp = async (supplierGroup) => {
    const selectedGroupItems = supplierGroup.items.filter(it => itemSelections[it.id]?.selected);
    if (selectedGroupItems.length === 0) {
      alert('Pilih setidaknya 1 barang untuk dipesan ke supplier ini.');
      return;
    }

    const itemsPayload = selectedGroupItems.map(it => {
      const sel = itemSelections[it.id];
      const packs = sel.packs || 1;
      const unitName = sel.unitName || 'Pcs';
      const baseQty = packs * (sel.multiplier || 1);
      const subtotal = baseQty * (it.harga_modal || 0);
      return {
        product_id: it.id,
        nama: it.nama,
        quantity_packs: packs,
        pack_unit_name: unitName,
        pack_multiplier: sel.multiplier || 1,
        quantity_base: baseQty,
        harga_modal: it.harga_modal,
        subtotal: subtotal,
      };
    });

    const supplierTotal = itemsPayload.reduce((sum, it) => sum + it.subtotal, 0);

    try {
      // 1. Catat ke tabel purchase_orders
      const createdPo = await api.createPurchaseOrder({
        supplier_id: supplierGroup.supplier_id || null,
        items: itemsPayload,
        status: 'SENT',
        notes: `PO via WhatsApp ke ${supplierGroup.supplier_name}`,
      });

      // 2. Susun Pesan Ringkas & URL WhatsApp Aman (< 2000 Karakter)
      const waUrl = generateSupplierWhatsAppUrl({
        supplierName: supplierGroup.supplier_name,
        supplierPhone: supplierGroup.supplier_phone,
        poNumber: createdPo.po_number,
        shopName: currentShop?.name || '2ndManager Warung',
        items: itemsPayload.map(it => ({
          name: it.nama,
          packs: it.quantity_packs,
          unit: it.pack_unit_name,
          subtotal: it.subtotal,
        })),
        totalCost: supplierTotal,
        notes: 'Pesanan Kulakan Pasar Subuh',
      });

      // Refresh PO List
      const updatedPoList = await api.getPurchaseOrders();
      setPurchaseOrders(updatedPoList || []);

      showToast(`PO #${createdPo.po_number} berhasil dibuat! Membuka WhatsApp...`);

      // Buka tab WhatsApp
      if (typeof window !== 'undefined') {
        window.open(waUrl, '_blank');
      }
    } catch (err) {
      console.error('Gagal membuat PO:', err);
      alert(err.message || 'Gagal membuat Purchase Order.');
    }
  };

  // ─── CETAK STRUK DAFTAR BELANJA THERMAL (ESC/POS Direct Print) ────────────
  const handlePrintReorderSlip = async () => {
    if (!reorderData?.all_reorder_items) return;
    const selected = reorderData.all_reorder_items.filter(it => itemSelections[it.id]?.selected);
    if (selected.length === 0) {
      alert('Tidak ada barang yang dipilih untuk dicetak.');
      return;
    }

    const itemsForSlip = selected.map(it => {
      const sel = itemSelections[it.id] || {};
      const packs = sel.packs || 1;
      const unit = sel.unitName || 'Pcs';
      const sub = (packs * (sel.multiplier || 1)) * (it.harga_modal || 0);
      return {
        name: it.nama,
        packs: packs,
        unit: unit,
        subtotal: sub,
      };
    });

    const totalCost = calculateGrandTotal();

    showToast('Mengirim struk belanja ke printer thermal...');
    try {
      const res = await printReorderSlipDirect({
        shopName: currentShop?.name || '2ndManager Warung',
        items: itemsForSlip,
        totalCost: totalCost,
        dateStr: new Date().toLocaleDateString('id-ID'),
      });

      if (res.success) {
        showToast('Struk reorder berhasil dicetak!');
      } else {
        showToast(`Cetak struk: ${res.error || 'Selesai'}`);
      }
    } catch (err) {
      console.error('Print slip error:', err);
      showToast('Gagal mencetak struk direct.');
    }
  };

  // ─── SALIN SEMUA DAFTAR BELANJA KE CLIPBOARD ───────────────────────────────
  const handleCopyShoppingList = () => {
    if (!reorderData?.all_reorder_items) return;
    const selected = reorderData.all_reorder_items.filter(it => itemSelections[it.id]?.selected);
    if (selected.length === 0) {
      alert('Tidak ada barang yang dipilih.');
      return;
    }

    let text = `DAFTAR BELANJA PASAR SUBUH (${selected.length} SKU)\n`;
    text += `Tanggal: ${new Date().toLocaleDateString('id-ID')}\n`;
    text += `════════════════════════════\n\n`;

    selected.forEach((it, idx) => {
      const sel = itemSelections[it.id];
      const packs = sel.packs || 1;
      const unit = sel.unitName || 'Pcs';
      const sub = (packs * (sel.multiplier || 1)) * (it.harga_modal || 0);
      text += `${idx + 1}. [ ] ${it.nama} : ${packs} ${unit} (~${formatRupiah(sub)})\n`;
    });

    text += `\nESTIMASI TOTAL MODAL TUNAI: ${formatRupiah(calculateGrandTotal())}\n`;

    navigator.clipboard.writeText(text);
    showToast('Daftar belanja berhasil disalin ke clipboard!');
  };

  // ─── JEMBATAN ZERO-RETYPING: PO KE STOCK-IN (Patch 3) ──────────────────────
  const handleOpenStockInFromPO = (po) => {
    setStockInPo(po);
    setIsStockInOpen(true);
  };

  // ─── SUPPLIER CRUD HANDLERS ────────────────────────────────────────────────
  const handleOpenAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierFormData({
      name: '',
      phone: '',
      contact_person: '',
      address: '',
      lead_time_days: '1',
      notes: '',
    });
    setIsSupplierModalOpen(true);
  };

  const handleOpenEditSupplier = (sup) => {
    setEditingSupplier(sup);
    setSupplierFormData({
      name: sup.name,
      phone: sup.phone || '',
      contact_person: sup.contact_person || '',
      address: sup.address || '',
      lead_time_days: String(sup.lead_time_days || 1),
      notes: sup.notes || '',
    });
    setIsSupplierModalOpen(true);
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    if (!supplierFormData.name.trim()) {
      alert('Nama supplier wajib diisi.');
      return;
    }

    try {
      if (editingSupplier) {
        await api.updateSupplier(editingSupplier.id, supplierFormData);
        showToast('Supplier berhasil diperbarui.');
      } else {
        await api.addSupplier(supplierFormData);
        showToast('Supplier baru berhasil ditambahkan.');
      }
      setIsSupplierModalOpen(false);
      const updated = await api.getSuppliers();
      setSuppliers(updated || []);
      const sugg = await api.getReorderSuggestions();
      setReorderData(sugg);
    } catch (err) {
      alert(err.message || 'Gagal menyimpan supplier.');
    }
  };

  const handleDeleteSupplier = async (supId) => {
    if (!confirm('Yakin ingin menonaktifkan supplier ini?')) return;
    try {
      await api.deleteSupplier(supId);
      showToast('Supplier berhasil dinonaktifkan.');
      const updated = await api.getSuppliers();
      setSuppliers(updated || []);
    } catch (err) {
      alert(err.message || 'Gagal menghapus supplier.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 font-sans">
        <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <div className="text-center space-y-1">
          <p className="font-mono text-xs font-black text-slate-900 uppercase tracking-wider">
            Menganalisis Velocity Penjualan 7-Hari &amp; Stok Rak...
          </p>
          <p className="text-xs font-mono text-slate-500">
            Menghitung kalkulasi presisi belanja pasar subuh...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans pb-36">
      {/* Toast Notification (Brutal Pop-Art Toast) */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-[#CCFF00] px-4 py-3 rounded-xl shadow-[4px_4px_0px_#1E293B] border-2 border-slate-800 font-mono text-xs font-bold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2">
          <Sparkles size={16} className="text-[#CCFF00] shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Page (Neo-Brutalist Arcade Hero Card) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B]">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#CCFF00] text-slate-900 flex items-center justify-center border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] shrink-0">
              <ShoppingBag size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display uppercase tracking-tight">
                  Radar Belanja Pasar Subuh
                </h1>
                <span className="text-[10px] font-mono font-bold bg-slate-900 text-[#CCFF00] px-2 py-0.5 rounded border border-slate-800 uppercase tracking-wider">
                  Smart Re-Order
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 font-sans leading-relaxed">
                Kalkulator belanja otomatis berbasis kecepatan jual 7-hari, eliminasi sobekan kardus &amp; hitung uang fisik pasar.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleCopyShoppingList}
            className="btn-arcade flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 font-mono font-bold text-xs uppercase rounded-xl border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] transition-all min-h-[44px] cursor-pointer"
            title="Salin semua item belanja"
          >
            <Copy size={15} />
            <span>Salin Checklist</span>
          </button>
          <button
            onClick={loadAllData}
            className="btn-arcade inline-flex items-center justify-center p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] transition-all min-h-[44px] min-w-[44px] cursor-pointer"
            title="Refresh Kalkulasi"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Metrics Bento Grid (Arcade Brutalist Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: SKU Perlu Kulakan */}
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider">
              SKU Perlu Kulakan
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 border border-slate-800 flex items-center justify-center">
              <ShoppingBag size={15} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-mono font-black text-slate-900 tabular-nums">
              {reorderData?.summary?.total_skus_needed || 0}
            </span>
            <span className="text-xs font-mono text-slate-600 font-bold">Barang</span>
          </div>
        </div>

        {/* Card 2: Stok Kosong Total */}
        <div className="bg-rose-50/50 p-5 rounded-2xl border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle size={13} className="text-rose-600" /> Stok Habis (0)
            </span>
            <span className="text-[10px] font-mono font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded border border-slate-800">
              KRITIS
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-mono font-black text-rose-600 tabular-nums">
              {reorderData?.summary?.out_of_stock_count || 0}
            </span>
            <span className="text-xs font-mono text-rose-800 font-bold">SKU Kosong</span>
          </div>
        </div>

        {/* Card 3: Stok Menipis */}
        <div className="bg-amber-50/50 p-5 rounded-2xl border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={13} className="text-amber-700" /> Stok Menipis
            </span>
            <span className="text-[10px] font-mono font-bold bg-amber-400 text-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
              ROP
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-mono font-black text-amber-700 tabular-nums">
              {reorderData?.summary?.low_stock_count || 0}
            </span>
            <span className="text-xs font-mono text-amber-800 font-bold">SKU Menipis</span>
          </div>
        </div>

        {/* Card 4: Modal Tunai Dibawa (Signature Volt Pop Card) */}
        <div className="bg-[#CCFF00] p-5 rounded-2xl border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B] flex flex-col justify-between text-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-black text-slate-900 uppercase tracking-wider">
              Estimasi Modal Tunai Pasar
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-[#CCFF00] border border-slate-800 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl sm:text-2xl font-mono font-black tabular-nums tracking-tight text-slate-900 block">
              {formatRupiah(calculateGrandTotal())}
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-700 uppercase mt-0.5 block">
              Alokasi Uang Fisik Kasir
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation (Tactile Arcade Buttons) */}
      <div className="flex flex-wrap gap-2.5 border-b-2 border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('REORDER')}
          className={`btn-arcade px-4 py-2.5 text-xs font-mono font-black uppercase rounded-xl transition-all border-2 border-slate-800 flex items-center gap-2 min-h-[44px] cursor-pointer ${
            activeTab === 'REORDER'
              ? 'bg-slate-900 text-[#CCFF00] shadow-[3px_3px_0px_#1E293B]'
              : 'bg-white text-slate-700 hover:bg-slate-100 shadow-[2px_2px_0px_#1E293B]'
          }`}
        >
          <ShoppingBag size={15} />
          <span>Daftar Belanja Pasar</span>
          <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
            activeTab === 'REORDER' 
              ? 'bg-[#CCFF00] text-slate-900' 
              : 'bg-slate-200 text-slate-700'
          }`}>
            {reorderData?.summary?.total_skus_needed || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`btn-arcade px-4 py-2.5 text-xs font-mono font-black uppercase rounded-xl transition-all border-2 border-slate-800 flex items-center gap-2 min-h-[44px] cursor-pointer ${
            activeTab === 'HISTORY'
              ? 'bg-slate-900 text-[#CCFF00] shadow-[3px_3px_0px_#1E293B]'
              : 'bg-white text-slate-700 hover:bg-slate-100 shadow-[2px_2px_0px_#1E293B]'
          }`}
        >
          <History size={15} />
          <span>Riwayat PO Kulakan</span>
          <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
            activeTab === 'HISTORY' 
              ? 'bg-[#CCFF00] text-slate-900' 
              : 'bg-slate-200 text-slate-700'
          }`}>
            {purchaseOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('SUPPLIERS')}
          className={`btn-arcade px-4 py-2.5 text-xs font-mono font-black uppercase rounded-xl transition-all border-2 border-slate-800 flex items-center gap-2 min-h-[44px] cursor-pointer ${
            activeTab === 'SUPPLIERS'
              ? 'bg-slate-900 text-[#CCFF00] shadow-[3px_3px_0px_#1E293B]'
              : 'bg-white text-slate-700 hover:bg-slate-100 shadow-[2px_2px_0px_#1E293B]'
          }`}
        >
          <Building2 size={15} />
          <span>Agen Kulakan / Supplier</span>
          <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
            activeTab === 'SUPPLIERS' 
              ? 'bg-[#CCFF00] text-slate-900' 
              : 'bg-slate-200 text-slate-700'
          }`}>
            {suppliers.length}
          </span>
        </button>
      </div>

      {/* TAB 1: DAFTAR BELANJA PASAR (GROUPED BY SUPPLIER) */}
      {activeTab === 'REORDER' && (
        <div className="space-y-6">
          {isTierLocked ? (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-10 text-center rounded-2xl border-2 border-slate-800 shadow-[6px_6px_0px_#1E293B] space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-300 border-2 border-slate-800 flex items-center justify-center mx-auto shadow-[2px_2px_0px_#1E293B]">
                <Sparkles size={28} className="text-slate-900" />
              </div>
              <div className="space-y-1.5 max-w-lg mx-auto">
                <span className="text-[11px] font-mono font-black uppercase tracking-wider bg-amber-200 text-slate-900 px-3 py-1 rounded-full border border-slate-800">
                  Fitur Paket Manajer &amp; Eksekutif
                </span>
                <h3 className="text-xl font-black text-slate-900 uppercase font-display pt-2">
                  Radar Belanja Pasar Subuh (Smart Re-Order)
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-sans">
                  Hitung pesanan otomatis berbasis kecepatan jual (velocity) 7-hari, eliminasi sobekan kardus, konversi kemasan grosir (Dus/Bal), serta siapkan uang kas fisik belanja secara presisi.
                </p>
              </div>
              <div className="pt-2">
                <a
                  href="/billing"
                  className="btn-arcade inline-flex items-center gap-2 bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 font-mono font-black text-xs uppercase px-6 py-3 rounded-xl border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B] transition-all cursor-pointer"
                >
                  <ShieldCheck size={16} /> Upgrade Paket Sekarang
                </a>
              </div>
            </div>
          ) : (!reorderData?.supplier_groups || reorderData.supplier_groups.length === 0) ? (
            <div className="bg-white p-12 text-center rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#CCFF00] border-2 border-slate-800 text-slate-900 flex items-center justify-center mx-auto shadow-[2px_2px_0px_#1E293B]">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase font-display">
                Semua Rak Barang Terisi Aman!
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Tidak ada SKU produk yang stoknya berada di bawah ambang batas kritis penjualan 7-hari. Anda bisa bersantai malam ini!
              </p>
            </div>
          ) : (
            <>
              {/* Amplop Uang Fisik Kasir Pasar Subuh */}
              <CashEnvelopeCard
                totalAmount={calculateGrandTotal()}
                reorderData={reorderData}
                onOpenMarketMode={() => setIsMarketModeOpen(true)}
                onPrintSlip={handlePrintReorderSlip}
              />

              {reorderData.supplier_groups.map(group => {
              const sKey = group.supplier_id || 'unassigned';
              const isCollapsed = collapsedSuppliers[sKey];
              const groupTotal = calculateSupplierTotal(group);
              const selectedCount = group.items.filter(it => itemSelections[it.id]?.selected).length;

              return (
                <div 
                  key={sKey}
                  className="bg-white rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] overflow-hidden"
                >
                  {/* Supplier Card Header */}
                  <div className="p-4 sm:p-5 bg-slate-50 border-b-2 border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setCollapsedSuppliers(prev => ({ ...prev, [sKey]: !prev[sKey] }))}
                        className="p-2 bg-white hover:bg-slate-200 rounded-xl border-2 border-slate-800 shadow-[1px_1px_0px_#1E293B] text-slate-900 cursor-pointer transition-colors"
                        title={isCollapsed ? "Buka rincian" : "Tutup rincian"}
                      >
                        {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                      </button>
                      <div className="w-10 h-10 rounded-xl bg-white border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] text-slate-900 flex items-center justify-center shrink-0">
                        <Store size={18} />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-black text-slate-900 font-display uppercase tracking-tight">
                            {group.supplier_name}
                          </h3>
                          {group.urgent_items_count > 0 && (
                            <span className="text-[10px] font-mono font-bold bg-rose-500 text-white px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1">
                              <AlertTriangle size={11} /> {group.urgent_items_count} SKU Kritis
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 flex flex-wrap items-center gap-2 font-sans">
                          {group.supplier_phone && (
                            <span className="font-mono font-bold text-slate-800">
                              WA: {group.supplier_phone}
                            </span>
                          )}
                          <span className="text-slate-400">•</span>
                          <span className="font-mono font-medium">{selectedCount} dari {group.items.length} barang dipilih</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3.5 w-full md:w-auto justify-between md:justify-end">
                      <div className="text-right">
                        <span className="text-[10px] font-mono font-bold text-slate-500 block uppercase tracking-wider">
                          Subtotal Supplier
                        </span>
                        <span className="text-base sm:text-lg font-mono font-black text-slate-900 tabular-nums">
                          {formatRupiah(groupTotal)}
                        </span>
                      </div>

                      <button
                        onClick={() => handleSendPOWhatsApp(group)}
                        className="btn-arcade px-4 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-900 font-mono font-black text-xs uppercase rounded-xl border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B] flex items-center gap-2 cursor-pointer shrink-0 min-h-[44px]"
                      >
                        <MessageCircle size={16} /> Pesan via WhatsApp
                      </button>
                    </div>
                  </div>

                  {/* Supplier Items Table */}
                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-sans">
                        <thead className="bg-slate-100 border-b-2 border-slate-800 font-mono text-[11px] uppercase tracking-wider text-slate-700 font-bold">
                          <tr>
                            <th className="p-3.5 w-12 text-center">Pilih</th>
                            <th className="p-3.5">Nama Produk &amp; Status</th>
                            <th className="p-3.5">Velocity 7-Hari</th>
                            <th className="p-3.5">Stok Sisa</th>
                            <th className="p-3.5">Saran Kemasan Beli</th>
                            <th className="p-3.5">Jumlah Beli</th>
                            <th className="p-3.5">Satuan</th>
                            <th className="p-3.5 text-right">Subtotal Modal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y border-slate-200 font-medium">
                          {group.items.map(item => {
                            const sel = itemSelections[item.id] || {};
                            const isSelected = sel.selected;
                            const packs = sel.packs || item.suggested_packs || 1;
                            const unitName = sel.unitName || item.pack_unit_name || 'Pcs';
                            const multiplier = sel.multiplier || item.pack_multiplier || 1;
                            const baseQty = packs * multiplier;
                            const subtotal = baseQty * (item.harga_modal || 0);

                            return (
                              <tr 
                                key={item.id}
                                className={`hover:bg-slate-50 transition-colors ${
                                  !isSelected ? 'opacity-40 bg-slate-50/40' : ''
                                } ${item.is_urgent ? 'bg-rose-50/40' : ''}`}
                              >
                                <td className="p-3.5 text-center">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(isSelected)}
                                    onChange={() => toggleItemSelection(item.id)}
                                    className="w-4 h-4 rounded border-2 border-slate-800 text-slate-900 focus:ring-0 cursor-pointer"
                                  />
                                </td>

                                <td className="p-3.5">
                                  <div className="font-bold text-slate-900 text-sm">
                                    {item.nama}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                    {item.is_urgent ? (
                                      <span className="text-[10px] font-mono font-bold bg-rose-500 text-white px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1">
                                        <AlertTriangle size={10} /> Stok Kosong (0)
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-mono font-bold bg-amber-400 text-slate-900 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1">
                                        <AlertCircle size={10} /> Menipis (ROP: {item.reorder_point})
                                      </span>
                                    )}
                                    <span className="text-[10px] font-mono text-slate-500">
                                      HPP: {formatRupiah(item.harga_modal)}
                                    </span>
                                  </div>
                                </td>

                                <td className="p-3.5 font-mono">
                                  <div className="font-bold text-slate-900 tabular-nums">
                                    {item.daily_velocity} <span className="text-[10px] font-normal text-slate-600">pcs/hari</span>
                                  </div>
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    Aktif {item.days_in_stock} hari
                                  </span>
                                </td>

                                <td className="p-3.5 font-mono font-black text-sm tabular-nums">
                                  <span className={item.is_urgent ? 'text-rose-600' : 'text-slate-900'}>
                                    {item.current_stock}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-normal ml-1">Pcs</span>
                                </td>

                                <td className="p-3.5 font-mono font-bold text-emerald-800 bg-emerald-50/60">
                                  <span className="px-2 py-1 rounded bg-emerald-100 border border-emerald-400 inline-block text-xs">
                                    {item.packaging_display}
                                  </span>
                                </td>

                                <td className="p-3.5">
                                  <input
                                    type="number"
                                    min="1"
                                    value={packs}
                                    onChange={(e) => updateItemPacks(item.id, e.target.value)}
                                    disabled={!isSelected}
                                    className="w-20 h-10 bg-white border-2 border-slate-800 rounded-xl text-center font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#CCFF00] shadow-[1px_1px_0px_#1E293B] outline-none transition-all"
                                  />
                                </td>

                                <td className="p-3.5">
                                  {item.available_units && item.available_units.length > 1 ? (
                                    <select
                                      value={sel.unitId || item.available_units[0]?.id}
                                      onChange={(e) => {
                                        const u = item.available_units.find(unit => unit.id === e.target.value);
                                        if (u) updateItemUnit(item.id, u);
                                      }}
                                      disabled={!isSelected}
                                      className="h-10 px-2.5 bg-white border-2 border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-900 shadow-[1px_1px_0px_#1E293B] outline-none focus:ring-2 focus:ring-[#CCFF00] transition-all cursor-pointer"
                                    >
                                      {item.available_units.map(u => (
                                        <option key={u.id} value={u.id}>
                                          {u.unit_name} (x{u.multiplier_to_base})
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className="font-mono font-bold text-xs text-slate-800 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-300 inline-block">
                                      {unitName}
                                    </span>
                                  )}
                                </td>

                                <td className="p-3.5 text-right font-mono font-black text-slate-900 text-sm tabular-nums">
                                  {formatRupiah(subtotal)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </>
          )}
        </div>
      )}

      {/* TAB 2: RIWAYAT PO KULAKAN */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-5 rounded-2xl border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B]">
            <div>
              <h3 className="font-black text-slate-900 text-sm font-display uppercase tracking-tight">
                Riwayat Purchase Order (PO) Kulakan
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Lacak barang yang sudah dipesan ke agen dan catat langsung ke stok saat barang tiba di toko.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('REORDER')}
              className="btn-arcade inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 font-mono font-black text-xs uppercase rounded-xl border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] cursor-pointer min-h-[40px]"
            >
              <Plus size={15} /> Buat PO Baru
            </button>
          </div>

          {purchaseOrders.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] space-y-2">
              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Clock size={24} />
              </div>
              <p className="text-xs font-bold text-slate-700 font-mono">
                Belum ada Purchase Order (PO) yang dibuat.
              </p>
              <p className="text-xs text-slate-500">
                Pilih barang di tab &quot;Daftar Belanja Pasar&quot; lalu klik tombol &quot;Pesan via WhatsApp&quot;.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {purchaseOrders.map(po => {
                const itemsCount = po.items?.length || 0;
                const isSent = po.status === 'SENT';
                const isReceived = po.status === 'RECEIVED';

                return (
                  <div
                    key={po.id}
                    className="bg-white p-5 rounded-2xl border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-slate-900 text-sm">
                          PO #{po.po_number}
                        </span>
                        <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded uppercase border border-slate-800 ${
                          isReceived 
                            ? 'bg-emerald-100 text-emerald-900' 
                            : isSent 
                            ? 'bg-amber-200 text-slate-900'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {isReceived ? 'Diterima' : isSent ? 'Terkirim (Menunggu Barang)' : po.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mt-1">
                        Supplier: <strong className="text-slate-900 font-bold">{po.suppliers?.name || 'Pasar Umum'}</strong> • {itemsCount} SKU Barang
                      </p>
                      <span className="text-[11px] font-mono text-slate-500">
                        Dibuat: {new Date(po.created_at).toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-right">
                        <span className="text-[10px] font-mono font-bold text-slate-500 block uppercase tracking-wider">
                          Estimasi Tagihan
                        </span>
                        <span className="text-base font-mono font-black text-slate-900 tabular-nums">
                          {formatRupiah(po.total_estimated_cost)}
                        </span>
                      </div>

                      {/* JEMBATAN ZERO-RETYPING: PO KE STOCK-IN */}
                      {isSent && (
                        <button
                          onClick={() => handleOpenStockInFromPO(po)}
                          className="btn-arcade inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 font-mono font-black text-xs uppercase rounded-xl border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] cursor-pointer shrink-0 min-h-[44px]"
                          title="Terima barang dan masukkan ke stok tanpa mengetik ulang"
                        >
                          <PackagePlus size={16} /> Terima &amp; Catat Kulakan
                        </button>
                      )}

                      {isReceived && (
                        <span className="text-xs font-mono font-bold text-emerald-800 flex items-center gap-1.5 bg-emerald-100 px-3 py-2 rounded-xl border border-emerald-400">
                          <Check size={15} /> Selesai Masuk Stok
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MASTER AGEN / SUPPLIER */}
      {activeTab === 'SUPPLIERS' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-5 rounded-2xl border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B]">
            <div>
              <h3 className="font-black text-slate-900 text-sm font-display uppercase tracking-tight">
                Master Agen Kulakan &amp; Distributor
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Kelola kontak nomor WhatsApp agen untuk kemudahan 1-klik kirim pesanan kulakan.
              </p>
            </div>
            <button
              onClick={handleOpenAddSupplier}
              className="btn-arcade inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 font-mono font-black text-xs uppercase rounded-xl border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] cursor-pointer min-h-[40px]"
            >
              <Plus size={15} /> Tambah Supplier
            </button>
          </div>

          {suppliers.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] space-y-2">
              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Store size={24} />
              </div>
              <p className="text-xs font-bold text-slate-700 font-mono">
                Belum ada supplier yang terdaftar.
              </p>
              <p className="text-xs text-slate-500">
                Tambahkan supplier langganan untuk mengaktifkan pemesanan WhatsApp otomatis.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suppliers.map(sup => (
                <div
                  key={sup.id}
                  className="bg-white p-5 rounded-2xl border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B] flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-800 text-slate-900 flex items-center justify-center shrink-0">
                          <Store size={16} />
                        </div>
                        <h4 className="font-black text-slate-900 font-display text-base uppercase">
                          {sup.name}
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-800">
                        Lead: {sup.lead_time_days || 1} Hari
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs text-slate-600 font-sans">
                      {sup.phone && (
                        <div className="flex items-center gap-2 font-mono">
                          <Phone size={13} className="text-emerald-700 shrink-0" />
                          <span className="text-slate-900 font-bold">{sup.phone}</span>
                        </div>
                      )}
                      {sup.contact_person && (
                        <div className="flex items-center gap-2">
                          <User size={13} className="text-slate-500 shrink-0" />
                          <span>Sales: {sup.contact_person}</span>
                        </div>
                      )}
                      {sup.address && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 pt-0.5">
                          {sup.address}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-[11px] font-mono text-slate-500">
                      {sup.product_count || 0} Produk Terhubung
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditSupplier(sup)}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-700 border border-slate-300 transition-colors cursor-pointer"
                        title="Edit Supplier"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteSupplier(sup.id)}
                        className="p-2 hover:bg-rose-100 rounded-lg text-rose-600 border border-rose-300 transition-colors cursor-pointer"
                        title="Hapus Supplier"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STICKY BOTTOM TACTILE CASH BAR (BAR KAS TUNAI PASAR SUBUH) */}
      {activeTab === 'REORDER' && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t-2 border-slate-800 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] p-3.5 md:p-4 font-sans">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-5 w-full sm:w-auto justify-between sm:justify-start">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                  Barang Dipilih
                </span>
                <span className="text-sm font-mono font-black text-slate-900">
                  {getSelectedItemsCount()} SKU
                </span>
              </div>

              <div className="h-8 w-0.5 bg-slate-300" />

              <div>
                <span className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider block">
                  Estimasi Uang Tunai Pasar Subuh
                </span>
                <span className="text-lg md:text-xl font-mono font-black text-slate-900 tabular-nums">
                  {formatRupiah(calculateGrandTotal())}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={handleCopyShoppingList}
                className="btn-arcade flex-1 sm:flex-initial px-5 py-2.5 bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 font-mono font-black text-xs uppercase rounded-xl border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B] transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Copy size={15} /> Salin Checklist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUPPLIER (TAMBAH / EDIT) */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white border-2 border-slate-900 shadow-[8px_8px_0px_#1E293B] w-full max-w-md rounded-2xl overflow-hidden animate-in fade-in">
            <div className="p-4 sm:p-5 bg-slate-900 text-[#CCFF00] border-b-2 border-slate-900 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Store size={18} className="text-[#CCFF00]" />
                <h3 className="font-black text-sm font-display uppercase tracking-tight">
                  {editingSupplier ? 'Edit Agen / Supplier' : 'Tambah Agen Baru'}
                </h3>
              </div>
              <button 
                onClick={() => setIsSupplierModalOpen(false)}
                className="text-white hover:text-[#CCFF00] cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-5 space-y-4 font-sans text-xs">
              <div className="space-y-1.5">
                <label className="font-mono font-bold text-slate-700 uppercase tracking-wider">
                  Nama Agen / Toko Grosir: *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Agen Beras Subur"
                  value={supplierFormData.name}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                  className="w-full h-11 bg-slate-50 border-2 border-slate-800 rounded-xl px-3.5 font-medium text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-[#CCFF00] transition-all shadow-[1px_1px_0px_#1E293B]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-mono font-bold text-slate-700 uppercase tracking-wider">
                  Nomor WhatsApp Agen:
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 08123456789"
                  value={supplierFormData.phone}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                  className="w-full h-11 bg-slate-50 border-2 border-slate-800 rounded-xl px-3.5 font-mono font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-[#CCFF00] transition-all shadow-[1px_1px_0px_#1E293B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-mono font-bold text-slate-700 uppercase tracking-wider">
                    Nama Sales / Kontak:
                  </label>
                  <input
                    type="text"
                    placeholder="Pak Budi"
                    value={supplierFormData.contact_person}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, contact_person: e.target.value })}
                    className="w-full h-11 bg-slate-50 border-2 border-slate-800 rounded-xl px-3.5 font-medium text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-[#CCFF00] transition-all shadow-[1px_1px_0px_#1E293B]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono font-bold text-slate-700 uppercase tracking-wider">
                    Lead Time (Hari):
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={supplierFormData.lead_time_days}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, lead_time_days: e.target.value })}
                    className="w-full h-11 bg-slate-50 border-2 border-slate-800 rounded-xl px-3.5 font-mono font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-[#CCFF00] transition-all shadow-[1px_1px_0px_#1E293B]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-mono font-bold text-slate-700 uppercase tracking-wider">
                  Alamat / Keterangan Toko:
                </label>
                <textarea
                  rows="2"
                  placeholder="Pasar Induk Blok C No. 12"
                  value={supplierFormData.address}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-800 rounded-xl p-3 font-medium text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-[#CCFF00] transition-all shadow-[1px_1px_0px_#1E293B]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="btn-arcade px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono font-bold text-xs uppercase rounded-xl border-2 border-slate-800 cursor-pointer transition-colors min-h-[44px]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-arcade px-5 py-2.5 bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 font-mono font-black text-xs uppercase rounded-xl border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] cursor-pointer transition-all min-h-[44px]"
                >
                  Simpan Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ZERO-RETYPING STOCK-IN MODAL (Jembatan PO ke Stock-In) */}
      <StockInModal
        isOpen={isStockInOpen}
        onClose={() => {
          setIsStockInOpen(false);
          setStockInPo(null);
        }}
        initialPo={stockInPo}
        onStockAdded={async () => {
          const updatedPoList = await api.getPurchaseOrders();
          setPurchaseOrders(updatedPoList || []);
          const sugg = await api.getReorderSuggestions();
          setReorderData(sugg);
        }}
      />

      {/* Floating Mode Pasar Subuh Button */}
      {activeTab === 'REORDER' && !isTierLocked && (reorderData?.all_reorder_items?.length || 0) > 0 && (
        <button
          onClick={() => setIsMarketModeOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-slate-900 text-[#CCFF00] hover:bg-slate-800 px-5 py-3.5 rounded-2xl border-2 border-slate-700 shadow-[4px_4px_0px_#000000] font-mono font-black text-xs uppercase flex items-center gap-2.5 transition-transform active:translate-y-0.5 cursor-pointer"
        >
          <Moon size={18} className="text-[#CCFF00]" />
          <span>Mode Pasar Subuh</span>
        </button>
      )}

      {/* MARKET MODE MODAL (Fullscreen Taktil Satu Jempol) */}
      <MarketModeModal
        isOpen={isMarketModeOpen}
        onClose={() => setIsMarketModeOpen(false)}
        reorderData={reorderData}
        shopId={currentShop?.id}
      />
    </div>
  );
}
