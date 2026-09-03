"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { SUBSCRIPTION_PLANS, ADD_ONS, normalizePlan } from '@/lib/subscription';
import { Sparkles, ShieldCheck, Check, X, AlertCircle, Upload, CheckCircle2, Clock, ArrowLeft } from 'lucide-react';

export default function BillingPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('EKSEKUTIF');
  
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      const res = await fetch('/api/v1/billing');
      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          const planKey = normalizePlan(json.data.plan || json.data.tier || json.data.subscription?.plan);
          setBillingData({
            subscription: json.data.subscription || { plan: planKey },
            proofs: json.data.payment_proofs || [],
            shopName: json.data.shop_name || 'Toko Saya',
            currentBranches: json.data.branch_count || 1,
            currentCashiers: json.data.cashier_limit || json.data.cashier_count || 1,
          });
          setSelectedPlan(planKey === 'MAGANG' ? 'EKSEKUTIF' : planKey);
          return;
        }
      }

      // Default fallback
      setBillingData({
        subscription: { plan: 'MAGANG' },
        proofs: [],
        shopName: 'Toko Saya',
        currentBranches: 1,
        currentCashiers: 1,
      });
      setSelectedPlan('EKSEKUTIF');
    } catch (err) {
      console.warn("[Billing fetch fallback]", err);
      setBillingData({
        subscription: { plan: 'MAGANG' },
        proofs: [],
        shopName: 'Toko Saya',
        currentBranches: 1,
        currentCashiers: 1,
      });
      setSelectedPlan('EKSEKUTIF');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();

    const handlePlanUpdate = () => {
      fetchBillingData();
    };
    window.addEventListener('hl-plan-changed', handlePlanUpdate);
    return () => window.removeEventListener('hl-plan-changed', handlePlanUpdate);
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith('image/')) {
      setErrorMessage('Hanya file gambar yang diizinkan (JPG/PNG).');
      return;
    }

    if (selectedFile.size > 2 * 1024 * 1024) {
      setErrorMessage('Ukuran file maksimal 2MB.');
      return;
    }

    setFile(selectedFile);
    setErrorMessage('');
    
    const reader = new FileReader();
    reader.onload = (e) => setFilePreview(e.target.result);
    reader.readAsDataURL(selectedFile);
  };

  const handleUploadProof = async () => {
    if (!file) {
      setErrorMessage('Pilih bukti transfer terlebih dahulu.');
      return;
    }

    try {
      setUploading(true);
      setErrorMessage('');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('plan_requested', selectedPlan);

      const res = await fetch('/api/v1/billing', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.message || json.error?.message || 'Gagal mengupload bukti pembayaran.');
      }

      setToastMessage('Bukti transfer berhasil dikirim! Menunggu verifikasi tim 2ndManager.');
      setFile(null);
      setFilePreview(null);
      fetchBillingData();
      
      setTimeout(() => setToastMessage(''), 5000);
    } catch (err) {
      console.error("[Upload error]", err);
      setErrorMessage(err.message || 'Gagal mengupload bukti transfer. Coba lagi.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 space-y-3">
        <div className="w-10 h-10 border-4 border-slate-900 border-t-[#CCFF00] rounded-full animate-spin" />
        <p className="font-mono text-xs uppercase tracking-widest font-bold text-slate-700">Memuat data kontrak langganan...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 pb-32 font-sans space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* PAGE HEADER */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B]">
          <div className="mb-4">
            <Link
              href="/dashboard"
              className="btn-arcade inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] rounded-xl font-mono text-xs font-bold uppercase transition-all cursor-pointer"
            >
              <ArrowLeft size={14} /> Kembali ke Dashboard
            </Link>
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-300 rounded-lg text-slate-800 font-mono text-[10px] font-bold uppercase mb-2">
                <ShieldCheck size={14} className="text-slate-800" /> KONTRAK &amp; LISENSI
              </div>
              <h1 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl uppercase text-slate-900 tracking-tight">
                PILIH MANAJER TOKO ANDA
              </h1>
              <p className="font-sans text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
                Semakin tinggi level kontrak, semakin ketat sistem mengawal omzet, mencegah kecurangan kasir, dan menagih piutang secara otomatis.
              </p>
            </div>
            
            <div className="bg-slate-50 border-2 border-slate-800 rounded-xl p-3 px-4 shadow-[2px_2px_0px_#1E293B] shrink-0">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">Kontrak Aktif:</span>
              <p className="text-sm font-mono font-black text-slate-900 uppercase">
                {billingData?.subscription?.plan || 'MAGANG'}
              </p>
            </div>
          </div>
        </div>

        {/* 4 TIER CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
          
          {/* MAGANG (Rp 0) */}
          <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col justify-between opacity-80">
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-slate-100 px-2 py-0.5 rounded">TIER 0</span>
              <h3 className="font-display font-black text-lg uppercase text-slate-700 mt-2">Kontrak Magang</h3>
              <p className="font-mono text-2xl font-black text-slate-500 mt-2 tabular-nums">Rp 0</p>
              <p className="font-mono text-[11px] text-slate-500">/bulan • 50 struk limit</p>
              
              <div className="mt-4 space-y-1.5 border-t border-slate-200 pt-4">
                {SUBSCRIPTION_PLANS?.MAGANG?.feature_list?.map((f, i) => (
                  <div key={i} className={`flex items-start gap-2 font-mono text-xs py-0.5 ${f.included ? 'text-slate-700' : 'text-slate-400 line-through'}`}>
                    <span className="font-bold">{f.included ? '✓' : '✗'}</span>
                    <span>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <button disabled className="w-full border-2 border-slate-300 text-slate-400 font-mono font-bold uppercase py-2.5 mt-6 rounded-xl cursor-not-allowed text-xs">
              PAKET STANDAR
            </button>
          </div>

          {/* SUPERVISOR (Rp 149k) */}
          <div className={`bg-white border-2 border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-[4px_4px_0px_#1E293B] transition-all ${
            selectedPlan === 'SUPERVISOR' ? 'ring-2 ring-slate-900 bg-amber-50/20' : ''
          }`}>
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">TIER 1</span>
              <h3 className="font-display font-black text-lg uppercase text-slate-900 mt-2">Kontrak Supervisor</h3>
              <p className="font-mono text-2xl font-black text-slate-900 mt-2 tabular-nums">Rp 149.000</p>
              <p className="font-mono text-[11px] text-slate-500">/bulan • 2 kasir, 1 cabang</p>
              
              <div className="mt-4 space-y-1.5 border-t border-slate-200 pt-4">
                {SUBSCRIPTION_PLANS?.SUPERVISOR?.feature_list?.map((f, i) => (
                  <div key={i} className={`flex items-start gap-2 font-mono text-xs py-0.5 ${f.included ? 'text-slate-800 font-semibold' : 'text-slate-400 line-through'}`}>
                    <span className="font-bold">{f.included ? '✓' : '✗'}</span>
                    <span>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={() => setSelectedPlan('SUPERVISOR')} 
              className={`btn-arcade w-full border-2 border-slate-800 font-mono font-bold uppercase py-2.5 mt-6 rounded-xl transition-all text-xs cursor-pointer ${
                selectedPlan === 'SUPERVISOR' 
                  ? 'bg-slate-900 text-[#CCFF00] shadow-[2px_2px_0px_#1E293B]' 
                  : 'bg-white text-slate-900 hover:bg-slate-100'
              }`}
            >
              {selectedPlan === 'SUPERVISOR' ? '✓ DIPILIH' : 'PILIH SUPERVISOR'}
            </button>
          </div>

          {/* MANAJER (Rp 349k) */}
          <div className={`bg-white border-2 border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-[4px_4px_0px_#1E293B] transition-all ${
            selectedPlan === 'MANAJER' ? 'ring-2 ring-slate-900 bg-emerald-50/20' : ''
          }`}>
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">TIER 2</span>
              <h3 className="font-display font-black text-lg uppercase text-slate-900 mt-2">Kontrak Manajer</h3>
              <p className="font-mono text-2xl font-black text-slate-900 mt-2 tabular-nums">Rp 349.000</p>
              <p className="font-mono text-[11px] text-slate-500">/bulan • 5 kasir, 1 cabang, radar</p>
              
              <div className="mt-4 space-y-1.5 border-t border-slate-200 pt-4">
                {SUBSCRIPTION_PLANS?.MANAJER?.feature_list?.map((f, i) => (
                  <div key={i} className={`flex items-start gap-2 font-mono text-xs py-0.5 ${f.included ? 'text-slate-800 font-semibold' : 'text-slate-400 line-through'}`}>
                    <span className="font-bold">{f.included ? '✓' : '✗'}</span>
                    <span>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={() => setSelectedPlan('MANAJER')} 
              className={`btn-arcade w-full border-2 border-slate-800 font-mono font-bold uppercase py-2.5 mt-6 rounded-xl transition-all text-xs cursor-pointer ${
                selectedPlan === 'MANAJER' 
                  ? 'bg-slate-900 text-[#CCFF00] shadow-[2px_2px_0px_#1E293B]' 
                  : 'bg-white text-slate-900 hover:bg-slate-100'
              }`}
            >
              {selectedPlan === 'MANAJER' ? '✓ DIPILIH' : 'PILIH MANAJER'}
            </button>
          </div>

          {/* EKSEKUTIF (Rp 399k) */}
          <div className="bg-[#CCFF00] border-4 border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-[8px_8px_0px_#1E293B] relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-slate-900 text-[#CCFF00] font-mono text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-widest border-l-2 border-b-2 border-slate-800">
              REKOMENDASI MUTLAK
            </div>
            
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-900 bg-white/70 px-2 py-0.5 rounded border border-slate-800">TIER 3 (VIP)</span>
              <p className="font-mono text-[10px] font-black uppercase tracking-wider text-slate-900 mt-2">CUMA +RP 50.000 DARI MANAJER</p>
              <h3 className="font-display font-black text-xl uppercase text-slate-900 mt-0.5">Kontrak Eksekutif</h3>
              
              <p className="font-mono text-3xl sm:text-4xl font-black text-slate-900 mt-2 tabular-nums">Rp 399.000</p>
              <p className="font-mono text-[11px] text-slate-800 font-bold">/bulan • 10 kasir, 3 cabang, auto-WA 06:00</p>
              
              <div className="mt-4 space-y-1.5 border-t border-slate-900/30 pt-4">
                {SUBSCRIPTION_PLANS?.EKSEKUTIF?.feature_list?.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 font-mono text-xs py-0.5 font-bold text-slate-900">
                    <span className="text-slate-900">{f.star ? '★' : '✓'}</span>
                    <span>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <button
              onClick={() => setSelectedPlan('EKSEKUTIF')}
              className={`btn-arcade w-full bg-slate-900 text-[#CCFF00] border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B] font-mono font-black uppercase py-3 mt-6 rounded-xl cursor-pointer text-xs sm:text-sm transition-all ${
                selectedPlan === 'EKSEKUTIF' ? 'ring-2 ring-slate-900' : ''
              }`}
            >
              {selectedPlan === 'EKSEKUTIF' ? '✓ KONTRAK EKSEKUTIF TERPILIH' : 'TANDA TANGANI KONTRAK EKSEKUTIF'}
            </button>
          </div>
        </div>

        {/* PAYMENT PROOF UPLOAD SECTION */}
        <div className="bg-white rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="font-display font-black text-lg sm:text-xl uppercase text-slate-900">Unggah Bukti Transfer Bank</h2>
            <p className="font-sans text-xs text-slate-600 mt-1">Kirim bukti pembayaran untuk verifikasi &amp; aktivasi otomatis lisensi Anda.</p>
          </div>
          
          <div className="border-2 border-slate-800 rounded-xl p-4 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[2px_2px_0px_#1E293B]">
            <div>
              <p className="font-mono text-[10px] uppercase font-bold text-slate-500 tracking-wider">PAKET TERPILIH</p>
              <p className="font-mono text-lg font-black text-slate-900 mt-0.5">
                {SUBSCRIPTION_PLANS?.[selectedPlan]?.name || selectedPlan} — {SUBSCRIPTION_PLANS?.[selectedPlan]?.price_formatted || '-'}
              </p>
            </div>
            <div className="bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-mono text-slate-700">
              <span className="font-bold text-slate-900">BCA:</span> 123-456-7890 (PT 2ndManager Indonesia)
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="block font-mono text-xs uppercase font-bold text-slate-800">
              Bukti Transfer (Format JPG/PNG, maksimal 2MB)
            </label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              className="w-full bg-slate-50 border-2 border-slate-800 rounded-xl p-3 font-mono text-xs cursor-pointer focus:ring-2 focus:ring-[#CCFF00] outline-none" 
            />
            {filePreview && (
              <div className="mt-3 p-2 bg-slate-100 rounded-xl border border-slate-300 inline-block">
                <img src={filePreview} alt="Preview Bukti" className="border border-slate-800 rounded-lg max-h-48 object-contain" />
              </div>
            )}
          </div>
          
          <button
            onClick={handleUploadProof}
            disabled={uploading || !file}
            className="btn-arcade w-full bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B] font-mono font-black uppercase py-3.5 rounded-xl cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs sm:text-sm"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                <span>MENGUNGGAH BUKTI...</span>
              </>
            ) : (
              <>
                <Upload size={16} />
                <span>KIRIM BUKTI PEMBAYARAN KONTRAK</span>
              </>
            )}
          </button>
          
          {toastMessage && (
            <div className="font-mono text-xs text-slate-900 bg-emerald-100 border-2 border-emerald-600 p-3 rounded-xl flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}
          {errorMessage && (
            <div className="font-mono text-xs text-rose-900 bg-rose-50 border-2 border-rose-400 p-3 rounded-xl flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* ADD-ON SECTION */}
        <div className="bg-white rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] p-6 sm:p-8 space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="font-display font-black text-lg uppercase text-slate-900">Ekstensi Add-On Kapasitas</h2>
            <p className="font-sans text-xs text-slate-600 mt-0.5">Tambahan kapasitas kasir &amp; cabang di luar batas paket kontrak Anda.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {ADD_ONS && Object.values(ADD_ONS).map(addon => (
              <div key={addon.id} className="bg-slate-50 border-2 border-slate-800 rounded-xl p-4 shadow-[2px_2px_0px_#1E293B]">
                <p className="font-mono font-bold text-xs uppercase text-slate-900">{addon.name}</p>
                <p className="font-mono text-xl font-black text-slate-900 mt-1 tabular-nums">{addon.price_formatted}</p>
                <p className="font-mono text-[10px] text-slate-500 mt-0.5">{addon.unit}</p>
              </div>
            ))}
          </div>
        </div>

        {/* PAYMENT HISTORY */}
        {billingData?.proofs?.length > 0 && (
          <div className="bg-white rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] p-6 sm:p-8 space-y-4">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="font-display font-black text-lg uppercase text-slate-900">Riwayat Pengajuan Kontrak</h2>
              <p className="font-sans text-xs text-slate-600 mt-0.5">Status verifikasi pembayaran yang pernah dikirimkan.</p>
            </div>
            <div className="space-y-2 pt-2">
              {billingData.proofs.map((proof, i) => (
                <div key={i} className="flex items-center justify-between border-b border-slate-100 pb-2.5 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-slate-400" />
                    <span className="font-bold text-slate-800">{proof.plan_requested || proof.plan}</span>
                    <span className="text-slate-500">— {proof.amount_formatted || proof.amount || '-'}</span>
                  </div>
                  <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded border ${
                    proof.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border-emerald-400' : 
                    proof.status === 'REJECTED' ? 'bg-rose-100 text-rose-800 border-rose-400' : 
                    'bg-amber-100 text-amber-800 border-amber-400'
                  }`}>
                    {proof.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

