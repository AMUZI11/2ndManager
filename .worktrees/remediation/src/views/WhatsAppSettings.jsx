"use client";
import React, { useState, useEffect } from 'react';
import { MessageCircle, Save, Lock, Smartphone, CheckCircle, BellRing, Users } from 'lucide-react';
import { api } from '../utils/api';
import Link from 'next/link';

export default function WhatsAppSettings() {
  const [session, setSession] = useState(null);
  const [waNumber, setWaNumber] = useState('');
  const [dailyDigest, setDailyDigest] = useState(false);
  const [arRecovery, setArRecovery] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const currentSession = api.getCurrentSession();
    setSession(currentSession);
    
    // Simulate loading preferences if user is PRO
    // In a real app, you would fetch these from the backend
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  }, []);

  const tier = session?.user_metadata?.subscription_tier || session?.app_metadata?.subscription_tier || 'FREE';
  const isPro = tier.toUpperCase() === 'PRO';

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cta"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-gold to-amber-deep text-white rounded-3xl p-6 md:p-8 shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-2 max-w-xl">
          <h1 className="text-display text-white text-2xl md:text-3xl flex items-center gap-2">
            <MessageCircle size={28} />
            Integrasi WhatsApp
          </h1>
          <p className="text-white/95 text-sm md:text-base">
            Otomatisasi pengingat piutang pelanggan dan terima laporan ringkasan harian langsung ke WhatsApp Anda.
          </p>
        </div>
      </div>

      {!isPro ? (
        /* PAYWALL UI (Hormozi Decoy) */
        <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm p-6 overflow-hidden">
          
          {/* Blurred Background Mockup */}
          <div className="filter blur-sm opacity-50 select-none pointer-events-none">
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-charcoal-black">Nomor WhatsApp Tujuan</h3>
                <input 
                  type="text" 
                  disabled
                  value="0812-XXXX-XXXX"
                  className="w-full md:w-1/2 bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm"
                />
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <h4 className="font-bold text-sm text-charcoal-black flex items-center gap-2"><BellRing size={16}/> Daily Digest (Laporan Harian)</h4>
                    <p className="text-xs text-gray-500 mt-1">Kirim ringkasan omzet dan laba setiap jam 21:00</p>
                  </div>
                  <div className="w-12 h-6 bg-gray-300 rounded-full"></div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <h4 className="font-bold text-sm text-charcoal-black flex items-center gap-2"><Users size={16}/> AR Recovery (Auto-Tagih Piutang)</h4>
                    <p className="text-xs text-gray-500 mt-1">Kirim pesan pengingat otomatis ke pelanggan yang memiliki tunggakan &gt; 30 hari</p>
                  </div>
                  <div className="w-12 h-6 bg-gray-300 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Paywall Overlay */}
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full border border-gray-100 animate-slide-in">
              <div className="w-16 h-16 bg-gradient-to-tr from-amber-deep to-cta text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg rotate-3">
                <Lock size={32} />
              </div>
              
              <h2 className="text-xl font-extrabold text-charcoal-black mb-3">Fitur Khusus PRO</h2>
              <p className="text-sm text-charcoal-medium mb-6 leading-relaxed">
                Tingkatkan paket Anda ke <strong>PRO</strong> untuk membuka fitur <strong>Auto-Tagih Piutang (AR Recovery)</strong> dan <strong>Laporan Harian (Daily Digest)</strong> langsung ke WhatsApp Anda tanpa repot.
              </p>
              
              <div className="space-y-3 mb-8 text-left text-sm text-charcoal-medium">
                <div className="flex items-start gap-2">
                  <CheckCircle size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Notifikasi WhatsApp tagihan otomatis ke pelanggan</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Hemat waktu menagih hutang satu per satu</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Update ringkasan bisnis (Laba & Omzet) setiap malam</span>
                </div>
              </div>

              <button className="w-full bg-cta hover:bg-cta/90 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md shadow-cta/20 flex items-center justify-center gap-2">
                UPGRADE KE PRO SEKARANG
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* PRO UI */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:p-8">
          <form onSubmit={handleSave} className="space-y-8">
            {/* Phone Number Input */}
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-charcoal-black flex items-center gap-2">
                  <Smartphone size={18} className="text-navy-deep"/>
                  Nomor WhatsApp Anda
                </h3>
                <p className="text-xs text-gray-500">Nomor ini akan digunakan sebagai penerima laporan harian (Daily Digest).</p>
              </div>
              
              <div className="relative max-w-md">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-sm font-bold text-gray-500 border-r border-gray-200 pr-3 my-2">
                  +62
                </span>
                <input 
                  type="tel" 
                  value={waNumber}
                  onChange={(e) => setWaNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="81234567890"
                  className="w-full bg-white border-2 border-gray-200 rounded-xl pl-16 pr-4 py-3 text-sm font-semibold focus:border-cta outline-none transition-all placeholder:font-normal"
                />
              </div>
            </div>

            <div className="border-t border-gray-100 my-6"></div>

            {/* Toggles */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-charcoal-black mb-4">Pengaturan Otomatisasi</h3>
              
              {/* Daily Digest Toggle */}
              <div className="flex items-start sm:items-center justify-between p-4 sm:p-5 bg-gray-50 hover:bg-gray-100/50 rounded-xl border border-gray-100 transition-colors gap-4 flex-col sm:flex-row">
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <BellRing size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-charcoal-black">Daily Digest (Laporan Harian)</h4>
                    <p className="text-xs text-charcoal-medium mt-1 leading-relaxed max-w-md">Kirim ringkasan transaksi, total omzet, laba bersih, dan jumlah piutang baru setiap jam 21:00 WIB.</p>
                  </div>
                </div>
                
                <label className="relative inline-flex items-center cursor-pointer ml-12 sm:ml-0">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={dailyDigest}
                    onChange={() => setDailyDigest(!dailyDigest)}
                  />
                  <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-cta shadow-inner"></div>
                </label>
              </div>

              {/* AR Recovery Toggle */}
              <div className="flex items-start sm:items-center justify-between p-4 sm:p-5 bg-gray-50 hover:bg-gray-100/50 rounded-xl border border-gray-100 transition-colors gap-4 flex-col sm:flex-row">
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Users size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-charcoal-black flex items-center gap-2">
                      AR Recovery (Auto-Tagih Piutang)
                      <span className="text-[9px] bg-cta text-primary px-1.5 py-0.5 rounded-md font-extrabold tracking-wider">BETA</span>
                    </h4>
                    <p className="text-xs text-charcoal-medium mt-1 leading-relaxed max-w-md">Kirim pesan WhatsApp otomatis (melalui sistem) ke pelanggan yang memiliki nota piutang belum lunas melewati 30 hari.</p>
                  </div>
                </div>
                
                <label className="relative inline-flex items-center cursor-pointer ml-12 sm:ml-0">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={arRecovery}
                    onChange={() => setArRecovery(!arRecovery)}
                  />
                  <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-cta shadow-inner"></div>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-6 border-t border-gray-100 flex items-center justify-end gap-3">
              {saveSuccess && (
                <span className="text-sm font-bold text-emerald-600 flex items-center gap-1.5 animate-fade-in mr-2">
                  <CheckCircle size={16} /> Tersimpan
                </span>
              )}
              <button 
                type="submit" 
                disabled={isSaving}
                className={`bg-navy-deep hover:bg-navy-bright text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md flex items-center gap-2 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSaving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save size={18} />
                )}
                Simpan Pengaturan
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
