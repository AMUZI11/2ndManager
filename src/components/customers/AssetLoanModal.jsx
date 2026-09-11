"use client";
import React, { useState, useEffect } from 'react';
import {
  X, ShieldAlert, ArrowLeftRight, Check, AlertTriangle, Flame,
  Droplets, History, Send, Banknote, HelpCircle, CheckCircle2,
  RefreshCw, FileText
} from 'lucide-react';
import { api } from '@/utils/api';
import { generateAssetLoanWhatsAppReceipt } from '@/utils/consignmentEngine';
import UpgradePromptModal from '@/components/pos/UpgradePromptModal';

const ASSET_TYPES = [
  { id: 'GAS_3KG', name: 'Tabung Gas LPG 3kg (Melon)', defaultDeposit: 150000, icon: Flame, color: 'emerald' },
  { id: 'GAS_12KG', name: 'Tabung Gas LPG 12kg (Bright/Biru)', defaultDeposit: 350000, icon: Flame, color: 'blue' },
  { id: 'GALON_AQUA', name: 'Galon Air (Aqua / Sejenis)', defaultDeposit: 50000, icon: Droplets, color: 'cyan' },
  { id: 'KRAT_BOTOL', name: 'Krat Botol Kaca (Teh Sosro/Coca-Cola)', defaultDeposit: 40000, icon: ArrowLeftRight, color: 'amber' },
  { id: 'CUSTOM', name: 'Wadah Fisik Khusus Lainnya', defaultDeposit: 50000, icon: ArrowLeftRight, color: 'purple' },
];

