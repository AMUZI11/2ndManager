// PUT /api/v1/purchase-orders/[id]  — Update status PO (SENT, RECEIVED, CANCELLED)
import { withAuthSupabase, errorResponse, successResponse } from '@/lib/auth-helpers';
import { logActivity } from '@/lib/audit';

export const PUT = withAuthSupabase(async (request, { params }, { user, profile, supabase }) => {
  try {
    const { id } = await params;
    let shopId = profile.shop_id;
    if (profile.role === 'BOSS') {
      const { data: userShop } = await supabase
        .from('user_shops').select('shop_id').eq('user_id', user.id).single();
      shopId = userShop?.shop_id || shopId;
    }

    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NO_SHOP', 400);

    const body = await request.json();
    const { status, total_actual_cost, notes } = body;

    const updateData = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      updateData.status = status.toUpperCase();
      if (updateData.status === 'RECEIVED') {
        updateData.received_at = new Date().toISOString();
      } else if (updateData.status === 'SENT') {
        updateData.sent_at = new Date().toISOString();
      }
    }

    if (total_actual_cost !== undefined) {
      updateData.total_actual_cost = Number(total_actual_cost) || 0;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const { data: updated, error } = await supabase
      .from('purchase_orders')
      .update(updateData)
      .eq('id', id)
      .eq('shop_id', shopId)
      .select('*, suppliers(id, name, phone)')
      .single();

    if (error) throw error;
    if (!updated) return errorResponse('Purchase Order tidak ditemukan.', 'NOT_FOUND', 404);

    await logActivity({
      shopId,
      operator: profile.username || user.email,
      action: 'UPDATE_PO_STATUS',
      details: `Mengubah status ${updated.po_number} menjadi ${updated.status}`,
    });

    return successResponse(updated);
  } catch (error) {
    console.error('[PUT /purchase-orders/[id]]', error);
    return errorResponse('Gagal memperbarui status Purchase Order.', 'SERVER_ERROR', 500);
  }
});
