"use client";
import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl border border-rose-light space-y-4">
            <div className="w-16 h-16 bg-rose-light text-rose-deep rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
              ⚠️
            </div>
            <div className="space-y-2">
              <h2 className="text-heading text-lg text-rose-deep">Terjadi Kesalahan Aplikasi</h2>
              <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                Aplikasi mengalami kendala teknis saat memuat data. Bapak/Ibu tidak perlu khawatir, silakan tekan tombol di bawah untuk memuat ulang halaman.
              </p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-gradient-to-r from-navy-bright to-navy-deep hover:from-navy-deep hover:to-navy-bright text-white font-extrabold h-12 rounded-xl text-sm transition-all shadow-md cursor-pointer"
            >
              MUAT ULANG HALAMAN
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
