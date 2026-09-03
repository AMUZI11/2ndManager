"use client";

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Store, 
  ShieldAlert, 
  Calendar, 
  Users, 
  FileText, 
  History, 
  CheckCircle2,
  Clock,
  AlertOctagon
} from 'lucide-react';
import ChokeholdModal from '@/components/admin/ChokeholdModal';

export default function TenantDetailPage({ params }) {
  const unwrappedParams = use(params);
  const shopId = unwrappedParams.id;

  const [shop, setShop] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function fetchDetail() {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/admin/tenants?search=${shopId}`);
        const json = await res.json();
        if (res.ok && json.data?.tenants?.length > 0) {
          setShop(json.data.tenants[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [shopId]);

  if (loading) {
    return (
      <div className="py-16 text-center text-zinc-500 font-mono text-xs">
        Memuat data inspeksi toko #{shopId.slice(0, 8)}...
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="py-16 text-center text-zinc-400 font-mono text-xs space-y-3">
        <p>Toko tidak ditemukan atau ID tidak valid.</p>
        <Link href="/admin/tenants" className="text-[#CCFF00] underline">
          Kembali ke Direktori Penyewa
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/admin/tenants"
            className="h-8 w-8 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-heading font-black text-xl text-zinc-100 uppercase">
                {shop.name}
              </h2>
              <span className="font-mono text-xs text-zinc-500">#{shop.id.slice(0, 8)}</span>
            </div>
            <p className="text-xs text-zinc-400 font-mono">
              Terdaftar sejak: {new Date(shop.created_at).toLocaleDateString('id-ID', { dateStyle: 'long' })}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={async () => {
              const reason = window.prompt('Masukkan justifikasi audit untuk sesi Ghost Inspection (minimal 10 karakter):');
              if (!reason || reason.trim().length < 10) {
                alert('Justifikasi wajib diisi minimal 10 karakter untuk dicatat di immutable audit log.');
                return;
              }
              try {
                const res = await fetch('/api/v1/admin/tenants/' + shop.id + '/impersonate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ reason: reason.trim() }),
                });
                const json = await res.json();
                if (res.ok && json.data) {
                  localStorage.setItem('hl_active_branch', shop.id);
                  localStorage.setItem('hl_ghost_session', JSON.stringify(json.data));
                  window.open('/dashboard?ghost=true&shop=' + shop.id, '_blank');
                } else {
                  alert(json.message || 'Gagal memulai sesi Ghost.');
                }
              } catch (e) {
                console.error(e);
                alert('Terjadi kesalahan jaringan.');
              }
            }}
            className="h-8 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs rounded border border-zinc-700 flex items-center space-x-1.5 cursor-pointer transition-colors"
          >
            <span>👻</span>
            <span>GHOST INSPECTION</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="h-8 px-4 bg-[#CCFF00] hover:bg-[#b3e600] text-black font-extrabold text-xs rounded border border-black flex items-center space-x-1.5 cursor-pointer transition-colors"
          >
            <ShieldAlert size={14} />
            <span>KONTROL CHOKEHOLD</span>
          </button>
        </div>
      </div>

      {/* Info Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
        <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-1">
          <span className="text-zinc-500 font-bold uppercase">Status Operasional</span>
          <p className="text-sm font-black text-zinc-100">{shop.operational_status}</p>
          <p className="text-[11px] text-zinc-400">
            Chokehold: {shop.chokehold_active ? 'TERKUNCI AKTIF' : 'NORMAL'}
          </p>
        </div>

        <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-1">
          <span className="text-zinc-500 font-bold uppercase">Paket Langganan</span>
          <p className="text-sm font-black text-[#CCFF00] uppercase">
            {shop.subscription_tier || 'TRIAL'}
          </p>
          <p className="text-[11px] text-zinc-400">
            Masa Tenggang: {shop.grace_period_until ? new Date(shop.grace_period_until).toLocaleDateString('id-ID') : 'Tidak Ada'}
          </p>
        </div>

        <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-1">
          <span className="text-zinc-500 font-bold uppercase">Kuota Kasir POS</span>
          <p className="text-sm font-black text-zinc-100">
            {shop.active_cashiers_count || 1} / {shop.cashier_limit || 1} Kasir
          </p>
          <p className="text-[11px] text-zinc-400">Multi-device Lockout Active</p>
        </div>
      </div>

      {/* Chokehold Modal */}
      <ChokeholdModal
        isOpen={isModalOpen}
        shop={shop}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}
