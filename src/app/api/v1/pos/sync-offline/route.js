// src/app/api/v1/pos/sync-offline/route.js
// POST /api/v1/pos/sync-offline — Rekonsiliasi Batch Transaksi Offline dengan Proteksi Idempotensi,
// Shift Reconcile, dan Preservasi Timestamp Historis

import { withAuthSupabase, errorResponse, successResponse } from '@/lib/auth-helpers';
import { calculateCascadingDiscount, calculateTransactionTotals } from '@/lib/calculations';
import { logActivity } from '@/lib/audit';

export const POST = withAuthSupabase(async (request, context, { user, profile, shopId, supabase }) => {
  try {
    const body = await request.json();
    const { transactions } = body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return errorResponse('Daftar transaksi offline kosong.', 'VALIDATION_ERROR', 400);
    }

    if (!shopId) {
      return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);
    }

    const results = [];

    for (const tx of transactions) {
      const {
        offline_id,
        nomor_bon,
        idempotency_key,
        tanggal,
        created_at,
        customer_id,
        items,
        shift_id,
        register_id,
        ongkir,
        deskripsi,
        is_bonus,
        status = 'Lunas',
        use_customer_balance = 0,
        change_allocation = null,
      } = tx;

      // ── Step 1: Idempotency & Conflict Check ───────────────────────────────
      const deduplicationKey = idempotency_key || offline_id;
      let existingTx = null;

      if (deduplicationKey) {
        const { data: byIdem } = await supabase
          .from('transactions')
          .select('id, nomor_bon, status, omzet_total')
          .eq('shop_id', shopId)
          .eq('idempotency_key', deduplicationKey)
          .maybeSingle();
        existingTx = byIdem;
      }

      if (!existingTx && nomor_bon) {
        const { data: byBon } = await supabase
          .from('transactions')
          .select('id, nomor_bon, status, omzet_total')
          .eq('shop_id', shopId)
          .eq('nomor_bon', nomor_bon.trim())
          .maybeSingle();
        existingTx = byBon;
      }

      if (existingTx) {
        results.push({
          offline_id,
          server_id: existingTx.id,
          nomor_bon: existingTx.nomor_bon,
          status: 'ALREADY_SYNCED',
          success: true,
        });
        continue;
      }

      // Validasi dasar
      if (!items || items.length === 0) {
        results.push({
          offline_id,
          nomor_bon,
          status: 'FAILED',
          success: false,
          error: 'Transaksi tidak memiliki item belanja.',
        });
        continue;
      }

      // ── Step 2: Ambil Diskon Pelanggan ────────────────────────────────────
      const discountsMap = {};
      if (customer_id) {
        const { data: customer } = await supabase
          .from('customers')
          .select('*, customer_discounts(*)')
          .eq('id', customer_id)
          .eq('shop_id', shopId)
          .maybeSingle();

        if (customer && customer.customer_discounts) {
          customer.customer_discounts.forEach((d) => {
            if (!discountsMap[d.product_type]) discountsMap[d.product_type] = [];
            discountsMap[d.product_type].push({ step_order: d.step_order, pct: Number(d.percentage) });
          });
          for (const code of Object.keys(discountsMap)) {
            discountsMap[code] = discountsMap[code]
              .sort((a, b) => a.step_order - b.step_order)
              .map((s) => s.pct);
          }
        }
      }

      // ── Step 3: Proses Snapshot & Kalkulasi Item ──────────────────────────
      try {
        const processedItems = await Promise.all(
          items.map(async (item) => {
            const { data: product } = await supabase
              .from('products')
              .select('*, product_units(*)')
              .eq('id', item.product_id)
              .eq('shop_id', shopId)
              .single();

            if (!product) throw new Error(`Produk ${item.product_id} tidak ditemukan`);

            let unit = null;
            if (item.unit_id && product.product_units) {
              unit = product.product_units.find((u) => u.id === item.unit_id);
            }
            if (!unit && product.product_units) {
              unit = product.product_units.find((u) => u.is_base_unit);
            }

            const multiplier = unit?.multiplier_to_base || item.multiplier_to_base || 1;
            const basePrice = unit ? Number(unit.price) : Number(product.harga_base);
            const unitCost = Number(product.harga_modal) * multiplier;

            const discountSteps = discountsMap[product.tipe] || [];
            const discounted_unit_price = item.is_bonus_item
              ? 0
              : calculateCascadingDiscount(basePrice, discountSteps);

            return {
              product_id: product.id,
              quantity: item.quantity,
              unit_id: unit?.id || null,
              unit_name: unit?.unit_name || item.unit_name || 'Pcs',
              multiplier_to_base: multiplier,
              product_type_snapshot: product.tipe,
              harga_base_snapshot: basePrice,
              harga_modal_snapshot: unitCost,
              discounted_unit_price,
              is_bonus_item: item.is_bonus_item || false,
            };
          })
        );

        const { omzet_total, laba_total, amount_owed, items_with_calcs } =
          calculateTransactionTotals(processedItems, ongkir || 0);

        // ── Step 4: Preservasi Timestamp Historis (Patch Teknis #3) ────────────
        const historicCreatedAt = created_at
          ? new Date(created_at).toISOString()
          : new Date().toISOString();
        const txDate = tanggal || historicCreatedAt.split('T')[0];

        // ── Step 5: Simpan Transaksi ──────────────────────────────────────────
        const { data: newTransaction, error: txInsertErr } = await supabase
          .from('transactions')
          .insert({
            shop_id: shopId,
            nomor_bon: nomor_bon?.trim() || `BON-OFF-${Date.now()}`,
            idempotency_key: deduplicationKey,
            tanggal: txDate,
            customer_id: customer_id || null,
            ongkir: parseInt(ongkir || 0, 10),
            deskripsi: deskripsi || null,
            is_bonus: is_bonus || false,
            status: status || 'Lunas',
            omzet_total,
            laba_total,
            amount_owed,
            created_by: user.id,
            created_at: historicCreatedAt,
          })
          .select()
          .single();

        if (txInsertErr) throw txInsertErr;

        // ── Step 6: Simpan Items Transaksi ────────────────────────────────────
        const itemsToInsert = items_with_calcs.map((i) => ({
          transaction_id: newTransaction.id,
          product_id: i.product_id,
          quantity: i.quantity,
          product_type_snapshot: i.product_type_snapshot,
          harga_base_snapshot: Number(i.harga_base_snapshot),
          harga_modal_snapshot: Number(i.harga_modal_snapshot),
          discounted_unit_price: i.discounted_unit_price || 0,
          line_omzet: i.line_omzet,
          line_laba: i.line_laba,
          is_bonus_item: i.is_bonus_item,
          created_at: historicCreatedAt,
        }));

        const { error: itemsInsertErr } = await supabase
          .from('transaction_items')
          .insert(itemsToInsert);

        // ── Step 6.5: Eksekusi Auto-Unpack Offline Actions (Fase 6) ───────────
        if (Array.isArray(t.auto_unpack_actions) && t.auto_unpack_actions.length > 0) {
          for (const action of t.auto_unpack_actions) {
            if (action.product_id && action.required_pcs) {
              try {
                await supabase.rpc('execute_atomic_unit_unpack', {
                  p_product_id: action.product_id,
                  p_required_pcs: parseInt(action.required_pcs, 10),
                });
              } catch (unpackErr) {
                console.warn('[sync-offline] Auto-unpack execution warning:', unpackErr);
              }
            }
          }
        }

        // ── Step 7: Potong Stok Atomik & Rekam Mutasi Stok ────────────────────
        for (const item of items_with_calcs) {
          if (item.product_id) {
            const qtyToDeduct = item.quantity * (item.multiplier_to_base || 1);
            try {
              await supabase.rpc('mutate_product_stock', {
                p_product_id: item.product_id,
                p_qty: -qtyToDeduct,
              });

              await supabase.from('stock_mutations').insert({
                shop_id: shopId,
                product_id: item.product_id,
                mutation_type: 'SALE',
                unit_id: item.unit_id || null,
                unit_name: item.unit_name || 'Pcs',
                quantity_units: item.quantity,
                quantity_base: qtyToDeduct,
                notes: `Penjualan Kasir (Offline Sync) Bon #${newTransaction.nomor_bon}`,
                created_by: user.id,
                created_at: historicCreatedAt,
              });
            } catch (stockErr) {
              console.error('[sync-offline] Mutasi stok gagal:', stockErr);
            }
          }
        }

        // ── Step 8: Shift & Arus Kas Laci Reconciliation (Patch Teknis #1) ─────
        if (status === 'Lunas' && shift_id) {
          const netCashReceived = Math.max(0, omzet_total - Number(use_customer_balance || 0));
          if (netCashReceived > 0) {
            try {
              const { data: shiftData } = await supabase
                .from('cashier_shifts')
                .select('id, cash_sales_total, expected_cash, actual_cash, status')
                .eq('id', shift_id)
                .maybeSingle();

              if (shiftData) {
                const newCashSales = Number(shiftData.cash_sales_total || 0) + netCashReceived;
                const newExpectedCash = Number(shiftData.expected_cash || 0) + netCashReceived;
                const updatePayload = {
                  cash_sales_total: newCashSales,
                  expected_cash: newExpectedCash,
                };

                if (shiftData.status === 'CLOSED' && shiftData.actual_cash !== null) {
                  updatePayload.difference = Number(shiftData.actual_cash) - newExpectedCash;
                }

                await supabase
                  .from('cashier_shifts')
                  .update(updatePayload)
                  .eq('id', shift_id);
              }
            } catch (shiftErr) {
              console.error('[sync-offline] Rekonsiliasi shift gagal:', shiftErr);
            }
          }
        }

        // ── Step 9: Saldo Celengan & Smart Change ──────────────────────────────
        if (use_customer_balance > 0 && customer_id) {
          try {
            await supabase.rpc('mutate_customer_balance', {
              p_customer_id: customer_id,
              p_delta: -Number(use_customer_balance),
              p_mutation_type: 'WITHDRAW',
              p_shop_id: shopId,
              p_notes: `Pembayaran Belanja (Offline Sync) Bon #${newTransaction.nomor_bon}`,
              p_transaction_id: newTransaction.id,
            });
          } catch (balErr) {
            console.error('[sync-offline] Potong saldo celengan gagal:', balErr);
          }
        }

        if (change_allocation && Number(change_allocation.amount) > 0 && customer_id) {
          const allocType = change_allocation.type;
          const allocAmount = Number(change_allocation.amount);

          try {
            if (allocType === 'KASBON') {
              await supabase.rpc('allocate_change_to_kasbon', {
                p_customer_id: customer_id,
                p_amount: allocAmount,
                p_shop_id: shopId,
                p_transaction_id: newTransaction.id,
                p_notes: `Alokasi kembalian (Offline Sync) Bon #${newTransaction.nomor_bon}`,
              });
            } else if (allocType === 'DEPOSIT') {
              await supabase.rpc('mutate_customer_balance', {
                p_customer_id: customer_id,
                p_delta: allocAmount,
                p_mutation_type: 'DEPOSIT',
                p_shop_id: shopId,
                p_notes: `Tabungan kembalian (Offline Sync) Bon #${newTransaction.nomor_bon}`,
                p_transaction_id: newTransaction.id,
              });
            }
          } catch (changeErr) {
            console.error('[sync-offline] Alokasi kembalian gagal:', changeErr);
          }
        }

        // Catat Audit Log
        await logActivity({
          user_id: user.id,
          action: 'OFFLINE_TRANSACTION_SYNCED',
          entity: 'transactions',
          entity_id: newTransaction.id,
          metadata: {
            offline_id,
            nomor_bon: newTransaction.nomor_bon,
            shift_id,
            register_id,
            historic_created_at: historicCreatedAt,
          },
        });

        results.push({
          offline_id,
          server_id: newTransaction.id,
          nomor_bon: newTransaction.nomor_bon,
          status: 'SYNCED',
          success: true,
        });
      } catch (procErr) {
        console.error('[sync-offline] Gagal memproses transaksi:', procErr);
        results.push({
          offline_id,
          nomor_bon,
          status: 'FAILED',
          success: false,
          error: procErr.message || 'Gagal memproses transaksi offline di database',
        });
      }
    }

    const syncedCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    return successResponse({
      synced_count: syncedCount,
      failed_count: failedCount,
      results,
    });
  } catch (error) {
    console.error('[POST /api/v1/pos/sync-offline]', error);
    return errorResponse('Gagal menjalankan rekonsiliasi transaksi offline.', 'SERVER_ERROR', 500);
  }
});
