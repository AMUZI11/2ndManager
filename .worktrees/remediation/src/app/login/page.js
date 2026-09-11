"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Login from '@/views/Login';
import { api } from '@/utils/api';

export default function LoginPage() {
  const router = useRouter();
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const session = api.getCurrentSession();
    if (session) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleLoginSuccess = () => {
    setIsSuccess(true);
    setTimeout(() => {
      router.push('/dashboard');
    }, 1800);
  };

  return (
    <>
      <Login onLoginSuccess={handleLoginSuccess} />
      {isSuccess && (
        <div className="fixed inset-0 z-[10000] bg-[#3D1A0F] flex flex-col items-center justify-center animate-fade-in">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(201,123,26,0.2)_0%,transparent_60%)] animate-pulse" />
          
          <div className="flex flex-col items-center space-y-6 z-10 text-center px-6">
            <div className="relative w-24 h-24 bg-gradient-to-br from-[#C97B1A] to-[#A85F10] rounded-full border border-[#C97B1A]/40 flex items-center justify-center shadow-[0_10px_30px_rgba(201,123,26,0.3)] animate-scale-up-bounce">
              <svg className="w-10 h-10 text-white animate-lock-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
              </svg>
              <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-ping-slow" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white tracking-widest font-heading animate-slide-in">
                AKSES DITERIMA
              </h2>
              <p className="text-amber-100/60 text-xs font-semibold tracking-wider font-mono">
                Membuka Gerbang Ledger Buku Kas...
              </p>
            </div>

            <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full w-12 bg-[#C97B1A] rounded-full animate-sweep-bar" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
