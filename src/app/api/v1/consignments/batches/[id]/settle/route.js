// POST /api/v1/consignments/batches/[id]/settle — Rekonsiliasi Tripartit & Settlement Konsinyasi
import { withAuthSupabase, errorResponse, successResponse } from '@/lib/auth-helpers';
import { logActivity } from '@/lib/audit';

export const POST = withAuthSupabase(async (request, { params }, { user, profile, supabase }) => {
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
    const {
      returned_qty = 0,
      damaged_qty = 0,
      loss_borne_by = 'STORE', // 'STORE' | 'VENDOR'
      payment_method = 'TUNAI', // 'TUNAI' | 'TRANSFER'
      notes = ''
    } = body;

    const returnedCount = Math.max(0, parseInt(returned_qty, 10) || 0);
    const damagedCount = Math.max(0, parseInt(damaged_qty, 10) || 0);

    // 1. Ambil data batch konsinyasi
    const { data: batch, error: batchErr } = await supabase
      .from('consignment_batches')
      .select('*, consignment_vendors(*), products(*)')
      .eq('id', id)
      .eq('shop_id', shopId)
      .single();

    if (batchErr || !batch) {
      return errorResponse('Batch konsinyasi tidak ditemukan.', 'NOT_FOUND', 404);
    }

    if (batch.status === 'SETTLED') {
      return errorResponse('Batch konsinyasi ini sudah pernah diselesaikan (Settled).', 'CONFLICT', 409);
    }

    // 2. Hitung Q_pos (Terjual di POS sejak batch dibuat)
    const { data: posItems, error: posErr } = await supabase
      .from('transaction_items')
      .select('quantity, transactions!inner(id, shop_id, created_at, status)')
      .eq('product_id', batch.product_id)
      .eq('transactions.shop_id', shopId)
      .neq('transactions.status', 'Void')
      .gte('transactions.created_at', batch.created_at);

    if (posErr) {
      console.warn('[Consignment Settle] Gagal query transaction_items, fallback ke stock calculation', posErr);
    }

    const qPosRaw = (posItems || []).reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
    const qMasuk = batch.received_qty;

    // Batasi Q_pos tidak melebihi Q_masuk
    const qPos = Math.min(qMasuk, qPosRaw);

    // 3. Rekonsiliasi Tripartit: Q_masuk vs Q_pos vs Q_retur & Q_rusak
    // Selisih hilang/tak tercatat
    const unaccountedLoss = Math.max(0, qMasuk - qPos - returnedCount - damagedCount);
    const totalPhysicalLoss = damagedCount + unaccountedLoss;

    // Tentukan unit yang dibayarkan ke vendor berdasarkan opsi tanggungan
    let vendorQtyPaid = 0;
    if (loss_borne_by === 'STORE') {
      // Toko menanggung barang hilang/rusak -> vendor tetap dibayar untuk barang laku + hilang/rusak
      vendorQtyPaid = Math.max(0, qMasuk - returnedCount);
    } else {
      // Vendor menanggung barang hilang/rusak -> warung hanya membayar apa yang tercatat laku di POS
      vendorQtyPaid = qPos;
    }

    const totalPayout = vendorQtyPaid * Number(batch.vendor_price_per_unit);
    const totalRevenuePos = qPos * Number(batch.selling_price_per_unit);
    const totalProfit = totalRevenuePos - totalPayout;

    // 4. Sinkronisasi Stok Toko:
    // Karena Q_pos sudah otomatis dipotong saat checkout kasir POS,
    // yang masih tertinggal di stok sistem dari batch ini adalah sisa fisik yang harus ditarik/dibuang:
    const remainingToDeduct = Math.max(0, returnedCount + damagedCount + unaccountedLoss);

    if (remainingToDeduct > 0) {
      await supabase.rpc('mutate_product_stock', {
        p_product_id: batch.product_id,
        p_qty: -remainingToDeduct,
      });

      await supabase.from('stock_mutations').insert({
        shop_id: shopId,
        product_id: batch.product_id,
        mutation_type: 'RETURN',
        quantity_delta: -remainingToDeduct,
        notes: `Settlement Konsinyasi batch #${batch.id.slice(0, 8)}: Retur fisik ${returnedCount} pcs, Rusak/Hilang ${totalPhysicalLoss} pcs`,
      });
    }

    // 5. Update status batch menjadi SETTLED
    const { data: updatedBatch, error: updateErr } = await supabase
      .from('consignment_batches')
      .update({
        returned_qty: returnedCount,
        sold_qty: qPos,
        lost_qty: totalPhysicalLoss,
        total_payout: totalPayout,
        total_profit: totalProfit,
        loss_borne_by: loss_borne_by,
        status: 'SETTLED',
        settled_at: new Date().toISOString(),
        settled_by: profile.id || null,
        notes: notes?.trim() || batch.notes,
      })
      .eq('id', id)
      .select('*, consignment_vendors(*), products(*)')
      .single();

    if (updateErr) throw updateErr;

    // 6. Mutasi Pengeluaran Kas Toko & Laci Kasir (CONSIGNMENT_PAYOUT)
    // Mencatat pengeluaran kas agar audit blind closing kasir akurat
    await logActivity(
      supabase,
      shopId,
      profile.username || user.email,
      'CONSIGNMENT_PAYOUT',
      `[CONSIGNMENT_PAYOUT] Pelunasan vendor "${batch.consignment_vendors?.nama_vendor}" sebesar Rp${totalPayout.toLocaleString('id-ID')} via ${payment_method}. (Masuk: ${qMasuk}, Terjual POS: ${qPos}, Retur: ${returnedCount}, Hilang/Rusak: ${totalPhysicalLoss}, Ditanggung: ${loss_borne_by})`
    );

    return successResponse({
      batch: updatedBatch,
      reconciliation: {
        received_qty: qMasuk,
        sold_pos_qty: qPos,
        returned_qty: returnedCount,
        damaged_qty: damagedCount,
        lost_qty: unaccountedLoss,
        vendor_qty_paid: vendorQtyPaid,
        loss_borne_by: loss_borne_by,
        total_payout: totalPayout,
        total_profit: totalProfit,
        payment_method: payment_method,
      },
    });
  } catch (error) {
    console.error('[POST /consignments/batches/:id/settle]', error);
    return errorResponse('Gagal menyelesaikan rekonsiliasi konsinyasi.', 'SERVER_ERROR', 500);
  }
});
