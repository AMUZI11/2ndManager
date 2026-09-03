import { withAdminAuth, logAdminAudit } from '@/lib/admin-auth';
import { successResponse, errorResponse } from '@/lib/auth-helpers';

export const POST = withAdminAuth(async (request, context, adminContext) => {
  const { supabaseAdmin, adminId, adminEmail, ipAddress, userAgent } = adminContext;
  const params = await context.params;
  const ticketId = params.id;

  try {
    const body = await request.json();
    const { resolution_notes = 'Ditangani dan diselesaikan via WhatsApp' } = body;

    const { data: updatedTicket, error } = await supabaseAdmin
      .from('support_tickets')
      .update({
        status: 'RESOLVED',
        resolved_at: new Date().toISOString(),
        resolved_by: adminId,
        resolution_notes,
      })
      .eq('id', ticketId)
      .select('*, shops(name)')
      .single();

    if (error) throw error;

    // Log to immutable audit ledger
    await logAdminAudit({
      adminId,
      adminEmail,
      actionType: 'SUPPORT_TICKET_RESOLVED',
      targetShopId: updatedTicket.shop_id,
      reason: resolution_notes,
      metadata: {
        ticket_id: ticketId,
        issue_type: updatedTicket.issue_type,
        reporter_name: updatedTicket.reporter_name,
        created_at: updatedTicket.created_at,
        resolved_at: updatedTicket.resolved_at,
      },
      ipAddress,
      userAgent,
    });

    return successResponse(updatedTicket);
  } catch (err) {
    console.error('[POST /api/v1/admin/panic-dispatch/:id/resolve]', err);
    return errorResponse('Gagal menyelesaikan tiket darurat.', 'SERVER_ERROR', 500);
  }
});
