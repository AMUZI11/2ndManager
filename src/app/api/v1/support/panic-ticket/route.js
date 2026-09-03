import { withAuthSupabase, successResponse, errorResponse } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const POST = withAuthSupabase(async (request, context, { user, profile }) => {
  try {
    const body = await request.json();
    const { issue_type, custom_note = '', telemetry = {} } = body;

    const { data: userShop } = await supabaseAdmin
      .from('user_shops')
      .select('shop_id, shops(name)')
      .eq('user_id', user.id)
      .single();

    const shopId = userShop?.shop_id;
    if (!shopId) {
      return errorResponse('Toko pengguna tidak ditemukan.', 'NOT_FOUND', 404);
    }

    const shopName = userShop?.shops?.name || 'Toko Saya';

    // Insert into support_tickets
    const { data: ticket, error: ticketErr } = await supabaseAdmin
      .from('support_tickets')
      .insert({
        shop_id: shopId,
        issue_type: issue_type || 'Bantuan Operasional Darurat',
        reporter_name: profile?.username || user.email.split('@')[0],
        reporter_phone: profile?.phone || '08xxxxxxxxxx',
        telemetry_payload: {
          ...telemetry,
          custom_note,
          userAgent: request.headers.get('user-agent'),
          reported_at: new Date().toISOString(),
        },
        status: 'OPEN',
        priority: 'CRITICAL',
      })
      .select()
      .single();

    if (ticketErr) throw ticketErr;

    // Broadcast to platform_events channel
    try {
      const channel = supabaseAdmin.channel('platform_events');
      await channel.send({
        type: 'broadcast',
        event: 'PANIC_TICKET_RAISED',
        payload: {
          event: 'PANIC_TICKET_RAISED',
          ticket_id: ticket.id,
          shop_id: shopId,
          shop_name: shopName,
          issue_type: ticket.issue_type,
          reporter_name: ticket.reporter_name,
          reporter_phone: ticket.reporter_phone,
          timestamp: ticket.created_at,
        },
      });
    } catch (broadcastErr) {
      console.warn('[Broadcast panic warning]', broadcastErr);
    }

    return successResponse(ticket, 201);
  } catch (err) {
    console.error('[POST /api/v1/support/panic-ticket]', err);
    return errorResponse('Gagal mengirimkan tiket darurat.', 'SERVER_ERROR', 500);
  }
});
