// src/app/api/v1/push/subscribe/route.js
// POST & DELETE: Manajemen Pendaftaran Perangkat Web Push (VAPID RFC 8292)

import { withAuthSupabase, errorResponse, successResponse } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const POST = withAuthSupabase(async (request, context, { user, profile, supabase }) => {
  try {
    const body = await request.json();
    const {
      organization_id,
      endpoint,
      p256dh_key,
      auth_key,
      device_label = 'Android Terminal',
      user_agent,
    } = body;

    if (!endpoint || !p256dh_key || !auth_key) {
      return errorResponse('Parameter endpoint, p256dh_key, dan auth_key wajib disertakan.', 'VALIDATION_ERROR', 400);
    }

    // Resolusi organization_id
    let resolvedOrgId = organization_id;
    if (!resolvedOrgId) {
      // Cari via user_id di organizations
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle();

      resolvedOrgId = org?.id;

      // Jika belum ada, cari via shop owner
      if (!resolvedOrgId && profile?.shop_id) {
        const { data: shop } = await supabaseAdmin
          .from('shops')
          .select('id, owner_id')
          .eq('id', profile.shop_id)
          .maybeSingle();

        if (shop) {
          const { data: shopOrg } = await supabaseAdmin
            .from('organizations')
            .select('id')
            .eq('owner_id', shop.owner_id)
            .limit(1)
            .maybeSingle();

          resolvedOrgId = shopOrg?.id;
        }
      }

      // Jika organisasi belum ada sama sekali, buatkan organisasi default untuk owner
      if (!resolvedOrgId) {
        const { data: newOrg } = await supabaseAdmin
          .from('organizations')
          .insert({
            name: profile?.username ? `Organisasi ${profile.username}` : 'Organisasi Utama',
            owner_id: user.id,
            tier_id: profile?.role === 'BOSS' ? 'EKSEKUTIF' : 'SUPERVISOR',
          })
          .select('id')
          .single();

        resolvedOrgId = newOrg?.id;
      }
    }

    if (!resolvedOrgId) {
      return errorResponse('Gagal menemukan organisasi untuk mendaftarkan push notification.', 'ORG_NOT_FOUND', 400);
    }

    // Upsert subscription
    const { data: subData, error: subErr } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert(
        {
          organization_id: resolvedOrgId,
          user_id: user.id,
          endpoint,
          p256dh_key,
          auth_key,
          device_label,
          user_agent: user_agent || 'Unknown Browser',
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      )
      .select()
      .single();

    if (subErr) {
      console.error('[POST /api/v1/push/subscribe error]', subErr);
      return errorResponse('Gagal menyimpan langganan push di database.', 'DB_ERROR', 500);
    }

    return successResponse({
      message: 'Perangkat berhasil didaftarkan untuk notifikasi Web Push.',
      subscription_id: subData.id,
      endpoint: subData.endpoint,
      device_label: subData.device_label,
    });
  } catch (err) {
    console.error('[POST /api/v1/push/subscribe unexpected error]', err);
    return errorResponse('Terjadi kesalahan internal pada server.', 'INTERNAL_ERROR', 500);
  }
});

export const DELETE = withAuthSupabase(async (request, context, { user }) => {
  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return errorResponse('Parameter endpoint wajib disertakan.', 'VALIDATION_ERROR', 400);
    }

    // Nonaktifkan subscription di database
    const { error: delErr } = await supabaseAdmin
      .from('push_subscriptions')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('endpoint', endpoint)
      .eq('user_id', user.id);

    if (delErr) {
      console.error('[DELETE /api/v1/push/subscribe error]', delErr);
      return errorResponse('Gagal menonaktifkan langganan push.', 'DB_ERROR', 500);
    }

    return successResponse({
      message: 'Langganan Web Push berhasil dinonaktifkan.',
    });
  } catch (err) {
    console.error('[DELETE /api/v1/push/subscribe unexpected error]', err);
    return errorResponse('Terjadi kesalahan internal pada server.', 'INTERNAL_ERROR', 500);
  }
});
