"use client";
import React, { useState, useEffect } from 'react';
import { KeyRound, ShieldAlert, CheckCircle2, AlertTriangle, Eye, EyeOff, Loader2, User, Database, Upload, Download, History } from 'lucide-react';
import { api } from '../utils/api';
import ConfirmModal from '../components/ConfirmModal';

export default function Settings() {
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

  // Load logs on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      loadAuditLogs();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

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
HL MANAGER PRO - RINGKASAN CADANGAN DATA
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
    <div className="space-y-8 animate-slide-in">
      {/* Title Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-150/40 shadow-sm">
        <h1 className="text-hero text-xl">Pengaturan Sistem</h1>
        <p className="text-gray-500 text-xs mt-1">Ubah keamanan akun Anda atau reset ulang seluruh database sistem.</p>
      </div>

      {/* Main Grid Layout */}
      <div className="space-y-6">
        
        {/* Section 1: Change Password Card */}
        <div className="bg-[#FAF7F0] border-4 border-[#E8DCC8] rounded-3xl p-6 md:p-8 max-w-xl shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#3D1A0F] text-white border border-[#4E271B] rounded-xl flex items-center justify-center">
              <KeyRound size={20} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#3D1A0F] font-heading">Ubah Kata Sandi Akun</h2>
              <p className="text-xs text-[#6B4F3A] font-semibold">Gunakan formulir di bawah ini untuk mengubah kata sandi masuk aplikasi Anda.</p>
            </div>
          </div>

          {pwdError && (
            <div className="bg-rose-50 border border-rose-100 text-rose-800 p-4 rounded-xl text-xs font-bold flex items-start gap-2 mb-4 animate-shake">
              <ShieldAlert className="flex-shrink-0" size={16} />
              <span>{pwdError}</span>
            </div>
          )}

          {pwdSuccess && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-xl text-xs font-bold flex items-start gap-2 mb-4">
              <CheckCircle2 className="flex-shrink-0" size={16} />
              <span>{pwdSuccess}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {/* Input: Old Password */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-[#6B4F3A] uppercase tracking-wider">Kata Sandi Lama</label>
              <div className="relative">
                <input 
                  type={showOld ? "text" : "password"} 
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Masukkan kata sandi lama"
                  className="w-full h-12 bg-white border border-[#E8DCC8] rounded-xl pl-4 pr-12 text-sm focus:border-[#C97B1A] outline-none transition-all font-semibold text-[#1C1009]"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Input: New Password */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-[#6B4F3A] uppercase tracking-wider">Kata Sandi Baru (Min 6 Huruf)</label>
              <div className="relative">
                <input 
                  type={showNew ? "text" : "password"} 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan kata sandi baru"
                  className="w-full h-12 bg-white border border-[#E8DCC8] rounded-xl pl-4 pr-12 text-sm focus:border-[#C97B1A] outline-none transition-all font-semibold text-[#1C1009]"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Input: Confirm New Password */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-[#6B4F3A] uppercase tracking-wider">Konfirmasi Kata Sandi Baru</label>
              <div className="relative">
                <input 
                  type={showConfirm ? "text" : "password"} 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang kata sandi baru"
                  className="w-full h-12 bg-white border border-[#E8DCC8] rounded-xl pl-4 pr-12 text-sm focus:border-[#C97B1A] outline-none transition-all font-semibold text-[#1C1009]"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button 
              type="submit"
              disabled={pwdLoading}
              className="w-full bg-[#C97B1A] hover:bg-[#A85F10] disabled:bg-gray-300 text-white font-extrabold h-12 rounded-xl text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            >
              {pwdLoading ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Menyimpan...
                </>
              ) : (
                "Simpan Kata Sandi Baru"
              )}
            </button>
          </form>
        </div>

        {/* Section 2: Ubah Username Card */}
        <div className="bg-[#FAF7F0] border-4 border-[#E8DCC8] rounded-3xl p-6 md:p-8 max-w-xl shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#3D1A0F] text-white border border-[#4E271B] rounded-xl flex items-center justify-center">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#3D1A0F] font-heading">Ubah Username Akun</h2>
              <p className="text-xs text-[#6B4F3A] font-semibold">Gunakan formulir di bawah ini untuk mengubah nama pengguna (username) Anda.</p>
            </div>
          </div>

          {usernameError && (
            <div className="bg-rose-50 border border-rose-100 text-rose-800 p-4 rounded-xl text-xs font-bold flex items-start gap-2 mb-4 animate-shake">
              <ShieldAlert className="flex-shrink-0" size={16} />
              <span>{usernameError}</span>
            </div>
          )}

          {usernameSuccess && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-xl text-xs font-bold flex items-start gap-2 mb-4">
              <CheckCircle2 className="flex-shrink-0" size={16} />
              <span>{usernameSuccess}</span>
            </div>
          )}

          <form onSubmit={handleUsernameSubmit} className="space-y-4">
            {/* Input: New Username */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-[#6B4F3A] uppercase tracking-wider">Username Baru</label>
              <input 
                type="text" 
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Masukkan username baru"
                className="w-full h-12 bg-white border border-[#E8DCC8] rounded-xl px-4 text-sm focus:border-[#C97B1A] outline-none transition-all font-semibold text-[#1C1009]"
                required
              />
            </div>

            {/* Submit button */}
            <button 
              type="submit"
              disabled={usernameLoading}
              className="w-full bg-[#C97B1A] hover:bg-[#A85F10] disabled:bg-gray-300 text-white font-extrabold h-12 rounded-xl text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            >
              {usernameLoading ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Menyimpan...
                </>
              ) : (
                "Simpan Username Baru"
              )}
            </button>
          </form>
        </div>

        {/* Section 3: Cadangkan & Pulihkan Data (Backup & Restore) */}
        <div className="bg-[#FAF7F0] border-4 border-[#E8DCC8] rounded-3xl p-6 md:p-8 max-w-xl shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#3D1A0F] text-white border border-[#4E271B] rounded-xl flex items-center justify-center">
              <Database size={20} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#3D1A0F] font-heading">Cadangkan &amp; Pulihkan Data</h2>
              <p className="text-xs text-[#6B4F3A] font-semibold">Simpan salinan database Anda secara aman atau pulihkan dari berkas cadangan.</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl text-xs font-semibold leading-relaxed">
            Penting untuk Bapak/Ibu: Berkas cadangan (.hldata) berisi seluruh data penjualan Anda yang dikemas secara aman. Bapak/Ibu tidak perlu membuka berkas tersebut di HP/Laptop. Simpan saja berkas tersebut di tempat aman untuk cadangan jika komputer bermasalah.
          </div>

          {restoreError && (
            <div className="bg-rose-50 border border-rose-100 text-rose-800 p-4 rounded-xl text-xs font-bold flex items-start gap-2 mb-4 animate-shake">
              <ShieldAlert className="flex-shrink-0" size={16} />
              <span>{restoreError}</span>
            </div>
          )}

          {restoreSuccess && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-xl text-xs font-bold flex items-start gap-2 mb-4">
              <CheckCircle2 className="flex-shrink-0" size={16} />
              <span>{restoreSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Backup Button */}
            <button
              onClick={handleBackup}
              disabled={backupLoading}
              className="bg-[#C97B1A] hover:bg-[#A85F10] disabled:bg-gray-300 text-white font-extrabold p-5 rounded-2xl text-xs shadow-md transition-all active:scale-[0.98] flex flex-col items-center justify-center gap-2 cursor-pointer text-center"
            >
              <Download size={22} />
              <span>SIMPAN CADANGAN AMAN (Unduh Berkas .hldata)</span>
            </button>

            {/* Restore File Input */}
            <label className="border-2 border-dashed border-[#E8DCC8] hover:border-[#C97B1A] bg-white rounded-2xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer text-center transition-all hover:bg-[#FAF7F0]/40">
              <Upload size={22} className="text-[#C97B1A]" />
              <span className="text-xs font-extrabold text-[#3D1A0F]">PULIHKAN DATA SISTEM (Unggah Berkas .hldata)</span>
              <input
                type="file"
                accept=".hldata"
                onChange={handleFileChange}
                className="hidden"
                disabled={restoreLoading}
              />
            </label>
          </div>
        </div>

        {/* Section 4: Log Aktivitas Operator (Audit Log) */}
        <div className="bg-[#FAF7F0] border-4 border-[#E8DCC8] rounded-3xl p-6 md:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8DCC8] pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#3D1A0F] text-white border border-[#4E271B] rounded-xl flex items-center justify-center">
                <History size={20} />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-[#3D1A0F] font-heading">Log Aktivitas Operator</h2>
                <p className="text-xs text-[#6B4F3A] font-semibold">Daftar aksi dan perubahan yang dicatat oleh sistem kas secara real-time.</p>
              </div>
            </div>
            <button 
              onClick={loadAuditLogs}
              className="text-xs font-bold text-[#C97B1A] hover:underline flex items-center gap-1 bg-white border border-[#E8DCC8] px-3 py-1.5 rounded-lg cursor-pointer"
            >
              Ulang Muat
            </button>
          </div>

          <div className="overflow-x-auto max-h-[300px] overflow-y-auto pr-1">
            {logsLoading ? (
              <div className="text-center py-8 text-xs text-[#6B4F3A] font-bold">Memuat riwayat log...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-400 italic">Belum ada riwayat aktivitas tercatat.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E8DCC8] text-[10px] text-[#6B4F3A] uppercase font-black">
                    <th className="pb-2">Waktu</th>
                    <th className="pb-2">Operator</th>
                    <th className="pb-2">Aksi</th>
                    <th className="pb-2">Rincian Deskripsi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8DCC8]/30 text-xs font-semibold text-[#1C1009]">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/30 transition-colors">
                      <td className="py-2.5 font-mono text-gray-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 font-bold text-[#3D1A0F]">{log.operator}</td>
                      <td className="py-2.5">
                        <span className="bg-[#E8DCC8] text-[#3D1A0F] text-[10px] px-2 py-0.5 rounded font-black">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 text-gray-600 font-medium">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Section 5: Reset Data Card */}
        <div className="bg-rose-50/50 border-4 border-rose-100 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 text-rose-700">
              <AlertTriangle size={22} className="flex-shrink-0" />
              <h2 className="text-base font-extrabold uppercase font-heading">Pengaturan Awal &amp; Reset Ulang Data</h2>
            </div>
            <p className="text-xs text-rose-800 leading-relaxed font-semibold">
              Gunakan tombol ini jika Bapak/Ibu ingin menghapus seluruh data barang, pelanggan, dan penjualan, lalu memulai pengisian data dari nol seperti pengguna baru. Data admin utama dan kategori dasar tidak akan dihapus.
            </p>
            {resetError && (
              <p className="text-xs font-bold text-rose-700 bg-rose-100 p-3.5 rounded-xl animate-shake mt-2">
                Peringatan: {resetError}
              </p>
            )}
          </div>
          
          <button
            onClick={() => setIsResetConfirmOpen(true)}
            disabled={resetLoading}
            className="w-full md:w-auto bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-gray-300 text-white font-extrabold px-6 py-4 rounded-2xl text-sm transition-all shadow-md hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
          >
            {resetLoading ? (
              <>
                <Loader2 className="animate-spin" size={16} /> Mereset Data...
              </>
            ) : (
              "Hapus Semua Data & Mulai Dari Awal"
            )}
          </button>
        </div>

      </div>

      {/* Confirm Modal for System Restore */}
      <ConfirmModal
        isOpen={isRestoreConfirmOpen}
        title="Pulihkan Seluruh Data"
        message={`Apakah Bapak/Ibu yakin ingin memulihkan seluruh data sistem dari berkas cadangan yang dibuat oleh ${pendingRestorePayload?.backup_by || 'Operator'}? Semua data transaksi, pelanggan, dan barang saat ini akan dihapus permanen dan diganti dengan isi cadangan.`}
        onConfirm={handleRestoreConfirm}
        onCancel={() => {
          setIsRestoreConfirmOpen(false);
          setPendingRestorePayload(null);
        }}
        confirmLabel="YA, PULIHKAN"
        cancelLabel="BATAL"
      />

      {/* Confirm Modal for System Reset */}
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        title="Hapus Seluruh Data"
        message="Apakah Bapak/Ibu yakin ingin menghapus seluruh data barang, pelanggan, dan penjualan? Semua catatan pembukuan akan hilang permanen dan tindakan ini tidak dapat dibatalkan."
        onConfirm={handleResetConfirm}
        onCancel={() => setIsResetConfirmOpen(false)}
        confirmLabel="YA, HAPUS SEMUA"
        cancelLabel="BATAL"
      />
    </div>
  );
}
