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
    <div className="space-y-6 font-sans max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldAlert size={20} className="text-amber-400" />
            <h2 className="font-heading font-black text-xl text-zinc-100 uppercase tracking-tight">
              Fraud Radar &amp; Anomaly Detector
            </h2>
          </div>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Algoritma pengawasan pembatalan bon berulang, void mencurigakan, dan transaksi anomali
          </p>
        </div>

        <button
          onClick={fetchAnomalies}
          className="h-8 px-3 rounded bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-zinc-100 flex items-center space-x-1.5 text-xs font-mono cursor-pointer"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          <span>PINDAI ULANG</span>
        </button>
      </div>

      {/* Anomalies Feed */}
      <div className="space-y-3">
        {loading && anomalies.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 font-mono text-xs">
            Memindai transaksi anomali platform...
          </div>
        ) : anomalies.length === 0 ? (
          <div className="p-12 text-center bg-zinc-900/40 border border-zinc-800 rounded-lg space-y-2">
            <ShieldAlert size={32} className="text-emerald-500 mx-auto" />
            <h3 className="font-heading font-bold text-sm text-zinc-200 uppercase">
              Radar Bersih: Tidak Ada Anomali Kritis
            </h3>
            <p className="text-xs text-zinc-500 font-mono">
              Tidak terdeteksi pola kecurangan atau pembatalan transaksi berulang di seluruh warung.
            </p>
          </div>
        ) : (
          anomalies.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans"
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded mt-0.5 ${
                  item.severity === 'HIGH'
                    ? 'bg-red-950/80 text-red-400 border border-red-800'
                    : 'bg-amber-950/80 text-amber-400 border border-amber-800'
                }`}>
                  <AlertTriangle size={16} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs text-zinc-100">{item.shopName}</span>
                    <span className="font-mono text-[10px] text-zinc-500">[{item.type}]</span>
                  </div>
                  <p className="text-xs text-zinc-300 font-mono mt-0.5">{item.description}</p>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Waktu: {new Date(item.timestamp).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {item.shopId && (
                <Link
                  href={`/admin/tenants/${item.shopId}`}
                  className="h-7 px-3 inline-flex items-center space-x-1.5 rounded bg-zinc-950 hover:bg-zinc-900 border border-zinc-700 text-xs text-zinc-300 font-medium shrink-0 self-start sm:self-center"
                >
                  <span>Inspeksi Toko</span>
                  <ExternalLink size={11} />
                </Link>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
