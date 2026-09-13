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
  Check,
  Send
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
  const now = useSyncExternalStore(subscribeClock, getClockSnapshot, getServerClockSnapshot);
  const supabase = createClient();

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
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

    const channel = supabase
      .channel('platform_events')
      .on('broadcast', { event: 'PANIC_TICKET_RAISED' }, () => {
        fetchTickets();
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
    <div className="space-y-6 font-sans max-w-7xl mx-auto pb-12">
      {/* Top Header Bento Card */}
      <div className="bg-white border-2 border-slate-800 rounded-2xl p-6 shadow-[4px_4px_0px_0px_#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 bg-rose-500 border-2 border-slate-800 rounded-xl shadow-[2px_2px_0px_0px_#1e293b] text-white">
              <LifeBuoy size={20} className="animate-spin" />
            </span>
            <h1 className="font-display font-black text-2xl text-slate-900 tracking-tight">
              Emergency WA Triage Queue
            </h1>
            <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-rose-100 border border-slate-800 text-rose-900 font-black tracking-wider">
              SLA TARGET: &lt; 5 MENIT
            </span>
          </div>
          <p className="text-slate-600 text-sm font-medium">
            Antrean panggilan bantuan darurat real-time dari tombol SOS kasir di terminal toko.
          </p>
        </div>

        <button
          onClick={() => fetchTickets()}
          disabled={loading}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white border-2 border-slate-800 text-slate-800 font-mono text-xs font-bold shadow-[2px_2px_0px_0px_#1e293b] hover:bg-slate-50 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>MUAT ULANG</span>
        </button>
      </div>

      {/* Ticket List */}
      {loading && tickets.length === 0 ? (
        <div className="bg-white border-2 border-slate-800 rounded-2xl p-12 text-center text-slate-400 font-mono text-xs shadow-[4px_4px_0px_0px_#1e293b]">
          Memeriksa antrean tiket darurat...
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white border-2 border-slate-800 rounded-2xl p-12 text-center shadow-[4px_4px_0px_0px_#1e293b] space-y-2">
          <div className="w-12 h-12 bg-lime-100 border-2 border-slate-800 rounded-2xl flex items-center justify-center mx-auto shadow-[2px_2px_0px_0px_#1e293b]">
            <CheckCircle2 size={26} className="text-emerald-700" />
          </div>
          <h3 className="font-display font-black text-base text-slate-900 uppercase">
            Tidak Ada Tiket Darurat Aktif
          </h3>
          <p className="text-xs text-slate-600 font-mono">
            Seluruh panggilan SOS kasir telah terselesaikan dengan baik. Antrean bersih.
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
                className="bg-white border-2 border-slate-800 rounded-2xl p-6 shadow-[4px_4px_0px_0px_#1e293b] space-y-4 transition-transform hover:-translate-y-0.5"
              >
                {/* Ticket Top Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-slate-800 pb-3">
                  <div className="flex items-center space-x-3">
                    <span className="w-3 h-3 rounded-full bg-rose-500 border border-slate-800 animate-ping" />
                    <div>
                      <span className="text-xs font-mono text-rose-600 font-black tracking-wide">
                        [CRITICAL SOS #{ticket.id.slice(0, 8)}]
                      </span>
                      <h3 className="font-display font-black text-lg text-slate-900 uppercase tracking-tight">
                        {shopName}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 font-mono text-xs">
                    <span className="text-slate-500 font-bold">Menunggu Respon:</span>
                    <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-900 font-black border border-slate-800 animate-pulse">
                      {getSlaTime(ticket.created_at)}
                    </span>
                  </div>
                </div>

                {/* Reporter & Issue Detail */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="p-3 bg-slate-50 border-2 border-slate-800 rounded-xl">
                    <span className="text-[10px] uppercase text-slate-500 font-bold block mb-0.5">Pelapor Kasir:</span>
                    <p className="text-slate-900 font-black text-sm">{ticket.reporter_name}</p>
                    <p className="text-slate-600 text-xs mt-0.5">{ticket.reporter_phone || 'Nomor HP tidak tercantum'}</p>
                  </div>
                  <div className="p-3 bg-rose-50 border-2 border-slate-800 rounded-xl">
                    <span className="text-[10px] uppercase text-rose-700 font-bold block mb-0.5">Kendala Dilaporkan:</span>
                    <p className="text-rose-900 font-black text-sm">{ticket.issue_type}</p>
                  </div>
                </div>

                {/* Telemetry Box */}
                <div className="bg-slate-50 border-2 border-slate-800 rounded-xl p-3.5 text-xs font-mono space-y-1.5 text-slate-800">
                  <div className="flex items-center space-x-2 text-slate-700 text-xs pb-1.5 border-b border-slate-300 font-bold">
                    <Smartphone size={14} className="text-slate-900" />
                    <span className="uppercase tracking-wider">Telemetri Kasir Otomatis:</span>
                  </div>
                  <p>• Perangkat &amp; Browser: <span className="text-slate-600">{telemetry.userAgent || 'Tidak tersedia'}</span></p>
                  {telemetry.custom_note && (
                    <p>• Catatan Kasir: <span className="font-bold text-slate-900">&quot;{telemetry.custom_note}&quot;</span></p>
                  )}
                  <p>• ID Tiket: <span className="text-slate-500">{ticket.id}</span></p>
                </div>

                {/* Action Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-900 font-mono font-black text-xs border-2 border-slate-800 shadow-[3px_3px_0px_0px_#1e293b] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] flex items-center space-x-2 transition-all cursor-pointer"
                  >
                    <MessageSquare size={16} />
                    <span>BUKA WHATSAPP RESMI</span>
                  </a>

                  {resolvingId === ticket.id ? (
                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                      <input
                        type="text"
                        value={resolveNote}
                        onChange={(e) => setResolveNote(e.target.value)}
                        placeholder="Catatan penanganan..."
                        className="bg-white border-2 border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#CCFF00]"
                      />
                      <button
                        onClick={() => handleResolve(ticket.id)}
                        className="px-3 py-1.5 rounded-xl bg-[#CCFF00] border-2 border-slate-800 text-slate-900 font-mono font-black text-xs shadow-[2px_2px_0px_0px_#1e293b] cursor-pointer"
                      >
                        Konfirmasi
                      </button>
                      <button
                        onClick={() => setResolvingId(null)}
                        className="px-3 py-1.5 rounded-xl bg-white border-2 border-slate-800 text-slate-600 font-mono font-bold text-xs cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setResolvingId(ticket.id)}
                      className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-800 shadow-[2px_2px_0px_0px_#1e293b] active:translate-x-[1px] active:translate-y-[1px] font-mono font-bold text-xs flex items-center space-x-1.5 cursor-pointer"
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
