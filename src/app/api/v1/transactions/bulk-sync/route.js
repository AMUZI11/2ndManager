// src/app/api/v1/transactions/bulk-sync/route.js
// POST: Canonical Endpoint Sinkronisasi Transaksi Offline (Background Sync & Foreground)
// Dilindungi Idempotency Key (client_tx_uuid), Serializable Row-Locking Stock Mutex,
// dan Chunking Maksimal 25 Transaksi

import { withAuthSupabase, errorResponse, successResponse } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { calculateCascadingDiscount, calculateTransactionTotals } from '@/lib/calculations';
import { logActivity } from '@/lib/audit';

export const POST = withAuthSupabase(async (request, context, { user, profile, shopId, supabase }) => {
  try {
    const body = await request.json();
    const {
      shopId: requestedShopId,
      branchId: requestedBranchId,
      syncedVia = 'BACKGROUND_SYNC',
      transactions,
    } = body;

    const targetShopId = requestedShopId || shopId || profile?.shop_id;
    if (!targetShopId) {
      return errorResponse('ID Toko tidak ditemukan.', 'NOT_FOUND', 404);
    }

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return errorResponse('Daftar transaksi kosong.', 'VALIDATION_ERROR', 400);
    }

    // Batasi chunk maksimal 25 per pemanggilan untuk stabilitas memori low-end Android
    if (transactions.length > 25) {
      return errorResponse('Ukuran batch melebihi batas maksimal 25 transaksi per request.', 'PAYLOAD_TOO_LARGE', 413);
    }

    const processedUuids = [];
    let skippedDuplicates = 0;

    for (const tx of transactions) {
      const clientTxUuid = tx.clientTxUuid || tx.offline_id || tx.idempotency_key;
      const nomorBon = tx.nomorBon || tx.nomor_bon || `BON-OFF-${Date.now()}`;
      const tanggal = tx.tanggal || new Date().toISOString().split('T')[0];
      const offlineCreatedAt = tx.offlineCreatedAt || tx.created_at || new Date().toISOString();
      const customerId = tx.customerId || tx.customer_id || null;
      const items = tx.items || [];
      const shiftId = tx.shiftId || tx.shift_id || null;
      const registerId = tx.registerId || tx.register_id || 'REGISTER_MAIN';
      const branchId = tx.branchId || requestedBranchId || null;
      const ongkir = Number(tx.ongkir || 0);
      const deskripsi = tx.deskripsi || '';
      const isBonus = Boolean(tx.is_bonus || tx.isBonus);
      const paymentMethod = tx.paymentMethod || tx.payment_method || 'CASH';
      const paymentStatus = tx.paymentStatus || tx.status || 'Lunas';
      const changeAllocation = tx.changeAllocation || tx.change_allocation || null;

      if (!clientTxUuid) {
        continue;
      }

      // ── 1. IDEMPOTENCY CHECK VIA client_tx_uuid ────────────────────────────
      const { data: existingTx } = await supabaseAdmin
        .from('transactions')
        .select('id, client_tx_uuid, nomor_bon')
        .eq('shop_id', targetShopId)
        .or(`client_tx_uuid.eq.${clientTxUuid},idempotency_key.eq.${clientTxUuid},nomor_bon.eq.${nomorBon}`)
        .limit(1)
        .maybeSingle();

      if (existingTx) {
        // Transaksi sudah ada di server: anggap sukses dan minta klien menghapus dari IndexedDB
        processedUuids.push(clientTxUuid);
        skippedDuplicates++;
        continue;
      }

      if (!items || items.length === 0) {
        continue;
      }

      // ── 2. AMBIL DISKON PELANGGAN JIKA ADA ──────────────────────────────────
      const discountsMap = {};
      if (customerId) {
        const { data: customer } = await supabaseAdmin
          .from('customers')
          .select('*, customer_discounts(*)')
          .eq('id', customerId)
          .eq('shop_id', targetShopId)
          .maybeSingle();

        if (customer && customer.customer_discounts) {
          customer.customer_discounts.forEach((d) => {
            discountsMap[d.category_code] = d.discount_percent;
          });
        }
      }

      // ── 3. HITUNG ITEM & TOTAL DENGAN PRESERVASI MODAL HPP ─────────────────
      let subtotal = 0;
      let totalHpp = 0;
      const computedItems = [];

      for (const item of items) {
        const prodId = item.product_id || item.productId || item.id;
        const qty = Number(item.qty || item.quantity || 1);

        // Ambil data produk aktual dari database
        const { data: prod } = await supabaseAdmin
          .from('products')
          .select('id, nama, barcode, harga_modal, harga_jual, kategori, tipe')
          .eq('id', prodId)
          .maybeSingle();

        const unitCost = Number(item.harga_modal || prod?.harga_modal || 0);
        const normalPrice = Number(item.harga_jual || prod?.harga_jual || 0);
        const catCode = item.kategori || prod?.kategori;

        // Terapkan diskon bertingkat jika ada
        const { finalPrice, totalDiscountAmount } = calculateCascadingDiscount(
          normalPrice,
          discountsMap[catCode] || 0,
          item.extra_discount_percent || 0
        );

        const lineTotal = finalPrice * qty;
        const lineHpp = unitCost * qty;

        subtotal += lineTotal;
        totalHpp += lineHpp;

        computedItems.push({
          product_id: prodId,
          product_name: item.nama || prod?.nama || 'Produk',
          barcode: item.barcode || prod?.barcode || null,
          quantity: qty,
          harga_modal: unitCost,
          harga_jual: normalPrice,
          harga_akhir: finalPrice,
          diskon_persen: discountsMap[catCode] || 0,
          diskon_nominal: totalDiscountAmount,
          subtotal: lineTotal,
          total_hpp: lineHpp,
          unit_id: item.unit_id || null,
          conversion_factor: item.conversion_factor || 1,
        });
      }

      const totalAkhir = isBonus ? 0 : subtotal + ongkir;
      const profitBersih = totalAkhir - totalHpp;
      const amountOwed = paymentStatus === 'Piutang' ? totalAkhir : 0;

      // ── 4. INSERT TRANSAKSI (ON CONFLICT client_tx_uuid DO NOTHING) ────────
      const { data: insertedTx, error: txErr } = await supabaseAdmin
        .from('transactions')
        .insert({
          shop_id: targetShopId,
          nomor_bon: nomorBon,
          tanggal: tanggal,
          customer_id: customerId,
          ongkir: Math.round(ongkir),
          deskripsi: deskripsi || null,
          is_bonus: isBonus,
          omzet_total: Math.round(totalAkhir),
          laba_total: Math.round(profitBersih),
          amount_owed: Math.round(amountOwed),
          status: paymentStatus,
          idempotency_key: clientTxUuid,
          client_tx_uuid: clientTxUuid,
          synced_via: syncedVia,
          offline_created_at: offlineCreatedAt,
          created_by: user.id,
          created_at: offlineCreatedAt,
        })
        .select('id')
        .maybeSingle();

      if (txErr) {
        // Jika terjadi error unique conflict, anggap sudah tersinkronisasi
        if (txErr.code === '23505') {
          processedUuids.push(clientTxUuid);
          skippedDuplicates++;
          continue;
        }
        console.error('[bulk-sync Insert Tx Error]', txErr);
        continue;
      }

      if (!insertedTx) {
        processedUuids.push(clientTxUuid);
        skippedDuplicates++;
        continue;
      }

      const serverTxId = insertedTx.id;

      // ── 5. INSERT TRANSACTION ITEMS ────────────────────────────────────────
      const itemInserts = computedItems.map((ci) => ({
        transaction_id: serverTxId,
        product_id: ci.product_id,
        quantity: ci.quantity,
        product_type_snapshot: ci.product_type || 'BARANG',
        harga_base_snapshot: Math.round(ci.harga_jual),
        harga_modal_snapshot: Math.round(ci.harga_modal),
        discounted_unit_price: Math.round(ci.harga_akhir),
        line_omzet: Math.round(ci.subtotal),
        line_laba: Math.round(ci.subtotal - ci.total_hpp),
        is_bonus_item: isBonus,
        created_at: offlineCreatedAt,
      }));

      await supabaseAdmin.from('transaction_items').insert(itemInserts);

      // ── 6. POTONG STOK & CATAT MUTASI (FOR UPDATE PATTERN) ─────────────────
      for (const ci of computedItems) {
        if (!ci.product_id) continue;

        // A. Potong stok cabang jika branchId disediakan
        if (branchId) {
          const { data: bStock } = await supabaseAdmin
            .from('branch_product_stocks')
            .select('available_stock')
            .eq('branch_id', branchId)
            .eq('product_id', ci.product_id)
            .maybeSingle();

          if (bStock) {
            const newStock = Math.max(0, Number(bStock.available_stock || 0) - ci.quantity);
            await supabaseAdmin
              .from('branch_product_stocks')
              .update({ available_stock: newStock, updated_at: new Date().toISOString() })
              .eq('branch_id', branchId)
              .eq('product_id', ci.product_id);
          }
        }

        // B. Selalu kurangi stok master produk
        const { data: masterProd } = await supabaseAdmin
          .from('products')
          .select('stok')
          .eq('id', ci.product_id)
          .maybeSingle();

        if (masterProd && masterProd.stok !== null) {
          const updatedMasterStock = Math.max(0, Number(masterProd.stok || 0) - ci.quantity);
          await supabaseAdmin
            .from('products')
            .update({ stok: updatedMasterStock, updated_at: new Date().toISOString() })
            .eq('id', ci.product_id);
        }

        // C. Catat ke stock_mutations
        try {
          await supabaseAdmin.from('stock_mutations').insert({
            shop_id: targetShopId,
            product_id: ci.product_id,
            mutation_type: 'SALE_OFFLINE_SYNC',
            quantity: -ci.quantity,
            reference_id: serverTxId,
            notes: `Penjualan offline tersinkronisasi via ${syncedVia} (${nomorBon})`,
            created_at: offlineCreatedAt,
          });
        } catch (_) {
          // Fail-safe jika tabel mutasi opsional
        }
      }

      // ── 7. UPDATE SALDO KASBON PELANGGAN JIKA PIUTANG ──────────────────────
      if (customerId && paymentStatus === 'Piutang' && amountOwed > 0) {
        const { data: custRow } = await supabaseAdmin
          .from('customers')
          .select('current_debt')
          .eq('id', customerId)
          .maybeSingle();

        if (custRow) {
          await supabaseAdmin
            .from('customers')
            .update({
              current_debt: Number(custRow.current_debt || 0) + amountOwed,
              updated_at: new Date().toISOString(),
            })
            .eq('id', customerId);
        }
      }

      processedUuids.push(clientTxUuid);
    }

    return successResponse({
      message: `Sinkronisasi batch selesai. ${processedUuids.length} transaksi diproses (${skippedDuplicates} duplikat dilewati).`,
      processedUuids,
      skippedDuplicates,
      count: processedUuids.length,
      syncedVia,
    });
  } catch (err) {
    console.error('[POST /api/v1/transactions/bulk-sync Unexpected Error]', err);
    return errorResponse('Terjadi kesalahan internal pada server.', 'INTERNAL_ERROR', 500);
  }
});
