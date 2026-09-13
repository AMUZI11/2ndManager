"use client";

import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Layers,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Gift,
  Zap,
  Trash2
} from 'lucide-react';

export default function AdminPromosPage() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState(null);

  // Form State
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState('PERCENTAGE');
  const [formValue, setFormValue] = useState('20');
  const [formTargetTier, setFormTargetTier] = useState('MANAJER');
  const [formMinSpend, setFormMinSpend] = useState('0');
  const [formMaxUses, setFormMaxUses] = useState('100');
  const [formExpiresAt, setFormExpiresAt] = useState('');

  const fetchPromos = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/admin/promos', { cache: 'no-store' });
      const json = await res.json();
      if (res.ok && json.data) {
        setPromos(json.data);
      }
    } catch (err) {
      console.error('[Fetch Promos Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, []);

  const handleCreatePromo = async (e) => {
    e.preventDefault();
    if (!formCode.trim()) {
      alert('Kode promo wajib diisi.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/v1/admin/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formCode.trim().toUpperCase(),
          description: formDescription.trim() || null,
          discount_type: formType,
          discount_value: parseFloat(formValue) || 0,
          target_tier: formType === 'TIER_OVERRIDE' ? formTargetTier : null,
          min_spend: parseFloat(formMinSpend) || 0,
          max_uses: parseInt(formMaxUses) || 100,
          max_uses_per_org: 1,
          expires_at: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
          is_active: true,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.message || 'Gagal menerbitkan kode promo.');
      }

      setFeedbackToast({ type: 'success', text: `Kode promo ${json.data?.code} berhasil diterbitkan!` });
      setFormCode('');
      setFormDescription('');
      setFormValue('20');
      setFormExpiresAt('');
      await fetchPromos();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (promo) => {
    try {
      const newStatus = !promo.is_active;
      const res = await fetch('/api/v1/admin/promos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: promo.id,
          is_active: newStatus,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.message || 'Gagal mengubah status promo.');
      }

      setFeedbackToast({
        type: 'success',
        text: `Status promo ${promo.code} berhasil diubah menjadi ${newStatus ? 'AKTIF' : 'NONAKTIF'}.`,
      });
      await fetchPromos();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 p-4 sm:p-6 lg:p-8 font-sans space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-lime-950 border border-lime-500/60 text-[#CCFF00] font-mono text-xs font-black uppercase tracking-widest mb-1.5">
            <Sparkles size={14} className="text-[#CCFF00]" />
            GROWTH & CAMPAIGN ENGINE
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white uppercase">
            MESIN KODE PROMO DINAMIS
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Terbitkan kode promo diskon persentase, potongan nominal, bonus hari masa aktif, atau peningkatan tier
            langsung bagi warung mitra dan kampanye akuisisi juragan baru.
          </p>
        </div>

        <button
          onClick={fetchPromos}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0B0F17] hover:bg-slate-900 text-slate-300 hover:text-[#CCFF00] font-mono text-xs font-bold border-2 border-slate-700 shadow-[3px_3px_0px_#1E293B] cursor-pointer transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>REFRESH PROMO</span>
        </button>
      </div>

      {/* Toast */}
      {feedbackToast && (
        <div className="p-4 bg-lime-950/90 border-2 border-lime-500 text-lime-200 font-mono text-xs sm:text-sm flex items-center justify-between shadow-[4px_4px_0px_#4D7C0F]">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-[#CCFF00] shrink-0" />
            <span className="font-bold">{feedbackToast.text}</span>
          </div>
          <button onClick={() => setFeedbackToast(null)} className="p-1 hover:bg-black/40 text-slate-400 hover:text-white cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Grid: Bento Generator Card & Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Generator Form */}
        <div className="lg:col-span-7 bg-[#0B0F17] border-3 border-[#CCFF00] p-6 lg:p-8 shadow-[6px_6px_0px_#4D7C0F] space-y-6">
          <div className="flex items-center gap-3 border-b-2 border-slate-800 pb-4">
            <div className="p-2 bg-lime-500/10 border-2 border-[#CCFF00]/40 text-[#CCFF00]">
              <Tag size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-lg font-mono font-black uppercase text-white tracking-wide">
                GENERATOR KODE PROMO BARU
              </h2>
              <p className="text-xs text-slate-400">Atur parameter kode, jenis diskon, dan kuota pemakaian</p>
            </div>
          </div>

          <form onSubmit={handleCreatePromo} className="space-y-4 font-mono text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">KODE PROMO (HURUF BESAR)</label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                  placeholder="MISAL: DISKON50 / BERKAHWARUNG"
                  className="w-full bg-[#07090E] border-2 border-slate-700 focus:border-[#CCFF00] p-2.5 font-bold text-[#CCFF00] uppercase outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">TIPE EFEK DISKON</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full bg-[#07090E] border-2 border-slate-700 focus:border-[#CCFF00] p-2.5 text-white outline-none cursor-pointer"
                >
                  <option value="PERCENTAGE">Diskon Persentase (%)</option>
                  <option value="FIXED_AMOUNT">Potongan Nominal Tetap (Rp)</option>
                  <option value="BONUS_DAYS">Bonus Hari Masa Aktif (+Hari)</option>
                  <option value="TIER_OVERRIDE">Tier Override (Peningkatan Paket)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">
                  {formType === 'PERCENTAGE' && 'PERSENTASE DISKON (%)'}
                  {formType === 'FIXED_AMOUNT' && 'NOMINAL POTONGAN (RP)'}
                  {formType === 'BONUS_DAYS' && 'JUMLAH BONUS HARI'}
                  {formType === 'TIER_OVERRIDE' && 'TIER TUJUAN'}
                </label>
                {formType === 'TIER_OVERRIDE' ? (
                  <select
                    value={formTargetTier}
                    onChange={(e) => setFormTargetTier(e.target.value)}
                    className="w-full bg-[#07090E] border-2 border-slate-700 focus:border-[#CCFF00] p-2.5 text-white outline-none cursor-pointer"
                  >
                    <option value="SUPERVISOR">Supervisor</option>
                    <option value="MANAJER">Manajer Operasional</option>
                    <option value="EKSEKUTIF">Eksekutif Multi-Cabang</option>
                  </select>
                ) : (
                  <input
                    type="number"
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    placeholder={formType === 'PERCENTAGE' ? '20' : '50000'}
                    className="w-full bg-[#07090E] border-2 border-slate-700 focus:border-[#CCFF00] p-2.5 font-bold text-white outline-none"
                    required
                  />
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">BATAS TOTAL KUOTA KLAIM</label>
                <input
                  type="number"
                  value={formMaxUses}
                  onChange={(e) => setFormMaxUses(e.target.value)}
                  placeholder="100"
                  className="w-full bg-[#07090E] border-2 border-slate-700 focus:border-[#CCFF00] p-2.5 text-white outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">TANGGAL KEDALUWARSA (OPSIONAL)</label>
                <input
                  type="datetime-local"
                  value={formExpiresAt}
                  onChange={(e) => setFormExpiresAt(e.target.value)}
                  className="w-full bg-[#07090E] border-2 border-slate-700 focus:border-[#CCFF00] p-2.5 text-white outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">MINIMAL TRANSAKSI (RP)</label>
                <input
                  type="number"
                  value={formMinSpend}
                  onChange={(e) => setFormMinSpend(e.target.value)}
                  placeholder="0"
                  className="w-full bg-[#07090E] border-2 border-slate-700 focus:border-[#CCFF00] p-2.5 text-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-300 uppercase mb-1">DESKRIPSI / KETERANGAN KAMPANYE</label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Contoh: Promo Spesial Pembukaan Mitra Baru Jawa Timur"
                className="w-full bg-[#07090E] border-2 border-slate-700 focus:border-[#CCFF00] p-2.5 text-white outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3.5 bg-[#CCFF00] hover:bg-[#b8e600] text-black font-mono text-xs font-black border-2 border-black shadow-[4px_4px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 uppercase flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>MENERBITKAN KODE...</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} strokeWidth={2.5} />
                    <span>[ + TERBITKAN KODE PROMO ]</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Info Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 bg-[#0B0F17] border-2 border-slate-700 space-y-3 shadow-[4px_4px_0px_#1E293B]">
            <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-black uppercase">
              <Zap size={14} /> CARA KERJA SISTEM PROMO DINAMIS
            </div>
            <ul className="text-xs text-slate-300 space-y-2 list-disc pl-4 font-sans">
              <li>
                <strong>Satu Kode per Organisasi:</strong> Masing-masing warung hanya dapat mengklaim satu kali kode yang sama berkat indeks unik di tabel <code>promo_code_redemptions</code>.
              </li>
              <li>
                <strong>Kalkulasi Instan di Billing:</strong> Potongan harga dan bonus masa aktif langsung dihitung real-time saat juragan mengklik [⚡ TERAPKAN].
              </li>
              <li>
                <strong>Konsumsi Otomatis:</strong> Kuota kode otomatis bertambah satu (<code>current_uses + 1</code>) tepat saat struk pembayaran diajukan.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Tabel Riwayat Promo */}
      <div className="bg-[#0B0F17] border-3 border-slate-700 shadow-[6px_6px_0px_#1E293B] overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-mono text-sm font-black uppercase text-white tracking-wider">
            DAFTAR & PERFORMA KODE PROMO AKTIF
          </h3>
          <span className="font-mono text-xs text-slate-400">{promos.length} KODE TERDAFTAR</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="bg-[#07090E] border-b-2 border-slate-800 text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">KODE PROMO</th>
                <th className="py-3 px-3">TIPE & NILAI DISKON</th>
                <th className="py-3 px-3">PENGGUNAAN (KLAIM)</th>
                <th className="py-3 px-3">MIN. BELANJA</th>
                <th className="py-3 px-3">KEDALUWARSA</th>
                <th className="py-3 px-3">STATUS</th>
                <th className="py-3 px-3 text-right">KONTROL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {promos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-mono">
                    {loading ? 'Memuat kode promo...' : 'Belum ada kode promo yang dibuat.'}
                  </td>
                </tr>
              ) : (
                promos.map((p) => {
                  const isExpired = p.expires_at && new Date(p.expires_at) < new Date();
                  const isExhausted = p.max_uses && p.current_uses >= p.max_uses;

                  return (
                    <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-black text-[#CCFF00] text-sm">{p.code}</div>
                        {p.description && (
                          <div className="text-[10px] text-slate-400 font-sans truncate max-w-xs">
                            {p.description}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {p.discount_type === 'PERCENTAGE' && (
                          <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-500 font-bold">
                            Diskon {p.discount_value}%
                          </span>
                        )}
                        {p.discount_type === 'FIXED_AMOUNT' && (
                          <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-500 font-bold">
                            Potongan Rp {Number(p.discount_value).toLocaleString('id-ID')}
                          </span>
                        )}
                        {p.discount_type === 'BONUS_DAYS' && (
                          <span className="px-2 py-0.5 bg-sky-950 text-sky-300 border border-sky-500 font-bold">
                            +{p.discount_value} Hari Bonus
                          </span>
                        )}
                        {p.discount_type === 'TIER_OVERRIDE' && (
                          <span className="px-2 py-0.5 bg-purple-950 text-purple-300 border border-purple-500 font-bold">
                            Tier {p.target_tier}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-bold text-white">{p.current_uses}</span>
                        <span className="text-slate-500"> / {p.max_uses || '∞'}</span>
                        {isExhausted && (
                          <span className="ml-2 text-[10px] text-red-400 font-bold">HABIS</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-300">
                        {Number(p.min_spend) > 0
                          ? `Rp ${Number(p.min_spend).toLocaleString('id-ID')}`
                          : 'Tanpa Min.'}
                      </td>

                      <td className="py-3 px-3 text-slate-400">
                        {p.expires_at ? (
                          <span className={isExpired ? 'text-red-400 line-through' : ''}>
                            {new Date(p.expires_at).toLocaleDateString('id-ID')}
                          </span>
                        ) : (
                          'Selamanya'
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {p.is_active && !isExpired && !isExhausted ? (
                          <span className="px-2 py-0.5 bg-lime-950 text-[#CCFF00] border border-lime-500 font-bold text-[10px]">
                            AKTIF
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-red-950 text-red-300 border border-red-500 font-bold text-[10px]">
                            NONAKTIF
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(p)}
                          className={`px-3 py-1 font-mono text-[11px] font-bold border transition-all cursor-pointer ${
                            p.is_active
                              ? 'bg-amber-950 hover:bg-amber-900 text-amber-300 border-amber-600'
                              : 'bg-lime-950 hover:bg-lime-900 text-[#CCFF00] border-lime-600'
                          }`}
                        >
                          {p.is_active ? '[ NONAKTIFKAN ]' : '[ AKTIFKAN ]'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
