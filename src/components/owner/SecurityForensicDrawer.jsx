"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, AlertTriangle, Info, CheckCircle2, X, Filter,
  RefreshCw, ChevronDown, ChevronUp, Monitor, User, Calendar, Clock,
  ShoppingCart, Shield, Check, Eye
} from 'lucide-react';
import { api } from '@/utils/api';

const EVENT_TITLES = {
  HEM: 'Selisih Serah Terima Estafet (Blind Handover Mismatch)',
  CIP: 'Pembersihan Massal Keranjang (Cart Item Purge)',
  VAC: 'Pembatalan Pasca Hitung (Void After Calculate)',
  RPC: 'Penghapusan Scan Berulang (Repeated Scan Purge)',
  DFO: 'Paksa Buka Laci Kas (Drawer Forced Open)',
  SDC: 'Kluster Diskon Mencurigakan (Suspicious Discounts)',
  FPA: 'Kegagalan PIN Beruntun (Failed PIN Override Attempts)',
  DRAWER_DISCREPANCY: 'Selisih Kas Laci Tutup Shift Kasir',
};

export default function SecurityForensicDrawer({ isOpen, onClose, shopId }) {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [markingId, setMarkingId] = useState(null);

  const fetchAnomalies = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const data = await api.getSecurityAnomalies({
        severity: severityFilter !== 'ALL' ? severityFilter : undefined,
        unreadOnly: unreadOnly || undefined,
        limit: 50,
      });
      setAnomalies(data || []);
    } catch (err) {
      console.error('[SecurityForensicDrawer Fetch Error]', err);
    } finally {
      setLoading(false);
    }
  }, [isOpen, severityFilter, unreadOnly]);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchAnomalies();
    }
  }, [isOpen, fetchAnomalies]);

  if (!isOpen) return null;

  const formatRupiah = (num) => `Rp ${Number(num || 0).toLocaleString('id-ID')}`;

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handleToggleRead = async (anomaly) => {
    setMarkingId(anomaly.id);
    try {
      await api.markSecurityAnomalyRead(anomaly.id, !anomaly.is_read);
      setAnomalies((prev) =>
        prev.map((a) => (a.id === anomaly.id ? { ...a, is_read: !a.is_read } : a))
      );
    } catch (err) {
      console.error('[Mark Read Error]', err);
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    const unreadList = anomalies.filter((a) => !a.is_read);
    for (const a of unreadList) {
      try {
        await api.markSecurityAnomalyRead(a.id, true);
      } catch {
        // Continue marking others
      }
    }
    setAnomalies((prev) => prev.map((a) => ({ ...a, is_read: true })));
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100000] flex justify-end font-sans">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer"
        />

        {/* Drawer Container */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="relative w-full max-w-2xl bg-white h-full shadow-2xl border-l-3 border-slate-900 flex flex-col z-10 overflow-hidden"
        >
          {/* Top Header */}
          <div className="bg-slate-900 text-white p-5 border-b-2 border-slate-900 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#CCFF00] text-slate-950 flex items-center justify-center border-2 border-slate-900 shadow-[2px_2px_0px_#CCFF00]">
                <ShieldAlert size={22} />
              </div>
              <div>
                <h3 className="font-display font-black text-lg tracking-tight flex items-center gap-2">
                  Kotak Hitam & Radar Forensik Keamanan
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Log anomali telemetri siluman & serah terima estafet
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchAnomalies}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                title="Segarkan Log"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                title="Tutup Panel"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-slate-100 p-4 border-b-2 border-slate-900 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-slate-600 flex items-center gap-1">
                <Filter size={13} /> Severity:
              </span>
              {['ALL', 'CRITICAL', 'WARNING', 'INFO'].map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border-2 transition-all cursor-pointer ${
                    severityFilter === sev
                      ? 'bg-slate-900 text-[#CCFF00] border-slate-900 shadow-[2px_2px_0px_#1E293B]'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-slate-800'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={unreadOnly}
                  onChange={(e) => setUnreadOnly(e.target.checked)}
                  className="rounded text-slate-900 focus:ring-[#CCFF00]"
                />
                Belum Dibaca
              </label>

              {anomalies.some((a) => !a.is_read) && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg border border-slate-400 bg-white hover:bg-slate-50 text-slate-800 cursor-pointer"
                >
                  Tandai Semua Dibaca
                </button>
              )}
            </div>
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {loading && anomalies.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <RefreshCw size={28} className="animate-spin text-slate-400 mx-auto" />
                <p className="text-sm font-mono text-slate-500 font-bold">Memuat data log forensik...</p>
              </div>
            ) : anomalies.length === 0 ? (
              <div className="py-20 text-center space-y-2 border-2 border-dashed border-slate-300 rounded-2xl p-6 bg-slate-50">
                <Shield size={36} className="text-emerald-600 mx-auto" />
                <h4 className="font-display font-black text-slate-900 text-base">Tidak Ada Anomali Tercatat</h4>
                <p className="text-xs text-slate-500 font-sans max-w-sm mx-auto">
                  Sistem telemetri siluman beroperasi normal. Tidak ada aktivitas mencurigakan yang melanggar toleransi keamanan.
                </p>
              </div>
            ) : (
              anomalies.map((item) => {
                const isCritical = item.severity === 'CRITICAL';
                const isExpanded = expandedId === item.id;
                const title = EVENT_TITLES[item.event_type] || item.event_type;
                const registerId = item.metadata?.register_id || 'REGISTER_MAIN';
                const cashierName = item.metadata?.cashier_name || item.profiles?.username || 'Kasir';

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border-2 border-slate-900 transition-all overflow-hidden ${
                      isCritical
                        ? 'bg-rose-50/50 shadow-[4px_4px_0px_#991B1B]'
                        : 'bg-white shadow-[4px_4px_0px_#1E293B]'
                    } ${!item.is_read ? 'ring-2 ring-[#CCFF00]' : 'opacity-85'}`}
                  >
                    {/* Header Item */}
                    <div className="p-4 flex items-start justify-between gap-3 border-b border-slate-200">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded border border-slate-900 ${
                              isCritical
                                ? 'bg-rose-600 text-white'
                                : item.severity === 'WARNING'
                                ? 'bg-amber-400 text-slate-950'
                                : 'bg-slate-200 text-slate-800'
                            }`}
                          >
                            {item.severity}
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-slate-900 text-[#CCFF00] px-2 py-0.5 rounded">
                            {item.event_type}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                            <Clock size={12} /> {formatDateTime(item.created_at)}
                          </span>
                          {!item.is_read && (
                            <span className="text-[10px] font-mono font-black bg-rose-500 text-white px-1.5 py-0.5 rounded animate-pulse">
                              BARU
                            </span>
                          )}
                        </div>

                        <h4 className="font-display font-black text-sm text-slate-900 pt-0.5">
                          {title}
                        </h4>

                        <div className="flex items-center gap-3 text-xs font-mono text-slate-600 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Monitor size={13} className="text-slate-500" /> {registerId}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <User size={13} className="text-slate-500" /> {cashierName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleRead(item)}
                          disabled={markingId === item.id}
                          className={`p-1.5 rounded-lg border border-slate-800 text-xs font-mono transition-colors cursor-pointer ${
                            item.is_read
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold'
                          }`}
                          title={item.is_read ? 'Tandai Belum Dibaca' : 'Tandai Selesai Dibaca'}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          className="p-1.5 rounded-lg border border-slate-800 bg-white hover:bg-slate-100 text-slate-900 transition-colors cursor-pointer"
                          title="Lihat Detail Snapshot"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Snapshot & Detail Body */}
                    <div className="p-4 bg-slate-50/70 text-xs font-sans space-y-2">
                      <p className="font-medium text-slate-800 leading-relaxed">
                        {item.metadata?.message ||
                          (item.metadata?.diff_amount !== undefined
                            ? `Selisih fisik kas laci kasir tercatat sebesar ${formatRupiah(item.metadata.diff_amount)}.`
                            : 'Anomali terdeteksi pada terminal kasir.')}
                      </p>

                      {/* Spesifik HEM / Selisih Estafet */}
                      {item.event_type === 'HEM' && item.metadata?.diff_amount !== undefined && (
                        <div className="p-3 bg-white border border-rose-300 rounded-xl space-y-1 font-mono text-xs">
                          <div className="flex justify-between text-slate-700">
                            <span>Modal Ditinggal Kasir Sebelumnya:</span>
                            <span className="font-bold">{formatRupiah(item.metadata.expected_cash || item.metadata.previous_leftover)}</span>
                          </div>
                          <div className="flex justify-between text-slate-700">
                            <span>Uang Fisik Dihitung Kasir Masuk:</span>
                            <span className="font-bold">{formatRupiah(item.metadata.actual_cash)}</span>
                          </div>
                          <div className="flex justify-between text-rose-700 font-black border-t border-rose-200 pt-1">
                            <span>SELISIH ESTAFET:</span>
                            <span>{formatRupiah(item.metadata.diff_amount)}</span>
                          </div>
                        </div>
                      )}

                      {/* Detail Expandable (Snapshot Keranjang / Payload JSON) */}
                      {isExpanded && (
                        <div className="pt-2 border-t border-slate-200 space-y-2 font-mono">
                          {item.metadata?.items_snapshot && Array.isArray(item.metadata.items_snapshot) && (
                            <div className="space-y-1.5">
                              <span className="font-bold text-[11px] uppercase text-slate-700 block">
                                Snapshot Keranjang yang Dibatalkan:
                              </span>
                              <div className="max-h-40 overflow-y-auto border border-slate-300 rounded-xl p-2 bg-white space-y-1">
                                {item.metadata.items_snapshot.map((ci, cidx) => (
                                  <div key={cidx} className="flex justify-between text-[11px] text-slate-800">
                                    <span>{ci.nama} ({ci.qty || ci.quantity} pcs)</span>
                                    <span className="font-bold">{formatRupiah(ci.harga || ci.discounted_unit_price || 0)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div>
                            <span className="font-bold text-[11px] uppercase text-slate-700 block mb-1">
                              Raw Forensic Metadata:
                            </span>
                            <pre className="p-3 bg-slate-900 text-[#CCFF00] rounded-xl text-[10px] overflow-x-auto font-mono">
                              {JSON.stringify(item.metadata, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
