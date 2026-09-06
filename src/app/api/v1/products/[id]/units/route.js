// GET  /api/v1/products/[id]/units — list semua unit konversi produk
// POST /api/v1/products/[id]/units — tambah unit konversi baru (dengan tier quota check)
// PUT  /api/v1/products/[id]/units — update unit konversi
// DELETE /api/v1/products/[id]/units — hapus unit konversi (kecuali base unit)

import { withAuthSupabase, withBossOnly, errorResponse, successResponse, checkSubscriptionActive } from '@/lib/auth-helpers';
import { getTierConfig } from '@/config/tiers';
import { logActivity } from '@/lib/audit';

export const GET = withAuthSupabase(async (request, { params }, { profile, supabase }) => {
  try {
    const { id: productId } = await params;

    const { data: units, error } = await supabase
      .from('product_units')
      .select('*')
      .eq('product_id', productId)
      .order('multiplier_to_base', { ascending: false });

    if (error) throw error;
    return successResponse(units || []);
  } catch (error) {
    console.error('[GET /products/:id/units]', error);
    return errorResponse('Gagal memuat satuan produk.', 'SERVER_ERROR', 500);
  }
});

export const POST = withBossOnly(async (request, { params }, { user, profile, supabase }) => {
  try {
    const { id: productId } = await params;
    const body = await request.json();
    const { unit_name, multiplier_to_base, price, barcode, is_base_unit, sort_order } = body;

    if (!unit_name?.trim()) {
      return errorResponse('Nama satuan wajib diisi.', 'VALIDATION_ERROR', 422);
    }
    const multiplier = parseInt(multiplier_to_base, 10);
    if (isNaN(multiplier) || multiplier <= 0) {
      return errorResponse('Pengali ke satuan dasar harus berupa angka bulat positif lebih dari 0.', 'VALIDATION_ERROR', 422);
    }

    // Ambil produk dan validasi kepemilikan shop
    const { data: product, error: prodErr } = await supabase
      .from('products')
      .select('id, shop_id, nama, barcode, harga_base')
      .eq('id', productId)
      .eq('is_deleted', false)
      .single();

    if (prodErr || !product) {
      return errorResponse('Produk tidak ditemukan.', 'NOT_FOUND', 404);
    }

    const shopId = product.shop_id;

    // Cek tier subscription
    const { plan } = await checkSubscriptionActive(supabase, shopId);
    const tierConfig = getTierConfig(plan);

    // Guardrail: Jika bukan base unit, validasi fitur multi_unit
    if (!is_base_unit) {
      if (!tierConfig.features.multi_unit) {
        return errorResponse(
          'Paket Kontrak Magang tidak mendukung konversi multi-satuan. Silakan upgrade ke Supervisor Shift.',
          'FEATURE_LOCKED',
          403
        );
      }

      // Micro-Quota Check: SUPERVISOR max 15 SKU multi-unit
      if (tierConfig.maxMultiUnitSKU !== Infinity) {
        // Cek apakah produk ini sudah terhitung sebagai produk multi-unit
        const { count: existingProductMultiUnits } = await supabase
          .from('product_units')
          .select('id', { count: 'exact', head: true })
          .eq('product_id', productId)
          .eq('is_base_unit', false);

        if (!existingProductMultiUnits || existingProductMultiUnits === 0) {
          // Produk ini belum punya satuan bertingkat, maka penambahan ini akan menambah 1 SKU multi-satuan
          // Hitung berapa distinct product_id yang memiliki is_base_unit = false di toko ini
          const { data: currentMultiSKUs } = await supabase
            .from('product_units')
            .select('product_id')
            .eq('shop_id', shopId)
            .eq('is_base_unit', false);

          const distinctProductIds = new Set((currentMultiSKUs || []).map(u => u.product_id));
          if (distinctProductIds.size >= tierConfig.maxMultiUnitSKU) {
            return Response.json({
              error: `Batas kuota produk multi-satuan tercapai (${distinctProductIds.size}/${tierConfig.maxMultiUnitSKU} SKU). Tingkatkan ke paket Manajer Operasional untuk konversi tanpa batas.`,
              code: 'UPGRADE_REQUIRED',
              limit: tierConfig.maxMultiUnitSKU,
              current: distinctProductIds.size,
              upgrade_required: true,
            }, { status: 402 });
          }
        }
      }
    }

    // Cek duplikasi barcode di shop ini jika barcode diisi
    const cleanBarcode = barcode?.trim() || null;
    if (cleanBarcode) {
      const { data: dupBarcode } = await supabase
        .from('product_units')
        .select('id, unit_name, product_id')
        .eq('shop_id', shopId)
        .eq('barcode', cleanBarcode)
        .maybeSingle();

      if (dupBarcode) {
        return errorResponse(`Barcode "${cleanBarcode}" sudah digunakan oleh satuan ${dupBarcode.unit_name}.`, 'CONFLICT', 409);
      }
    }

    // Insert unit
    const { data: newUnit, error: insertErr } = await supabase
      .from('product_units')
      .insert({
        product_id: productId,
        shop_id: shopId,
        unit_name: unit_name.trim(),
        multiplier_to_base: is_base_unit ? 1 : multiplier,
        price: parseInt(price || 0, 10),
        barcode: cleanBarcode,
        is_base_unit: !!is_base_unit,
        sort_order: sort_order || (is_base_unit ? 1 : multiplier),
      })
      .select()
      .single();

    if (insertErr) {
      if (insertErr.code === '23505') {
        return errorResponse(`Satuan "${unit_name}" sudah ada untuk produk ini.`, 'CONFLICT', 409);
      }
      throw insertErr;
    }

    await logActivity(
      supabase,
      shopId,
      profile.username || user.email,
      'Tambah Satuan Produk',
      `Menambahkan satuan "${newUnit.unit_name}" (×${newUnit.multiplier_to_base}) pada produk "${product.nama}"`
    );

    return successResponse(newUnit, 201);
  } catch (error) {
    console.error('[POST /products/:id/units]', error);
    return errorResponse('Gagal menambahkan satuan produk.', 'SERVER_ERROR', 500);
  }
});

