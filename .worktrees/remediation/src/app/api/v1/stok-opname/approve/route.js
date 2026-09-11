import { createClient } from '@/lib/supabase';
import { withBossOnly, errorResponse, checkSubscription } from '@/lib/auth-helpers';

const successResponse = (data, status = 200) => Response.json(data, { status });

export const POST = withBossOnly(async (request, context, user) => {
  try {
    if (!checkSubscription(user, 'PLUS')) {
      return errorResponse('Fitur ini membutuhkan minimal tier PLUS.', 'UPGRADE_REQUIRED', 403);
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return errorResponse('ID Stock Opname tidak diberikan.', 'VALIDATION_ERROR', 400);
    }

    const supabase = createClient();

    // 1. Fetch stock opname and items
    const { data: stockOpname, error: fetchError } = await supabase
      .from('stock_opname')
      .select('*, items:stock_opname_items(*)')
      .eq('id', id)
      .single();

    if (fetchError || !stockOpname) {
      return errorResponse('Data Stock Opname tidak ditemukan.', 'NOT_FOUND', 404);
    }

    if (stockOpname.status === 'APPROVED') {
      return errorResponse('Stock Opname sudah disetujui sebelumnya.', 'BAD_REQUEST', 400);
    }

    // 2. Update status to APPROVED
    const { error: updateError } = await supabase
      .from('stock_opname')
      .update({ status: 'APPROVED' })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    // 3. Update each product's stock
    // In a real production app, you'd use a Supabase RPC to handle this transactionally.
    for (const item of stockOpname.items) {
      const { error: productUpdateError } = await supabase
        .from('products')
        .update({ stock: item.actual_stock })
        .eq('id', item.product_id);
        
      if (productUpdateError) {
        console.error(`Failed to update product ${item.product_id} stock:`, productUpdateError);
      }
    }

    return successResponse({ ...stockOpname, status: 'APPROVED' }, 200);
  } catch (error) {
    console.error('[POST /stok-opname/approve]', error);
    return errorResponse('Gagal menyetujui stock opname.', 'SERVER_ERROR', 500);
  }
});
