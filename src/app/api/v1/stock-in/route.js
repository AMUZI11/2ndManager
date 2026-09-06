// POST /api/v1/stock-in — Catat kulakan stok masuk, kalkulasi HPP baru, deteksi margin drop & auto-reprice
// GET  /api/v1/stock-in — Riwayat mutasi stok masuk

import { withAuthSupabase, withBossOnly, errorResponse, successResponse, checkSubscriptionActive } from '@/lib/auth-helpers';
import { getTierConfig } from '@/config/tiers';
import { logActivity } from '@/lib/audit';

export const GET = withAuthSupabase(async (request, context, { profile, supabase }) => {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    let query = supabase
      .from('stock_mutations')
      .select('*, products(id, nama, barcode, tipe, stock)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data: mutations, error } = await query;
    if (error) throw error;

    return successResponse(mutations || []);
  } catch (error) {
    console.error('[GET /stock-in]', error);
    return errorResponse('Gagal memuat riwayat kulakan.', 'SERVER_ERROR', 500);
  }
});

export const POST = withBossOnly(async (request, context, { user, profile, supabase }) => {
  try {
    const body = await request.json();
    const { product_id, unit_id, quantity, total_spend, auto_reprice, notes } = body;

    if (!product_id) {
      return errorResponse('ID produk wajib diisi.', 'VALIDATION_ERROR', 422);
    }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return errorResponse('Jumlah unit yang dibeli harus lebih dari 0.', 'VALIDATION_ERROR', 422);
    }
    const spend = parseInt(total_spend, 10);
    if (isNaN(spend) || spend < 0) {
      return errorResponse('Total biaya modal harus berupa angka positif.', 'VALIDATION_ERROR', 422);
    }

    // Ambil data produk beserta seluruh unit konversinya
    const { data: product, error: prodErr } = await supabase
      .from('products')
      .select('*, product_units(*)')
      .eq('id', product_id)
      .eq('is_deleted', false)
      .single();

    if (prodErr || !product) {
      return errorResponse('Produk tidak ditemukan.', 'NOT_FOUND', 404);
    }

    const shopId = product.shop_id;

    // Cek tier subscription
    const { plan } = await checkSubscriptionActive(supabase, shopId);
    const tierConfig = getTierConfig(plan);

    // Resolusi unit pembelian
    let selectedUnit = null;
    if (unit_id && product.product_units) {
      selectedUnit = product.product_units.find(u => u.id === unit_id);
    }
    if (!selectedUnit && product.product_units) {
      selectedUnit = product.product_units.find(u => u.is_base_unit);
    }

    const multiplier = selectedUnit?.multiplier_to_base || 1;
    const unitName = selectedUnit?.unit_name || 'Pcs';
    const quantityBase = qty * multiplier;

    // Kalkulasi HPP baru per base unit
    const previousCost = Number(product.harga_modal) || 0;
    const newCost = quantityBase > 0 ? Math.round(spend / quantityBase) : previousCost;
    const isCostIncreased = newCost > previousCost;

    // Mutasi stok secara ATOMIK via RPC
    const { data: updatedStock, error: rpcErr } = await supabase.rpc('mutate_product_stock', {
      p_product_id: product_id,
      p_qty: quantityBase,
    });

    if (rpcErr) {
      console.error('[POST /stock-in] RPC mutate_product_stock error:', rpcErr);
      throw new Error(`Gagal memperbarui saldo stok: ${rpcErr.message}`);
    }

    // Update HPP di tabel products
    await supabase
      .from('products')
      .update({
        harga_modal: newCost,
        updated_at: new Date().toISOString(),
      })
      .eq('id', product_id);

    // Catat histori ke stock_mutations
    const { data: mutation, error: mutErr } = await supabase
      .from('stock_mutations')
      .insert({
        shop_id: shopId,
        product_id: product_id,
        mutation_type: 'PURCHASE_RESTOCK',
        unit_id: selectedUnit?.id || null,
        unit_name: unitName,
        quantity_units: qty,
        quantity_base: quantityBase,
        previous_cost: previousCost,
        new_cost: newCost,
        total_spend: spend,
        notes: notes?.trim() || `Kulakan ${qty} ${unitName}`,
        created_by: user.id,
      })
      .select()
      .single();

    if (mutErr) {
      console.error('[POST /stock-in] Gagal insert stock_mutations:', mutErr);
    }

    // Kalkulasi Margin Guard & Rekomendasi Harga
    const currentPriceBase = Number(product.harga_base) || 0;
    const prevMarginPct = currentPriceBase > 0 ? ((currentPriceBase - previousCost) / currentPriceBase) * 100 : 0;
    const newMarginPct = currentPriceBase > 0 ? ((currentPriceBase - newCost) / currentPriceBase) * 100 : 0;

    // Target margin yang ingin dipertahankan
    const targetMarginPct = prevMarginPct > 5 && prevMarginPct < 90 ? prevMarginPct : 20;
    // Formula harga rekomendasi: HPP_Baru / (1 - target_margin) dibulatkan ke kelipatan 500
    const rawRecommendedBase = newCost / (1 - (targetMarginPct / 100));
    const recommendedBasePrice = Math.ceil(rawRecommendedBase / 500) * 500;

    const recommendedUnits = (product.product_units || []).map(u => {
      const recPrice = Math.ceil((recommendedBasePrice * u.multiplier_to_base) / 500) * 500;
      return {
        unit_id: u.id,
        unit_name: u.unit_name,
        multiplier_to_base: u.multiplier_to_base,
        current_price: Number(u.price),
        recommended_price: recPrice,
      };
    });

    // Fitur Auto-Reprice 1-Klik (Tier MANAJER / EKSEKUTIF)
    let repriced = false;
    if (auto_reprice && isCostIncreased) {
      if (tierConfig.features.auto_reprice) {
        // Terapkan penyesuaian harga ke tabel products
        await supabase
          .from('products')
          .update({
            harga_base: recommendedBasePrice,
            updated_at: new Date().toISOString(),
          })
          .eq('id', product_id);

        // Terapkan ke setiap unit
        for (const ru of recommendedUnits) {
          await supabase
            .from('product_units')
            .update({
              price: ru.recommended_price,
              updated_at: new Date().toISOString(),
            })
            .eq('id', ru.unit_id);
        }

        // Catat mutasi penyesuaian harga
        await supabase.from('stock_mutations').insert({
          shop_id: shopId,
          product_id: product_id,
          mutation_type: 'PRICE_AUTO_REPRICE',
          previous_cost: currentPriceBase,
          new_cost: recommendedBasePrice,
          notes: `Auto-Reprice 1-Klik: Margin dipulihkan ke ${targetMarginPct.toFixed(1)}%`,
          created_by: user.id,
        });

        repriced = true;
      }
    }

    await logActivity(
      supabase,
      shopId,
      profile.username || user.email,
      'Catat Kulakan Stok',
      `Kulakan "${product.nama}": +${qty} ${unitName} (${quantityBase} pcs atomik), total Rp${spend.toLocaleString('id-ID')}. HPP: Rp${previousCost} → Rp${newCost}`
    );

    return successResponse({
      mutation,
      updated_stock_atomic: updatedStock,
      cost_analysis: {
        previous_cost: previousCost,
        new_cost: newCost,
        is_cost_increased: isCostIncreased,
        prev_margin_pct: Math.round(prevMarginPct * 10) / 10,
        new_margin_pct: Math.round(newMarginPct * 10) / 10,
        recommended_base_price: recommendedBasePrice,
        recommended_units: recommendedUnits,
        repriced_applied: repriced,
        can_auto_reprice: tierConfig.features.auto_reprice,
      },
    }, 201);
  } catch (error) {
    console.error('[POST /stock-in]', error);
    return errorResponse(`Gagal mencatat kulakan: ${error.message}`, 'SERVER_ERROR', 500);
  }
});
