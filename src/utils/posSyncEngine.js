// src/utils/posSyncEngine.js
// Client-side Background & Foreground Sync Engine untuk Rekonsiliasi Transaksi Offline
// Terintegrasi dengan Web Locks Mutex, Batch Chunking 25, dan Endpoint Kanonikal /api/v1/transactions/bulk-sync

import {
  getPendingTransactions,
  updateTransactionStatus,
  getPendingTelemetry,
  removeTelemetryItems,
  getPendingOfflineHandovers,
  removeOfflineShiftHandovers,
  getQueueStats,
} from '@/utils/posOfflineDb';
import {
  acquireSyncMutex,
  chunkTransactions,
  registerBackgroundSync,
  sleepThrottle,
  SYNC_BATCH_SIZE,
} from '@/utils/backgroundSyncEngine';

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
 * Dilindungi Web Locks Mutex 'pos_tx_sync_mutex'
 */
export async function syncOfflineData() {
  if (typeof window === 'undefined') return { success: false, reason: 'SSR' };
  if (!navigator.onLine) {
    notifySyncStatus('OFFLINE');
    return { success: false, reason: 'OFFLINE' };
  }

  // Bungkus dalam Web Locks Mutex
  const mutexExecution = await acquireSyncMutex(async () => {
    isSyncing = true;
    notifySyncStatus('SYNCING');

    try {
      // 1. REKONSILIASI TRANSAKSI OFFLINE DENGAN BATCH CHUNKING (25 ITEM/REQ)
      const pendingTxs = await getPendingTransactions();

      if (pendingTxs.length > 0) {
        const txBatches = chunkTransactions(pendingTxs, SYNC_BATCH_SIZE);

        for (const batch of txBatches) {
          const payloadTransactions = batch.map((t) => ({
            clientTxUuid: t.id || t.payload?.idempotency_key,
            nomorBon: t.nomor_bon,
            tanggal: t.tanggal,
            shiftId: t.shift_id,
            registerId: t.register_id,
            offlineCreatedAt: t.created_at,
            items: t.payload?.items || [],
            paymentMethod: t.payload?.payment_method || 'CASH',
            grossAmount: t.payload?.total_bayar || t.payload?.subtotal || 0,
            finalAmount: t.payload?.total_akhir || t.payload?.total_bayar || 0,
            paymentStatus: t.payload?.status || 'Lunas',
            customerId: t.payload?.customer_id || null,
            payload: t.payload,
          }));

          try {
            const res = await fetch('/api/v1/transactions/bulk-sync', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-Synced-Via': 'FOREGROUND_SYNC',
              },
              body: JSON.stringify({
                syncedVia: 'FOREGROUND_SYNC',
                transactions: payloadTransactions,
              }),
            });

            if (res.ok) {
              const json = await res.json();
              const processedUuids = new Set(json.processedUuids || []);

              for (const item of batch) {
                if (processedUuids.has(item.id)) {
                  await updateTransactionStatus(item.id, 'SYNCED', {
                    serverId: item.id,
                  });
                } else {
                  await updateTransactionStatus(item.id, 'FAILED', {
                    errorMessage: 'Ditolak atau duplikat di server',
                  });
                }
              }
            } else {
              for (const t of batch) {
                await updateTransactionStatus(t.id, 'FAILED', {
                  errorMessage: `HTTP Error ${res.status}`,
                });
              }
              break; // Hentikan batch berikutnya jika server merespons error
            }
          } catch (networkErr) {
            console.warn('[posSyncEngine] Network error saat bulk-sync batch:', networkErr);
            break;
          }

          // Jeda napas 50ms antar-batch untuk melegakan thread ponsel low-end
          await sleepThrottle(50);
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

      // 3. FLUSH OFFLINE SHIFT HANDOVERS
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
            // Biarkan di antrean untuk putaran berikutnya
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
  });

  if (!mutexExecution.executed) {
    return { success: false, reason: mutexExecution.reason };
  }

  return mutexExecution.result;
}

/**
 * Inisialisasi Listener Browser Online Event, Background Sync Registration & Heartbeat Timer
 */
export function initPosSyncListeners() {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => {
    // Daftarkan Service Worker background sync jika didukung
    registerBackgroundSync();
    // Jalankan sync langsung via foreground
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

  // Jalankan sync perdana jika online & daftarkan tag background sync
  if (navigator.onLine) {
    registerBackgroundSync();
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
