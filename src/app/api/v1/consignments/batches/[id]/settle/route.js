// POST /api/v1/consignments/batches/[id]/settle — Rekonsiliasi Tripartit & Settlement Konsinyasi
import { withAuthSupabase, errorResponse, successResponse } from '@/lib/auth-helpers';
import { logActivity } from '@/lib/audit';
import { calculateTripartiteSettlement } from '@/utils/consignmentEngine';

export const POST = withAuthSupabase(async (request, { params }, { user, profile, shopId, supabase }) => {
  try {
    const { id } = await params;
    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NO_SHOP', 400);

    const body = await request.json();
    const {
      returned_qty = 0,
      damaged_qty = 0,
      loss_borne_by = 'VENDOR', // Legacy fallback
      stale_policy = null,     // 'VENDOR_BORNE' | 'STORE_BORNE' | 'SHARED_50_50'
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

    // 3. Tentukan kebijakan penanganan basi aktif (Prioritas: body.stale_policy -> batch.stale_policy -> vendor -> loss_borne_by)
    const activeStalePolicy = stale_policy 
      || batch.stale_policy 
      || batch.consignment_vendors?.stale_policy 
      || (loss_borne_by === 'STORE' ? 'STORE_BORNE' : (loss_borne_by === 'SHARED_50_50' ? 'SHARED_50_50' : 'VENDOR_BORNE'));

    // Rekonsiliasi Tripartit via consignmentEngine
    const calcResult = calculateTripartiteSettlement({
      qReceived: qMasuk,
      qSoldPos: qPos,
      qReturnedGood: returnedCount,
      qReturnedStale: damagedCount,
      vendorPrice: Number(batch.vendor_price_per_unit || 0),
      sellingPrice: Number(batch.selling_price_per_unit || 0),
      stalePolicy: activeStalePolicy,
    });

    const totalPayout = calcResult.vendorPayout;
    const totalProfit = calcResult.storeNetMargin;
    const totalPhysicalLoss = damagedCount + calcResult.unaccountedLoss;

    // 4. Sinkronisasi Stok Toko:
    // Sisa fisik yang tidak terjual di POS ditarik dari stok toko
    const remainingToDeduct = Math.max(0, returnedCount + damagedCount + calcResult.unaccountedLoss);

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
        notes: `Settlement Konsinyasi batch #${batch.id.slice(0, 8)}: Retur baik ${returnedCount} pcs, Rusak/Basi ${damagedCount} pcs, Kebijakan ${activeStalePolicy}`,
      });
    }

    // 5. Update status batch menjadi SETTLED
    const { data: updatedBatch, error: updateErr } = await supabase
      .from('consignment_batches')
      .update({
        returned_qty: returnedCount,
        sold_qty: qPos,
        lost_qty: totalPhysicalLoss,
        total_items_returned_good: returnedCount,
        total_items_returned_stale: damagedCount,
        vendor_payout_amount: totalPayout,
        store_margin_amount: totalProfit,
        total_payout: totalPayout,
        total_profit: totalProfit,
        loss_borne_by: activeStalePolicy,
        stale_policy: activeStalePolicy,
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
    if (totalPayout > 0 && payment_method !== 'TRANSFER') {
      try {
        const { data: activeShift } = await supabase
          .from('cashier_shifts')
          .select('id')
          .eq('shop_id', shopId)
          .eq('status', 'OPEN')
          .order('start_time', { ascending: false })
          .limit(1)
          .maybeSingle();

        await supabase.from('cash_drawer_movements').insert({
          shop_id: shopId,
          shift_id: activeShift?.id || null,
          movement_type: 'CASH_OUT',
          category: 'CONSIGNMENT_PAYOUT',
          amount: totalPayout,
          notes: `Pelunasan Konsinyasi #${batch.id.slice(0, 8)} (${batch.consignment_vendors?.nama_vendor || 'Vendor'})`,
          created_by: profile.id,
        });
      } catch (drawerErr) {
        console.warn('Warning recording consignment cash drawer movement:', drawerErr.message);
      }
    }

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
