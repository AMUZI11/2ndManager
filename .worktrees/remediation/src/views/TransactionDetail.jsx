"use client";
import React, { useState, useEffect } from 'react';
import { formatRupiah } from '@/utils/format';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Printer, CheckCircle, Clock, Gift, FileText, User } from 'lucide-react';
import { api } from '../utils/api';
import { useTutorial } from '../components/TutorialEngine';
import ConfirmModal from '../components/ConfirmModal';

export default function TransactionDetail({ transactionId, setView }) {
  const router = useRouter();
  const { registerTrigger } = useTutorial();
  const [transaction, setTransaction] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [isSettleConfirmOpen, setIsSettleConfirmOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [txData, productsData] = await Promise.all([
          api.getTransactionById(transactionId),
          api.getProducts()
        ]);

        if (txData) {
          setTransaction(txData);
          setProducts(productsData);
          
          if (txData.customer_id) {
            const custData = await api.getCustomerById(txData.customer_id);
            setCustomer(custData);
          }
        }
      } catch (err) {
        console.error("Gagal memuat rincian transaksi:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [transactionId]);



  const handleSettle = async () => {
    setIsSettleConfirmOpen(false);
    setSettling(true);
    try {
      const result = await api.settleTransaction(transactionId, new Date().toISOString().split('T')[0]);
      if (result.success) {
        setTransaction(prev => ({ ...prev, status: 'Lunas', tanggal_lunas: new Date().toISOString().split('T')[0] }));
        setSuccessMsg('Bon berhasil dilunaskan!');
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        alert('Gagal melunaskan: ' + (result.message || 'Error tidak diketahui'));
      }
    } catch (err) {
      alert('Gagal melunaskan bon: ' + err.message);
    } finally {
      setSettling(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-base font-semibold text-primary/80">Memuat Rincian Bon...</p>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
        <p className="text-base font-bold text-red-600">Bon tidak ditemukan.</p>
        <button 
          onClick={() => {
            if (setView) setView("dashboard");
            else router.push("/dashboard");
          }} 
          className="bg-primary text-white px-5 py-2.5 rounded-full font-bold cursor-pointer"
        >
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  // Calculate discount steps visually
  const getDiscountsForProductType = (cust, type) => {
    if (!cust || !cust.discounts) return [];
    return cust.discounts
      .filter(d => d.product_type === type)
      .sort((a, b) => a.step_order - b.step_order)
      .map(d => Number(d.percentage));
  };

  return (
    <div className="space-y-6">
      {/* Top Header Buttons (No Print) */}
      <div className="flex justify-between items-center no-print">
        <button 
          onClick={() => {
            if (setView) setView("dashboard");
            else router.back();
          }} 
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-primary rounded-full font-bold transition-all cursor-pointer text-sm"
        >
          <ArrowLeft size={16} /> Kembali
        </button>

        <div className="flex gap-2">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-full font-bold transition-all hover:bg-primary/95 cursor-pointer text-sm"
          >
            <Printer size={16} /> Cetak Nota
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-2xl flex items-center gap-2 animate-slide-in no-print">
          <CheckCircle className="text-emerald-600" />
          <span className="font-bold text-sm">{successMsg}</span>
        </div>
      )}

      {/* Double-Bezel Card Container */}
      <div className="bg-slate-100/50 ring-1 ring-slate-200/50 p-1.5 rounded-[2rem] shadow-sm print:p-0 print:ring-0 print:bg-white">
        <div className="bg-white border border-gray-150/40 rounded-[calc(2rem-0.375rem)] p-6 md:p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] print:border-0 print:shadow-none print:p-0">
          
          {/* Invoice Header */}
          <div className="border-b border-gray-100 pb-6 flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div className="space-y-1">
              <span className="bg-primary/5 text-primary text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full">Nota Penjualan</span>
              <h2 className="text-2xl font-extrabold text-primary font-heading mt-2">{transaction.nomor_bon}</h2>
              <p className="text-gray-500 text-sm font-medium">Tanggal: {transaction.tanggal.split('T')[0]}</p>
            </div>
            
            <div className="flex flex-col items-start md:items-end gap-2">
              <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase ${
                transaction.status === 'Lunas'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}>
                {transaction.status === 'Lunas' ? <CheckCircle size={12} /> : <Clock size={12} />}
                {transaction.status}
              </span>
              {transaction.status === 'Lunas' && transaction.tanggal_lunas && (
                <p className="text-xs text-gray-500 font-semibold">Lunas pada: {transaction.tanggal_lunas.split('T')[0]}</p>
              )}
            </div>
          </div>

          {/* Customer and Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-b border-gray-100">
            <div className="space-y-3">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <User size={14} /> Pelanggan
              </h3>
              <div>
                <p className="text-lg font-extrabold text-primary">{customer ? customer.nama : "Pelanggan Umum"}</p>
                {customer && customer.bonus_threshold > 0 && (
                  <p className="text-xs text-cta font-bold mt-1">Target Bonus: {formatRupiah(customer.bonus_threshold)}</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <FileText size={14} /> Keterangan Nota
              </h3>
              <p className="text-sm text-primary/80 font-medium whitespace-pre-wrap">{transaction.deskripsi || '-'}</p>
              {transaction.is_bonus && (
                <div className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-black">
                  <Gift size={12} /> BON BONUS / HADIAH
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="py-6 space-y-4">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider">Daftar Barang Jual</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-150 text-xs text-gray-400 uppercase font-bold">
                    <th className="pb-3 w-1/3">Nama Produk</th>
                    <th className="pb-3 text-center">Jumlah (Qty)</th>
                    <th className="pb-3 text-right">Harga Satuan</th>
                    <th className="pb-3 text-right">Harga Setelah Diskon</th>
                    <th className="pb-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {transaction.items && transaction.items.map((item, index) => {
                    const prod = products.find(p => p.id === item.product_id);
                    const steps = customer ? getDiscountsForProductType(customer, item.product_type_snapshot) : [];
                    
                    // Trace cascading discount prices
                    let runningPrice = Number(item.harga_base_snapshot);
                    const traceSteps = [];
                    steps.forEach((pct) => {
                      const amount = Math.round(runningPrice * (pct / 100));
                      runningPrice -= amount;
                      traceSteps.push({ percentage: pct, minus: amount, result: runningPrice });
                    });

                    return (
                      <tr key={item.id || index} className="align-top font-medium">
                        <td className="py-4">
                          <p className="font-extrabold text-primary">{prod ? prod.nama : "Produk"}</p>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{item.product_type_snapshot}</span>
                          
                          {/* Visual Cascading Steps Details */}
                          {traceSteps.length > 0 && !item.is_bonus_item && (
                            <div className="mt-2 text-xs text-gray-500 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-gray-100 font-mono no-print">
                              <span className="font-bold text-primary/70">Visual Rincian Diskon Bertingkat:</span>
                              <div className="pl-2">Harga Jual Base: {formatRupiah(item.harga_base_snapshot)}</div>
                              {traceSteps.map((step, sIdx) => (
                                <div key={sIdx} className="pl-4">
                                  Langkah {sIdx + 1} (Diskon {step.percentage}%): - {formatRupiah(step.minus)} &rarr; {formatRupiah(step.result)}
                                </div>
                              ))}
                              <div className="font-bold pl-2 pt-1 border-t border-gray-200/50 mt-1 text-primary">Final per Box: {formatRupiah(item.discounted_unit_price)}</div>
                            </div>
                          )}

                          {item.is_bonus_item && (
                            <span className="text-xs font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md mt-1 inline-block">Bonus Item (Rp 0)</span>
                          )}
                        </td>
                        <td className="py-4 text-center text-primary font-bold">{item.quantity} Box</td>
                        <td className="py-4 text-right text-gray-500 font-mono tabular-nums">{formatRupiah(item.harga_base_snapshot)}</td>
                        <td className="py-4 text-right text-primary font-bold font-mono tabular-nums">{item.is_bonus_item ? formatRupiah(0) : formatRupiah(item.discounted_unit_price)}</td>
                        <td className="py-4 text-right font-extrabold text-primary font-mono tabular-nums">{formatRupiah(item.line_omzet)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Section */}
          <div className="border-t border-gray-150 pt-6 flex flex-col md:flex-row md:justify-between gap-6">
            <div className="no-print w-full md:w-1/2">
              {/* Laba Bersih Info - Only visible to Owner on screen, hidden on Print */}
              <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                <p className="text-xs text-primary/75 font-bold uppercase tracking-wider">💜 Rincian Internal Pemilik Bisnis</p>
                <div className="mt-2 space-y-1.5 text-sm font-semibold text-primary">
                  <div className="flex justify-between">
                    <span>Total Keuntungan (Laba Bersih):</span>
                    <span className="font-bold font-mono tabular-nums">{formatRupiah(transaction.laba_total)}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1 font-medium">Nota: Rincian ini tidak akan ikut tercetak ketika nota dicetak atau diekspor ke PDF.</p>
                </div>
              </div>
            </div>

            <div className="w-full md:w-1/3 space-y-3 font-bold text-sm">
              <div className="flex justify-between text-primary/80">
                <span>Omzet Belanja:</span>
                <span className="font-mono tabular-nums">{formatRupiah(transaction.omzet_total)}</span>
              </div>
              <div className="flex justify-between text-primary/80 border-b border-gray-100 pb-3">
                <span>Ongkos Kirim (Ongkir):</span>
                <span className="font-mono tabular-nums">{formatRupiah(transaction.ongkir)}</span>
              </div>
              <div className="flex justify-between text-lg text-primary font-extrabold">
                <span>Total Bayar:</span>
                <span className="font-mono text-primary tabular-nums">{formatRupiah(transaction.amount_owed)}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Settle Action Panel (No Print) */}
      {transaction.status === 'Piutang' && (
        <div className="bg-amber-50/50 ring-1 ring-amber-100 p-1.5 rounded-[2rem] shadow-sm no-print">
          <div className="bg-white border border-amber-100/50 rounded-[calc(2rem-0.375rem)] p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-extrabold text-primary text-base">🔴 Pembayaran Belum Lunas</h4>
              <p className="text-sm text-gray-500 font-semibold mt-1">Tekan tombol di sebelah kanan jika pelanggan sudah membayar lunas bon ini.</p>
            </div>
            <button 
              onClick={() => setIsSettleConfirmOpen(true)}
              disabled={settling}
              className="bg-cta hover:bg-cta/90 disabled:bg-gray-300 text-primary text-sm font-black px-6 py-3.5 rounded-full shadow-lg transition-all active:scale-95 cursor-pointer whitespace-nowrap"
            >
              {settling ? 'Memproses...' : 'LUNASKAN BON INI'}
            </button>
          </div>
        </div>
      )}

      {/* Custom Settle Confirmation Modal */}
      <ConfirmModal
        isOpen={isSettleConfirmOpen}
        title="Setor Lunas Bon"
        message="Apakah Bapak/Ibu yakin ingin melunaskan bon ini sekarang? Pembayaran akan dicatat dalam kas hari ini."
        onConfirm={handleSettle}
        onCancel={() => setIsSettleConfirmOpen(false)}
        confirmLabel="YA, LUNASKAN"
        cancelLabel="BATAL"
      />
    </div>
  );
}
