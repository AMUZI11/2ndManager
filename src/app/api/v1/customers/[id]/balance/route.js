// GET  /api/v1/customers/[id]/balance — Saldo celengan & riwayat mutasi pelanggan
// POST /api/v1/customers/[id]/balance — Mutasi saldo manual (Top-up / Penyesuaian)
import { withAuthSupabase, errorResponse, successResponse } from '@/lib/auth-helpers';
import { logActivity } from '@/lib/audit';

export const GET = withAuthSupabase(async (request, { params }, { user, profile, supabase }) => {
  try {
    const { id } = await params;
    let shopId = profile.shop_id;
    if (profile.role === 'BOSS') {
      const { data: userShop } = await supabase
        .from('user_shops').select('shop_id').eq('user_id', user.id).single();
      shopId = userShop?.shop_id || shopId;
    }

    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .select('id, nama, phone, balance, shop_id')
      .eq('id', id)
      .eq('shop_id', shopId)
      .eq('is_deleted', false)
      .single();

    if (custErr || !customer) {
      return errorResponse('Pelanggan tidak ditemukan.', 'NOT_FOUND', 404);
    }

    const { data: mutations, error: mutErr } = await supabase
      .from('customer_balance_mutations')
      .select('*, transactions(id, nomor_bon, omzet_total)')
      .eq('customer_id', id)
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (mutErr) throw mutErr;

    // Hitung total kasbon / piutang yang belum lunas
    const { data: unpaidTx } = await supabase
      .from('transactions')
      .select('amount_owed')
      .eq('customer_id', id)
      .eq('shop_id', shopId)
      .eq('status', 'Piutang');

    const totalDebt = (unpaidTx || []).reduce((sum, t) => sum + Number(t.amount_owed || 0), 0);

    return successResponse({
      customer_id: customer.id,
      customer_name: customer.nama,
      customer_phone: customer.phone,
      balance: Number(customer.balance || 0),
      debt: totalDebt,
      mutations: mutations || [],
    });
  } catch (error) {
    console.error('[GET /customers/:id/balance]', error);
    return errorResponse('Gagal memuat data saldo pelanggan.', 'SERVER_ERROR', 500);
  }
});

export const POST = withAuthSupabase(async (request, { params }, { user, profile, supabase }) => {
  try {
    const { id } = await params;
    let shopId = profile.shop_id;
    if (profile.role === 'BOSS') {
      const { data: userShop } = await supabase
        .from('user_shops').select('shop_id').eq('user_id', user.id).single();
      shopId = userShop?.shop_id || shopId;
    }

    const body = await request.json();
    const { delta, mutation_type = 'ADJUSTMENT', notes = '' } = body;

    const amountDelta = parseInt(delta, 10);
    if (isNaN(amountDelta) || amountDelta === 0) {
      return errorResponse('Nominal mutasi tidak boleh 0.', 'VALIDATION_ERROR', 422);
    }

    const { data: newBalance, error: rpcErr } = await supabase.rpc('mutate_customer_balance', {
      p_customer_id: id,
      p_delta: amountDelta,
      p_mutation_type: mutation_type,
      p_shop_id: shopId,
      p_notes: notes?.trim() || 'Penyesuaian saldo manual',
      p_transaction_id: null,
    });

    if (rpcErr) {
      return errorResponse(rpcErr.message || 'Gagal mengubah saldo celengan.', 'BAD_REQUEST', 400);
    }

    await logActivity(
      supabase,
      shopId,
      profile.username || user.email,
      'Mutasi Saldo Celengan',
      `Mutasi ${amountDelta >= 0 ? '+' : ''}Rp${amountDelta.toLocaleString('id-ID')} untuk pelanggan #${id.slice(0, 8)}: ${notes}`
    );

    return successResponse({
      customer_id: id,
      new_balance: Number(newBalance),
    });
  } catch (error) {
    console.error('[POST /customers/:id/balance]', error);
    return errorResponse('Gagal memperbarui saldo pelanggan.', 'SERVER_ERROR', 500);
  }
});
