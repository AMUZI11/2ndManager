"use client";
import React, { useState } from 'react';
import { 
  Gamepad2, RotateCcw, ShoppingCart, CheckCircle2, 
  ArrowRight, Calculator, Receipt, Plus, Minus, X, Check
} from 'lucide-react';

const DUMMY_PRODUCTS = [
  { id: 'P1', name: 'LM Jeruk Segar 500ml', type: 'LM', price: 15000, cost: 11000 },
  { id: 'P2', name: 'LM Apel Manis 500ml', type: 'LM', price: 18000, cost: 13500 },
  { id: 'P3', name: 'BR Cokelat Creamy', type: 'BR', price: 12000, cost: 8500 },
];

const DUMMY_CUSTOMERS = [
  { 
    id: 'C1', 
    name: 'Toko Kelontong Bu Retno (VIP)', 
    discounts: { LM: [20, 10], BR: [10] } 
  },
  { 
    id: 'C2', 
    name: 'Warung Berkah Jaya (Diskon Reguler)', 
    discounts: { LM: [15], BR: [5] } 
  },
  { 
    id: 'C3', 
    name: 'Pelanggan Umum (Tanpa Diskon)', 
    discounts: { LM: [], BR: [] } 
  }
];

const INITIAL_DEBTS = [
  { id: 'B-01', noBon: 'BON-LAT-001', customer: 'Toko Bu Retno', date: 'Hari Ini', total: 108000, status: 'Piutang' },
  { id: 'B-02', noBon: 'BON-LAT-002', customer: 'Warung Berkah Jaya', date: 'Kemarin', total: 153000, status: 'Piutang' },
];