export const PUT = withBossOnly(async (request, { params }, { user, profile, supabase }) => {
  try {
    const { id: productId } = await params;
    const body = await request.json();
    const { unit_id, unit_name, multiplier_to_base, price, barcode, sort_order } = body;

    if (!unit_id) return errorResponse('ID satuan wajib dicantumkan.', 'VALIDATION_ERROR', 422);

    const { data: existingUnit, error: fetchErr } = await supabase
      .from('product_units')
      .select('*, products(id, nama, shop_id)')
      .eq('id', unit_id)
      .eq('product_id', productId)
      .single();

    if (fetchErr || !existingUnit) {
      return errorResponse('Satuan produk tidak ditemukan.', 'NOT_FOUND', 404);
    }

    const shopId = existingUnit.products?.shop_id || profile.shop_id;
    const cleanBarcode = barcode !== undefined ? (barcode?.trim() || null) : existingUnit.barcode;

    // Cek duplikasi barcode jika diubah
    if (cleanBarcode && cleanBarcode !== existingUnit.barcode) {
      const { data: dupBarcode } = await supabase
        .from('product_units')
        .select('id, unit_name')
        .eq('shop_id', shopId)
        .eq('barcode', cleanBarcode)
        .neq('id', unit_id)
        .maybeSingle();

      if (dupBarcode) {
        return errorResponse(`Barcode "${cleanBarcode}" sudah digunakan oleh satuan ${dupBarcode.unit_name}.`, 'CONFLICT', 409);
      }
    }

    const updateData = { updated_at: new Date().toISOString() };
    if (unit_name !== undefined) updateData.unit_name = unit_name.trim();
    if (price !== undefined) updateData.price = parseInt(price, 10);
    if (barcode !== undefined) updateData.barcode = cleanBarcode;
    if (sort_order !== undefined) updateData.sort_order = parseInt(sort_order, 10);

    // Base unit selalu memiliki multiplier = 1
    if (!existingUnit.is_base_unit && multiplier_to_base !== undefined) {
      const mult = parseInt(multiplier_to_base, 10);
      if (isNaN(mult) || mult <= 0) {
        return errorResponse('Pengali harus berupa angka bulat positif.', 'VALIDATION_ERROR', 422);
      }
      updateData.multiplier_to_base = mult;
    }

    const { data: updated, error: updateErr } = await supabase
      .from('product_units')
      .update(updateData)
      .eq('id', unit_id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Jika base unit diperbarui harga/barcodenya, sinkronkan ke tabel products
    if (existingUnit.is_base_unit) {
      const prodSync = {};
      if (updateData.price !== undefined) prodSync.harga_base = updateData.price;
      if (updateData.barcode !== undefined) prodSync.barcode = updateData.barcode;
      if (Object.keys(prodSync).length > 0) {
        await supabase.from('products').update(prodSync).eq('id', productId);
      }
    }

    return successResponse(updated);
  } catch (error) {
    console.error('[PUT /products/:id/units]', error);
    return errorResponse('Gagal memperbarui satuan produk.', 'SERVER_ERROR', 500);
  }
});

export const DELETE = withBossOnly(async (request, { params }, { user, profile, supabase }) => {
  try {
    const { id: productId } = await params;
    const { searchParams } = new URL(request.url);
    const unitId = searchParams.get('unit_id');

    if (!unitId) return errorResponse('Parameter unit_id wajib diisi.', 'VALIDATION_ERROR', 422);

    const { data: existingUnit } = await supabase
      .from('product_units')
      .select('id, unit_name, is_base_unit, shop_id')
      .eq('id', unitId)
      .eq('product_id', productId)
      .single();

    if (!existingUnit) return errorResponse('Satuan tidak ditemukan.', 'NOT_FOUND', 404);

    if (existingUnit.is_base_unit) {
      return errorResponse('Satuan dasar (Base Unit) tidak boleh dihapus.', 'VALIDATION_ERROR', 400);
    }

    const { error: delErr } = await supabase
      .from('product_units')
      .delete()
      .eq('id', unitId);

    if (delErr) throw delErr;

    await logActivity(
      supabase,
      existingUnit.shop_id,
      profile.username || user.email,
      'Hapus Satuan Produk',
      `Menghapus satuan "${existingUnit.unit_name}" pada produk ID ${productId}`
    );

    return successResponse({ message: `Satuan "${existingUnit.unit_name}" berhasil dihapus.` });
  } catch (error) {
    console.error('[DELETE /products/:id/units]', error);
    return errorResponse('Gagal menghapus satuan produk.', 'SERVER_ERROR', 500);
  }
});