export default function AssetLoanModal({
  customer,
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'RETURN',
  storeName = '2ndManager Warung',
}) {
  const [mode, setMode] = useState(initialMode); // 'LOAN' | 'RETURN'
  const [assetType, setAssetType] = useState('GAS_3KG');
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [isDepositWaived, setIsDepositWaived] = useState(false);
  const [depositAmountPerUnit, setDepositAmountPerUnit] = useState("150000");

  // Mode Pengembalian: Kondisi Wadah
  const [returnCondition, setReturnCondition] = useState('GOOD'); // 'GOOD' | 'DAMAGED' | 'REJECTED'

  const [loanHistory, setLoanHistory] = useState([]);
  const [lastReceiptUrl, setLastReceiptUrl] = useState(null);

  // Paywall modal
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeModalData, setUpgradeModalData] = useState(null);

  const loadHistory = async () => {
    if (!customer?.id) return;
    try {
      const history = await api.getAssetLoans(customer.id, 10);
      setLoanHistory(history || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isOpen && customer?.id) {
      let isMounted = true;
      api.getAssetLoans(customer.id, 10)
        .then((history) => {
          if (isMounted) setLoanHistory(history || []);
        })
        .catch((err) => console.error(err));
      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, customer?.id]);

  const handleAssetTypeChange = (newType) => {
    setAssetType(newType);
    const selected = ASSET_TYPES.find(a => a.id === newType);
    if (selected) {
      setDepositAmountPerUnit(String(selected.defaultDeposit));
    }
  };

  const currentAssets = customer?.loaned_assets || {};
  const currentLoanQty = parseInt(currentAssets[assetType] || 0, 10);
  const activeEntries = Object.entries(currentAssets).filter(([_, qty]) => parseInt(qty, 10) > 0);

  const qtyNum = parseInt(quantity, 10) || 1;
  const depositNum = parseInt(depositAmountPerUnit, 10) || 0;
  const totalDeposit = isDepositWaived ? 0 : depositNum * qtyNum;

  async function handleSubmit(e) {
    e.preventDefault();
    if (qtyNum <= 0) {
      setErrorMsg("Jumlah unit harus lebih dari 0.");
      return;
    }

    if (mode === 'RETURN' && qtyNum > currentLoanQty) {
      setErrorMsg(`Tidak bisa mengembalikan ${qtyNum} unit. Pelanggan ini hanya meminjam ${currentLoanQty} unit ${assetType}.`);
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");

      let res;
      if (mode === 'RETURN') {
        // Panggil endpoint pengembalian fisik & reklasifikasi escrow
        res = await api.returnAssetLoan({
          customer_id: customer.id,
          asset_type: assetType,
          quantity: qtyNum,
          condition: returnCondition,
          notes: notes.trim() || undefined,
        });

        const refundText = res.refund_amount > 0 ? ` (Uang jaminan Rp ${Number(res.refund_amount).toLocaleString('id-ID')} dikembalikan tunai)` : '';
        const forfeitText = res.forfeited_amount > 0 ? ` (Uang jaminan Rp ${Number(res.forfeited_amount).toLocaleString('id-ID')} disita jadi pendapatan toko)` : '';

        setSuccessMsg(
          returnCondition === 'GOOD'
            ? `Berhasil menerima kembali ${qtyNum} unit ${assetType}${refundText}.`
            : `Menerima pengembalian ${qtyNum} unit kondisi ${returnCondition}${forfeitText}.`
        );
      } else {
        // Mode Pinjaman Baru (LOAN)
        res = await api.createAssetLoan({
          customer_id: customer.id,
          asset_type: assetType,
          mutation_type: 'LOAN',
          quantity: qtyNum,
          deposit_amount_per_unit: isDepositWaived ? 0 : depositNum,
          is_deposit_waived: isDepositWaived,
          notes: notes.trim() || undefined,
        });

        // Siapkan link tanda terima WhatsApp
        const waReceipt = generateAssetLoanWhatsAppReceipt({
          customerName: customer.nama,
          customerPhone: customer.phone,
          assetType,
          quantity: qtyNum,
          depositAmount: totalDeposit,
          isDepositWaived,
          storeName,
        });
        setLastReceiptUrl(waReceipt.encodedUrl);

        setSuccessMsg(
          isDepositWaived
            ? `Berhasil mencatat kasbon pinjaman ${qtyNum} unit (Deposit ditiadakan).`
            : `Berhasil mencatat pinjaman ${qtyNum} unit dengan jaminan Rp ${totalDeposit.toLocaleString('id-ID')}.`
        );
      }

      setQuantity("1");
      setNotes("");
      await loadHistory();
      if (onSuccess) onSuccess(res);

      if (mode === 'RETURN') {
        setTimeout(() => {
          setSuccessMsg("");
          onClose();
        }, 1600);
      }
    } catch (err) {
      if (err.upgradeRequired) {
        setUpgradeModalData({
          message: err.message,
          featureName: 'Pelacak Tabung Rolling',
          currentCount: 20,
          maxAllowed: 20,
        });
        setIsUpgradeModalOpen(true);
      } else {
        setErrorMsg(err.message || 'Terjadi kesalahan saat memproses aset.');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleSendWhatsAppDirect() {
    if (lastReceiptUrl) {
      window.open(lastReceiptUrl, '_blank');
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-sans">
      <div className="bg-white border-2 border-slate-900 shadow-[8px_8px_0px_#0f172a] w-full max-w-xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b-2 border-slate-900 bg-[#CCFF00] flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-slate-900" />
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">
                Peminjaman & Jaminan Wadah Aset Fisik
              </h2>
              <p className="text-xs font-bold text-slate-800">
                Pelanggan: <span className="underline">{customer?.nama}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white border-2 border-slate-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-slate-900" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-100 border-2 border-red-900 text-red-900 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-100 border-2 border-emerald-900 text-emerald-900 text-xs font-bold flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
              {lastReceiptUrl && (
                <button
                  type="button"
                  onClick={handleSendWhatsAppDirect}
                  className="mt-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase flex items-center justify-center gap-2 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] cursor-pointer"
                >
                  <Send size={14} /> Kirim Bukti Konfirmasi ke WhatsApp Pelanggan
                </button>
              )}
            </div>
          )}

          {/* Active Loans Banner */}
          <div className="p-3 border-2 border-slate-900 bg-slate-50">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-black uppercase text-slate-900 tracking-wider">
                Wadah Fisik yang Sedang Dipinjam
              </span>
              <span className="text-[10px] font-bold text-slate-500 font-mono">
                {activeEntries.length} Jenis Aset Aktif
              </span>
            </div>

            {activeEntries.length === 0 ? (
              <div className="text-xs text-slate-500 font-medium py-1">
                ✅ Pelanggan ini tidak memiliki pinjaman tabung atau galon aktif saat ini.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {activeEntries.map(([t, qty]) => (
                  <div key={t} className="px-2.5 py-1 bg-amber-100 border-2 border-slate-900 text-slate-900 text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0px_#0f172a]">
                    <Flame className="w-3.5 h-3.5 text-amber-600" />
                    <span>{qty} unit {t}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Main Action Mode Selector */}
          <div>
            <label className="text-xs font-black uppercase text-slate-900 block mb-1.5">
              Pilih Alur Kasir
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('RETURN')}
                className={`py-2.5 font-black text-xs uppercase border-2 border-slate-900 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  mode === 'RETURN'
                    ? 'bg-emerald-400 text-slate-900 shadow-[3px_3px_0px_#0f172a] translate-x-0.5 translate-y-0.5'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                ↩️ Terima Pengembalian (Wadah Kembali)
              </button>
              <button
                type="button"
                onClick={() => setMode('LOAN')}
                className={`py-2.5 font-black text-xs uppercase border-2 border-slate-900 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  mode === 'LOAN'
                    ? 'bg-amber-400 text-slate-900 shadow-[3px_3px_0px_#0f172a] translate-x-0.5 translate-y-0.5'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                ➕ Pinjamkan Aset (Pembeli Bawa Wadah Toko)
              </button>
            </div>
          </div>

          {/* Asset Type Selector */}
          <div>
            <label className="text-xs font-black uppercase text-slate-900 block mb-1">
              Jenis Tabung Gas / Galon Air
            </label>
            <select
              value={assetType}
              onChange={(e) => handleAssetTypeChange(e.target.value)}
              className="w-full p-2.5 text-xs border-2 border-slate-900 bg-white font-black text-slate-900 focus:outline-hidden focus:bg-amber-50 cursor-pointer"
            >
              {ASSET_TYPES.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Mode-Specific Settings */}
          {mode === 'LOAN' ? (
            <div className="space-y-3 p-3 bg-amber-50 border-2 border-amber-900">
              <span className="text-[11px] font-black uppercase text-amber-900 block">
                Skema Jaminan Wadah (Container Escrow)
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsDepositWaived(false)}
                  className={`p-2 border-2 border-slate-900 text-xs font-black uppercase text-left transition-all cursor-pointer ${
                    !isDepositWaived
                      ? 'bg-white text-slate-900 shadow-[3px_3px_0px_#0f172a]'
                      : 'bg-amber-100/60 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <Banknote size={14} className="text-emerald-600" />
                    <span>Titip Uang Jaminan</span>
                  </div>
                  <span className="text-[10px] font-normal text-slate-600 block">
                    Escrow aman. Uang kas masuk laci kasir (Non-omzet).
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsDepositWaived(true)}
                  className={`p-2 border-2 border-slate-900 text-xs font-black uppercase text-left transition-all cursor-pointer ${
                    isDepositWaived
                      ? 'bg-red-200 text-red-950 shadow-[3px_3px_0px_#0f172a]'
                      : 'bg-amber-100/60 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <ShieldAlert size={14} className="text-red-700" />
                    <span>Kasbon Wadah</span>
                  </div>
                  <span className="text-[10px] font-normal text-red-800 block">
                    Tanpa jaminan uang. Khusus pelanggan sangat dipercaya.
                  </span>
                </button>
              </div>

              {!isDepositWaived ? (
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-900 block mb-1">
                    Nominal Uang Jaminan Per Unit (Rp)
                  </label>
                  <input
                    type="number"
                    value={depositAmountPerUnit}
                    onChange={(e) => setDepositAmountPerUnit(e.target.value)}
                    min="0"
                    step="5000"
                    className="w-full p-2 text-xs font-mono font-black border-2 border-slate-900 bg-white"
                  />
                  <p className="text-[10px] font-medium text-slate-600 mt-1">
                    Total jaminan fisik: <span className="font-mono font-black text-emerald-800">Rp {Number(totalDeposit).toLocaleString('id-ID')}</span> (Masuk ke laci kasir, dapat dicairkan kembali saat tabung kembali).
                  </p>
                </div>
              ) : (
                <div className="p-2 bg-red-100 border border-red-800 text-[11px] font-bold text-red-900 flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>Peringatan: Jika tabung tidak kembali, toko menanggung kerugian fisik modal tabung.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 border-2 border-emerald-900 space-y-2">
              <label className="text-[11px] font-black uppercase text-slate-900 block">
                Kondisi Fisik Wadah yang Dikembalikan
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setReturnCondition('GOOD')}
                  className={`p-2 border-2 border-slate-900 text-xs font-black uppercase text-center transition-all cursor-pointer ${
                    returnCondition === 'GOOD'
                      ? 'bg-emerald-300 text-slate-900 shadow-[3px_3px_0px_#0f172a]'
                      : 'bg-white text-slate-600'
                  }`}
                >
                  ✅ Baik / Utuh
                </button>
                <button
                  type="button"
                  onClick={() => setReturnCondition('DAMAGED')}
                  className={`p-2 border-2 border-slate-900 text-xs font-black uppercase text-center transition-all cursor-pointer ${
                    returnCondition === 'DAMAGED'
                      ? 'bg-amber-300 text-slate-900 shadow-[3px_3px_0px_#0f172a]'
                      : 'bg-white text-slate-600'
                  }`}
                >
                  ⚠️ Rusak / Bocor
                </button>
                <button
                  type="button"
                  onClick={() => setReturnCondition('REJECTED')}
                  className={`p-2 border-2 border-slate-900 text-xs font-black uppercase text-center transition-all cursor-pointer ${
                    returnCondition === 'REJECTED'
                      ? 'bg-red-300 text-slate-900 shadow-[3px_3px_0px_#0f172a]'
                      : 'bg-white text-slate-600'
                  }`}
                >
                  ⛔ Ditolak / Hilang
                </button>
              </div>
              <p className="text-[10px] text-slate-600">
                {returnCondition === 'GOOD' 
                  ? 'Uang jaminan (escrow) akan dicairkan dan dikembalikan 100% tunai ke pembeli.'
                  : 'PATCH TEKNIS 2: Uang jaminan disita otomatis menjadi hak toko (Pendapatan Sitaan Jaminan Aset).'}
              </p>
            </div>
          )}

          {/* Quantity & Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black uppercase text-slate-900 block mb-1">
                Jumlah Unit ({mode === 'RETURN' ? 'Dikembalikan' : 'Dipinjamkan'})
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
                max={mode === 'RETURN' ? Math.max(1, currentLoanQty) : 99}
                required
                className="w-full p-2.5 text-xs border-2 border-slate-900 bg-white font-black text-slate-900 focus:outline-hidden focus:bg-amber-50"
              />
              {mode === 'RETURN' && (
                <p className="text-[10px] text-slate-500 mt-1">
                  Maksimal kembali: <span className="font-bold text-slate-900">{currentLoanQty} unit</span>
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-black uppercase text-slate-900 block mb-1">
                Catatan / Janji Kembali
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Misal: Janji sore ini"
                className="w-full p-2.5 text-xs border-2 border-slate-900 bg-white focus:outline-hidden"
              />
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 font-black text-xs uppercase tracking-wider border-2 border-slate-900 cursor-pointer shadow-[4px_4px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 ${
              mode === 'RETURN'
                ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-900'
                : 'bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900'
            }`}
          >
            <Check className="w-4 h-4" />
            {loading
              ? "Menyimpan..."
              : mode === 'RETURN'
              ? `Konfirmasi Pengembalian (${quantity} Unit)`
              : `Catat Pinjaman (${quantity} Unit)${totalDeposit > 0 ? ` + Jaminan Rp ${Number(totalDeposit).toLocaleString('id-ID')}` : ''}`}
          </button>

          {/* History List */}
          {loanHistory.length > 0 && (
            <div className="pt-2 border-t-2 border-slate-900">
              <div className="flex items-center gap-1 mb-2">
                <History className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-black uppercase text-slate-900 tracking-wider">
                  Riwayat Mutasi Fisik Pelanggan Ini
                </span>
              </div>
              <div className="border border-slate-300 divide-y divide-slate-200 text-xs bg-slate-50 max-h-40 overflow-y-auto">
                {loanHistory.map(h => (
                  <div key={h.id} className="p-2 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 text-[10px] font-black uppercase border ${
                        h.mutation_type === 'RETURN'
                          ? h.status === 'FORFEITED' 
                            ? 'bg-red-100 text-red-900 border-red-400' 
                            : 'bg-emerald-100 text-emerald-900 border-emerald-400'
                          : 'bg-amber-100 text-amber-900 border-amber-400'
                      }`}>
                        {h.mutation_type === 'RETURN' ? (h.status === 'FORFEITED' ? 'SITAAN' : 'KEMBALI') : 'PINJAM'}
                      </span>
                      <span className="font-bold text-slate-900">{h.quantity}× {h.asset_type}</span>
                      {h.deposit_amount_per_unit > 0 && (
                        <span className="text-[10px] font-mono text-emerald-800 font-bold">
                          (Rp {Number(h.deposit_amount_per_unit * h.quantity).toLocaleString('id-ID')})
                        </span>
                      )}
                      {h.notes && <span className="text-[11px] text-slate-500 truncate max-w-xs">({h.notes})</span>}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {new Date(h.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Paywall Upgrade Modal */}
      <UpgradePromptModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        data={upgradeModalData}
      />
    </div>
  );
}
