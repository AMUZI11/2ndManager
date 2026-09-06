// GET  /api/v1/products   — list semua produk milik toko
// POST /api/v1/products   — tambah produk baru
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { withAuthSupabase, withBossOnly, errorResponse, successResponse, checkSubscriptionActive } from '@/lib/auth-helpers';
import { checkQuotaLimit } from '@/lib/subscription';
import { logActivity } from '@/lib/audit';

export const GET = withAuthSupabase(async (request, context, { profile, supabase }) => {
  try {
    const { searchParams } = new URL(request.url);
    const tipe = searchParams.get('tipe');

    let query = supabase
      .from('products')
      .select('*, product_units(*)')
      .eq('is_deleted', false)
      .order('tipe', { ascending: true })
      .order('nama', { ascending: true });

    if (tipe && tipe.trim()) {
      query = query.eq('tipe', tipe.trim().toUpperCase());
    }

    const { data: products, error } = await query;
    if (error) throw error;

    return successResponse(products);
  } catch (error) {
    console.error('[GET /products]', error);
    return errorResponse('Gagal memuat daftar produk.', 'SERVER_ERROR', 500);
  }
});

export const POST = withBossOnly(async (request, context, { user, profile, supabase }) => {
  try {
    const body = await request.json();
    const { nama, barcode, harga_modal, harga_base, tipe, stock, reorder_threshold } = body;

    if (!nama?.trim() || !tipe?.trim() || harga_base == null || harga_modal == null) {
      return errorResponse('Nama, tipe, harga modal, dan harga base wajib diisi.', 'VALIDATION_ERROR', 422);
    }

    // Ambil shop_id aktif untuk BOSS (dari user_shops, pilih yang pertama atau yang sedang aktif)
    const { data: userShop } = await supabase
      .from('user_shops')
      .select('shop_id')
      .eq('user_id', user.id)
      .single();

    if (!userShop) return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);

    // Cek plan toko dan enforce produk SKU max
    const { plan } = await checkSubscriptionActive(supabase, userShop.shop_id);
    
    // Hitung SKU saat ini
    const { count, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('shop_id', userShop.shop_id)
      .eq('is_deleted', false);

    if (countError) throw countError;

    const quotaCheck = checkQuotaLimit(plan, (count || 0) + 1, 'max_sku');
    if (!quotaCheck.allowed) {
      return errorResponse(quotaCheck.message, 'QUOTA_EXCEEDED', 403);
    }

    const cleanBarcode = barcode?.trim() || null;

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        shop_id: userShop.shop_id,
        nama: nama.trim(),
        barcode: cleanBarcode,
        harga_modal: parseInt(harga_modal, 10),
        harga_base: parseInt(harga_base, 10),
        tipe: tipe.trim().toUpperCase(),
        stock: parseInt(stock || 0, 10),
        reorder_threshold: parseInt(reorder_threshold || 5, 10),
      })
      .select()
      .single();

    if (error) throw error;

    // Otomatis sinkronkan Base Unit ke product_units (Barcode Resolution Chokepoint)
    const { error: unitErr } = await supabase
      .from('product_units')
      .insert({
        product_id: product.id,
        shop_id: userShop.shop_id,
        unit_name: 'Pcs',
        multiplier_to_base: 1,
        barcode: cleanBarcode,
        price: parseInt(harga_base, 10),
        is_base_unit: true,
        sort_order: 1,
      });

    if (unitErr) {
      console.error('[POST /products] Gagal membuat base unit:', unitErr);
    }

    // Ambil full data produk beserta product_units
    const { data: fullProduct } = await supabase
      .from('products')
      .select('*, product_units(*)')
      .eq('id', product.id)
      .single();

    await logActivity(supabase, userShop.shop_id, profile.username || user.email, 'Tambah Produk',
      `Menambahkan produk "${product.nama}" (${tipe}) harga jual Rp${Number(harga_base).toLocaleString('id-ID')}`);

    return successResponse(fullProduct || product, 201);
  } catch (error) {
    console.error('[POST /products]', error);
    return errorResponse('Gagal menambahkan produk.', 'SERVER_ERROR', 500);
  }
});
