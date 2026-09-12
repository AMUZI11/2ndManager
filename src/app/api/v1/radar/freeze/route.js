// src/app/api/v1/radar/freeze/route.js
// POST: Remote Panic Dispatch & Lockscreen Actionable Remote Kill-Switch
// Mendukung Otorisasi Hibrida: HMAC Action Token (Layar Kunci) ATAU Session Auth (Dashboard)

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { errorResponse, successResponse } from '@/lib/auth-helpers';
import { verifyActionToken } from '@/app/api/v1/push/dispatch-alert/route';

export async function POST(request) {
  try {
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    const body = await request.json().catch(() => ({}));
    const {
      shopId,
      shop_id,
      actionToken,
      register_code = 'REGISTER_MAIN',
      is_frozen = true,
      reason = 'Kunci darurat jarak jauh diaktifkan oleh pemilik warung',
    } = body;

    const targetShopId = shopId || shop_id;
    if (!targetShopId) {
      return errorResponse('Parameter shopId / shop_id wajib disertakan.', 'VALIDATION_ERROR', 400);
    }

    let actorId = null;
    let executionSource = 'UNKNOWN';
    let isAuthorized = false;

    // ── JALUR A: OTORISASI VIA HMAC ACTION TOKEN (LOCKSCREEN ACTION) ──────────
    if (actionToken) {
      const verifyResult = verifyActionToken(actionToken, targetShopId);
      if (!verifyResult.valid) {
        return errorResponse(
          `Otorisasi Token Darurat Ditolak: ${verifyResult.reason}`,
          'INVALID_ACTION_TOKEN',
          403
        );
      }
      isAuthorized = true;
      actorId = verifyResult.userId;
      executionSource = 'LOCKSCREEN_PUSH_ACTION';
    } else {
      // ── JALUR B: OTORISASI VIA SESI USER COOKIE (DASHBOARD RADAR) ───────────
      const supabase = await createServerSupabaseClient();
      const { data: { user }, error: authErr } = await supabase.auth.getUser();

      if (authErr || !user) {
        return errorResponse('Autentikasi diperlukan untuk mengakses fungsi ini.', 'UNAUTHORIZED', 401);
      }

      // Validasi peran atau kepemilikan toko
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, role, shop_id')
        .eq('id', user.id)
        .maybeSingle();

      const isBossOrAdmin = ['BOSS', 'ADMIN'].includes(profile?.role);
      let isOwnerOfShop = false;

      if (profile?.shop_id === targetShopId) {
        isOwnerOfShop = true;
      } else {
        const { data: shopRecord } = await supabaseAdmin
          .from('shops')
          .select('id, owner_id')
          .eq('id', targetShopId)
          .maybeSingle();

        if (shopRecord?.owner_id === user.id) {
          isOwnerOfShop = true;
        }
      }

      if (!isBossOrAdmin && !isOwnerOfShop) {
        return errorResponse('Akses ditolak. Anda tidak memiliki wewenang membekukan toko ini.', 'FORBIDDEN', 403);
      }

      isAuthorized = true;
      actorId = user.id;
      executionSource = 'DASHBOARD_BUTTON';
    }

    if (!isAuthorized) {
      return errorResponse('Permintaan tidak terotorisasi.', 'UNAUTHORIZED', 401);
    }

    const actionType = is_frozen ? 'FREEZE_REGISTER' : 'UNFREEZE_REGISTER';

    // 1. Eksekusi Stored Procedure Pembekuan Kasir Darurat
    if (is_frozen) {
      const { error: rpcErr } = await supabaseAdmin.rpc('remote_freeze_cashier', {
        p_shop_id: targetShopId,
        p_reason: reason,
        p_actor_id: actorId,
      });

      if (rpcErr) {
        console.error('[RPC remote_freeze_cashier error]', rpcErr);
        // Fallback manual update jika RPC mengalami kendala
        await supabaseAdmin
          .from('registers')
          .update({
            is_frozen: true,
            frozen_reason: reason,
            frozen_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('shop_id', targetShopId);
      }
    } else {
      // Unfreeze register
      await supabaseAdmin
        .from('registers')
        .update({
          is_frozen: false,
          frozen_reason: null,
          frozen_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('shop_id', targetShopId);

      // Buka lock shift jika ada
      await supabaseAdmin
        .from('cashier_shifts')
        .update({
          is_locked: false,
          lock_reason: null,
          locked_at: null,
        })
        .eq('shop_id', targetShopId)
        .eq('status', 'OPEN');
    }

    // 2. Dapatkan organization_id untuk audit log
    let orgId = null;
    const { data: shopData } = await supabaseAdmin
      .from('shops')
      .select('id, owner_id')
      .eq('id', targetShopId)
      .maybeSingle();

    if (shopData?.owner_id) {
      const { data: orgData } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .eq('owner_id', shopData.owner_id)
        .limit(1)
        .maybeSingle();
      orgId = orgData?.id;
    }

    // 3. Catat audit log ke remote_action_logs
    await supabaseAdmin
      .from('remote_action_logs')
      .insert({
        organization_id: orgId,
        shop_id: targetShopId,
        action_type: actionType,
        triggered_by: actorId,
        source: executionSource,
        client_ip: clientIp,
        metadata: {
          register_code,
          reason,
          timestamp: Date.now(),
        },
      });

    // 4. Siarkan sinyal seketika ke kanal Supabase Realtime
    try {
      const channel = supabaseAdmin.channel(`security_radar:${targetShopId}`);
      await channel.send({
        type: 'broadcast',
        event: is_frozen ? 'REMOTE_FREEZE_TRIGGERED' : 'UNFREEZE_REGISTER',
        payload: {
          shop_id: targetShopId,
          register_code: register_code.toUpperCase(),
          is_frozen: Boolean(is_frozen),
          reason,
          frozen_at: new Date().toISOString(),
          source: executionSource,
          actor_id: actorId,
          timestamp: Date.now(),
        },
      });

      // Juga kirim broadcast event FREEZE_REGISTER untuk backward compatibility
      if (is_frozen) {
        await channel.send({
          type: 'broadcast',
          event: 'FREEZE_REGISTER',
          payload: {
            shop_id: targetShopId,
            register_code: register_code.toUpperCase(),
            is_frozen: true,
            reason,
            timestamp: Date.now(),
          },
        });
      }
    } catch (broadcastErr) {
      console.warn('[Broadcast freeze event error]', broadcastErr);
    }

    return successResponse({
      success: true,
      shop_id: targetShopId,
      register_code: register_code.toUpperCase(),
      is_frozen: Boolean(is_frozen),
      reason,
      source: executionSource,
      lockedAt: new Date().toISOString(),
      message: is_frozen
        ? 'Terminal kasir berhasil dibekukan dari jarak jauh.'
        : 'Terminal kasir berhasil dibuka kembali.',
    });
  } catch (err) {
    console.error('[POST /api/v1/radar/freeze unexpected error]', err);
    return errorResponse('Terjadi kesalahan internal pada server.', 'INTERNAL_ERROR', 500);
  }
}
