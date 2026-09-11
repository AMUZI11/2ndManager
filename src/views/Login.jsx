"use client";
import React, { useState } from 'react';
import { ShieldAlert, BookOpen, BarChart3, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { api } from '../utils/api';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg("Harap isi semua kolom login.");
      return;
    }

    setIsSubmitting(true);
    const res = await api.login(username.trim(), password.trim());
    setIsSubmitting(false);
    
    if (res.success) {
      onLoginSuccess(res.user);
    } else {
      setErrorMsg(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-kw-card flex items-center justify-center p-8 md:p-8 font-sans">
      <div className="w-full max-w-5xl bg-kw-bg rounded-[2.5rem] shadow-none overflow-hidden border-4 border-kw-border p-1.5">
        <div className="bg-kw-bg border-2 border-kw-border rounded-[calc(2.5rem-0.375rem)] p-8 md:p-12 min-h-[500px] grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 relative">
          
          {/* Sisi Kiri: Sampul/Halaman Info Buku Kas */}
          <div className="flex flex-col justify-between space-y-6 lg:border-r lg:border-kw-border lg:pr-12">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 bg-kw-card text-kw-text border-2 border-kw-border rounded-2xl flex items-center justify-center font-bold text-xl font-heading">
                KW
              </div>
              <div>
                <span className="text-xl font-black tracking-widest uppercase text-kw-text block">2ndManager</span>
                <span className="text-[10px] text-kw-text font-bold uppercase tracking-wider">Aplikasi Kasir & Pembukuan Warung</span>
              </div>
            </div>

            <div className="space-y-6 my-auto">
              <h1 className="text-2xl md:text-3xl leading-tight font-extrabold text-kw-text font-heading">
                Pencatatan Penjualan &amp; Piutang <span className="text-kw-accent">Akrab &amp; Terpercaya</span>.
              </h1>
              
              <div className="space-y-4">
                <div className="flex items-center gap-6.5">
                  <div className="w-10 h-10 bg-kw-card border-2 border-kw-border rounded-xl flex items-center justify-center text-kw-text flex-shrink-0">
                    <BookOpen size={18} />
                  </div>
                  <span className="text-lg font-bold text-kw-text">Catat Bon &amp; Tagihan Piutang Pelanggan</span>
                </div>
                <div className="flex items-center gap-6.5">
                  <div className="w-10 h-10 bg-kw-card border-2 border-kw-border rounded-xl flex items-center justify-center text-kw-text flex-shrink-0">
                    <BarChart3 size={18} />
                  </div>
                  <span className="text-lg font-bold text-kw-text">Rekap Kas Omzet &amp; Laba Bersih Otomatis</span>
                </div>
                <div className="flex items-center gap-6.5">
                  <div className="w-10 h-10 bg-kw-card border-2 border-kw-border rounded-xl flex items-center justify-center text-kw-text flex-shrink-0">
                    <ShieldCheck size={18} />
                  </div>
                  <span className="text-lg font-bold text-kw-text">Akses Pembukuan Pribadi &amp; Aman</span>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-kw-text font-bold uppercase tracking-wider">
              Aplikasi Internal • Rupiah (IDR)
            </div>
          </div>

          {/* Sisi Kanan: Form Masuk */}
          <div className="flex flex-col justify-center max-w-sm mx-auto w-full space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold tracking-tight text-kw-text font-heading">Bapak/Ibu, Silakan Masuk</h2>
              <p className="text-xl text-kw-text font-semibold">Masukkan Username dan Kata Sandi Anda di bawah ini.</p>
            </div>

            {errorMsg && (
              <div className="bg-rose-50 border border-kw-terra text-rose-800 p-8 rounded-2xl text-xl font-bold flex items-start gap-8 border-rose-light/50 animate-shake">
                <ShieldAlert className="flex-shrink-0" size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-kw-text uppercase tracking-wider">Nama Pengguna (Username)</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan nama pengguna"
                  className="w-full h-12 bg-kw-card border-2 border-kw-border rounded-xl px-4 text-lg focus:border-kw-border outline-none transition-all font-semibold text-kw-text"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-kw-text uppercase tracking-wider">Kata Sandi (Password)</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    className="w-full h-12 bg-kw-card border-2 border-kw-border rounded-xl pl-4 pr-12 text-lg focus:border-kw-border outline-none transition-all font-semibold text-kw-text"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-kw-text/70 hover:text-kw-text cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-kw-accent hover:bg-kw-accent-hover text-kw-text font-extrabold h-12 rounded-xl text-lg shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-8 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Memverifikasi...
                  </>
                ) : (
                  <>
                    <Lock size={16} /> Buka Pembukuan
                  </>
                )}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
