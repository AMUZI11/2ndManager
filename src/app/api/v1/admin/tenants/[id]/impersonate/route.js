import { withAdminAuth, logAdminAudit } from '@/lib/admin-auth';
import { successResponse, errorResponse } from '@/lib/auth-helpers';

export const POST = withAdminAuth(async (request, context, adminContext) => {
  const { supabaseAdmin, adminId, adminEmail, ipAddress, userAgent } = adminContext;
  const params = await context.params;
  const shopId = params.id;

  try {
    const body = await request.json();
    const { reason = 'Inspeksi kendala teknis toko darurat' } = body;

    const { data: shop, error: shopErr } = await supabaseAdmin
      .from('shops')
      .select('id, name')
      .eq('id', shopId)
      .single();

    if (shopErr || !shop) {
      return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);
    }

    // Log to immutable audit ledger
    await logAdminAudit({
      adminId,
      adminEmail,
      actionType: 'GHOST_IMPERSONATION_STARTED',
      targetShopId: shopId,
      reason: reason.trim(),
      metadata: {
        duration_minutes: 15,
        mode: 'READ_ONLY',
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      },
      ipAddress,
      userAgent,
    });

    return successResponse({
      impersonationToken: `ghost_${Date.now()}_${shopId.slice(0, 8)}`,
      shopId: shop.id,
      shopName: shop.name,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
  } catch (err) {
    console.error('[POST /api/v1/admin/tenants/:id/impersonate]', err);
    return errorResponse('Gagal memulai sesi Ghost Impersonation.', 'SERVER_ERROR', 500);
  }
});\n