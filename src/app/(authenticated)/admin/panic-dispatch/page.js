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
    <div className="space-y-4 font-sans max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <LifeBuoy size={20} className="text-[#E30022] animate-spin" />
            <h2 className="font-heading font-black text-lg text-zinc-100 uppercase tracking-tight">
              Emergency WA Triage Queue
            </h2>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-red-950 border border-red-800 text-red-300 font-extrabold">
              SLA TARGET: &lt; 5 MENIT
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Antrean panggilan bantuan darurat real-time dari tombol SOS kasir
          </p>
        </div>

        <button
          onClick={() => fetchTickets()}
          title="Muat Ulang Antrean"
          className="h-8 px-3 rounded bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-zinc-100 flex items-center space-x-2 text-xs cursor-pointer"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Muat Ulang</span>
        </button>
      </div>

      {/* Ticket List */}
      {loading && tickets.length === 0 ? (
        <div className="py-16 text-center text-zinc-500 font-mono text-xs">
          Memeriksa antrean tiket darurat...
        </div>
      ) : tickets.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/40 border border-zinc-800 rounded-lg space-y-2">
          <CheckCircle2 size={32} className="text-[#10B981] mx-auto" />
          <h3 className="font-heading font-bold text-sm text-zinc-200 uppercase">
            Tidak Ada Tiket Darurat Aktif
          </h3>
          <p className="text-xs text-zinc-500 font-mono">
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
                className="bg-zinc-950 border-2 border-red-800/80 rounded-lg p-5 shadow-[0_10px_30px_rgba(227,0,34,0.15)] space-y-4"
              >
                {/* Ticket Top Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                  <div className="flex items-center space-x-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E30022] animate-ping" />
                    <div>
                      <span className="text-xs font-mono text-red-400 font-black tracking-wide">
                        [CRITICAL TICKET #{ticket.id.slice(0, 8)}]
                      </span>
                      <h4 className="font-heading font-black text-base text-zinc-100 uppercase">
                        {shopName}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 font-mono text-xs">
                    <span className="text-zinc-500">Menunggu:</span>
                    <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 font-bold border border-red-800 animate-pulse">
                      {getSlaTime(ticket.created_at)}
                    </span>
                  </div>
                </div>

                {/* Reporter & Issue Detail */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold block">Pelapor:</span>
                    <p className="text-zinc-200 font-bold">{ticket.reporter_name} ({ticket.reporter_phone || '-'})</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold block">Kendala Dilaporkan:</span>
                    <p className="text-red-300 font-bold font-mono">{ticket.issue_type}</p>
                  </div>
                </div>

                {/* Telemetry Box */}
                <div className="bg-zinc-900/80 border border-zinc-800 rounded p-3 text-xs font-mono space-y-1 text-zinc-300">
                  <div className="flex items-center space-x-2 text-zinc-400 text-[11px] pb-1 border-b border-zinc-800">
                    <Smartphone size={13} />
                    <span className="font-bold uppercase tracking-wider">Data Telemetri Kasir Otomatis:</span>
                  </div>
                  <p>• Perangkat &amp; Browser: <span className="text-zinc-400">{telemetry.userAgent || 'Tidak tersedia'}</span></p>
                  {telemetry.custom_note && (
                    <p>• Catatan Tambahan Kasir: <span className="text-amber-300">&quot;{telemetry.custom_note}&quot;</span></p>
                  )}
                  <p>• ID Tiket Sistem: <span className="text-zinc-500">{ticket.id}</span></p>
                </div>

                {/* Action Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 px-4 rounded bg-[#10B981] hover:bg-emerald-600 text-black font-extrabold text-xs flex items-center space-x-2 transition-colors cursor-pointer"
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
                        className="h-8 px-2.5 bg-zinc-900 border border-zinc-700 text-xs rounded text-zinc-100 placeholder-zinc-500"
                      />
                      <button
                        onClick={() => handleResolve(ticket.id)}
                        className="h-8 px-3 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs cursor-pointer"
                      >
                        Konfirmasi
                      </button>
                      <button
                        onClick={() => setResolvingId(null)}
                        className="h-8 px-2.5 rounded bg-zinc-800 text-zinc-400 text-xs cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setResolvingId(ticket.id)}
                      className="h-9 px-4 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-bold text-xs flex items-center space-x-1.5 cursor-pointer"
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
