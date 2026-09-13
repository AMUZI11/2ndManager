// GET  /api/v1/shops/pin — Cek status apakah PIN toko sudah dikonfigurasi
// POST /api/v1/shops/pin — Verifikasi PIN Toko / Owner (dengan proteksi rate limit 3x salah)
// PUT  /api/v1/shops/pin — Atur atau ubah PIN Toko (Khusus role BOSS)

import { withAuthSupabase, errorResponse, successResponse } from '@/lib/auth-helpers';
import { hashPin, verifyPin, checkPinRateLimit, recordFailedPinAttempt, resetPinRateLimit } from '@/lib/security';
import { logActivity } from '@/lib/audit';

export const GET = withAuthSupabase(async (request, context, { user, profile, supabase }) => {
  try {
    let shopId = profile.shop_id;
    if (!shopId && profile.role === 'BOSS') {
      const { data: userShop } = await supabase
        .from('user_shops')
        .select('shop_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      shopId = userShop?.shop_id;
    }

    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);

    const { data: shop, error: shopErr } = await supabase
      .from('shops')
      .select('id, is_pin_configured')
      .eq('id', shopId)
      .single();

    if (shopErr) throw shopErr;

    return successResponse({
      is_pin_configured: Boolean(shop?.is_pin_configured),
    });
  } catch (err) {
    console.error('Error GET /api/v1/shops/pin:', err);
    return errorResponse('Gagal memeriksa status PIN toko: ' + err.message, 'INTERNAL_ERROR', 500);
  }
});

export const POST = withAuthSupabase(async (request, context, { user, profile, supabase }) => {
  try {
    let shopId = profile.shop_id;
    if (!shopId && profile.role === 'BOSS') {
      const { data: userShop } = await supabase
        .from('user_shops')
        .select('shop_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      shopId = userShop?.shop_id;
    }

    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);

    // 1. Cek proteksi rate-limit anti-brute force (maks 3x percobaan gagal)
    const rateStatus = checkPinRateLimit(`pin:${shopId}`);
    if (rateStatus.isLocked) {
      return errorResponse(rateStatus.message, 'RATE_LIMIT_EXCEEDED', 429, {
        retryAfterMinutes: rateStatus.retryAfterMinutes,
      });
    }

    const body = await request.json();
    const { pin } = body;

    if (!pin || typeof pin !== 'string') {
      return errorResponse('PIN wajib diisi.', 'INVALID_INPUT', 400);
    }

    const { data: shop, error: shopErr } = await supabase
      .from('shops')
      .select('id, owner_pin_hash, is_pin_configured')
      .eq('id', shopId)
      .single();

    if (shopErr) throw shopErr;

    if (!shop.is_pin_configured || !shop.owner_pin_hash) {
      if (profile.role === 'BOSS' || profile.role === 'ADMIN') {
        const newHash = hashPin(pin);
        await supabase
          .from('shops')
          .update({
            owner_pin_hash: newHash,
            is_pin_configured: true,
          })
          .eq('id', shopId);

        resetPinRateLimit(`pin:${shopId}`);
        return successResponse({
          valid: true,
          message: 'PIN awal toko berhasil dikonfigurasi.',
        });
      }

      if (pin === '123456') {
        resetPinRateLimit(`pin:${shopId}`);
        return successResponse({
          valid: true,
          message: 'PIN default 123456 diterima.',
        });
      }

      return errorResponse('PIN toko belum disetel oleh pemilik toko (Gunakan PIN default: 123456).', 'PIN_NOT_CONFIGURED', 400);
    }

    const isValid = verifyPin(pin, shop.owner_pin_hash);

    if (!isValid) {
      const attemptInfo = recordFailedPinAttempt(`pin:${shopId}`);
      if (attemptInfo.remainingAttempts === 0) {
        return errorResponse(
          'PIN salah 3 kali berturut-turut! Sistem terkunci selama 15 menit demi keamanan.',
          'PIN_LOCKED',
          429,
          { remainingAttempts: 0, retryAfterMinutes: 15 }
        );
      }
      return errorResponse(
        `PIN salah. Sisa kesempatan: ${attemptInfo.remainingAttempts} kali lagi.`,
        'INVALID_PIN',
        401,
        { remainingAttempts: attemptInfo.remainingAttempts }
      );
    }

    // Sukses verifikasi PIN -> Reset counter rate limit
    resetPinRateLimit(`pin:${shopId}`);

    return successResponse({
      valid: true,
      message: 'PIN berhasil diverifikasi.',
    });
  } catch (err) {
    console.error('Error POST /api/v1/shops/pin:', err);
    return errorResponse('Gagal memverifikasi PIN: ' + err.message, 'INTERNAL_ERROR', 500);
  }
});

export const PUT = withAuthSupabase(async (request, context, { user, profile, supabase }) => {
  try {
    if (profile.role !== 'BOSS' && profile.role !== 'ADMIN') {
      return errorResponse('Hanya pemilik toko (BOSS) yang berhak mengatur atau mengubah PIN.', 'FORBIDDEN', 403);
    }

    let shopId = profile.shop_id;
    if (!shopId) {
      const { data: userShop } = await supabase
        .from('user_shops')
        .select('shop_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      shopId = userShop?.shop_id;
    }

    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);

    const body = await request.json();
    const { new_pin, current_pin } = body;

    // Validasi format PIN 6 digit
    if (!new_pin || !/^\d{6}$/.test(new_pin)) {
      return errorResponse('PIN baru harus terdiri dari tepat 6 digit angka.', 'INVALID_FORMAT', 400);
    }

    const { data: shop, error: shopErr } = await supabase
      .from('shops')
      .select('id, owner_pin_hash, is_pin_configured')
      .eq('id', shopId)
      .single();

    if (shopErr) throw shopErr;

    // Jika sudah pernah set PIN, minta verifikasi current_pin
    if (shop.is_pin_configured && shop.owner_pin_hash) {
      if (!current_pin) {
        return errorResponse('PIN saat ini wajib disertakan untuk mengubah PIN.', 'CURRENT_PIN_REQUIRED', 400);
      }
      if (!verifyPin(current_pin, shop.owner_pin_hash)) {
        return errorResponse('PIN saat ini tidak cocok.', 'INVALID_CURRENT_PIN', 401);
      }
    }

    const newHash = hashPin(new_pin);

    const { error: updateErr } = await supabase
      .from('shops')
      .update({
        owner_pin_hash: newHash,
        is_pin_configured: true,
      })
      .eq('id', shopId);

    if (updateErr) throw updateErr;

    // Reset rate limit jika ada
    resetPinRateLimit(`pin:${shopId}`);

    await logActivity({
      user_id: user.id,
      action: 'UPDATE_OWNER_PIN',
      entity: 'shops',
      entity_id: shopId,
      metadata: { action: shop.is_pin_configured ? 'CHANGE_PIN' : 'SET_INITIAL_PIN' },
    });

    return successResponse({
      message: 'PIN Toko berhasil disimpan.',
      is_pin_configured: true,
    });
  } catch (err) {
    console.error('Error PUT /api/v1/shops/pin:', err);
    return errorResponse('Gagal memperbarui PIN toko: ' + err.message, 'INTERNAL_ERROR', 500);
  }
});
