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
  { bank: 'BCA', number: '8010-8899-22', holder: 'PT 2NDMANAGER TEKNOLOGI' },
  { bank: 'MANDIRI', number: '137-00-998877-1', holder: 'PT 2NDMANAGER TEKNOLOGI' },
  { bank: 'BRI', number: '0341-01-002233-50-9', holder: 'PT 2NDMANAGER TEKNOLOGI' },
  { bank: 'BSI', number: '7199-8822-01', holder: 'PT 2NDMANAGER TEKNOLOGI' },
];

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [subStatus, setSubStatus] = useState(null);
  const [selectedCatalog, setSelectedCatalog] = useState('MANAJER');

  // 4x4 Segmented Input State
  const [segments, setSegments] = useState(['2NDM', '', '', '']);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState('');
  const [redeemSuccess, setRedeemSuccess] = useState(null);

  // Copy feedback state
  const [copiedKey, setCopiedKey] = useState('');

  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

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
        is_in_grace: false,
        is_expired: false,
        days_remaining: 0,
        active_branches_allowed: 1,
        organization_name: 'Warung Saya',
        history: [],
      });
    } catch (err) {
      console.warn('[Billing Status Fetch Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  // Segmented input change handler
  const handleSegmentChange = (index, value) => {
    setRedeemError('');
    setRedeemSuccess(null);

    const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    const newSegs = [...segments];
    newSegs[index] = clean;
    setSegments(newSegs);

    // Auto advance saat 4 karakter terisi
    if (clean.length === 4 && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !segments[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  // Smart Paste Handler: paste 16-19 chars into any block
  const handlePaste = (e) => {
    e.preventDefault();
    setRedeemError('');
    setRedeemSuccess(null);

    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;

    // Bersihkan dash, spasi, dan karakter non-alphanumeric
    const clean = pasted.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (clean.length >= 16) {
      const seg0 = clean.slice(0, 4);
      const seg1 = clean.slice(4, 8);
      const seg2 = clean.slice(8, 12);
      const seg3 = clean.slice(12, 16);
      setSegments([seg0, seg1, seg2, seg3]);
      inputRefs[3].current?.focus();
    } else if (clean.length > 0) {
      // Paste sebagian
      const newSegs = [...segments];
      newSegs[0] = clean.slice(0, 4);
      if (clean.length > 4) newSegs[1] = clean.slice(4, 8);
      if (clean.length > 8) newSegs[2] = clean.slice(8, 12);
      if (clean.length > 12) newSegs[3] = clean.slice(12, 16);
      setSegments(newSegs);
    }
  };

  // Submit Activation
  const handleRedeem = async (e) => {
    e?.preventDefault();
    setRedeemError('');
    setRedeemSuccess(null);

    const fullCode = segments.join('-').toUpperCase();
    if (fullCode.length !== 19 || segments.some((s) => s.length !== 4)) {
      setRedeemError('Harap lengkapi seluruh 4 kotak kode voucher lisensi (16 karakter).');
      return;
    }

    try {
      setIsRedeeming(true);
      const res = await fetch('/api/v1/billing/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenCode: fullCode }),
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

  const waMessage = encodeURIComponent(
    `Halo Admin 2ndManager, saya ingin konfirmasi pembayaran lisensi:\n\n` +
      `*Nama Usaha:* ${subStatus?.organization_name || 'Toko 2ndManager'}\n` +
      `*Paket:* ${currentCatalogPlan.name} (${currentCatalogPlan.priceLabel})\n` +
      `*Metode:* Transfer Bank / QRIS Statis\n\n` +
      `Mohon kirimkan kode voucher aktivasi 16-digit setelah dana terverifikasi. Terima kasih!`
  );

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 p-4 sm:p-6 lg:p-8 font-sans pb-32">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-1.5 bg-[#0B0F17] hover:bg-slate-800 text-slate-300 hover:text-white font-mono text-xs font-bold border-2 border-slate-700 shadow-[2px_2px_0px_#1E293B] transition-all"
            >
              <ArrowLeft size={14} strokeWidth={2.5} />
              <span>DASHBOARD</span>
            </Link>
            <div className="h-4 w-px bg-slate-700" />
            <span className="font-mono text-xs font-bold text-slate-400 uppercase tracking-wider">
              PORTAL LISENSI & PEMBAYARAN MANDIRI
            </span>
          </div>
          <button
            onClick={fetchSubscriptionStatus}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#0B0F17] hover:bg-slate-900 text-slate-400 hover:text-[#CCFF00] font-mono text-xs font-bold border-2 border-slate-800 transition-all cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} strokeWidth={2.5} />
            <span>SINKRONKAN STATUS</span>
          </button>
        </div>

        {/* Arcade Brutalist Master Banner */}
        <div className="relative bg-[#0B0F17] border-3 border-[#F59E0B] p-6 lg:p-8 shadow-[6px_6px_0px_#B45309] overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-48 h-48 bg-[#F59E0B]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-950/80 border border-amber-500/60 text-amber-300 font-mono text-xs font-black uppercase tracking-widest">
                <Sparkles size={13} className="text-[#F59E0B]" strokeWidth={2.5} />
                MONETISASI MANDIRI RESILIEN
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white uppercase font-mono">
                PUSAT LISENSI & KONTRAK AKTIF
              </h1>
              <p className="text-sm sm:text-base text-slate-400 max-w-2xl">
                Aktivasi instan via kode voucher kriptografis 16-digit. Tanpa ketergantungan payment gateway,
                ramah operator muda, dan tahan pemadaman jaringan offline.
              </p>
            </div>

            {/* Speedometer Status Card */}
            <div className="w-full lg:w-auto bg-[#07090E] border-2 border-slate-700 p-5 shadow-[4px_4px_0px_#0F172A] min-w-[280px]">
              <div className="text-xs font-mono font-bold text-slate-500 uppercase">STATUS LANGGANAN ANDA</div>
              <div className="mt-2 flex items-center gap-3">
                <div
                  className={`px-3 py-1 font-mono text-sm font-black border-2 ${
                    currentTier === 'EKSEKUTIF'
                      ? 'bg-lime-950 text-[#CCFF00] border-lime-500 shadow-[2px_2px_0px_#65A30D]'
                      : currentTier === 'MANAJER'
                      ? 'bg-amber-950 text-amber-300 border-amber-500 shadow-[2px_2px_0px_#D97706]'
                      : currentTier === 'SUPERVISOR'
                      ? 'bg-sky-950 text-sky-300 border-sky-500 shadow-[2px_2px_0px_#0284C7]'
                      : 'bg-slate-900 text-slate-300 border-slate-700'
                  }`}
                >
                  [ 🏆 TIER {currentTier} ]
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 space-y-1 font-mono text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Masa Aktif:</span>
                  <span className="font-bold text-white">
                    {isExpired ? 'Kedaluwarsa' : `Sisa ${daysRemaining} Hari`}
                  </span>
                </div>
                {subStatus?.expires_at && (
                  <div className="flex justify-between text-slate-500">
                    <span>Berlaku Hingga:</span>
                    <span>{new Date(subStatus.expires_at).toLocaleDateString('id-ID')}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>Cabang Aktif:</span>
                  <span className="font-bold text-[#CCFF00]">
                    Maks {subStatus?.active_branches_allowed || 1} Cabang
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Grace Period Warning Banner */}
          {isInGrace && (
            <div className="mt-6 p-4 bg-amber-950/90 border-2 border-amber-500 text-amber-200 font-mono text-xs sm:text-sm font-bold flex items-center gap-3 animate-pulse shadow-[4px_4px_0px_#B45309]">
              <AlertTriangle size={20} className="text-amber-400 shrink-0" strokeWidth={2.5} />
              <div>
                <span>[ ⚠️ PERINGATAN: MASA TENGGANG AKTIF - SEGERA AKTIFKAN VOUCHER ]</span>
                <p className="font-sans font-normal text-amber-300 text-xs mt-0.5">
                  Langganan Anda telah melewati batas waktu normal. Segera lakukan perpanjangan sebelum fitur
                  multi-cabang dan radar dibekukan otomatis ke tier Magang (H+3).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 4x4 Segmented Voucher Activation Box */}
        <div className="bg-[#0B0F17] border-3 border-slate-700 p-6 lg:p-8 shadow-[6px_6px_0px_#1E293B] space-y-6">
          <div className="flex items-center gap-3 border-b-2 border-slate-800 pb-4">
            <div className="p-2 bg-amber-500/10 border-2 border-amber-500/40 text-[#F59E0B]">
              <Key size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-mono font-black uppercase text-white tracking-wide">
                AKTIVASI VOUCHER LISENSI 16-DIGIT
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Masukkan kode voucher fisik / digital bertanda tangan HMAC yang Anda peroleh dari admin atau mitra.
              </p>
            </div>
          </div>

          {redeemSuccess && (
            <div className="p-4 bg-lime-950/80 border-2 border-lime-500 text-lime-200 font-mono text-sm flex items-start gap-3 shadow-[4px_4px_0px_#4D7C0F]">
              <CheckCircle2 size={20} className="text-[#CCFF00] shrink-0 mt-0.5" strokeWidth={2.5} />
              <div>
                <span className="font-black text-[#CCFF00]">
                  [ ⚡ AKTIVASI BERHASIL: TIER {redeemSuccess.tier} AKTIF ]
                </span>
                <p className="font-sans text-xs text-lime-300 mt-1">
                  {redeemSuccess.message || 'Masa aktif langganan Anda berhasil diperpanjang.'}
                </p>
              </div>
            </div>
          )}

          {redeemError && (
            <div className="p-4 bg-red-950/80 border-2 border-red-500 text-red-200 font-mono text-sm flex items-start gap-3 shadow-[4px_4px_0px_#991B1B]">
              <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" strokeWidth={2.5} />
              <div>
                <span className="font-black text-red-400">[ ❌ GAGAL AKTIVASI ]</span>
                <p className="font-sans text-xs text-red-300 mt-1">{redeemError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleRedeem} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                KODE VOUCHER (4 KOTAK MONOSPACE - AUTO ADVANCE & PASTE READY)
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
                      className="w-20 sm:w-28 h-14 bg-[#07090E] border-2 border-slate-600 focus:border-[#CCFF00] focus:ring-2 focus:ring-[#CCFF00]/20 text-center font-mono text-xl sm:text-2xl font-black text-[#CCFF00] tracking-widest uppercase outline-none shadow-[3px_3px_0px_#0F172A] transition-all"
                    />
                    {idx < 3 && <span className="font-mono text-2xl font-black text-slate-600">-</span>}
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
              className="px-6 py-3.5 bg-[#CCFF00] hover:bg-[#b8e600] active:translate-x-[2px] active:translate-y-[2px] text-slate-950 font-mono text-sm font-black border-2 border-black shadow-[4px_4px_0px_#000000] flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase"
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
            <h2 className="text-xl sm:text-2xl font-mono font-black uppercase text-white tracking-wide">
              KATALOG PAKET LANGGANAN RESMI
            </h2>
            <span className="font-mono text-xs text-slate-400">PILIH SESUAI KEBUTUHAN SKALA USAHA</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CATALOG_PLANS.map((plan) => {
              const isSelected = selectedCatalog === plan.key;
              const isCurrent = currentTier === plan.key;

              return (
                <div
                  key={plan.key}
                  onClick={() => setSelectedCatalog(plan.key)}
                  className={`cursor-pointer transition-all border-3 p-6 flex flex-col justify-between relative ${
                    isSelected
                      ? 'bg-[#0E1524] shadow-[6px_6px_0px_#38BDF8]'
                      : 'bg-[#0B0F17] hover:bg-[#0E121C] shadow-[4px_4px_0px_#1E293B]'
                  }`}
                  style={{ borderColor: isSelected ? plan.borderCol : '#334155' }}
                >
                  {plan.isPopular && (
                    <div className="absolute -top-3 right-4 px-3 py-0.5 bg-[#F59E0B] text-black font-mono text-[10px] font-black uppercase border border-black shadow-[2px_2px_0px_#000]">
                      PALING BANYAK DIGUNAKAN
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black px-2.5 py-1 bg-slate-900 border border-slate-700 text-slate-300">
                        {plan.badge}
                      </span>
                      {isCurrent && (
                        <span className="font-mono text-xs font-black text-[#CCFF00] flex items-center gap-1">
                          <CheckCircle2 size={13} strokeWidth={2.5} /> PAKET AKTIF
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-xl font-mono font-black text-white">{plan.name}</h3>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-2xl sm:text-3xl font-mono font-black text-[#CCFF00]">
                          {plan.priceLabel}
                        </span>
                        <span className="text-xs font-mono text-slate-400">{plan.period}</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-800 pt-4 space-y-2">
                      {plan.features.map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-start gap-2 text-xs text-slate-300">
                          <Check size={14} className="text-[#CCFF00] shrink-0 mt-0.5" strokeWidth={2.5} />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800">
                    <button
                      type="button"
                      className={`w-full py-2.5 font-mono text-xs font-bold border-2 transition-all ${
                        isSelected
                          ? 'bg-[#CCFF00] text-black border-black shadow-[3px_3px_0px_#000]'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {isSelected ? '[ PILIHAN TERPILIH ]' : 'PILIH PAKET INI'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Frictionless Grassroots Payment Portal */}
        <div className="bg-[#0B0F17] border-3 border-slate-700 p-6 lg:p-8 shadow-[6px_6px_0px_#1E293B] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-800 pb-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-sky-950 border border-sky-500/60 text-sky-300 font-mono text-[11px] font-black uppercase mb-1">
                <Receipt size={13} strokeWidth={2.5} /> PEER-TO-PEER PAYMENT GATE
              </div>
              <h2 className="text-lg sm:text-xl font-mono font-black uppercase text-white tracking-wide">
                PORTAL PEMBAYARAN MANUAL (TRANSFER & QRIS STATIS)
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Pilihan paket terpilih: <span className="font-bold text-white">{currentCatalogPlan.name}</span> (
                <span className="font-bold text-[#CCFF00]">{currentCatalogPlan.priceLabel}</span>)
              </p>
            </div>

            <a
              href={`https://wa.me/6281234567890?text=${waMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-black font-mono text-xs font-black border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
            >
              <MessageSquare size={16} strokeWidth={2.5} />
              <span>[ 💬 KONFIRMASI PEMBAYARAN VIA WHATSAPP ]</span>
            </a>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Rekening Transfer Bank */}
            <div className="lg:col-span-2 space-y-3">
              <span className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                REKENING TRANSFER RESMI
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {BANK_ACCOUNTS.map((acc) => (
                  <div
                    key={acc.bank}
                    className="p-4 bg-[#07090E] border-2 border-slate-700 space-y-2 relative shadow-[2px_2px_0px_#0F172A]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black text-amber-400">{acc.bank}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(acc.number.replace(/-/g, ''), acc.bank)}
                        className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        {copiedKey === acc.bank ? (
                          <>
                            <Check size={12} className="text-[#CCFF00]" strokeWidth={2.5} />
                            <span className="text-[#CCFF00]">TERSALIN</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} strokeWidth={2.5} />
                            <span>SALIN</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="font-mono text-base font-black text-white tracking-wider">{acc.number}</div>
                    <div className="text-[11px] text-slate-500 font-mono uppercase">A.N. {acc.holder}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* QRIS Statis Visual Placeholder */}
            <div className="p-4 bg-[#07090E] border-2 border-slate-700 flex flex-col items-center justify-center text-center space-y-3 shadow-[2px_2px_0px_#0F172A]">
              <div className="p-3 bg-white border-2 border-black inline-block">
                <QrCode size={96} className="text-black" strokeWidth={2} />
              </div>
              <div>
                <div className="font-mono text-xs font-black text-white uppercase">QRIS STANDAR INDONESIA</div>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5">NMID: ID1020304050607</div>
              </div>
              <p className="text-[10px] text-slate-500 max-w-[220px]">
                Dapat dipindai oleh seluruh e-wallet (GoPay, OVO, Dana, ShopeePay) dan m-Banking.
              </p>
            </div>
          </div>
        </div>

        {/* Voucher Redemption History */}
        {subStatus?.history && subStatus.history.length > 0 && (
          <div className="bg-[#0B0F17] border-2 border-slate-800 p-6 space-y-4">
            <h3 className="text-sm font-mono font-black uppercase text-slate-300 tracking-wider">
              RIWAYAT VOUCHER YANG PERNAH DIAKTIFKAN
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-800 text-slate-500">
                    <th className="py-2 px-3">KODE VOUCHER</th>
                    <th className="py-2 px-3">TIER</th>
                    <th className="py-2 px-3">DURASI</th>
                    <th className="py-2 px-3">TANGGAL AKTIVASI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {subStatus.history.map((h) => (
                    <tr key={h.id || h.token_code} className="hover:bg-slate-900/40">
                      <td className="py-2.5 px-3 font-bold text-[#CCFF00]">{h.token_code}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 font-bold">
                          {h.tier_id}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{h.duration_days} Hari</td>
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
      </div>
    </div>
  );
}
