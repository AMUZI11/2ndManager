// POST /api/v1/radar/freeze — Remote Panic Dispatch: Freeze & Unfreeze Register
import { withAuthSupabase, errorResponse, successResponse } from '@/lib/auth-helpers';
import { logActivity } from '@/lib/audit';

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

    if (!shopId) {
      return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);
    }

    // Hanya Owner / Boss / Admin yang dapat membekukan terminal kasir
    if (!['BOSS', 'ADMIN'].includes(profile.role)) {
      return errorResponse('Akses ditolak. Hanya pemilik toko yang dapat mengunci register.', 'FORBIDDEN', 403);
    }

    const body = await request.json();
    const {
      register_code = 'REGISTER_MAIN',
      is_frozen = true,
      reason = 'Kunci keamanan darurat oleh pemilik warung',
    } = body;

    const frozenAt = is_frozen ? new Date().toISOString() : null;

    // 1. Update status di tabel registers
    const { data: updatedReg, error: regErr } = await supabase
      .from('registers')
      .upsert({
        shop_id: shopId,
        register_code: register_code.toUpperCase(),
        is_frozen: Boolean(is_frozen),
        frozen_reason: is_frozen ? reason : null,
        frozen_at: frozenAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'shop_id,register_code' })
      .select()
      .single();

    if (regErr) {
      console.error('[Update register freeze error]', regErr);
      return errorResponse('Gagal memperbarui status terminal register.', 'DB_ERROR', 500);
    }

    // 2. Catat ke audit log
    await logActivity({
      supabase,
      userId: user.id,
      shopId,
      action: is_frozen ? 'FREEZE_REGISTER' : 'UNFREEZE_REGISTER',
      entityType: 'REGISTER',
      entityId: updatedReg?.id || register_code,
      metadata: {
        register_code,
        is_frozen,
        reason,
        triggered_by: profile.username || user.email,
      },
    });

    // 3. Siarkan sinyal seketika ke kanal Realtime
    try {
      const eventName = is_frozen ? 'FREEZE_REGISTER' : 'UNFREEZE_REGISTER';
      const payload = {
        shop_id: shopId,
        register_code: register_code.toUpperCase(),
        is_frozen: Boolean(is_frozen),
        reason: is_frozen ? reason : null,
        frozen_at: frozenAt,
        triggered_by: profile.username || 'Pemilik Toko',
        timestamp: Date.now(),
      };

      const channel = supabase.channel(`security_radar:${shopId}`);
      await channel.send({
        type: 'broadcast',
        event: eventName,
        payload,
      });

      // Juga siarkan ke shop_security channel untuk kompatibilitas
      const legacyChannel = supabase.channel(`shop_security:${shopId}`);
      await legacyChannel.send({
        type: 'broadcast',
        event: eventName,
        payload,
      });
    } catch (broadcastErr) {
      console.warn('[Broadcast freeze event error]', broadcastErr);
    }

    return successResponse({
      register_code: register_code.toUpperCase(),
      is_frozen: Boolean(is_frozen),
      frozen_reason: is_frozen ? reason : null,
      frozen_at: frozenAt,
      message: is_frozen
        ? `Terminal ${register_code} berhasil dibekukan.`
        : `Terminal ${register_code} telah dibuka kembali.`,
    });
  } catch (err) {
    console.error('[POST /api/v1/radar/freeze Unexpected Error]', err);
    return errorResponse('Terjadi kesalahan internal pada server.', 'INTERNAL_ERROR', 500);
  }
});
