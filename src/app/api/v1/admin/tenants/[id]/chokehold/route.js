import { withAdminAuth, logAdminAudit } from '@/lib/admin-auth';
import { successResponse, errorResponse } from '@/lib/auth-helpers';

export const POST = withAdminAuth(async (request, context, adminContext) => {
  const { supabaseAdmin, adminId, adminEmail, ipAddress, userAgent } = adminContext;
  const params = await context.params;
  const shopId = params.id;

  try {
    const body = await request.json();
    const { action, days = 3, reason } = body;

    if (!reason || reason.trim().length < 10) {
      return errorResponse('Justifikasi / alasan tindakan wajib diisi minimal 10 karakter.', 'VALIDATION_ERROR', 422);
    }

    // 1. Fetch current shop
    const { data: shop, error: shopErr } = await supabaseAdmin
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single();

    if (shopErr || !shop) {
      return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);
    }

    let updates = {};
    let auditAction = '';

    if (action === 'CHOKEHOLD') {
      updates = {
        chokehold_active: true,
        operational_status: 'CHOKEHOLD',
      };
      auditAction = 'CHOKEHOLD_ENFORCE';
    } else if (action === 'DISPENSASI') {
      const graceDate = new Date();
      graceDate.setDate(graceDate.getDate() + Number(days));
      updates = {
        chokehold_active: false,
        operational_status: 'GRACE_PERIOD',
        grace_period_until: graceDate.toISOString(),
      };
      auditAction = `CHOKEHOLD_DISPENSASI_+${days}D`;
    } else if (action === 'RELEASE') {
      updates = {
        chokehold_active: false,
        operational_status: 'ACTIVE',
        grace_period_until: null,
      };
      auditAction = 'CHOKEHOLD_RELEASE';
    } else {
      return errorResponse('Aksi tidak dikenali (pilihan: CHOKEHOLD, DISPENSASI, RELEASE).', 'BAD_REQUEST', 400);
    }

    // 2. Update shops table
    const { data: updatedShop, error: updateErr } = await supabaseAdmin
      .from('shops')
      .update(updates)
      .eq('id', shopId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 3. Log to immutable audit ledger
    await logAdminAudit({
      adminId,
      adminEmail,
      actionType: auditAction,
      targetShopId: shopId,
      reason: reason.trim(),
      metadata: {
        previous_status: shop.operational_status,
        previous_chokehold: shop.chokehold_active,
        new_status: updatedShop.operational_status,
        new_chokehold: updatedShop.chokehold_active,
        grace_period_until: updatedShop.grace_period_until,
      },
      ipAddress,
      userAgent,
    });

    // 4. Broadcast realtime event to channel: shop_control:<shop_id>
    try {
      const channel = supabaseAdmin.channel(`shop_control:${shopId}`);
      await channel.send({
        type: 'broadcast',
        event: 'STATUS_LOCK_UPDATE',
        payload: {
          event: 'STATUS_LOCK_UPDATE',
          shop_id: shopId,
          chokehold_active: updatedShop.chokehold_active,
          operational_status: updatedShop.operational_status,
          reason: reason.trim(),
          timestamp: new Date().toISOString(),
        },
      });
    } catch (realtimeErr) {
      console.warn('[Realtime Broadcast Warning]', realtimeErr);
    }

    return successResponse({
      shop: updatedShop,
      message: `Status operasional toko berhasil diperbarui menjadi ${updatedShop.operational_status}.`,
    });
  } catch (err) {
    console.error('[POST /api/v1/admin/tenants/:id/chokehold]', err);
    return errorResponse('Gagal memperbarui status chokehold toko.', 'SERVER_ERROR', 500);
  }
});
