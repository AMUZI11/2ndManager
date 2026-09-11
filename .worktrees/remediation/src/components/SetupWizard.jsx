"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Package, Users, Plus, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { api } from '../utils/api';

export default function SetupWizard({ isOpen, onClose, onFinish }) {
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({ code: '', name: '' });
  const [product, setProduct] = useState({ nama: '', tipe: 'LM', harga_base: '', harga_modal: '' });
  const [addedProducts, setAddedProducts] = useState([]);
  const [customer, setCustomer] = useState({ nama: '', bonus_threshold: '5000000', discounts: {} });
  const [addedCustomers, setAddedCustomers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadCategories = useCallback(async () => {
    try {
      const cats = await api.getCategories();
      setCategories(cats);
      if (cats.length > 0) {
        setProduct(p => ({ ...p, tipe: cats[0].code }));
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setStep(1);
        setError('');
        setSuccess('');
        loadCategories();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, loadCategories]);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.code || !newCategory.name) return;
    setError('');
    setSuccess('');
    try {
      await api.addCategory(newCategory.code.toUpperCase(), newCategory.name);
      setSuccess(`Kategori "${newCategory.name}" berhasil ditambahkan!`);
      setNewCategory({ code: '', name: '' });
      await loadCategories();
    } catch (err) {
      setError(err.message || 'Gagal menambah kategori');
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!product.nama || !product.harga_base || !product.harga_modal) return;
    setError('');
    setSuccess('');
    try {
      const added = await api.addProduct({
        nama: product.nama,
        tipe: product.tipe,
        harga_base: Number(product.harga_base),
        harga_modal: Number(product.harga_modal),
      });
      setAddedProducts([...addedProducts, added]);
      setSuccess(`Barang "${product.nama}" berhasil disimpan!`);
      setProduct({ nama: '', tipe: categories[0]?.code || 'LM', harga_base: '', harga_modal: '' });
    } catch (err) {
      setError(err.message || 'Gagal menambah produk');
    }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!customer.nama) return;
    setError('');
    setSuccess('');
    try {
      const formattedDiscounts = {};
      categories.forEach(c => {
        const val = customer.discounts[c.code];
        formattedDiscounts[c.code] = val ? [Number(val)] : [];
      });

      const added = await api.addCustomer({
        nama: customer.nama,
        bonus_threshold: Number(customer.bonus_threshold) || 0,
        discounts: formattedDiscounts,
      });
      setAddedCustomers([...addedCustomers, added]);
      setSuccess(`Pelanggan "${customer.nama}" berhasil disimpan!`);
      setCustomer({ nama: '', bonus_threshold: '5000000', discounts: {} });
    } catch (err) {
      setError(err.message || 'Gagal menambah pelanggan');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-navy-dark/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl p-6 md:p-8 flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6">
          <div>
            <span className="text-xs font-black text-navy-bright tracking-widest uppercase">PANDUAN PERSIAPAN AWAL</span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-charcoal-black mt-1">Langkah {step} dari 5</h2>
          </div>
          {step === 1 && (
            <button 
              onClick={onClose}
              className="text-xs font-bold text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-xl transition-all cursor-pointer"
            >
              Lewati Panduan
            </button>
          )}
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-2xl text-sm font-semibold mb-4">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-4 rounded-2xl text-sm font-semibold mb-4">
            ✅ {success}
          </div>
        )}

        {/* Stepper Content */}
        <div className="flex-1 space-y-6">
          {step === 1 && (
            <div className="text-center space-y-5 py-6">
              <div className="w-20 h-20 bg-navy-light/10 text-navy-deep rounded-full flex items-center justify-center mx-auto text-4xl">👋</div>
              <h3 className="text-3xl font-extrabold text-charcoal-black">Selamat Datang Bapak/Ibu!</h3>
              <p className="text-lg text-gray-500 max-w-md mx-auto leading-relaxed">
                HL Manager Pro sekarang dalam keadaan bersih dan kosong. Mari siapkan data toko Bapak/Ibu dalam 3 langkah mudah.
              </p>
              <button 
                onClick={() => setStep(2)}
                className="bg-cta hover:bg-cta/90 text-primary text-xl font-black px-10 py-5 rounded-2xl shadow-lg transition-all transform active:scale-95 inline-flex items-center gap-2 mt-4 cursor-pointer font-mono"
              >
                MULAI PERSIAPAN <ArrowRight size={22} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl md:text-2xl font-extrabold text-charcoal-black">1. Kelompok Barang (Kategori) 📦</h3>
                <p className="text-base text-gray-500 leading-relaxed mt-2">
                  Kelompok barang digunakan untuk membedakan jenis dagangan Bapak/Ibu. Kami sudah menyediakan dua kelompok bawaan:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {categories.map(c => (
                  <div key={c.code} className="p-5 bg-gray-50 border border-gray-100 rounded-2xl flex flex-col justify-center shadow-sm">
                    <span className="text-xs font-black text-navy-deep bg-navy-ice px-3 py-1 rounded self-start uppercase mb-2 tracking-wider">{c.code}</span>
                    <span className="font-bold text-charcoal-black text-base">{c.name}</span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddCategory} className="border-t border-gray-100 pt-5 space-y-3">
                <p className="text-sm font-extrabold text-charcoal-medium">Ingin menambah kelompok barang baru sekarang?</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input 
                    type="text" 
                    placeholder="KODE SINGKAT (Contoh: KO)" 
                    value={newCategory.code}
                    onChange={e => setNewCategory({ ...newCategory, code: e.target.value.slice(0, 5) })}
                    className="sm:w-1/3 bg-gray-50 border-2 border-gray-200 rounded-2xl px-5 py-4 text-base focus:border-navy-bright outline-none font-black uppercase text-center"
                  />
                  <input 
                    type="text" 
                    placeholder="Nama Kelompok (Contoh: Kopi)" 
                    value={newCategory.name}
                    onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="flex-1 bg-gray-50 border-2 border-gray-200 rounded-2xl px-5 py-4 text-base focus:border-navy-bright outline-none font-bold"
                  />
                  <button 
                    type="submit" 
                    className="bg-navy-deep hover:bg-navy-dark text-white font-extrabold px-6 py-4 rounded-2xl transition-all cursor-pointer text-base shadow-sm"
                  >
                    Tambah
                  </button>
                </div>
              </form>

              <div className="flex justify-between pt-6 border-t border-gray-100 mt-6">
                <button 
                  onClick={() => setStep(1)}
                  className="text-sm font-bold text-gray-500 hover:text-gray-700 py-3 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft size={16} /> Kembali
                </button>
                <button 
                  onClick={() => { setError(''); setSuccess(''); setStep(3); }}
                  className="bg-cta hover:bg-cta/90 text-primary text-base font-black px-8 py-3.5 rounded-2xl shadow-md transition-all cursor-pointer font-mono"
                >
                  LANJUT KE BARANG
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl md:text-2xl font-extrabold text-charcoal-black">2. Masukkan Barang Dagangan Pertama 🥤</h3>
                <p className="text-base text-gray-500 leading-relaxed mt-2">
                  Masukkan minimal 1 barang dagangan yang Bapak/Ibu jual agar bisa mulai dipesan.
                </p>
              </div>

              <form onSubmit={handleAddProduct} className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4 shadow-sm">
                <div>
                  <label className="block text-sm font-bold text-charcoal-medium mb-1">Nama Barang</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: Jeruk Segar 500ml"
                    value={product.nama}
                    onChange={e => setProduct({ ...product, nama: e.target.value })}
                    className="w-full bg-white border-2 border-gray-200 rounded-2xl px-5 py-4 text-base focus:border-navy-bright outline-none font-bold"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-charcoal-medium mb-1">Kelompok</label>
                    <select 
                      value={product.tipe}
                      onChange={e => setProduct({ ...product, tipe: e.target.value })}
                      className="w-full bg-white border-2 border-gray-200 rounded-2xl px-5 py-4 text-base focus:border-navy-bright outline-none font-black"
                    >
                      {categories.map(c => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-charcoal-medium mb-1">Harga Jual (Rp)</label>
                    <input 
                      type="number" 
                      placeholder="Contoh: 15000"
                      value={product.harga_base}
                      onChange={e => setProduct({ ...product, harga_base: e.target.value })}
                      className="w-full bg-white border-2 border-gray-200 rounded-2xl px-5 py-4 text-base focus:border-navy-bright outline-none font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-charcoal-medium mb-1">Harga Modal (Rp)</label>
                    <input 
                      type="number" 
                      placeholder="Contoh: 8000"
                      value={product.harga_modal}
                      onChange={e => setProduct({ ...product, harga_modal: e.target.value })}
                      className="w-full bg-white border-2 border-gray-200 rounded-2xl px-5 py-4 text-base focus:border-navy-bright outline-none font-bold"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-navy-deep hover:bg-navy-dark text-white font-extrabold py-4 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-base"
                >
                  <Plus size={20} /> Simpan & Tambah Barang
                </button>
              </form>

              {addedProducts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-extrabold text-charcoal-medium">Barang yang sudah terdaftar ({addedProducts.length}):</p>
                  <div className="max-h-32 overflow-y-auto border border-gray-150 rounded-2xl divide-y divide-gray-100 text-sm shadow-inner bg-white">
                    {addedProducts.map((p, idx) => (
                      <div key={idx} className="p-4 flex justify-between items-center">
                        <span className="font-bold text-charcoal-black">{p.nama}</span>
                        <span className="text-navy-deep font-extrabold bg-navy-ice px-3 py-1 rounded text-xs uppercase tracking-wider">{p.tipe}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-6 border-t border-gray-100 mt-6">
                <button 
                  onClick={() => { setError(''); setSuccess(''); setStep(2); }}
                  className="text-sm font-bold text-gray-500 hover:text-gray-700 py-3 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft size={16} /> Kembali
                </button>
                <button 
                  onClick={() => {
                    if (addedProducts.length === 0) {
                      setError('Harap masukkan minimal 1 barang dagangan terlebih dahulu.');
                      return;
                    }
                    setError('');
                    setSuccess('');
                    setStep(4);
                  }}
                  className="bg-cta hover:bg-cta/90 text-primary text-base font-black px-8 py-3.5 rounded-2xl shadow-md transition-all cursor-pointer font-mono"
                >
                  LANJUT KE PELANGGAN
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl md:text-2xl font-extrabold text-charcoal-black">3. Masukkan Pelanggan Pertama 👥</h3>
                <p className="text-base text-gray-500 leading-relaxed mt-2">
                  Masukkan minimal 1 pelanggan atau nama toko yang sering berbelanja ke toko Bapak/Ibu.
                </p>
              </div>

              <form onSubmit={handleAddCustomer} className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4 shadow-sm">
                <div>
                  <label className="block text-sm font-bold text-charcoal-medium mb-1">Nama Pelanggan / Toko</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: Toko Berkah Bu Retno"
                    value={customer.nama}
                    onChange={e => setCustomer({ ...customer, nama: e.target.value })}
                    className="w-full bg-white border-2 border-gray-200 rounded-2xl px-5 py-4 text-base focus:border-navy-bright outline-none font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-charcoal-medium mb-1">Target Akumulasi Bonus Belanja (Rp)</label>
                  <input 
                    type="number" 
                    placeholder="Contoh: 5000000"
                    value={customer.bonus_threshold}
                    onChange={e => setCustomer({ ...customer, bonus_threshold: e.target.value })}
                    className="w-full bg-white border-2 border-gray-200 rounded-2xl px-5 py-4 text-base focus:border-navy-bright outline-none font-bold"
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-bold text-charcoal-medium">Berikan Diskon Awal untuk Pelanggan Ini (%)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {categories.map(c => (
                      <div key={c.code} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm">
                        <span className="text-sm font-bold text-charcoal-black">{c.name}</span>
                        <div className="flex items-center gap-1">
                          <input 
                            type="number" 
                            placeholder="0"
                            min="0"
                            max="100"
                            value={customer.discounts[c.code] || ''}
                            onChange={e => setCustomer({
                              ...customer,
                              discounts: { ...customer.discounts, [c.code]: e.target.value }
                            })}
                            className="w-20 bg-gray-50 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-navy-bright outline-none text-right font-black"
                          />
                          <span className="text-sm font-bold text-gray-500">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-navy-deep hover:bg-navy-dark text-white font-extrabold py-4 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-base"
                >
                  <Plus size={20} /> Simpan & Tambah Pelanggan
                </button>
              </form>

              {addedCustomers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-extrabold text-charcoal-medium">Pelanggan yang sudah terdaftar ({addedCustomers.length}):</p>
                  <div className="max-h-32 overflow-y-auto border border-gray-150 rounded-2xl divide-y divide-gray-100 text-sm shadow-inner bg-white">
                    {addedCustomers.map((c, idx) => (
                      <div key={idx} className="p-4 flex justify-between items-center">
                        <span className="font-bold text-charcoal-black">{c.nama}</span>
                        <span className="text-emerald-deep font-bold flex items-center gap-1">
                          <CheckCircle size={16} /> Terdaftar
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-6 border-t border-gray-100 mt-6">
                <button 
                  onClick={() => { setError(''); setSuccess(''); setStep(3); }}
                  className="text-sm font-bold text-gray-500 hover:text-gray-700 py-3 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft size={16} /> Kembali
                </button>
                <button 
                  onClick={() => {
                    if (addedCustomers.length === 0) {
                      setError('Harap masukkan minimal 1 nama pelanggan terlebih dahulu.');
                      return;
                    }
                    setError('');
                    setSuccess('');
                    setStep(5);
                  }}
                  className="bg-cta hover:bg-cta/90 text-primary text-base font-black px-8 py-3.5 rounded-2xl shadow-md transition-all cursor-pointer font-mono"
                >
                  SELESAI PERSIAPAN
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="text-center space-y-6 py-6">
              <div className="w-20 h-20 bg-emerald-mint text-emerald-deep rounded-full flex items-center justify-center mx-auto text-4xl">🎉</div>
              <h3 className="text-3xl font-extrabold text-charcoal-black">Semua Siap Bapak/Ibu!</h3>
              <p className="text-lg text-gray-500 max-w-md mx-auto leading-relaxed">
                Hebat! Data dasar barang dan pelanggan pertama telah berhasil disimpan. Sekarang Bapak/Ibu sudah siap untuk mencatat transaksi penjualan pertama.
              </p>
              <button 
                onClick={onFinish}
                className="bg-cta hover:bg-cta/90 text-primary text-xl font-black px-10 py-5 rounded-2xl shadow-lg transition-all transform active:scale-95 inline-flex items-center gap-2 mt-4 cursor-pointer font-mono"
              >
                BUAT BON PENJUALAN PERTAMA <ArrowRight size={22} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
