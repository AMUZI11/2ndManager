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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white dark:bg-[#1E293B] border-4 border-[#0B0F17] shadow-[8px_8px_0px_#0B0F17] p-6 text-[#0B0F17] dark:text-white">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b-2 border-[#0B0F17] dark:border-[#334155] pb-3 mb-5">
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#0B0F17] dark:text-[#CCFF00]" strokeWidth={2.5} />
            <h2 className="text-base font-black uppercase tracking-wider">
              Profil Fiskal & Pajak PP 55/2022
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 transition cursor-pointer border border-[#0B0F17]"
          >
            <X className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-100 border-2 border-rose-500 text-rose-800 text-xs font-mono flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          {/* Tahun Pajak */}
          <div>
            <label className="block font-bold mb-1 uppercase text-gray-700 dark:text-gray-300">
              Tahun Pajak (Takwim):
            </label>
            <input
              type="number"
              value={taxYear}
              onChange={(e) => setTaxYear(e.target.value)}
              className="w-full p-2 border-2 border-[#0B0F17] dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm font-black focus:outline-hidden focus:border-[#CCFF00]"
              required
            />
          </div>

          {/* Bentuk Entitas (WPOP vs Badan) */}
          <div>
            <label className="block font-bold mb-1 uppercase text-gray-700 dark:text-gray-300">
              Bentuk Entitas Usaha:
            </label>
            <div className="grid grid-cols-2 gap-3 mt-1.5">
              <label className={`p-3 border-2 cursor-pointer flex flex-col justify-between transition-all ${
                !isCorporate 
                  ? 'border-[#0B0F17] bg-[#CCFF00]/30 shadow-[3px_3px_0px_#0B0F17]' 
                  : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <input
                    type="radio"
                    name="entity_type"
                    checked={!isCorporate}
                    onChange={() => setIsCorporate(false)}
                    className="accent-[#0B0F17]"
                  />
                  <span className="font-black text-[#0B0F17] dark:text-white">Orang Pribadi (WPOP)</span>
                </div>
                <p className="text-[10px] text-gray-600 dark:text-gray-400">
                  Fasilitas Bebas Pajak Omzet s.d. Rp 500 Juta/Tahun
                </p>
              </label>

              <label className={`p-3 border-2 cursor-pointer flex flex-col justify-between transition-all ${
                isCorporate 
                  ? 'border-[#0B0F17] bg-[#CCFF00]/30 shadow-[3px_3px_0px_#0B0F17]' 
                  : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <input
                    type="radio"
                    name="entity_type"
                    checked={isCorporate}
                    onChange={() => setIsCorporate(true)}
                    className="accent-[#0B0F17]"
                  />
                  <span className="font-black text-[#0B0F17] dark:text-white">Badan Usaha (CV/PT)</span>
                </div>
                <p className="text-[10px] text-gray-600 dark:text-gray-400">
                  PPh Final 0,5% dari Rupiah Pertama Omzet (Tanpa Kuota Bebas)
                </p>
              </label>
            </div>
          </div>

          {/* Nomor NPWP */}
          <div>
            <label className="block font-bold mb-1 uppercase text-gray-700 dark:text-gray-300">
              Nomor Pokok Wajib Pajak (NPWP 16 Digit / 15 Digit):
            </label>
            <input
              type="text"
              value={npwpNumber}
              onChange={(e) => setNpwpNumber(e.target.value)}
              placeholder="00.000.000.0-000.000"
              className="w-full p-2 border-2 border-[#0B0F17] dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-hidden focus:border-[#CCFF00]"
              required
            />
          </div>

          {/* Nama pada NPWP */}
          <div>
            <label className="block font-bold mb-1 uppercase text-gray-700 dark:text-gray-300">
              Nama Tertera pada NPWP:
            </label>
            <input
              type="text"
              value={npwpName}
              onChange={(e) => setNpwpName(e.target.value)}
              placeholder="Nama Toko atau Nama Pemilik Resmi"
              className="w-full p-2 border-2 border-[#0B0F17] dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-hidden focus:border-[#CCFF00]"
              required
            />
          </div>

          {/* Modal Awal Disetor */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold uppercase text-gray-700 dark:text-gray-300">
                Modal Awal Disetor (SAK EMKM Equity):
              </label>
              <span className="text-[10px] text-gray-500">Default: Rp 10.000.000</span>
            </div>
            <input
              type="number"
              value={initialCapital}
              onChange={(e) => setInitialCapital(e.target.value)}
              className="w-full p-2 border-2 border-[#0B0F17] dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-hidden focus:border-[#CCFF00]"
              required
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Digunakan sebagai penyeimbang ekuitas awal neraca SAK EMKM.
            </p>
          </div>

          {/* Tombol Simpan */}
          <div className="pt-4 border-t border-gray-300 dark:border-gray-700 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-[#0B0F17] dark:text-white font-bold uppercase tracking-wider hover:bg-gray-300 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-[#CCFF00] text-[#0B0F17] border-2 border-[#0B0F17] font-black uppercase tracking-wider hover:bg-[#b8e600] transition shadow-[3px_3px_0px_#0B0F17] flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" strokeWidth={2.5} />
              {loading ? 'Menyimpan...' : 'Simpan Profil Fiskal'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
