"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useAdminDashboardData
 * Custom hook for high-performance Arcade Brutalist Mission Control polling
 * - Smart 30-second interval with Page Visibility API
 * - Instant reconnection listener (online event)
 * - 3-second debounce cooldown on tactical manual refresh
 */
export function useAdminDashboardData(shopId = 'ALL') {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isCooldown, setIsCooldown] = useState(false);

  const isMountedRef = useRef(true);
  const lastFetchTimeRef = useRef(0);
  const cooldownTimerRef = useRef(null);

  const fetchSummary = useCallback(async (isManual = false) => {
    // 3-second debounce guard
    const now = Date.now();
    if (isManual && now - lastFetchTimeRef.current < 3000) {
      return;
    }
    lastFetchTimeRef.current = now;

    if (isManual) {
      setIsRefreshing(true);
      setIsCooldown(true);
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) setIsCooldown(false);
      }, 3000);
    }

    try {
      const q = shopId && shopId !== 'ALL' ? `?shop_id=${encodeURIComponent(shopId)}` : '';
      const res = await fetch(`/api/v1/admin/summary${q}`, {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `HTTP ${res.status}`);
      }

      const json = await res.json();
      if (isMountedRef.current) {
        setData(json.data || null);
        setLastUpdated(new Date());
        setError(null);
      }
    } catch (err) {
      console.error('[useAdminDashboardData error]', err);
      if (isMountedRef.current) {
        setError(err.message || 'Gagal menyinkronkan data Mission Control');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [shopId]);

  // Initial fetch and auto-polling
  useEffect(() => {
    isMountedRef.current = true;
    fetchSummary(false);

    // 30-second smart polling with Page Visibility API
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && navigator.onLine) {
        fetchSummary(false);
      }
    }, 30000);

    // Visibility change listener: immediately fetch when switching back to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        const elapsed = Date.now() - lastFetchTimeRef.current;
        if (elapsed > 10000) {
          fetchSummary(false);
        }
      }
    };

    // Online listener: immediately fetch when connection restored
    const handleOnline = () => {
      fetchSummary(false);
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
    }

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
      }
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
    };
  }, [fetchSummary]);

  const manualRefresh = useCallback(() => {
    if (!isCooldown) {
      fetchSummary(true);
    }
  }, [fetchSummary, isCooldown]);

  return {
    data,
    loading,
    isRefreshing,
    isCooldown,
    error,
    lastUpdated,
    manualRefresh,
  };
}
