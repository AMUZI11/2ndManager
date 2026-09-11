// GET  /api/v1/transactions  — list transaksi dengan filter
// POST /api/v1/transactions  — buat bon baru (dengan idempotency key)
import { withAuthSupabase, errorResponse, successResponse, checkSubscriptionActive } from '@/lib/auth-helpers';
import { calculateCascadingDiscount, calculateTransactionTotals } from '@/lib/calculations';
import { getPlanConfig } from '@/lib/subscription';
import { getTierConfig, getWIBStartOfMonth } from '@/config/tiers';
import { logActivity } from '@/lib/audit';
import { verifyPin } from '@/lib/security';

export const GET = withAuthSupabase(async (request, context, { user, profile, shopId, shopIds, isAllShops, supabase }) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customer_id = searchParams.get('customer_id');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const is_bonus = searchParams.get('is_bonus');

    if (!shopId && !isAllShops) return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);

    let query = supabase
      .from('transactions')
      .select(`
        *,
        transaction_items (*, products (id, nama, tipe, barcode)),
        customers (id, nama, phone)
      `)
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false });

    if (isAllShops && shopIds && shopIds.length > 0) {
      query = query.in('shop_id', shopIds);
    } else {
      query = query.eq('shop_id', shopId);
    }

    if (status) query = query.eq('status', status);
    if (customer_id) query = query.eq('customer_id', customer_id);
    if (is_bonus) query = query.eq('is_bonus', is_bonus === 'true');
    if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString().split('T')[0];
      const end = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
      query = query.gte('tanggal', start).lte('tanggal', end);
    } else {
      // Default: 5 tahun terakhir
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
      query = query.gte('tanggal', fiveYearsAgo.toISOString().split('T')[0]);
    }

    const { data: transactions, error } = await query;
    if (error) throw error;

    return successResponse(transactions);
  } catch (error) {
    console.error('[GET /transactions]', error);
    return errorResponse('Gagal memuat daftar transaksi.', 'SERVER_ERROR', 500);
  }
});

