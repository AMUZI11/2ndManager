"use client";

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
  Copy,
  Check,
  Zap,
  Key,
  QrCode,
  Receipt,
  MessageSquare,
  AlertTriangle,
  Building2,
  Lock,
  RefreshCw,
  UploadCloud,
  Tag,
  X,
  FileCheck,
  Calendar,
  CreditCard,
  ChevronRight,
  Gift
} from 'lucide-react';

const CATALOG_PLANS = [
  {
    key: 'SUPERVISOR',
    name: 'Supervisor Shift',
    priceRp: 49000,
    priceLabel: 'Rp 49.000',
    period: '/ bulan',
    badge: 'KASIR TUNGGAL',
    features: [
      'Bebas Kuota Bon & Bon Kasbon Pelanggan',
      'Alarm HPP Kulakan (Margin Guard)',
      'Konversi Satuan Grosir (Multi-Unit 15 SKU)',
      'Notifikasi WhatsApp Tagihan',
      'Pencatatan Pinjaman Tabung Gas & Galon (20 Item)',
      'Sinkronisasi Background Sync POS Otomatis',
    ],
    borderCol: '#38BDF8',
    bgCol: '#0369A1',
  },
  {
    key: 'MANAJER',
    name: 'Manajer Operasional',
    priceRp: 149000,
    priceLabel: 'Rp 149.000',
    period: '/ bulan',
    badge: 'WARUNG RAMAI',
    isPopular: true,
    features: [
      'Seluruh Fitur Paket Supervisor',
      'Hingga 5 Perangkat Terminal Kasir Bersamaan',
      'Hard Block Bon Minus (Negative Margin Hard Block)',
      'Smart Reorder Prediksi Kulakan Cerdas',
      'Kunci Kasir Jarak Jauh (Remote Kill-Switch)',
      'Laporan Pajak PP 55/2022 & Keuangan SAK EMKM',
    ],
    borderCol: '#F59E0B',
    bgCol: '#B45309',
  },
  {
    key: 'EKSEKUTIF',
    name: 'Eksekutif Multi-Cabang',
    priceRp: 399000,
    priceLabel: 'Rp 399.000',
    period: '/ bulan',
    badge: 'MULTI-GERAI B2B',
    features: [
      'Seluruh Fitur Paket Manajer Operasional',
      'Kelola Hingga 3 Cabang Toko Fisik Mandiri',
      'Mutasi Antar-Cabang Two-Phase (PIN & Barcode)',
      'Pencatatan Susut Barang di Jalan (Transit Shrinkage)',
      'Generator Berkas Pengajuan Kredit KUR Bank (QR Seal)',
      'Radar Keamanan Konsolidasi Seluruh Cabang',
    ],
    borderCol: '#CCFF00',
    bgCol: '#4D7C0F',
  },
];

const BANK_ACCOUNTS = [
  { bank: 'BNI', number: '909688846', holder: 'PT KLOLA WARUNG TEKNOLOGI NUSANTARA' },
  { bank: 'BSI', number: '7278774141', holder: 'PT KLOLA WARUNG TEKNOLOGI NUSANTARA' },
];

