// GET  /api/v1/purchase-orders  — Daftar riwayat Purchase Order (PO) kulakan
// POST /api/v1/purchase-orders  — Buat PO baru dari hasil seleksi checklist pasar
import { withAuthSupabase, errorResponse, successResponse } from '@/lib/auth-helpers';
import { logActivity } from '@/lib/audit';

export const GET = withAuthSupabase(async (request, { params }, { user, profile, supabase }) => {
  try {
    let shopId = profile.shop_id;
    if (profile.role === 'BOSS') {
      const { data: userShop } = await supabase
        .from('user_shops').select('shop_id').eq('user_id', user.id).single();
      shopId = userShop?.shop_id || shopId;
    }

    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NO_SHOP', 400);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('purchase_orders')
      .select('*, suppliers(id, name, phone, contact_person)')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status.toUpperCase());
    }

    const { data: orders, error } = await query;
    if (error) throw error;

    return successResponse(orders || []);
  } catch (error) {
    console.error('[GET /purchase-orders]', error);
    return errorResponse('Gagal memuat riwayat PO kulakan.', 'SERVER_ERROR', 500);
  }
});

export const POST = withAuthSupabase(async (request, { params }, { user, profile, supabase }) => {
  try {
    let shopId = profile.shop_id;
    if (profile.role === 'BOSS') {
      const { data: userShop } = await supabase
        .from('user_shops').select('shop_id').eq('user_id', user.id).single();
      shopId = userShop?.shop_id || shopId;
    }

    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NO_SHOP', 400);

    const body = await request.json();
    const { supplier_id, items, status = 'SENT', notes } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse('Item pesanan tidak boleh kosong.', 'VALIDATION_ERROR', 422);
    }

    // Generate PO Number: PO-YYYYMMDD-XXXX
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const poNumber = `PO-${dateStr}-${randomSuffix}`;

    const totalEstimatedCost = items.reduce(
      (sum, item) => sum + (Number(item.subtotal || item.estimated_cost || 0)), 
      0
    );

    const poPayload = {
      shop_id: shopId,
      supplier_id: supplier_id || null,
      po_number: poNumber,
      status: status.toUpperCase(),
      total_estimated_cost: totalEstimatedCost,
      total_actual_cost: 0,
      items: items,
      notes: notes || null,
      sent_at: status.toUpperCase() === 'SENT' ? new Date().toISOString() : null,
      created_by: user.id,
    };

    const { data: createdPO, error: insertErr } = await supabase
      .from('purchase_orders')
      .insert(poPayload)
      .select('*, suppliers(id, name, phone)')
      .single();

    if (insertErr) throw insertErr;

    await logActivity({
      shopId,
      operator: profile.username || user.email,
      action: 'CREATE_PURCHASE_ORDER',
      details: `Membuat PO ${poNumber} (${items.length} SKU, Estimasi: Rp ${totalEstimatedCost.toLocaleString('id-ID')})`,
    });

    return successResponse(createdPO, 201);
  } catch (error) {
    console.error('[POST /purchase-orders]', error);
    return errorResponse('Gagal membuat Purchase Order.', 'SERVER_ERROR', 500);
  }
});
