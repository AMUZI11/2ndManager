'use client';

import React, { useState } from 'react';
import { X, Save, ShieldAlert, Building2, User, HelpCircle } from 'lucide-react';

export default function TaxProfileModal({
  isOpen,
  onClose,
  initialProfile,
  onProfileUpdated
}) {
  const [npwpNumber, setNpwpNumber] = useState(initialProfile?.npwp_number || '00.000.000.0-000.000');
  const [npwpName, setNpwpName] = useState(initialProfile?.npwp_name || '');
  const [isCorporate, setIsCorporate] = useState(Boolean(initialProfile?.is_corporate));
  const [initialCapital, setInitialCapital] = useState(initialProfile?.initial_capital || 10000000);
  const [taxYear, setTaxYear] = useState(initialProfile?.tax_year || new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/v1/reports/tax', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tax_year: parseInt(taxYear, 10),
          npwp_number: npwpNumber,
          npwp_name: npwpName,
          is_corporate: isCorporate,
          initial_capital: Number(initialCapital)
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Gagal menyimpan pengaturan pajak');
      }

      if (onProfileUpdated) {
        onProfileUpdated(json.data?.profile);
      }
      onClose();
    } catch (err) {
      console.error('[TaxProfileModal Error]', err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="w-full max-w-lg bg-white border-2 border-slate-800 rounded-2xl shadow-[6px_6px_0px_#1E293B] p-6 text-slate-900">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-[#CCFF00] flex items-center justify-center border-2 border-slate-800">
              <Building2 className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-base font-black font-display uppercase tracking-tight text-slate-900">
                Profil Fiskal &amp; Pajak PP 55/2022
              </h2>
              <span className="text-[10px] font-mono text-slate-500">Konfigurasi NPWP &amp; Status Entitas Toko</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition cursor-pointer border-2 border-slate-800 shadow-[1px_1px_0px_#1E293B] active:scale-95"
            aria-label="Tutup modal"
          >
            <X className="w-4 h-4 text-slate-800" strokeWidth={2.5} />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border-2 border-rose-500 rounded-xl text-rose-800 text-xs font-mono flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          {/* Tahun Pajak */}
          <div>
            <label className="block font-bold mb-1 uppercase text-slate-700">
              Tahun Pajak (Takwim):
            </label>
            <input
              type="number"
              value={taxYear}
              onChange={(e) => setTaxYear(e.target.value)}
              className="w-full p-2.5 rounded-xl border-2 border-slate-800 bg-slate-50 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#CCFF00] shadow-[2px_2px_0px_#1E293B]"
              required
            />
          </div>

          {/* Bentuk Entitas (WPOP vs Badan) */}
          <div>
            <label className="block font-bold mb-1 uppercase text-slate-700">
              Bentuk Entitas Usaha:
            </label>
            <div className="grid grid-cols-2 gap-3 mt-1.5">
              <label className={`p-3.5 border-2 rounded-xl cursor-pointer flex flex-col justify-between transition-all ${
                !isCorporate 
                  ? 'border-slate-800 bg-[#CCFF00]/30 shadow-[3px_3px_0px_#1E293B]' 
                  : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <input
                    type="radio"
                    name="entity_type"
                    checked={!isCorporate}
                    onChange={() => setIsCorporate(false)}
                    className="accent-slate-900"
                  />
                  <span className="font-black text-slate-900">Orang Pribadi (WPOP)</span>
                </div>
                <p className="text-[10px] text-slate-600 font-sans">
                  Fasilitas Bebas Pajak Omzet s.d. Rp 500 Juta/Tahun
                </p>
              </label>

              <label className={`p-3.5 border-2 rounded-xl cursor-pointer flex flex-col justify-between transition-all ${
                isCorporate 
                  ? 'border-slate-800 bg-[#CCFF00]/30 shadow-[3px_3px_0px_#1E293B]' 
                  : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <input
                    type="radio"
                    name="entity_type"
                    checked={isCorporate}
                    onChange={() => setIsCorporate(true)}
                    className="accent-slate-900"
                  />
                  <span className="font-black text-slate-900">Badan Usaha (CV/PT)</span>
                </div>
                <p className="text-[10px] text-slate-600 font-sans">
                  PPh Final 0,5% dari Rupiah Pertama Omzet
                </p>
              </label>
            </div>
          </div>

          {/* Nomor NPWP */}
          <div>
            <label className="block font-bold mb-1 uppercase text-slate-700">
              Nomor Pokok Wajib Pajak (NPWP 16 Digit / 15 Digit):
            </label>
            <input
              type="text"
              value={npwpNumber}
              onChange={(e) => setNpwpNumber(e.target.value)}
              placeholder="00.000.000.0-000.000"
              className="w-full p-2.5 rounded-xl border-2 border-slate-800 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#CCFF00] shadow-[2px_2px_0px_#1E293B]"
              required
            />
          </div>

          {/* Nama pada NPWP */}
          <div>
            <label className="block font-bold mb-1 uppercase text-slate-700">
              Nama Tertera pada NPWP:
            </label>
            <input
              type="text"
              value={npwpName}
              onChange={(e) => setNpwpName(e.target.value)}
              placeholder="Nama Toko atau Nama Pemilik Resmi"
              className="w-full p-2.5 rounded-xl border-2 border-slate-800 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#CCFF00] shadow-[2px_2px_0px_#1E293B]"
              required
            />
          </div>

          {/* Modal Awal Disetor */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold uppercase text-slate-700">
                Modal Awal Disetor (SAK EMKM Equity):
              </label>
              <span className="text-[10px] text-slate-500 font-bold">Default: Rp 10.000.000</span>
            </div>
            <input
              type="number"
              value={initialCapital}
              onChange={(e) => setInitialCapital(e.target.value)}
              className="w-full p-2.5 rounded-xl border-2 border-slate-800 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#CCFF00] shadow-[2px_2px_0px_#1E293B]"
              required
            />
            <p className="text-[10px] text-slate-500 mt-1 font-sans">
              Digunakan sebagai penyeimbang ekuitas awal neraca SAK EMKM.
            </p>
          </div>

          {/* Tombol Simpan */}
          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold uppercase tracking-wider border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] transition cursor-pointer active:scale-95"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#CCFF00] hover:bg-[#b3e600] text-slate-950 border-2 border-slate-800 rounded-xl font-black uppercase tracking-wider transition shadow-[2px_2px_0px_#1E293B] flex items-center gap-2 cursor-pointer disabled:opacity-50 active:translate-x-0.5 active:translate-y-0.5"
            >
              <Save className="w-4 h-4" strokeWidth={2.5} />
              {loading ? 'Menyimpan...' : 'Simpan Profil'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
