"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, AlertTriangle, Info, X, ExternalLink, Sparkles, Monitor } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { playSecurityChime } from '@/utils/soundAlerts';

const EVENT_LABELS = {
  HEM: 'Selisih Serah Terima Estafet (Blind Mismatch)',
  CIP: 'Pembersihan Massal Keranjang (Cart Item Purge)',
  VAC: 'Pembatalan Pasca Hitung (Void After Calculate)',
  RPC: 'Penghapusan Scan Berulang (Repeated Scan Purge)',
  DFO: 'Paksa Buka Laci Kas (Drawer Forced Open)',
  SDC: 'Kluster Diskon Mencurigakan (Suspicious Discounts)',
  FPA: 'Kegagalan PIN Beruntun (Failed PIN Attempts)',
  DRAWER_DISCREPANCY: 'Selisih Kas Laci Tutup Shift',
};

export default function SecurityRadarAlert({ shopId, onOpenDrawer }) {
  const [activeAlert, setActiveAlert] = useState(null);
  const [alertQueue, setAlertQueue] = useState([]);
  const supabase = createClient();

  const handleDismiss = useCallback(() => {
    setActiveAlert(null);
    setAlertQueue((prev) => {
      if (prev.length > 0) {
        const next = prev[0];
        setActiveAlert(next);
        return prev.slice(1);
      }
      return [];
    });
  }, []);

  useEffect(() => {
    if (!shopId || shopId === 'ALL') return;

    const channel = supabase
      .channel(`shop_security:${shopId}`)
      .on('broadcast', { event: 'security_anomaly' }, (payload) => {
        const anomaly = payload?.payload || payload;
        if (!anomaly || !anomaly.event_type) return;

        // Play auditory alert chime
        playSecurityChime(anomaly.severity || 'WARNING');

        // Dispatch alert to UI
        setActiveAlert((current) => {
          if (!current) {
            return anomaly;
          } else {
            // Queue subsequent alerts
            setAlertQueue((q) => [...q, anomaly]);
            return current;
          }
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId, supabase]);

  // Auto-dismiss non-critical alerts after 10s
  useEffect(() => {
    if (activeAlert && activeAlert.severity !== 'CRITICAL') {
      const timer = setTimeout(() => {
        handleDismiss();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [activeAlert, handleDismiss]);

  if (!activeAlert) return null;

  const isCritical = activeAlert.severity === 'CRITICAL';
  const label = EVENT_LABELS[activeAlert.event_type] || activeAlert.event_type;
  const registerId = activeAlert.metadata?.register_id || 'REGISTER_MAIN';

  const formatRupiah = (num) => `Rp ${Number(num || 0).toLocaleString('id-ID')}`;

  return (
    <AnimatePresence>
      <div className="fixed top-5 right-5 z-[99999] max-w-md w-full px-3 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: -25, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={`pointer-events-auto rounded-2xl border-3 border-slate-900 shadow-[6px_6px_0px_#0F172A] overflow-hidden font-sans p-4 ${
            isCritical
              ? 'bg-rose-600 text-white'
              : 'bg-[#CCFF00] text-slate-950'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl border-2 border-slate-900 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#0F172A] ${
                  isCritical ? 'bg-white text-rose-600 animate-bounce' : 'bg-slate-900 text-[#CCFF00]'
                }`}
              >
                {isCritical ? <ShieldAlert size={22} /> : <AlertTriangle size={22} />}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded border border-slate-900 shadow-xs ${
                      isCritical ? 'bg-black text-[#CCFF00]' : 'bg-slate-900 text-white'
                    }`}
                  >
                    {activeAlert.severity || 'WARNING'}
                  </span>
                  <span className="text-xs font-mono font-bold flex items-center gap-1 opacity-90">
                    <Monitor size={12} /> {registerId}
                  </span>
                  {alertQueue.length > 0 && (
                    <span className="text-[10px] font-mono font-bold bg-white/20 px-1.5 py-0.5 rounded">
                      +{alertQueue.length} lagi
                    </span>
                  )}
                </div>

                <h4 className="font-display font-black text-sm leading-tight">
                  {label}
                </h4>

                <p className={`text-xs font-medium leading-snug ${isCritical ? 'text-rose-100' : 'text-slate-800'}`}>
                  {activeAlert.metadata?.message ||
                    (activeAlert.metadata?.diff_amount !== undefined
                      ? `Selisih kas laci tercatat: ${formatRupiah(activeAlert.metadata.diff_amount)}`
                      : 'Anomali terdeteksi pada operasional kasir.')}
                </p>

                {activeAlert.metadata?.cashier_name && (
                  <p className="text-[11px] font-mono opacity-80">
                    Kasir Terduga: <strong>{activeAlert.metadata.cashier_name}</strong>
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className={`p-1.5 rounded-lg border border-slate-900 transition-colors cursor-pointer shrink-0 shadow-[1px_1px_0px_#0F172A] ${
                isCritical ? 'hover:bg-rose-700 text-white' : 'hover:bg-slate-900 hover:text-white text-slate-900'
              }`}
              title="Tutup Notifikasi"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-3.5 pt-3 border-t-2 border-slate-900/40 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleDismiss}
              className={`px-3 py-1.5 rounded-xl border-2 border-slate-900 font-mono font-bold text-xs transition-all cursor-pointer shadow-[2px_2px_0px_#0F172A] active:translate-x-0.5 active:translate-y-0.5 ${
                isCritical
                  ? 'bg-rose-700 hover:bg-rose-800 text-white'
                  : 'bg-white hover:bg-slate-100 text-slate-900'
              }`}
            >
              Abaikan
            </button>
            <button
              type="button"
              onClick={() => {
                handleDismiss();
                if (onOpenDrawer) onOpenDrawer();
              }}
              className="px-3 py-1.5 rounded-xl border-2 border-slate-900 bg-slate-900 hover:bg-slate-800 text-[#CCFF00] font-mono font-black text-xs transition-all cursor-pointer shadow-[2px_2px_0px_#0F172A] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5"
            >
              <ExternalLink size={13} /> Buka Forensik
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
