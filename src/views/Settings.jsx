"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, ShieldAlert, CheckCircle2, AlertTriangle, Eye, EyeOff, Loader2, User, Database, Upload, Download, History, Store, UserPlus, Building2, Users } from 'lucide-react';
import { api } from '../utils/api';
import { checkCapacityLimit } from '../lib/subscription';
import { normalizeTier } from '../config/tiers';
import ConfirmModal from '../components/ConfirmModal';

export default function Settings() {
  const router = useRouter();
  // Password Form States
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  // Shop / Warung Profile States
  const [shopName, setShopName] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [shopPhone, setShopPhone] = useState("");
  const [shopLoading, setShopLoading] = useState(true);
  const [shopSaving, setShopSaving] = useState(false);
  const [shopError, setShopError] = useState("");
  const [shopSuccess, setShopSuccess] = useState("");

  // Username Form States
  const [newUsername, setNewUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [usernameSuccess, setUsernameSuccess] = useState("");
  const [usernameLoading, setUsernameLoading] = useState(false);

  // System Reset States
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");

  // Backup & Restore States
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreError, setRestoreError] = useState("");
  const [restoreSuccess, setRestoreSuccess] = useState("");
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);
  const [pendingRestorePayload, setPendingRestorePayload] = useState(null);

  // Branch & Cashier Management States
  const [branches, setBranches] = useState([]);
  const [cashiers, setCashiers] = useState([]);

  const [billingData, setBillingData] = useState(null);
  const activePlan = normalizeTier(billingData?.plan || billingData?.tier || billingData?.subscription?.plan);
  const isEksekutif = activePlan === 'EKSEKUTIF';
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);
  const [quotaMessage, setQuotaMessage] = useState("");

  const [newBranchName, setNewBranchName] = useState("");
  const [branchLoading, setBranchLoading] = useState(false);
  const [branchError, setBranchError] = useState("");
  const [branchSuccess, setBranchSuccess] = useState("");

  const [newCashierName, setNewCashierName] = useState("");
  const [newCashierEmail, setNewCashierEmail] = useState("");
  const [newCashierPassword, setNewCashierPassword] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [cashierLoading, setCashierLoading] = useState(false);
  const [cashierError, setCashierError] = useState("");
  const [cashierSuccess, setCashierSuccess] = useState("");

  // PIN Toko (Owner PIN) States
  const [isPinConfigured, setIsPinConfigured] = useState(false);
  const [pinCurrent, setPinCurrent] = useState("");
  const [pinNew, setPinNew] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState("");
  const [pinSuccess, setPinSuccess] = useState("");

  const loadPinStatus = async () => {
    try {
      const res = await api.getShopPinStatus();
      setIsPinConfigured(Boolean(res?.is_pin_configured));
    } catch {
      // ignore
    }
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    setPinError("");
    setPinSuccess("");

    if (isPinConfigured && !pinCurrent) {
      setPinError("Masukkan PIN saat ini untuk verifikasi.");
      return;
    }

    if (!/^\d{6}$/.test(pinNew)) {
      setPinError("PIN baru harus terdiri dari tepat 6 digit angka.");
      return;
    }

    if (pinNew !== pinConfirm) {
      setPinError("Konfirmasi PIN baru tidak sesuai.");
      return;
    }

    setPinLoading(true);
    try {
      await api.updateShopPin({
        new_pin: pinNew,
        current_pin: pinCurrent || undefined,
      });
      setPinSuccess("PIN Toko berhasil disimpan dan diaktifkan!");
      setPinCurrent("");
      setPinNew("");
      setPinConfirm("");
      setIsPinConfigured(true);
    } catch (err) {
      setPinError(err.message || "Gagal memperbarui PIN toko.");
    } finally {
      setPinLoading(false);
    }
  };

  const loadBranches = async () => {
    try {
      const data = await api.getBranches();
      setBranches(data);
      if (data && data.length > 0 && !selectedBranchId) {
        setSelectedBranchId(data[0].id);
      }
    } catch (err) {
      console.error("Gagal memuat cabang:", err);
    }
  };

  const loadCashiers = async () => {
    try {
      const data = await api.getCashiers();
      setCashiers(data);
    } catch (err) {
      console.error("Gagal memuat kasir:", err);
    }
  };

  const loadBilling = async () => {
    try {
      const data = await api.getBilling();
      setBillingData(data);
    } catch (err) {
      console.error(err);
    }
  };


  // Audit Logs States
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);

  const loadAuditLogs = async () => {
    setLogsLoading(true);
    try {
      const data = await api.getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error("Gagal memuat log audit:", err);
    } finally {
      setLogsLoading(false);
    }
  };

  const loadShopProfile = async () => {
    setShopLoading(true);
    try {
      const data = await api.getShopProfile();
      if (data) {
        setShopName(data.name || "");
        setShopAddress(data.address || "");
        setShopPhone(data.phone || "");
      }
    } catch (err) {
      console.error("Gagal memuat profil toko:", err);
    } finally {
      setShopLoading(false);
    }
  };

  // Load initial data on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      loadShopProfile();
      loadAuditLogs();
      loadBranches();
      loadCashiers();
      loadBilling();
      loadPinStatus();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleShopSubmit = async (e) => {
    e.preventDefault();
    setShopError("");
    setShopSuccess("");

    if (!shopName.trim()) {
      setShopError("Nama toko/warung tidak boleh kosong.");
      return;
    }

    setShopSaving(true);
    try {
      await api.updateShopProfile({
        name: shopName.trim(),
        address: shopAddress.trim(),
        phone: shopPhone.trim(),
      });
      setShopSuccess("Profil toko/warung berhasil diperbarui.");
      setTimeout(() => { loadAuditLogs(); }, 500);
    } catch (err) {
      setShopError(err.message || "Gagal memperbarui profil toko.");
    } finally {
      setShopSaving(false);
    }
  };

  const handleAddBranch = async (e) => {
    e.preventDefault();
    setBranchError("");
    setBranchSuccess("");
    if (!newBranchName.trim()) {
      setBranchError("Nama cabang wajib diisi.");
      return;
    }

    const quotaCheck = checkCapacityLimit(activePlan, branches.length + 1, 'branch');
    if (!quotaCheck.allowed) {
      setIsQuotaModalOpen(true);
      setQuotaMessage(quotaCheck.message || "Batas Cabang Tercapai. Silakan Upgrade Kontrak Anda ke Paket Eksekutif.");
      return;
    }

    setBranchLoading(true);
    try {
      await api.addBranch(newBranchName.trim());
      setBranchSuccess(`Cabang "${newBranchName.trim()}" berhasil dibuat.`);
      setNewBranchName("");
      await loadBranches();
    } catch (err) {
      setBranchError(err.message || "Gagal membuat cabang baru.");
    } finally {
      setBranchLoading(false);
    }
  };

  const handleAddCashier = async (e) => {
    e.preventDefault();
    setCashierError("");
    setCashierSuccess("");
    const cashierAddOns = billingData?.add_ons?.find(a => a.addon_id === 'CASHIER')?.quantity || 0;
    const quotaCheck = checkCapacityLimit(activePlan, cashiers.length + 1, 'cashier', cashierAddOns);
    
    if (!quotaCheck.allowed) {
      setIsQuotaModalOpen(true);
      setQuotaMessage(quotaCheck.message || "Batas Kasir Tercapai. Beli Add-On (+Rp 50.000) atau Upgrade Kontrak Anda.");
      return;
    }

    if (!newCashierName.trim() || !newCashierEmail.trim() || !newCashierPassword || !selectedBranchId) {
      setCashierError("Semua kolom (Nama, Email, Password, Cabang) wajib diisi.");
      return;
    }
    setCashierLoading(true);
    try {
      await api.addCashier({
        username: newCashierName.trim(),
        cashier_name: newCashierName.trim(),
        email: newCashierEmail.trim(),
        password: newCashierPassword,
        branch_id: selectedBranchId,
      });
      setCashierSuccess(`Akun Kasir "${newCashierName.trim()}" berhasil dibuat.`);
      setNewCashierName("");
      setNewCashierEmail("");
      setNewCashierPassword("");
      await loadCashiers();
    } catch (err) {
      setCashierError(err.message || "Gagal membuat akun kasir.");
    } finally {
      setCashierLoading(false);
    }
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const data = await api.backupData();
      const dateStr = new Date().toISOString().split('T')[0];
      
      // 1. Download the structured backup file (.hldata)
      const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
      const dataAnchor = document.createElement('a');
      dataAnchor.setAttribute('href', dataStr);
      dataAnchor.setAttribute('download', `hl_cadangan_${dateStr}.hldata`);
      document.body.appendChild(dataAnchor);
      dataAnchor.click();
      dataAnchor.remove();

      // 2. Download the human-readable summary file (.txt)
      const categoriesCount = data.data?.categories?.length || 0;
      const productsCount = data.data?.products?.length || 0;
      const customersCount = data.data?.customers?.length || 0;
      const transactionsCount = data.data?.transactions?.length || 0;
      const logsCount = data.data?.logs?.length || 0;

      const summaryText = `==================================================
2ndManager - RINGKASAN CADANGAN DATA
==================================================
Dibuat oleh: Operator (${data.backup_by || 'Sistem'})
Tanggal: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

Berkas cadangan data Anda berhasil dibuat. 
Berikut adalah isi data yang tersimpan di dalam berkas cadangan:
- Total Kategori Produk: ${categoriesCount} kategori
- Total Produk Terdaftar: ${productsCount} barang
- Total Pelanggan: ${customersCount} orang
- Total Nota Transaksi: ${transactionsCount} nota penjualan
- Total Catatan Log Audit: ${logsCount} catatan aktivitas

--------------------------------------------------
PETUNJUK PENTING UNTUK BAPAK/IBU:
1. Berkas asli untuk pemulihan data bernama: hl_cadangan_${dateStr}.hldata
2. Mohon JANGAN mengubah nama atau isi berkas .hldata tersebut.
3. Simpan berkas .hldata di tempat aman (misal: kirim ke WhatsApp sendiri, simpan di flashdisk, atau Google Drive).
4. Jika ingin mengembalikan data ke aplikasi, pilih berkas .hldata tersebut pada menu "PULIHKAN DATA" di aplikasi.
==================================================`;

      const txtStr = `data:text/plain;charset=utf-8,${encodeURIComponent(summaryText)}`;
      const txtAnchor = document.createElement('a');
      txtAnchor.setAttribute('href', txtStr);
      txtAnchor.setAttribute('download', `RINGKASAN_CADANGAN_${dateStr}.txt`);
      document.body.appendChild(txtAnchor);
      txtAnchor.click();
      txtAnchor.remove();
      
      // Refresh logs
      setTimeout(() => { loadAuditLogs(); }, 500);
    } catch (err) {
      alert(err.message || "Gagal mencadangkan data.");
    } finally {
      setBackupLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setRestoreError("");
    setRestoreSuccess("");
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (!json.version || !json.data) {
          setRestoreError("Berkas cadangan tidak valid (format salah).");
          return;
        }
        setPendingRestorePayload(json);
        setIsRestoreConfirmOpen(true);
      } catch (err) {
        setRestoreError("Gagal membaca berkas. Pastikan format berkas benar.");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // Reset input
  };

  const handleRestoreConfirm = async () => {
    setIsRestoreConfirmOpen(false);
    if (!pendingRestorePayload) return;
    setRestoreLoading(true);
    setRestoreError("");
    setRestoreSuccess("");

    try {
      await api.restoreData(pendingRestorePayload);
      setRestoreSuccess("Seluruh data sistem berhasil dipulihkan dari berkas cadangan.");
      setPendingRestorePayload(null);
      setTimeout(() => { loadAuditLogs(); }, 500);
    } catch (err) {
      setRestoreError(err.message || "Gagal memulihkan data.");
    } finally {
      setRestoreLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPwdError("Semua kolom kata sandi wajib diisi.");
      return;
    }

    if (newPassword.length < 6) {
      setPwdError("Kata sandi baru minimal 6 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }

    setPwdLoading(true);
    try {
      await api.changePassword(oldPassword, newPassword);
      setPwdSuccess("Kata sandi berhasil diubah.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwdError(err.message || "Gagal mengubah kata sandi.");
    } finally {
      setPwdLoading(false);
    }
  };

  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    setUsernameError("");
    setUsernameSuccess("");

    if (!newUsername) {
      setUsernameError("Kolom username baru wajib diisi.");
      return;
    }

    if (newUsername.length < 3) {
      setUsernameError("Username baru minimal 3 karakter.");
      return;
    }

    if (newUsername.length > 50) {
      setUsernameError("Username baru maksimal 50 karakter.");
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      setUsernameError("Username hanya boleh berisi huruf, angka, dan underscore.");
      return;
    }

    setUsernameLoading(true);
    try {
      await api.changeUsername(newUsername);
      setUsernameSuccess("Username berhasil diubah.");
      setNewUsername("");
      window.dispatchEvent(new Event('hl-username-changed'));
    } catch (err) {
      setUsernameError(err.message || "Gagal mengubah username.");
    } finally {
      setUsernameLoading(false);
    }
  };

  const handleResetConfirm = async () => {
    setIsResetConfirmOpen(false);
    setResetError("");
    setResetLoading(true);

    try {
      await api.resetAllSystemData();
      
      // Clear wizard dismissal state to trigger SetupWizard on next mount
      localStorage.removeItem('hl_wizard_dismissed');
      
      // Redirect to dashboard and reload window to clean states
      window.location.href = '/dashboard';
    } catch (err) {
      setResetError(err.message || "Gagal mereset data sistem.");
      setResetLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-32">
      {/* Title Header */}
      <div className="bg-white rounded-2xl p-6 border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B]">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display uppercase tracking-tight">⚙️ Pengaturan Sistem &amp; Keamanan</h1>
        </div>
        <p className="text-xs font-sans text-slate-600 mt-1">Kelola keamanan akun, manajemen cabang &amp; kasir, cadangkan database, atau reset sistem.</p>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Section 0: Shop Profile Card */}
        <div className="bg-white border-2 border-slate-800 rounded-2xl p-6 shadow-[4px_4px_0px_#1E293B] space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
            <div className="w-9 h-9 bg-slate-900 text-[#CCFF00] border-2 border-slate-800 rounded-xl flex items-center justify-center shadow-[1px_1px_0px_#1E293B]">
              <Store size={18} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 font-display uppercase">Profil Toko &amp; Warung</h2>
              <p className="text-[11px] text-slate-500 font-mono">Ganti nama warung dan identitas cetak nota</p>
            </div>
          </div>

          {shopError && (
            <div className="bg-rose-50 border border-rose-300 text-rose-800 p-3 rounded-xl text-xs font-mono font-bold flex items-start gap-2">
              <ShieldAlert className="shrink-0" size={15} />
              <span>{shopError}</span>
            </div>
          )}

          {shopSuccess && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3 rounded-xl text-xs font-mono font-bold flex items-start gap-2">
              <CheckCircle2 className="shrink-0" size={15} />
              <span>{shopSuccess}</span>
            </div>
          )}

          {shopLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-slate-900" />
            </div>
          ) : (
            <form onSubmit={handleShopSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wider">
                  Nama Toko / Warung <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="Misal: Warung Berkah Jaya, Toko Sembako Ahza"
                  className="w-full h-11 bg-slate-50 border-2 border-slate-800 rounded-xl px-3 text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#CCFF00]"
                  required
                />
                <p className="text-[10px] font-mono text-slate-400">Nama ini akan tampil di Dashboard, Header Struk, dan Laporan.</p>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wider">
                  Alamat Lengkap Toko (Opsional)
                </label>
                <input 
                  type="text" 
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                  placeholder="Misal: Jl. Raya Tambun No. 45"
                  className="w-full h-11 bg-slate-50 border-2 border-slate-800 rounded-xl px-3 text-xs font-mono font-medium text-slate-900 outline-none focus:ring-2 focus:ring-[#CCFF00]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wider">
                  No. Telepon / WhatsApp Toko (Opsional)
                </label>
                <input 
                  type="text" 
                  value={shopPhone}
                  onChange={(e) => setShopPhone(e.target.value)}
                  placeholder="Misal: 08123456789"
                  className="w-full h-11 bg-slate-50 border-2 border-slate-800 rounded-xl px-3 text-xs font-mono font-medium text-slate-900 outline-none focus:ring-2 focus:ring-[#CCFF00]"
                />
              </div>

              <button 
                type="submit" 
                disabled={shopSaving}
                className="btn-arcade w-full h-11 bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 font-mono font-bold text-xs uppercase rounded-xl border-2 border-slate-800 shadow-[3px_3px_0px_#1E293B] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {shopSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>MENYIMPAN PROFIL...</span>
                  </>
                ) : (
                  <span>SIMPAN PROFIL TOKO</span>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Section 1: Change Password Card */}
        <div className="bg-white border-2 border-slate-800 rounded-2xl p-6 shadow-[4px_4px_0px_#1E293B] space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
            <div className="w-9 h-9 bg-slate-900 text-[#CCFF00] border-2 border-slate-800 rounded-xl flex items-center justify-center shadow-[1px_1px_0px_#1E293B]">
              <KeyRound size={18} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 font-display uppercase">Ubah Kata Sandi Akun</h2>
              <p className="text-[11px] text-slate-500 font-mono">Ganti password masuk akun kasir/owner</p>
            </div>
          </div>

          {pwdError && (
            <div className="bg-rose-50 border border-rose-300 text-rose-800 p-3 rounded-xl text-xs font-mono font-bold flex items-start gap-2">
              <ShieldAlert className="shrink-0" size={15} />
              <span>{pwdError}</span>
            </div>
          )}

          {pwdSuccess && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3 rounded-xl text-xs font-mono font-bold flex items-start gap-2">
              <CheckCircle2 className="shrink-0" size={15} />
              <span>{pwdSuccess}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            {/* Input: Old Password */}
            <div className="space-y-1">
              <label className="block text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wider">Kata Sandi Lama</label>
              <div className="relative">
                <input 
                  type={showOld ? "text" : "password"} 
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Masukkan kata sandi lama"
                  className="w-full h-11 bg-slate-50 border-2 border-slate-800 rounded-xl pl-3 pr-10 text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#CCFF00]"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 cursor-pointer"
                >
                  {showOld ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Input: New Password */}
            <div className="space-y-1">
              <label className="block text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wider">Kata Sandi Baru (Min 6 Karakter)</label>
              <div className="relative">
                <input 
                  type={showNew ? "text" : "password"} 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan kata sandi baru"
                  className="w-full h-11 bg-slate-50 border-2 border-slate-800 rounded-xl pl-3 pr-10 text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#CCFF00]"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 cursor-pointer"
                >
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Input: Confirm New Password */}
            <div className="space-y-1">
              <label className="block text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wider">Konfirmasi Kata Sandi Baru</label>
              <div className="relative">
                <input 
                  type={showConfirm ? "text" : "password"} 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang kata sandi baru"
                  className="w-full h-11 bg-slate-50 border-2 border-slate-800 rounded-xl pl-3 pr-10 text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#CCFF00]"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 cursor-pointer"
                >
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button 
              type="submit"
              disabled={pwdLoading}
              className="btn-arcade w-full bg-[#CCFF00] hover:bg-[#b3e600] border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] text-slate-900 font-mono font-bold text-xs uppercase py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {pwdLoading ? (
                <>
                  <Loader2 className="animate-spin" size={15} /> Menyimpan...
                </>
              ) : (
                "Simpan Kata Sandi Baru"
              )}
            </button>
          </form>
        </div>

        {/* Section: PIN Toko / Otorisasi Pemilik (Radar Anti-Fraud & Jual Rugi) */}
        <div className="bg-white border-2 border-slate-800 rounded-2xl p-6 shadow-[4px_4px_0px_#1E293B] space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
            <div className="w-9 h-9 bg-slate-900 text-[#CCFF00] border-2 border-slate-800 rounded-xl flex items-center justify-center shadow-[1px_1px_0px_#1E293B]">
              <KeyRound size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-slate-900 font-display uppercase">PIN Otorisasi Pemilik Toko</h2>
                <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full border ${
                  isPinConfigured
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-500'
                    : 'bg-amber-100 text-amber-800 border-amber-500'
                }`}>
                  {isPinConfigured ? 'AKTIF' : 'BELUM DISET'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">PIN 6 digit untuk otorisasi override jual rugi kasir & anti-fraud</p>
            </div>
          </div>

          {pinError && (
            <div className="bg-rose-50 border border-rose-300 text-rose-800 p-3 rounded-xl text-xs font-mono font-bold flex items-start gap-2">
              <ShieldAlert className="shrink-0" size={15} />
              <span>{pinError}</span>
            </div>
          )}

          {pinSuccess && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3 rounded-xl text-xs font-mono font-bold flex items-start gap-2">
              <CheckCircle2 className="shrink-0" size={15} />
              <span>{pinSuccess}</span>
            </div>
          )}

          <form onSubmit={handlePinSubmit} className="space-y-3">
            {isPinConfigured && (
              <div className="space-y-1">
                <label className="block text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wider">PIN Toko Saat Ini (6 Digit)</label>
                <input
                  type="password"
                  maxLength={6}
                  value={pinCurrent}
                  onChange={(e) => setPinCurrent(e.target.value.replace(/\D/g, ''))}
                  placeholder="Masukkan 6 digit PIN lama"
                  className="w-full h-11 bg-slate-50 border-2 border-slate-800 rounded-xl px-3 text-xs font-mono font-black text-slate-900 outline-none focus:ring-2 focus:ring-[#CCFF00] tracking-widest"
                  required
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wider">
                {isPinConfigured ? "PIN Baru (Tepat 6 Digit Angka)" : "Buat PIN Pemilik (Tepat 6 Digit Angka)"}
              </label>
              <input
                type="password"
                maxLength={6}
                value={pinNew}
                onChange={(e) => setPinNew(e.target.value.replace(/\D/g, ''))}
                placeholder="6 digit angka, misal: 123456"
                className="w-full h-11 bg-slate-50 border-2 border-slate-800 rounded-xl px-3 text-xs font-mono font-black text-slate-900 outline-none focus:ring-2 focus:ring-[#CCFF00] tracking-widest"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wider">Konfirmasi PIN Baru (6 Digit)</label>
              <input
                type="password"
                maxLength={6}
                value={pinConfirm}
                onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                placeholder="Ketik ulang 6 digit PIN baru"
                className="w-full h-11 bg-slate-50 border-2 border-slate-800 rounded-xl px-3 text-xs font-mono font-black text-slate-900 outline-none focus:ring-2 focus:ring-[#CCFF00] tracking-widest"
                required
              />
            </div>

            <button
              type="submit"
              disabled={pinLoading}
              className="btn-arcade w-full bg-[#CCFF00] hover:bg-[#b3e600] border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] text-slate-900 font-mono font-bold text-xs uppercase py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {pinLoading ? (
                <>
                  <Loader2 className="animate-spin" size={15} /> Menyimpan PIN...
                </>
              ) : isPinConfigured ? (
                "Perbarui PIN Toko"
              ) : (
                "Aktifkan PIN Toko"
              )}
            </button>
          </form>
        </div>

        {/* Section 2: Ubah Username Card */}
        <div className="bg-white border-2 border-slate-800 rounded-2xl p-6 shadow-[4px_4px_0px_#1E293B] space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
            <div className="w-9 h-9 bg-slate-900 text-[#CCFF00] border-2 border-slate-800 rounded-xl flex items-center justify-center shadow-[1px_1px_0px_#1E293B]">
              <User size={18} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 font-display uppercase">Ubah Username Akun</h2>
              <p className="text-[11px] text-slate-500 font-mono">Ganti nama pengguna untuk masuk aplikasi</p>
            </div>
          </div>

          {usernameError && (
            <div className="bg-rose-50 border border-rose-300 text-rose-800 p-3 rounded-xl text-xs font-mono font-bold flex items-start gap-2">
              <ShieldAlert className="shrink-0" size={15} />
              <span>{usernameError}</span>
            </div>
          )}

          {usernameSuccess && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3 rounded-xl text-xs font-mono font-bold flex items-start gap-2">
              <CheckCircle2 className="shrink-0" size={15} />
              <span>{usernameSuccess}</span>
            </div>
          )}

          <form onSubmit={handleUsernameSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="block text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wider">Username Baru</label>
              <input 
                type="text" 
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Masukkan username baru"
                className="w-full h-11 bg-slate-50 border-2 border-slate-800 rounded-xl px-3 text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#CCFF00]"
                required
              />
            </div>

            <button 
              type="submit"
              disabled={usernameLoading}
              className="btn-arcade w-full bg-[#CCFF00] hover:bg-[#b3e600] border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] text-slate-900 font-mono font-bold text-xs uppercase py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {usernameLoading ? (
                <>
                  <Loader2 className="animate-spin" size={15} /> Menyimpan...
                </>
              ) : (
                "Simpan Username Baru"
              )}
            </button>
          </form>
        </div>

        {/* Section 3: Manajemen Cabang & Akun Kasir */}
        <div className="bg-white border-2 border-slate-800 rounded-2xl p-6 shadow-[4px_4px_0px_#1E293B] space-y-4 lg:col-span-2">
          {/* Branch & Multi-Cashier Plan Status Banner */}
          {isEksekutif ? (
            <div className="bg-emerald-50 border-2 border-emerald-500 text-emerald-950 px-4 py-3 rounded-xl text-xs font-mono flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[2px_2px_0px_#10B981]">
              <div className="flex items-center gap-2.5 font-bold">
                <span className="text-base">🏢</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="uppercase tracking-wider font-extrabold text-emerald-900">Akses Penuh: Paket Eksekutif Aktif</span>
                    <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold font-mono">AKTIF</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 font-normal font-sans mt-0.5">
                    Cabang terdaftar: <strong>{branches.length} / 3 Cabang</strong> • Akun kasir terdaftar: <strong>{cashiers.length} / 10 Kasir</strong>
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => router.push('/billing')} 
                className="btn-arcade bg-slate-900 text-[#CCFF00] hover:bg-slate-800 text-[10px] px-3 py-1.5 rounded-lg font-mono font-bold cursor-pointer transition-all shrink-0 uppercase border border-slate-800"
              >
                Kelola Langganan ➔
              </button>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-3 rounded-xl text-xs font-mono flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <span className="flex items-center gap-2 font-bold">
                <span>🔒</span>
                <span>Manajemen Cabang &amp; Multi-Kasir (Fitur Paket Eksekutif)</span>
              </span>
              <button 
                type="button"
                onClick={() => router.push('/billing')} 
                className="btn-arcade bg-slate-900 text-[#CCFF00] hover:bg-slate-800 text-[10px] px-3 py-1.5 rounded-lg font-mono font-bold cursor-pointer transition-all shrink-0 uppercase"
              >
                Upgrade ke Eksekutif ➔
              </button>
            </div>
          )}

          <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
            <div className="w-9 h-9 bg-slate-900 text-[#CCFF00] border-2 border-slate-800 rounded-xl flex items-center justify-center shadow-[1px_1px_0px_#1E293B]">
              <Store size={18} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 font-display uppercase">Manajemen Cabang &amp; Akun Kasir</h2>
              <p className="text-[11px] text-slate-500 font-mono">Daftarkan cabang baru dan buat akun kasir terisolasi</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Form 1: Tambah Cabang Baru */}
            <div className="bg-slate-50 border-2 border-slate-800 rounded-xl p-4 space-y-3 shadow-[2px_2px_0px_#1E293B]">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-900 uppercase">
                <Building2 size={16} className="text-slate-900" />
                <span>1. Tambah Cabang Baru</span>
              </div>

              {branchError && (
                <div className="bg-rose-50 border border-rose-300 text-rose-800 p-2.5 rounded-lg text-[11px] font-mono font-bold flex items-start gap-2">
                  <ShieldAlert className="shrink-0" size={14} />
                  <span>{branchError}</span>
                </div>
              )}

              {branchSuccess && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-2.5 rounded-lg text-[11px] font-mono font-bold flex items-start gap-2">
                  <CheckCircle2 className="shrink-0" size={14} />
                  <span>{branchSuccess}</span>
                </div>
              )}

              <form onSubmit={handleAddBranch} className="flex gap-2">
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="Contoh: Cabang Pasar Senen"
                  className="flex-1 h-10 bg-white border-2 border-slate-800 rounded-xl px-3 text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#CCFF00]"
                  required
                />
                <button
                  type="submit"
                  disabled={branchLoading}
                  className="btn-arcade bg-[#CCFF00] hover:bg-[#b3e600] border-2 border-slate-800 shadow-[1px_1px_0px_#1E293B] text-slate-900 font-mono font-bold px-3 h-10 rounded-xl text-xs flex items-center gap-1.5 shrink-0 cursor-pointer uppercase"
                >
                  {branchLoading ? <Loader2 className="animate-spin" size={14} /> : <Building2 size={14} />}
                  <span>+ Cabang</span>
                </button>
              </form>

              {/* List Cabang Aktif */}
              <div className="pt-2">
                <label className="block text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Daftar Cabang ({branches.length})
                </label>
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {branches.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Belum ada cabang terdaftar.</p>
                  ) : (
                    branches.map((b) => (
                      <div key={b.id} className="flex items-center justify-between bg-white border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-slate-900">
                        <span className="flex items-center gap-2">
                          <Store size={13} className="text-slate-500" />
                          {b.name}
                        </span>
                        {b.parent_shop_id ? (
                          <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.2 rounded font-bold">Cabang</span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.2 rounded font-bold">Pusat</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Form 2: Tambah Akun Kasir Baru */}
            <div className="bg-slate-50 border-2 border-slate-800 rounded-xl p-4 space-y-3 shadow-[2px_2px_0px_#1E293B]">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-900 uppercase">
                <UserPlus size={16} className="text-slate-900" />
                <span>2. Buat Akun Kasir</span>
              </div>

              {cashierError && (
                <div className="bg-rose-50 border border-rose-300 text-rose-800 p-2.5 rounded-lg text-[11px] font-mono font-bold flex items-start gap-2">
                  <ShieldAlert className="shrink-0" size={14} />
                  <span>{cashierError}</span>
                </div>
              )}

              {cashierSuccess && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-2.5 rounded-lg text-[11px] font-mono font-bold flex items-start gap-2">
                  <CheckCircle2 className="shrink-0" size={14} />
                  <span>{cashierSuccess}</span>
                </div>
              )}

              <form onSubmit={handleAddCashier} className="space-y-2">
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono font-bold text-slate-600 uppercase">Cabang Bertugas</label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full h-9 bg-white border-2 border-slate-800 rounded-xl px-2.5 text-xs font-mono font-bold text-slate-900 outline-none"
                    required
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.parent_shop_id ? '(Cabang)' : '(Toko Utama)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-mono font-bold text-slate-600 uppercase">Nama Kasir</label>
                  <input
                    type="text"
                    value={newCashierName}
                    onChange={(e) => setNewCashierName(e.target.value)}
                    placeholder="Contoh: Budi Kasir 1"
                    className="w-full h-9 bg-white border-2 border-slate-800 rounded-xl px-2.5 text-xs font-mono font-bold text-slate-900 outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono font-bold text-slate-600 uppercase">Email Kasir</label>
                    <input
                      type="email"
                      value={newCashierEmail}
                      onChange={(e) => setNewCashierEmail(e.target.value)}
                      placeholder="kasir1@warung.com"
                      className="w-full h-9 bg-white border-2 border-slate-800 rounded-xl px-2.5 text-xs font-mono font-bold text-slate-900 outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono font-bold text-slate-600 uppercase">Password</label>
                    <input
                      type="password"
                      value={newCashierPassword}
                      onChange={(e) => setNewCashierPassword(e.target.value)}
                      placeholder="Min 6 karakter"
                      className="w-full h-9 bg-white border-2 border-slate-800 rounded-xl px-2.5 text-xs font-mono font-bold text-slate-900 outline-none"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={cashierLoading}
                  className="btn-arcade w-full bg-[#CCFF00] hover:bg-[#b3e600] border-2 border-slate-800 shadow-[1px_1px_0px_#1E293B] text-slate-900 font-mono font-bold text-xs uppercase py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                >
                  {cashierLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={14} /> Daftarkan...
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} /> Simpan Akun Kasir
                    </>
                  )}
                </button>
              </form>

              {/* List Kasir Aktif */}
              <div className="pt-2">
                <label className="block text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Daftar Kasir ({cashiers.length})
                </label>
                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                  {cashiers.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Belum ada akun kasir.</p>
                  ) : (
                    cashiers.map((c) => (
                      <div key={c.id} className="flex items-center justify-between bg-white border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-slate-900">
                        <span className="flex items-center gap-2">
                          <Users size={13} className="text-slate-500" />
                          {c.username}
                        </span>
                        <span className="bg-slate-100 text-slate-700 text-[9px] px-1.5 py-0.2 rounded font-bold">
                          {c.shops?.name || 'Cabang'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Cadangkan & Pulihkan Data (Backup & Restore) */}
        <div className="bg-white border-2 border-slate-800 rounded-2xl p-6 shadow-[4px_4px_0px_#1E293B] space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
            <div className="w-9 h-9 bg-slate-900 text-[#CCFF00] border-2 border-slate-800 rounded-xl flex items-center justify-center shadow-[1px_1px_0px_#1E293B]">
              <Database size={18} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 font-display uppercase">Cadangkan &amp; Pulihkan Data</h2>
              <p className="text-[11px] text-slate-500 font-mono">Ekspor berkas cadangan lokal (.hldata) atau restore data</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-300 p-3 rounded-xl text-xs font-mono text-slate-700 leading-relaxed">
            💡 Simpan berkas cadangan (.hldata) di tempat aman (misal Google Drive/Flashdisk) untuk proteksi bila perangkat berganti.
          </div>

          {restoreError && (
            <div className="bg-rose-50 border border-rose-300 text-rose-800 p-3 rounded-xl text-xs font-mono font-bold flex items-start gap-2">
              <ShieldAlert className="shrink-0" size={15} />
              <span>{restoreError}</span>
            </div>
          )}

          {restoreSuccess && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3 rounded-xl text-xs font-mono font-bold flex items-start gap-2">
              <CheckCircle2 className="shrink-0" size={15} />
              <span>{restoreSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleBackup}
              disabled={backupLoading}
              className="btn-arcade bg-[#CCFF00] hover:bg-[#b3e600] border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] text-slate-900 font-mono font-bold text-xs uppercase p-4 rounded-xl transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center"
            >
              <Download size={18} />
              <span>Unduh Cadangan (.hldata)</span>
            </button>

            <div className="bg-slate-900 border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] font-mono font-bold text-xs uppercase p-4 rounded-xl flex flex-col items-center justify-center gap-1.5 text-center">
              <div className="flex items-center gap-2 text-[#CCFF00]">
                <span className="w-2 h-2 rounded-full bg-[#CCFF00] animate-pulse"></span>
                <span>Cloud Database Live</span>
              </div>
              <span className="text-[10px] text-slate-300 font-sans font-normal">Tersinkronisasi Otomatis di Supabase</span>
            </div>
          </div>

          {/* Restore File Input */}
          <label className="border-2 border-dashed border-slate-300 hover:border-slate-800 bg-slate-50 hover:bg-slate-100 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center transition-all">
            <Upload size={18} className="text-slate-700" />
            <span className="text-xs font-mono font-bold uppercase text-slate-900">PULIHKAN DATA DARI BERKAS .HLDATA</span>
            <span className="text-[10px] text-slate-500 font-mono">Klik untuk memilih berkas dari perangkat Anda</span>
            <input
              type="file"
              accept=".hldata"
              onChange={handleFileChange}
              className="hidden"
              disabled={restoreLoading}
            />
          </label>
        </div>

        {/* Section 5: Danger Zone (Cadmium Red) */}
        <div className="bg-rose-50 border-2 border-rose-500 rounded-2xl p-6 shadow-[4px_4px_0px_#E30022] space-y-4">
          <div className="flex items-center gap-3 border-b border-rose-200 pb-3">
            <div className="w-9 h-9 bg-rose-600 text-white rounded-xl flex items-center justify-center shadow-[1px_1px_0px_#991B1B]">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-rose-950 font-display uppercase tracking-tight">Zona Bahaya (Danger Zone)</h2>
              <p className="text-[11px] text-rose-800 font-mono">Hapus seluruh data toko &amp; mulai dari awal</p>
            </div>
          </div>

          <p className="text-xs font-mono text-rose-900 leading-relaxed">
            Menghapus seluruh database barang, pelanggan, dan riwayat transaksi. Tindakan ini bersifat permanen dan tidak dapat dikembalikan.
          </p>

          {resetError && (
            <p className="text-xs font-mono font-bold text-rose-900 bg-white p-2.5 rounded-lg border border-rose-300">
              Peringatan: {resetError}
            </p>
          )}
          
          <button
            onClick={() => setIsResetConfirmOpen(true)}
            disabled={resetLoading}
            className="btn-arcade w-full bg-rose-600 hover:bg-rose-700 text-white font-mono font-bold text-xs uppercase h-12 rounded-xl transition-all shadow-[2px_2px_0px_#991B1B] flex items-center justify-center gap-2 cursor-pointer border border-rose-800"
          >
            {resetLoading ? (
              <>
                <Loader2 className="animate-spin" size={15} /> Mereset Data...
              </>
            ) : (
              "Hapus & Reset Ulang Semua Data"
            )}
          </button>
        </div>

        {/* Section 6: Log Aktivitas Operator (Audit Log) */}
        <div className="bg-white border-2 border-slate-800 rounded-2xl p-6 shadow-[4px_4px_0px_#1E293B] space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-900 text-[#CCFF00] border-2 border-slate-800 rounded-xl flex items-center justify-center shadow-[1px_1px_0px_#1E293B]">
                <History size={18} />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 font-display uppercase">Log Aktivitas Operator (Audit Trail)</h2>
                <p className="text-[11px] text-slate-500 font-mono">Daftar aksi dan perubahan yang dicatat secara real-time</p>
              </div>
            </div>
            <button 
              onClick={loadAuditLogs}
              className="btn-arcade text-xs font-mono font-bold text-slate-900 uppercase bg-slate-100 hover:bg-slate-200 border border-slate-300 px-3 py-1.5 rounded-lg cursor-pointer transition-all"
            >
              Muat Ulang
            </button>
          </div>

          <div className="overflow-x-auto max-h-[260px] overflow-y-auto pr-1">
            {logsLoading ? (
              <div className="text-center py-6 text-xs text-slate-500 font-mono">Memuat riwayat log...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 italic font-mono">Belum ada riwayat aktivitas tercatat.</div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-800 font-mono text-slate-700 uppercase text-[10px] font-bold">
                    <th className="pb-2">WAKTU</th>
                    <th className="pb-2">OPERATOR</th>
                    <th className="pb-2">AKSI</th>
                    <th className="pb-2">RINCIAN DESKRIPSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-slate-900">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 text-slate-500 whitespace-nowrap text-[11px]">
                        {new Date(log.created_at).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2 font-bold">{log.operator}</td>
                      <td className="py-2">
                        <span className="bg-slate-100 text-slate-800 text-[10px] px-2 py-0.5 rounded border border-slate-200 font-bold">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2 text-slate-700 font-sans">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {/* Confirm Modal for System Restore */}
      <ConfirmModal
        isOpen={isRestoreConfirmOpen}
        title="Pulihkan Seluruh Data"
        message={`Apakah Bapak/Ibu yakin ingin memulihkan seluruh data sistem dari berkas cadangan yang dibuat oleh ${pendingRestorePayload?.backup_by || 'Operator'}? Semua data transaksi, pelanggan, dan barang saat ini akan diganti dengan isi cadangan.`}
        onConfirm={handleRestoreConfirm}
        onCancel={() => {
          setIsRestoreConfirmOpen(false);
          setPendingRestorePayload(null);
        }}
        confirmLabel="YA, PULIHKAN"
        cancelLabel="BATAL"
      />

      {/* Paranoia Quota Modal */}
      {isQuotaModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white border-2 border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-[8px_8px_0px_#1E293B]">
            <div className="flex items-center gap-2 text-slate-900">
              <AlertTriangle size={24} className="text-amber-500" />
              <h2 className="text-sm font-extrabold uppercase font-display">Batas Kuota Tercapai</h2>
            </div>
            <p className="text-xs font-mono text-slate-700 leading-relaxed">{quotaMessage}</p>
            <div className="space-y-2 pt-2">
              <button 
                onClick={() => router.push('/billing')}
                className="btn-arcade w-full bg-[#CCFF00] hover:bg-[#b3e600] border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] text-slate-900 font-mono font-bold text-xs uppercase py-2.5 rounded-xl transition-all"
              >
                UPGRADE LISENSI
              </button>
              <button 
                onClick={() => setIsQuotaModalOpen(false)}
                className="btn-arcade w-full bg-white border-2 border-slate-800 text-slate-700 font-mono font-bold text-xs uppercase py-2.5 rounded-xl hover:bg-slate-100 transition-all"
              >
                MENGERTI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal for System Reset */}
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        title="Hapus Seluruh Data Toko"
        message="Apakah Bapak/Ibu yakin ingin menghapus seluruh data barang, pelanggan, dan penjualan? Semua catatan pembukuan akan hilang permanen dan tindakan ini tidak dapat dibatalkan."
        onConfirm={handleResetConfirm}
        onCancel={() => setIsResetConfirmOpen(false)}
        confirmLabel="YA, HAPUS SEMUA"
        cancelLabel="BATAL"
      />
    </div>
  );
}

