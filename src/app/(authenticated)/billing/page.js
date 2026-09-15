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
  Gift,
  Users
} from 'lucide-react';
import QrisPaymentCard from '@/components/billing/QrisPaymentCard';
import { TIER_DEFINITIONS, ADDON_PRICING, normalizeTierKey, toDbTierKey, getCanonicalTier } from '@/config/tierMapping';

const CATALOG_PLANS = [
  {
    key: 'RINTISAN',
    legacyKey: 'MAGANG',
    name: 'Rintisan',
    priceRp: 0,
    priceLabel: 'Rp 0',
    period: '/ bulan',
    badge: '🌱 RINTISAN',
    description: 'Pondasi kasir mandiri bebas biaya untuk warung pemula.',
    isPopular: false,
    features: [
      '1 Cabang Utama (Toko A)',
      '1 Akun Kasir Aktif',
      'Pencatatan Transaksi & Cetak Struk',
      'Riwayat Laporan 7 Hari',
      'Katalog Maksimal 50 SKU',
      'Keyboard Kasir Ergonomis (F2/F4/Spasi)',
    ],
    borderCol: '#94A3B8',
    bgCol: '#475569',
  },
  {
    key: 'MANDIRI',
    legacyKey: 'SUPERVISOR',
    name: 'Mandiri',
    priceRp: 50000,
    priceLabel: 'Rp 50.000',
    period: '/ bulan',
    badge: '🛡️ MANDIRI',
    description: 'Pengamanan penuh laci kas dari kecurangan dan anomali nota.',
    isPopular: false,
    features: [
      'Semua Fitur Rintisan',
      'Maksimal 2 Kasir Aktif',
      'Laporan Keuangan 90 Hari',
      'Manajemen Kasbon & WhatsApp Tagihan',
      'Log Void & Pembatalan Transaksi',
      'Ekspor CSV & Background Sync POS',
    ],
    borderCol: '#38BDF8',
    bgCol: '#0369A1',
  },
  {
    key: 'USAHA_BERKEMBANG',
    legacyKey: 'MANAJER',
    name: 'Usaha Berkembang',
    priceRp: 150000,
    priceLabel: 'Rp 150.000',
    period: '/ bulan',
    badge: '📈 USAHA BERKEMBANG',
    description: 'Kepatuhan pajak PP 55, SAK EMKM, dan berkas KUR Bank resmi.',
    isPopular: true,
    features: [
      'Semua Fitur Mandiri',
      'Maksimal 4 Kasir Aktif',
      'Riwayat Laporan Tanpa Batas (Unlimited)',
      'Multi-Satuan Barang (Pcs, Dus, Renceng)',
      'Margin Guard (Peringatan Jual Rugi)',
      'Manajemen Konsinyasi & Rekap Vendor',
      'Sistem Titipan Saldo Pelanggan',
      'Pergantian Shift Kasir & Rekap WA',
    ],
    borderCol: '#F59E0B',
    bgCol: '#B45309',
  },
  {
    key: 'JURAGAN_CABANG',
    legacyKey: 'EKSEKUTIF',
    name: 'Juragan Cabang',
    priceRp: 350000,
    priceLabel: 'Rp 350.000',
    period: '/ bulan',
    badge: '👑 JURAGAN CABANG',
    description: 'Kendali multi-cabang terpadu, transfer stok PIN, dan kontrol sentral.',
    isPopular: false,
    features: [
      'Semua Fitur Usaha Berkembang',
      'Hingga 3 Cabang Toko (Toko A + 2 Cabang)',
      'Maksimal 8 Kasir Aktif',
      'Transfer Stok Antar Cabang (PIN Validasi)',
      'Laporan Konsolidasi Multi-Cabang',
      'Audit Forensik Fraud Kasir Tingkat Lanjut',
      'Pemisahan Akses Supervisor & Owner',
      'Prioritas Fitur Baru & VIP Support 24/7',
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
  const [selectedCatalog, setSelectedCatalog] = useState('USAHA_BERKEMBANG');
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
  const [senderBank, setSenderBank] = useState('QRIS');
  const [senderAccountName, setSenderAccountName] = useState('');
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [optimisticModal, setOptimisticModal] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('qris'); // 'qris' or 'bank_transfer'
  const uploadFormRef = useRef(null);

  // Copy feedback state
  const [copiedKey, setCopiedKey] = useState('');

  // Add-on Capacity States
  const [addonBranches, setAddonBranches] = useState(0);
  const [addonCashiers, setAddonCashiers] = useState(0);
  const [addonCalc, setAddonCalc] = useState(null);
  const [isCalculatingAddon, setIsCalculatingAddon] = useState(false);
  const [purchaseMode, setPurchaseMode] = useState('FULL'); // 'FULL' or 'PURE_ADDON'
  const checkoutSectionRef = useRef(null);

  const calculateAddons = async (branches, cashiers, orgId) => {
    if (branches === 0 && cashiers === 0) {
      setAddonCalc(null);
      return;
    }
    setIsCalculatingAddon(true);
    try {
      const targetOrg = orgId || subStatus?.organization_id;
      const res = await fetch('/api/v1/billing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: targetOrg,
          targetTier: selectedCatalog,
          extraBranchesCount: branches,
          extraCashiersCount: cashiers,
          promoCode: appliedPromo?.code || promoInput,
          durationMonths: durationMonths,
          isPureAddon: true, // Stepper ekspansi selalu menghitung prorata add-on murni untuk sisa siklus aktif
        }),
      });
      const json = await res.json();
      if (res.ok && json?.data) {
        setAddonCalc({
          ...json.data,
          totalBranchCost: json.data.branchCost,
          totalCashierCost: json.data.cashierCost,
          proratedBranchPrice: json.data.proratedBranchUnitPrice || json.data.branchUnitPrice,
          proratedCashierPrice: json.data.proratedCashierUnitPrice || json.data.cashierUnitPrice,
        });
      }
    } catch (e) {
      console.warn('Gagal kalkulasi add-on:', e);
    } finally {
      setIsCalculatingAddon(false);
    }
  };

  const handleBranchStep = (delta) => {
    const nextVal = Math.max(0, addonBranches + delta);
    setAddonBranches(nextVal);
    calculateAddons(nextVal, addonCashiers);
  };

  const handleCashierStep = (delta) => {
    const nextVal = Math.max(0, addonCashiers + delta);
    setAddonCashiers(nextVal);
    calculateAddons(addonBranches, nextVal);
  };

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
          if (typeof window !== 'undefined' && json.data.tier) {
            window.dispatchEvent(new CustomEvent('hl-plan-changed', { detail: { plan: json.data.tier } }));
          }
          return;
        }
      }

      // Fallback ke /api/v1/billing jika endpoint status belum terisi
      const fallbackRes = await fetch('/api/v1/billing', { cache: 'no-store' });
      if (fallbackRes.ok) {
        const fallbackJson = await fallbackRes.json();
        const fallbackTier = (fallbackJson?.data?.plan || fallbackJson?.data?.tier || 'MAGANG').toUpperCase();
        setSubStatus({
          tier: fallbackTier,
          status: 'ACTIVE',
          is_in_grace: false,
          days_remaining: 30,
          active_branches_allowed: fallbackTier === 'EKSEKUTIF' ? 3 : 1,
        });
        if (typeof window !== 'undefined' && fallbackTier) {
          window.dispatchEvent(new CustomEvent('hl-plan-changed', { detail: { plan: fallbackTier } }));
        }
        return;
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

    if (purchaseMode === 'PURE_ADDON' && addonBranches === 0 && addonCashiers === 0) {
      setClaimError('Pilih minimal 1 slot cabang atau kasir tambahan untuk melakukan pembelian add-on.');
      return;
    }

    try {
      setIsSubmittingClaim(true);

      const isPureAddon = purchaseMode === 'PURE_ADDON';
      const addonTotal = isPureAddon
        ? ((addonCalc?.totalBranchCost || 0) + (addonCalc?.totalCashierCost || 0))
        : addonTotalCostFull;

      const formData = new FormData();
      formData.append('file', proofFile);
      if (isPureAddon) {
        formData.append('targetTier', 'ADDON');
        formData.append('durationMonths', '0');
        formData.append('basePrice', addonTotal.toString());
        formData.append('finalPrice', addonTotal.toString());
      } else {
        formData.append('targetTier', appliedPromo?.targetTier || selectedCatalog);
        formData.append('durationMonths', durationMonths.toString());
        formData.append('basePrice', (calculatedBasePrice + addonTotal).toString());
        formData.append('finalPrice', (calculatedFinalPrice + addonTotal).toString());
      }

      formData.append('addonBranches', addonBranches.toString());
      formData.append('addonCashiers', addonCashiers.toString());
      formData.append('addonTotal', addonTotal.toString());

      if (appliedPromo?.promoId && !isPureAddon) {
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
      setAddonBranches(0);
      setAddonCashiers(0);
      setAddonCalc(null);
      setPurchaseMode('FULL');

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

  const currentCatalogPlan = CATALOG_PLANS.find((p) => p.key === selectedCatalog || p.legacyKey === selectedCatalog) || CATALOG_PLANS[2];

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

  const addonBranchCostFull = addonBranches * 150000 * durationMonths;
  const addonCashierCostFull = addonCashiers * 40000 * durationMonths;
  const addonTotalCostFull = addonBranchCostFull + addonCashierCostFull;

  const grandTotalPayable = purchaseMode === 'PURE_ADDON'
    ? ((addonCalc?.totalBranchCost || 0) + (addonCalc?.totalCashierCost || 0))
    : (calculatedFinalPrice + addonTotalCostFull);

  const waMessage = encodeURIComponent(
    `Halo Admin 2ndManager, saya ingin konfirmasi klaim pembayaran lisensi:\n\n` +
      `*Nama Usaha:* ${subStatus?.organization_name || 'Toko 2ndManager'}\n` +
      (purchaseMode === 'PURE_ADDON'
        ? `*Mode:* Pembelian Add-on Kapasitas Murni\n`
        : `*Paket:* ${currentCatalogPlan.name} (${durationMonths} Bulan)\n`) +
      (addonBranches > 0 ? `*Extra Cabang:* +${addonBranches} Slot\n` : '') +
      (addonCashiers > 0 ? `*Extra Kasir:* +${addonCashiers} Slot\n` : '') +
      `*Total Bayar:* Rp ${grandTotalPayable.toLocaleString('id-ID')}\n` +
      (appliedPromo && purchaseMode !== 'PURE_ADDON' ? `*Promo:* ${appliedPromo.code}\n` : '') +
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
                      currentTier === 'EKSEKUTIF' || currentTier === 'JURAGAN_CABANG'
                        ? 'bg-[#CCFF00] text-slate-950 border-slate-900 shadow-[2px_2px_0px_#1E293B]'
                        : currentTier === 'MANAJER' || currentTier === 'USAHA_BERKEMBANG'
                        ? 'bg-amber-400 text-slate-950 border-slate-900 shadow-[2px_2px_0px_#1E293B]'
                        : currentTier === 'SUPERVISOR' || currentTier === 'MANDIRI'
                        ? 'bg-sky-400 text-slate-950 border-slate-900 shadow-[2px_2px_0px_#1E293B]'
                        : 'bg-slate-200 text-slate-800 border-slate-700'
                    }`}
                  >
                    [ 🏆 TIER {(getCanonicalTier(currentTier)?.name || currentTier).toUpperCase()} ]
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

      {/* Umbrella License Banner */}
      <div className="bg-lime-50 border-2 border-slate-800 rounded-2xl p-4 shadow-[3px_3px_0px_#1E293B] flex items-center gap-3">
        <span className="text-2xl">☂️</span>
        <div className="text-xs sm:text-sm font-sans text-slate-800">
          <strong className="font-mono uppercase font-black text-slate-900">Satu Lisensi Untuk Semua:</strong> Seluruh toko cabang dan akun kasir Anda otomatis menikmati fitur penuh dari paket yang Anda pilih tanpa biaya paket tambahan!
        </div>
      </div>

      {/* Subscription Packages Catalog */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <h2 className="text-xl sm:text-2xl font-display font-black uppercase text-slate-900 tracking-tight">
            1. PILIH PAKET LANGGANAN RESMI
          </h2>
          <span className="font-mono text-xs font-bold text-slate-500 uppercase">KLIK UNTUK MEMILIH TIER</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {CATALOG_PLANS.map((plan) => {
            const isSelected = selectedCatalog === plan.key || selectedCatalog === plan.legacyKey;
            const isCurrent = currentTier === plan.key || currentTier === plan.legacyKey;

            return (
              <div
                key={plan.key}
                onClick={() => {
                  setSelectedCatalog(plan.key);
                  setPurchaseMode('FULL');
                  if (appliedPromo) setAppliedPromo(null);
                }}
                className={`cursor-pointer transition-all rounded-3xl border-2 p-5 sm:p-6 flex flex-col justify-between relative ${
                  isSelected
                    ? 'bg-white border-slate-900 shadow-[6px_6px_0px_#1E293B] ring-4 ring-[#CCFF00]/50 -translate-y-1'
                    : 'bg-white border-slate-800 hover:border-slate-900 shadow-[4px_4px_0px_#1E293B] hover:-translate-y-0.5'
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3 right-4 px-2.5 py-0.5 bg-amber-400 text-slate-950 font-mono text-[9px] font-black uppercase border-2 border-slate-900 rounded-full shadow-[2px_2px_0px_#1E293B]">
                    PALING LARIS
                  </div>
                )}

                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-black px-2 py-0.5 bg-slate-900 text-white rounded-lg border border-slate-800">
                      {plan.badge}
                    </span>
                    {isCurrent && (
                      <span className="font-mono text-[11px] font-black text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 size={12} strokeWidth={2.5} /> PAKET AKTIF
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-display font-black text-slate-900">{plan.name}</h3>
                    <p className="text-[11px] font-mono text-slate-500 line-clamp-2 mt-0.5">{plan.description}</p>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-xl sm:text-2xl font-display font-black text-slate-900">
                        {plan.priceLabel}
                      </span>
                      <span className="text-xs font-mono text-slate-500 font-bold">{plan.period}</span>
                    </div>
                  </div>

                  <div className="border-t-2 border-slate-100 pt-3 space-y-1.5">
                    {plan.features.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-1.5 text-xs text-slate-700">
                        <Check size={13} className="text-emerald-600 shrink-0 mt-0.5" strokeWidth={2.5} />
                        <span className="leading-snug">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t-2 border-slate-100">
                  <button
                    type="button"
                    className={`btn-arcade w-full py-2 rounded-xl font-mono text-xs font-bold border-2 transition-all cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                      isSelected
                        ? 'bg-[#CCFF00] text-slate-950 border-slate-900 shadow-[3px_3px_0px_#1E293B] font-black'
                        : 'bg-slate-50 text-slate-700 border-slate-800 hover:border-slate-900 hover:bg-slate-100 shadow-[2px_2px_0px_#1E293B]'
                    }`}
                  >
                    {isSelected ? '[ PAKET TERPILIH ]' : 'PILIH PAKET'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. KAPASITAS TAMBAHAN (ADD-ON FLEKSIBEL) */}
      <div className="bg-white rounded-3xl border-2 border-slate-800 shadow-[6px_6px_0px_#1E293B] p-6 sm:p-8 mt-8 space-y-6">
        <div className="border-b-2 border-slate-100 pb-4">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-lime-100 border-2 border-slate-800 text-slate-950 font-mono text-[11px] font-black uppercase rounded-lg mb-1 shadow-[2px_2px_0px_#1E293B]">
            <Sparkles size={13} strokeWidth={2.5} /> EXPANSION PACK
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-black uppercase text-slate-900 tracking-tight">
            KAPASITAS TAMBAHAN (ADD-ON FLEKSIBEL)
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
            Perluas jangkauan operasional warung Anda tanpa terbebani upgrade paket.
          </p>
        </div>

        {/* Dua Panel Stepper Taktil */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* PANEL 1: SLOT CABANG TAMBAHAN */}
          <div className="p-5 bg-slate-50 border-2 border-slate-800 rounded-2xl space-y-4 shadow-[3px_3px_0px_#1E293B]">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-display font-black text-slate-900 text-base uppercase block">
                  SLOT CABANG TAMBAHAN
                </span>
                <span className="font-mono text-xs font-bold text-slate-600">
                  + Rp 150.000 / cabang / bulan (~Rp 5.000/hari)
                </span>
              </div>
              <div className="p-2 bg-slate-900 text-[#CCFF00] rounded-xl border border-slate-800">
                <Building2 size={20} />
              </div>
            </div>

            {/* Stepper Buttons */}
            <div className="flex items-center justify-between bg-white border-2 border-slate-800 rounded-xl p-2 shadow-[2px_2px_0px_#1E293B]">
              <span className="font-mono text-xs font-bold text-slate-600 pl-2">Tambah Slot:</span>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => handleBranchStep(-1)}
                  disabled={addonBranches <= 0}
                  className="w-10 h-10 border-2 border-slate-800 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg flex items-center justify-center font-mono font-black text-lg text-slate-900 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                >
                  -
                </button>
                <span className="font-mono font-black text-xl px-4 min-w-[50px] text-center text-slate-900">
                  {addonBranches}
                </span>
                <button
                  type="button"
                  onClick={() => handleBranchStep(1)}
                  className="w-10 h-10 border-2 border-slate-800 bg-lime-300 hover:bg-lime-400 rounded-lg flex items-center justify-center font-mono font-black text-lg text-slate-900 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer shadow-[1px_1px_0px_#1E293B]"
                >
                  +
                </button>
              </div>
            </div>

            {/* Status Visual Gerai */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-mono text-xs">
              <span className="text-slate-500">Status Gerai:</span>
              <span className="font-bold text-slate-900">
                [ Toko A (Pusat) + {addonBranches} Cabang Baru ]
              </span>
            </div>
          </div>

          {/* PANEL 2: SLOT AKUN KASIR TAMBAHAN */}
          <div className="p-5 bg-slate-50 border-2 border-slate-800 rounded-2xl space-y-4 shadow-[3px_3px_0px_#1E293B]">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-display font-black text-slate-900 text-base uppercase block">
                  SLOT AKUN KASIR TAMBAHAN
                </span>
                <span className="font-mono text-xs font-bold text-slate-600">
                  + Rp 40.000 / kasir / bulan (~Rp 1.300/hari)
                </span>
              </div>
              <div className="p-2 bg-slate-900 text-[#CCFF00] rounded-xl border border-slate-800">
                <Users size={20} />
              </div>
            </div>

            {/* Stepper Buttons */}
            <div className="flex items-center justify-between bg-white border-2 border-slate-800 rounded-xl p-2 shadow-[2px_2px_0px_#1E293B]">
              <span className="font-mono text-xs font-bold text-slate-600 pl-2">Tambah Slot:</span>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => handleCashierStep(-1)}
                  disabled={addonCashiers <= 0}
                  className="w-10 h-10 border-2 border-slate-800 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg flex items-center justify-center font-mono font-black text-lg text-slate-900 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                >
                  -
                </button>
                <span className="font-mono font-black text-xl px-4 min-w-[50px] text-center text-slate-900">
                  {addonCashiers}
                </span>
                <button
                  type="button"
                  onClick={() => handleCashierStep(1)}
                  className="w-10 h-10 border-2 border-slate-800 bg-lime-300 hover:bg-lime-400 rounded-lg flex items-center justify-center font-mono font-black text-lg text-slate-900 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer shadow-[1px_1px_0px_#1E293B]"
                >
                  +
                </button>
              </div>
            </div>

            {/* Status Visual Kasir */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-mono text-xs">
              <span className="text-slate-500">Status Kasir:</span>
              <span className="font-bold text-slate-900">
                [ {subStatus?.current_active_cashiers ?? 0} Kasir Terdaftar / {(subStatus?.max_allowed_cashiers ?? 1) + addonCashiers} Total Kuota ]
              </span>
            </div>
          </div>
        </div>

        {/* Kotak Rincian & Prorasi Real-Time */}
        {(addonBranches > 0 || addonCashiers > 0) && (
          <div className="bg-slate-50 border-2 border-slate-800 rounded-2xl p-5 font-mono text-sm space-y-3 shadow-[3px_3px_0px_#1E293B]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <span className="font-bold text-slate-800 uppercase">
                RINCIAN PRORASI TANGGAL JATUH TEMPO (CO-TERMINATION)
              </span>
              <span className="px-2.5 py-0.5 bg-sky-100 text-sky-900 border border-sky-400 rounded-md text-xs font-black">
                ⏱️ Sisa Siklus: {addonCalc?.sisaHari ?? daysRemaining} Hari
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-700">
              {addonBranches > 0 && (
                <div className="flex justify-between">
                  <span>
                    Slot Cabang (+{addonBranches} Gerai @ Rp {(addonCalc?.proratedBranchPrice || 150000).toLocaleString('id-ID')}/bln prorata):
                  </span>
                  <span className="font-bold text-slate-900">
                    Rp {(addonCalc?.totalBranchCost || 0).toLocaleString('id-ID')}
                  </span>
                </div>
              )}
              {addonCashiers > 0 && (
                <div className="flex justify-between">
                  <span>
                    Slot Kasir (+{addonCashiers} Kasir @ Rp {(addonCalc?.proratedCashierPrice || 40000).toLocaleString('id-ID')}/bln prorata):
                  </span>
                  <span className="font-bold text-slate-900">
                    Rp {(addonCalc?.totalCashierCost || 0).toLocaleString('id-ID')}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t-2 border-slate-300 flex items-baseline justify-between text-base">
              <span className="font-black text-slate-900 uppercase">Total Tambahan Add-on:</span>
              <span className="font-display font-black text-xl text-slate-950 underline underline-offset-4 decoration-2 decoration-lime-500">
                Rp {((addonCalc?.totalBranchCost || 0) + (addonCalc?.totalCashierCost || 0)).toLocaleString('id-ID')}
              </span>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500">
                Prorasi diselaraskan dengan masa aktif paket {(getCanonicalTier(subStatus?.tier)?.name || subStatus?.tier || 'induk').toUpperCase()} Anda hingga{' '}
                {subStatus?.expires_at ? new Date(subStatus.expires_at).toLocaleDateString('id-ID') : 'akhir siklus'}.
              </span>
              <button
                type="button"
                onClick={() => {
                  setPurchaseMode('PURE_ADDON');
                  checkoutSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="btn-arcade w-full sm:w-auto px-5 py-2.5 bg-[#CCFF00] hover:bg-[#b8e600] text-slate-950 font-black rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_#1E293B] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer uppercase text-xs"
              >
                [ 🚀 BAYAR ADD-ON & AKTIFKAN SLOT SEKARANG ]
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. OPTIMISTIC PAYMENT CLAIM & PROMO CODE ENGINE */}
      <div ref={checkoutSectionRef} className="bg-white rounded-3xl border-2 border-slate-800 p-6 lg:p-8 shadow-[4px_4px_0px_#1E293B] space-y-8">
        <div className="border-b-2 border-slate-100 pb-4">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-emerald-50 border-2 border-emerald-400 text-emerald-950 font-mono text-[11px] font-black uppercase rounded-lg mb-1">
            <Zap size={13} strokeWidth={2.5} /> FITUR BARU: AUTO-APPROVE INSTAN
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-black uppercase text-slate-900 tracking-tight">
            3. SELESAIKAN PEMBAYARAN &amp; AKTIFKAN LISENSI INSTAN
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
            {purchaseMode === 'PURE_ADDON'
              ? 'Anda memilih mode pembayaran Add-on Kapasitas Murni. Transfer pembayaran dan unggah bukti transfer untuk mengaktifkan slot seketika!'
              : 'Pilih durasi, masukkan kode promo (jika ada), transfer pembayaran, dan unggah bukti struk. Sistem akan langsung mengaktifkan lisensi Anda secara otomatis tanpa perlu menunggu!'}
          </p>
        </div>

        {/* Durasi & Kode Promo Row */}
        {purchaseMode === 'PURE_ADDON' ? (
          <div className="p-4 bg-sky-50 border-2 border-sky-400 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[2px_2px_0px_#0284C7]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-sky-600 text-white font-mono text-[10px] font-black rounded">
                  MODE AKTIF
                </span>
                <span className="font-mono text-xs font-black text-sky-950 uppercase">
                  PEMBELIAN ADD-ON KAPASITAS MURNI
                </span>
              </div>
              <p className="text-xs text-sky-800 font-mono">
                Anda hanya membeli slot kapasitas tambahan tanpa mengubah tier atau memperpanjang paket induk. Prorasi dihitung otomatis selaras dengan sisa siklus aktif ({addonCalc?.sisaHari ?? daysRemaining} hari).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPurchaseMode('FULL')}
              className="btn-arcade px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-800 rounded-xl font-mono text-xs font-bold shadow-[2px_2px_0px_#1E293B] shrink-0 cursor-pointer"
            >
              [ 🔄 BERALIH KE PAKET + ADD-ON ]
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Durasi Langganan */}
            <div className="lg:col-span-6 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">
                  PILIH DURASI LANGGANAN
                </label>
                {(addonBranches > 0 || addonCashiers > 0) && (
                  <button
                    type="button"
                    onClick={() => setPurchaseMode('PURE_ADDON')}
                    className="text-[11px] font-mono font-bold text-sky-700 hover:text-sky-900 underline cursor-pointer"
                  >
                    [ HANYA BELI ADD-ON ]
                  </button>
                )}
              </div>
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
        )}

        {/* METODE PEMBAYARAN TABS (Capsule Neo-Brutalist) */}
        <div className="pt-4 border-t-2 border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="font-mono text-xs font-black text-slate-500 uppercase tracking-wider block">
                PILIH METODE PEMBAYARAN RESMI
              </span>
              <p className="text-[11px] text-slate-500 font-mono">
                Pilih metode pembayaran terverifikasi: Scan QRIS instan atau transfer bank manual.
              </p>
            </div>

            <div className="inline-flex p-1.5 bg-slate-100 border-2 border-slate-800 rounded-2xl gap-1.5 shadow-[2px_2px_0px_#1E293B]">
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('qris');
                  setSenderBank('QRIS');
                }}
                className={`px-4 py-2 font-mono text-xs font-black rounded-xl border-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  paymentMethod === 'qris'
                    ? 'bg-[#CCFF00] border-slate-900 text-slate-950 shadow-[2px_2px_0px_#1E293B]'
                    : 'bg-white/80 hover:bg-white border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Zap size={14} className={paymentMethod === 'qris' ? 'text-slate-950' : 'text-amber-500'} strokeWidth={2.5} />
                <span>[ ⚡ QRIS / E-WALLET (INSTAN) ]</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('bank_transfer');
                  if (senderBank === 'QRIS') setSenderBank('BNI');
                }}
                className={`px-4 py-2 font-mono text-xs font-black rounded-xl border-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  paymentMethod === 'bank_transfer'
                    ? 'bg-[#CCFF00] border-slate-900 text-slate-950 shadow-[2px_2px_0px_#1E293B]'
                    : 'bg-white/80 hover:bg-white border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 size={14} className={paymentMethod === 'bank_transfer' ? 'text-slate-950' : 'text-indigo-500'} strokeWidth={2.5} />
                <span>[ 🏛️ TRANSFER BANK (BNI / BSI) ]</span>
              </button>
            </div>
          </div>

          {/* TAB CONTENT: QRIS OR MANUAL BANK */}
          <div>
            {paymentMethod === 'qris' ? (
              <QrisPaymentCard
                totalAmount={grandTotalPayable}
                onProceedToUpload={() => {
                  uploadFormRef.current?.scrollIntoView({ behavior: 'smooth' });
                }}
              />
            ) : (
              <div className="p-5 sm:p-6 bg-slate-50 border-2 border-slate-800 rounded-2xl shadow-[4px_4px_0px_#1E293B] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-600 text-white rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_#1E293B]">
                      <Building2 size={16} />
                    </div>
                    <div>
                      <h4 className="font-display font-black text-sm text-slate-900 uppercase">
                        REKENING TUJUAN TRANSFER RESMI
                      </h4>
                      <p className="text-[11px] font-mono text-slate-500">
                        A.N. PT KLOLA WARUNG TEKNOLOGI NUSANTARA (Nominal Pas Sesuai Ringkasan)
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] font-black px-2 py-0.5 bg-indigo-100 text-indigo-800 border border-indigo-300 rounded self-start sm:self-center">
                    MANUAL TRANSFER
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {BANK_ACCOUNTS.map((acc) => (
                    <div
                      key={acc.bank}
                      className="p-4 bg-white border-2 border-slate-800 rounded-xl space-y-2 shadow-[2px_2px_0px_#1E293B]"
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
                      <div className="font-mono text-lg font-black text-slate-900 tracking-wider">{acc.number}</div>
                      <div className="text-[10px] text-slate-500 font-mono uppercase">A.N. {acc.holder}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ringkasan & Form Unggah Bukti Bayar Instan */}
        <div ref={uploadFormRef} className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6 border-t-2 border-slate-200 scroll-mt-6">
          {/* Kolom Kiri: Rincian Total Bayar */}
          <div className="lg:col-span-5 p-5 bg-slate-50 border-2 border-slate-800 rounded-2xl space-y-4 shadow-[3px_3px_0px_#1E293B] h-fit">
            <div className="flex items-center justify-between border-b-2 border-slate-200 pb-2">
              <span className="font-mono text-xs font-black text-slate-500 uppercase tracking-wider">
                RINGKASAN TOTAL TAGIHAN
              </span>
              <span className="font-mono text-[10px] font-black px-2 py-0.5 bg-slate-900 text-white rounded">
                {purchaseMode === 'PURE_ADDON' ? 'MODE ADD-ON' : 'MODE PAKET'}
              </span>
            </div>

            <div className="space-y-2 font-mono text-xs">
              {purchaseMode === 'PURE_ADDON' ? (
                <>
                  <div className="flex justify-between text-slate-700">
                    <span>Jenis Transaksi:</span>
                    <span className="font-bold text-slate-900">Add-on Kapasitas Murni</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Siklus Prorasi:</span>
                    <span className="font-bold text-sky-700">
                      {addonCalc?.sisaHari ?? daysRemaining} Hari (Co-Termination)
                    </span>
                  </div>
                  {addonBranches > 0 && (
                    <div className="flex justify-between text-slate-700">
                      <span>Extra Cabang (+{addonBranches} Slot):</span>
                      <span className="font-bold text-slate-900">
                        Rp {(addonCalc?.totalBranchCost || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}
                  {addonCashiers > 0 && (
                    <div className="flex justify-between text-slate-700">
                      <span>Extra Kasir (+{addonCashiers} Slot):</span>
                      <span className="font-bold text-slate-900">
                        Rp {(addonCalc?.totalCashierCost || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}
                  {addonBranches === 0 && addonCashiers === 0 && (
                    <div className="text-amber-700 font-bold text-[11px] bg-amber-50 p-2 rounded-lg border border-amber-300">
                      ⚠️ Pilih minimal 1 slot cabang atau kasir pada kartu Add-on di atas.
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex justify-between text-slate-700">
                    <span>Paket Pilihan:</span>
                    <span className="font-bold text-slate-900">{currentCatalogPlan.name}</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Durasi:</span>
                    <span className="font-bold text-slate-900">{durationMonths} Bulan</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Harga Paket:</span>
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

                  {addonBranches > 0 && (
                    <div className="flex justify-between text-indigo-700 font-bold pt-1 border-t border-dashed border-slate-200">
                      <span>Tambahan {addonBranches} Cabang:</span>
                      <span>+ Rp {addonBranchCostFull.toLocaleString('id-ID')}</span>
                    </div>
                  )}

                  {addonCashiers > 0 && (
                    <div className="flex justify-between text-indigo-700 font-bold">
                      <span>Tambahan {addonCashiers} Kasir:</span>
                      <span>+ Rp {addonCashierCostFull.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="pt-3 border-t-2 border-slate-200 flex items-baseline justify-between">
              <span className="font-mono text-xs font-black text-slate-500 uppercase">
                {purchaseMode === 'PURE_ADDON' ? 'TOTAL DIBAYAR:' : 'TOTAL TRANSFER KONSOLIDASI:'}
              </span>
              <div className="text-right">
                <span className="text-2xl sm:text-3xl font-display font-black text-slate-900">
                  Rp {grandTotalPayable.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <div className="pt-2 text-[11px] font-mono text-slate-500">
              {paymentMethod === 'qris'
                ? 'Silakan scan QRIS di atas dengan nominal persis seperti di ringkasan ini.'
                : 'Silakan transfer nominal pas di atas ke salah satu rekening resmi tertera.'}
            </div>
          </div>

          {/* Kolom Kanan: Form Unggah Bukti Bayar Instan */}
          <div className="lg:col-span-7 p-6 bg-slate-50 border-2 border-slate-800 rounded-2xl space-y-6 shadow-[3px_3px_0px_#1E293B]">
            <div className="flex items-center gap-3 border-b-2 border-slate-200 pb-3">
              <div className="p-2 bg-slate-900 text-[#CCFF00] border-2 border-slate-900 rounded-xl shadow-[2px_2px_0px_#1E293B]">
                <UploadCloud size={18} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-sm font-display font-black uppercase text-slate-900 tracking-wide">
                  UNGGAH BUKTI BAYAR &amp; AKTIFKAN SEGERA
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
                    METODE / BANK PENGIRIM
                  </label>
                  <select
                    value={senderBank}
                    onChange={(e) => setSenderBank(e.target.value)}
                    className="w-full bg-white border-2 border-slate-800 focus:border-slate-950 focus:ring-2 focus:ring-[#CCFF00] rounded-xl px-3 py-2 font-mono text-xs text-slate-900 outline-none cursor-pointer shadow-[2px_2px_0px_#1E293B]"
                  >
                    <option value="QRIS">QRIS / E-Wallet (GoPay/OVO/ShopeePay/Dana)</option>
                    <option value="BNI">BNI (Bank Negara Indonesia)</option>
                    <option value="BSI">BSI (Bank Syariah Indonesia)</option>
                    <option value="BCA">BCA (Bank Central Asia)</option>
                    <option value="MANDIRI">Bank Mandiri</option>
                    <option value="BRI">BRI (Bank Rakyat Indonesia)</option>
                    <option value="LAINNYA">Bank / Saluran Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1.5">
                    NAMA PEMILIK REKENING / E-WALLET (OPSIONAL)
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
                      Klik di sini atau seret foto bukti pembayaran ke kotak ini
                    </div>
                    <p className="text-[11px] font-mono text-slate-500">
                      Mendukung tangkapan layar e-wallet/QRIS, m-banking (BNI, BSI, BCA, Mandiri, BRI) &amp; struk ATM
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
                  disabled={
                    isSubmittingClaim ||
                    !proofFile ||
                    (purchaseMode === 'PURE_ADDON' && addonBranches === 0 && addonCashiers === 0)
                  }
                  className="btn-arcade w-full sm:w-auto px-8 py-3.5 bg-[#CCFF00] hover:bg-[#b8e600] text-slate-950 font-mono text-sm font-black rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_#1E293B] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                  {isSubmittingClaim ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" strokeWidth={2.5} />
                      <span>
                        {purchaseMode === 'PURE_ADDON'
                          ? 'MENGUNGGAH & MENGAKTIFKAN ADD-ON...'
                          : 'MENGUNGGAH & MENGAKTIFKAN LISENSI...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Zap size={16} strokeWidth={2.5} />
                      <span>
                        {purchaseMode === 'PURE_ADDON'
                          ? '[ 🚀 SAYA SUDAH BAYAR — AKTIFKAN SLOT ADD-ON SEKARANG ]'
                          : '[ 🚀 SAYA SUDAH BAYAR — AKTIFKAN LISENSI SEKARANG ]'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
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
