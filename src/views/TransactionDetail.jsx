"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Printer, CheckCircle, Clock, Gift, FileText, User, Sparkles } from 'lucide-react';
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

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
  };

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
          <div className="w-10 h-10 border-4 border-slate-900 border-t-[#CCFF00] rounded-full animate-spin mx-auto" />
          <p className="text-sm font-mono font-bold text-slate-700">Memuat Rincian Bon...</p>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
        <p className="text-base font-bold font-mono text-rose-600">Bon tidak ditemukan.</p>
        <button 
          onClick={() => {
            if (setView) setView("dashboard");
            else router.push("/dashboard");
          }} 
          className="btn-arcade bg-slate-900 text-[#CCFF00] border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] px-5 py-2.5 rounded-xl font-mono text-xs uppercase font-bold cursor-pointer"
        >
          Kembali ke Dashboard
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
    <div className="space-y-6 pb-32">
      {/* Top Header Buttons (No Print) */}
      <div className="flex justify-between items-center no-print">
        <button 
          onClick={() => {
            if (setView) setView("dashboard");
            else router.back();
          }} 
          className="btn-arcade flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] hover:bg-slate-50 text-slate-900 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer"
        >
          <ArrowLeft size={16} /> Kembali
        </button>

        <div className="flex gap-2">
          <button 
            onClick={handlePrint}
            className="btn-arcade flex items-center gap-2 px-5 py-2 bg-slate-900 text-[#CCFF00] border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] rounded-xl font-mono text-xs font-bold transition-all hover:bg-slate-800 cursor-pointer"
          >
            <Printer size={16} /> Cetak Nota
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="bg-emerald-50 border-2 border-emerald-500 text-emerald-900 p-4 rounded-xl flex items-center gap-3 animate-slide-in no-print shadow-[3px_3px_0px_#059669]">
          <CheckCircle className="text-emerald-700" size={18} />
          <span className="font-mono font-bold text-xs">{successMsg}</span>
        </div>
      )}

      {/* Pop-Art Solid Ground Invoice Card Container */}
      <div className="bg-white border-2 border-slate-800 rounded-2xl p-6 md:p-8 shadow-[5px_5px_0px_#1E293B] print:border-0 print:shadow-none print:p-0">
        
        {/* Invoice Header */}
        <div className="border-b-2 border-slate-200 pb-6 flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div className="space-y-1">
            <span className="bg-slate-900 text-[#CCFF00] text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-0.5 rounded border border-slate-800 inline-block">
              NOTA PENJUALAN KASIR
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display mt-2 uppercase">{transaction.nomor_bon}</h2>
            <p className="text-slate-600 text-xs font-mono">Tanggal: {transaction.tanggal.split('T')[0]}</p>
          </div>
          
          <div className="flex flex-col items-start md:items-end gap-2">
            {/* Pop-Art Tilted Status Stamp */}
            <div className={`transform -rotate-2 hover:rotate-0 transition-transform inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-mono font-black uppercase border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B] ${
              transaction.status === 'Lunas'
                ? 'bg-[#CCFF00] text-slate-900'
                : 'bg-amber-300 text-slate-900'
            }`}>
              {transaction.status === 'Lunas' ? <CheckCircle size={14} /> : <Clock size={14} />}
              <span>STEMPEL: {transaction.status}</span>
            </div>
            {transaction.status === 'Lunas' && transaction.tanggal_lunas && (
              <p className="text-xs text-slate-500 font-mono">Lunas pada: {transaction.tanggal_lunas.split('T')[0]}</p>
            )}
          </div>
        </div>

        {/* Customer and Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-b-2 border-slate-200">
          <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-300">
            <h3 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <User size={14} /> INFORMASI PELANGGAN
            </h3>
            <div>
              <p className="text-base font-extrabold text-slate-900 font-sans uppercase">{customer ? customer.nama : "Pelanggan Umum"}</p>
              {customer && customer.bonus_threshold > 0 && (
                <p className="text-xs text-slate-600 font-mono mt-1">Target Reward: {formatRupiah(customer.bonus_threshold)}</p>
              )}
            </div>
          </div>

          <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-300">
            <h3 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={14} /> KETERANGAN NOTA
            </h3>
            <p className="text-xs text-slate-800 font-sans whitespace-pre-wrap">{transaction.deskripsi || 'Tidak ada catatan tambahan.'}</p>
            {transaction.is_bonus && (
              <div className="inline-flex items-center gap-1 bg-[#CCFF00] text-slate-900 border border-slate-800 px-2 py-0.5 rounded text-xs font-mono font-bold">
                <Gift size={12} /> BON BONUS / REWARD
              </div>
            )}
          </div>
        </div>

        {/* Items Table (Zona Mesin) */}
        <div className="py-6 space-y-4">
          <h3 className="text-xs font-mono font-bold text-slate-800 uppercase tracking-wider">DAFTAR BARANG BELANJA</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-slate-800 bg-white rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-800 font-mono text-[11px] text-slate-700 uppercase tracking-wider">
                  <th className="py-3 px-3.5 w-1/3">PRODUK</th>
                  <th className="py-3 px-3 text-center">QTY</th>
                  <th className="py-3 px-3 text-right">HARGA BASE</th>
                  <th className="py-3 px-3 text-right">SETELAH DISKON</th>
                  <th className="py-3 px-3.5 text-right">SUBTOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs font-mono text-slate-900">
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
                    <tr key={item.id || index} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-3.5">
                        <p className="font-bold text-slate-900 font-sans text-sm">{prod ? prod.nama : "Produk"}</p>
                        <span className="text-[10px] text-slate-500 font-mono uppercase bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300 inline-block mt-0.5">
                          {item.product_type_snapshot}
                        </span>
                        
                        {/* Visual Cascading Steps Details */}
                        {traceSteps.length > 0 && !item.is_bonus_item && (
                          <div className="mt-2 text-[11px] text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-300 font-mono no-print">
                            <span className="font-bold text-slate-800">Rincian Diskon Bertingkat:</span>
                            <div className="pl-2">Harga Base: {formatRupiah(item.harga_base_snapshot)}</div>
                            {traceSteps.map((step, sIdx) => (
                              <div key={sIdx} className="pl-3">
                                Langkah {sIdx + 1} ({step.percentage}%): - {formatRupiah(step.minus)} &rarr; {formatRupiah(step.result)}
                              </div>
                            ))}
                            <div className="font-bold pl-2 pt-1 border-t border-slate-300 mt-1 text-slate-900">
                              Final per Box: {formatRupiah(item.discounted_unit_price)}
                            </div>
                          </div>
                        )}

                        {item.is_bonus_item && (
                          <span className="text-[10px] font-bold text-slate-900 bg-[#CCFF00] border border-slate-800 px-2 py-0.5 rounded mt-1 inline-block">Bonus Item (Rp 0)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold">{item.quantity} Box</td>
                      <td className="py-3.5 px-3 text-right text-slate-600 tabular-nums">{formatRupiah(item.harga_base_snapshot)}</td>
                      <td className="py-3.5 px-3 text-right font-bold tabular-nums">{item.is_bonus_item ? formatRupiah(0) : formatRupiah(item.discounted_unit_price)}</td>
                      <td className="py-3.5 px-3.5 text-right font-extrabold tabular-nums">{formatRupiah(item.line_omzet)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Section */}
        <div className="border-t-2 border-slate-200 pt-6 flex flex-col md:flex-row md:justify-between gap-6">
          <div className="no-print w-full md:w-1/2">
            {/* Laba Bersih Info - Only visible to Owner on screen, hidden on Print */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-300">
              <p className="text-xs text-slate-700 font-mono font-bold uppercase tracking-wider">
                💼 RINCIAN INTERNAL PEMILIK
              </p>
              <div className="mt-2 space-y-1 text-xs font-mono text-slate-800">
                <div className="flex justify-between font-bold text-emerald-800">
                  <span>Total Estimasi Laba Bersih:</span>
                  <span className="tabular-nums">{formatRupiah(transaction.laba_total)}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 font-sans">
                  *Rincian laba ini bersifat rahasia dan tidak akan ikut tercetak pada struk fisik nota.
                </p>
              </div>
            </div>
          </div>

          <div className="w-full md:w-1/3 space-y-2 font-mono text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal Belanja:</span>
              <span className="tabular-nums">{formatRupiah(transaction.omzet_total)}</span>
            </div>
            <div className="flex justify-between text-slate-600 border-b border-slate-200 pb-2">
              <span>Ongkos Kirim (Ongkir):</span>
              <span className="tabular-nums">{formatRupiah(transaction.ongkir)}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-slate-900 pt-1">
              <span>TOTAL BAYAR:</span>
              <span className="tabular-nums text-slate-900">{formatRupiah(transaction.amount_owed)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Settle Action Panel (No Print) */}
      {transaction.status === 'Piutang' && (
        <div className="bg-amber-500/10 border-2 border-amber-500 p-6 rounded-2xl shadow-[4px_4px_0px_#1E293B] no-print flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="font-extrabold text-slate-900 text-base font-display uppercase">🔴 Status: Piutang Belum Dilunasi</h4>
            <p className="text-xs font-sans text-slate-700">Tekan tombol di sebelah kanan jika pelanggan sudah menyelesaikan pembayaran bon ini.</p>
          </div>
          <button 
            onClick={() => setIsSettleConfirmOpen(true)}
            disabled={settling}
            className="btn-arcade bg-[#CCFF00] hover:bg-[#b3e600] disabled:bg-slate-200 text-slate-900 text-xs font-mono font-bold uppercase px-6 py-3.5 rounded-xl border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B] transition-all cursor-pointer whitespace-nowrap"
          >
            {settling ? 'MEMPROSES...' : 'LUNASKAN BON INI'}
          </button>
        </div>
      )}

      {/* Custom Settle Confirmation Modal */}
      <ConfirmModal
        isOpen={isSettleConfirmOpen}
        title="Setor Lunas Bon"
        message="Apakah Anda yakin ingin melunaskan bon ini sekarang? Pembayaran akan dicatat lunas ke sistem."
        onConfirm={handleSettle}
        onCancel={() => setIsSettleConfirmOpen(false)}
        confirmLabel="YA, LUNASKAN"
        cancelLabel="BATAL"
      />
    </div>
  );
}

