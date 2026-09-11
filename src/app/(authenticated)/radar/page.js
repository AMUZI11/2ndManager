"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldAlert,
  Radio,
  Volume2,
  VolumeX,
  RefreshCw,
  Monitor,
  User,
  Clock,
  Coins,
  AlertTriangle,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  Flame,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { api } from '@/utils/api';
import { playSecuritySiren, stopSecuritySiren, isSirenMuted, setSirenMuted } from '@/utils/sirenAudio';

const SEVERITY_STYLES = {
  CRITICAL: 'bg-red-500/20 border-red-500 text-red-400',
  HIGH: 'bg-orange-500/20 border-orange-500 text-orange-400',
  MEDIUM: 'bg-amber-500/20 border-amber-500 text-amber-400',
  LOW: 'bg-blue-500/20 border-blue-500 text-blue-400',
};

const BADGE_COLORS = {
  VAC: 'bg-red-600 text-white',
  SHIFT_DISCREPANCY: 'bg-rose-700 text-white',
  CIP: 'bg-orange-600 text-white',
  HEM: 'bg-amber-500 text-slate-950',
  DFO: 'bg-yellow-500 text-slate-950',
  SDC: 'bg-purple-600 text-white',
  RPC: 'bg-indigo-600 text-white',
  ACD: 'bg-teal-600 text-white',
};

