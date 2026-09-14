"use client";
export const dynamic = 'force-dynamic';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldAlert, ShieldCheck, Eye, EyeOff, Loader2, Lock, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';

  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < 6) {
      setErrorMsg('Kata sandi minimal 6 karakter.');
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErrorMsg('Email atau kata sandi salah. Silakan periksa kembali.');
      setLoading(false);
      return;
    }

    setIsSuccess(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('hl_active_session', 'true');
    }
    const redirectTo = searchParams.get('redirectTo');

    let targetUrl = redirectTo;
    if (!targetUrl) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authData?.user?.id)
          .single();
        if (profile?.role === 'SUPERADMIN' || profile?.role === 'ADMIN') {
          targetUrl = '/admin/dashboard';
        } else if (profile?.role === 'CASHIER') {
          targetUrl = '/pos';
        } else {
          targetUrl = '/dashboard';
        }
      } catch {
        targetUrl = '/dashboard';
      }
    }

    setTimeout(() => router.push(targetUrl), 1000);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!shopName.trim()) {
      setErrorMsg('Nama toko wajib diisi.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Kata sandi pendaftaran minimal 6 karakter.');
      return;
    }

    setLoading(true);

    const formattedShopName = shopName.trim();
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          shop_name: formattedShopName,
          username: email.split('@')[0],
        },
      },
    });

    if (error) {
      setErrorMsg(error.message || 'Pendaftaran gagal. Coba email lain.');
      setLoading(false);
      return;
    }

    setLoading(false);
    setSuccessMsg(
      'Pendaftaran berhasil! Toko Anda otomatis terdaftar sebagai Cabang 1. Silakan cek email Anda untuk konfirmasi, lalu masuk.'
    );
    setTimeout(() => {
      setMode('login');
      setSuccessMsg('');
    }, 3500);
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined,
        },
      });
      if (error) throw error;
    } catch (err) {
      setErrorMsg(err.message || 'Gagal masuk dengan Google.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row w-full font-sans bg-canvas text-ink relative z-10 selection:bg-[#CCFF00] selection:text-slate-900">
      {/* Success Loading Screen */}
      {isSuccess && (
        <div className="fixed inset-0 z-[10000] bg-white/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 animate-fade-in">
          <div className="bg-white border-2 border-slate-800 shadow-[8px_8px_0px_#1E293B] p-8 sm:p-12 rounded-2xl flex flex-col items-center space-y-6 text-center max-w-md w-full">
            <div className="w-16 h-16 rounded-2xl bg-[#CCFF00] border-2 border-slate-800 flex items-center justify-center shadow-[3px_3px_0px_#1E293B]">
              <ShieldCheck className="w-9 h-9 text-slate-900" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black font-display uppercase text-slate-900">
                OTORISASI DITERIMA
              </h2>
              <p className="text-slate-600 font-mono text-xs mt-2 uppercase tracking-wider">
                Membuka Dashboard Finansial...
              </p>
            </div>
            <Loader2 className="w-8 h-8 text-slate-900 animate-spin" />
          </div>
        </div>
      )}

      {/* LEFT PANEL: The Glass Contract Room (Zona Atmosfer) */}
      <div className="w-full lg:w-1/2 bg-white/40 lg:bg-white/50 backdrop-blur-xl border-b lg:border-b-0 lg:border-r border-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] flex flex-col justify-between p-6 sm:p-10 lg:p-16 relative overflow-hidden">
        {/* Subtle Purple & Orange Ambient Tint */}
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-purple-500/15 blur-[90px] pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-orange-500/15 blur-[90px] pointer-events-none" />

        {/* Top Header Logo */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-slate-900 text-[#CCFF00] font-black text-sm w-8 h-8 rounded-lg flex items-center justify-center border-2 border-slate-900 shadow-[2px_2px_0px_#1E293B]">
              2M
            </div>
            <div>
              <span className="text-xl font-black font-display tracking-tight text-slate-900 block leading-none">
                2ndManager
              </span>
              <span className="text-[9px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                AUTOPILOT OS
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold uppercase bg-slate-900 text-[#CCFF00] px-2.5 py-1 rounded-md border border-slate-900">
            KONTRAK RESMI
          </span>
        </div>

        {/* Comic Speech Bubble (Artistic Personality) */}
        <div className="my-6 lg:my-auto relative z-10 max-w-lg">
          <div className="relative bg-white/90 backdrop-blur-2xl border-2 border-slate-800 shadow-[6px_6px_0px_#1E293B] rounded-3xl rounded-br-sm p-6 sm:p-8 lg:p-10 transform lg:-rotate-1 hover:rotate-0 transition-transform duration-200">
            <div className="flex items-center gap-2 mb-3 text-xs font-mono font-bold text-amber-600 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>RADAR AUDIT KASIR</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-display text-slate-900 leading-tight">
              &ldquo;7 dari 10 warung bangkrut karena kasir curang.&rdquo;
            </h1>

            <p className="mt-4 text-sm sm:text-base text-slate-700 leading-relaxed font-sans">
              Bukan karena sepi pembeli, melainkan karena transaksi yang dibatalkan sembunyi-sembunyi dan kasbon tanpa audit sistematis.
            </p>

            <div className="mt-6 pt-4 border-t-2 border-slate-200/80 flex items-center justify-between text-xs font-mono text-slate-600">
              <span className="font-bold text-slate-900 uppercase">— AUDIT FINANSIAL 2026</span>
              <span className="bg-[#CCFF00] text-slate-900 px-2 py-0.5 font-bold border border-slate-800 rounded">
                100% TRANSPARAN
              </span>
            </div>
          </div>
        </div>

        {/* Footer Guarantee on Desktop */}
        <div className="relative z-10 hidden lg:flex items-center justify-between text-xs font-mono text-slate-600 pt-4 border-t border-white/60">
          <span>Garansi Uang Kembali 100%</span>
          <span className="font-bold text-slate-900">ZERO FATIGUE POS</span>
        </div>
      </div>

      {/* RIGHT PANEL: The Solid Form Room (Zona Mesin) */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-4 py-8 sm:px-10 lg:px-14 xl:px-20 bg-canvas relative z-10">
        <div className="max-w-md w-full mx-auto space-y-6">
          {/* Card Container for Clear Contrast */}
          <div className="bg-white border-2 border-slate-800 shadow-[6px_6px_0px_#1E293B] rounded-2xl p-6 sm:p-8 space-y-6">
            <div>
              <div className="inline-block bg-slate-100 text-slate-800 text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border border-slate-300 mb-2">
                {mode === 'register' ? 'PENDAFTARAN KLIEN BARU' : 'OTORISASI OPERATOR'}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black font-display uppercase tracking-tight text-slate-900">
                {mode === 'register' ? 'Tanda Tangani Kontrak' : 'Buka Command Center'}
              </h2>
              <p className="text-xs sm:text-sm font-sans text-slate-600 mt-1">
                {mode === 'register'
                  ? 'Daftarkan warung Anda ke sistem manajemen autopilot.'
                  : 'Masukkan kredensial pemilik untuk memantau transaksi.'}
              </p>
            </div>

            {/* Error Message Alert */}
            {errorMsg && (
              <div className="bg-rose-50 border-2 border-rose-500 rounded-xl p-3.5 text-rose-900 font-mono text-xs flex items-start gap-2.5 animate-shake">
                <ShieldAlert className="shrink-0 text-rose-600 mt-0.5" size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success Message Alert */}
            {successMsg && (
              <div className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-3.5 text-emerald-900 font-mono text-xs flex items-start gap-2.5">
                <ShieldCheck className="shrink-0 text-emerald-600 mt-0.5" size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Google OAuth Button: Asymmetric Pop-Art Shape */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || isSuccess}
              className="btn-arcade w-full bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B] font-bold text-xs uppercase h-13 rounded-tl-2xl rounded-br-2xl rounded-tr-md rounded-bl-md flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 transition-all font-mono"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>MASUK DENGAN GOOGLE</span>
            </button>

            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-[1.5px] bg-slate-200" />
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                ATAU DENGAN EMAIL
              </span>
              <div className="flex-1 h-[1.5px] bg-slate-200" />
            </div>

            {/* Email/Password Form (Zona Mesin) */}
            <form onSubmit={mode === 'login' ? handleLogin : handleSignUp} className="space-y-4">
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                      Nama Toko / Warung
                    </label>
                    <span className="text-[10px] font-mono font-bold text-slate-900 bg-[#CCFF00] px-2 py-0.5 border border-slate-800 rounded">
                      Cabang 1
                    </span>
                  </div>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="Contoh: Toko Berkah Jaya"
                    className="w-full bg-slate-50 focus:bg-white border-2 border-slate-800 rounded-xl p-3.5 font-sans text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#CCFF00] transition-colors h-14"
                    required
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                  Email Pemilik
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@gmail.com"
                  className="w-full bg-slate-50 focus:bg-white border-2 border-slate-800 rounded-xl p-3.5 font-sans text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#CCFF00] transition-colors h-14"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                    Kata Sandi
                  </label>
                  {mode === 'login' && (
                    <span className="text-[11px] font-mono text-slate-500 hover:text-slate-900 cursor-pointer">
                      Lupa sandi?
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'register' ? 'Minimal 6 karakter' : 'Masukkan kata sandi'}
                    className="w-full bg-slate-50 focus:bg-white border-2 border-slate-800 rounded-xl p-3.5 pr-12 font-sans text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#CCFF00] transition-colors h-14"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 cursor-pointer p-1"
                    aria-label={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Main Submit Button: Mechanical Arcade Feedback */}
              <button
                type="submit"
                disabled={loading || isSuccess}
                className="btn-arcade w-full bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 border-2 border-slate-800 shadow-[4px_4px_0_#1E293B] font-extrabold text-sm uppercase h-14 rounded-xl mt-4 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-mono tracking-wider"
              >
                {loading || isSuccess ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> MEMPROSES...
                  </>
                ) : mode === 'register' ? (
                  <>
                    AKTIFKAN SISTEM AUTOPILOT <ArrowRight size={16} />
                  </>
                ) : (
                  <>
                    VERIFIKASI &amp; MASUK <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Instant Mode Toggle (No reload) */}
            <div className="pt-2 text-center border-t border-slate-200">
              {mode === 'register' ? (
                <p className="text-xs font-sans text-slate-600">
                  Sudah memiliki akun toko?{' '}
                  <button
                    onClick={() => {
                      setMode('login');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    type="button"
                    className="font-mono font-bold text-slate-900 underline hover:no-underline cursor-pointer ml-1"
                  >
                    Masuk Sekarang
                  </button>
                </p>
              ) : (
                <p className="text-xs font-sans text-slate-600">
                  Belum terdaftar?{' '}
                  <button
                    onClick={() => {
                      setMode('register');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    type="button"
                    className="font-mono font-bold text-slate-900 underline hover:no-underline cursor-pointer ml-1"
                  >
                    Tandatangani Kontrak Baru
                  </button>
                </p>
              )}
            </div>
          </div>

          {/* Bottom Link to POS */}
          <div className="text-center">
            <p className="font-mono text-xs text-slate-500">
              Khusus Kasir Toko?{' '}
              <a href="/pos" className="font-bold text-slate-800 underline hover:text-black">
                Buka Terminal Mesin Kasir POS &rarr;
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-canvas text-ink font-mono text-xs">
          MEMUAT GERBANG AUTOPILOT...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

