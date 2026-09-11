"use client";
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale, CheckCircle2, AlertTriangle, MessageCircle, X,
  Banknote, RefreshCw, AlertCircle, Send, ShieldAlert, Sparkles
} from 'lucide-react';
import { api } from '@/utils/api';
import { calculateTripartiteSettlement, generateConsignmentWhatsAppReceipt } from '@/utils/consignmentEngine';
import { kickCashDrawerDirect } from '@/utils/escposPrinter';

export default function ConsignmentSettleModal({
  isOpen,
  onClose,
  batch = null,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [returnedGoodQty, setReturnedGoodQty] = useState('0');
  const [returnedStaleQty, setReturnedStaleQty] = useState('0');
  const [stalePolicy, setStalePolicy] = useState(batch?.consignment_vendors?.stale_policy || 'VENDOR_BORNE');
  const [paymentMethod, setPaymentMethod] = useState('TUNAI'); // 'TUNAI' | 'TRANSFER'
  const [settleNotes, setSettleNotes] = useState('');

  const qMasuk = batch?.received_qty || 0;
  const vendorPrice = Number(batch?.vendor_price_per_unit || 0);
  const sellingPrice = Number(batch?.selling_price_per_unit || 0);

  const numGood = Math.max(0, parseInt(returnedGoodQty, 10) || 0);
  const numStale = Math.max(0, parseInt(returnedStaleQty, 10) || 0);

  // Kalkulasi Tripartit menggunakan consignmentEngine
  const calculations = useMemo(() => {
    return calculateTripartiteSettlement({
      qReceived: qMasuk,
      qSoldPos: batch?.sold_qty !== undefined ? batch.sold_qty : null,
      qReturnedGood: numGood,
      qReturnedStale: numStale,
      vendorPrice,
      sellingPrice,
      stalePolicy,
    });
  }, [qMasuk, batch?.sold_qty, numGood, numStale, vendorPrice, sellingPrice, stalePolicy]);

  if (!isOpen || !batch) return null;

  const formatRupiah = (val) => `Rp ${Number(val || 0).toLocaleString('id-ID')}`;

  const handleSettle = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Eksekusi settlement di database
      await api.settleConsignmentBatch(batch.id, {
        returned_qty: numGood,
        damaged_qty: numStale,
        loss_borne_by: stalePolicy,
        stale_policy: stalePolicy,
        payment_method: paymentMethod,
        notes: settleNotes.trim() || null,
      });

      // 2. Jika bayar tunai via laci kasir, hentak laci fisik
      if (paymentMethod === 'TUNAI') {
        try {
          await kickCashDrawerDirect();
        } catch (drawerErr) {
          console.warn('[Consignment Settle] Kick drawer error:', drawerErr);
        }
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Gagal menyelesaikan settlement.');
    } finally {
      setLoading(false);
    }
  };

  // WhatsApp Message Generator
  const handleOpenWhatsApp = () => {
    const wa = generateConsignmentWhatsAppReceipt({
      vendorName: batch.consignment_vendors?.nama_vendor || 'Bapak/Ibu Vendor',
      vendorPhone: batch.consignment_vendors?.phone || batch.consignment_vendors?.phone_number || '',
      productName: batch.products?.nama || 'Produk Titipan',
      qReceived: qMasuk,
      qSold: calculations.qSold,
      qReturnedGood: numGood,
      qReturnedStale: numStale,
      stalePolicy,
      vendorPayout: calculations.vendorPayout,
      vendorPrice,
      storeName: '2ndManager Warung',
    });

    if (wa.encodedUrl) {
      window.open(wa.encodedUrl, '_blank');
    } else {
      alert('Nomor telepon vendor tidak valid atau belum diisi.');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-sans">
        <motion.div
          initial={{ scale: 0.95, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 20, opacity: 0 }}
          className="bg-white rounded-2xl max-w-lg w-full shadow-[8px_8px_0px_#1E293B] border-2 border-slate-800 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-slate-900 text-[#CCFF00] p-4 flex items-center justify-between border-b-2 border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#CCFF00]/20 flex items-center justify-center border border-[#CCFF00]/40">
                <Scale size={18} className="text-[#CCFF00]" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wider font-mono">
                  Rekonsiliasi &amp; Settlement Konsinyasi
                </h3>
                <p className="text-[11px] text-white/70 font-sans">
                  Hitung tripartit sisa kue, kebijakan basi &amp; laci kasir
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border-2 border-rose-500 rounded-xl text-rose-800 text-xs font-mono font-bold flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Batch Info Card */}
            <div className="p-3.5 bg-slate-50 border-2 border-slate-800 rounded-xl space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-900">
                  {batch.products?.nama || 'Produk Titipan'}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 bg-indigo-100 text-indigo-900 rounded font-bold">
                  {batch.consignment_vendors?.nama_vendor || 'Vendor'}
                </span>
              </div>
              <div className="flex justify-between text-xs font-mono text-slate-600 pt-1 border-t border-slate-200">
                <span>Titip Masuk: <strong className="text-slate-900">{qMasuk} Pcs</strong></span>
                <span>Harga Titip: <strong className="text-slate-900">{formatRupiah(vendorPrice)}</strong></span>
                <span>Harga Jual: <strong className="text-slate-900">{formatRupiah(sellingPrice)}</strong></span>
              </div>
            </div>

            {/* Form Input Retur Baik vs Basi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-mono font-bold text-slate-700 block mb-1 uppercase">
                  Sisa Fisik Retur Baik (Pcs)
                </label>
                <input
                  type="number"
                  min="0"
                  max={qMasuk}
                  value={returnedGoodQty}
                  onChange={(e) => setReturnedGoodQty(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-800 rounded-xl text-sm font-mono font-bold text-slate-900 text-center"
                />
                <span className="text-[10px] text-slate-500 block mt-0.5">Layak konsumsi / dibawa pulang vendor</span>
              </div>
              <div>
                <label className="text-[11px] font-mono font-bold text-slate-700 block mb-1 uppercase">
                  Sisa Fisik Basi / Rusak (Pcs)
                </label>
                <input
                  type="number"
                  min="0"
                  max={qMasuk}
                  value={returnedStaleQty}
                  onChange={(e) => setReturnedStaleQty(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-800 rounded-xl text-sm font-mono font-bold text-slate-900 text-center"
                />
                <span className="text-[10px] text-slate-500 block mt-0.5">Basi / kadaluarsa / tidak layak</span>
              </div>
            </div>

            {/* 3-Way Selector Kebijakan Barang Basi */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold text-slate-700 block uppercase">
                Kebijakan Penanganan Barang Basi:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setStalePolicy('VENDOR_BORNE')}
                  className={`p-2 rounded-xl border-2 text-left transition cursor-pointer ${
                    stalePolicy === 'VENDOR_BORNE'
                      ? 'border-slate-900 bg-amber-100 shadow-[2px_2px_0_#1E293B]'
                      : 'border-slate-200 bg-white hover:border-slate-400'
                  }`}
                >
                  <span className="text-xs font-black text-slate-900 block">
                    ✂️ Vendor
                  </span>
                  <span className="text-[9px] text-slate-600 block mt-0.5">
                    Hanya bayar yang laku di kasir.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStalePolicy('SHARED_50_50')}
                  className={`p-2 rounded-xl border-2 text-left transition cursor-pointer ${
                    stalePolicy === 'SHARED_50_50'
                      ? 'border-slate-900 bg-sky-100 shadow-[2px_2px_0_#1E293B]'
                      : 'border-slate-200 bg-white hover:border-slate-400'
                  }`}
                >
                  <span className="text-xs font-black text-slate-900 block">
                    🤝 Bagi 50:50
                  </span>
                  <span className="text-[9px] text-slate-600 block mt-0.5">
                    Kerugian basi dibagi dua sama rata.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStalePolicy('STORE_BORNE')}
                  className={`p-2 rounded-xl border-2 text-left transition cursor-pointer ${
                    stalePolicy === 'STORE_BORNE'
                      ? 'border-slate-900 bg-emerald-100 shadow-[2px_2px_0_#1E293B]'
                      : 'border-slate-200 bg-white hover:border-slate-400'
                  }`}
                >
                  <span className="text-xs font-black text-slate-900 block">
                    🛡️ Toko
                  </span>
                  <span className="text-[9px] text-slate-600 block mt-0.5">
                    Warung ganti penuh kue basi.
                  </span>
                </button>
              </div>
            </div>

            {/* Metode Bayar Tunai / Transfer */}
            <div className="flex items-center justify-between p-2.5 bg-slate-50 border-2 border-slate-800 rounded-xl">
              <span className="text-[11px] font-mono font-bold text-slate-700 uppercase">
                Metode Pembayaran:
              </span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-900 cursor-pointer">
                  <input
                    type="radio"
                    name="payment_method"
                    value="TUNAI"
                    checked={paymentMethod === 'TUNAI'}
                    onChange={() => setPaymentMethod('TUNAI')}
                    className="text-slate-900 cursor-pointer"
                  />
                  <span>💵 Tunai (Hentak Laci Kasir)</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-900 cursor-pointer">
                  <input
                    type="radio"
                    name="payment_method"
                    value="TRANSFER"
                    checked={paymentMethod === 'TRANSFER'}
                    onChange={() => setPaymentMethod('TRANSFER')}
                    className="text-slate-900 cursor-pointer"
                  />
                  <span>🏦 Transfer Bank</span>
                </label>
              </div>
            </div>

            {/* Kalkulasi Akhir & Hak Vendor */}
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2 font-mono text-xs border border-slate-800">
              <div className="flex justify-between text-white/70">
                <span>Barang Terjual di Kasir:</span>
                <span className="font-bold text-[#CCFF00]">{calculations.qSold} Pcs</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Unit Dibayar ke Vendor:</span>
                <span>{calculations.vendorPaidQty} Pcs</span>
              </div>
              {calculations.staleLossCompensated > 0 && (
                <div className="flex justify-between text-sky-400">
                  <span>Kompensasi Basi ke Vendor:</span>
                  <span>+{formatRupiah(calculations.staleLossCompensated)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-slate-700 text-sm font-bold">
                <span className="text-[#CCFF00] uppercase">UANG WAJIB DISETOR KE VENDOR:</span>
                <span className="text-lg font-extrabold text-[#CCFF00]">
                  {formatRupiah(calculations.vendorPayout)}
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-emerald-400">
                <span>Keuntungan Bersih Warung:</span>
                <span>{formatRupiah(calculations.storeNetMargin)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-100 border-t-2 border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold rounded-xl border border-emerald-800 flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0_#1E293B]"
            >
              <MessageCircle size={15} /> Kirim WhatsApp Rekap
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-mono font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleSettle}
                className="btn-arcade px-5 py-2.5 bg-[#CCFF00] hover:bg-[#b3e600] disabled:opacity-50 text-slate-900 font-extrabold text-xs font-mono uppercase rounded-xl border-2 border-slate-800 shadow-[3px_3px_0_#1E293B] flex items-center gap-2 cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
              >
                {loading ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                Setor &amp; Lunasi Vendor
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
