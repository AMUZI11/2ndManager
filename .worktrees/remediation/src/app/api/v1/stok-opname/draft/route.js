import { createClient } from '@/lib/supabase';
import { withAuth, errorResponse, checkSubscription } from '@/lib/auth-helpers';

const successResponse = (data, status = 200) => Response.json(data, { status });

export const POST = withAuth(async (request, context, user) => {
  try {
    const role = user?.user_metadata?.role || user?.app_metadata?.role || 'CASHIER';
    if (role !== 'CASHIER' && role !== 'BOSS') {
      return errorResponse('Akses ditolak. Hanya Cashier atau Boss.', 'FORBIDDEN', 403);
    }

    if (!checkSubscription(user, 'PLUS')) {
      return errorResponse('Fitur ini membutuhkan minimal tier PLUS.', 'UPGRADE_REQUIRED', 403);
    }

    const body = await request.json();
    const { items, notes } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse('Items tidak valid.', 'VALIDATION_ERROR', 400);
    }

    const supabase = createClient();
    
    // 1. Insert stock opname
    const { data: stockOpname, error: stockOpnameError } = await supabase
      .from('stock_opname')
      .insert({
        status: 'DRAFT',
        notes: notes || null,
        created_by: user.id
      })
      .select()
      .single();

    if (stockOpnameError) {
      throw stockOpnameError;
    }

    // 2. Insert items
    const itemsData = items.map(item => ({
      stock_opname_id: stockOpname.id,
      product_id: item.product_id,
      expected_stock: item.expected_stock,
      actual_stock: item.actual_stock,
      difference: item.difference,
      notes: item.notes || null,
    }));

    const { data: opnameItems, error: itemsError } = await supabase
      .from('stock_opname_items')
      .insert(itemsData)
      .select();

    if (itemsError) {
      throw itemsError;
    }

    return successResponse({ ...stockOpname, items: opnameItems }, 201);
  } catch (error) {
    console.error('[POST /stok-opname/draft]', error);
    return errorResponse('Gagal menyimpan draft stock opname.', 'SERVER_ERROR', 500);
  }
});
