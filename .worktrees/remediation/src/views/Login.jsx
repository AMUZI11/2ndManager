"use client";
import React, { useState } from 'react';
import { ShieldAlert, BookOpen, BarChart3, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { api } from '../utils/api';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg("Harap isi semua kolom login.");
      return;
    }

    const res = await api.login(username.trim(), password.trim());
    if (res.success) {
      onLoginSuccess(res.user);
    } else {
      setErrorMsg(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#3D1A0F] flex items-center justify-center p-4 md:p-8 font-sans">
      <div className="w-full max-w-5xl bg-[#F6F3EA] rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-[#4E271B] p-1.5">
        <div className="bg-[#FAF7F0] border border-[#E8DCC8] rounded-[calc(2.5rem-0.375rem)] p-8 md:p-12 min-h-[500px] grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 relative">
          
          {/* Sisi Kiri: Sampul/Halaman Info Buku Kas */}
          <div className="flex flex-col justify-between space-y-6 lg:border-r lg:border-[#E8DCC8] lg:pr-12">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#3D1A0F] text-white border border-[#4E271B] rounded-2xl flex items-center justify-center font-bold text-xl font-heading">
                HL
              </div>
              <div>
                <span className="text-xs font-black tracking-widest uppercase text-[#3D1A0F] block">Sales & Receivables</span>
                <span className="text-[10px] text-[#6B4F3A] font-bold uppercase tracking-wider">Buku Kas Digital</span>
              </div>
            </div>

            <div className="space-y-6 my-auto">
              <h1 className="text-2xl md:text-3xl leading-tight font-extrabold text-[#3D1A0F] font-heading">
                Pencatatan Penjualan &amp; Piutang <span className="text-cta">Akrab &amp; Terpercaya</span>.
              </h1>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 bg-white border border-[#E8DCC8] rounded-xl flex items-center justify-center text-[#3D1A0F] flex-shrink-0">
                    <BookOpen size={18} />
                  </div>
                  <span className="text-sm font-bold text-[#6B4F3A]">Catat Bon &amp; Tagihan Piutang Pelanggan</span>
                </div>
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 bg-white border border-[#E8DCC8] rounded-xl flex items-center justify-center text-[#3D1A0F] flex-shrink-0">
                    <BarChart3 size={18} />
                  </div>
                  <span className="text-sm font-bold text-[#6B4F3A]">Rekap Kas Omzet &amp; Laba Bersih Otomatis</span>
                </div>
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 bg-white border border-[#E8DCC8] rounded-xl flex items-center justify-center text-[#3D1A0F] flex-shrink-0">
                    <ShieldCheck size={18} />
                  </div>
                  <span className="text-sm font-bold text-[#6B4F3A]">Akses Pembukuan Pribadi &amp; Aman</span>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-[#6B4F3A]/70 font-bold uppercase tracking-wider">
              Aplikasi Internal • Rupiah (IDR)
            </div>
          </div>

          {/* Sisi Kanan: Form Masuk */}
          <div className="flex flex-col justify-center max-w-sm mx-auto w-full space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold tracking-tight text-[#3D1A0F] font-heading">Bapak/Ibu, Silakan Masuk</h2>
              <p className="text-xs text-[#6B4F3A] font-semibold">Masukkan Username dan Kata Sandi Anda di bawah ini.</p>
            </div>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-100 text-rose-800 p-4 rounded-2xl text-xs font-bold flex items-start gap-2 border-rose-light/50 animate-shake">
                <ShieldAlert className="flex-shrink-0" size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-[#6B4F3A] uppercase tracking-wider">Nama Pengguna (Username)</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan nama pengguna"
                  className="w-full h-12 bg-white border border-[#E8DCC8] rounded-xl px-4 text-sm focus:border-[#C97B1A] outline-none transition-all font-semibold text-[#1C1009]"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-[#6B4F3A] uppercase tracking-wider">Kata Sandi (Password)</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    className="w-full h-12 bg-white border border-[#E8DCC8] rounded-xl pl-4 pr-12 text-sm focus:border-[#C97B1A] outline-none transition-all font-semibold text-[#1C1009]"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-[#C97B1A] hover:bg-[#A85F10] text-white font-extrabold h-12 rounded-xl text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock size={16} /> Buka Pembukuan
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
