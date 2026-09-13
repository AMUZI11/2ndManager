"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  GitBranch, 
  Store, 
  Plus, 
  RefreshCw, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  CheckCircle2, 
  Laptop, 
  AlertCircle,
  X
} from 'lucide-react';
import { getAssignedBranchId, bindDeviceToBranch } from '@/utils/branchDeviceGuard';

export default function AdminBranchesPage() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [boundBranchId, setBoundBranchId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', address: '', phone_number: '' });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchBranches = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch('/api/v1/branches');
      const json = await res.json();
      if (res.ok && json.data) {
        setBranches(json.data || []);
      } else {
        setErrorMsg(json.error?.message || 'Gagal memuat daftar cabang');
      }
    } catch (err) {
      console.error('[Fetch Branches Error]', err);
      setErrorMsg('Terjadi kesalahan jaringan saat mengambil data cabang.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
    setBoundBranchId(getAssignedBranchId());
  }, [fetchBranches]);

  const handleBindDevice = (branch) => {
    try {
      bindDeviceToBranch({ branchId: branch.id, registerName: `KASIR-${branch.branch_code}` });
      setBoundBranchId(branch.id);
      setSuccessMsg(`Perangkat ini berhasil diikat ke cabang: ${branch.name} (${branch.branch_code})`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch {
      setErrorMsg('Gagal mengikat perangkat.');
    }
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('Nama cabang wajib diisi.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');
      const res = await fetch('/api/v1/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();

      if (res.ok) {
        setSuccessMsg(`Cabang "${formData.name}" berhasil didaftarkan!`);
        setFormData({ name: '', address: '', phone_number: '' });
        setIsModalOpen(false);
        fetchBranches();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(json.error?.message || 'Gagal menambahkan cabang.');
      }
    } catch (err) {
      console.error('[Create Branch Error]', err);
      setErrorMsg('Terjadi kesalahan jaringan saat membuat cabang.');
    } finally {
      setSubmitting(false);
    }
  };

  const mainBranch = branches.find((b) => b.is_main_branch);
  const totalBranches = branches.length;

  return (
    <div className="space-y-6 font-sans max-w-7xl mx-auto pb-12">
      {/* Header Bento Card */}
      <div className="bg-white border-2 border-slate-800 rounded-2xl p-6 shadow-[4px_4px_0px_0px_#1e293b] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-[#CCFF00] border-2 border-slate-800 rounded-xl shadow-[2px_2px_0px_0px_#1e293b]">
              <GitBranch className="w-5 h-5 text-slate-900" />
            </span>
            <h1 className="font-display font-black text-2xl text-slate-900 tracking-tight">
              Pusat Kendali Multi-Cabang
            </h1>
          </div>
          <p className="text-slate-600 text-sm font-medium">
            Kelola jaringan outlet toko, sinkronisasi inventaris multi-cabang, dan pengikatan register kasir.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchBranches}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white border-2 border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-800 shadow-[2px_2px_0px_0px_#1e293b] hover:bg-slate-50 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>SEGARKAN</span>
          </button>

          <button
            onClick={() => { setErrorMsg(''); setIsModalOpen(true); }}
            className="flex items-center space-x-1.5 px-4 py-2 bg-[#CCFF00] border-2 border-slate-800 rounded-xl text-xs font-mono font-black text-slate-900 shadow-[3px_3px_0px_0px_#1e293b] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>TAMBAH CABANG BARU</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-lime-100 border-2 border-slate-800 rounded-xl p-4 shadow-[3px_3px_0px_0px_#1e293b] flex items-center space-x-3 text-slate-900 font-mono text-xs font-bold animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-lime-700 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-100 border-2 border-slate-800 rounded-xl p-4 shadow-[3px_3px_0px_0px_#1e293b] flex items-center space-x-3 text-slate-900 font-mono text-xs font-bold animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Bento Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-slate-800 rounded-2xl p-5 shadow-[4px_4px_0px_0px_#1e293b] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="font-mono text-xs font-bold tracking-wider uppercase">Total Cabang</span>
            <Store className="w-4 h-4 text-slate-800" />
          </div>
          <div className="font-display font-black text-3xl text-slate-900">
            {totalBranches}
          </div>
          <p className="text-[11px] font-mono text-slate-500 mt-2">
            Termasuk 1 cabang pusat &amp; sub-cabang
          </p>
        </div>

        <div className="bg-white border-2 border-slate-800 rounded-2xl p-5 shadow-[4px_4px_0px_0px_#1e293b] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="font-mono text-xs font-bold tracking-wider uppercase">Cabang Utama</span>
            <ShieldCheck className="w-4 h-4 text-lime-600" />
          </div>
          <div className="font-display font-black text-lg text-slate-900 truncate">
            {mainBranch?.name || 'Pusat Belum Ditetapkan'}
          </div>
          <span className="inline-block mt-2 font-mono text-[10px] font-bold bg-lime-200 border border-slate-800 px-2 py-0.5 rounded w-max">
            {mainBranch?.branch_code || 'CBG-01'} • MASTER SHOP
          </span>
        </div>

        <div className="bg-white border-2 border-slate-800 rounded-2xl p-5 shadow-[4px_4px_0px_0px_#1e293b] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="font-mono text-xs font-bold tracking-wider uppercase">Perangkat Terikat</span>
            <Laptop className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="font-display font-black text-base text-slate-900 truncate">
            {boundBranchId ? (
              branches.find((b) => b.id === boundBranchId)?.name || 'Terikat ke Cabang'
            ) : (
              'Belum Terikat'
            )}
          </div>
          <p className="text-[11px] font-mono text-slate-500 mt-2">
            Terminal POS aktif di browser ini
          </p>
        </div>

        <div className="bg-white border-2 border-slate-800 rounded-2xl p-5 shadow-[4px_4px_0px_0px_#1e293b] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="font-mono text-xs font-bold tracking-wider uppercase">Sinkronisasi</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-800 animate-ping"></span>
          </div>
          <div className="font-display font-black text-lg text-emerald-600">
            Realtime Active
          </div>
          <p className="text-[11px] font-mono text-slate-500 mt-2">
            Mutasi stok lintas outlet terjamin ACID
          </p>
        </div>
      </div>

      {/* Branches Table Bento Card */}
      <div className="bg-white border-2 border-slate-800 rounded-2xl shadow-[4px_4px_0px_0px_#1e293b] overflow-hidden">
        <div className="p-5 border-b-2 border-slate-800 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="font-display font-black text-base text-slate-900 tracking-tight">
              Daftar Cabang Toko
            </h2>
            <p className="text-xs font-mono text-slate-500">
              Total {branches.length} cabang terdaftar dalam grup organisasi ini
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-800 text-[11px] font-mono font-bold text-slate-700 uppercase tracking-wider">
                <th className="py-3 px-4">Kode Cabang</th>
                <th className="py-3 px-4">Nama Outlet</th>
                <th className="py-3 px-4">Tipe Outlet</th>
                <th className="py-3 px-4">Alamat &amp; Kontak</th>
                <th className="py-3 px-4">Status Terminal</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100 font-mono text-xs">
              {loading && branches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-mono">
                    Memuat data cabang...
                  </td>
                </tr>
              ) : branches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-mono">
                    Belum ada cabang terdaftar. Klik &quot;Tambah Cabang Baru&quot; untuk menambahkan cabang toko.
                  </td>
                </tr>
              ) : (
                branches.map((branch) => {
                  const isCurrentBound = boundBranchId === branch.id;
                  return (
                    <tr key={branch.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <span className="bg-slate-100 border border-slate-800 px-2 py-0.5 rounded font-mono text-xs">
                          {branch.branch_code}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 font-sans text-sm">
                          {branch.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Shop ID: {branch.shop_id?.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {branch.is_main_branch ? (
                          <span className="bg-[#CCFF00] text-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase shadow-[1px_1px_0px_0px_#1e293b]">
                            Pusat (Main)
                          </span>
                        ) : (
                          <span className="bg-sky-100 text-sky-900 border border-slate-800 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">
                            Cabang Satelit
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5 text-slate-600 text-xs">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate max-w-[200px]">{branch.address || 'Alamat belum diatur'}</span>
                        </div>
                        {branch.phone_number && (
                          <div className="flex items-center space-x-1.5 text-slate-500 text-[11px] mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span>{branch.phone_number}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isCurrentBound ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-800 bg-emerald-100 border border-slate-800 px-2 py-0.5 rounded text-[11px] font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Terikat di Sini</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">
                            Tidak terikat
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleBindDevice(branch)}
                          className={`px-3 py-1.5 border-2 border-slate-800 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                            isCurrentBound
                              ? 'bg-slate-100 text-slate-500 border-slate-400 cursor-default'
                              : 'bg-white hover:bg-slate-100 text-slate-800 shadow-[2px_2px_0px_0px_#1e293b] active:translate-x-[1px] active:translate-y-[1px]'
                          }`}
                          disabled={isCurrentBound}
                        >
                          {isCurrentBound ? 'Aktif di POS' : 'Ikat Terminal Ini'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Cabang */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border-3 border-slate-800 rounded-2xl w-full max-w-md shadow-[8px_8px_0px_0px_#1e293b] overflow-hidden">
            <div className="p-5 border-b-2 border-slate-800 flex items-center justify-between bg-[#CCFF00]">
              <div className="flex items-center space-x-2">
                <Store className="w-5 h-5 text-slate-900" />
                <h3 className="font-display font-black text-lg text-slate-900 tracking-tight">
                  Pendaftaran Cabang Baru
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg border-2 border-slate-800 bg-white hover:bg-slate-100 text-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1">
                  Nama Cabang *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Toko Berkah Cabang Tebet"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white border-2 border-slate-800 rounded-xl px-3 py-2 text-sm font-sans text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#CCFF00] shadow-[2px_2px_0px_0px_#1e293b]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1">
                  Alamat Lengkap
                </label>
                <textarea
                  rows={3}
                  placeholder="Contoh: Jl. Tebet Raya No. 45, Jakarta Selatan"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-white border-2 border-slate-800 rounded-xl px-3 py-2 text-sm font-sans text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#CCFF00] shadow-[2px_2px_0px_0px_#1e293b]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1">
                  Nomor Telepon / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 081234567890"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="w-full bg-white border-2 border-slate-800 rounded-xl px-3 py-2 text-sm font-sans text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#CCFF00] shadow-[2px_2px_0px_0px_#1e293b]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border-2 border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-700 bg-white hover:bg-slate-50 cursor-pointer"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 border-2 border-slate-800 rounded-xl text-xs font-mono font-black text-slate-900 bg-[#CCFF00] shadow-[3px_3px_0px_0px_#1e293b] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer"
                >
                  {submitting ? 'MENYIMPAN...' : 'SIMPAN CABANG'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
