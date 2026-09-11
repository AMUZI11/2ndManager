// src/utils/posSyncEngine.js
// Client-side Background Sync Engine untuk Rekonsiliasi Transaksi & Telemetri Offline

import {
  getPendingTransactions,
  updateTransactionStatus,
  getPendingTelemetry,
  removeTelemetryItems,
  getPendingOfflineHandovers,
  removeOfflineShiftHandovers,
  getQueueStats,
} from '@/utils/posOfflineDb';

let isSyncing = false;
let syncIntervalId = null;

function notifySyncStatus(status, extra = {}) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('hl-pos-sync-status', {
        detail: { status, timestamp: Date.now(), ...extra },
      })
    );
  }
}

/**
 * Eksekusi Sinkronisasi Data Offline ke Server
 */
export async function syncOfflineData() {
  if (typeof window === 'undefined') return { success: false, reason: 'SSR' };
  if (!navigator.onLine) {
    notifySyncStatus('OFFLINE');
    return { success: false, reason: 'OFFLINE' };
  }
  if (isSyncing) {
    return { success: false, reason: 'ALREADY_SYNCING' };
  }

  isSyncing = true;
  notifySyncStatus('SYNCING');

  try {
    // 1. REKONSILIASI TRANSAKSI OFFLINE
    const pendingTxs = await getPendingTransactions();

    if (pendingTxs.length > 0) {
      const payloadTransactions = pendingTxs.map((t) => ({
        offline_id: t.id,
        nomor_bon: t.nomor_bon,
        tanggal: t.tanggal,
        shift_id: t.shift_id,
        register_id: t.register_id,
        created_at: t.created_at,
        ...t.payload,
      }));

      try {
        const res = await fetch('/api/v1/pos/sync-offline', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: JSON.stringify({ transactions: payloadTransactions }),
        });

        if (res.ok) {
          const json = await res.json();
          const results = json.data?.results || [];

          for (const item of results) {
            if (item.success) {
              await updateTransactionStatus(item.offline_id, 'SYNCED', {
                serverId: item.server_id,
              });
            } else {
              await updateTransactionStatus(item.offline_id, 'FAILED', {
                errorMessage: item.error || 'Sinkronisasi gagal di server',
              });
            }
          }
        } else {
          // Tandai status sementara
          for (const t of pendingTxs) {
            await updateTransactionStatus(t.id, 'FAILED', {
              errorMessage: `HTTP Error ${res.status}`,
            });
          }
        }
      } catch (networkErr) {
        console.warn('[posSyncEngine] Gagal menghubungi endpoint sync-offline:', networkErr);
      }
    }

    // 2. FLUSH TELEMETRY OFFLINE BUFFER
    const pendingTelemetry = await getPendingTelemetry();
    if (pendingTelemetry.length > 0) {
      const syncedTelemetryIds = [];

      for (const telem of pendingTelemetry) {
        try {
          const tRes = await fetch('/api/v1/metrics/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify(telem.payload),
            keepalive: true,
          });
          if (tRes.ok) {
            syncedTelemetryIds.push(telem.id);
          }
        } catch {
          // Abaikan per item, biarkan di buffer untuk retry berikutnya
        }
      }

      if (syncedTelemetryIds.length > 0) {
        await removeTelemetryItems(syncedTelemetryIds);
      }
    }

    // 3. FLUSH OFFLINE SHIFT HANDOVERS (TAHAP 5 PATCH #2)
    const pendingHandovers = await getPendingOfflineHandovers();
    if (pendingHandovers.length > 0) {
      const syncedHandoverIds = [];
      for (const h of pendingHandovers) {
        try {
          const hRes = await fetch('/api/v1/shifts/handover', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
              shift_id: h.shift_id,
              outgoing_cash_count: h.outgoing_cash_count,
              incoming_cash_count: h.incoming_cash_count,
              incoming_cashier_id: h.incoming_cashier_id,
              incoming_pin: h.incoming_pin,
              notes: h.notes,
            }),
          });
          if (hRes.ok) {
            syncedHandoverIds.push(h.id);
          }
        } catch {
          // Biarkan di antrean untuk putaran sinkronisasi berikutnya
        }
      }
      if (syncedHandoverIds.length > 0) {
        await removeOfflineShiftHandovers(syncedHandoverIds);
      }
    }

    // 4. STATISTIK TERBARU
    const stats = await getQueueStats();
    notifySyncStatus('IDLE', stats);
    return { success: true, stats };
  } catch (err) {
    console.error('[posSyncEngine] Error saat syncOfflineData:', err);
    notifySyncStatus('ERROR', { error: err.message });
    return { success: false, error: err.message };
  } finally {
    isSyncing = false;
  }
}

/**
 * Inisialisasi Listener Browser Online Event & Heartbeat Timer
 */
export function initPosSyncListeners() {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => {
    syncOfflineData();
  };

  const handleOffline = () => {
    notifySyncStatus('OFFLINE');
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Polling heartbeat lembut tiap 30 detik
  if (!syncIntervalId) {
    syncIntervalId = setInterval(async () => {
      if (navigator.onLine && !isSyncing) {
        const stats = await getQueueStats();
        if (stats.pending > 0) {
          syncOfflineData();
        }
      }
    }, 30000);
  }

  // Jalankan sync perdana jika online & ada antrean
  if (navigator.onLine) {
    syncOfflineData();
  }

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    if (syncIntervalId) {
      clearInterval(syncIntervalId);
      syncIntervalId = null;
    }
  };
}
