"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Store,
  Lock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  X,
  Monitor,
} from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { bindDeviceToBranch, getAssignedBranchId, getAssignedRegisterName } from '@/utils/branchDeviceGuard';
import { hashTransferPin } from '@/utils/transitSecurity';
import { api } from '@/utils/api';

export default function BranchSetupModal({
  isOpen,
  onSuccess,
  onClose,
  isRebinding = false,
}) {
  const modalRef = useRef(null);
  useFocusTrap(modalRef, isOpen);

  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [registerName, setRegisterName] = useState('POS-01');
  const [ownerPin, setOwnerPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [pinAttempts, setPinAttempts] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  // Load branches
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    api.getBranches()
      .then((data) => {
        if (!isMounted) return;
        const branchList = Array.isArray(data) ? data : [];
        setBranches(branchList);
        
        const currentAssigned = getAssignedBranchId();
        if (currentAssigned && branchList.some(b => b.id === currentAssigned)) {
          setSelectedBranchId(currentAssigned);
        } else if (branchList.length > 0) {
          setSelectedBranchId(branchList[0].id);
        }
        setRegisterName(getAssignedRegisterName() || 'POS-01');
      })
      .catch((err) => {
        console.error('[BranchSetupModal] Error fetching branches:', err);
        if (isMounted) setErrorMsg('Gagal memuat daftar cabang.');
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const timer = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (lockoutRemaining > 0) return;

    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedBranchId) {
      setErrorMsg('Pilih salah satu cabang toko.');
      return;
    }

    if (!ownerPin || ownerPin.trim().length !== 6) {
      setErrorMsg('Masukkan 6-digit PIN Pemilik Toko untuk mengunci perangkat.');
      return;
    }

    setLoading(true);

    try {
      // Verifikasi PIN Pemilik ke server atau hash
      const pinHash = await hashTransferPin(ownerPin.trim());
      
      // Verifikasi PIN via API shop profile/pin
      const pinCheck = await api.verifyOwnerPin(ownerPin.trim());
      if (!pinCheck || !pinCheck.valid) {
        const nextAttempts = pinAttempts + 1;
        setPinAttempts(nextAttempts);
        if (nextAttempts >= 3) {
          setLockoutRemaining(60);
          setPinAttempts(0);
          throw new Error('PIN Salah 3 kali. Input terkunci selama 60 detik demi keamanan.');
        }
        throw new Error(`PIN Pemilik salah. Sisa percobaan: ${3 - nextAttempts}`);
      }

      // Berhasil diverifikasi, simpan binding ke localStorage
      const bound = bindDeviceToBranch({
        branchId: selectedBranchId,
        registerName: registerName.trim().toUpperCase() || 'POS-01',
        ownerPinHash: pinHash,
      });

      if (!bound) {
        throw new Error('Gagal menyimpan identitas perangkat ke browser.');
      }

      setPinAttempts(0);
      setSuccessMsg('Perangkat kasir berhasil diikat ke cabang!');

      setTimeout(() => {
        if (onSuccess) {
          const chosenBranch = branches.find(b => b.id === selectedBranchId);
          onSuccess({
            branchId: selectedBranchId,
            branch: chosenBranch,
            registerName: registerName.trim().toUpperCase() || 'POS-01',
          });
        }
      }, 700);
    } catch (err) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat memverifikasi perangkat.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="branch-setup-title"
        className="w-full max-w-lg bg-[#0B0F17] border-4 border-amber-400 p-6 shadow-[8px_8px_0px_#000000] text-slate-100 font-mono relative"
      >
        {isRebinding && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white hover:bg-slate-800 p-1 border border-slate-700 transition-colors"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 border-b-2 border-amber-400/40 pb-4 mb-5">
          <div className="bg-amber-400 text-black p-2 border-2 border-black font-bold">
            <Lock size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h2 id="branch-setup-title" className="text-lg font-black text-amber-400 tracking-wider">
              {isRebinding ? 'PINDAH CABANG PERANGKAT KASIR' : 'SETUP IDENTITAS TERMINAL KASIR'}
            </h2>
            <p className="text-xs text-slate-400">
              {isRebinding
                ? 'Otorisasi PIN Pemilik Toko untuk memindahkan terminal ini ke cabang lain.'
                : 'Ikat browser ini ke 1 cabang toko agar inventaris stok tidak tertukar.'}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Pilihan Cabang */}
          <div>
            <label htmlFor="branch-select" className="block text-xs font-bold text-amber-300 uppercase mb-1">
              Pilih Cabang Toko:
            </label>
            <div className="relative">
              <select
                id="branch-select"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                disabled={loading || lockoutRemaining > 0}
                className="w-full bg-[#161F30] border-2 border-slate-600 focus:border-amber-400 text-white font-bold p-2.5 text-sm outline-none uppercase cursor-pointer"
              >
                {branches.length === 0 ? (
                  <option value="">Memuat cabang...</option>
                ) : (
                  branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.branch_name || b.name} ({b.branch_code || 'CABANG'}) {b.is_main_branch ? '— [PUSAT]' : ''}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Nama Register Terminal */}
          <div>
            <label htmlFor="register-name-input" className="block text-xs font-bold text-slate-300 uppercase mb-1">
              Label Terminal Kasir:
            </label>
            <div className="flex items-center gap-2 bg-[#161F30] border-2 border-slate-600 focus-within:border-amber-400 p-2">
              <Monitor size={18} className="text-amber-400 shrink-0" strokeWidth={2.5} />
              <input
                id="register-name-input"
                type="text"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value.toUpperCase())}
                placeholder="MISAL: KASIR-01"
                maxLength={20}
                disabled={loading || lockoutRemaining > 0}
                className="w-full bg-transparent text-white font-bold outline-none text-sm placeholder:text-slate-500 uppercase"
              />
            </div>
          </div>

          {/* Otorisasi PIN Pemilik */}
          <div>
            <label htmlFor="owner-pin-input" className="block text-xs font-bold text-amber-300 uppercase mb-1">
              PIN Pemilik Toko (6 Digit):
            </label>
            <div className="flex items-center gap-2 bg-[#161F30] border-2 border-amber-500/60 focus-within:border-amber-400 p-2">
              <ShieldCheck size={18} className="text-amber-400 shrink-0" strokeWidth={2.5} />
              <input
                id="owner-pin-input"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={ownerPin}
                onChange={(e) => setOwnerPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="● ● ● ● ● ●"
                disabled={loading || lockoutRemaining > 0}
                className="w-full bg-transparent text-amber-400 font-black tracking-[0.4em] outline-none text-base placeholder:text-slate-600 text-center"
              />
            </div>
            {lockoutRemaining > 0 ? (
              <p className="text-[11px] text-red-400 font-bold mt-1">
                Terkunci selama {lockoutRemaining} detik akibat salah PIN berulang.
              </p>
            ) : (
              <p className="text-[10px] text-slate-400 mt-1">
                Wajib otorisasi pemilik toko untuk mencegah manipulasi terminal kasir.
              </p>
            )}
          </div>

          {/* Alert Messages */}
          {errorMsg && (
            <div className="flex items-start gap-2 bg-red-950/80 border-2 border-red-500 p-3 text-red-300 text-xs">
              <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" strokeWidth={2.5} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 bg-emerald-950/80 border-2 border-emerald-500 p-3 text-emerald-300 text-xs">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" strokeWidth={2.5} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Tombol Aksi */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || lockoutRemaining > 0 || !selectedBranchId || ownerPin.length !== 6}
              className={`w-full py-3 px-4 font-black uppercase text-sm border-2 border-black flex items-center justify-center gap-2 transition-all ${
                loading || lockoutRemaining > 0 || !selectedBranchId || ownerPin.length !== 6
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed border-slate-600'
                  : 'bg-amber-400 text-black hover:bg-amber-300 shadow-[4px_4px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px]'
              }`}
            >
              <Store size={18} strokeWidth={2.5} />
              <span>
                {loading ? 'MEMVERIFIKASI...' : isRebinding ? 'PINDAHKAN KE CABANG INI' : 'KUNCI & DAFTARKAN TERMINAL'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