const DURATION_OPTIONS = [
  { months: 1, label: '1 Bulan' },
  { months: 3, label: '3 Bulan' },
  { months: 6, label: '6 Bulan' },
  { months: 12, label: '1 Tahun' },
];

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [subStatus, setSubStatus] = useState(null);
  const [selectedCatalog, setSelectedCatalog] = useState('MANAJER');
  const [durationMonths, setDurationMonths] = useState(1);

  // 4x4 Segmented Input State
  const [segments, setSegments] = useState(['2NDM', '', '', '']);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState('');
  const [redeemSuccess, setRedeemSuccess] = useState(null);

  // Promo Code Engine State
  const [promoInput, setPromoInput] = useState('');
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState('');

  // Payment Claim State
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [senderBank, setSenderBank] = useState('BNI');
  const [senderAccountName, setSenderAccountName] = useState('');
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [optimisticModal, setOptimisticModal] = useState(null);

  // Copy feedback state
  const [copiedKey, setCopiedKey] = useState('');

  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const fileInputRef = useRef(null);

  const fetchSubscriptionStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/billing/status', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          setSubStatus(json.data);
          return;
        }
      }
      setSubStatus({
        tier: 'MAGANG',
        status: 'ACTIVE',
        is_in_grace: false,
        days_remaining: 30,
        active_branches_allowed: 1,
      });
    } catch (e) {
      console.warn('Gagal fetch status langganan:', e);
      setSubStatus({
        tier: 'MAGANG',
        status: 'ACTIVE',
        is_in_grace: false,
        days_remaining: 30,
        active_branches_allowed: 1,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  // 4x4 Input Handler
  const handleSegmentChange = (idx, value) => {
    const sanitized = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    const updated = [...segments];
    updated[idx] = sanitized;
    setSegments(updated);
    setRedeemError('');

    if (sanitized.length === 4 && idx < 3) {
      inputRefs[idx + 1].current?.focus();
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && segments[idx] === '' && idx > 0) {
      inputRefs[idx - 1].current?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (pasted.length >= 16) {
      const seg0 = pasted.slice(0, 4);
      const seg1 = pasted.slice(4, 8);
      const seg2 = pasted.slice(8, 12);
      const seg3 = pasted.slice(12, 16);
      setSegments([seg0, seg1, seg2, seg3]);
      inputRefs[3].current?.focus();
    } else if (pasted.length > 0) {
      const updated = [...segments];
      let cursor = 0;
      for (let i = 0; i < 4; i++) {
        const chunk = pasted.slice(cursor, cursor + 4);
        if (chunk) {
          updated[i] = chunk;
          cursor += 4;
        }
      }
      setSegments(updated);
    }
  };

  // Redeem Voucher
  const handleRedeem = async (e) => {
    e.preventDefault();
    setRedeemError('');
    setRedeemSuccess(null);

    const fullCode = segments.join('-');
    if (segments.some((s) => s.length < 4)) {
      setRedeemError('Kode voucher harus terdiri dari 16 karakter lengkap (4 kotak x 4 huruf/angka).');
      return;
    }

    try {
      setIsRedeeming(true);
      const res = await fetch('/api/v1/billing/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_code: fullCode }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.message || 'Gagal mengaktifkan voucher lisensi.');
      }

      setRedeemSuccess(json.data || { message: 'Lisensi berhasil diaktifkan!' });
      setSegments(['2NDM', '', '', '']);
      inputRefs[1].current?.focus();
      await fetchSubscriptionStatus();
    } catch (err) {
      setRedeemError(err.message || 'Terjadi kesalahan koneksi.');
    } finally {
      setIsRedeeming(false);
    }
  };

  // Validate Promo Code
  const handleValidatePromo = async (e) => {
    e?.preventDefault();
    setPromoError('');
    if (!promoInput.trim()) {
      setPromoError('Ketik kode promo terlebih dahulu.');
      return;
    }

    try {
      setIsValidatingPromo(true);
      const res = await fetch('/api/v1/billing/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoInput.trim().toUpperCase(),
          tierId: selectedCatalog,
          durationMonths: durationMonths,
          orgId: subStatus?.organization_id,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.message || 'Kode promo tidak valid atau sudah kadaluwarsa.');
      }

      setAppliedPromo(json.data);
      setPromoError('');
    } catch (err) {
      setPromoError(err.message);
      setAppliedPromo(null);
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput('');
    setPromoError('');
  };

  // File Upload Handler
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setClaimError('Ukuran file maksimal 10 MB.');
        return;
      }
      setProofFile(file);
      setClaimError('');
      const previewUrl = URL.createObjectURL(file);
      setProofPreview(previewUrl);
    }
  };

  // Submit Optimistic Payment Claim
  const handleSubmitClaim = async (e) => {
    e?.preventDefault();
    setClaimError('');

    if (!proofFile) {
      setClaimError('Harap lampirkan foto atau tangkapan layar bukti transfer pembayaran.');
      return;
    }

    try {
      setIsSubmittingClaim(true);

      const formData = new FormData();
      formData.append('file', proofFile);
      formData.append('targetTier', appliedPromo?.targetTier || selectedCatalog);
      formData.append('durationMonths', durationMonths.toString());
      formData.append('basePrice', calculatedBasePrice.toString());
      formData.append('finalPrice', calculatedFinalPrice.toString());
      if (appliedPromo?.promoId) {
        formData.append('promoCodeId', appliedPromo.promoId);
      }
      if (senderBank) {
        formData.append('senderBank', senderBank);
      }
      if (senderAccountName.trim()) {
        formData.append('senderAccountName', senderAccountName.trim());
      }
      if (subStatus?.organization_id) {
        formData.append('orgId', subStatus.organization_id);
      }

      const res = await fetch('/api/v1/billing/claim', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.message || 'Gagal mengirim bukti pembayaran.');
      }

      // Tampilkan Optimistic Feedback Modal
      setOptimisticModal(json.data);
      setProofFile(null);
      setProofPreview(null);
      setSenderAccountName('');
      setAppliedPromo(null);
      setPromoInput('');

      // Refresh status langganan di background
      await fetchSubscriptionStatus();
    } catch (err) {
      setClaimError(err.message || 'Terjadi kesalahan sistem saat mengirim bukti transfer.');
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  const copyToClipboard = (text, key) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 3000);
    }
  };

  const currentTier = (subStatus?.tier || 'MAGANG').toUpperCase();
  const isInGrace = Boolean(subStatus?.is_in_grace);
  const isExpired = Boolean(subStatus?.is_expired);
  const daysRemaining = subStatus?.days_remaining ?? 0;

  const currentCatalogPlan = CATALOG_PLANS.find((p) => p.key === selectedCatalog) || CATALOG_PLANS[1];

  // Price calculations
  const calculatedBasePrice = currentCatalogPlan.priceRp * durationMonths;
  let calculatedFinalPrice = calculatedBasePrice;

  if (appliedPromo) {
    if (appliedPromo.discountType === 'PERCENTAGE') {
      const discountAmount = Math.round(calculatedBasePrice * (Number(appliedPromo.discountValue) / 100));
      calculatedFinalPrice = Math.max(0, calculatedBasePrice - discountAmount);
    } else if (appliedPromo.discountType === 'FIXED_AMOUNT') {
      calculatedFinalPrice = Math.max(0, calculatedBasePrice - Number(appliedPromo.discountValue));
    }
  }

  const waMessage = encodeURIComponent(
    `Halo Admin 2ndManager, saya ingin konfirmasi klaim pembayaran lisensi:\n\n` +
      `*Nama Usaha:* ${subStatus?.organization_name || 'Toko 2ndManager'}\n` +
      `*Paket:* ${currentCatalogPlan.name} (${durationMonths} Bulan)\n` +
      `*Total Bayar:* Rp ${calculatedFinalPrice.toLocaleString('id-ID')}\n` +
      (appliedPromo ? `*Promo:* ${appliedPromo.code}\n` : '') +
      `*Bank Pengirim:* ${senderBank} a.n. ${senderAccountName || '-'}\n\n` +
      `Bukti bayar telah saya unggah ke sistem. Mohon verifikasi auditnya. Terima kasih!`
  );

  return (
    <div className="space-y-6 pb-32 max-w-7xl mx-auto font-sans">
      {/* Navigation & Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B]">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="btn-arcade flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-800 font-mono text-xs font-bold border-2 border-slate-800 rounded-xl shadow-[2px_2px_0px_#1E293B] transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            <ArrowLeft size={14} strokeWidth={2.5} />
            <span>DASHBOARD</span>
          </Link>
          <div className="h-4 w-px bg-slate-300 hidden sm:block" />
          <span className="font-mono text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">
            PORTAL LISENSI &amp; PEMBAYARAN MANDIRI
          </span>
        </div>
        <button
          onClick={fetchSubscriptionStatus}
          disabled={loading}
          className="btn-arcade flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-[#CCFF00] font-mono text-xs font-bold rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_#1E293B] transition-all cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} strokeWidth={2.5} />
          <span>SINKRONKAN STATUS</span>
        </button>
      </div>

      {loading && !subStatus ? (
        <div className="space-y-6">
          <div className="animate-pulse bg-slate-100 border-2 border-slate-800 rounded-3xl h-64 w-full shadow-[6px_6px_0px_#1E293B]" />
          <div className="animate-pulse bg-slate-100 border-2 border-slate-800 rounded-3xl h-48 w-full shadow-[4px_4px_0px_#1E293B]" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse bg-slate-100 border-2 border-slate-800 rounded-3xl h-80 w-full shadow-[4px_4px_0px_#1E293B]" />
            ))}
          </div>
          <div className="animate-pulse bg-slate-100 border-2 border-slate-800 rounded-3xl h-96 w-full shadow-[4px_4px_0px_#1E293B]" />
        </div>
      ) : (
        <>
          {/* Arcade Brutalist Master Banner */}
          <div className="relative bg-white rounded-3xl border-2 border-slate-800 p-6 lg:p-8 shadow-[6px_6px_0px_#1E293B] overflow-hidden space-y-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-200 text-slate-900 border border-slate-800 text-[11px] font-mono font-bold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-600"></span>
                  </span>
                  <span>MONETISASI MANDIRI &amp; AUTO-APPROVE INSTAN</span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 uppercase font-display">
                  PUSAT LISENSI &amp; PEMBAYARAN JURAGAN
                </h1>
                <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
                  Aktivasi instan tanpa menunggu verifikasi manual! Unggah bukti transfer atau gunakan kode voucher
                  16-digit. Langganan langsung aktif seketika untuk mendukung kelancaran operasional warung Anda.
                </p>
              </div>

              {/* Speedometer Status Card */}
              <div className="w-full lg:w-auto bg-slate-50 border-2 border-slate-800 rounded-2xl p-5 shadow-[4px_4px_0px_#1E293B] min-w-[280px]">
                <div className="text-xs font-mono font-bold text-slate-500 uppercase">STATUS LANGGANAN ANDA</div>
                <div className="mt-2 flex items-center gap-3">
                  <div
                    className={`px-3 py-1 font-mono text-sm font-black rounded-xl border-2 ${
                      currentTier === 'EKSEKUTIF'
                        ? 'bg-[#CCFF00] text-slate-950 border-slate-900 shadow-[2px_2px_0px_#1E293B]'
                        : currentTier === 'MANAJER'
                        ? 'bg-amber-400 text-slate-950 border-slate-900 shadow-[2px_2px_0px_#1E293B]'
                        : currentTier === 'SUPERVISOR'
                        ? 'bg-sky-400 text-slate-950 border-slate-900 shadow-[2px_2px_0px_#1E293B]'
                        : 'bg-slate-200 text-slate-800 border-slate-700'
                    }`}
                  >
                    [ 🏆 TIER {currentTier} ]
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t-2 border-slate-200 space-y-1 font-mono text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Masa Aktif:</span>
                    <span className="font-bold text-slate-900">
                      {isExpired ? 'Kedaluwarsa' : `Sisa ${daysRemaining} Hari`}
                    </span>
                  </div>
                  {subStatus?.expires_at && (
                    <div className="flex justify-between text-slate-500">
                      <span>Berlaku Hingga:</span>
                      <span className="font-bold">{new Date(subStatus.expires_at).toLocaleDateString('id-ID')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Cabang Aktif:</span>
                    <span className="font-black text-slate-900">
                      Maks {subStatus?.active_branches_allowed || 1} Cabang
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Grace Period Warning Banner */}
            {isInGrace && (
              <div className="p-4 bg-amber-50 border-2 border-amber-500 text-amber-950 font-mono text-xs sm:text-sm font-bold flex items-center gap-3 rounded-2xl shadow-[4px_4px_0px_#B45309]">
                <AlertTriangle size={20} className="text-amber-600 shrink-0" strokeWidth={2.5} />
                <div>
                  <span className="font-black">[ ⚠️ PERINGATAN: MASA TENGGANG AKTIF - SEGERA AKTIFKAN VOUCHER ]</span>
                  <p className="font-sans font-normal text-amber-900 text-xs mt-0.5">
                    Langganan Anda telah melewati batas waktu normal. Segera lakukan perpanjangan sebelum fitur
                    multi-cabang dan radar dibekukan otomatis ke tier Magang (H+3).
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 4x4 Segmented Voucher Activation Box */}
          <div className="bg-white rounded-3xl border-2 border-slate-800 p-6 lg:p-8 shadow-[4px_4px_0px_#1E293B] space-y-6">
            <div className="flex items-center gap-3 border-b-2 border-slate-100 pb-4">
              <div className="p-2.5 bg-slate-900 text-[#CCFF00] border-2 border-slate-900 rounded-xl shadow-[2px_2px_0px_#1E293B]">
                <Key size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-display font-black uppercase text-slate-900 tracking-wide">
                  AKTIVASI VOUCHER LISENSI 16-DIGIT
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Punya voucher fisik atau kode digital? Masukkan kode 16-digit untuk aktivasi seketika tanpa transfer.
                </p>
              </div>
            </div>

            {redeemSuccess && (
              <div className="p-4 bg-emerald-50 border-2 border-emerald-500 text-emerald-950 font-mono text-sm flex items-start gap-3 rounded-2xl shadow-[3px_3px_0px_#10B981]">
                <CheckCircle2 size={20} className="text-emerald-700 shrink-0 mt-0.5" strokeWidth={2.5} />
                <div>
                  <span className="font-black text-emerald-900">
                    [ ⚡ AKTIVASI BERHASIL: TIER {redeemSuccess.tier} AKTIF ]
                  </span>
                  <p className="font-sans text-xs text-emerald-800 mt-1">
                    {redeemSuccess.message || 'Masa aktif langganan Anda berhasil diperpanjang.'}
                  </p>
                </div>
              </div>
            )}

            {redeemError && (
              <div className="p-4 bg-rose-50 border-2 border-rose-500 text-rose-950 font-mono text-sm flex items-start gap-3 rounded-2xl shadow-[3px_3px_0px_#F43F5E]">
                <AlertCircle size={20} className="text-rose-600 shrink-0 mt-0.5" strokeWidth={2.5} />
                <div>
                  <span className="font-black text-rose-900">[ ❌ GAGAL AKTIVASI ]</span>
                  <p className="font-sans text-xs text-rose-800 mt-1">{redeemError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleRedeem} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">
                  KODE VOUCHER (4 KOTAK MONOSPACE - AUTO ADVANCE &amp; PASTE READY)
                </label>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3" onPaste={handlePaste}>
                  {segments.map((seg, idx) => (
                    <React.Fragment key={idx}>
                      <input
                        ref={inputRefs[idx]}
                        type="text"
                        maxLength={4}
                        value={seg}
                        onChange={(e) => handleSegmentChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        placeholder={idx === 0 ? '2NDM' : 'XXXX'}
                        className="w-20 sm:w-28 h-14 bg-slate-50 border-2 border-slate-800 focus:border-slate-950 focus:bg-lime-50 rounded-xl text-center font-mono text-xl sm:text-2xl font-black text-slate-900 tracking-widest uppercase outline-none shadow-[2px_2px_0px_#1E293B] transition-all"
                      />
                      {idx < 3 && <span className="font-mono text-2xl font-black text-slate-400">-</span>}
                    </React.Fragment>
                  ))}
                </div>
                <p className="text-[11px] font-mono text-slate-500">
                  Tips: Anda dapat langsung menekan tombol Paste (Ctrl+V) kode lengkap 16 karakter ke kotak mana saja.
                </p>
              </div>

              <button
                type="submit"
                disabled={isRedeeming}
                className="btn-arcade px-6 py-3.5 bg-[#CCFF00] hover:bg-[#b8e600] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none text-slate-950 font-mono text-sm font-black rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_#1E293B] flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase"
              >
                {isRedeeming ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" strokeWidth={2.5} />
                    <span>MEMVALIDASI KRIPTOGRAFI...</span>
                  </>
                ) : (
                  <>
                    <Zap size={16} strokeWidth={2.5} />
                    <span>[ ⚡ AKTIFKAN VOUCHER SEKARANG ]</span>
                  </>
                )}
              </button>
            </form>
          </div>

      {/* Subscription Packages Catalog */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-display font-black uppercase text-slate-900 tracking-tight">
            1. PILIH PAKET LANGGANAN RESMI
          </h2>
          <span className="font-mono text-xs font-bold text-slate-500 uppercase">KLIK UNTUK MEMILIH TIER</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CATALOG_PLANS.map((plan) => {
            const isSelected = selectedCatalog === plan.key;
            const isCurrent = currentTier === plan.key;

            return (
              <div
                key={plan.key}
                onClick={() => {
                  setSelectedCatalog(plan.key);
                  if (appliedPromo) setAppliedPromo(null);
                }}
                className={`cursor-pointer transition-all rounded-3xl border-2 p-6 flex flex-col justify-between relative ${
                  isSelected
                    ? 'bg-white border-slate-900 shadow-[6px_6px_0px_#1E293B] ring-4 ring-[#CCFF00]/50 -translate-y-1'
                    : 'bg-white border-slate-800 hover:border-slate-900 shadow-[4px_4px_0px_#1E293B] hover:-translate-y-0.5'
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3 right-6 px-3 py-0.5 bg-amber-400 text-slate-950 font-mono text-[10px] font-black uppercase border-2 border-slate-900 rounded-full shadow-[2px_2px_0px_#1E293B]">
                    PALING BANYAK DIGUNAKAN
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black px-2.5 py-1 bg-slate-900 text-white rounded-lg border border-slate-800">
                      {plan.badge}
                    </span>
                    {isCurrent && (
                      <span className="font-mono text-xs font-black text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 size={13} strokeWidth={2.5} /> PAKET AKTIF
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-display font-black text-slate-900">{plan.name}</h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl sm:text-3xl font-display font-black text-slate-900">
                        {plan.priceLabel}
                      </span>
                      <span className="text-xs font-mono text-slate-500 font-bold">{plan.period}</span>
                    </div>
                  </div>

                  <div className="border-t-2 border-slate-100 pt-4 space-y-2">
                    {plan.features.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2 text-xs text-slate-700">
                        <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" strokeWidth={2.5} />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t-2 border-slate-100">
                  <button
                    type="button"
                    className={`btn-arcade w-full py-2.5 rounded-xl font-mono text-xs font-bold border-2 transition-all cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                      isSelected
                        ? 'bg-[#CCFF00] text-slate-950 border-slate-900 shadow-[3px_3px_0px_#1E293B] font-black'
                        : 'bg-slate-50 text-slate-700 border-slate-800 hover:border-slate-900 hover:bg-slate-100 shadow-[2px_2px_0px_#1E293B]'
                    }`}
                  >
                    {isSelected ? '[ PAKET TERPILIH ]' : 'PILIH PAKET INI'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. OPTIMISTIC PAYMENT CLAIM & PROMO CODE ENGINE */}
      <div className="bg-white rounded-3xl border-2 border-slate-800 p-6 lg:p-8 shadow-[4px_4px_0px_#1E293B] space-y-8">
        <div className="border-b-2 border-slate-100 pb-4">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-emerald-50 border-2 border-emerald-400 text-emerald-950 font-mono text-[11px] font-black uppercase rounded-lg mb-1">
            <Zap size={13} strokeWidth={2.5} /> FITUR BARU: AUTO-APPROVE INSTAN
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-black uppercase text-slate-900 tracking-tight">
            2. UPGRADE / PERPANJANG LANGGANAN INSTAN
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
            Pilih durasi, masukkan kode promo (jika ada), transfer pembayaran, dan unggah bukti struk.
            Sistem akan langsung mengaktifkan lisensi Anda secara otomatis tanpa perlu menunggu!
          </p>
        </div>

        {/* Durasi & Kode Promo Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Durasi Langganan */}
          <div className="lg:col-span-6 space-y-3">
            <label className="block text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">
              PILIH DURASI LANGGANAN
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.months}
                  type="button"
                  onClick={() => {
                    setDurationMonths(opt.months);
                    if (appliedPromo) setAppliedPromo(null);
                  }}
                  className={`btn-arcade py-3 px-2 font-mono text-xs font-black rounded-xl border-2 text-center transition-all cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                    durationMonths === opt.months
                      ? 'bg-[#CCFF00] text-slate-950 border-slate-900 shadow-[3px_3px_0px_#1E293B]'
                      : 'bg-slate-50 text-slate-600 border-slate-800 hover:border-slate-900 hover:bg-slate-100 shadow-[2px_2px_0px_#1E293B]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bilah Input Kode Promo Taktil */}
          <div className="lg:col-span-6 space-y-3">
            <label className="block text-xs font-mono font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>KODE PROMO / DISKON WARUNG</span>
              {appliedPromo && (
                <span className="text-emerald-700 text-[11px] font-mono font-black">TERAPKAN DISKON</span>
              )}
            </label>

            {appliedPromo ? (
              <div className="p-3 bg-emerald-50 border-2 border-emerald-400 rounded-xl flex items-center justify-between shadow-[2px_2px_0px_#10B981]">
                <div className="flex items-center gap-2.5">
                  <Tag size={16} className="text-emerald-700" strokeWidth={2.5} />
                  <div>
                    <div className="font-mono text-xs font-black text-emerald-950">
                      [ PROMO AKTIF: {appliedPromo.code} ]
                    </div>
                    <div className="text-[11px] text-emerald-800 font-mono">
                      {appliedPromo.discountType === 'PERCENTAGE' && `Diskon ${appliedPromo.discountValue}%`}
                      {appliedPromo.discountType === 'FIXED_AMOUNT' && `Potongan Rp ${Number(appliedPromo.discountValue).toLocaleString('id-ID')}`}
                      {appliedPromo.discountType === 'BONUS_DAYS' && `Bonus +${appliedPromo.bonusDays} Hari Masa Aktif`}
                      {appliedPromo.discountType === 'TIER_OVERRIDE' && `Upgrade ke Tier ${appliedPromo.targetTier}`}
                      {appliedPromo.description ? ` • ${appliedPromo.description}` : ''}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemovePromo}
                  className="p-1.5 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                  title="Batalkan Promo"
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <form onSubmit={handleValidatePromo} className="flex gap-2">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => {
                    setPromoInput(e.target.value.toUpperCase());
                    setPromoError('');
                  }}
                  placeholder="MASUKKAN KODE PROMO..."
                  className="flex-1 bg-slate-50 border-2 border-slate-800 focus:border-slate-950 focus:bg-lime-50 px-4 py-2.5 rounded-xl font-mono text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider outline-none transition-all shadow-[2px_2px_0px_#1E293B]"
                />
                <button
                  type="submit"
                  disabled={isValidatingPromo || !promoInput.trim()}
                  className="btn-arcade px-4 py-2.5 bg-[#CCFF00] hover:bg-[#b8e600] disabled:opacity-50 text-slate-950 font-mono text-xs font-black rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_#1E293B] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer shrink-0"
                >
                  {isValidatingPromo ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <span>[ ⚡ TERAPKAN ]</span>
                  )}
                </button>
              </form>
            )}

            {promoError && (
              <p className="text-[11px] font-mono text-rose-600 font-bold flex items-center gap-1.5">
                <AlertCircle size={12} /> {promoError}
              </p>
            )}
          </div>
        </div>

        {/* Rincian Pembayaran & Rekening Bank */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 border-t-2 border-slate-100">
          {/* Kolom Kiri: Rincian Total Bayar */}
          <div className="lg:col-span-5 p-5 bg-slate-50 border-2 border-slate-800 rounded-2xl space-y-4 shadow-[3px_3px_0px_#1E293B]">
            <div className="font-mono text-xs font-black text-slate-500 uppercase tracking-wider border-b-2 border-slate-200 pb-2">
              RINGKASAN TOTAL TAGIHAN
            </div>

            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between text-slate-700">
                <span>Paket Langganan:</span>
                <span className="font-bold text-slate-900">{currentCatalogPlan.name}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Durasi:</span>
                <span className="font-bold text-slate-900">{durationMonths} Bulan</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Harga Normal:</span>
                <span className={appliedPromo ? 'line-through text-slate-400' : 'text-slate-700 font-bold'}>
                  Rp {calculatedBasePrice.toLocaleString('id-ID')}
                </span>
              </div>

              {appliedPromo && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Potongan Promo ({appliedPromo.code}):</span>
                  <span>
                    - Rp {(calculatedBasePrice - calculatedFinalPrice).toLocaleString('id-ID')}
                  </span>
                </div>
              )}

              {appliedPromo?.bonusDays > 0 && (
                <div className="flex justify-between text-sky-700 font-bold">
                  <span>Bonus Masa Aktif:</span>
                  <span>+{appliedPromo.bonusDays} Hari</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t-2 border-slate-200 flex items-baseline justify-between">
              <span className="font-mono text-xs font-black text-slate-500 uppercase">TOTAL DIBAYAR:</span>
              <div className="text-right">
                <span className="text-2xl sm:text-3xl font-display font-black text-slate-900">
                  Rp {calculatedFinalPrice.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <div className="pt-2 text-[11px] font-mono text-slate-500">
              Silakan transfer nominal pas di atas ke salah satu rekening resmi di samping.
            </div>
          </div>

          {/* Kolom Kanan: Rekening Transfer */}
          <div className="lg:col-span-7 space-y-3">
            <span className="block text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">
              REKENING TUJUAN TRANSFER RESMI
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {BANK_ACCOUNTS.map((acc) => (
                <div
                  key={acc.bank}
                  className="p-3.5 bg-white border-2 border-slate-800 rounded-2xl space-y-1.5 shadow-[2px_2px_0px_#1E293B]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-amber-600">{acc.bank}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(acc.number.replace(/-/g, ''), acc.bank)}
                      className="flex items-center gap-1 text-[11px] font-mono font-bold text-slate-600 hover:text-slate-950 transition-colors cursor-pointer"
                    >
                      {copiedKey === acc.bank ? (
                        <>
                          <Check size={12} className="text-emerald-600" strokeWidth={2.5} />
                          <span className="text-emerald-700">TERSALIN</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} strokeWidth={2.5} />
                          <span>SALIN</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="font-mono text-base font-black text-slate-900 tracking-wider">{acc.number}</div>
                  <div className="text-[10px] text-slate-500 font-mono uppercase">A.N. {acc.holder}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Form Unggah Bukti Bayar Instan */}
        <div className="p-6 bg-slate-50 border-2 border-slate-800 rounded-2xl space-y-6 shadow-[3px_3px_0px_#1E293B]">
          <div className="flex items-center gap-3 border-b-2 border-slate-200 pb-3">
            <div className="p-2 bg-slate-900 text-[#CCFF00] border-2 border-slate-900 rounded-xl shadow-[2px_2px_0px_#1E293B]">
              <UploadCloud size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-sm font-display font-black uppercase text-slate-900 tracking-wide">
                UNGGAH BUKTI STRUK TRANSFER &amp; AKTIFKAN SEGERA
              </h3>
              <p className="text-[11px] text-slate-500">
                Format gambar JPG, PNG, atau WebP (maks. 10 MB). Lisensi langsung aktif seketika setelah diunggah!
              </p>
            </div>
          </div>

          {claimError && (
            <div className="p-3 bg-rose-50 border-2 border-rose-500 rounded-xl text-rose-800 font-mono text-xs flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>{claimError}</span>
            </div>
          )}

          <form onSubmit={handleSubmitClaim} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1.5">
                  BANK PENGIRIM
                </label>
                <select
                  value={senderBank}
                  onChange={(e) => setSenderBank(e.target.value)}
                  className="w-full bg-white border-2 border-slate-800 focus:border-slate-950 focus:ring-2 focus:ring-[#CCFF00] rounded-xl px-3 py-2 font-mono text-xs text-slate-900 outline-none cursor-pointer shadow-[2px_2px_0px_#1E293B]"
                >
                  <option value="BNI">BNI (Bank Negara Indonesia)</option>
                  <option value="BSI">BSI (Bank Syariah Indonesia)</option>
                  <option value="BCA">BCA (Bank Central Asia)</option>
                  <option value="MANDIRI">Bank Mandiri</option>
                  <option value="BRI">BRI (Bank Rakyat Indonesia)</option>
                  <option value="QRIS">QRIS / E-Wallet (GoPay/OVO/ShopeePay)</option>
                  <option value="LAINNYA">Bank Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1.5">
                  NAMA PEMILIK REKENING PENGIRIM (OPSIONAL)
                </label>
                <input
                  type="text"
                  value={senderAccountName}
                  onChange={(e) => setSenderAccountName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full bg-white border-2 border-slate-800 focus:border-slate-950 focus:ring-2 focus:ring-[#CCFF00] rounded-xl px-3 py-2 font-mono text-xs text-slate-900 placeholder-slate-400 outline-none shadow-[2px_2px_0px_#1E293B]"
                />
              </div>
            </div>

            {/* Drag and drop / file selector box */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              {proofPreview ? (
                <div className="p-4 bg-white border-2 border-emerald-500 rounded-2xl flex flex-col sm:flex-row items-center gap-4 shadow-[2px_2px_0px_#10B981]">
                  <img
                    src={proofPreview}
                    alt="Preview Bukti Transfer"
                    className="w-24 h-24 sm:w-32 sm:h-32 object-cover border-2 border-slate-800 rounded-xl shrink-0"
                  />
                  <div className="space-y-1 flex-1 text-center sm:text-left">
                    <div className="font-mono text-xs font-black text-emerald-800 flex items-center justify-center sm:justify-start gap-1.5">
                      <FileCheck size={14} /> BERKAS SIAP DIUNGGAH
                    </div>
                    <div className="font-mono text-xs text-slate-800 font-bold truncate max-w-sm">
                      {proofFile?.name}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {(proofFile?.size / 1024).toFixed(1)} KB
                    </div>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setProofFile(null);
                          setProofPreview(null);
                        }}
                        className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-mono text-xs font-bold border-2 border-rose-400 rounded-lg transition-colors cursor-pointer"
                      >
                        Ganti Gambar
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 sm:p-8 bg-slate-50/60 border-2 border-dashed border-slate-800 hover:border-lime-500 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors space-y-2 group shadow-[2px_2px_0px_#1E293B]"
                >
                  <UploadCloud
                    size={32}
                    className="text-slate-400 group-hover:text-slate-900 transition-colors"
                    strokeWidth={2}
                  />
                  <div className="font-mono text-xs sm:text-sm font-bold text-slate-700 group-hover:text-slate-950">
                    Klik di sini atau seret foto bukti transfer ke kotak ini
                  </div>
                  <p className="text-[11px] font-mono text-slate-500">
                    Mendukung tangkapan layar m-banking (BNI, BSI, BCA, Mandiri, BRI) &amp; struk ATM
                  </p>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <a
                href={`https://wa.me/6285188789773?text=${waMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-950 font-mono text-xs font-bold border-2 border-slate-800 rounded-xl shadow-[2px_2px_0px_#1E293B] transition-all text-center active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              >
                <MessageSquare size={14} />
                <span>Bantuan Pembayaran via WhatsApp</span>
              </a>

              <button
                type="submit"
                disabled={isSubmittingClaim || !proofFile}
                className="btn-arcade w-full sm:w-auto px-8 py-3.5 bg-[#CCFF00] hover:bg-[#b8e600] text-slate-950 font-mono text-sm font-black rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_#1E293B] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                {isSubmittingClaim ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" strokeWidth={2.5} />
                    <span>MENGUNGGAH &amp; MENGAKTIFKAN LISENSI...</span>
                  </>
                ) : (
                  <>
                    <Zap size={16} strokeWidth={2.5} />
                    <span>[ 🚀 SAYA SUDAH BAYAR — AKTIFKAN LISENSI SEKARANG ]</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Voucher Redemption History */}
      {subStatus?.history && subStatus.history.length > 0 && (
        <div className="bg-white rounded-3xl border-2 border-slate-800 p-6 space-y-4 shadow-[4px_4px_0px_#1E293B]">
          <h3 className="text-sm font-display font-black uppercase text-slate-900 tracking-wider">
            RIWAYAT VOUCHER YANG PERNAH DIAKTIFKAN
          </h3>
          <div className="overflow-x-auto rounded-xl border-2 border-slate-800">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="py-2.5 px-3 uppercase tracking-wider">KODE VOUCHER</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider">TIER</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider">DURASI</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider">TANGGAL AKTIVASI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {subStatus.history.map((h) => (
                  <tr key={h.id || h.token_code} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{h.token_code}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-slate-800 font-bold">
                        {h.tier_id}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-bold">{h.duration_days} Hari</td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {h.redeemed_at ? new Date(h.redeemed_at).toLocaleString('id-ID') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </>
      )}

      {/* Optimistic Activation Success Modal */}
      {optimisticModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in font-sans">
          <div className="bg-white border-2 border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-[8px_8px_0px_#1E293B] space-y-6 relative animate-in fade-in zoom-in duration-200 text-slate-900">
            <button
              onClick={() => setOptimisticModal(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl border-2 border-slate-800 transition-colors cursor-pointer active:translate-x-[1px] active:translate-y-[1px]"
            >
              <X size={16} />
            </button>

            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-[#CCFF00] text-slate-950 mx-auto flex items-center justify-center border-2 border-slate-900 rounded-2xl shadow-[3px_3px_0px_#1E293B]">
                <Sparkles size={32} strokeWidth={2.5} />
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border-2 border-emerald-400 text-emerald-950 font-mono text-xs font-black uppercase rounded-lg">
                {optimisticModal.status === 'INSTANT_ACTIVATED'
                  ? '⚡ LISENSI LANGSUNG DIAKTIFKAN!'
                  : '⏳ TINJAUAN PEMBAYARAN'}
              </div>

              <h2 className="text-xl sm:text-2xl font-display font-black text-slate-900 uppercase">
                {optimisticModal.status === 'INSTANT_ACTIVATED'
                  ? `SELAMAT! TIER ${optimisticModal.tier} AKTIF`
                  : 'BUKTI BERHASIL DIKIRIM'}
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {optimisticModal.message ||
                  `Selamat menikmati seluruh fitur paket ${optimisticModal.tier}. Bukti transfer Anda telah otomatis tercatat ke audit ledger sistem.`}
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-2 border-slate-800 rounded-2xl font-mono text-xs space-y-2 shadow-[2px_2px_0px_#1E293B]">
              <div className="flex justify-between text-slate-600">
                <span>Tier Langganan:</span>
                <span className="font-bold text-slate-900">{optimisticModal.tier || selectedCatalog}</span>
              </div>
              {optimisticModal.duration_days && (
                <div className="flex justify-between text-slate-600">
                  <span>Total Durasi:</span>
                  <span className="font-bold text-slate-900">{optimisticModal.duration_days} Hari</span>
                </div>
              )}
              {optimisticModal.expires_at && (
                <div className="flex justify-between text-slate-600">
                  <span>Berlaku Sampai:</span>
                  <span className="font-bold text-slate-900">
                    {new Date(optimisticModal.expires_at).toLocaleDateString('id-ID')}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-slate-500 pt-2 border-t-2 border-slate-200 text-[11px]">
                <span>Status Audit:</span>
                <span className="text-amber-600 font-black">Provisional Auto-Approved</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setOptimisticModal(null)}
                className="btn-arcade w-full py-3.5 bg-[#CCFF00] hover:bg-[#b8e600] text-slate-950 font-mono text-xs sm:text-sm font-black rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_#1E293B] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer uppercase"
              >
                [ ⚡ TERIMA KASIH, LANJUTKAN BERJUALAN ]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