export const POST = withAuthSupabase(async (request, context, { user, profile, shopId, supabase }) => {
  try {
    const body = await request.json();
    const { nomor_bon, tanggal, customer_id, ongkir, deskripsi, is_bonus, items, idempotency_key, status } = body;

    // ── Idempotency check (Koreksi Kritis #3) ──────────────────────────
    // Cek apakah transaksi dengan key ini sudah pernah diproses
    if (idempotency_key) {
      const { data: existing } = await supabase
        .from('transactions')
        .select(`
          *,
          transaction_items (*, products (id, nama, tipe, barcode)),
          customers (id, nama, phone)
        `)
        .eq('idempotency_key', idempotency_key)
        .maybeSingle();

      if (existing) {
        const { data: fullTx } = await supabase
          .from('transactions')
          .select(`
            *,
            transaction_items (*, products (id, nama, tipe, barcode)),
            customers (id, nama, phone)
          `)
          .eq('id', existing.id)
          .single();
        return successResponse(fullTx);
      }
    }

    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);

    // Validasi dasar
    if (!nomor_bon?.trim()) return errorResponse('Nomor bon wajib diisi.', 'VALIDATION_ERROR', 422);
    if (!items?.length) return errorResponse('Bon harus memiliki minimal 1 item.', 'VALIDATION_ERROR', 422);

    // Cek plan dan kuota bulanan serta izin fitur
    const txStatus = status || 'Piutang';
    const { plan } = await checkSubscriptionActive(supabase, shopId);
    const tierConfig = getTierConfig(plan);

    // Chokepoint 2: Pencegahan Jebakan Struk (#51 Atomic Lock)
    if (tierConfig.maxMonthlyReceipts !== Infinity) {
      const startOfMonth = getWIBStartOfMonth();
      const { count: currentMonthTxCount, error: countErr } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('shop_id', shopId)
        .gte('created_at', startOfMonth);

      if (!countErr && typeof currentMonthTxCount === 'number' && currentMonthTxCount >= tierConfig.maxMonthlyReceipts) {
        return Response.json({
          error: `Batas kuota transaksi bulanan telah tercapai (${tierConfig.maxMonthlyReceipts}/${tierConfig.maxMonthlyReceipts}). Tingkatkan paket Anda ke Supervisor Shift untuk transaksi tanpa batas.`,
          code: 'RECEIPT_LIMIT_REACHED',
          limit: tierConfig.maxMonthlyReceipts,
          current: currentMonthTxCount,
          upgrade_required: true,
        }, { status: 402 });
      }
    }

    // Cek izin Kasbon (Piutang)
    if (txStatus === 'Piutang' && !tierConfig.features.allow_kasbon) {
      return errorResponse('Paket Anda tidak mengizinkan pencatatan Kasbon. Silakan upgrade paket.', 'FEATURE_LOCKED', 403);
    }

    // Cek duplikat nomor bon dalam toko ini
    const { data: existing } = await supabase
      .from('transactions')
      .select('id')
      .eq('shop_id', shopId)
      .eq('nomor_bon', nomor_bon.trim())
      .single();
    if (existing) {
      return errorResponse(`Nomor bon "${nomor_bon}" sudah digunakan.`, 'CONFLICT', 409);
    }

    // Ambil pelanggan dan diskon
    const { data: customer } = await supabase
      .from('customers')
      .select('*, customer_discounts(*)')
      .eq('id', customer_id)
      .eq('shop_id', shopId)
      .eq('is_deleted', false)
      .single();
    if (!customer) return errorResponse('Pelanggan tidak ditemukan.', 'NOT_FOUND', 404);

    // Build discounts map: { [categoryCode]: number[] }
    const discountsMap = {};
    (customer.customer_discounts || []).forEach(d => {
      if (!discountsMap[d.product_type]) discountsMap[d.product_type] = [];
      discountsMap[d.product_type].push({ step_order: d.step_order, pct: Number(d.percentage) });
    });
    for (const code of Object.keys(discountsMap)) {
      discountsMap[code] = discountsMap[code]
        .sort((a, b) => a.step_order - b.step_order)
        .map(s => s.pct);
    }

    // Proses setiap item dengan resolusi satuan bertingkat (Multi-Tier)
    const processedItems = await Promise.all(items.map(async (item) => {
      const { data: product } = await supabase
        .from('products')
        .select('*, product_units(*)')
        .eq('id', item.product_id)
        .eq('shop_id', shopId)
        .single();
      if (!product) throw new Error(`Produk ${item.product_id} tidak ditemukan`);

      // Resolusi unit: jika item.unit_id diberikan, cari di product.product_units
      let unit = null;
      if (item.unit_id && product.product_units) {
        unit = product.product_units.find(u => u.id === item.unit_id);
      }
      if (!unit && product.product_units) {
        unit = product.product_units.find(u => u.is_base_unit);
      }

      const multiplier = unit?.multiplier_to_base || 1;
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
        unit_name: unit?.unit_name || 'Pcs',
        multiplier_to_base: multiplier,
        product_type_snapshot: product.tipe,
        harga_base_snapshot: basePrice,
        harga_modal_snapshot: unitCost,
        discounted_unit_price,
        is_bonus_item: item.is_bonus_item || false,
      };
    }));

    const { omzet_total, laba_total, amount_owed, items_with_calcs } =
      calculateTransactionTotals(processedItems, ongkir || 0);

    // ── RADAR JUAL RUGI REAL-TIME (NEGATIVE MARGIN GUARD) ──
    const lossItems = items_with_calcs.filter(
      (i) => !i.is_bonus_item && Number(i.discounted_unit_price) < Number(i.harga_modal_snapshot)
    );

    if (lossItems.length > 0) {
      const marginGuardMode = tierConfig.features?.negative_margin_guard;

      if (marginGuardMode === 'HARD_BLOCK' && profile.role === 'CASHIER') {
        const { owner_pin } = body;
        if (!owner_pin) {
          return errorResponse(
            'Transaksi ditolak: Terdapat barang yang dijual rugi di bawah modal. Memerlukan otorisasi PIN Pemilik Toko.',
            'NEGATIVE_MARGIN_BLOCKED',
            403,
            {
              loss_items: lossItems.map((li) => ({
                product_id: li.product_id,
                selling_price: li.discounted_unit_price,
                cost_price: li.harga_modal_snapshot,
                loss_per_unit: Number(li.harga_modal_snapshot) - Number(li.discounted_unit_price),
              })),
            }
          );
        }

        // Ambil shop owner_pin_hash
        const { data: shopRecord } = await supabase
          .from('shops')
          .select('id, owner_pin_hash, is_pin_configured')
          .eq('id', shopId)
          .single();

        if (!shopRecord?.is_pin_configured || !shopRecord?.owner_pin_hash) {
          return errorResponse(
            'Transaksi jual rugi memerlukan PIN Pemilik, tetapi Pemilik Toko belum mengatur PIN di pengaturan.',
            'PIN_NOT_CONFIGURED',
            403
          );
        }

        const isPinValid = verifyPin(owner_pin, shopRecord.owner_pin_hash);
        if (!isPinValid) {
          return errorResponse(
            'PIN Pemilik Toko salah. Otorisasi jual rugi ditolak.',
            'INVALID_OWNER_PIN',
            403
          );
        }

        await logActivity({
          user_id: user.id,
          action: 'NEGATIVE_MARGIN_OVERRIDE',
          entity: 'transactions',
          metadata: {
            cashier_id: profile.id,
            nomor_bon: nomor_bon.trim(),
            loss_items_count: lossItems.length,
          },
        });
      }
    }

    // Insert transaksi
    const { data: transaction, error: txErr } = await supabase
      .from('transactions')
      .insert({
        shop_id: shopId,
        nomor_bon: nomor_bon.trim(),
        idempotency_key: idempotency_key || null,
        tanggal: tanggal ? new Date(tanggal).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        customer_id,
        ongkir: parseInt(ongkir || 0, 10),
        deskripsi: deskripsi || null,
        is_bonus: is_bonus || false,
        status: status || 'Piutang', // Use provided status or default to Piutang
        omzet_total,
        laba_total,
        amount_owed,
        created_by: user.id,
      })
      .select()
      .single();

    if (txErr) throw txErr;

    // Insert items
    const itemsToInsert = items_with_calcs.map(i => ({
      transaction_id: transaction.id,
      product_id: i.product_id,
      quantity: i.quantity,
      product_type_snapshot: i.product_type_snapshot,
      harga_base_snapshot: Number(i.harga_base_snapshot),
      harga_modal_snapshot: Number(i.harga_modal_snapshot),
      discounted_unit_price: i.discounted_unit_price || 0,
      line_omzet: i.line_omzet,
      line_laba: i.line_laba,
      is_bonus_item: i.is_bonus_item,
    }));

    const { error: itemsErr } = await supabase.from('transaction_items').insert(itemsToInsert);
    if (itemsErr) throw itemsErr;

    // Eksekusi Auto-Unpack Kemasan Induk Bertingkat (Fase 6: Atomic Multi-Tier Unpack)
    if (Array.isArray(body.auto_unpack_actions) && body.auto_unpack_actions.length > 0) {
      for (const action of body.auto_unpack_actions) {
        if (action.product_id && action.required_pcs) {
          try {
            await supabase.rpc('execute_atomic_unit_unpack', {
              p_product_id: action.product_id,
              p_required_pcs: parseInt(action.required_pcs, 10),
            });
          } catch (unpackErr) {
            console.warn('[POST /transactions] Auto-unpack warning:', unpackErr);
          }
        }
      }
    }

    // Tahap 7: Resolusi Branch ID untuk pemotongan inventaris fisik cabang
    let targetBranchId = body.branch_id || null;
    if (!targetBranchId && shopId) {
      const { data: brRow } = await supabase
        .from('branches')
        .select('id')
        .eq('shop_id', shopId)
        .maybeSingle();
      if (brRow?.id) targetBranchId = brRow.id;
    }

    // Potong stok produk di database secara ATOMIK via RPC mutate_product_stock
    // dan catat mutasi stok di tabel stock_mutations serta branch_product_stocks
    for (const item of items_with_calcs) {
      if (item.product_id) {
        const qtyToDeduct = item.quantity * (item.multiplier_to_base || 1);
        try {
          await supabase.rpc('mutate_product_stock', {
            p_product_id: item.product_id,
            p_qty: -qtyToDeduct
          });

          // Tahap 7: Potong stok fisik cabang secara terisolasi
          if (targetBranchId) {
            await supabase.rpc('mutate_branch_product_stock', {
              p_branch_id: targetBranchId,
              p_product_id: item.product_id,
              p_qty: -qtyToDeduct
            });
          }

          await supabase.from('stock_mutations').insert({
            shop_id: shopId,
            product_id: item.product_id,
            mutation_type: 'SALE',
            unit_id: item.unit_id || null,
            unit_name: item.unit_name || 'Pcs',
            quantity_units: item.quantity,
            quantity_base: qtyToDeduct,
            notes: `Penjualan Kasir Bon #${transaction.nomor_bon}`,
            created_by: user.id
          });
        } catch (stockErr) {
          console.error('[POST /transactions] Atomic stock mutation failed:', stockErr);
        }
      }
    }

    // Titipan Jaminan Wadah Aset Fisik (Fase 6: Container Escrow Non-Revenue)
    if (Array.isArray(body.escrow_deposits) && body.escrow_deposits.length > 0) {
      for (const esc of body.escrow_deposits) {
        if (esc.asset_type && customer_id) {
          const escQty = parseInt(esc.quantity || 1, 10);
          const depPerUnit = Math.max(0, Number(esc.deposit_amount_per_unit || esc.deposit_amount || 0));
          const isWaived = Boolean(esc.is_deposit_waived);
          const totalDep = isWaived ? 0 : depPerUnit * escQty;

          // Catat pinjaman wadah
          const { data: loanRec } = await supabase
            .from('customer_asset_loans')
            .insert({
              shop_id: shopId,
              customer_id: customer_id,
              transaction_id: transaction.id,
              product_id: esc.product_id || null,
              asset_type: esc.asset_type,
              mutation_type: 'LOAN',
              quantity: escQty,
              deposit_amount_per_unit: depPerUnit,
              is_deposit_waived: isWaived,
              status: 'BORROWED',
              notes: esc.notes || `Pinjaman wadah pada Bon #${transaction.nomor_bon}`,
              created_by: user.id,
            })
            .select()
            .single();

          // Mutasi customer loaned_assets count
          await supabase.rpc('mutate_customer_loaned_assets', {
            p_customer_id: customer_id,
            p_asset_type: esc.asset_type,
            p_delta: escQty,
          });

          // Catat escrow deposit jika tidak waived
          if (!isWaived && totalDep > 0 && loanRec) {
            await supabase
              .from('customer_asset_deposits')
              .insert({
                shop_id: shopId,
                customer_id: customer_id,
                loan_id: loanRec.id,
                transaction_id: transaction.id,
                deposit_amount: totalDep,
                status: 'HELD',
                notes: `Uang jaminan ${escQty} unit ${esc.asset_type} Bon #${transaction.nomor_bon}`,
              });
          }
        }
      }
    }

    // Eksekusi Pemotongan Saldo Celengan Pelanggan (Jika Digunakan untuk Bayar Belanja)
    if (body.use_customer_balance && Number(body.use_customer_balance) > 0 && customer_id) {
      try {
        await supabase.rpc('mutate_customer_balance', {
          p_customer_id: customer_id,
          p_delta: -Number(body.use_customer_balance),
          p_mutation_type: 'WITHDRAW',
          p_shop_id: shopId,
          p_notes: `Pembayaran Belanja Bon #${transaction.nomor_bon}`,
          p_transaction_id: transaction.id,
        });
      } catch (balErr) {
        console.error('[POST /transactions] Customer balance deduction failed:', balErr);
      }
    }

    // Eksekusi Alokasi Celengan Kembalian (Smart Change: Potong Kasbon / Simpan Celengan)
    let changeResult = null;
    if (body.change_allocation && Number(body.change_allocation.amount) > 0 && customer_id) {
      const allocType = body.change_allocation.type;
      const allocAmount = Number(body.change_allocation.amount);

      try {
        if (allocType === 'KASBON') {
          const { data: kasbonRes, error: kasbonErr } = await supabase.rpc('allocate_change_to_kasbon', {
            p_customer_id: customer_id,
            p_amount: allocAmount,
            p_shop_id: shopId,
            p_transaction_id: transaction.id,
            p_notes: `Alokasi kembalian Bon #${transaction.nomor_bon}`,
          });
          if (kasbonErr) throw kasbonErr;
          changeResult = kasbonRes;
        } else if (allocType === 'DEPOSIT') {
          const { data: depRes, error: depErr } = await supabase.rpc('mutate_customer_balance', {
            p_customer_id: customer_id,
            p_delta: allocAmount,
            p_mutation_type: 'DEPOSIT',
            p_shop_id: shopId,
            p_notes: `Tabungan kembalian Bon #${transaction.nomor_bon}`,
            p_transaction_id: transaction.id,
          });
          if (depErr) throw depErr;
          changeResult = { success: true, deposited_leftover: allocAmount, current_balance: Number(depRes) };
        }
      } catch (allocErr) {
        console.error('[POST /transactions] Smart change allocation failed:', allocErr);
      }
    }

    // Fetch full transaction
    const { data: fullTx } = await supabase
      .from('transactions')
      .select('*, transaction_items(*, products(*)), customers(*)')
      .eq('id', transaction.id)
      .single();

    await logActivity(supabase, shopId, profile.username || user.email, 'Buat Bon',
      `Bon "${transaction.nomor_bon}" untuk "${customer.nama}" total Rp${Number(amount_owed).toLocaleString('id-ID')}`);

    return successResponse({
      ...fullTx,
      change_allocation_result: changeResult,
    }, 201);
  } catch (error) {
    console.error('[POST /transactions]', error);
    if (error.code === '23505') {
      return errorResponse('Nomor bon sudah digunakan.', 'CONFLICT', 409);
    }
    return errorResponse(`Gagal menyimpan bon: ${error.message}`, 'SERVER_ERROR', 500);
  }
});
