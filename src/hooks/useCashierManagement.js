"use client";

import { useState, useEffect, useCallback } from 'react';

export function useCashierManagement() {
  const [cashiers, setCashiers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [billingStatus, setBillingStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [cashiersRes, branchesRes, billingRes] = await Promise.all([
        fetch('/api/v1/cashiers', { cache: 'no-store' }),
        fetch('/api/v1/branches', { cache: 'no-store' }),
        fetch('/api/v1/billing/status', { cache: 'no-store' }),
      ]);

      if (cashiersRes.ok) {
        const cJson = await cashiersRes.json();
        setCashiers(cJson?.data || []);
      }

      if (branchesRes.ok) {
        const bJson = await branchesRes.json();
        setBranches(bJson?.data || []);
      }

      if (billingRes.ok) {
        const blJson = await billingRes.json();
        setBillingStatus(blJson?.data || null);
      }
    } catch (err) {
      console.error('[useCashierManagement] Error loading data:', err);
      setError('Gagal memuat data kasir dan cabang.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Quota calculation
  const tier = (billingStatus?.tier || billingStatus?.plan || 'MAGANG').toUpperCase();
  const extraCashiersQuota = billingStatus?.extra_cashiers_quota || 0;
  
  // Base quota per tier
  const baseCashiersQuota = tier === 'EKSEKUTIF' || tier === 'JURAGAN_CABANG' ? 8 :
    tier === 'MANAJER' || tier === 'USAHA_BERKEMBANG' ? 4 :
    tier === 'SUPERVISOR' || tier === 'MANDIRI' ? 2 : 1;

  const maxAllowedCashiers = billingStatus?.max_allowed_cashiers || (baseCashiersQuota + extraCashiersQuota);
  const currentActiveCount = billingStatus?.current_active_cashiers !== undefined 
    ? billingStatus.current_active_cashiers 
    : cashiers.length;

  const isQuotaFull = currentActiveCount >= maxAllowedCashiers;

  const addCashier = async ({ username, email, password, branchId }) => {
    setError('');
    setSuccess('');

    if (isQuotaFull) {
      const msg = `Kuota kasir penuh (${maxAllowedCashiers} staf). Beli add-on slot kasir di menu Billing.`;
      setError(msg);
      throw new Error(msg);
    }

    if (!username?.trim() || !email?.trim() || !password || !branchId) {
      const msg = 'Semua kolom (Nama, Email, Password, Cabang) wajib diisi.';
      setError(msg);
      throw new Error(msg);
    }

    if (password.length < 8) {
      const msg = 'Kata sandi kasir minimal 8 karakter.';
      setError(msg);
      throw new Error(msg);
    }

    try {
      setActionLoading(true);
      const res = await fetch('/api/v1/cashiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          cashier_name: username.trim(),
          email: email.trim(),
          password,
          branch_id: branchId,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.message || json.error?.message || 'Gagal membuat akun kasir.');
      }

      setSuccess(`Akun Kasir "${username.trim()}" berhasil didaftarkan!`);
      await loadData();
      return json.data;
    } catch (err) {
      setError(err.message || 'Gagal membuat akun kasir.');
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  return {
    cashiers,
    branches,
    billingStatus,
    loading,
    actionLoading,
    error,
    success,
    setError,
    setSuccess,
    loadData,
    addCashier,
    tier,
    baseCashiersQuota,
    extraCashiersQuota,
    maxAllowedCashiers,
    currentActiveCount,
    isQuotaFull,
  };
}