export default function SecurityRadarPage() {
  const [shopId, setShopId] = useState(null);
  const [registers, setRegisters] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sirenActive, setSirenActive] = useState(!isSirenMuted());
  const [freezingRegister, setFreezingRegister] = useState(null);
  const [expandedAnomalyId, setExpandedAnomalyId] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('CONNECTING');
  const [now, setNow] = useState(0);

  const supabase = createClient();
  const audioUnlockedRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Ambil data radar awal dari backend
  const loadRadarData = useCallback(async () => {
    try {
      const res = await api.getRadarOverview();
      if (res) {
        setShopId(res.shop_id);
        setRegisters(res.registers || []);
        setAnomalies(res.recent_anomalies || []);
      }
    } catch (err) {
      console.error('[Load Radar Data Error]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRadarData();
  }, [loadRadarData]);

  // Toggle Mute Sirine
  const handleToggleSiren = () => {
    const nextState = !sirenActive;
    setSirenActive(nextState);
    setSirenMuted(!nextState);
    if (nextState) {
      // Mainkan 1 nada uji coba
      playSecuritySiren({ cycles: 1, volume: 0.15 });
    } else {
      stopSecuritySiren();
    }
  };

  // Buka/Kunci Register secara remote
  const handleToggleFreeze = async (registerCode, currentlyFrozen) => {
    setFreezingRegister(registerCode);
    try {
      await api.toggleFreezeRegister({
        register_code: registerCode,
        is_frozen: !currentlyFrozen,
        reason: !currentlyFrozen
          ? 'Kunci darurat diaktifkan oleh pemilik melalui Radar Keamanan'
          : 'Dibuka kembali oleh pemilik',
      });

      // Update state lokal seketika
      setRegisters((prev) =>
        prev.map((r) =>
          r.register_code === registerCode ? { ...r, is_frozen: !currentlyFrozen } : r
        )
      );
    } catch (err) {
      alert(err.message || 'Gagal mengubah status register.');
    } finally {
      setFreezingRegister(null);
    }
  };

  // ── SUPABASE REALTIME WEBSOCKET SUBSCRIPTION ────────────────────────────────
  useEffect(() => {
    if (!shopId) return;

    const channel = supabase
      .channel(`security_radar:${shopId}`)
      .on('broadcast', { event: 'ANOMALY_DETECTED' }, (payload) => {
        const item = payload?.payload || payload;
        if (!item) return;

        // Picu sirine Web Audio API jika keparahan CRITICAL
        if (item.severity === 'CRITICAL') {
          playSecuritySiren({ cycles: 2, volume: 0.3 });
        }

        setAnomalies((prev) => [item, ...prev.slice(0, 49)]);
      })
      .on('broadcast', { event: 'FREEZE_REGISTER' }, (payload) => {
        const { register_code } = payload?.payload || payload || {};
        if (register_code) {
          setRegisters((prev) =>
            prev.map((r) => (r.register_code === register_code ? { ...r, is_frozen: true } : r))
          );
        }
      })
      .on('broadcast', { event: 'UNFREEZE_REGISTER' }, (payload) => {
        const { register_code } = payload?.payload || payload || {};
        if (register_code) {
          setRegisters((prev) =>
            prev.map((r) => (r.register_code === register_code ? { ...r, is_frozen: false } : r))
          );
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('LIVE');
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('ERROR');
        } else {
          setConnectionStatus(status);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId, supabase]);

  const formatRupiah = (val) => `Rp ${Number(val || 0).toLocaleString('id-ID')}`;

  const calculateShiftDuration = (startTime) => {
    if (!startTime) return '-';
    const currentTs = now || (startTime ? new Date(startTime).getTime() : 0);
    const diff = Math.max(0, currentTs - new Date(startTime).getTime());
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}j ${mins}m`;
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 p-4 md:p-6 space-y-6 font-mono selection:bg-red-900 selection:text-white">
      {/* ── HEADER CONSOLE ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-600/20 border border-red-500 rounded-xl text-red-500">
              <Radio size={22} className="animate-pulse" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                <span>Realtime Security Radar</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-[#CCFF00] border border-slate-800">
                  Citadel v5
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Pusat komando deteksi kecurangan kasir, audit selisih estafet, &amp; remote freeze
              </p>
            </div>
          </div>
        </div>

        {/* Console Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Connection Status */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'LIVE' ? 'bg-[#CCFF00] animate-ping' : 'bg-amber-400'
              }`}
            />
            <span className="text-slate-400 text-[11px]">RADAR:</span>
            <span className="font-bold text-white text-[11px]">{connectionStatus}</span>
          </div>

          {/* Siren Audio Toggle */}
          <button
            type="button"
            onClick={handleToggleSiren}
            className={`h-10 px-3.5 rounded-xl border-2 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              sirenActive
                ? 'bg-red-600/20 border-red-500 text-red-400 shadow-[2px_2px_0px_#991B1B]'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {sirenActive ? (
              <>
                <Volume2 size={16} className="animate-bounce" strokeWidth={2.5} />
                <span>Sirine: AKTIF</span>
              </>
            ) : (
              <>
                <VolumeX size={16} strokeWidth={2.5} />
                <span>Sirine: MATI</span>
              </>
            )}
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={loadRadarData}
            disabled={loading}
            className="h-10 px-3 rounded-xl bg-slate-900 border-2 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 flex items-center gap-1.5 text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} strokeWidth={2.5} />
            <span>Pindai</span>
          </button>
        </div>
      </div>

      {/* ── GRID TERMINAL REGISTER AKTIF ────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
            <Monitor size={14} strokeWidth={2.5} />
            <span>Status Terminal Kasir ({registers.length})</span>
          </h2>
          <span className="text-[11px] text-slate-500">
            Pembaruan Seketika via WebSocket
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {registers.map((reg) => {
            const shift = reg.active_shift;
            const isFrozen = reg.is_frozen;

            return (
              <div
                key={reg.register_code}
                className={`p-4 rounded-2xl border-2 transition-all space-y-4 ${
                  isFrozen
                    ? 'bg-red-950/30 border-red-600 shadow-[6px_6px_0px_#7F1D1D]'
                    : 'bg-slate-900 border-slate-800 shadow-[6px_6px_0px_#1E293B]'
                }`}
              >
                {/* Top Card */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        isFrozen ? 'bg-red-500 animate-ping' : shift ? 'bg-[#CCFF00]' : 'bg-slate-600'
                      }`}
                    />
                    <span className="font-black text-sm text-white tracking-wider">
                      {reg.register_code}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      isFrozen
                        ? 'bg-red-600 text-white'
                        : shift
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isFrozen ? 'DIBEKUKAN' : shift ? 'SHIFT AKTIF' : 'STANDBY'}
                  </span>
                </div>

                {/* Kasir & Detail Shift */}
                {shift ? (
                  <div className="space-y-2 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 flex items-center gap-1">
                        <User size={13} strokeWidth={2.5} /> Kasir:
                      </span>
                      <span className="font-bold text-white">
                        {shift.cashier?.username || shift.cashier?.full_name || 'Kasir'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock size={13} strokeWidth={2.5} /> Durasi:
                      </span>
                      <span className="font-bold text-amber-400">
                        {calculateShiftDuration(shift.start_time)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Coins size={13} strokeWidth={2.5} /> Modal Awal:
                      </span>
                      <span className="font-bold text-slate-200">
                        {formatRupiah(shift.starting_cash)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/80">
                    Tidak ada shift aktif pada terminal ini.
                  </div>
                )}

                {/* Remote Action Freeze/Unfreeze Button */}
                <div>
                  {isFrozen ? (
                    <button
                      type="button"
                      disabled={freezingRegister === reg.register_code}
                      onClick={() => handleToggleFreeze(reg.register_code, true)}
                      className="w-full h-10 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase rounded-xl border border-emerald-400 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Unlock size={15} strokeWidth={2.5} />
                      <span>Buka Kunci Terminal</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={freezingRegister === reg.register_code}
                      onClick={() => handleToggleFreeze(reg.register_code, false)}
                      className="w-full h-10 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500 font-bold text-xs uppercase rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <ShieldAlert size={15} strokeWidth={2.5} />
                      <span>Bekukan Terminal (Freeze)</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── LIVE ANOMALY STREAM FEED ──────────────────────────────── */}
      <div className="space-y-3 pt-4 border-t-2 border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-amber-400" strokeWidth={2.5} />
            <h2 className="text-xs uppercase tracking-wider font-bold text-slate-300">
              Live Anomaly Stream &amp; Forensic Log
            </h2>
          </div>
          <span className="text-[11px] text-slate-500">
            {anomalies.length} Peristiwa Terekam
          </span>
        </div>

        {anomalies.length === 0 ? (
          <div className="py-12 bg-slate-900 border-2 border-dashed border-slate-800 rounded-2xl text-center text-slate-500 text-xs">
            Tidak ada anomali terdeteksi. Sistem kasir berjalan aman dan kondusif.
          </div>
        ) : (
          <div className="space-y-2.5">
            {anomalies.map((anom, idx) => {
              const badgeBg = BADGE_COLORS[anom.event_type] || 'bg-slate-700 text-white';
              const sevStyle = SEVERITY_STYLES[anom.severity] || SEVERITY_STYLES.MEDIUM;
              const isExpanded = expandedAnomalyId === (anom.id || idx);

              return (
                <div
                  key={anom.id || idx}
                  className={`border-2 rounded-xl p-3.5 transition-all ${sevStyle}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded tracking-wide ${badgeBg}`}>
                        [{anom.event_type}]
                      </span>
                      <span className="text-xs font-bold text-white">
                        {anom.cashier_name || 'Kasir'}
                      </span>
                      <span className="text-xs text-slate-400">
                        {anom.metadata?.reason || 'Aktivitas anomali terdeteksi'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 shrink-0">
                      <span>
                        {anom.created_at || anom.t ? new Date(anom.created_at || anom.t).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        }) + ' WIB' : '-'}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedAnomalyId(isExpanded ? null : anom.id || idx)
                        }
                        className="p-1 rounded bg-slate-900/60 hover:bg-slate-900 text-slate-300 transition-colors cursor-pointer"
                        aria-label="Rincian Forensik"
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Forensic Metadata */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-700/60 text-[11px] space-y-2">
                      <div className="text-slate-400 font-bold">Data Forensik Metadata:</div>
                      <pre className="p-2.5 bg-slate-950/80 rounded-lg overflow-x-auto text-[#CCFF00] font-mono border border-slate-800">
                        {JSON.stringify(anom.metadata || {}, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
