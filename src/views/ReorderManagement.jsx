"use client";
import React, { useState, useEffect } from 'react';
import {
  ShoppingBag, Store, Truck, Send, CheckCircle2, AlertTriangle,
  RefreshCw, Plus, Edit2, Trash2, Clock, DollarSign, ArrowUpRight,
  MessageCircle, Copy, ExternalLink, Calendar, ChevronDown, ChevronUp,
  PackagePlus, Layers, Sparkles, Check, Phone, User, AlertCircle
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

    let text = `🛒 DAFTAR BELANJA PASAR SUBUH (${selected.length} SKU)\n`;
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
    showToast('📋 Daftar belanja berhasil disalin ke clipboard!');
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3 font-sans">
        <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <span className="font-mono text-xs font-bold text-slate-700 uppercase tracking-wider">
          Menganalisis Velocity Penjualan 7-Hari &amp; Stok Rak...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-32">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-5 z-50 bg-slate-900 text-[#CCFF00] border-2 border-slate-800 px-4 py-3 rounded-xl shadow-[4px_4px_0_#1E293B] font-mono font-bold text-xs flex items-center gap-2 animate-in fade-in">
          <Sparkles size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Page */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0_#1E293B]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display flex items-center gap-2">
              <ShoppingBag size={24} className="text-emerald-600" />
              Radar Belanja Pasar Subuh
            </h1>
            <span className="text-[10px] font-mono font-bold bg-slate-900 text-[#CCFF00] px-2 py-0.5 rounded border border-slate-800">
              SMART RE-ORDER
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Kalkulator pesanan otomatis berbasis kecepatan jual (velocity) 7-hari, eliminasi sobekan kardus &amp; hitung uang fisik pasar.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleCopyShoppingList}
            className="btn-arcade flex-1 sm:flex-initial px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 font-extrabold text-xs font-mono uppercase rounded-xl border-2 border-slate-800 shadow-[2px_2px_0_#1E293B] flex items-center justify-center gap-1.5 cursor-pointer"
            title="Salin semua item belanja"
          >
            <Copy size={15} /> Salin Checklist
          </button>
          <button
            onClick={loadAllData}
            className="btn-arcade p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl border-2 border-slate-800 shadow-[2px_2px_0_#1E293B] cursor-pointer"
            title="Refresh Kalkulasi"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border-2 border-slate-800 shadow-[3px_3px_0_#1E293B]">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">
            SKU Perlu Kulakan
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-mono font-black text-slate-900">
              {reorderData?.summary?.total_skus_needed || 0}
            </span>
            <span className="text-xs font-mono text-slate-600">Barang</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border-2 border-slate-800 shadow-[3px_3px_0_#1E293B]">
          <span className="text-[10px] font-mono font-bold text-rose-600 uppercase block flex items-center gap-1">
            <AlertTriangle size={12} /> Stok Habis Total (0)
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-mono font-black text-rose-600">
              {reorderData?.summary?.out_of_stock_count || 0}
            </span>
            <span className="text-xs font-mono text-rose-800">SKU Kritis</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border-2 border-slate-800 shadow-[3px_3px_0_#1E293B]">
          <span className="text-[10px] font-mono font-bold text-amber-600 uppercase block">
            Stok Menipis (Di Bawah ROP)
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-mono font-black text-amber-600">
              {reorderData?.summary?.low_stock_count || 0}
            </span>
            <span className="text-xs font-mono text-slate-600">SKU Menipis</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border-2 border-slate-800 shadow-[3px_3px_0_#1E293B] bg-gradient-to-br from-white to-emerald-50">
          <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase block">
            Estimasi Modal Tunai Dibawa
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-lg sm:text-xl font-mono font-black text-emerald-700">
              {formatRupiah(calculateGrandTotal())}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b-2 border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('REORDER')}
          className={`btn-arcade px-4 py-2 text-xs font-mono font-extrabold uppercase rounded-xl transition-all border-2 border-slate-800 ${
            activeTab === 'REORDER'
              ? 'bg-slate-900 text-[#CCFF00] shadow-[3px_3px_0_#1E293B]'
              : 'bg-white text-slate-700 hover:bg-slate-100'
          }`}
        >
          🛒 Daftar Belanja Pasar ({reorderData?.summary?.total_skus_needed || 0})
        </button>

        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`btn-arcade px-4 py-2 text-xs font-mono font-extrabold uppercase rounded-xl transition-all border-2 border-slate-800 ${
            activeTab === 'HISTORY'
              ? 'bg-slate-900 text-[#CCFF00] shadow-[3px_3px_0_#1E293B]'
              : 'bg-white text-slate-700 hover:bg-slate-100'
          }`}
        >
          📜 Riwayat PO Kulakan ({purchaseOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('SUPPLIERS')}
          className={`btn-arcade px-4 py-2 text-xs font-mono font-extrabold uppercase rounded-xl transition-all border-2 border-slate-800 ${
            activeTab === 'SUPPLIERS'
              ? 'bg-slate-900 text-[#CCFF00] shadow-[3px_3px_0_#1E293B]'
              : 'bg-white text-slate-700 hover:bg-slate-100'
          }`}
        >
          🏭 Agen Kulakan / Supplier ({suppliers.length})
        </button>

        <button
          onClick={() => setActiveTab('BRIEFING')}
          className={`btn-arcade px-4 py-2 text-xs font-mono font-extrabold uppercase rounded-xl transition-all border-2 border-slate-800 flex items-center gap-1.5 ${
            activeTab === 'BRIEFING'
              ? 'bg-slate-900 text-[#CCFF00] shadow-[3px_3px_0_#1E293B]'
              : 'bg-white text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Sparkles size={14} className="text-amber-500" />
          🌅 Asisten WA 06:00 (Eksekutif)
        </button>
      </div>

      {/* TAB 1: DAFTAR BELANJA PASAR (GROUPED BY SUPPLIER) */}
      {activeTab === 'REORDER' && (
        <div className="space-y-6">
          {isTierLocked ? (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-10 text-center rounded-2xl border-2 border-slate-800 shadow-[6px_6px_0_#1E293B] space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-400 border-2 border-slate-800 flex items-center justify-center mx-auto shadow-[2px_2px_0_#1E293B]">
                <Sparkles size={28} className="text-slate-900" />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-mono font-black uppercase tracking-wider bg-amber-200 text-slate-900 px-3 py-1 rounded-full border border-slate-800">
                  Fitur Paket Manajer &amp; Eksekutif
                </span>
                <h3 className="text-xl font-black text-slate-900 uppercase font-display mt-2">
                  Radar Belanja Pasar Subuh (Smart Re-Order)
                </h3>
                <p className="text-xs text-slate-600 max-w-lg mx-auto font-sans leading-relaxed">
                  Hitung pesanan otomatis berbasis kecepatan jual (velocity) 7-hari, eliminasi sobekan kardus, konversi kemasan grosir (Dus/Bal), serta siapkan uang kas fisik belanja secara presisi.
                </p>
              </div>
              <div className="pt-2">
                <a
                  href="/billing"
                  className="btn-arcade inline-flex items-center gap-2 bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 font-mono font-bold text-xs uppercase px-6 py-3 rounded-xl border-2 border-slate-800 shadow-[3px_3px_0_#1E293B] transition-all cursor-pointer"
                >
                  🚀 Upgrade Paket Sekarang
                </a>
              </div>
            </div>
          ) : (!reorderData?.supplier_groups || reorderData.supplier_groups.length === 0) ? (
            <div className="bg-white p-12 text-center rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0_#1E293B] space-y-3">
              <CheckCircle2 size={48} className="mx-auto text-emerald-500" />
              <h3 className="text-lg font-black text-slate-900 uppercase">
                Semua Rak Barang Terisi Aman!
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Tidak ada SKU produk yang stoknya berada di bawah ambang batas kritis penjualan 7-hari. Anda bisa bersantai malam ini!
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
                  className="bg-white rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0_#1E293B] overflow-hidden"
                >
                  {/* Supplier Card Header */}
                  <div className="p-4 bg-slate-50 border-b-2 border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setCollapsedSuppliers(prev => ({ ...prev, [sKey]: !prev[sKey] }))}
                        className="p-1 hover:bg-slate-200 rounded border border-slate-800 cursor-pointer"
                      >
                        {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <Store size={18} className="text-slate-700" />
                          <h3 className="text-base font-black text-slate-900 font-display uppercase tracking-tight">
                            {group.supplier_name}
                          </h3>
                          {group.urgent_items_count > 0 && (
                            <span className="text-[10px] font-mono font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                              {group.urgent_items_count} SKU Kritis
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-2">
                          {group.supplier_phone && (
                            <span className="font-mono font-bold text-slate-800">
                              WA: {group.supplier_phone}
                            </span>
                          )}
                          <span>• {selectedCount} dari {group.items.length} barang dipilih</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                      <div className="text-right">
                        <span className="text-[10px] font-mono text-slate-500 block uppercase">
                          Subtotal Supplier
                        </span>
                        <span className="text-base font-mono font-black text-slate-900">
                          {formatRupiah(groupTotal)}
                        </span>
                      </div>

                      <button
                        onClick={() => handleSendPOWhatsApp(group)}
                        className="btn-arcade px-3.5 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-900 font-mono font-black text-xs uppercase rounded-xl border-2 border-slate-800 shadow-[3px_3px_0_#1E293B] flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <MessageCircle size={15} /> 📲 Kirim PO WhatsApp
                      </button>
                    </div>
                  </div>

                  {/* Supplier Items Table */}
                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-sans">
                        <thead className="bg-slate-100 border-b-2 border-slate-800 font-mono text-[11px] uppercase text-slate-700">
                          <tr>
                            <th className="p-3 w-10 text-center">Pilih</th>
                            <th className="p-3">Nama Produk &amp; Status</th>
                            <th className="p-3">Velocity 7-Hari</th>
                            <th className="p-3">Stok Sisa</th>
                            <th className="p-3">Saran Kemasan Beli</th>
                            <th className="p-3">Jumlah Beli</th>
                            <th className="p-3">Satuan</th>
                            <th className="p-3 text-right">Subtotal Modal</th>
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
                                  !isSelected ? 'opacity-40 bg-slate-50/50' : ''
                                } ${item.is_urgent ? 'bg-rose-50/30' : ''}`}
                              >
                                <td className="p-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(isSelected)}
                                    onChange={() => toggleItemSelection(item.id)}
                                    className="w-4 h-4 rounded border-2 border-slate-800 text-slate-900 focus:ring-0 cursor-pointer"
                                  />
                                </td>

                                <td className="p-3">
                                  <div className="font-bold text-slate-900 text-sm">
                                    {item.nama}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {item.is_urgent ? (
                                      <span className="text-[10px] font-mono font-bold bg-rose-500 text-white px-1.5 py-0.2 rounded">
                                        🔴 STOK KOSONG (0)
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-mono font-bold bg-amber-400 text-slate-900 px-1.5 py-0.2 rounded">
                                        ⚠️ MENIPIS (ROP: {item.reorder_point})
                                      </span>
                                    )}
                                    <span className="text-[10px] font-mono text-slate-500">
                                      HPP: {formatRupiah(item.harga_modal)}
                                    </span>
                                  </div>
                                </td>

                                <td className="p-3 font-mono">
                                  <div className="font-bold text-slate-900">
                                    {item.daily_velocity} <span className="text-[10px] font-normal text-slate-600">pcs/hari</span>
                                  </div>
                                  <span className="text-[10px] text-slate-500">
                                    Aktif {item.days_in_stock} hari
                                  </span>
                                </td>

                                <td className="p-3 font-mono font-black text-sm">
                                  <span className={item.is_urgent ? 'text-rose-600' : 'text-slate-800'}>
                                    {item.current_stock}
                                  </span>
                                  <span className="text-[10px] text-slate-500 ml-1">Pcs</span>
                                </td>

                                <td className="p-3 font-mono font-bold text-emerald-700 bg-emerald-50/50">
                                  {item.packaging_display}
                                </td>

                                <td className="p-3">
                                  <input
                                    type="number"
                                    min="1"
                                    value={packs}
                                    onChange={(e) => updateItemPacks(item.id, e.target.value)}
                                    disabled={!isSelected}
                                    className="w-20 h-9 bg-white border-2 border-slate-800 rounded-lg text-center font-mono font-bold text-slate-900 focus:ring-1 focus:ring-[#CCFF00] outline-none"
                                  />
                                </td>

                                <td className="p-3">
                                  {item.available_units && item.available_units.length > 1 ? (
                                    <select
                                      value={sel.unitId || item.available_units[0]?.id}
                                      onChange={(e) => {
                                        const u = item.available_units.find(unit => unit.id === e.target.value);
                                        if (u) updateItemUnit(item.id, u, item);
                                      }}
                                      disabled={!isSelected}
                                      className="h-9 px-2 bg-white border-2 border-slate-800 rounded-lg text-xs font-mono font-bold text-slate-900 outline-none"
                                    >
                                      {item.available_units.map(u => (
                                        <option key={u.id} value={u.id}>
                                          {u.unit_name} (x{u.multiplier_to_base})
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className="font-mono font-bold text-slate-700">
                                      {unitName}
                                    </span>
                                  )}
                                </td>

                                <td className="p-3 text-right font-mono font-black text-slate-900 text-sm">
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

      {/* TAB 2: RIWAYAT PO KULAKAN (DENGAN JEMBATAN ZERO-RETYPING KE STOCK-IN) */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border-2 border-slate-800 shadow-[3px_3px_0_#1E293B]">
            <div>
              <h3 className="font-black text-slate-900 uppercase text-sm">
                Riwayat Purchase Order (PO) Kulakan
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Lacak barang yang sudah dipesan ke agen dan catat langsung ke stok saat barang tiba di toko.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('REORDER')}
              className="btn-arcade px-3 py-1.5 bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 font-mono font-bold text-xs uppercase rounded-xl border-2 border-slate-800 shadow-[2px_2px_0_#1E293B] cursor-pointer"
            >
              + Buat PO Baru
            </button>
          </div>

          {purchaseOrders.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0_#1E293B] space-y-2">
              <Clock size={40} className="mx-auto text-slate-400" />
              <p className="text-xs font-bold text-slate-600">
                Belum ada Purchase Order (PO) yang dibuat.
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
                    className="bg-white p-4 rounded-xl border-2 border-slate-800 shadow-[3px_3px_0_#1E293B] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-slate-900 text-sm">
                          {po.po_number}
                        </span>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                          isReceived 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                            : isSent 
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-slate-100 text-slate-800 border border-slate-300'
                        }`}>
                          {po.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mt-1">
                        Supplier: <strong>{po.suppliers?.name || 'Pasar Umum'}</strong> • {itemsCount} SKU Barang
                      </p>
                      <span className="text-[10px] font-mono text-slate-400">
                        Dibuat: {new Date(po.created_at).toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-right">
                        <span className="text-[10px] font-mono text-slate-500 block uppercase">
                          Estimasi Tagihan
                        </span>
                        <span className="text-base font-mono font-black text-slate-900">
                          {formatRupiah(po.total_estimated_cost)}
                        </span>
                      </div>

                      {/* JEMBATAN ZERO-RETYPING: PO KE STOCK-IN (Patch 3) */}
                      {isSent && (
                        <button
                          onClick={() => handleOpenStockInFromPO(po)}
                          className="btn-arcade px-3 py-2 bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 font-mono font-black text-xs uppercase rounded-xl border-2 border-slate-800 shadow-[2px_2px_0_#1E293B] flex items-center gap-1.5 cursor-pointer shrink-0"
                          title="Terima barang dan masukkan ke stok tanpa mengetik ulang"
                        >
                          <PackagePlus size={16} /> 📦 Terima &amp; Catat Kulakan
                        </button>
                      )}

                      {isReceived && (
                        <span className="text-xs font-mono font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                          <Check size={14} /> Selesai Masuk Stok
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
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border-2 border-slate-800 shadow-[3px_3px_0_#1E293B]">
            <div>
              <h3 className="font-black text-slate-900 uppercase text-sm">
                Master Agen Kulakan &amp; Distributor
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Kelola kontak nomor WhatsApp agen untuk kemudahan 1-klik kirim pesanan kulakan.
              </p>
            </div>
            <button
              onClick={handleOpenAddSupplier}
              className="btn-arcade px-3.5 py-2 bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 font-mono font-bold text-xs uppercase rounded-xl border-2 border-slate-800 shadow-[2px_2px_0_#1E293B] flex items-center gap-1 cursor-pointer"
            >
              <Plus size={15} /> Tambah Supplier
            </button>
          </div>

          {suppliers.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0_#1E293B] space-y-2">
              <Store size={40} className="mx-auto text-slate-400" />
              <p className="text-xs font-bold text-slate-600">
                Belum ada supplier yang terdaftar. Tambahkan supplier langganan warung Anda!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {suppliers.map(sup => (
                <div
                  key={sup.id}
                  className="bg-white p-4 rounded-xl border-2 border-slate-800 shadow-[3px_3px_0_#1E293B] flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="font-black text-slate-900 font-display text-base uppercase">
                        {sup.name}
                      </h4>
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-300">
                        Lead: {sup.lead_time_days || 1} Hari
                      </span>
                    </div>

                    <div className="mt-2 space-y-1 text-xs text-slate-600 font-sans">
                      {sup.phone && (
                        <div className="flex items-center gap-1.5 font-mono">
                          <Phone size={13} className="text-emerald-600" />
                          <span>{sup.phone}</span>
                        </div>
                      )}
                      {sup.contact_person && (
                        <div className="flex items-center gap-1.5">
                          <User size={13} className="text-slate-500" />
                          <span>Sales: {sup.contact_person}</span>
                        </div>
                      )}
                      {sup.address && (
                        <p className="text-[11px] text-slate-500 line-clamp-2">
                          {sup.address}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-[10px] font-mono text-slate-500">
                      {sup.product_count || 0} Produk Terhubung
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditSupplier(sup)}
                        className="p-1.5 hover:bg-slate-100 rounded text-slate-700 border border-slate-300 cursor-pointer"
                        title="Edit Supplier"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteSupplier(sup.id)}
                        className="p-1.5 hover:bg-rose-100 rounded text-rose-600 border border-rose-300 cursor-pointer"
                        title="Hapus Supplier"
                      >
                        <Trash2 size={14} />
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
          <div className="bg-slate-900 text-white p-6 rounded-2xl border-2 border-slate-800 shadow-[6px_6px_0_#1E293B] space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-black bg-[#CCFF00] text-black px-2 py-0.5 rounded uppercase">
                [ TIER 3: EKSEKUTIF AUTOPILOT ]
              </span>
              <span className="text-xs font-mono text-slate-400">06:00 WIB ASSISTANT</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-display text-[#CCFF00]">
              🌅 Asisten Briefing Pagi WhatsApp Jam 06:00
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Puncak otonomi juragan warung. Sistem secara otomatis merangkum kinerja keuangan kemarin (Omzet, Laba Bersih, Selisih Laci Kasir) serta radar barang habis yang harus dibeli ke pasar subuh hari ini langsung ke WhatsApp pribadi Anda setiap pukul 06:00 pagi.
            </p>
          </div>

          {/* Test & Trigger Panel */}
          <div className="bg-white p-6 rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0_#1E293B] space-y-4">
            <h3 className="font-black text-slate-900 uppercase text-sm flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500" />
              Uji Coba Kirim Laporan Briefing Pagi
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-mono font-bold text-slate-700 uppercase">
                  Nomor WhatsApp Pribadi Pemilik:
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 08123456789 atau 628123456789"
                  value={briefingPhone}
                  onChange={(e) => setBriefingPhone(e.target.value)}
                  className="w-full h-11 bg-slate-50 border-2 border-slate-800 rounded-xl px-3 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#CCFF00] outline-none"
                />
              </div>

              <button
                onClick={handleTestBriefing}
                disabled={briefingLoading}
                className="btn-arcade h-11 px-4 bg-emerald-400 hover:bg-emerald-300 text-slate-900 font-mono font-black text-xs uppercase rounded-xl border-2 border-slate-800 shadow-[3px_3px_0_#1E293B] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {briefingLoading ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <MessageCircle size={16} />
                )}
                📲 Tes Kirim Briefing
              </button>
            </div>

            {briefingSuccess && (
              <div className="p-3 bg-emerald-50 border-2 border-emerald-500 text-emerald-900 rounded-xl text-xs font-mono font-bold flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{briefingSuccess}</span>
              </div>
            )}

            {briefingError && (
              <div className="p-3 bg-rose-50 border-2 border-rose-500 text-rose-900 rounded-xl text-xs font-mono font-bold flex items-center gap-2">
                <AlertTriangle size={16} />
                <span>{briefingError}</span>
              </div>
            )}

            {briefingPreview && (
              <div className="space-y-2 mt-4">
                <span className="text-xs font-mono font-bold text-slate-500 uppercase block">
                  Pratinjau Format Pesan WhatsApp:
                </span>
                <pre className="p-4 bg-slate-900 text-emerald-400 rounded-xl border-2 border-slate-800 font-mono text-xs whitespace-pre-wrap overflow-x-auto shadow-inner">
                  {briefingPreview}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STICKY BOTTOM TACTILE CASH BAR (BAR KAS TUNAI PASAR SUBUH) */}
      {activeTab === 'REORDER' && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t-2 border-slate-800 shadow-[0_-4px_10px_rgba(0,0,0,0.08)] p-3 md:p-4 font-sans">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block">
                  Barang Dipilih
                </span>
                <span className="text-sm font-mono font-black text-slate-900">
                  {getSelectedItemsCount()} SKU
                </span>
              </div>

              <div className="h-8 w-0.5 bg-slate-200" />

              <div>
                <span className="text-[10px] font-mono text-emerald-700 uppercase block font-bold">
                  Estimasi Uang Tunai Pasar
                </span>
                <span className="text-lg md:text-xl font-mono font-black text-emerald-700">
                  {formatRupiah(calculateGrandTotal())}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleCopyShoppingList}
                className="btn-arcade flex-1 sm:flex-initial px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 font-mono font-bold text-xs uppercase rounded-xl border-2 border-slate-800 shadow-[2px_2px_0_#1E293B] cursor-pointer flex items-center justify-center gap-1.5"
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
          <div className="bg-white border-2 border-slate-900 shadow-[8px_8px_0_#1E293B] w-full max-w-md rounded-2xl overflow-hidden animate-in fade-in">
            <div className="p-4 bg-slate-900 text-[#CCFF00] border-b-2 border-slate-900 flex justify-between items-center font-mono">
              <h3 className="font-black text-sm uppercase">
                {editingSupplier ? 'Edit Agen / Supplier' : 'Tambah Agen Baru'}
              </h3>
              <button 
                onClick={() => setIsSupplierModalOpen(false)}
                className="text-white hover:text-rose-400 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-5 space-y-4 font-sans text-xs">
              <div className="space-y-1">
                <label className="font-mono font-bold text-slate-700 uppercase">
                  Nama Agen / Toko Grosir: *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Agen Beras Subur"
                  value={supplierFormData.name}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                  className="w-full h-10 bg-slate-50 border-2 border-slate-800 rounded-xl px-3 font-medium text-slate-900 outline-none focus:ring-1 focus:ring-[#CCFF00]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono font-bold text-slate-700 uppercase">
                  Nomor WhatsApp Agen:
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 08123456789"
                  value={supplierFormData.phone}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                  className="w-full h-10 bg-slate-50 border-2 border-slate-800 rounded-xl px-3 font-mono font-bold text-slate-900 outline-none focus:ring-1 focus:ring-[#CCFF00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-mono font-bold text-slate-700 uppercase">
                    Nama Sales / Kontak:
                  </label>
                  <input
                    type="text"
                    placeholder="Pak Budi"
                    value={supplierFormData.contact_person}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, contact_person: e.target.value })}
                    className="w-full h-10 bg-slate-50 border-2 border-slate-800 rounded-xl px-3 font-medium text-slate-900 outline-none focus:ring-1 focus:ring-[#CCFF00]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono font-bold text-slate-700 uppercase">
                    Lead Time (Hari):
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={supplierFormData.lead_time_days}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, lead_time_days: e.target.value })}
                    className="w-full h-10 bg-slate-50 border-2 border-slate-800 rounded-xl px-3 font-mono font-bold text-slate-900 outline-none focus:ring-1 focus:ring-[#CCFF00]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-mono font-bold text-slate-700 uppercase">
                  Alamat / Keterangan Toko:
                </label>
                <textarea
                  rows="2"
                  placeholder="Pasar Induk Blok C No. 12"
                  value={supplierFormData.address}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-800 rounded-xl p-2.5 font-medium text-slate-900 outline-none focus:ring-1 focus:ring-[#CCFF00]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="btn-arcade px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono font-bold text-xs uppercase rounded-xl border border-slate-400 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-arcade px-4 py-2 bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 font-mono font-black text-xs uppercase rounded-xl border-2 border-slate-800 shadow-[2px_2px_0_#1E293B] cursor-pointer"
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
