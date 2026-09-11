import { withAuth, errorResponse, successResponse } from '@/lib/auth-helpers';

export const GET = withAuth(async (request, context, { user, supabase }) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const branchId = searchParams.get('branch_id');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Dapatkan organisasi milik user
    let { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!org) {
      // Coba cari dari user_shops jika user adalah kasir
      const { data: userShop } = await supabase
        .from('user_shops')
        .select('shop_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (userShop) {
        const { data: br } = await supabase
          .from('branches')
          .select('organization_id')
          .eq('shop_id', userShop.shop_id)
          .maybeSingle();
        if (br) org = { id: br.organization_id };
      }
    }

    if (!org) {
      return successResponse([]);
    }

    let query = supabase
      .from('stock_transfers')
      .select(`
        id,
        transfer_number,
        organization_id,
        source_branch_id,
        target_branch_id,
        status,
        notes,
        dispatched_at,
        received_at,
        failed_pin_attempts,
        is_locked,
        cancelled_at,
        cancellation_reason,
        created_at,
        source_branch:branches!source_branch_id (
          id,
          branch_name,
          branch_code
        ),
        target_branch:branches!target_branch_id (
          id,
          branch_name,
          branch_code
        ),
        stock_transfer_items (
          id,
          product_id,
          qty_dispatched,
          qty_received,
          qty_damaged,
          qty_lost,
          cogs_per_unit,
          notes,
          products (
            id,
            nama,
            barcode
          )
        ),
        transit_shrinkage_logs (
          id,
          product_id,
          qty_damaged,
          qty_lost,
          cogs_per_unit,
          total_shrinkage_cogs,
          notes
        )
      `)
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status && status !== 'ALL') {
      query = query.eq('status', status);
    }

    if (branchId && branchId !== 'ALL') {
      query = query.or(`source_branch_id.eq.${branchId},target_branch_id.eq.${branchId}`);
    }

    const { data: transfers, error } = await query;
    if (error) throw error;

    return successResponse(transfers || []);
  } catch (error) {
    console.error('[GET /transfers]', error);
    return errorResponse(`Gagal mengambil histori mutasi: ${error.message}`, 'SERVER_ERROR', 500);
  }
});
