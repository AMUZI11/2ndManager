"use client";
import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, ArrowLeftRight, Check, AlertTriangle, Flame, Droplets, History, Send } from 'lucide-react';
import { api } from '@/utils/api';
import UpgradePromptModal from '@/components/pos/UpgradePromptModal';

const ASSET_TYPES = [
  { id: 'GAS_3KG', name: 'Tabung Gas LPG 3kg (Melon)', icon: Flame, color: 'emerald' },
  { id: 'GAS_12KG', name: 'Tabung Gas LPG 12kg (Bright/Biru)', icon: Flame, color: 'blue' },
  { id: 'GALON_AQUA', name: 'Galon Air (Aqua / Sejenis)', icon: Droplets, color: 'cyan' },
  { id: 'CUSTOM', name: 'Aset Fisik Lainnya (Krat/Jeriken)', icon: ArrowLeftRight, color: 'amber' },
];

export default function AssetLoanModal({ customer, isOpen, onClose, onSuccess, initialMode = 'RETURN' }) {
  const [mode, setMode] = useState(initialMode); // 'LOAN' or 'RETURN'
  const [assetType, setAssetType] = useState('GAS_3KG');
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [loanHistory, setLoanHistory] = useState([]);

  // Paywall modal
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeModalData, setUpgradeModalData] = useState(null);

  useEffect(() => {
    if (isOpen && customer?.id) {
      setMode(initialMode);
      setErrorMsg("");
      setSuccessMsg("");
      loadHistory();
    }
  }, [isOpen, customer, initialMode]);

  async function loadHistory() {
    try {
      const history = await api.getAssetLoans(customer.id, 10);
      setLoanHistory(history || []);
    } catch (err) {
      console.error(err);
    }
  }

  const currentAssets = customer?.loaned_assets || {};
  const currentLoanQty = parseInt(currentAssets[assetType] || 0, 10);

  // Total tabung aktif pelanggan ini
  const activeEntries = Object.entries(currentAssets).filter(([_, qty]) => parseInt(qty, 10) > 0);

  async function handleSubmit(e) {
    e.preventDefault();
    const qtyNum = parseInt(quantity, 10);
    if (isNaN(qtyNum) || qtyNum <= 0) {
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
      const res = await api.createAssetLoan({
        customer_id: customer.id,
        asset_type: assetType,
        mutation_type: mode,
        quantity: qtyNum,
        notes: notes.trim() || undefined,
      });

      setSuccessMsg(
        mode === 'LOAN'
          ? `Berhasil mencatat pinjaman ${qtyNum} unit.`
          : `Berhasil menerima pengembalian ${qtyNum} unit.`
      );

      setQuantity("1");
      setNotes("");
      await loadHistory();
      if (onSuccess) onSuccess(res);

      setTimeout(() => {
        setSuccessMsg("");
        onClose();
      }, 1500);
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
        setErrorMsg(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleSendWhatsAppReminder() {
    if (!customer?.phone) {
      alert("Pelanggan tidak memiliki nomor WhatsApp tersimpan.");
      return;
    }
    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? `62${cleanPhone.slice(1)}` : cleanPhone;

    const listStr = activeEntries.map(([t, q]) => `• ${q} unit ${t}`).join('\n');
    const msg = encodeURIComponent(
      `Halo Kak ${customer.nama}, mohon konfirmasi untuk pengembalian pinjaman tabung kosong/galon di toko kami:\n${listStr}\n\nTerima kasih banyak ya! 🙏`
    );
    window.open(`https://wa.me/${formattedPhone}?text=${msg}`, '_blank');
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white border-2 border-slate-900 shadow-[8px_8px_0px_#0f172a] w-full max-w-xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b-2 border-slate-900 bg-sky-400 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-slate-900" />
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">
                Pelacak Tabung & Galon: {customer?.nama}
              </h2>
              <p className="text-xs font-medium text-slate-800">
                Pencatatan saldo fisik tabung gas kosong & galon air
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
            <div className="p-3 bg-emerald-100 border-2 border-emerald-900 text-emerald-900 text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Active Loans Banner */}
          <div className="p-3 border-2 border-slate-900 bg-slate-50">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-black uppercase text-slate-900 tracking-wider">
                Status Pinjaman Aset Pelanggan
              </span>
              {customer?.phone && activeEntries.length > 0 && (
                <button
                  type="button"
                  onClick={handleSendWhatsAppReminder}
                  className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 border border-emerald-800 text-emerald-900 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Send className="w-3 h-3" /> Kirim Pengingat WA
                </button>
              )}
            </div>

            {activeEntries.length === 0 ? (
              <div className="text-xs text-slate-500 font-medium py-1">
                ✅ Tidak ada pinjaman tabung atau galon aktif saat ini.
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

          {/* Mode Switcher */}
          <div>
            <label className="text-xs font-black uppercase text-slate-900 block mb-1.5">
              Jenis Tindakan
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
                ↩️ Terima Pengembalian
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
                ➕ Catat Pinjaman Baru
              </button>
            </div>
          </div>

          {/* Asset Type Selector */}
          <div>
            <label className="text-xs font-black uppercase text-slate-900 block mb-1">
              Pilih Jenis Tabung / Galon
            </label>
            <select
              value={assetType}
              onChange={(e) => setAssetType(e.target.value)}
              className="w-full p-2.5 text-xs border-2 border-slate-900 bg-white font-bold focus:outline-hidden focus:bg-amber-50"
            >
              {ASSET_TYPES.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

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
                : 'bg-amber-400 hover:bg-amber-300 text-slate-900'
            }`}
          >
            <Check className="w-4 h-4" />
            {loading
              ? "Menyimpan..."
              : mode === 'RETURN'
              ? `Konfirmasi Pengembalian (${quantity} Unit)`
              : `Catat Pinjaman (${quantity} Unit)`}
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
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                          : 'bg-amber-100 text-amber-900 border-amber-400'
                      }`}>
                        {h.mutation_type === 'RETURN' ? 'KEMBALI' : 'PINJAM'}
                      </span>
                      <span className="font-bold text-slate-900">{h.quantity}× {h.asset_type}</span>
                      {h.notes && <span className="text-[11px] text-slate-500">({h.notes})</span>}
                    </div>
                    <div className="text-[10px] text-slate-400">
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
