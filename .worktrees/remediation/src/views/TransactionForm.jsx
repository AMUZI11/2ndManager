"use client";
import React, { useState, useEffect } from 'react';
import { formatRupiah, getTerbacaRupiah } from '@/utils/format';
import { Plus, Trash2, Save, CheckCircle2, Gift } from 'lucide-react';
import { api, calculateCascadingDiscount } from '../utils/api';
import ConfirmModal from '../components/ConfirmModal';
import { useTutorial, ContextualTooltip } from '../components/TutorialEngine';



export default function TransactionForm({ setView, editTransactionId }) {
  const { registerTrigger, demoData, setDemoData } = useTutorial();

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomerBonusStatus, setSelectedCustomerBonusStatus] = useState({ bonuses_available: 0 });
  
  // Form States
  const [nomorBon, setNomorBon] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [ongkir, setOngkir] = useState("0");
  const [deskripsi, setDeskripsi] = useState("");
  const [isBonus, setIsBonus] = useState(false);
  const [status, setStatus] = useState("Piutang");
  const [items, setItems] = useState([]); // [{product_id, quantity}]

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [bonusWarning, setBonusWarning] = useState("");
  const [showExitTutorialConfirm, setShowExitTutorialConfirm] = useState(false);

  const isDemoActive = !!demoData;

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      try {
        const [custs, prods] = await Promise.all([
          api.getCustomers({ page_size: 9999 }),
          api.getProducts(null, { page_size: 9999 })
        ]);
        setCustomers(custs);
        setProducts(prods);

        if (isDemoActive) {
          // Load from tutorial demo sandbox data
          setNomorBon(demoData.nomor_bon);
          setTanggal(demoData.tanggal);
          setCustomerId(demoData.customer_id);
          setOngkir(demoData.ongkir.toString());
          setDeskripsi(demoData.deskripsi);
          setIsBonus(demoData.is_bonus);
          setStatus(demoData.status);
          setItems(demoData.items);
          if (demoData.customer_id) {
            const bStatus = await api.getCustomerBonusStatus(demoData.customer_id);
            setSelectedCustomerBonusStatus(bStatus);
          }
        } else if (editTransactionId) {
          // Load editing transaction
          const txs = await api.getTransactions();
          const tx = txs.find(t => t.id === editTransactionId);
          if (tx) {
            setNomorBon(tx.nomor_bon);
            setTanggal(tx.tanggal);
            setCustomerId(tx.customer_id);
            setOngkir(tx.ongkir.toString());
            setDeskripsi(tx.deskripsi || "");
            setIsBonus(tx.is_bonus);
            setStatus(tx.status);
            setItems(tx.items.map(item => ({
              product_id: item.product_id,
              quantity: item.quantity
            })));
            if (tx.customer_id) {
              const bStatus = await api.getCustomerBonusStatus(tx.customer_id);
              setSelectedCustomerBonusStatus(bStatus);
            }
          }
        } else {
          // Default new invoice
          generateInvoiceNumber();
          setTanggal(new Date().toISOString().split('T')[0]);
          setItems([]);
        }
      } catch (err) {
        console.error("Gagal memuat data formulir:", err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTransactionId, isDemoActive]);

  // Handle local state sync back to demo sandbox state if tutorial is running
  useEffect(() => {
    if (isDemoActive) {
      setDemoData({
        nomor_bon: nomorBon,
        tanggal,
        customer_id: customerId,
        ongkir: parseInt(ongkir) || 0,
        deskripsi,
        is_bonus: isBonus,
        status,
        items
      });
    }
  }, [nomorBon, tanggal, customerId, ongkir, deskripsi, isBonus, status, items, isDemoActive, setDemoData]);

  function generateInvoiceNumber() {
    const random = Math.floor(100 + Math.random() * 900);
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '').slice(2, 6);
    setNomorBon(`BON-${dateStr}-${random}`);
  };

  const handleCustomerChange = async (cid) => {
    setCustomerId(cid);
    registerTrigger("tx-customer-select", "change");
    if (!cid) {
      setSelectedCustomerBonusStatus({ bonuses_available: 0 });
      setBonusWarning("");
      return;
    }

    try {
      const bStatus = await api.getCustomerBonusStatus(cid);
      setSelectedCustomerBonusStatus(bStatus);
      if (isBonus && bStatus.bonuses_available <= 0) {
        setBonusWarning("Peringatan: Pelanggan ini tidak memiliki kuota bonus tersisa. Namun Bapak/Ibu tetap dapat membuat bon bonus secara manual.");
      } else {
        setBonusWarning("");
      }
    } catch (err) {
      console.error("Gagal memeriksa status bonus pelanggan:", err);
    }
  };

  const handleNomorBonChange = (val) => {
    setNomorBon(val);
    if (val.trim().length > 3) {
      registerTrigger("tx-nomor-bon", "input");
    }
  };

  const handleAddProductLine = () => {
    setItems([...items, { product_id: "", quantity: 1 }]);
    registerTrigger("tx-add-product-btn", "click");
  };

  const handleRemoveItem = (index) => {
    const copy = [...items];
    copy.splice(index, 1);
    setItems(copy);
  };

  const handleItemProductChange = (index, pid) => {
    const copy = [...items];
    copy[index].product_id = pid;
    setItems(copy);
    if (index === 0) {
      registerTrigger("tx-product-select-0", "change");
    }
  };

  const handleItemQtyChange = (index, qty) => {
    const copy = [...items];
    copy[index].quantity = parseInt(qty) || 1;
    setItems(copy);
    if (index === 0 && parseInt(qty) >= 10) {
      registerTrigger("tx-qty-input-0", "input");
    }
  };

  const handleStatusChange = (val) => {
    setStatus(val);
    registerTrigger("tx-status-select", "change");
  };

  // Calculations for current form
  const selectedCustomer = customers.find(c => c.id === customerId);

  const getCalculatedItems = () => {
    return items.map(item => {
      const prod = products.find(p => p.id === item.product_id);
      if (!prod) {
        return {
          ...item,
          tipe: "-",
          harga_base: 0,
          harga_modal: 0,
          discounted_price: 0,
          subtotal: 0
        };
      }

      const isBonusItem = isBonus;
      const basePrice = prod.harga_base;
      const modalPrice = prod.harga_modal;

      let discountedPrice = basePrice;
      if (!isBonusItem && selectedCustomer) {
        const discSteps = prod.tipe === "LM" ? selectedCustomer.discounts_lm : selectedCustomer.discounts_br;
        discountedPrice = calculateCascadingDiscount(basePrice, discSteps);
      } else if (isBonusItem) {
        discountedPrice = 0;
      }

      return {
        ...item,
        nama: prod.nama,
        tipe: prod.tipe,
        harga_base: basePrice,
        harga_modal: modalPrice,
        discounted_price: discountedPrice,
        subtotal: discountedPrice * item.quantity
      };
    });
  };

  const calculatedLines = getCalculatedItems();
  const totalOmzet = calculatedLines.reduce((sum, item) => sum + item.subtotal, 0);
  const totalShipping = parseInt(ongkir) || 0;
  const totalBill = totalOmzet + totalShipping;

  const handleSaveInvoice = async (e) => {
    e.preventDefault();
    if (!nomorBon.trim()) {
      setErrorMsg("Nomor Bon wajib diisi.");
      return;
    }
    if (!customerId) {
      setErrorMsg("Pilih pelanggan terlebih dahulu.");
      return;
    }
    if (items.length === 0 || items.some(item => !item.product_id)) {
      setErrorMsg("Harap tambahkan minimal satu produk yang valid.");
      return;
    }

    const itemPayloads = calculatedLines.map(line => ({
      product_id: line.product_id,
      quantity: line.quantity,
      product_type_snapshot: line.tipe,
      harga_base_snapshot: line.harga_base,
      harga_modal_snapshot: line.harga_modal,
      discounted_unit_price: line.discounted_price,
      is_bonus_item: isBonus
    }));

    const payload = {
      nomor_bon: nomorBon,
      tanggal,
      customer_id: customerId,
      ongkir: totalShipping,
      deskripsi,
      is_bonus: isBonus,
      status,
      tanggal_lunas: status === "Lunas" ? (tanggal || new Date().toISOString().split('T')[0]) : null,
      items: itemPayloads
    };

    if (isDemoActive) {
      // In demo mode, simulate save and trigger next tutorial state
      registerTrigger("tx-save-btn", "click");
      return;
    }

    try {
      let result;
      if (editTransactionId) {
        result = await api.updateTransaction(editTransactionId, payload);
      } else {
        result = await api.addTransaction(payload);
      }

      if (result.success) {
        setSuccessMsg("Nota penjualan berhasil disimpan!");
        setTimeout(() => {
          setView("dashboard");
        }, 1500);
      } else {
        setErrorMsg(result.message);
      }
    } catch (err) {
      setErrorMsg(err.message || "Gagal menyimpan nota penjualan.");
    }
  };



  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-navy-bright border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-charcoal-medium">Memuat data nota...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-hero text-xl">{editTransactionId ? "✏️ Edit Nota Penjualan" : "➕ Buat Bon Penjualan Baru"}</h1>
          <p className="text-gray-500 text-xs mt-1">
            {isDemoActive ? "📚 Sedang dalam Mode Latihan Membuat Bon Demo" : "Catat transaksi penjualan produk dengan kalkulasi diskon bertingkat otomatis."}
          </p>
        </div>
        <button 
          type="button"
          onClick={() => {
            if (isDemoActive) {
              setShowExitTutorialConfirm(true);
            } else {
              setView("dashboard");
            }
          }}
          className="border-2 border-gray-200 hover:bg-gray-50 text-charcoal-medium font-bold text-sm h-12 px-5 rounded-xl transition-all cursor-pointer"
        >
          Kembali
        </button>
      </div>

      <form onSubmit={handleSaveInvoice} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Core Form Fields */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
            {errorMsg && (
              <div className="bg-rose-light text-rose-deep p-3 rounded-xl text-xs font-semibold">
                ⚠️ {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="bg-emerald-mint text-emerald-deep p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={16} /> {successMsg}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nomor Bon */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-charcoal-medium uppercase flex items-center">
                  Nomor Nota / Bon *
                  <ContextualTooltip id="tip-bon-no" content="Nomor nota transaksi. Sistem mengharuskan nomor ini unik. Contoh: BON-2025-001." />
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    id="tx-nomor-bon"
                    value={nomorBon}
                    onChange={(e) => handleNomorBonChange(e.target.value)}
                    placeholder="Contoh: BON-001"
                    className="flex-1 h-12 bg-gray-50 border-2 border-gray-200 rounded-xl px-4 text-sm focus:border-navy-bright focus:bg-white outline-none transition-all font-semibold"
                  />
                  {!isDemoActive && (
                    <button 
                      type="button" 
                      onClick={generateInvoiceNumber}
                      className="border border-gray-200 hover:bg-gray-50 px-3 rounded-xl text-xs font-bold text-gray-500"
                    >
                      Acak
                    </button>
                  )}
                </div>
              </div>

              {/* Tanggal */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-charcoal-medium uppercase">Tanggal Penjualan</label>
                <input 
                  type="date" 
                  id="tx-tanggal"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full h-12 bg-gray-50 border-2 border-gray-200 rounded-xl px-4 text-sm focus:border-navy-bright focus:bg-white outline-none transition-all font-semibold"
                />
                <button 
                  type="button" 
                  id="tx-tanggal-btn" 
                  onClick={() => registerTrigger("tx-tanggal-btn", "next")} 
                  className="hidden" 
                />
              </div>
            </div>

            {/* Customer Dropdown */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-charcoal-medium uppercase flex items-center">
                Pilih Nama Pelanggan *
                <ContextualTooltip id="tip-customer" content="Pilih nama pembeli dari daftar pelanggan terdaftar. Diskon bertingkat akan diambil langsung dari data pelanggan tersebut." />
              </label>
              <select 
                id="tx-customer-select"
                value={customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full h-12 bg-gray-50 border-2 border-gray-200 rounded-xl px-4 text-sm focus:border-navy-bright focus:bg-white outline-none transition-all font-semibold"
              >
                <option value="">-- Silakan Pilih Pelanggan --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.nama}</option>
                ))}
              </select>
            </div>

            {/* Is Bonus Mode Toggle */}
            {selectedCustomer && (
              <div className="space-y-3">
                <div className="bg-amber-cream/40 border border-amber-soft/50 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-gold/10 text-amber-deep rounded-xl">
                      <Gift size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-charcoal-black">Nota Pengambilan Bonus</p>
                      <p className="text-xs text-gray-500">
                        Tersedia: {selectedCustomerBonusStatus.bonuses_available} kuota bonus gratis.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      id="tx-bonus-toggle"
                      checked={isBonus}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsBonus(checked);
                        registerTrigger("tx-bonus-toggle", "change");
                        if (checked && selectedCustomerBonusStatus.bonuses_available <= 0) {
                          setBonusWarning("Peringatan: Pelanggan ini tidak memiliki kuota bonus tersisa. Namun Bapak/Ibu tetap dapat membuat bon bonus secara manual.");
                        } else {
                          setBonusWarning("");
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-gold"></div>
                  </label>
                </div>
                {bonusWarning && (
                  <div className="bg-amber-cream text-amber-deep p-4 rounded-2xl text-xs font-semibold border border-amber-soft">
                    ⚠️ {bonusWarning}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Product Items Table */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-subheading text-base font-bold text-charcoal-black">Daftar Barang yang Dibeli</h3>
              <button 
                type="button" 
                id="tx-add-product-btn"
                onClick={handleAddProductLine}
                className="text-xs font-bold text-navy-bright flex items-center gap-1 hover:underline bg-navy-light px-3 py-2 rounded-lg"
              >
                <Plus size={14} /> Tambah Produk
              </button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs border-2 border-dashed border-gray-100 rounded-2xl">
                Belum ada produk ditambahkan. Klik [+ Tambah Produk] di atas.
              </div>
            ) : (
              <div className="space-y-4">
                {calculatedLines.map((line, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row gap-3 p-4 bg-gray-50/50 rounded-2xl border border-gray-100 items-start md:items-center">
                    
                    {/* Product Selection */}
                    <div className="flex-1 w-full space-y-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Nama Produk</span>
                      <select 
                        id={`tx-product-select-${idx}`}
                        value={line.product_id}
                        onChange={(e) => handleItemProductChange(idx, e.target.value)}
                        className="w-full h-11 bg-white border border-gray-200 rounded-xl px-3 text-xs focus:border-navy-bright outline-none font-semibold"
                      >
                        <option value="">-- Pilih Produk --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>[{p.tipe}] {p.nama}</option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div className="w-full md:w-24 space-y-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Qty / Box</span>
                      <input 
                        type="number" 
                        id={`tx-qty-input-${idx}`}
                        min="1"
                        value={line.quantity}
                        onChange={(e) => handleItemQtyChange(idx, e.target.value)}
                        className="w-full h-11 bg-white border border-gray-200 rounded-xl px-3 text-xs focus:border-navy-bright outline-none font-bold text-center"
                      />
                    </div>

                    {/* Unit Price calculated dynamically */}
                    <div className="w-full md:w-32 space-y-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase flex items-center">
                        Harga Satuan
                        <button type="button" id={`tx-price-calc-${idx}`} onClick={() => registerTrigger(`tx-price-calc-${idx}`, 'next')} className="hidden" />
                      </span>
                      <div className="h-11 bg-white border border-gray-200 rounded-xl px-3 flex items-center justify-end text-xs font-bold text-charcoal-medium tabular-nums">
                        {isBonus ? "GRATIS" : formatRupiah(line.discounted_price)}
                      </div>
                    </div>

                    {/* Line Subtotal */}
                    <div className="w-full md:w-36 space-y-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Total Harga</span>
                      <div className="h-11 bg-white border border-gray-200 rounded-xl px-3 flex items-center justify-end text-xs font-bold text-navy-deep tabular-nums">
                        {isBonus ? "Rp0" : formatRupiah(line.subtotal)}
                      </div>
                    </div>

                    {/* Remove button */}
                    <button 
                      type="button" 
                      onClick={() => handleRemoveItem(idx)}
                      className="mt-6 md:mt-2 text-rose-deep hover:text-rose-medium p-2 hover:bg-rose-light rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Ledger Calculation Summary */}
        <div className="space-y-6">
          <div id="tx-summary-cards" className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-subheading text-base font-bold border-b border-gray-50 pb-3">Ringkasan Pembayaran</h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center text-gray-500">
                <span>Total Omzet Penjualan:</span>
                <span className="font-semibold text-charcoal-medium tabular-nums">{formatRupiah(totalOmzet)}</span>
              </div>
              <div className="flex justify-between items-center text-gray-500">
                <span>Ongkos Kirim (Ongkir):</span>
                <span className="font-semibold text-charcoal-medium tabular-nums">{formatRupiah(totalShipping)}</span>
              </div>
              <hr className="border-gray-50" />
              <div className="flex justify-between items-center text-sm font-bold text-charcoal-black">
                <span>Total Tagihan:</span>
                <span className="text-lg text-navy-deep font-extrabold tabular-nums">{formatRupiah(totalBill)}</span>
              </div>
            </div>

            {/* Input: Ongkir */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-charcoal-medium uppercase flex items-center">
                Ongkir (Biaya Kirim)
                <ContextualTooltip id="tip-ongkir" content="Biaya ongkir untuk mengantar pesanan. Diteruskan ke pelanggan, tidak menambah laba bersih Anda." />
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">Rp</span>
                <input 
                  type="number" 
                  id="tx-ongkir-input"
                  value={ongkir} 
                  onChange={(e) => setOngkir(e.target.value)}
                  className="w-full h-12 bg-gray-50 border-2 border-gray-200 rounded-xl pl-10 pr-4 text-sm focus:border-navy-bright focus:bg-white outline-none transition-all font-semibold"
                />
              </div>
              {parseInt(ongkir) > 0 && (
                <p className="text-[11px] font-extrabold text-[#C97B1A] mt-1.5 animate-slide-in">
                  {getTerbacaRupiah(ongkir)}
                </p>
              )}
            </div>

            {/* Input: Deskripsi */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-charcoal-medium uppercase">Keterangan / Catatan</label>
              <textarea 
                value={deskripsi} 
                onChange={(e) => setDeskripsi(e.target.value)}
                placeholder="Catatan alamat / waktu kirim..."
                rows="2"
                className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl p-3 text-xs focus:border-navy-bright focus:bg-white outline-none transition-all"
              />
            </div>

            {/* Status Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-charcoal-medium uppercase flex items-center">
                Status Pembayaran
                <ContextualTooltip id="tip-status" content="Piutang = belum dibayar. Lunas = uang sudah diterima. Laba dan Omzet baru diakui jika status disetel Lunas." />
              </label>
              <select 
                id="tx-status-select"
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full h-12 bg-gray-50 border-2 border-gray-200 rounded-xl px-4 text-sm focus:border-navy-bright focus:bg-white outline-none transition-all font-semibold"
              >
                <option value="Piutang">Piutang (Belum Bayar)</option>
                <option value="Lunas">Lunas (Sudah Dibayar)</option>
              </select>
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-2">
              <button 
                type="submit"
                id="tx-save-btn"
                className="w-full bg-cta hover:bg-cta/90 text-primary font-bold h-12 rounded-xl text-sm shadow-md flex items-center justify-center gap-1.5 transition-all hover:scale-[1.01] cursor-pointer font-mono"
              >
                <Save size={18} /> Simpan Bon
              </button>
            </div>
          </div>
        </div>
      </form>

      <ConfirmModal
        isOpen={showExitTutorialConfirm}
        title="Keluar Latihan"
        message="Apakah Bapak/Ibu yakin ingin keluar dari latihan membuat bon? Data latihan saat ini akan diulang."
        onConfirm={() => {
          setShowExitTutorialConfirm(false);
          window.location.reload();
        }}
        onCancel={() => setShowExitTutorialConfirm(false)}
        confirmLabel="YA, KELUAR"
        cancelLabel="BATAL"
      />
    </div>
  );
}