export default function CashierSandbox() {
  const [activeTab, setActiveTab] = useState('kasus-a'); // 'kasus-a' | 'kasus-b' | 'kasus-c'

  // State Kasus A
  const [selectedCustomer, setSelectedCustomer] = useState(DUMMY_CUSTOMERS[0]);
  const [selectedProduct, setSelectedProduct] = useState(DUMMY_PRODUCTS[0]);
  const [quantity, setQuantity] = useState(10);
  const [isVirtualReceiptOpen, setIsVirtualReceiptOpen] = useState(false);
  const [lastSavedReceipt, setLastSavedReceipt] = useState(null);

  // State Kasus B
  const [debts, setDebts] = useState(INITIAL_DEBTS);
  const [settledTotal, setSettledTotal] = useState(0);

  // State Kasus C
  const [calcPrice, setCalcPrice] = useState(20000);
  const [calcQty, setCalcQty] = useState(10);
  const [calcDisc1, setCalcDisc1] = useState(20);
  const [calcDisc2, setCalcDisc2] = useState(10);

  const handleResetAll = () => {
    setSelectedCustomer(DUMMY_CUSTOMERS[0]);
    setSelectedProduct(DUMMY_PRODUCTS[0]);
    setQuantity(10);
    setIsVirtualReceiptOpen(false);
    setLastSavedReceipt(null);
    setDebts(INITIAL_DEBTS);
    setSettledTotal(0);
    setCalcPrice(20000);
    setCalcQty(10);
    setCalcDisc1(20);
    setCalcDisc2(10);
  };

  const formatRupiah = (num) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
  };

  const calculateKasusA = () => {
    const grossTotal = selectedProduct.price * quantity;
    const prodDiscounts = selectedCustomer.discounts[selectedProduct.type] || [];
    
    let currentAmount = grossTotal;
    let step1Discount = 0;
    let step2Discount = 0;

    if (prodDiscounts.length > 0) {
      step1Discount = Math.round(currentAmount * (prodDiscounts[0] / 100));
      currentAmount -= step1Discount;
    }
    if (prodDiscounts.length > 1) {
      step2Discount = Math.round(currentAmount * (prodDiscounts[1] / 100));
      currentAmount -= step2Discount;
    }

    const netTotal = currentAmount;
    const totalSavings = grossTotal - netTotal;

    return { grossTotal, step1Discount, step2Discount, netTotal, totalSavings, prodDiscounts };
  };

  const kasusACalc = calculateKasusA();

  const handleSaveSimulatedBon = () => {
    const receiptData = {
      noBon: 'BON-SIMULASI-' + Math.floor(100 + Math.random() * 900),
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
      customer: selectedCustomer.name,
      product: selectedProduct.name,
      price: selectedProduct.price,
      qty: quantity,
      ...kasusACalc
    };
    setLastSavedReceipt(receiptData);
    setIsVirtualReceiptOpen(true);
  };

  const handleSettleDebt = (id) => {
    setDebts(prev => prev.map(item => {
      if (item.id === id) {
        setSettledTotal(curr => curr + item.total);
        return { ...item, status: 'Lunas' };
      }
      return item;
    }));
  };

  const calcGross = calcPrice * calcQty;
  const calcPotongan1 = Math.round(calcGross * (calcDisc1 / 100));
  const calcAfter1 = calcGross - calcPotongan1;
  const calcPotongan2 = Math.round(calcAfter1 * (calcDisc2 / 100));
  const calcFinal = calcAfter1 - calcPotongan2;
  const calcTotalPotongan = calcPotongan1 + calcPotongan2;
  const calcPersenEfektif = calcGross > 0 ? ((calcTotalPotongan / calcGross) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner Sandbox Indicator & Cadmium Red Reset Button */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border-2 border-slate-900 shadow-[4px_4px_0px_#1E293B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#CCFF00] text-slate-900 flex items-center justify-center font-black shrink-0 border-2 border-slate-800 shadow-[2px_2px_0px_#000]">
            <Gamepad2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <h3 className="text-sm sm:text-base font-display font-black uppercase text-white tracking-wide">
                Ruang Latihan Kasir (Stateless Sandbox)
              </h3>
            </div>
            <p className="text-xs font-mono text-slate-300 mt-0.5">
              Area aman tanpa database. Bebas latihan input bon dan kasbon tanpa takut merusak pembukuan toko.
            </p>
          </div>
        </div>

        <button
          onClick={handleResetAll}
          className="w-full sm:w-auto h-10 px-4 bg-[#E30022] hover:bg-[#c2001d] text-white font-mono font-bold text-xs uppercase rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_#000] flex items-center justify-center gap-2 cursor-pointer transition-all active:translate-y-0.5 shrink-0"
        >
          <RotateCcw size={14} />
          <span>RESET SEMUA LATIHAN</span>
        </button>
      </div>

      {/* Sub-Nav Mini-Games (3 Kasus) */}
      <div className="bg-white/70 backdrop-blur-md p-1.5 rounded-2xl border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B] grid grid-cols-3 gap-1.5">
        <button
          onClick={() => setActiveTab('kasus-a')}
          className={`h-11 rounded-xl font-mono font-bold text-xs uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'kasus-a'
              ? 'bg-[#CCFF00] text-slate-900 border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShoppingCart size={15} />
          <span className="hidden sm:inline">KASUS A:</span> <span>INPUT BON</span>
        </button>
        <button
          onClick={() => setActiveTab('kasus-b')}
          className={`h-11 rounded-xl font-mono font-bold text-xs uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'kasus-b'
              ? 'bg-[#CCFF00] text-slate-900 border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CheckCircle2 size={15} />
          <span className="hidden sm:inline">KASUS B:</span> <span>SETOR KASBON</span>
        </button>
        <button
          onClick={() => setActiveTab('kasus-c')}
          className={`h-11 rounded-xl font-mono font-bold text-xs uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'kasus-c'
              ? 'bg-[#CCFF00] text-slate-900 border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calculator size={15} />
          <span className="hidden sm:inline">KASUS C:</span> <span>LOGIKA DISKON</span>
        </button>
      </div>

      {/* Solid Ground Content Panel */}
      <div className="bg-white rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] p-6">
        {/* KASUS A: INPUT BON */}
        {activeTab === 'kasus-a' && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-black bg-slate-900 text-[#CCFF00] px-2 py-0.5 rounded">
                  STUDI KASUS 1
                </span>
                <h4 className="text-base font-display font-black text-slate-900 uppercase">
                  Latihan Membuat Bon &amp; Pengujian VIP Discount Engine
                </h4>
              </div>
              <p className="text-xs font-sans text-slate-600 mt-1">
                Pilih pelanggan VIP dan amati bagaimana sistem memotong diskon bertingkat (Tahap 1 lalu Tahap 2) secara otomatis.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase">
                    1. Pilih Pelanggan Latihan:
                  </label>
                  <select
                    value={selectedCustomer.id}
                    onChange={(e) => {
                      const found = DUMMY_CUSTOMERS.find(c => c.id === e.target.value);
                      if (found) setSelectedCustomer(found);
                    }}
                    className="w-full h-11 bg-slate-50 border-2 border-slate-800 rounded-xl px-3 text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#CCFF00]"
                  >
                    {DUMMY_CUSTOMERS.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase">
                    2. Pilih Produk Latihan:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {DUMMY_PRODUCTS.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedProduct(p)}
                        className={`p-3 rounded-xl border-2 text-left cursor-pointer transition-all ${
                          selectedProduct.id === p.id
                            ? 'bg-amber-50 border-slate-900 shadow-[2px_2px_0px_#1E293B]'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        <span className="text-[9px] font-mono font-bold bg-slate-900 text-white px-1 py-0.5 rounded">
                          {p.type}
                        </span>
                        <p className="text-xs font-bold text-slate-900 mt-1 line-clamp-1">{p.name}</p>
                        <p className="text-[11px] font-mono text-slate-600">{formatRupiah(p.price)}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase">
                    3. Jumlah Pembelian (Qty):
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="w-11 h-11 bg-slate-100 border-2 border-slate-800 rounded-xl flex items-center justify-center font-bold text-slate-900 hover:bg-slate-200 cursor-pointer"
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 h-11 bg-slate-50 border-2 border-slate-800 rounded-xl text-center font-mono font-black text-base text-slate-900 outline-none"
                    />
                    <button
                      onClick={() => setQuantity(q => q + 1)}
                      className="w-11 h-11 bg-slate-100 border-2 border-slate-800 rounded-xl flex items-center justify-center font-bold text-slate-900 hover:bg-slate-200 cursor-pointer"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveSimulatedBon}
                  className="btn-arcade w-full h-12 bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 font-mono font-black text-xs uppercase rounded-xl border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B] flex items-center justify-center gap-2 cursor-pointer transition-all active:translate-y-0.5 mt-2"
                >
                  <Receipt size={16} />
                  <span>SIMPAN BON LATIHAN &amp; LIHAT STRUK</span>
                </button>
              </div>

              <div className="bg-slate-50 border-2 border-slate-800 rounded-2xl p-5 shadow-[3px_3px_0px_#1E293B] space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-mono font-bold text-slate-700 uppercase">Radar Kalkulasi Bon:</span>
                  <span className="text-[10px] font-mono font-black bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded">
                    OTOMATIS
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-slate-600">
                    <span>Harga Kotor ({quantity} x {formatRupiah(selectedProduct.price)})</span>
                    <span className="font-bold text-slate-900">{formatRupiah(kasusACalc.grossTotal)}</span>
                  </div>

                  {kasusACalc.prodDiscounts.length > 0 ? (
                    <>
                      <div className="flex justify-between text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200">
                        <span>Potongan Tahap 1 ({kasusACalc.prodDiscounts[0]}%)</span>
                        <span className="font-bold">- {formatRupiah(kasusACalc.step1Discount)}</span>
                      </div>

                      {kasusACalc.prodDiscounts.length > 1 && (
                        <div className="flex justify-between text-purple-600 bg-purple-50 p-2 rounded-lg border border-purple-200">
                          <span>Potongan Tahap 2 ({kasusACalc.prodDiscounts[1]}% dari sisa)</span>
                          <span className="font-bold">- {formatRupiah(kasusACalc.step2Discount)}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-slate-400 italic text-[11px] py-1">
                      (Pelanggan ini tidak memiliki diskon bertingkat untuk kategori {selectedProduct.type})
                    </div>
                  )}

                  <div className="border-t-2 border-dashed border-slate-300 pt-3 flex justify-between items-center text-slate-900 font-black text-sm">
                    <span>TOTAL BAYAR:</span>
                    <span className="text-base text-emerald-700 font-display">{formatRupiah(kasusACalc.netTotal)}</span>
                  </div>

                  {kasusACalc.totalSavings > 0 && (
                    <div className="bg-amber-100 text-amber-900 border border-amber-300 p-2.5 rounded-xl text-center text-[11px] font-bold">
                      🎉 Pelanggan hemat {formatRupiah(kasusACalc.totalSavings)} berkat Diskon VIP!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {/* KASUS B: PELUNASAN KASBON */}
        {activeTab === 'kasus-b' && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-black bg-slate-900 text-[#CCFF00] px-2 py-0.5 rounded">
                    STUDI KASUS 2
                  </span>
                  <h4 className="text-base font-display font-black text-slate-900 uppercase">
                    Latihan Pelunasan Piutang / Kasbon Pelanggan
                  </h4>
                </div>
                <p className="text-xs font-sans text-slate-600 mt-1">
                  Amati bagaimana status kasbon berubah warna dan omzet lunas bertambah saat uang setoran diterima.
                </p>
              </div>

              <div className="bg-emerald-50 border-2 border-emerald-600 p-2.5 px-4 rounded-xl shadow-[2px_2px_0px_#059669]">
                <p className="text-[10px] font-mono font-bold text-emerald-700 uppercase">Omzet Latihan Bertambah:</p>
                <p className="text-base font-display font-black text-emerald-900">{formatRupiah(settledTotal)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {debts.map((item) => {
                const isLunas = item.status === 'Lunas';
                return (
                  <div 
                    key={item.id}
                    className={`border-2 rounded-2xl p-5 transition-all shadow-[3px_3px_0px_#1E293B] ${
                      isLunas 
                        ? 'bg-emerald-50/50 border-emerald-500' 
                        : 'bg-rose-50/50 border-rose-400'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-[10px] font-mono font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
                          {item.noBon}
                        </span>
                        <h5 className="text-sm font-bold text-slate-900 mt-1">{item.customer}</h5>
                        <p className="text-[10px] font-mono text-slate-500">Tanggal Nota: {item.date}</p>
                      </div>

                      <span className={`text-[11px] font-mono font-black px-2.5 py-1 rounded-lg border flex items-center gap-1 ${
                        isLunas 
                          ? 'bg-emerald-500 text-white border-emerald-600 shadow-[1px_1px_0px_#047857]' 
                          : 'bg-[#E30022] text-white border-slate-900 shadow-[1px_1px_0px_#000]'
                      }`}>
                        {isLunas ? <Check size={13} /> : null}
                        {item.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-mono text-slate-500">Nominal Tagihan:</p>
                        <p className="text-sm font-mono font-black text-slate-900">{formatRupiah(item.total)}</p>
                      </div>

                      {isLunas ? (
                        <span className="text-xs font-mono font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 size={16} /> Sudah Diterima
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSettleDebt(item.id)}
                          className="btn-arcade bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 font-mono font-bold text-xs uppercase h-9 px-3 rounded-xl border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] cursor-pointer transition-all active:translate-y-0.5 flex items-center gap-1.5"
                        >
                          <span>TERIMA SETORAN</span>
                          <ArrowRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* KASUS C: KALKULATOR LOGIKA DISKON */}
        {activeTab === 'kasus-c' && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-black bg-slate-900 text-[#CCFF00] px-2 py-0.5 rounded">
                  STUDI KASUS 3
                </span>
                <h4 className="text-base font-display font-black text-slate-900 uppercase">
                  Visualisasi Rumus Diskon Bertingkat (Mengapa 20% + 10% ≠ 30%?)
                </h4>
              </div>
              <p className="text-xs font-sans text-slate-600 mt-1">
                Ubah nominal harga dan diskon di bawah ini untuk melihat animasi logika perhitungan bisnis yang melindungi margin toko Anda.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B]">
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase">
                    Harga Satuan (Rp):
                  </label>
                  <input 
                    type="number" 
                    step="1000"
                    value={calcPrice}
                    onChange={(e) => setCalcPrice(Math.max(1000, parseInt(e.target.value) || 0))}
                    className="w-full h-10 bg-white border-2 border-slate-800 rounded-xl px-3 font-mono font-bold text-xs text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase">
                    Jumlah Barang:
                  </label>
                  <input 
                    type="number" 
                    min="1"
                    value={calcQty}
                    onChange={(e) => setCalcQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full h-10 bg-white border-2 border-slate-800 rounded-xl px-3 font-mono font-bold text-xs text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono font-bold text-slate-700 uppercase">
                    <span>Diskon Tahap 1:</span>
                    <span className="text-rose-600 font-black">{calcDisc1}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="50" 
                    value={calcDisc1}
                    onChange={(e) => setCalcDisc1(parseInt(e.target.value))}
                    className="w-full accent-[#E30022] cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono font-bold text-slate-700 uppercase">
                    <span>Diskon Tahap 2:</span>
                    <span className="text-purple-600 font-black">{calcDisc2}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="30" 
                    value={calcDisc2}
                    onChange={(e) => setCalcDisc2(parseInt(e.target.value))}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                </div>
              </div>

              <div className="lg:col-span-2 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50 border-2 border-slate-800 p-4 rounded-xl shadow-[2px_2px_0px_#1E293B]">
                    <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">1. Total Dasar</span>
                    <p className="text-base font-display font-black text-slate-900 mt-1">{formatRupiah(calcGross)}</p>
                    <p className="text-[10px] font-mono text-slate-500 mt-1">{calcQty} x {formatRupiah(calcPrice)}</p>
                  </div>

                  <div className="bg-rose-50 border-2 border-rose-400 p-4 rounded-xl shadow-[2px_2px_0px_#E30022]">
                    <span className="text-[10px] font-mono font-bold text-rose-700 uppercase">2. Diskon 1 ({calcDisc1}%)</span>
                    <p className="text-base font-display font-black text-rose-900 mt-1">- {formatRupiah(calcPotongan1)}</p>
                    <p className="text-[10px] font-mono text-rose-700 mt-1">Sisa: {formatRupiah(calcAfter1)}</p>
                  </div>

                  <div className="bg-purple-50 border-2 border-purple-400 p-4 rounded-xl shadow-[2px_2px_0px_#9333EA]">
                    <span className="text-[10px] font-mono font-bold text-purple-700 uppercase">3. Diskon 2 ({calcDisc2}%)</span>
                    <p className="text-base font-display font-black text-purple-900 mt-1">- {formatRupiah(calcPotongan2)}</p>
                    <p className="text-[10px] font-mono text-purple-700 mt-1">Dari sisa: {formatRupiah(calcAfter1)}</p>
                  </div>
                </div>

                <div className="bg-[#CCFF00]/20 border-2 border-slate-900 rounded-2xl p-5 shadow-[4px_4px_0px_#1E293B] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-mono font-bold text-slate-700 uppercase">
                      HARGA AKHIR YANG HARUS DIBAYAR:
                    </span>
                    <p className="text-2xl font-display font-black text-slate-900 mt-0.5">
                      {formatRupiah(calcFinal)}
                    </p>
                    <p className="text-xs font-mono font-bold text-emerald-800 mt-1">
                      Total Potongan Riil: {formatRupiah(calcTotalPotongan)} (Setara Diskon Tunggal {calcPersenEfektif}%)
                    </p>
                  </div>

                  <div className="bg-white border-2 border-slate-800 p-3 rounded-xl text-center shadow-[2px_2px_0px_#1E293B] shrink-0">
                    <p className="text-[10px] font-mono font-bold text-slate-500 uppercase">Bukan 30% Tapi:</p>
                    <p className="text-lg font-display font-black text-emerald-700">{calcPersenEfektif}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* VIRTUAL MOCK RECEIPT MODAL (NO WINDOW.PRINT - ZERO PAPER WASTE) */}
      {isVirtualReceiptOpen && lastSavedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border-2 border-slate-900 rounded-2xl w-full max-w-sm shadow-[8px_8px_0px_#1E293B] overflow-hidden">
            <div className="bg-slate-900 text-white p-4 border-b-2 border-slate-900 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Receipt size={16} className="text-[#CCFF00]" />
                <h4 className="text-xs font-mono font-bold uppercase text-[#CCFF00]">
                  STRUK TERMAL VIRTUAL (SIMULASI)
                </h4>
              </div>
              <button
                onClick={() => setIsVirtualReceiptOpen(false)}
                className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-6 bg-[#FAF9F6] font-mono text-xs text-slate-800 space-y-3">
              <div className="text-center border-b border-dashed border-slate-400 pb-3">
                <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                  LATIHAN KASIR — BUKTI SIMULASI
                </span>
                <p className="font-black text-sm text-slate-900 mt-1 uppercase">TOKO LATIHAN POS</p>
                <p className="text-[10px] text-slate-500">{lastSavedReceipt.date} • {lastSavedReceipt.time}</p>
                <p className="text-[10px] text-slate-600 font-bold mt-0.5">No: {lastSavedReceipt.noBon}</p>
              </div>

              <div className="space-y-1.5 py-1">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>{lastSavedReceipt.product}</span>
                  <span>{formatRupiah(lastSavedReceipt.grossTotal)}</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {lastSavedReceipt.qty} unit x {formatRupiah(lastSavedReceipt.price)}
                </div>

                {lastSavedReceipt.step1Discount > 0 && (
                  <div className="flex justify-between text-rose-600 text-[11px]">
                    <span>Diskon Utama ({lastSavedReceipt.prodDiscounts[0]}%)</span>
                    <span>- {formatRupiah(lastSavedReceipt.step1Discount)}</span>
                  </div>
                )}
                {lastSavedReceipt.step2Discount > 0 && (
                  <div className="flex justify-between text-purple-600 text-[11px]">
                    <span>Diskon Ekstra ({lastSavedReceipt.prodDiscounts[1]}%)</span>
                    <span>- {formatRupiah(lastSavedReceipt.step2Discount)}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-dashed border-slate-400 pt-3 space-y-1">
                <div className="flex justify-between font-black text-sm text-slate-900">
                  <span>TOTAL NETTO:</span>
                  <span>{formatRupiah(lastSavedReceipt.netTotal)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>Pelanggan:</span>
                  <span className="font-bold">{lastSavedReceipt.customer}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>Status:</span>
                  <span className="font-bold text-emerald-700">LUNAS (SIMULASI)</span>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-300 p-2.5 rounded-xl text-center text-[10px] text-emerald-900 font-bold mt-4">
                🌿 Perlindungan Hardware Aktif: Struk ini hanya ditampilkan di layar untuk melatih kasir tanpa menghabiskan kertas printer fisik Anda.
              </div>
            </div>

            <div className="p-4 bg-white border-t-2 border-slate-900 flex justify-end">
              <button
                onClick={() => setIsVirtualReceiptOpen(false)}
                className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-[#CCFF00] font-mono font-bold text-xs uppercase rounded-xl border-2 border-slate-800 cursor-pointer shadow-[2px_2px_0px_#1E293B]"
              >
                TUTUP PRATINJAU STRUK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
