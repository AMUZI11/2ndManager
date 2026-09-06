"use client";
import React, { useState, useEffect } from 'react';
import {
  ShoppingBag, Store, CheckCircle2, AlertTriangle,
  RefreshCw, Plus, Edit2, Trash2, Clock,
  MessageCircle, Copy, ChevronDown, ChevronUp,
  PackagePlus, Sparkles, Check, Phone, User, AlertCircle,
  History, Building2, Sunrise, ShieldCheck, X
} from 'lucide-react';
import { api } from '@/utils/api';
import { normalizeIndonesianPhone } from '@/lib/phone';
import { createClient } from '@/lib/supabase/client';
import StockInModal from '@/components/products/StockInModal';

export default function ReorderManagement() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('REORDER'); // 'REORDER' | 'HISTORY' | 'SUPPLIERS' | 'BRIEFING'
  
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

  // Briefing Testing State
  const [briefingPhone, setBriefingPhone] = useState('');
  const [briefingPreview, setBriefingPreview] = useState(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingSuccess, setBriefingSuccess] = useState('');
  const [briefingError, setBriefingError] = useState('');

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
    // Sinkronisasi otomatis saat kasir jualan di POS, kulakan masuk, atau PO diperbarui
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

  const updateItemUnit = (productId, unit, product) => {
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

      // 2. Susun Pesan Ringkas Format Pasar Subuh (Patch 4)
      const now = new Date();
      const timeStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ', ' +
                      now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

      let msg = `*PESANAN KULAKAN - 2ndManager*\n`;
      msg += `Tgl: ${timeStr}\n`;
      msg += `No. PO: *#${createdPo.po_number}*\n`;
      msg += `Agen: *${supplierGroup.supplier_name}*\n`;
      msg += `═══════════════════════\n\n`;
      msg += `Halo *${supplierGroup.supplier_name}*, mau order barang untuk pengiriman/ambil pagi ini:\n\n`;

      itemsPayload.forEach((it, idx) => {
        msg += `${idx + 1}. ${it.nama}: *${it.quantity_packs} ${it.pack_unit_name.toUpperCase()}* (~${formatRupiah(it.subtotal)})\n`;
      });

      msg += `\n*Total Estimasi: ${formatRupiah(supplierTotal)}*\n`;
      msg += `Mohon konfirmasi kesiapan barang & total tagihannya ya. Makasih! 🙏\n`;
      msg += `_Dikirim otomatis via 2ndManager Smart Re-Order_`;

      const cleanPhone = normalizeIndonesianPhone(supplierGroup.supplier_phone);
      const encoded = encodeURIComponent(msg);
      const waUrl = cleanPhone 
        ? `https://wa.me/${cleanPhone}?text=${encoded}`
        : `https://wa.me/?text=${encoded}`;

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
      // Refresh suggestions agar grouping supplier terupdate
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

  // ─── TEST MORNING BRIEFING ─────────────────────────────────────────────────
  const handleTestBriefing = async () => {
    setBriefingLoading(true);
    setBriefingSuccess('');
    setBriefingError('');
    try {
      const res = await api.triggerMorningBriefing({
        phone: briefingPhone || undefined,
        testOnly: true,
      });
      setBriefingPreview(res.message);
      setBriefingSuccess(`Briefing Pagi berhasil disusun! Siap dikirim ke ${res.recipient_phone || 'WhatsApp'}.`);
      if (res.whatsapp_url && typeof window !== 'undefined') {
        window.open(res.whatsapp_url, '_blank');
      }
    } catch (err) {
      setBriefingError(err.message || 'Gagal menyusun briefing pagi.');
    } finally {
      setBriefingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 font-sans">
        <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <div className="text-center space-y-1">
          <p className="font-mono text-xs font-semibold text-slate-800 uppercase tracking-wider">
            Menganalisis Velocity Penjualan 7-Hari &amp; Stok Rak
          </p>
          <p className="text-xs text-slate-500">
            Menghitung kalkulasi presisi belanja pasar subuh...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans pb-36">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-800 font-sans text-xs flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2">
          <Sparkles size={16} className="text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Header Page */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/80 shrink-0">
              <ShoppingBag size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-display tracking-tight">
                  Radar Belanja Pasar Subuh
                </h1>
                <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200/60 uppercase tracking-wider">
                  Smart Re-Order
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Kalkulator belanja otomatis berbasis kecepatan jual 7-hari, eliminasi sobekan kardus &amp; hitung uang fisik pasar.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleCopyShoppingList}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all min-h-[44px] cursor-pointer"
            title="Salin semua item belanja"
          >
            <Copy size={15} className="text-slate-500" />
            <span>Salin Checklist</span>
          </button>
          <button
            onClick={loadAllData}
            className="inline-flex items-center justify-center p-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all min-h-[44px] min-w-[44px] cursor-pointer"
            title="Refresh Kalkulasi"
          >
            <RefreshCw size={16} className="text-slate-500" />
          </button>
        </div>
      </div>

      {/* Metrics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: SKU Perlu Kulakan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              SKU Perlu Kulakan
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <ShoppingBag size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-mono font-bold text-slate-900 tabular-nums">
              {reorderData?.summary?.total_skus_needed || 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">Barang siap dibeli</span>
          </div>
        </div>

        {/* Card 2: Stok Kosong Total */}
        <div className="bg-white p-5 rounded-2xl border border-rose-200/80 shadow-xs bg-rose-50/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-rose-600" /> Stok Habis Total (0)
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertCircle size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-mono font-bold text-rose-600 tabular-nums">
              {reorderData?.summary?.out_of_stock_count || 0}
            </span>
            <span className="text-xs text-rose-700 font-medium">SKU Kritis</span>
          </div>
        </div>

        {/* Card 3: Stok Menipis */}
        <div className="bg-white p-5 rounded-2xl border border-amber-200/80 shadow-xs bg-amber-50/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={14} className="text-amber-600" /> Stok Menipis (Di Bawah ROP)
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-mono font-bold text-amber-600 tabular-nums">
              {reorderData?.summary?.low_stock_count || 0}
            </span>
            <span className="text-xs text-amber-700 font-medium">SKU Menipis</span>
          </div>
        </div>

        {/* Card 4: Modal Tunai Dibawa */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-5 rounded-2xl shadow-xs border border-emerald-500/40 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">
              Estimasi Modal Tunai Pasar
            </span>
            <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center backdrop-blur-xs">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl sm:text-2xl font-mono font-black tabular-nums tracking-tight text-white block">
              {formatRupiah(calculateGrandTotal())}
            </span>
            <span className="text-[11px] text-emerald-100/90 font-medium mt-0.5 block">
              Alokasi uang fisik belanja subuh
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation (Modern Segmented Bar) */}
      <div className="bg-slate-200/60 p-1.5 rounded-2xl flex flex-wrap items-center gap-1.5 border border-slate-200/70">
        <button
          onClick={() => setActiveTab('REORDER')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 min-h-[44px] cursor-pointer ${
            activeTab === 'REORDER'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-medium'
          }`}
        >
          <ShoppingBag size={16} className={activeTab === 'REORDER' ? 'text-emerald-600' : 'text-slate-400'} />
          <span>Daftar Belanja Pasar</span>
          <span className={`px-2 py-0.5 rounded-full font-mono text-[11px] ${
            activeTab === 'REORDER' 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold' 
              : 'bg-slate-200 text-slate-600'
          }`}>
            {reorderData?.summary?.total_skus_needed || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 min-h-[44px] cursor-pointer ${
            activeTab === 'HISTORY'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-medium'
          }`}
        >
          <History size={16} className={activeTab === 'HISTORY' ? 'text-emerald-600' : 'text-slate-400'} />
          <span>Riwayat PO Kulakan</span>
          <span className={`px-2 py-0.5 rounded-full font-mono text-[11px] ${
            activeTab === 'HISTORY' 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold' 
              : 'bg-slate-200 text-slate-600'
          }`}>
            {purchaseOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('SUPPLIERS')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 min-h-[44px] cursor-pointer ${
            activeTab === 'SUPPLIERS'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-medium'
          }`}
        >
          <Building2 size={16} className={activeTab === 'SUPPLIERS' ? 'text-emerald-600' : 'text-slate-400'} />
          <span>Agen Kulakan / Supplier</span>
          <span className={`px-2 py-0.5 rounded-full font-mono text-[11px] ${
            activeTab === 'SUPPLIERS' 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold' 
              : 'bg-slate-200 text-slate-600'
          }`}>
            {suppliers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('BRIEFING')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 min-h-[44px] cursor-pointer ${
            activeTab === 'BRIEFING'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-medium'
          }`}
        >
          <Sunrise size={16} className={activeTab === 'BRIEFING' ? 'text-amber-500' : 'text-slate-400'} />
          <span>Asisten WA 06:00</span>
          <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200/60 px-2 py-0.5 rounded-full">
            Eksekutif
          </span>
        </button>
      </div>

      {/* TAB 1: DAFTAR BELANJA PASAR (GROUPED BY SUPPLIER) */}
      {activeTab === 'REORDER' && (
        <div className="space-y-6">
          {isTierLocked ? (
            <div className="bg-gradient-to-br from-amber-50/70 to-orange-50/70 p-10 text-center rounded-2xl border border-amber-200/80 shadow-xs space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
                <Sparkles size={28} />
              </div>
              <div className="space-y-1.5 max-w-lg mx-auto">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider bg-amber-200/80 text-amber-900 px-3 py-1 rounded-full border border-amber-300">
                  Fitur Paket Manajer &amp; Eksekutif
                </span>
                <h3 className="text-xl font-bold text-slate-900 font-display pt-2">
                  Radar Belanja Pasar Subuh (Smart Re-Order)
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-sans">
                  Hitung pesanan otomatis berbasis kecepatan jual (velocity) 7-hari, eliminasi sobekan kardus, konversi kemasan grosir (Dus/Bal), serta siapkan uang kas fisik belanja secara presisi.
                </p>
              </div>
              <div className="pt-2">
                <a
                  href="/billing"
                  className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs uppercase px-6 py-3 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <ShieldCheck size={16} /> Upgrade Paket Sekarang
                </a>
              </div>
            </div>
          ) : (!reorderData?.supplier_groups || reorderData.supplier_groups.length === 0) ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-display">
                Semua Rak Barang Terisi Aman!
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Tidak ada SKU produk yang stoknya berada di bawah ambang batas kritis penjualan 7-hari. Anda bisa beristirahat tenang malam ini.
              </p>
            </div>
          ) : (
            reorderData.supplier_groups.map(group => {
              const sKey = group.supplier_id || 'unassigned';
              const isCollapsed = collapsedSuppliers[sKey];
              const groupTotal = calculateSupplierTotal(group);
              const selectedCount = group.items.filter(it => itemSelections[it.id]?.selected).length;

              return (
                <div 
                  key={sKey}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden"
                >
                  {/* Supplier Card Header */}
                  <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-200/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setCollapsedSuppliers(prev => ({ ...prev, [sKey]: !prev[sKey] }))}
                        className="p-2 hover:bg-slate-200/60 rounded-xl border border-slate-200 text-slate-600 cursor-pointer transition-colors"
                        title={isCollapsed ? "Buka rincian" : "Tutup rincian"}
                      >
                        {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                      </button>
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
                        <Store size={18} />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900 font-display tracking-tight">
                            {group.supplier_name}
                          </h3>
                          {group.urgent_items_count > 0 && (
                            <span className="text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <AlertTriangle size={11} /> {group.urgent_items_count} SKU Kritis
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2 font-sans">
                          {group.supplier_phone && (
                            <span className="font-mono font-semibold text-slate-700">
                              WA: {group.supplier_phone}
                            </span>
                          )}
                          <span className="text-slate-400">•</span>
                          <span>{selectedCount} dari {group.items.length} barang dipilih</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3.5 w-full md:w-auto justify-between md:justify-end">
                      <div className="text-right">
                        <span className="text-[10px] font-mono font-semibold text-slate-400 block uppercase tracking-wider">
                          Subtotal Supplier
                        </span>
                        <span className="text-base sm:text-lg font-mono font-bold text-slate-900 tabular-nums">
                          {formatRupiah(groupTotal)}
                        </span>
                      </div>

                      <button
                        onClick={() => handleSendPOWhatsApp(group)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs uppercase rounded-xl shadow-xs hover:shadow transition-all min-h-[44px] cursor-pointer shrink-0"
                      >
                        <MessageCircle size={16} /> Pesan via WhatsApp
                      </button>
                    </div>
                  </div>

                  {/* Supplier Items Table */}
                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-sans">
                        <thead className="bg-slate-50/90 border-b border-slate-200/80 font-mono text-[11px] uppercase tracking-wider text-slate-500">
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
                        <tbody className="divide-y divide-slate-100 font-medium">
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
                                className={`hover:bg-slate-50/70 transition-colors ${
                                  !isSelected ? 'opacity-40 bg-slate-50/40' : ''
                                } ${item.is_urgent ? 'bg-rose-50/30' : ''}`}
                              >
                                <td className="p-3.5 text-center">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(isSelected)}
                                    onChange={() => toggleItemSelection(item.id)}
                                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                  />
                                </td>

                                <td className="p-3.5">
                                  <div className="font-bold text-slate-900 text-sm">
                                    {item.nama}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                    {item.is_urgent ? (
                                      <span className="text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <AlertTriangle size={10} /> Stok Kosong (0)
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
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
                                    {item.daily_velocity} <span className="text-[10px] font-normal text-slate-500">pcs/hari</span>
                                  </div>
                                  <span className="text-[10px] text-slate-400">
                                    Aktif {item.days_in_stock} hari
                                  </span>
                                </td>

                                <td className="p-3.5 font-mono font-bold text-sm tabular-nums">
                                  <span className={item.is_urgent ? 'text-rose-600' : 'text-slate-800'}>
                                    {item.current_stock}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-normal ml-1">Pcs</span>
                                </td>

                                <td className="p-3.5">
                                  <span className="font-mono font-semibold text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg inline-block">
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
                                    className="w-20 h-10 bg-white border border-slate-200 rounded-xl text-center font-mono font-bold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                                  />
                                </td>

                                <td className="p-3.5">
                                  {item.available_units && item.available_units.length > 1 ? (
                                    <select
                                      value={sel.unitId || item.available_units[0]?.id}
                                      onChange={(e) => {
                                        const u = item.available_units.find(unit => unit.id === e.target.value);
                                        if (u) updateItemUnit(item.id, u, item);
                                      }}
                                      disabled={!isSelected}
                                      className="h-10 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all cursor-pointer"
                                    >
                                      {item.available_units.map(u => (
                                        <option key={u.id} value={u.id}>
                                          {u.unit_name} (x{u.multiplier_to_base})
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className="font-mono font-semibold text-xs text-slate-700 bg-slate-100 px-2.5 py-1.5 rounded-lg inline-block">
                                      {unitName}
                                    </span>
                                  )}
                                </td>

                                <td className="p-3.5 text-right font-mono font-bold text-slate-900 text-sm tabular-nums">
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
            })
          )}
        </div>
      )}

      {/* TAB 2: RIWAYAT PO KULAKAN */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
            <div>
              <h3 className="font-bold text-slate-900 text-sm font-display">
                Riwayat Purchase Order (PO) Kulakan
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Lacak barang yang sudah dipesan ke agen dan catat langsung ke stok saat barang tiba di toko.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('REORDER')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer min-h-[40px]"
            >
              <Plus size={15} /> Buat PO Baru
            </button>
          </div>

          {purchaseOrders.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Clock size={24} />
              </div>
              <p className="text-xs font-semibold text-slate-700">
                Belum ada Purchase Order (PO) yang dibuat.
              </p>
              <p className="text-xs text-slate-400">
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
                    className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          PO #{po.po_number}
                        </span>
                        <span className={`text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full uppercase ${
                          isReceived 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                            : isSent 
                            ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {isReceived ? 'Diterima' : isSent ? 'Terkirim (Menunggu Barang)' : po.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mt-1">
                        Supplier: <strong className="text-slate-800">{po.suppliers?.name || 'Pasar Umum'}</strong> • {itemsCount} SKU Barang
                      </p>
                      <span className="text-[11px] font-mono text-slate-400">
                        Dibuat: {new Date(po.created_at).toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-right">
                        <span className="text-[10px] font-mono font-semibold text-slate-400 block uppercase tracking-wider">
                          Estimasi Tagihan
                        </span>
                        <span className="text-base font-mono font-bold text-slate-900 tabular-nums">
                          {formatRupiah(po.total_estimated_cost)}
                        </span>
                      </div>

                      {/* JEMBATAN ZERO-RETYPING: PO KE STOCK-IN */}
                      {isSent && (
                        <button
                          onClick={() => handleOpenStockInFromPO(po)}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0 min-h-[44px]"
                          title="Terima barang dan masukkan ke stok tanpa mengetik ulang"
                        >
                          <PackagePlus size={16} /> Terima &amp; Catat Kulakan
                        </button>
                      )}

                      {isReceived && (
                        <span className="text-xs font-mono font-semibold text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200/60">
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
          <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
            <div>
              <h3 className="font-bold text-slate-900 text-sm font-display">
                Master Agen Kulakan &amp; Distributor
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola kontak nomor WhatsApp agen untuk kemudahan 1-klik kirim pesanan kulakan.
              </p>
            </div>
            <button
              onClick={handleOpenAddSupplier}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer min-h-[40px]"
            >
              <Plus size={15} /> Tambah Supplier
            </button>
          </div>

          {suppliers.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Store size={24} />
              </div>
              <p className="text-xs font-semibold text-slate-700">
                Belum ada supplier yang terdaftar.
              </p>
              <p className="text-xs text-slate-400">
                Tambahkan supplier langganan untuk mengaktifkan pemesanan WhatsApp otomatis.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suppliers.map(sup => (
                <div
                  key={sup.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                          <Store size={16} />
                        </div>
                        <h4 className="font-bold text-slate-900 font-display text-base">
                          {sup.name}
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                        Lead: {sup.lead_time_days || 1} Hari
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs text-slate-600 font-sans">
                      {sup.phone && (
                        <div className="flex items-center gap-2 font-mono">
                          <Phone size={13} className="text-emerald-600 shrink-0" />
                          <span className="text-slate-800 font-medium">{sup.phone}</span>
                        </div>
                      )}
                      {sup.contact_person && (
                        <div className="flex items-center gap-2">
                          <User size={13} className="text-slate-400 shrink-0" />
                          <span>Sales: {sup.contact_person}</span>
                        </div>
                      )}
                      {sup.address && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 pt-0.5">
                          {sup.address}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-[11px] font-mono text-slate-400">
                      {sup.product_count || 0} Produk Terhubung
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditSupplier(sup)}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                        title="Edit Supplier"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteSupplier(sup.id)}
                        className="p-2 hover:bg-rose-50 rounded-lg text-rose-600 border border-rose-200 transition-colors cursor-pointer"
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

      {/* TAB 4: ASISTEN BRIEFING PAGI 06:00 (TIER 3 EKSEKUTIF AUTOPILOT) */}
      {activeTab === 'BRIEFING' && (
        <div className="space-y-6">
          {/* Executive Header Banner */}
          <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold bg-amber-400/15 text-amber-300 border border-amber-400/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Tier 3: Eksekutif Autopilot
              </span>
              <span className="text-xs font-mono text-slate-400">06:00 WIB Assistant</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-white flex items-center gap-2.5">
              <Sunrise size={24} className="text-amber-400" />
              Asisten Briefing Pagi WhatsApp Jam 06:00
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Puncak otonomi juragan warung. Sistem secara otomatis merangkum kinerja keuangan kemarin (Omzet, Laba Bersih, Selisih Laci Kasir) serta radar barang habis yang harus dibeli ke pasar subuh hari ini langsung ke WhatsApp pribadi Anda setiap pukul 06:00 pagi.
            </p>
          </div>

          {/* Test & Trigger Panel */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm font-display">
                  Uji Coba Kirim Laporan Briefing Pagi
                </h3>
                <p className="text-xs text-slate-500">
                  Kirim simulasi pesan ringkasan subuh langsung ke nomor WhatsApp Anda sekarang.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider">
                  Nomor WhatsApp Pemilik:
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 08123456789 atau 628123456789"
                  value={briefingPhone}
                  onChange={(e) => setBriefingPhone(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                />
              </div>

              <button
                onClick={handleTestBriefing}
                disabled={briefingLoading}
                className="h-11 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs uppercase rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                {briefingLoading ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <MessageCircle size={16} />
                )}
                <span>Tes Kirim Briefing</span>
              </button>
            </div>

            {briefingSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-mono font-medium flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>{briefingSuccess}</span>
              </div>
            )}

            {briefingError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs font-mono font-medium flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                <span>{briefingError}</span>
              </div>
            )}

            {briefingPreview && (
              <div className="space-y-2 mt-4">
                <span className="text-xs font-mono font-semibold text-slate-500 uppercase tracking-wider block">
                  Pratinjau Format Pesan WhatsApp:
                </span>
                <pre className="p-4 bg-slate-950 text-emerald-400 rounded-xl border border-slate-800 font-mono text-xs whitespace-pre-wrap overflow-x-auto shadow-inner">
                  {briefingPreview}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STICKY BOTTOM TACTILE CASH BAR (BAR KAS TUNAI PASAR SUBUH) */}
      {activeTab === 'REORDER' && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] p-3.5 md:p-4 font-sans">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-5 w-full sm:w-auto justify-between sm:justify-start">
              <div>
                <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider block">
                  Barang Dipilih
                </span>
                <span className="text-sm font-mono font-bold text-slate-900">
                  {getSelectedItemsCount()} SKU
                </span>
              </div>

              <div className="h-8 w-px bg-slate-200" />

              <div>
                <span className="text-[10px] font-mono font-semibold text-emerald-700 uppercase tracking-wider block">
                  Estimasi Uang Tunai Pasar Subuh
                </span>
                <span className="text-lg md:text-xl font-mono font-black text-emerald-600 tabular-nums">
                  {formatRupiah(calculateGrandTotal())}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={handleCopyShoppingList}
                className="flex-1 sm:flex-initial px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Copy size={15} /> Salin Checklist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUPPLIER (TAMBAH / EDIT) */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 shadow-xl w-full max-w-md rounded-2xl overflow-hidden animate-in fade-in">
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Store size={18} className="text-emerald-400" />
                <h3 className="font-bold text-sm font-display">
                  {editingSupplier ? 'Edit Agen / Supplier' : 'Tambah Agen Baru'}
                </h3>
              </div>
              <button 
                onClick={() => setIsSupplierModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-5 space-y-4 font-sans text-xs">
              <div className="space-y-1.5">
                <label className="font-mono font-semibold text-slate-700 uppercase tracking-wider">
                  Nama Agen / Toko Grosir: *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Agen Beras Subur"
                  value={supplierFormData.name}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 font-medium text-slate-900 outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-mono font-semibold text-slate-700 uppercase tracking-wider">
                  Nomor WhatsApp Agen:
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 08123456789"
                  value={supplierFormData.phone}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 font-mono font-semibold text-slate-900 outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-mono font-semibold text-slate-700 uppercase tracking-wider">
                    Nama Sales / Kontak:
                  </label>
                  <input
                    type="text"
                    placeholder="Pak Budi"
                    value={supplierFormData.contact_person}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, contact_person: e.target.value })}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 font-medium text-slate-900 outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono font-semibold text-slate-700 uppercase tracking-wider">
                    Lead Time (Hari):
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={supplierFormData.lead_time_days}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, lead_time_days: e.target.value })}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 font-mono font-semibold text-slate-900 outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-mono font-semibold text-slate-700 uppercase tracking-wider">
                  Alamat / Keterangan Toko:
                </label>
                <textarea
                  rows="2"
                  placeholder="Pasar Induk Blok C No. 12"
                  value={supplierFormData.address}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium text-slate-900 outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 cursor-pointer transition-colors min-h-[44px]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs cursor-pointer transition-all min-h-[44px]"
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
    </div>
  );
}
