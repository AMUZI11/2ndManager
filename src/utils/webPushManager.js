/**
 * src/utils/webPushManager.js
 * Manajer Langganan Notifikasi Web Push Mandiri (W3C VAPID RFC 8292)
 * Bertanggung jawab meminta izin notifikasi browser, mendaftarkan PushSubscription,
 * dan sinkronisasi endpoint ke backend Next.js / Supabase.
 */

/**
 * Konversi URL-safe Base64 VAPID Public Key ke format Uint8Array
 * @param {string} base64String
 * @returns {Uint8Array}
 */
export function urlBase64ToUint8Array(base64String) {
  if (!base64String) return new Uint8Array();
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Cek apakah browser mendukung Web Push Notification & Service Worker
 * @returns {boolean}
 */
export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Cek status izin notifikasi dan keaktifan langganan push di browser
 * @returns {Promise<{ isSupported: boolean, permission: NotificationPermission, isSubscribed: boolean, endpoint: string|null }>}
 */
export async function checkPushSubscriptionStatus() {
  if (!isPushSupported()) {
    return {
      isSupported: false,
      permission: 'denied',
      isSubscribed: false,
      endpoint: null,
    };
  }

  const permission = Notification.permission;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    return {
      isSupported: true,
      permission,
      isSubscribed: !!subscription,
      endpoint: subscription ? subscription.endpoint : null,
    };
  } catch (err) {
    console.warn('[webPushManager] Gagal memeriksa status push subscription:', err);
    return {
      isSupported: true,
      permission,
      isSubscribed: false,
      endpoint: null,
    };
  }
}

/**
 * Mendaftarkan browser pengguna ke Web Push Service dan mengirim kunci ke server
 * @param {string} organizationId - UUID Organisasi
 * @param {string} deviceLabel - Label perangkat (opsional)
 * @returns {Promise<{ success: boolean, subscription?: any, error?: string }>}
 */
export async function subscribeUserToPush(organizationId, deviceLabel = 'Android Terminal') {
  if (!isPushSupported()) {
    return { success: false, error: 'Web Push tidak didukung pada peramban ini.' };
  }

  try {
    // 1. Minta izin notifikasi ke pengguna
    const permissionResult = await Notification.requestPermission();
    if (permissionResult !== 'granted') {
      return { success: false, error: 'Izin notifikasi tidak diberikan oleh pengguna.' };
    }

    // 2. Ambil VAPID Public Key dari environment
    const vapidPublicKey =
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
      'BAq3uyb0tFsLNPRi5Lv-5685irTDIkIDB2HJB-76X72uthl2XedBgA5vMpc_FfKmB6BHxSosd94obhZi3k7OPeU';

    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    // 3. Daftarkan PushSubscription via Service Worker
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    const subJson = subscription.toJSON();
    const endpoint = subscription.endpoint;
    const p256dh = subJson.keys?.p256dh || '';
    const auth = subJson.keys?.auth || '';

    // 4. Kirim data langganan ke endpoint backend
    const res = await fetch('/api/v1/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        organization_id: organizationId,
        endpoint,
        p256dh_key: p256dh,
        auth_key: auth,
        device_label: deviceLabel,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown Browser',
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.message || `Gagal menyimpan langganan push (HTTP ${res.status})`);
    }

    const resData = await res.json();
    console.log('[webPushManager] Push subscription berhasil disimpan:', resData);

    return {
      success: true,
      subscription: subJson,
    };
  } catch (err) {
    console.error('[webPushManager] Gagal mendaftar push notification:', err);
    return {
      success: false,
      error: err.message || 'Gagal mendaftar notifikasi push.',
    };
  }
}

/**
 * Membatalkan langganan push dari browser dan menonaktifkan entri di database
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function unsubscribeUserFromPush() {
  if (!isPushSupported()) {
    return { success: false, error: 'Push tidak didukung.' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      // Beritahu backend untuk set is_active = FALSE
      await fetch('/api/v1/push/subscribe', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ endpoint }),
      }).catch((e) => console.warn('[webPushManager] Gagal sinkronisasi unregister ke server:', e));
    }

    return { success: true };
  } catch (err) {
    console.error('[webPushManager] Gagal unsubscribe push:', err);
    return { success: false, error: err.message };
  }
}
