"use client";
import React, { useState } from 'react';
import { ShieldAlert, MessageCircle, X, AlertTriangle } from 'lucide-react';

const EMERGENCY_ISSUES = [
  { id: 'selisih-kas', label: 'Selisih Kasir Minus saat Tutup Shift' },
  { id: 'salah-bon', label: 'Salah Input Bon & Perlu Bantuan Koreksi' },
  { id: 'printer-rusak', label: 'Printer Struk Thermal Bermasalah / Macet' },
  { id: 'akun-terkunci', label: 'Akun Kasir Terkunci / Kendala Akses' },
  { id: 'lainnya', label: 'Kendala Operasional Lainnya' }
];

export default function PanicHelpModal({ isOpen, onClose, shopName = "Toko Saya" }) {
  const [selectedIssue, setSelectedIssue] = useState(EMERGENCY_ISSUES[0].label);
  const [customNote, setCustomNote] = useState("");

  if (!isOpen) return null;

  const handleSendWA = async () => {
    const now = new Date().toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    try {
      fetch('/api/v1/support/panic-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issue_type: selectedIssue,
          custom_note: customNote.trim(),
          telemetry: {
            screen: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '',
            client_time: now,
          },
        }),
      }).catch((err) => console.warn('[Panic dispatch error]', err));
    } catch (e) {
      console.warn('[Panic dispatch exception]', e);
    }

    const messageText = `Halo Tim CS & Teknis 2ndManager,
Saya memerlukan BANTUAN DARURAT operasional:

🏪 Toko: ${shopName}
🚨 Kendala: ${selectedIssue}
${customNote.trim() ? `📝 Catatan: ${customNote.trim()}\n` : ''}⏰ Waktu: ${now}

Mohon panduan dan tindak lanjutnya segera. Terima kasih!`;

    const encoded = encodeURIComponent(messageText);
    const waUrl = `https://wa.me/6285188789773?text=${encoded}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border-2 border-slate-900 rounded-2xl w-full max-w-lg shadow-[8px_8px_0px_#1E293B] overflow-hidden">
        {/* Header Cadmium Red */}
        <div className="bg-[#E30022] text-white p-5 border-b-2 border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white text-[#E30022] rounded-xl flex items-center justify-center border-2 border-slate-900 shadow-[2px_2px_0px_#1E293B] shrink-0 font-bold">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h3 className="text-base font-display font-black uppercase tracking-wide">
                Bantuan Darurat WhatsApp (SOS)
              </h3>
              <p className="text-[11px] font-mono text-white/90">
                Jalur cepat evakuasi kendala operasional toko
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center border border-white/40 cursor-pointer transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          <div className="bg-amber-50 border-2 border-amber-400 p-3.5 rounded-xl flex items-start gap-2.5 shadow-[2px_2px_0px_#D97706]">
            <AlertTriangle className="text-amber-700 shrink-0 mt-0.5" size={16} />
            <p className="text-xs font-mono font-medium text-amber-900 leading-relaxed">
              Pesan akan diformat secara otomatis dan langsung terhubung ke WhatsApp CS resmi dengan identitas toko: <strong>{shopName}</strong>.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-mono font-bold text-slate-800 uppercase tracking-wider">
              Pilih Jenis Kendala Darurat:
            </label>
            <div className="space-y-1.5">
              {EMERGENCY_ISSUES.map((issue) => (
                <label 
                  key={issue.id}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedIssue === issue.label
                      ? 'bg-rose-50 border-[#E30022] text-slate-900 font-bold shadow-[2px_2px_0px_#E30022]'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-400'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="emergency_issue"
                    value={issue.label}
                    checked={selectedIssue === issue.label}
                    onChange={(e) => setSelectedIssue(e.target.value)}
                    className="accent-[#E30022] w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-sans font-medium">{issue.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-mono font-bold text-slate-800 uppercase tracking-wider">
              Catatan Tambahan (Opsional):
            </label>
            <textarea 
              rows={2}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Jelaskan nomor bon atau nominal selisih jika ada..."
              className="w-full p-3 bg-slate-50 border-2 border-slate-800 rounded-xl text-xs font-sans text-slate-900 outline-none focus:ring-2 focus:ring-[#CCFF00] resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-1/3 h-11 bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono font-bold text-xs uppercase rounded-xl border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] cursor-pointer transition-all"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSendWA}
              className="w-full sm:w-2/3 h-11 bg-[#25D366] hover:bg-[#20bd5a] text-white font-mono font-black text-xs uppercase rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_#1E293B] flex items-center justify-center gap-2 cursor-pointer transition-all active:translate-y-0.5"
            >
              <MessageCircle size={18} />
              <span>BUKA WHATSAPP CS RESMI</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
