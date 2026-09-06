"use client";
import React, { useState, useEffect } from 'react';
import {
  PackagePlus, Users, Store, Scale, CheckCircle2,
  Clock, AlertCircle, RefreshCw, MessageCircle, DollarSign,
  ChevronRight, Plus
} from 'lucide-react';
import { api } from '@/utils/api';
import ConsignmentDropInModal from '@/components/consignments/ConsignmentDropInModal';
import ConsignmentSettleModal from '@/components/consignments/ConsignmentSettleModal';

export default function ConsignmentManagement() {
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeBatches, setActiveBatches] = useState([]);
  const [settledBatches, setSettledBatches] = useState([]);
  const [activeTab, setActiveTab] = useState('ACTIVE'); // 'ACTIVE' | 'SETTLED' | 'VENDORS'

  // Modals
  const [isDropInOpen, setIsDropInOpen] = useState(false);
  const [settleModalBatch, setSettleModalBatch] = useState(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [vList, pList, aBatches, sBatches] = await Promise.all([
        api.getConsignmentVendors(),
        api.getProducts(),
        api.getConsignmentBatches({ status: 'ACTIVE' }),
        api.getConsignmentBatches({ status: 'SETTLED' }),
      ]);
      setVendors(Array.isArray(vList) ? vList : []);
      setProducts(Array.isArray(pList) ? pList : []);
      setActiveBatches(Array.isArray(aBatches) ? aBatches : []);
      setSettledBatches(Array.isArray(sBatches) ? sBatches : []);
    } catch (err) {
      console.error('[ConsignmentManagement] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (val) => `Rp ${Number(val || 0).toLocaleString('id-ID')}`;

  // Metrics
  const totalPendingPayout = activeBatches.reduce(
    (sum, b) => sum + (Number(b.received_qty || 0) * Number(b.vendor_price_per_unit || 0)), 
    0
  );
  const totalSettledPayout = settledBatches.reduce(
    (sum, b) => sum + Number(b.total_payout || 0), 
    0
  );
  const totalStoreProfit = settledBatches.reduce(
    (sum, b) => sum + Number(b.total_profit || 0), 
    0
  );

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0_#1E293B]">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display flex items-center gap-2">
            <Scale size={24} className="text-indigo-600" />
            Buku Konsinyasi (Titip Jual)
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Kelola titipan barang tetangga/vendor, rekonsiliasi tripartit sisa retur, dan sinkronisasi uang laci kasir.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsDropInOpen(true)}
            className="btn-arcade flex-1 sm:flex-initial px-4 py-2.5 bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 font-extrabold text-xs font-mono uppercase rounded-xl border-2 border-slate-800 shadow-[3px_3px_0_#1E293B] flex items-center justify-center gap-2 cursor-pointer"
          >
            <PackagePlus size={16} /> + Catat Titip Masuk
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border-2 border-slate-800 shadow-[3px_3px_0_#1E293B]">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">
            Vendor Titipan Aktif
          </span>
          <span className="text-2xl font-mono font-extrabold text-slate-900">
            {vendors.length}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border-2 border-slate-800 shadow-[3px_3px_0_#1E293B]">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">
            Batch Sedang Dijual
          </span>
          <span className="text-2xl font-mono font-extrabold text-indigo-700">
            {activeBatches.length}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border-2 border-slate-800 shadow-[3px_3px_0_#1E293B]">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">
            Estimasi Setor Vendor Pending
          </span>
          <span className="text-lg font-mono font-extrabold text-amber-700">
            {formatRupiah(totalPendingPayout)}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border-2 border-slate-800 shadow-[3px_3px_0_#1E293B]">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">
            Keuntungan Warung Terealisasi
          </span>
          <span className="text-lg font-mono font-extrabold text-emerald-800">
            {formatRupiah(totalStoreProfit)}
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b-2 border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('ACTIVE')}
          className={`px-4 py-2.5 font-mono text-xs font-bold border-t-2 border-x-2 rounded-t-xl transition ${
            activeTab === 'ACTIVE'
              ? 'bg-white border-slate-800 text-slate-900 translate-y-[2px]'
              : 'bg-slate-100 border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Batch Aktif ({activeBatches.length})
        </button>
        <button
          onClick={() => setActiveTab('SETTLED')}
          className={`px-4 py-2.5 font-mono text-xs font-bold border-t-2 border-x-2 rounded-t-xl transition ${
            activeTab === 'SETTLED'
              ? 'bg-white border-slate-800 text-slate-900 translate-y-[2px]'
              : 'bg-slate-100 border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Riwayat Settlement ({settledBatches.length})
        </button>
        <button
          onClick={() => setActiveTab('VENDORS')}
          className={`px-4 py-2.5 font-mono text-xs font-bold border-t-2 border-x-2 rounded-t-xl transition ${
            activeTab === 'VENDORS'
              ? 'bg-white border-slate-800 text-slate-900 translate-y-[2px]'
              : 'bg-slate-100 border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Master Vendor ({vendors.length})
        </button>
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 font-mono text-sm bg-white rounded-2xl border-2 border-slate-800 flex items-center justify-center gap-2">
          <RefreshCw size={16} className="animate-spin" /> Memuat Buku Konsinyasi...
        </div>
      ) : activeTab === 'ACTIVE' ? (
        activeBatches.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border-2 border-slate-800">
            <p className="text-slate-600 text-xs font-mono">Belum ada batch titipan barang yang aktif.</p>
            <button
              onClick={() => setIsDropInOpen(true)}
              className="mt-3 px-4 py-2 bg-slate-900 text-[#CCFF00] font-mono text-xs font-bold rounded-xl"
            >
              + Catat Titip Masuk Pertama
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeBatches.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-2xl border-2 border-slate-800 p-4 shadow-[4px_4px_0_#1E293B] flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-indigo-100 text-indigo-900 rounded font-bold">
                      {b.consignment_vendors?.nama_vendor}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(b.created_at).toLocaleDateString('id-ID')}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-sm text-slate-900 mt-2">
                    {b.products?.nama}
                  </h3>

                  <div className="grid grid-cols-3 gap-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200 mt-2 text-center">
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 block">MASUK</span>
                      <span className="text-xs font-mono font-bold text-slate-900">{b.received_qty} Pcs</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 block">SETOR</span>
                      <span className="text-xs font-mono font-bold text-slate-900">{formatRupiah(b.vendor_price_per_unit)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 block">JUAL</span>
                      <span className="text-xs font-mono font-bold text-emerald-700">{formatRupiah(b.selling_price_per_unit)}</span>
                    </div>
                  </div>

                  {b.notes && (
                    <p className="text-[11px] text-slate-500 italic mt-2">“{b.notes}”</p>
                  )}
                </div>

                <button
                  onClick={() => setSettleModalBatch(b)}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-[#CCFF00] font-mono text-xs font-bold rounded-xl border border-slate-800 flex items-center justify-center gap-1.5 cursor-pointer shadow-[2px_2px_0_#1E293B] active:translate-y-0.5"
                >
                  <Scale size={14} /> Rekonsiliasi &amp; Lunasi
                </button>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'SETTLED' ? (
        <div className="bg-white rounded-2xl border-2 border-slate-800 overflow-hidden shadow-[4px_4px_0_#1E293B]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-900 text-[#CCFF00] font-mono uppercase text-[10px]">
                <tr>
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Vendor</th>
                  <th className="p-3">Produk</th>
                  <th className="p-3 text-center">Masuk / Terjual / Retur</th>
                  <th className="p-3 text-right">Uang Disetor</th>
                  <th className="p-3 text-right">Laba Warung</th>
                  <th className="p-3 text-center">Tanggungan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {settledBatches.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-slate-500">
                      {new Date(s.settled_at || s.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="p-3 font-bold text-slate-900">
                      {s.consignment_vendors?.nama_vendor}
                    </td>
                    <td className="p-3 font-medium text-slate-800">
                      {s.products?.nama}
                    </td>
                    <td className="p-3 font-mono text-center">
                      <span className="text-slate-900 font-bold">{s.received_qty}</span>
                      <span className="text-slate-400"> / </span>
                      <span className="text-emerald-700 font-bold">{s.sold_qty}</span>
                      <span className="text-slate-400"> / </span>
                      <span className="text-rose-700 font-bold">{s.returned_qty}</span>
                    </td>
                    <td className="p-3 font-mono font-bold text-right text-slate-900">
                      {formatRupiah(s.total_payout)}
                    </td>
                    <td className="p-3 font-mono font-bold text-right text-emerald-800">
                      {formatRupiah(s.total_profit)}
                    </td>
                    <td className="p-3 text-center font-mono">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.loss_borne_by === 'STORE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {s.loss_borne_by === 'STORE' ? 'Toko' : 'Vendor'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Vendors Tab */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {vendors.map((v) => (
            <div
              key={v.id}
              className="bg-white rounded-2xl border-2 border-slate-800 p-4 shadow-[4px_4px_0_#1E293B] space-y-2"
            >
              <div className="flex justify-between items-start">
                <h4 className="font-extrabold text-sm text-slate-900">{v.nama_vendor}</h4>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-bold">
                  {v.active_batch_count || 0} Titipan Aktif
                </span>
              </div>
              <p className="text-xs font-mono text-slate-600">{v.phone || 'Tanpa no. telepon'}</p>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-xs font-mono">
                <span className="text-slate-500">Total Settlement:</span>
                <span className="font-bold text-slate-900">{formatRupiah(v.total_payout_settled)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <ConsignmentDropInModal
        isOpen={isDropInOpen}
        onClose={() => setIsDropInOpen(false)}
        products={products}
        vendors={vendors}
        onSuccess={loadAllData}
        onReloadVendors={loadAllData}
      />

      <ConsignmentSettleModal
        isOpen={Boolean(settleModalBatch)}
        batch={settleModalBatch}
        onClose={() => setSettleModalBatch(null)}
        onSuccess={loadAllData}
      />
    </div>
  );
}
