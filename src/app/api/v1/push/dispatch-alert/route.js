// src/app/api/v1/push/dispatch-alert/route.js
// POST: Penyiaran Notifikasi Push VAPID RFC 8292 & Generator HMAC Action Token

import crypto from 'crypto';
import webpush from 'web-push';
import { withAuthSupabase, errorResponse, successResponse } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Ambil kunci rahasia HMAC server
function getActionSecret() {
  return (
    process.env.CRITICAL_ACTION_SECRET ||
    process.env.VAPID_PRIVATE_KEY ||
    process.env.JWT_SECRET ||
    'c79f42d2a7bc4e9089f66d4822501a3de9e0ad7911b3e5a3'
  );
}

/**
 * Menghasilkan HMAC Action Token bertanda tangan kriptografis dengan TTL 120 detik
 */
export function generateActionToken(shopId, userId) {
  const secret = getActionSecret();
  const timestamp = Date.now();
  const payloadStr = `${shopId}:${userId}:${timestamp}`;
  const signature = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');

  const tokenObj = {
    shopId,
    userId,
    timestamp,
    sig: signature,
  };

  return Buffer.from(JSON.stringify(tokenObj)).toString('base64url');
}

/**
 * Validasi HMAC Action Token (TTL <= 120.000 ms)
 */
export function verifyActionToken(tokenString, expectedShopId = null) {
  if (!tokenString) {
    return { valid: false, reason: 'Token tidak disertakan' };
  }

  try {
    const rawJson = Buffer.from(tokenString, 'base64url').toString('utf8');
    const parsed = JSON.parse(rawJson);
    const { shopId, userId, timestamp, sig } = parsed;

    if (!shopId || !timestamp || !sig) {
      return { valid: false, reason: 'Format token cacat' };
    }

    if (expectedShopId && shopId !== expectedShopId) {
      return { valid: false, reason: 'ID Toko tidak cocok dengan otorisasi token' };
    }

    const age = Date.now() - Number(timestamp);
    if (age > 120000) {
      return { valid: false, reason: `Token darurat telah kedaluwarsa (${Math.round(age / 1000)}s > 120s)` };
    }

    if (age < -5000) {
      return { valid: false, reason: 'Waktu token tidak valid di masa depan' };
    }

    const secret = getActionSecret();
    const payloadStr = `${shopId}:${userId}:${timestamp}`;
    const expectedSig = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');

    if (crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'))) {
      return { valid: true, shopId, userId, timestamp };
    }

    return { valid: false, reason: 'Tanda tangan digital tidak sah' };
  } catch (e) {
    return { valid: false, reason: 'Gagal mendekode token darurat' };
  }
}

export const POST = withAuthSupabase(async (request, context, { user, profile, supabase }) => {
  try {
    const body = await request.json();
    const {
      shop_id,
      anomaly_type = 'ANOMALY_RADAR_ALERT',
      title = '🚨 PERINGATAN ANOMALI KASIR',
      message = 'Aktivitas mencurigakan terdeteksi pada kasir toko Anda.',
      severity = 'CRITICAL',
    } = body;

    const targetShopId = shop_id || profile?.shop_id;
    if (!targetShopId) {
      return errorResponse('Parameter shop_id wajib disertakan.', 'VALIDATION_ERROR', 400);
    }

    // Konfigurasi VAPID details
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:security@2ndmanager.com';
    const vapidPublicKey =
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
      'BAq3uyb0tFsLNPRi5Lv-5685irTDIkIDB2HJB-76X72uthl2XedBgA5vMpc_FfKmB6BHxSosd94obhZi3k7OPeU';
    const vapidPrivateKey =
      process.env.VAPID_PRIVATE_KEY ||
      'F_TEST_PRIVATE_KEY_FALLBACK_IF_MISSING';

    try {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    } catch (vErr) {
      console.warn('[VAPID Details Set Warning]', vErr.message);
    }

    // 1. Buat signed HMAC action token unik ber-TTL 120 detik
    const actionToken = generateActionToken(targetShopId, user.id);

    // 2. Dapatkan organization_id dari toko
    let orgId = null;
    const { data: shopOrg } = await supabaseAdmin
      .from('shops')
      .select('id, owner_id')
      .eq('id', targetShopId)
      .maybeSingle();

    if (shopOrg?.owner_id) {
      const { data: orgData } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .eq('owner_id', shopOrg.owner_id)
        .limit(1)
        .maybeSingle();
      orgId = orgData?.id;
    }

    // 3. Ambil semua push subscriptions aktif milik organisasi / user
    let query = supabaseAdmin.from('push_subscriptions').select('*').eq('is_active', true);
    if (orgId) {
      query = query.eq('organization_id', orgId);
    } else {
      query = query.eq('user_id', user.id);
    }

    const { data: subscriptions, error: subsErr } = await query;
    if (subsErr) {
      console.error('[Fetch subscriptions error]', subsErr);
      return errorResponse('Gagal mengambil daftar langganan push aktif.', 'DB_ERROR', 500);
    }

    const activeList = subscriptions || [];
    if (activeList.length === 0) {
      return successResponse({
        message: 'Tidak ada perangkat aktif yang berlangganan push notification.',
        sentCount: 0,
        actionToken,
      });
    }

    // 4. Susun payload notifikasi darurat
    const pushPayload = JSON.stringify({
      title,
      body: message,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon.svg',
      data: {
        shopId: targetShopId,
        anomalyType: anomaly_type,
        severity,
        actionToken,
      },
      actions: [
        { action: 'freeze', title: '🚨 KUNCI KASIR' },
        { action: 'dismiss', title: 'ABAIKAN' },
      ],
    });

    let sentCount = 0;
    let failedCount = 0;
    const deactivatedEndpoints = [];

    // Kirim notifikasi secara sekuensial atau terkelola
    for (const sub of activeList) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh_key,
          auth: sub.auth_key,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, pushPayload);
        sentCount++;
        // Update last_delivered_at
        await supabaseAdmin
          .from('push_subscriptions')
          .update({ last_delivered_at: new Date().toISOString() })
          .eq('id', sub.id);
      } catch (pushErr) {
        failedCount++;
        console.warn(`[WebPush Send Warning to ${sub.endpoint}]`, pushErr.statusCode || pushErr.message);

        // Jika endpoint tidak lagi valid (410 Gone / 404 Not Found), nonaktifkan
        if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
          deactivatedEndpoints.push(sub.endpoint);
        }
      }
    }

    // Bersihkan endpoint usang
    if (deactivatedEndpoints.length > 0) {
      await supabaseAdmin
        .from('push_subscriptions')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in('endpoint', deactivatedEndpoints);
    }

    return successResponse({
      message: `Notifikasi push berhasil disiarkan (${sentCount} terkirim, ${failedCount} gagal).`,
      sentCount,
      failedCount,
      totalActive: activeList.length,
      actionToken,
    });
  } catch (err) {
    console.error('[POST /api/v1/push/dispatch-alert unexpected error]', err);
    return errorResponse('Terjadi kesalahan internal pada server.', 'INTERNAL_ERROR', 500);
  }
});
