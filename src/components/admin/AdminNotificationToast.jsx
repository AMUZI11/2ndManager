"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CreditCard, LifeBuoy, X, ArrowRight, Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AdminNotificationToast() {
  const [notifications, setNotifications] = useState([]);
  const supabase = createClient();

  // Synthetic Audio Cue via Web Audio API (No external sound file required)
  const playSound = (type) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'PAYMENT') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else {
        // Emergency Panic Sound
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(330, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {
      // Audio autoplay policy catch
    }
  };

  useEffect(() => {
    const channel = supabase.channel('platform_events');

    channel.on('broadcast', { event: 'PAYMENT_PROOF_SUBMITTED' }, (payload) => {
      const data = payload.payload;
      const notif = {
        id: 'pay_' + Date.now() + Math.random().toString(36).substr(2, 4),
        type: 'PAYMENT',
        title: 'UPGRADE LANGGANAN BARU',
        message: `${data.shop_name || 'Toko'} mengajukan upgrade ke paket ${data.plan_requested || 'PRO'}.`,
        href: '/admin/payment-proofs',
        btnText: 'Review Bukti Bayar',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      setNotifications((prev) => [notif, ...prev.slice(0, 4)]);
      playSound('PAYMENT');
    });

    channel.on('broadcast', { event: 'PANIC_TICKET_RAISED' }, (payload) => {
      const data = payload.payload;
      const notif = {
        id: 'panic_' + Date.now() + Math.random().toString(36).substr(2, 4),
        type: 'PANIC',
        title: 'ANTREAN DARURAT (SLA < 5M)',
        message: `${data.shop_name || 'Toko'}: ${data.issue_type || 'Bantuan Operasional Darurat'}`,
        href: '/admin/panic-dispatch',
        btnText: 'Buka Panic Triage',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      setNotifications((prev) => [notif, ...prev.slice(0, 4)]);
      playSound('PANIC');
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const dismiss = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-16 right-6 z-[9999] flex flex-col space-y-3 max-w-sm w-full pointer-events-none">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`pointer-events-auto p-4 rounded-xl border shadow-2xl backdrop-blur-xl animate-fade-in flex flex-col space-y-2.5 ${
            n.type === 'PAYMENT'
              ? 'bg-zinc-950/95 border-[#CCFF00]/60 shadow-[0_0_20px_rgba(204,255,0,0.15)] text-zinc-100'
              : 'bg-zinc-950/95 border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.2)] text-zinc-100'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center space-x-2">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                  n.type === 'PAYMENT' ? 'bg-[#CCFF00] text-black' : 'bg-rose-500 text-white'
                }`}
              >
                {n.type === 'PAYMENT' ? <CreditCard size={15} /> : <LifeBuoy size={15} />}
              </div>
              <div>
                <span
                  className={`text-[10px] font-mono font-black tracking-wider uppercase block leading-none ${
                    n.type === 'PAYMENT' ? 'text-[#CCFF00]' : 'text-rose-400'
                  }`}
                >
                  {n.title}
                </span>
                <span className="text-[10px] font-mono text-zinc-400">{n.timestamp} WIB</span>
              </div>
            </div>

            <button
              onClick={() => dismiss(n.id)}
              className="text-zinc-500 hover:text-zinc-200 transition-colors p-1 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <p className="text-xs font-sans text-zinc-300 font-medium leading-relaxed">
            {n.message}
          </p>

          <div className="flex items-center justify-end pt-1">
            <Link
              href={n.href}
              onClick={() => dismiss(n.id)}
              className={`h-7 px-3 rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                n.type === 'PAYMENT'
                  ? 'bg-[#CCFF00] hover:bg-[#b3e600] text-black shadow-sm'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm'
              }`}
            >
              <span>{n.btnText}</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
