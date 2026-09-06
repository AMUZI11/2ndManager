// GET  /api/v1/consignments/batches  — Daftar batch titipan konsinyasi
// POST /api/v1/consignments/batches  — Catat barang titipan baru (Drop-In)
import { withAuthSupabase, errorResponse, successResponse } from '@/lib/auth-helpers';
import { logActivity } from '@/lib/audit';

export const GET = withAuthSupabase(async (request, { params }, { user, profile, supabase }) => {
  try {
    let shopId = profile.shop_id;
    if (profile.role === 'BOSS') {
      const { data: userShop } = await supabase
        .from('user_shops').select('shop_id').eq('user_id', user.id).single();
      shopId = userShop?.shop_id || shopId;
    }

    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NO_SHOP', 400);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const vendorId = searchParams.get('vendor_id');

    let query = supabase
      .from('consignment_batches')
      .select('*, consignment_vendors(id, nama_vendor, phone), products(id, nama, barcode, stock)')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status.toUpperCase());
    if (vendorId) query = query.eq('vendor_id', vendorId);

    const { data: batches, error } = await query;
    if (error) throw error;

    return successResponse(batches || []);
  } catch (error) {
    console.error('[GET /consignments/batches]', error);
    return errorResponse('Gagal memuat daftar batch konsinyasi.', 'SERVER_ERROR', 500);
  }
});

export const POST = withAuthSupabase(async (request, { params }, { user, profile, supabase }) => {
  try {
    let shopId = profile.shop_id;
    if (profile.role === 'BOSS') {
      const { data: userShop } = await supabase
        .from('user_shops').select('shop_id').eq('user_id', user.id).single();
      shopId = userShop?.shop_id || shopId;
    }

    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NO_SHOP', 400);

    const body = await request.json();
    const {
      vendor_id,
      product_id,
      product_name,
      received_qty,
      vendor_price_per_unit,
      selling_price_per_unit,
      notes
    } = body;

    if (!vendor_id) {
      return errorResponse('Pilih vendor konsinyasi terlebih dahulu.', 'VALIDATION_ERROR', 422);
    }

    const qty = parseInt(received_qty, 10);
    if (isNaN(qty) || qty <= 0) {
      return errorResponse('Jumlah barang titipan harus lebih dari 0.', 'VALIDATION_ERROR', 422);
    }

    const vendorPrice = parseInt(vendor_price_per_unit, 10);
    const sellingPrice = parseInt(selling_price_per_unit, 10);
    if (isNaN(vendorPrice) || vendorPrice < 0) {
      return errorResponse('Harga setor vendor tidak valid.', 'VALIDATION_ERROR', 422);
    }
    if (isNaN(sellingPrice) || sellingPrice < vendorPrice) {
      return errorResponse('Harga jual kasir tidak boleh lebih murah dari harga setor vendor.', 'VALIDATION_ERROR', 422);
    }

    // 1. Verifikasi Vendor
    const { data: vendor, error: vendorErr } = await supabase
      .from('consignment_vendors')
      .select('id, nama_vendor')
      .eq('id', vendor_id)
      .eq('shop_id', shopId)
      .single();

    if (vendorErr || !vendor) {
      return errorResponse('Vendor konsinyasi tidak ditemukan.', 'NOT_FOUND', 404);
    }

    // 2. Resolve Product (Gunakan produk ada atau buat produk konsinyasi baru)
    let finalProductId = product_id;
    let finalProductName = product_name;

    if (finalProductId) {
      const { data: existingProd, error: prodErr } = await supabase
        .from('products')
        .select('id, nama, stock')
        .eq('id', finalProductId)
        .eq('shop_id', shopId)
        .single();

      if (prodErr || !existingProd) {
        return errorResponse('Produk tidak ditemukan.', 'NOT_FOUND', 404);
      }
      finalProductName = existingProd.nama;

      // Update produk menjadi konsinyasi jika belum
      await supabase
        .from('products')
        .update({
          is_consignment: true,
          consignment_vendor_id: vendor_id,
          harga_modal: vendorPrice,
          harga_base: sellingPrice,
          updated_at: new Date().toISOString(),
        })
        .eq('id', finalProductId);
    } else {
      if (!product_name || !product_name.trim()) {
        return errorResponse('Nama produk konsinyasi wajib diisi.', 'VALIDATION_ERROR', 422);
      }

      // Buat produk baru khusus konsinyasi
      const { data: newProd, error: newProdErr } = await supabase
        .from('products')
        .insert({
          shop_id: shopId,
          nama: product_name.trim(),
          tipe: 'BR', // Barang Rutin
          harga_modal: vendorPrice,
          harga_base: sellingPrice,
          stock: 0, // Akan ditambah via atomic RPC mutate_product_stock di bawah
          is_consignment: true,
          consignment_vendor_id: vendor_id,
          is_active: true,
        })
        .select()
        .single();

      if (newProdErr) throw newProdErr;
      finalProductId = newProd.id;
      finalProductName = newProd.nama;

      // Buat base unit di product_units
      await supabase.from('product_units').insert({
        shop_id: shopId,
        product_id: finalProductId,
        unit_name: 'Pcs',
        multiplier: 1,
        selling_price: sellingPrice,
        is_base_unit: true,
      });
    }

    // 3. Tambah Stok Toko secara Atomik (Zero race condition)
    const { data: newStock, error: rpcErr } = await supabase.rpc('mutate_product_stock', {
      p_product_id: finalProductId,
      p_qty: qty,
    });

    if (rpcErr) throw rpcErr;

    // 4. Catat Riwayat Mutasi Stok
    await supabase.from('stock_mutations').insert({
      shop_id: shopId,
      product_id: finalProductId,
      mutation_type: 'STOCK_IN',
      quantity_delta: qty,
      notes: `Titip Jual (Drop-In) dari vendor ${vendor.nama_vendor} (${qty} pcs)`,
    });

    // 5. Buat Catatan Batch Konsinyasi
    const { data: newBatch, error: batchErr } = await supabase
      .from('consignment_batches')
      .insert({
        shop_id: shopId,
        vendor_id: vendor_id,
        product_id: finalProductId,
        received_qty: qty,
        returned_qty: 0,
        sold_qty: 0,
        lost_qty: 0,
        vendor_price_per_unit: vendorPrice,
        selling_price_per_unit: sellingPrice,
        total_payout: 0,
        total_profit: 0,
        status: 'ACTIVE',
        notes: notes?.trim() || null,
      })
      .select('*, consignment_vendors(id, nama_vendor, phone), products(id, nama)')
      .single();

    if (batchErr) throw batchErr;

    await logActivity(
      supabase,
      shopId,
      profile.username || user.email,
      'Penerimaan Konsinyasi',
      `Menerima titipan ${qty} pcs "${finalProductName}" dari vendor "${vendor.nama_vendor}" (@Rp${vendorPrice.toLocaleString('id-ID')})`
    );

    return successResponse(newBatch, 201);
  } catch (error) {
    console.error('[POST /consignments/batches]', error);
    return errorResponse('Gagal mencatat penerimaan konsinyasi.', 'SERVER_ERROR', 500);
  }
});
