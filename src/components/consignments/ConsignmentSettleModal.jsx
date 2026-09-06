"use client";
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale, CheckCircle2, AlertTriangle, MessageCircle, X,
  Banknote, RefreshCw, AlertCircle, Send, ShieldAlert
} from 'lucide-react';
import { api } from '@/utils/api';

export default function ConsignmentSettleModal({
  isOpen,
  onClose,
  batch = null,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [returnedQty, setReturnedQty] = useState('0');
  const [damagedQty, setDamagedQty] = useState('0');
  const [lossBorneBy, setLossBorneBy] = useState('STORE'); // 'STORE' | 'VENDOR'
  const [paymentMethod, setPaymentMethod] = useState('TUNAI'); // 'TUNAI' | 'TRANSFER'
  const [settleNotes, setSettleNotes] = useState('');

  const qMasuk = batch?.received_qty || 0;
  const vendorPrice = Number(batch?.vendor_price_per_unit || 0);
  const sellingPrice = Number(batch?.selling_price_per_unit || 0);

  // Estimasi Q_pos: jika ada data sold_qty di batch, gunakan; jika tidak anggap sisa yang tidak diretur
  const numRetur = Math.max(0, parseInt(returnedQty, 10) || 0);
  const numDamaged = Math.max(0, parseInt(damagedQty, 10) || 0);

  // Perhitungan Tripartit
  const calculations = useMemo(() => {
    // Estimasi penjualan POS: minimal 0, maksimal (qMasuk - numRetur - numDamaged)
    const estimatedPos = Math.max(0, qMasuk - numRetur - numDamaged);
    const lostQty = Math.max(0, qMasuk - estimatedPos - numRetur - numDamaged);

    let vendorQtyPaid = 0;
    if (lossBorneBy === 'STORE') {
      // Toko menanggung barang rusak & selisih hilang
      vendorQtyPaid = Math.max(0, qMasuk - numRetur);
    } else {
      // Vendor menanggung barang rusak & hilang -> warung hanya bayar barang laku di kasir
      vendorQtyPaid = estimatedPos;
    }

    const totalPayout = vendorQtyPaid * vendorPrice;
    const totalOmzetPos = estimatedPos * sellingPrice;
    const totalProfit = totalOmzetPos - totalPayout;

    return {
      estimatedPos,
      lostQty,
      vendorQtyPaid,
      totalPayout,
      totalOmzetPos,
      totalProfit,
    };
  }, [qMasuk, vendorPrice, sellingPrice, numRetur, numDamaged, lossBorneBy]);

  if (!isOpen || !batch) return null;

  const formatRupiah = (val) => `Rp ${Number(val || 0).toLocaleString('id-ID')}`;

  const handleSettle = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      await api.settleConsignmentBatch(batch.id, {
        returned_qty: numRetur,
        damaged_qty: numDamaged,
        loss_borne_by: lossBorneBy,
        payment_method: paymentMethod,
        notes: settleNotes.trim() || null,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Gagal menyelesaikan settlement.');
    } finally {
      setLoading(false);
    }
  };

  // WhatsApp Message Generator
  const generateWhatsAppUrl = () => {
    const phone = batch.consignment_vendors?.phone?.replace(/[^0-9]/g, '');
    const vendorName = batch.consignment_vendors?.nama_vendor || 'Bapak/Ibu Vendor';
    const prodName = batch.products?.nama || 'Produk Titipan';

    const msg = `*REKAP SETTLEMENT KONSINYASI KLOLAWARUNG* 🧾
Kepada: *${vendorName}*
Produk: *${prodName}*

• Barang Dititipkan: ${qMasuk} pcs
• Terjual di Kasir: ${calculations.estimatedPos} pcs
• Sisa Retur Fisik: ${numRetur} pcs
${numDamaged > 0 ? `• Barang Rusak/Basi: ${numDamaged} pcs\n` : ''}• Harga Setor: ${formatRupiah(vendorPrice)} / pcs

*TOTAL HAK VENDOR: ${formatRupiah(calculations.totalPayout)}*
Status: *TELAH DIBAYARKAN (${paymentMethod})*

Terima kasih atas kerja sama titip jualnya! 🙏`;

    return `https://wa.me/${phone ? (phone.startsWith('0') ? '62' + phone.slice(1) : phone) : ''}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans">
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
                  Hitung perbandingan tripartit &amp; setor uang laci kasir
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border-2 border-rose-500 rounded-xl text-rose-800 text-xs font-mono font-bold flex items-center gap-2">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Batch Info Card */}
            <div className="p-3.5 bg-slate-50 border-2 border-slate-800 rounded-xl space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-900">
                  {batch.products?.nama || 'Produk'}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 bg-indigo-100 text-indigo-900 rounded font-bold">
                  {batch.consignment_vendors?.nama_vendor}
                </span>
              </div>
              <div className="flex justify-between text-xs font-mono text-slate-600 pt-1 border-t border-slate-200">
                <span>Titip Masuk: <strong className="text-slate-900">{qMasuk} Pcs</strong></span>
                <span>Setor: <strong className="text-slate-900">{formatRupiah(vendorPrice)}</strong></span>
                <span>Jual: <strong className="text-slate-900">{formatRupiah(sellingPrice)}</strong></span>
              </div>
            </div>

            {/* Form Input Retur & Rusak */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-mono font-bold text-slate-700 block mb-1 uppercase">
                  Sisa Fisik Retur (Bagus)
                </label>
                <input
                  type="number"
                  min="0"
                  max={qMasuk}
                  value={returnedQty}
                  onChange={(e) => setReturnedQty(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-800 rounded-xl text-sm font-mono font-bold text-slate-900 text-center"
                />
                <span className="text-[10px] text-slate-500 block mt-0.5">Dikembalikan ke vendor</span>
              </div>
              <div>
                <label className="text-[11px] font-mono font-bold text-slate-700 block mb-1 uppercase">
                  Sisa Barang Rusak/Basi
                </label>
                <input
                  type="number"
                  min="0"
                  max={qMasuk}
                  value={damagedQty}
                  onChange={(e) => setDamagedQty(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-800 rounded-xl text-sm font-mono font-bold text-slate-900 text-center"
                />
                <span className="text-[10px] text-slate-500 block mt-0.5">Tidak bisa dijual lagi</span>
              </div>
            </div>

            {/* Opsi Tanggungan Selisih / Kerusakan */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold text-slate-700 block uppercase">
                Kebijakan Tanggungan Kerusakan / Selisih:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLossBorneBy('STORE')}
                  className={`p-2.5 rounded-xl border-2 text-left transition cursor-pointer ${
                    lossBorneBy === 'STORE'
                      ? 'border-slate-900 bg-emerald-50 shadow-[2px_2px_0_#1E293B]'
                      : 'border-slate-200 bg-white hover:border-slate-400'
                  }`}
                >
                  <span className="text-xs font-bold font-sans text-slate-900 block">
                    🛡️ Ditanggung Warung
                  </span>
                  <span className="text-[10px] text-slate-500 font-sans block">
                    Vendor tetap dibayar untuk barang rusak/pecah
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setLossBorneBy('VENDOR')}
                  className={`p-2.5 rounded-xl border-2 text-left transition cursor-pointer ${
                    lossBorneBy === 'VENDOR'
                      ? 'border-slate-900 bg-amber-50 shadow-[2px_2px_0_#1E293B]'
                      : 'border-slate-200 bg-white hover:border-slate-400'
                  }`}
                >
                  <span className="text-xs font-bold font-sans text-slate-900 block">
                    ✂️ Dipotong dari Vendor
                  </span>
                  <span className="text-[10px] text-slate-500 font-sans block">
                    Hanya bayar barang yang tercatat laku terjual
                  </span>
                </button>
              </div>
            </div>

            {/* Metode Bayar Tunai / Transfer */}
            <div className="flex items-center gap-3 pt-1">
              <span className="text-[11px] font-mono font-bold text-slate-700 uppercase">
                Metode Bayar:
              </span>
              <label className="flex items-center gap-1.5 text-xs font-sans cursor-pointer">
                <input
                  type="radio"
                  name="payment_method"
                  value="TUNAI"
                  checked={paymentMethod === 'TUNAI'}
                  onChange={() => setPaymentMethod('TUNAI')}
                  className="text-slate-900"
                />
                <span>Uang Tunai Laci Kasir</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs font-sans cursor-pointer">
                <input
                  type="radio"
                  name="payment_method"
                  value="TRANSFER"
                  checked={paymentMethod === 'TRANSFER'}
                  onChange={() => setPaymentMethod('TRANSFER')}
                  className="text-slate-900"
                />
                <span>Transfer Bank</span>
              </label>
            </div>

            {/* Kalkulasi Akhir & Hak Vendor */}
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2 font-mono text-xs border border-slate-800">
              <div className="flex justify-between text-white/70">
                <span>Barang Terjual di Kasir:</span>
                <span className="font-bold text-[#CCFF00]">{calculations.estimatedPos} Pcs</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Unit Dibayar ke Vendor:</span>
                <span>{calculations.vendorQtyPaid} Pcs</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-700 text-sm font-bold">
                <span className="text-[#CCFF00] uppercase">UANG WAJIB DISETOR KE VENDOR:</span>
                <span className="text-lg font-extrabold text-[#CCFF00]">
                  {formatRupiah(calculations.totalPayout)}
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-emerald-400">
                <span>Keuntungan Bersih Warung:</span>
                <span>{formatRupiah(calculations.totalProfit)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-100 border-t-2 border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <a
              href={generateWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold rounded-xl border border-emerald-800 flex items-center gap-1.5"
            >
              <MessageCircle size={15} /> Kirim WA Rekap
            </a>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-mono font-bold text-slate-600 hover:text-slate-900"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleSettle}
                className="btn-arcade px-5 py-2.5 bg-[#CCFF00] hover:bg-[#b3e600] disabled:opacity-50 text-slate-900 font-extrabold text-xs font-mono uppercase rounded-xl border-2 border-slate-800 shadow-[3px_3px_0_#1E293B] flex items-center gap-2 cursor-pointer"
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
