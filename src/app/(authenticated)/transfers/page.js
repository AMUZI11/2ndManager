"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Truck,
  PackageCheck,
  Radar,
  ArrowRight,
  Printer,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Search,
  Plus,
  Trash2,
  RefreshCw,
  Clock,
  ShieldCheck,
  Send,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { api } from '@/utils/api';
import { printTransferManifestSlip } from '@/utils/escposPrinter';
import PaywallModal from '@/components/ui/PaywallModal';

export default function TransfersPage() {
  const [activeTab, setActiveTab] = useState('DISPATCH'); // 'DISPATCH' | 'RECEIVE' | 'RADAR'
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Paywall Modal state
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isTierLocked, setIsTierLocked] = useState(false);

  // Form Dispatch State
  const [sourceBranchId, setSourceBranchId] = useState('');
  const [targetBranchId, setTargetBranchId] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [dispatchItems, setDispatchItems] = useState([]);
  const [skuSearchQuery, setSkuSearchQuery] = useState('');

  // Success Modal PIN State
  const [createdTransferResult, setCreatedTransferResult] = useState(null);

  // Form Receive State
  const [selectedTransferForReceive, setSelectedTransferForReceive] = useState(null);
  const [receiveSearchCode, setReceiveSearchCode] = useState('');
  const [receivePin, setReceivePin] = useState('');
  const [receiveItemCounts, setReceiveItemCounts] = useState({}); // { [productId]: { received: X, damaged: Y, lost: Z } }

  // Cancel Modal State
  const [transferToCancel, setTransferToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [ownerPinForCancel, setOwnerPinForCancel] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const formatRupiah = (val) => `Rp ${Number(val || 0).toLocaleString('id-ID')}`;

  // Load all initial data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Ambil daftar cabang
      const branchList = await api.getBranches();
      const validBranches = Array.isArray(branchList) ? branchList : [];
      setBranches(validBranches);

      if (validBranches.length >= 2) {
        setSourceBranchId(validBranches[0].id);
        setTargetBranchId(validBranches[1].id);
      } else if (validBranches.length === 1) {
        setSourceBranchId(validBranches[0].id);
      }

      // 2. Ambil katalog produk master
      const prodList = await api.getProducts();
      setProducts(Array.isArray(prodList) ? prodList : []);

      // 3. Ambil riwayat transfer
      const resTransfers = await fetch('/api/v1/transfers');
      if (resTransfers.status === 403) {
        setIsTierLocked(true);
        setIsPaywallOpen(true);
      } else if (resTransfers.ok) {
        const jsonTransfers = await resTransfers.json();
        setTransfers(jsonTransfers.data || []);
      }
    } catch (err) {
      console.error('[TransfersPage] Load error:', err);
      showToast(err.message || 'Gagal memuat data mutasi.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  // Filter SKU produk yang dicari untuk tab Dispatch
  const filteredProducts = useMemo(() => {
    if (!skuSearchQuery.trim()) return [];
    const q = skuSearchQuery.toLowerCase();
    return products
      .filter((p) => (p.nama && p.nama.toLowerCase().includes(q)) || (p.barcode && p.barcode.includes(q)))
      .slice(0, 6);
  }, [products, skuSearchQuery]);

  // Tambah item ke daftar kirim
  const handleAddDispatchItem = (prod) => {
    if (dispatchItems.some((item) => item.product_id === prod.id)) {
      showToast(`Produk ${prod.nama} sudah ada di daftar kirim.`, 'error');
      return;
    }
    setDispatchItems((prev) => [
      ...prev,
      {
        product_id: prod.id,
        nama: prod.nama,
        barcode: prod.barcode,
        qty_dispatched: 1,
        available_stock: Number(prod.stock || 0),
        cogs_per_unit: Number(prod.harga_modal || 0),
        notes: '',
      },
    ]);
    setSkuSearchQuery('');
  };

  const handleUpdateItemQty = (prodId, newQty) => {
    const parsed = Math.max(1, parseInt(newQty, 10) || 1);
    setDispatchItems((prev) =>
      prev.map((it) => (it.product_id === prodId ? { ...it, qty_dispatched: parsed } : it))
    );
  };

  const handleRemoveDispatchItem = (prodId) => {
    setDispatchItems((prev) => prev.filter((it) => it.product_id !== prodId));
  };

  // Submit Kirim Barang (Dispatch)
  const handleDispatchSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!sourceBranchId || !targetBranchId) {
      showToast('Pilih cabang asal dan cabang tujuan.', 'error');
      return;
    }
    if (sourceBranchId === targetBranchId) {
      showToast('Cabang asal dan tujuan tidak boleh sama.', 'error');
      return;
    }
    if (dispatchItems.length === 0) {
      showToast('Daftar produk yang dikirim belum dipilih.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        source_branch_id: sourceBranchId,
        target_branch_id: targetBranchId,
        items: dispatchItems.map((it) => ({
          product_id: it.product_id,
          qty_dispatched: it.qty_dispatched,
          cogs_per_unit: it.cogs_per_unit,
          notes: it.notes || null,
        })),
        notes: dispatchNotes || null,
      };

      const res = await fetch('/api/v1/transfers/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || json.message || 'Gagal menerbitkan surat jalan');
      }

      const srcBranch = branches.find((b) => b.id === sourceBranchId);
      const tgtBranch = branches.find((b) => b.id === targetBranchId);

      setCreatedTransferResult({
        transfer_id: json.data?.transfer_id,
        transfer_number: json.data?.transfer_number,
        pin: json.data?.pin,
        source_branch_name: srcBranch?.branch_name || srcBranch?.name,
        target_branch_name: tgtBranch?.branch_name || tgtBranch?.name,
        items: dispatchItems,
        notes: dispatchNotes,
        dispatched_at: new Date().toISOString(),
      });

      setDispatchItems([]);
      setDispatchNotes('');
      showToast('Surat jalan mutasi berhasil diterbitkan!', 'success');
      loadData();
    } catch (err) {
      console.error('[Dispatch Submit Error]', err);
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Pilih transfer untuk verifikasi penerimaan
  const handleSelectTransferForReceive = (trf) => {
    setSelectedTransferForReceive(trf);
    setReceivePin('');
    const initialCounts = {};
    if (trf.stock_transfer_items) {
      trf.stock_transfer_items.forEach((it) => {
        initialCounts[it.product_id] = {
          received: it.qty_dispatched,
          damaged: 0,
          lost: 0,
        };
      });
    }
    setReceiveItemCounts(initialCounts);
  };

  // Submit Terima Barang (Receive)
  const handleReceiveSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedTransferForReceive) return;
    if (!receivePin || receivePin.trim().length !== 6) {
      showToast('PIN Verifikasi wajib 6 digit angka.', 'error');
      return;
    }

    const items = selectedTransferForReceive.stock_transfer_items || [];
    const receivedPayloadItems = [];

    for (const it of items) {
      const counts = receiveItemCounts[it.product_id] || { received: 0, damaged: 0, lost: 0 };
      const rec = Number(counts.received || 0);
      const dam = Number(counts.damaged || 0);
      const lost = Number(counts.lost || 0);
      const sum = rec + dam + lost;

      if (sum !== it.qty_dispatched) {
        showToast(
          `Total fisik untuk "${it.products?.nama}" (${sum}) tidak sama dengan kuantitas kirim (${it.qty_dispatched}).`,
          'error'
        );
        return;
      }

      receivedPayloadItems.push({
        product_id: it.product_id,
        qty_received: rec,
        qty_damaged: dam,
        qty_lost: lost,
      });
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/v1/transfers/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transfer_id: selectedTransferForReceive.id,
          target_branch_id: selectedTransferForReceive.target_branch_id,
          raw_pin: receivePin.trim(),
          received_items: receivedPayloadItems,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || json.message || 'Verifikasi penerimaan gagal');
      }

      showToast(
        json.data?.status === 'DISCREPANCY'
          ? 'Barang diterima dengan catatan susut perjalanan (Discrepancy).'
          : 'Seluruh barang mutasi berhasil diterima utuh di cabang!',
        'success'
      );

      setSelectedTransferForReceive(null);
      setReceivePin('');
      loadData();
    } catch (err) {
      console.error('[Receive Submit Error]', err);
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Pembatalan Transfer oleh Owner
  const handleCancelSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!transferToCancel) return;
    if (!ownerPinForCancel || ownerPinForCancel.trim().length !== 6) {
      showToast('PIN Owner wajib 6 digit.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/v1/transfers/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transfer_id: transferToCancel.id,
          owner_pin: ownerPinForCancel.trim(),
          reason: cancelReason.trim() || 'Dibatalkan oleh Pemilik Toko',
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || json.message || 'Gagal membatalkan pengiriman');
      }

      showToast('Pengiriman berhasil dibatalkan. Stok pulih ke cabang pengirim.', 'success');
      setTransferToCancel(null);
      setOwnerPinForCancel('');
      setCancelReason('');
      loadData();
    } catch (err) {
      console.error('[Cancel Submit Error]', err);
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Print manifest slip
  const handlePrintSlip = async (transferData) => {
    const success = await printTransferManifestSlip(transferData);
    if (success) {
      showToast('Mencetak surat jalan mutasi...', 'success');
    }
  };

  // WhatsApp share
  const handleShareWhatsApp = (transferData) => {
    const lines = [
      `*SURAT JALAN MUTASI TOKO - 2NDMANAGER*`,
      `No. Tiket : ${transferData.transfer_number}`,
      `Dari      : ${transferData.source_branch_name}`,
      `Tujuan    : ${transferData.target_branch_name}`,
      `Catatan   : ${transferData.notes || '-'}`,
      `---------------------------------`,
      `*PIN RAHASIA PENERIMAAN: [ ${transferData.pin} ]*`,
      `---------------------------------`,
      `*DAFTAR BARANG:*`,
    ];
    if (Array.isArray(transferData.items)) {
      transferData.items.forEach((it, idx) => {
        lines.push(`${idx + 1}. ${it.nama || 'Produk'} - ${it.qty_dispatched} Unit`);
      });
    }
    lines.push(`\nMohon kurir menyerahkan PIN di atas saat barang tiba di toko tujuan.`);
    const url = `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#06090E] text-slate-100 font-mono p-4 md:p-6 pb-24">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 border-2 shadow-[4px_4px_0px_#000000] text-xs font-bold flex items-center gap-2 max-w-md ${
            toast.type === 'error'
              ? 'bg-red-950 border-red-500 text-red-200'
              : 'bg-emerald-950 border-emerald-500 text-emerald-200'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertTriangle size={18} className="text-red-400 shrink-0" strokeWidth={2.5} />
          ) : (
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" strokeWidth={2.5} />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Paywall Overlay */}
      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        featureName="Multi-Cabang & Mutasi Antar-Warung"
        tierRequired="EKSEKUTIF"
        description="Fitur hierarki multi-gerai, surat jalan kurir, dan transfer stok mengambang dua arah eksklusif untuk paket Direktur Eksekutif."
      />

      {/* Top Banner Header */}
      <div className="bg-[#0B0F17] border-3 border-amber-400 p-4 md:p-5 shadow-[6px_6px_0px_#F59E0B] mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-black text-lg md:text-xl tracking-wider">
              <Truck size={24} strokeWidth={2.5} />
              <span>PUSAT MUTASI STOK ANTAR-CABANG</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Protokol transfer stok mengambang (*Two-Phase Handshake*) dengan proteksi PIN 6-digit & audit susut perjalanan.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="px-3 py-2 bg-[#161F30] border-2 border-slate-600 hover:border-amber-400 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-2 transition-all shadow-[2px_2px_0px_#000000]"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} strokeWidth={2.5} />
              <span>SINKRONISASI</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('DISPATCH')}
            className={`py-2.5 px-3 text-xs md:text-sm font-black uppercase tracking-wider border-2 flex items-center justify-center gap-2 transition-all ${
              activeTab === 'DISPATCH'
                ? 'bg-amber-400 text-black border-black shadow-[3px_3px_0px_#000000]'
                : 'bg-[#121926] text-slate-400 border-slate-800 hover:border-slate-600 hover:text-white'
            }`}
          >
            <Truck size={16} strokeWidth={2.5} />
            <span>KIRIM BARANG</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('RECEIVE')}
            className={`py-2.5 px-3 text-xs md:text-sm font-black uppercase tracking-wider border-2 flex items-center justify-center gap-2 transition-all ${
              activeTab === 'RECEIVE'
                ? 'bg-amber-400 text-black border-black shadow-[3px_3px_0px_#000000]'
                : 'bg-[#121926] text-slate-400 border-slate-800 hover:border-slate-600 hover:text-white'
            }`}
          >
            <PackageCheck size={16} strokeWidth={2.5} />
            <span>TERIMA & VERIFIKASI</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('RADAR')}
            className={`py-2.5 px-3 text-xs md:text-sm font-black uppercase tracking-wider border-2 flex items-center justify-center gap-2 transition-all ${
              activeTab === 'RADAR'
                ? 'bg-amber-400 text-black border-black shadow-[3px_3px_0px_#000000]'
                : 'bg-[#121926] text-slate-400 border-slate-800 hover:border-slate-600 hover:text-white'
            }`}
          >
            <Radar size={16} strokeWidth={2.5} />
            <span>RADAR PERJALANAN ({transfers.filter((t) => t.status === 'DISPATCHED').length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: KIRIM BARANG (DISPATCH) */}
      {activeTab === 'DISPATCH' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Pemilihan Cabang & SKU */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#0B0F17] border-2 border-slate-800 p-5 shadow-[4px_4px_0px_#000000]">
              <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Truck size={18} strokeWidth={2.5} />
                <span>RUTE PENGIRIMAN ANTAR-CABANG</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="source-branch" className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Cabang Pengirim (Asal):
                  </label>
                  <select
                    id="source-branch"
                    value={sourceBranchId}
                    onChange={(e) => setSourceBranchId(e.target.value)}
                    className="w-full bg-[#161F30] border-2 border-slate-700 focus:border-amber-400 text-white font-bold p-2.5 text-xs outline-none uppercase"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.branch_name || b.name} ({b.branch_code}) {b.is_main_branch ? '[PUSAT]' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="target-branch" className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Cabang Penerima (Tujuan):
                  </label>
                  <select
                    id="target-branch"
                    value={targetBranchId}
                    onChange={(e) => setTargetBranchId(e.target.value)}
                    className="w-full bg-[#161F30] border-2 border-slate-700 focus:border-amber-400 text-white font-bold p-2.5 text-xs outline-none uppercase"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id} disabled={b.id === sourceBranchId}>
                        {b.branch_name || b.name} ({b.branch_code}) {b.is_main_branch ? '[PUSAT]' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pencarian SKU */}
              <div className="mt-5 pt-4 border-t border-slate-800">
                <label htmlFor="search-sku" className="block text-xs font-bold text-amber-300 uppercase mb-1">
                  Cari SKU Barang yang Ingin Dimutasi:
                </label>
                <div className="relative">
                  <div className="flex items-center gap-2 bg-[#161F30] border-2 border-slate-700 focus-within:border-amber-400 p-2.5">
                    <Search size={16} className="text-amber-400 shrink-0" strokeWidth={2.5} />
                    <input
                      id="search-sku"
                      type="text"
                      value={skuSearchQuery}
                      onChange={(e) => setSkuSearchQuery(e.target.value)}
                      placeholder="Ketik nama produk atau scan barcode..."
                      className="w-full bg-transparent text-white font-bold outline-none text-xs placeholder:text-slate-500 uppercase"
                    />
                  </div>

                  {filteredProducts.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-30 bg-[#0E1522] border-2 border-amber-400 mt-1 shadow-[4px_4px_0px_#000000] max-h-56 overflow-y-auto">
                      {filteredProducts.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleAddDispatchItem(p)}
                          className="w-full text-left p-3 hover:bg-slate-800 border-b border-slate-800 flex items-center justify-between transition-colors"
                        >
                          <div>
                            <p className="font-bold text-xs text-white uppercase">{p.nama}</p>
                            <p className="text-[10px] text-slate-400 font-mono">Barcode: {p.barcode || '-'}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-amber-400">Stok: {p.stock || 0}</span>
                            <span className="block text-[10px] text-slate-400">HPP: {formatRupiah(p.harga_modal)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Catatan Kurir */}
              <div className="mt-4">
                <label htmlFor="courier-notes" className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Catatan Kurir / Nomor Plat Kendaraan:
                </label>
                <input
                  id="courier-notes"
                  type="text"
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  placeholder="Misal: Kurir Pak Joko (Motor Honda Beat B 1234 XYZ)"
                  className="w-full bg-[#161F30] border-2 border-slate-700 focus:border-amber-400 p-2 text-xs text-white outline-none"
                />
              </div>
            </div>

            {/* Tabel Item Kirim */}
            <div className="bg-[#0B0F17] border-2 border-slate-800 p-5 shadow-[4px_4px_0px_#000000]">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Daftar SKU Pengiriman ({dispatchItems.length} Produk)
                </h4>
                {dispatchItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDispatchItems([])}
                    className="text-[10px] text-red-400 hover:underline uppercase font-bold"
                  >
                    Kosongkan Semua
                  </button>
                )}
              </div>

              {dispatchItems.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-800 text-slate-500 text-xs">
                  Belum ada produk yang dipilih. Cari dan tambahkan SKU melalui kolom pencarian di atas.
                </div>
              ) : (
                <div className="space-y-3">
                  {dispatchItems.map((item) => (
                    <div
                      key={item.product_id}
                      className="p-3 bg-[#121926] border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-white uppercase truncate">{item.nama}</p>
                        <p className="text-[10px] text-slate-400 font-mono">Barcode: {item.barcode || '-'}</p>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <label htmlFor={`qty-input-${item.product_id}`} className="text-[10px] text-slate-400 uppercase">
                            Qty Kirim:
                          </label>
                          <input
                            id={`qty-input-${item.product_id}`}
                            type="number"
                            min="1"
                            value={item.qty_dispatched}
                            onChange={(e) => handleUpdateItemQty(item.product_id, e.target.value)}
                            className="w-16 bg-[#161F30] border-2 border-amber-400 text-amber-300 font-black text-center p-1 text-xs outline-none"
                          />
                          <span className="text-xs text-slate-400">Pcs</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveDispatchItem(item.product_id)}
                          className="text-red-400 hover:text-red-300 p-1 hover:bg-red-950/40 transition-colors"
                        >
                          <Trash2 size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Kolom Kanan Ringkasan & Terbitkan */}
          <div className="space-y-6">
            <div className="bg-[#0B0F17] border-2 border-amber-400 p-5 shadow-[4px_4px_0px_#000000]">
              <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider mb-4 border-b border-amber-400/40 pb-2">
                RINGKASAN SURAT JALAN
              </h4>

              <div className="space-y-2.5 text-xs mb-6">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Macam SKU:</span>
                  <span className="font-bold text-white">{dispatchItems.length} Produk</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Kuantitas Fisik:</span>
                  <span className="font-bold text-amber-400">
                    {dispatchItems.reduce((sum, it) => sum + Number(it.qty_dispatched || 0), 0)} Unit
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-2">
                  <span className="text-slate-400">Estimasi Nilai HPP:</span>
                  <span className="font-bold text-white">
                    {formatRupiah(
                      dispatchItems.reduce(
                        (sum, it) => sum + Number(it.qty_dispatched || 0) * Number(it.cogs_per_unit || 0),
                        0
                      )
                    )}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDispatchSubmit}
                disabled={actionLoading || dispatchItems.length === 0}
                className={`w-full py-3 px-4 font-black uppercase text-xs border-2 border-black flex items-center justify-center gap-2 transition-all ${
                  actionLoading || dispatchItems.length === 0
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border-slate-700'
                    : 'bg-amber-400 text-black hover:bg-amber-300 shadow-[4px_4px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px]'
                }`}
              >
                <Truck size={18} strokeWidth={2.5} />
                <span>{actionLoading ? 'MENERBITKAN...' : 'KIRIM BARANG & SURAT JALAN'}</span>
              </button>

              <p className="text-[10px] text-slate-400 mt-3 text-center">
                Stok cabang asal akan dikunci mengambang (*In-Transit*) hingga diverifikasi di cabang tujuan.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TERIMA & VERIFIKASI FISIK (RECEIVE) */}
      {activeTab === 'RECEIVE' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Kolom Kiri: Pilih Pengiriman yang Siap Diterima */}
          <div className="space-y-4">
            <div className="bg-[#0B0F17] border-2 border-slate-800 p-4 shadow-[4px_4px_0px_#000000]">
              <label htmlFor="receive-search-input" className="block text-xs font-bold text-amber-400 uppercase mb-2">
                Pilih atau Scan Nomor Surat Jalan:
              </label>
              <div className="flex items-center gap-2 bg-[#161F30] border border-slate-700 p-2 mb-3">
                <Search size={16} className="text-amber-400 shrink-0" strokeWidth={2.5} />
                <input
                  id="receive-search-input"
                  type="text"
                  value={receiveSearchCode}
                  onChange={(e) => setReceiveSearchCode(e.target.value.toUpperCase())}
                  placeholder="TRF-YYYYMMDD-XXXX"
                  className="w-full bg-transparent text-white font-mono font-bold outline-none text-xs uppercase"
                />
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {transfers
                  .filter((t) => t.status === 'DISPATCHED')
                  .filter((t) => !receiveSearchCode || t.transfer_number.includes(receiveSearchCode))
                  .map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelectTransferForReceive(t)}
                      className={`w-full text-left p-3 border-2 transition-all ${
                        selectedTransferForReceive?.id === t.id
                          ? 'bg-amber-400/10 border-amber-400'
                          : 'bg-[#121926] border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-amber-300">{t.transfer_number}</span>
                        <span className="text-[10px] bg-amber-400 text-black px-1.5 py-0.5 font-bold">
                          IN-TRANSIT
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        {t.source_branch?.branch_name} <ArrowRight size={10} className="inline mx-1" /> {t.target_branch?.branch_name}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        {t.stock_transfer_items?.length || 0} SKU • {new Date(t.dispatched_at).toLocaleTimeString('id-ID')}
                      </p>
                    </button>
                  ))}

                {transfers.filter((t) => t.status === 'DISPATCHED').length === 0 && (
                  <p className="text-slate-500 text-xs text-center py-6">
                    Tidak ada kiriman barang yang sedang mengambang saat ini.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Kolom Tengah & Kanan: Formulir Verifikasi Fisik & PIN */}
          <div className="lg:col-span-2">
            {!selectedTransferForReceive ? (
              <div className="bg-[#0B0F17] border-2 border-slate-800 p-12 text-center text-slate-500 text-xs shadow-[4px_4px_0px_#000000]">
                Pilih tiket surat jalan dari kolom sebelah kiri untuk memulai pemeriksaan fisik dan verifikasi PIN.
              </div>
            ) : (
              <div className="bg-[#0B0F17] border-2 border-amber-400 p-5 shadow-[6px_6px_0px_#000000] space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-amber-400/40 pb-4 gap-2">
                  <div>
                    <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider">
                      VERIFIKASI FISIK: {selectedTransferForReceive.transfer_number}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Dari: {selectedTransferForReceive.source_branch?.branch_name} • Catatan: {selectedTransferForReceive.notes || '-'}
                    </p>
                  </div>
                  <div className="text-xs text-slate-300 font-bold bg-slate-800 px-3 py-1 border border-slate-700">
                    Cabang Tujuan: {selectedTransferForReceive.target_branch?.branch_name}
                  </div>
                </div>

                {/* Input 6-Digit PIN */}
                <div className="bg-[#121926] border-2 border-amber-500/60 p-4">
                  <label htmlFor="verify-pin-input" className="block text-xs font-bold text-amber-300 uppercase mb-1">
                    Masukkan PIN 6-Digit Surat Jalan:
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Minta PIN 6-digit rahasia dari sopir / kurir pengantar barang.
                  </p>
                  <input
                    id="verify-pin-input"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={receivePin}
                    onChange={(e) => setReceivePin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="● ● ● ● ● ●"
                    className="w-full max-w-xs bg-[#161F30] border-2 border-amber-400 p-2 text-center text-amber-400 font-black tracking-[0.4em] text-lg outline-none"
                  />
                </div>

                {/* Tabel Rekonsiliasi Fisik */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Pemeriksaan Fisik per Produk:
                  </h4>

                  {(selectedTransferForReceive.stock_transfer_items || []).map((it) => {
                    const counts = receiveItemCounts[it.product_id] || { received: it.qty_dispatched, damaged: 0, lost: 0 };
                    const sum = Number(counts.received || 0) + Number(counts.damaged || 0) + Number(counts.lost || 0);
                    const isMatched = sum === it.qty_dispatched;

                    return (
                      <div
                        key={it.product_id}
                        className={`p-4 border-2 transition-all ${
                          isMatched ? 'bg-[#121926] border-slate-700' : 'bg-red-950/20 border-red-500'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                          <div>
                            <p className="font-bold text-xs text-white uppercase">{it.products?.nama || 'Produk'}</p>
                            <p className="text-[10px] text-slate-400 font-mono">Barcode: {it.products?.barcode || '-'}</p>
                          </div>
                          <div className="text-xs font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 border border-amber-500/40">
                            Dikirim: {it.qty_dispatched} Pcs
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label htmlFor={`good-input-${it.product_id}`} className="block text-[10px] font-bold text-emerald-400 uppercase mb-1">
                              Kondisi Baik:
                            </label>
                            <input
                              id={`good-input-${it.product_id}`}
                              type="number"
                              min="0"
                              max={it.qty_dispatched}
                              value={counts.received}
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                setReceiveItemCounts((prev) => ({
                                  ...prev,
                                  [it.product_id]: { ...counts, received: val },
                                }));
                              }}
                              className="w-full bg-[#161F30] border border-emerald-500 text-emerald-300 font-bold p-1.5 text-xs text-center outline-none"
                            />
                          </div>

                          <div>
                            <label htmlFor={`damaged-input-${it.product_id}`} className="block text-[10px] font-bold text-amber-400 uppercase mb-1">
                              Rusak / Pecah:
                            </label>
                            <input
                              id={`damaged-input-${it.product_id}`}
                              type="number"
                              min="0"
                              max={it.qty_dispatched}
                              value={counts.damaged}
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                setReceiveItemCounts((prev) => ({
                                  ...prev,
                                  [it.product_id]: { ...counts, damaged: val },
                                }));
                              }}
                              className="w-full bg-[#161F30] border border-amber-500 text-amber-300 font-bold p-1.5 text-xs text-center outline-none"
                            />
                          </div>

                          <div>
                            <label htmlFor={`lost-input-${it.product_id}`} className="block text-[10px] font-bold text-red-400 uppercase mb-1">
                              Hilang / Kurang:
                            </label>
                            <input
                              id={`lost-input-${it.product_id}`}
                              type="number"
                              min="0"
                              max={it.qty_dispatched}
                              value={counts.lost}
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                setReceiveItemCounts((prev) => ({
                                  ...prev,
                                  [it.product_id]: { ...counts, lost: val },
                                }));
                              }}
                              className="w-full bg-[#161F30] border border-red-500 text-red-300 font-bold p-1.5 text-xs text-center outline-none"
                            />
                          </div>
                        </div>

                        {!isMatched && (
                          <p className="text-[10px] text-red-400 font-bold mt-2">
                            Total fisik ({sum}) belum sama dengan kuantitas kirim ({it.qty_dispatched}).
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Tombol Konfirmasi Penerimaan */}
                <button
                  type="button"
                  onClick={handleReceiveSubmit}
                  disabled={actionLoading || receivePin.length !== 6}
                  className={`w-full py-3 px-4 font-black uppercase text-xs border-2 border-black flex items-center justify-center gap-2 transition-all ${
                    actionLoading || receivePin.length !== 6
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border-slate-700'
                      : 'bg-emerald-400 text-black hover:bg-emerald-300 shadow-[4px_4px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px]'
                  }`}
                >
                  <PackageCheck size={18} strokeWidth={2.5} />
                  <span>{actionLoading ? 'MEMVERIFIKASI...' : 'KONFIRMASI PENERIMAAN & MUTASI STOK'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: RADAR BARANG DALAM PERJALANAN (IN-TRANSIT RADAR) */}
      {activeTab === 'RADAR' && (
        <div className="space-y-6">
          <div className="bg-[#0B0F17] border-2 border-slate-800 p-5 shadow-[4px_4px_0px_#000000]">
            <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Radar size={18} strokeWidth={2.5} />
              <span>RADAR PENGAWASAN BARANG DALAM PERJALANAN</span>
            </h3>

            {transfers.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-10">Belum ada riwayat surat jalan mutasi.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#161F30] text-amber-400 uppercase border-b-2 border-slate-700">
                    <tr>
                      <th className="p-3">No. Tiket</th>
                      <th className="p-3">Rute Cabang</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Item / Total</th>
                      <th className="p-3">Waktu Kirim</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {transfers.map((t) => {
                      const totalQty = (t.stock_transfer_items || []).reduce(
                        (sum, it) => sum + Number(it.qty_dispatched || 0),
                        0
                      );

                      return (
                        <tr key={t.id} className="hover:bg-slate-900/60 transition-colors">
                          <td className="p-3 font-mono font-bold text-white">{t.transfer_number}</td>
                          <td className="p-3 text-slate-300">
                            {t.source_branch?.branch_name} <ArrowRight size={12} className="inline mx-1" /> {t.target_branch?.branch_name}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-black uppercase ${
                                t.status === 'DISPATCHED'
                                  ? 'bg-amber-400 text-black'
                                  : t.status === 'RECEIVED'
                                  ? 'bg-emerald-500 text-black'
                                  : t.status === 'DISCREPANCY'
                                  ? 'bg-red-500 text-white'
                                  : 'bg-slate-700 text-slate-300'
                              }`}
                            >
                              {t.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-300 font-mono">
                            {t.stock_transfer_items?.length || 0} SKU ({totalQty} Pcs)
                          </td>
                          <td className="p-3 text-slate-400 text-[11px]">
                            {new Date(t.dispatched_at).toLocaleString('id-ID')}
                          </td>
                          <td className="p-3 text-right space-x-2">
                            {t.status === 'DISPATCHED' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setTransferToCancel(t);
                                  setCancelReason('');
                                  setOwnerPinForCancel('');
                                }}
                                className="px-2.5 py-1 bg-red-950/80 border border-red-600 hover:bg-red-900 text-red-300 text-[10px] font-bold uppercase transition-colors"
                              >
                                Batalkan
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL HASIL KIRIM: PIN RAHASIA & CETAK STRUK */}
      {createdTransferResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-[#0B0F17] border-4 border-amber-400 p-6 shadow-[8px_8px_0px_#000000] text-slate-100 font-mono">
            <div className="flex items-center gap-2 text-amber-400 font-black text-base uppercase mb-4 border-b border-amber-400/40 pb-3">
              <CheckCircle2 size={20} className="text-emerald-400 shrink-0" strokeWidth={2.5} />
              <span>SURAT JALAN BERHASIL DITERBITKAN!</span>
            </div>

            <p className="text-xs text-slate-300 mb-1">Nomor Tiket: {createdTransferResult.transfer_number}</p>
            <p className="text-xs text-slate-400 mb-4">
              Dari: {createdTransferResult.source_branch_name} ke {createdTransferResult.target_branch_name}
            </p>

            <div className="bg-[#161F30] border-2 border-amber-400 p-4 text-center mb-5">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                PIN VERIFIKASI RAHASIA:
              </span>
              <span className="text-3xl font-black text-amber-400 tracking-[0.3em]">
                {createdTransferResult.pin}
              </span>
              <span className="block text-[10px] text-amber-300 mt-2">
                (Wajib diserahkan ke kurir / penerima di cabang tujuan)
              </span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handlePrintSlip(createdTransferResult)}
                className="w-full py-2.5 px-4 bg-amber-400 text-black font-black uppercase text-xs border-2 border-black flex items-center justify-center gap-2 hover:bg-amber-300 transition-all shadow-[2px_2px_0px_#000000]"
              >
                <Printer size={16} strokeWidth={2.5} />
                <span>CETAK SURAT JALAN THERMAL</span>
              </button>

              <button
                type="button"
                onClick={() => handleShareWhatsApp(createdTransferResult)}
                className="w-full py-2.5 px-4 bg-emerald-600 text-white font-black uppercase text-xs border-2 border-black flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all shadow-[2px_2px_0px_#000000]"
              >
                <Send size={16} strokeWidth={2.5} />
                <span>KIRIM KE WHATSAPP KURIR</span>
              </button>

              <button
                type="button"
                onClick={() => setCreatedTransferResult(null)}
                className="w-full py-2 px-4 bg-slate-800 text-slate-300 font-bold uppercase text-xs border border-slate-700 hover:bg-slate-700 mt-2 transition-colors"
              >
                TUTUP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PEMBATALAN OLEH OWNER */}
      {transferToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-[#0B0F17] border-4 border-red-500 p-6 shadow-[8px_8px_0px_#000000] text-slate-100 font-mono">
            <div className="flex items-center gap-2 text-red-400 font-black text-base uppercase mb-4 border-b border-red-500/40 pb-3">
              <AlertTriangle size={20} className="text-red-400 shrink-0" strokeWidth={2.5} />
              <span>BATALKAN SURAT JALAN MUTASI</span>
            </div>

            <p className="text-xs text-slate-300 mb-2">
              Tiket: <span className="font-bold text-white">{transferToCancel.transfer_number}</span>
            </p>
            <p className="text-[11px] text-amber-300 bg-amber-950/40 border border-amber-600/40 p-2.5 mb-4">
              Stok mengambang (*In-Transit*) akan dipulihkan secara otomatis ke stok fisik cabang asal.
            </p>

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div>
                <label htmlFor="cancel-reason-input" className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Alasan Pembatalan:
                </label>
                <input
                  id="cancel-reason-input"
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Misal: Kurir berhalangan / Salah sortir"
                  className="w-full bg-[#161F30] border-2 border-slate-700 p-2 text-xs text-white outline-none focus:border-red-400"
                />
              </div>

              <div>
                <label htmlFor="cancel-owner-pin-input" className="block text-xs font-bold text-red-400 uppercase mb-1">
                  PIN Otorisasi Pemilik (6 Digit):
                </label>
                <input
                  id="cancel-owner-pin-input"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={ownerPinForCancel}
                  onChange={(e) => setOwnerPinForCancel(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="● ● ● ● ● ●"
                  className="w-full bg-[#161F30] border-2 border-red-500 p-2 text-center text-red-400 font-black tracking-[0.4em] text-base outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTransferToCancel(null)}
                  className="w-1/2 py-2.5 px-3 bg-slate-800 text-slate-300 font-bold uppercase text-xs border border-slate-700 hover:bg-slate-700 transition-colors"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || ownerPinForCancel.length !== 6}
                  className={`w-1/2 py-2.5 px-3 font-black uppercase text-xs border-2 border-black flex items-center justify-center gap-1.5 transition-all ${
                    actionLoading || ownerPinForCancel.length !== 6
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-red-500 text-white hover:bg-red-400 shadow-[2px_2px_0px_#000000]'
                  }`}
                >
                  <XCircle size={16} strokeWidth={2.5} />
                  <span>{actionLoading ? 'MEMBATALKAN...' : 'KONFIRMASI BATAL'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
