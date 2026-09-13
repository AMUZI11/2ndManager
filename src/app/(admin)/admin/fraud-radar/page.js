"use client";

import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, RefreshCw, Eye, ExternalLink, ShieldCheck, Activity } from 'lucide-react';
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

  const highSeverityCount = anomalies.filter((a) => a.severity === 'HIGH').length;

  return (
    <div className="space-y-6 font-sans max-w-7xl mx-auto pb-12">
      {/* Header Bento Card */}
      <div className="bg-white border-2 border-slate-800 rounded-2xl p-6 shadow-[4px_4px_0px_0px_#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-amber-300 border-2 border-slate-800 rounded-xl shadow-[2px_2px_0px_0px_#1e293b]">
              <ShieldAlert className="w-5 h-5 text-slate-900" />
            </span>
            <h1 className="font-display font-black text-2xl text-slate-900 tracking-tight">
              Fraud Radar &amp; Anomaly Detector
            </h1>
          </div>
          <p className="text-slate-600 text-sm font-medium">
            Algoritma pengawasan pembatalan bon berulang, void mencurigakan, dan transaksi anomali platform.
          </p>
        </div>

        <button
          onClick={fetchAnomalies}
          disabled={loading}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white border-2 border-slate-800 text-slate-800 font-mono text-xs font-bold shadow-[2px_2px_0px_0px_#1e293b] hover:bg-slate-50 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>PINDAI ULANG</span>
        </button>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border-2 border-slate-800 rounded-2xl p-5 shadow-[4px_4px_0px_0px_#1e293b]">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="font-mono text-xs font-bold uppercase">Status Radar</span>
            <Activity className="w-4 h-4 text-slate-800" />
          </div>
          <div className="font-display font-black text-2xl text-slate-900 flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 border border-slate-800 animate-pulse"></span>
            <span>AKTIF MEMANTAU</span>
          </div>
          <p className="text-[11px] font-mono text-slate-500 mt-2">
            Heuristik pembatalan transaksi berfrekuensi tinggi
          </p>
        </div>

        <div className="bg-white border-2 border-slate-800 rounded-2xl p-5 shadow-[4px_4px_0px_0px_#1e293b]">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="font-mono text-xs font-bold uppercase">Total Anomali Terdeteksi</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="font-display font-black text-3xl text-slate-900">
            {anomalies.length}
          </div>
          <p className="text-[11px] font-mono text-slate-500 mt-2">
            Dari seluruh transaksi kasir hari ini
          </p>
        </div>

        <div className="bg-white border-2 border-slate-800 rounded-2xl p-5 shadow-[4px_4px_0px_0px_#1e293b]">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="font-mono text-xs font-bold uppercase">Tingkat Kritis (High Severity)</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className={`font-display font-black text-3xl ${highSeverityCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {highSeverityCount}
          </div>
          <p className="text-[11px] font-mono text-slate-500 mt-2">
            Memerlukan investigasi dan chokehold segera
          </p>
        </div>
      </div>

      {/* Anomalies Feed Bento List */}
      <div className="space-y-3">
        {loading && anomalies.length === 0 ? (
          <div className="bg-white border-2 border-slate-800 rounded-2xl p-12 text-center text-slate-400 font-mono text-xs shadow-[4px_4px_0px_0px_#1e293b]">
            Memindai transaksi anomali platform...
          </div>
        ) : anomalies.length === 0 ? (
          <div className="bg-white border-2 border-slate-800 rounded-2xl p-12 text-center shadow-[4px_4px_0px_0px_#1e293b] space-y-2">
            <div className="w-12 h-12 bg-lime-100 border-2 border-slate-800 rounded-2xl flex items-center justify-center mx-auto shadow-[2px_2px_0px_0px_#1e293b]">
              <ShieldCheck size={26} className="text-emerald-700" />
            </div>
            <h3 className="font-display font-black text-base text-slate-900 uppercase">
              Radar Bersih: Tidak Ada Anomali Kritis
            </h3>
            <p className="text-xs text-slate-600 font-mono">
              Tidak terdeteksi pola kecurangan, void berulang, atau transaksi mencurigakan di seluruh warung.
            </p>
          </div>
        ) : (
          anomalies.map((item) => (
            <div
              key={item.id}
              className="bg-white border-2 border-slate-800 rounded-2xl p-5 shadow-[4px_4px_0px_0px_#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-transform hover:-translate-y-0.5"
            >
              <div className="flex items-start space-x-3.5">
                <div className={`p-2.5 rounded-xl border-2 border-slate-800 shadow-[2px_2px_0px_0px_#1e293b] mt-0.5 ${
                  item.severity === 'HIGH'
                    ? 'bg-rose-200 text-rose-900'
                    : 'bg-amber-200 text-amber-900'
                }`}>
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-display font-black text-sm text-slate-900">{item.shopName}</span>
                    <span className="font-mono text-[10px] font-bold bg-slate-100 border border-slate-800 px-1.5 py-0.5 rounded text-slate-700">
                      {item.type}
                    </span>
                    <span className={`font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded border border-slate-800 ${
                      item.severity === 'HIGH'
                        ? 'bg-rose-500 text-white'
                        : 'bg-amber-400 text-slate-900'
                    }`}>
                      {item.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 font-mono mt-1 font-semibold">{item.description}</p>
                  <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                    Waktu: {item.timestamp ? new Date(item.timestamp).toLocaleString('id-ID') : '-'}
                  </span>
                </div>
              </div>

              {item.shopId && (
                <Link
                  href={`/admin/tenants/${item.shopId}`}
                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border-2 border-slate-800 text-xs font-mono font-bold text-slate-900 shadow-[2px_2px_0px_0px_#1e293b] active:translate-x-[1px] active:translate-y-[1px] inline-flex items-center space-x-1.5 shrink-0 self-start sm:self-center cursor-pointer"
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
