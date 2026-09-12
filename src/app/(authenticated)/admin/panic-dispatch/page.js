"use client";

import React, { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { 
  LifeBuoy, 
  Clock, 
  MessageSquare, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink,
  ShieldAlert,
  Smartphone,
  Check
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function subscribeClock(callback) {
  const interval = setInterval(callback, 1000);
  return () => clearInterval(interval);
}
function getClockSnapshot() {
  return Date.now();
}
function getServerClockSnapshot() {
  return 0;
}

export default function PanicDispatchPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);
  const [resolveNote, setResolveNote] = useState('');
  const [audioPlayed, setAudioPlayed] = useState(false);
  const now = useSyncExternalStore(subscribeClock, getClockSnapshot, getServerClockSnapshot);
  const supabase = createClient();

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/admin/panic-dispatch?status=OPEN');
      const json = await res.json();
      if (res.ok && json.data) {
        setTickets(json.data.tickets || []);
      }
    } catch (err) {
      console.error('[Fetch Tickets Error]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadInitial() {
      try {
        const res = await fetch('/api/v1/admin/panic-dispatch?status=OPEN');
        const json = await res.json();
        if (!ignore && res.ok && json.data) {
          setTickets(json.data.tickets || []);
        }
      } catch (err) {
        console.error('[Fetch Tickets Error]', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadInitial();

    // Supabase Realtime Listener on platform_events
    const channel = supabase
      .channel('platform_events')
      .on('broadcast', { event: 'PANIC_TICKET_RAISED' }, () => {
        fetchTickets();
        // Play notification beep
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        } catch (e) {
          console.warn('Audio play prevented', e);
        }
      })
      .subscribe();

    return () => {
      ignore = true;
      supabase.removeChannel(channel);
    };
  }, [fetchTickets, supabase]);

  const handleResolve = async (ticketId) => {
    try {
      const res = await fetch(`/api/v1/admin/panic-dispatch/${ticketId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution_notes: resolveNote.trim() || 'Selesai ditangani via WhatsApp.' }),
      });

      if (res.ok) {
        setResolvingId(null);
        setResolveNote('');
        fetchTickets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getSlaTime = (createdAt) => {
    if (!now) return '00m 00s';
    const diffMs = Math.max(0, now - new Date(createdAt).getTime());
    const mins = Math.floor(diffMs / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);
    return `${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="space-y-6 font-sans max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md border-2 border-slate-800 rounded-2xl p-5 shadow-[3px_3px_0_#1E293B] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 bg-rose-500 inline-block rounded-full border border-slate-800 animate-ping" />
            <h2 className="font-heading font-black text-xl text-slate-900 uppercase tracking-tight">
              Panic Dispatch Command Center
            </h2>
            <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-rose-100 border border-rose-300 text-rose-800 font-extrabold">
              SLA TARGET: &lt; 5 MENIT
            </span>
          </div>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Antrean panggilan bantuan darurat real-time dari tombol SOS kasir
          </p>
        </div>

        <button
          onClick={() => fetchTickets()}
          title="Muat Ulang Antrean"
          className="h-9 px-3.5 rounded-xl bg-white border-2 border-slate-800 text-slate-800 hover:bg-slate-100 flex items-center space-x-2 text-xs font-mono font-bold uppercase cursor-pointer shadow-[2px_2px_0_#1E293B] transition-all"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Muat Ulang</span>
        </button>
      </div>

      {/* Ticket List */}
      {loading && tickets.length === 0 ? (
        <div className="py-16 text-center text-slate-500 font-mono text-xs">
          Memeriksa antrean tiket darurat...
        </div>
      ) : tickets.length === 0 ? (
        <div className="p-12 text-center bg-white/90 backdrop-blur-md border-2 border-slate-800 rounded-2xl shadow-[3px_3px_0_#1E293B] space-y-2">
          <CheckCircle2 size={36} className="text-emerald-600 mx-auto" />
          <h3 className="font-heading font-black text-sm text-slate-900 uppercase">
            Tidak Ada Tiket Darurat Aktif
          </h3>
          <p className="text-xs text-slate-600 font-mono">
            Seluruh panggilan SOS kasir telah terselesaikan dengan baik.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => {
            const telemetry = ticket.telemetry_payload || {};
            const shopName = ticket.shops?.name || 'Toko Pelapor';
            const waPhone = ticket.reporter_phone ? ticket.reporter_phone.replace(/[^0-9]/g, '') : '';
            const cleanPhone = waPhone.startsWith('0') ? '62' + waPhone.slice(1) : waPhone;

            const waText = encodeURIComponent(
              `Halo ${ticket.reporter_name} (${shopName}), kami dari tim Customer Success 2ndManager merespons panggilan darurat Anda terkait "${ticket.issue_type}". Mohon informasikan kendala yang sedang dialami agar segera kami bantu.`
            );
            const waUrl = `https://wa.me/${cleanPhone}?text=${waText}`;

            return (
              <div 
                key={ticket.id}
                className="bg-white/90 backdrop-blur-md border-2 border-rose-500 rounded-2xl p-5 shadow-[4px_4px_0_#E11D48] space-y-4"
              >
                {/* Ticket Top Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div className="flex items-center space-x-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                    <div>
                      <span className="text-xs font-mono text-rose-600 font-black tracking-wide">
                        [CRITICAL TICKET #{ticket.id.slice(0, 8)}]
                      </span>
                      <h4 className="font-heading font-black text-base text-slate-900 uppercase">
                        {shopName}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 font-mono text-xs">
                    <span className="text-slate-500">Menunggu:</span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-rose-100 text-rose-800 font-bold border border-rose-300 animate-pulse">
                      {getSlaTime(ticket.created_at)}
                    </span>
                  </div>
                </div>

                {/* Reporter & Issue Detail */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-sans">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Pelapor:</span>
                    <p className="text-slate-900 font-bold">{ticket.reporter_name} ({ticket.reporter_phone || '-'})</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Kendala Dilaporkan:</span>
                    <p className="text-rose-700 font-bold font-mono">{ticket.issue_type}</p>
                  </div>
                </div>

                {/* Telemetry Box */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs font-mono space-y-1 text-slate-700">
                  <div className="flex items-center space-x-2 text-slate-500 text-[11px] pb-1 border-b border-slate-200">
                    <Smartphone size={13} />
                    <span className="font-bold uppercase tracking-wider">Data Telemetri Kasir Otomatis:</span>
                  </div>
                  <p>• Perangkat &amp; Browser: <span className="text-slate-600">{telemetry.userAgent || 'Tidak tersedia'}</span></p>
                  {telemetry.custom_note && (
                    <p>• Catatan Tambahan Kasir: <span className="text-amber-700 font-bold">&quot;{telemetry.custom_note}&quot;</span></p>
                  )}
                  <p>• ID Tiket Sistem: <span className="text-slate-400">{ticket.id}</span></p>
                </div>

                {/* Action Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 px-4 rounded-xl bg-[#10B981] hover:bg-emerald-600 text-slate-900 font-mono font-black text-xs flex items-center space-x-2 transition-colors cursor-pointer border-2 border-slate-800 shadow-[2px_2px_0_#1E293B]"
                  >
                    <MessageSquare size={15} />
                    <span>BUKA WHATSAPP RESMI</span>
                  </a>

                  {resolvingId === ticket.id ? (
                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                      <input
                        type="text"
                        value={resolveNote}
                        onChange={(e) => setResolveNote(e.target.value)}
                        placeholder="Catatan resolusi..."
                        className="h-9 px-3 bg-white border-2 border-slate-800 text-xs rounded-xl text-slate-900 placeholder-slate-400 font-mono focus:outline-none shadow-[1px_1px_0_#1E293B]"
                      />
                      <button
                        onClick={() => handleResolve(ticket.id)}
                        className="h-9 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-mono font-black text-xs border-2 border-slate-800 shadow-[2px_2px_0_#1E293B] cursor-pointer"
                      >
                        Konfirmasi
                      </button>
                      <button
                        onClick={() => setResolvingId(null)}
                        className="h-9 px-3 rounded-xl bg-white border-2 border-slate-800 text-slate-700 text-xs font-mono font-bold shadow-[1px_1px_0_#1E293B] cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setResolvingId(ticket.id)}
                      className="h-9 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 border-2 border-slate-800 font-mono font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-[2px_2px_0_#1E293B] transition-all"
                    >
                      <Check size={14} />
                      <span>TANDAI SELESAI</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
