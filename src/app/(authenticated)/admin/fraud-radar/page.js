"use client";

import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, RefreshCw, Eye, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function FraudRadarPage() {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnomalies = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/admin/fraud-radar');
      const json = await res.json();
      if (res.ok && json.data?.anomalies) {
        setAnomalies(json.data.anomalies);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
  }, []);

  return (
    <div className="space-y-6 font-sans max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md border-2 border-slate-800 rounded-2xl p-5 shadow-[3px_3px_0_#1E293B] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 bg-amber-400 inline-block rounded-full border border-slate-800" />
            <h2 className="font-heading font-black text-xl text-slate-900 uppercase tracking-tight">
              Fraud Radar &amp; Anomaly Detector
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Algoritma pengawasan pembatalan bon berulang, void mencurigakan, dan transaksi anomali
          </p>
        </div>

        <button
          onClick={fetchAnomalies}
          className="h-9 px-3.5 rounded-xl bg-white border-2 border-slate-800 text-slate-800 hover:bg-slate-100 flex items-center space-x-1.5 text-xs font-mono font-bold uppercase cursor-pointer shadow-[2px_2px_0_#1E293B] transition-all"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>PINDAI ULANG</span>
        </button>
      </div>

      {/* Anomalies Feed */}
      <div className="space-y-3">
        {loading && anomalies.length === 0 ? (
          <div className="py-16 text-center text-slate-500 font-mono text-xs">
            Memindai transaksi anomali platform...
          </div>
        ) : anomalies.length === 0 ? (
          <div className="p-12 text-center bg-white/90 backdrop-blur-md border-2 border-slate-800 rounded-2xl shadow-[3px_3px_0_#1E293B] space-y-2">
            <ShieldAlert size={36} className="text-emerald-600 mx-auto" />
            <h3 className="font-heading font-black text-sm text-slate-900 uppercase">
              Radar Bersih: Tidak Ada Anomali Kritis
            </h3>
            <p className="text-xs text-slate-600 font-mono">
              Tidak terdeteksi pola kecurangan atau pembatalan transaksi berulang di seluruh warung.
            </p>
          </div>
        ) : (
          anomalies.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-white/90 backdrop-blur-md border-2 border-slate-800 shadow-[3px_3px_0_#1E293B] hover:-translate-y-0.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans"
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2.5 rounded-xl mt-0.5 border ${
                  item.severity === 'HIGH'
                    ? 'bg-rose-100 text-rose-700 border-rose-300'
                    : 'bg-amber-100 text-amber-700 border-amber-300'
                }`}>
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs text-slate-900">{item.shopName}</span>
                    <span className="font-mono text-[10px] text-slate-500 font-bold">[{item.type}]</span>
                  </div>
                  <p className="text-xs text-slate-700 font-mono mt-0.5">{item.description}</p>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Waktu: {new Date(item.timestamp).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {item.shopId && (
                <Link
                  href={`/admin/tenants/${item.shopId}`}
                  className="h-8 px-3.5 inline-flex items-center space-x-1.5 rounded-xl bg-white hover:bg-slate-100 border-2 border-slate-800 text-xs font-mono font-bold text-slate-900 shadow-[2px_2px_0_#1E293B] shrink-0 self-start sm:self-center transition-all"
                >
                  <span>Inspeksi Toko</span>
                  <ExternalLink size={12} />
                </Link>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
