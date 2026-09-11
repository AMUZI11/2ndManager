// POST /api/v1/asset-loans/return — Pengembalian Wadah Aset Fisik & Reklasifikasi Deposit Escrow
import { withAuthSupabase, errorResponse, successResponse } from '@/lib/auth-helpers';
import { logActivity } from '@/lib/audit';

export const POST = withAuthSupabase(async (request, context, { user, profile, supabase }) => {
  try {
    const body = await request.json();
    const {
      customer_id,
      asset_type,
      quantity = 1,
      condition = 'GOOD', // 'GOOD' | 'DAMAGED' | 'REJECTED'
      notes = '',
      shift_id = null,
    } = body;

    if (!customer_id) return errorResponse('ID pelanggan wajib diisi.', 'VALIDATION_ERROR', 422);
    if (!asset_type?.trim()) return errorResponse('Tipe aset wajib diisi.', 'VALIDATION_ERROR', 422);

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return errorResponse('Jumlah unit harus lebih dari 0.', 'VALIDATION_ERROR', 422);
    }

    let shopId = profile.shop_id;
    if (!shopId && profile.role === 'BOSS') {
      const { data: userShop } = await supabase
        .from('user_shops')
        .select('shop_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      shopId = userShop?.shop_id;
    }

    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);

    // 1. Ambil data pelanggan
    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .select('id, nama, loaned_assets')
      .eq('id', customer_id)
      .eq('shop_id', shopId)
      .single();

    if (custErr || !customer) {
      return errorResponse('Pelanggan tidak ditemukan.', 'NOT_FOUND', 404);
    }

    const currentAssets = customer.loaned_assets || {};
    const currentAssetQty = parseInt(currentAssets[asset_type] || 0, 10);

    if (qty > currentAssetQty) {
      return errorResponse(
        `Pengembalian gagal: Pelanggan "${customer.nama}" hanya meminjam ${currentAssetQty} unit ${asset_type}, tidak bisa mengembalikan ${qty} unit.`,
        'INVALID_RETURN_QUANTITY',
        422
      );
    }

    // 2. Ambil deposit aktif (status HELD) milik pelanggan untuk tipe aset ini (FIFO)
    const { data: heldDeposits, error: depErr } = await supabase
      .from('customer_asset_deposits')
      .select('*, customer_asset_loans!inner(asset_type)')
      .eq('customer_id', customer_id)
      .eq('shop_id', shopId)
      .eq('status', 'HELD')
      .eq('customer_asset_loans.asset_type', asset_type)
      .order('created_at', { ascending: true });

    if (depErr) {
      console.warn('[POST /asset-loans/return] Query held deposits warning:', depErr);
    }

    let remainingQtyToProcess = qty;
    let totalRefundAmount = 0;
    let totalForfeitedAmount = 0;
    const modifiedDepositIds = [];

    const isGoodCondition = condition?.toUpperCase() === 'GOOD';

    // Proses pencairan atau penyitaan dana deposit sesuai kondisi
    for (const dep of (heldDeposits || [])) {
      if (remainingQtyToProcess <= 0) break;

      const depAmount = Number(dep.deposit_amount) || 0;
      if (isGoodCondition) {
        // KONDISI BAIK: Kembalikan uang deposit ke pelanggan
        totalRefundAmount += depAmount;
        await supabase
          .from('customer_asset_deposits')
          .update({
            status: 'REFUNDED',
            refunded_at: new Date().toISOString(),
            notes: notes ? `Pengembalian kondisi baik: ${notes}` : 'Pengembalian wadah kondisi baik',
          })
          .eq('id', dep.id);
      } else {
        // PATCH TEKNIS 2: KONDISI REJECTED / DAMAGED / HILANG
        // Sita dana deposit ke pos pendapatan sitaan jaminan aset toko (non-sales revenue)
        totalForfeitedAmount += depAmount;
        await supabase
          .from('customer_asset_deposits')
          .update({
            status: 'FORFEITED',
            refunded_at: new Date().toISOString(),
            notes: `[SITAAN_JAMINAN_ASET] Sita dana jaminan karena kondisi ${condition}: ${notes || 'Wadah rusak/hilang'}`,
          })
          .eq('id', dep.id);
      }

      modifiedDepositIds.push(dep.id);
      remainingQtyToProcess -= 1;
    }

    // 3. Mutasi atomik kurangi saldo loaned_assets pelanggan
    const { data: updatedAssets, error: rpcErr } = await supabase.rpc('mutate_customer_loaned_assets', {
      p_customer_id: customer_id,
      p_asset_type: asset_type,
      p_delta: -qty,
    });

    if (rpcErr) {
      console.error('[POST /asset-loans/return] RPC mutate_customer_loaned_assets error:', rpcErr);
      return errorResponse(`Gagal memperbarui saldo aset: ${rpcErr.message}`, 'SERVER_ERROR', 500);
    }

    // 4. Catat riwayat ke customer_asset_loans
    const loanStatus = isGoodCondition ? 'RETURNED' : 'FORFEITED';
    const { data: returnRecord, error: loanErr } = await supabase
      .from('customer_asset_loans')
      .insert({
        shop_id: shopId,
        customer_id: customer_id,
        asset_type: asset_type,
        mutation_type: 'RETURN',
        quantity: qty,
        status: loanStatus,
        returned_at: new Date().toISOString(),
        notes: isGoodCondition 
          ? `Pengembalian wadah ${condition}. Refund jaminan Rp ${totalRefundAmount.toLocaleString('id-ID')}`
          : `[PENDAPATAN SITAAN JAMINAN ASET] Tabung/galon ${condition}. Jaminan Rp ${totalForfeitedAmount.toLocaleString('id-ID')} disita jadi pendapatan toko.`,
        created_by: user.id,
      })
      .select()
      .single();

    if (loanErr) {
      console.error('[POST /asset-loans/return] Insert ledger error:', loanErr);
      throw loanErr;
    }

    // 5. Catat audit activity
    const activityDesc = isGoodCondition
      ? `Menerima pengembalian ${qty} unit ${asset_type} kondisi BAIK dari "${customer.nama}". Refund kas Rp ${totalRefundAmount.toLocaleString('id-ID')}.`
      : `Menyita uang jaminan Rp ${totalForfeitedAmount.toLocaleString('id-ID')} untuk ${qty} unit ${asset_type} kondisi ${condition} dari "${customer.nama}" (Reklasifikasi ke Pendapatan Sitaan Jaminan Aset).`;

    await logActivity(
      supabase,
      shopId,
      profile.username || user.email,
      isGoodCondition ? 'Pengembalian Aset & Refund' : 'Penyitaan Jaminan Aset',
      activityDesc
    );

    return successResponse({
      success: true,
      condition,
      loan: returnRecord,
      updated_loaned_assets: updatedAssets,
      refund_amount: totalRefundAmount,
      forfeited_amount: totalForfeitedAmount,
      cash_drawer_action: isGoodCondition && totalRefundAmount > 0 ? 'ASSET_DEPOSIT_REFUND' : 'NONE',
      reclassification_category: !isGoodCondition && totalForfeitedAmount > 0 ? 'Pendapatan Sitaan Jaminan Aset' : null,
      notes: returnRecord.notes,
    }, 200);
  } catch (error) {
    console.error('[POST /asset-loans/return]', error);
    return errorResponse(`Gagal memproses pengembalian aset: ${error.message}`, 'SERVER_ERROR', 500);
  }
});
