// GET    /api/v1/products/[id]  — detail produk
// PUT    /api/v1/products/[id]  — update produk (BOSS only, triggers audit log)
// DELETE /api/v1/products/[id]  — soft-delete produk (BOSS only)
import { withAuthSupabase, withBossOnly, errorResponse, successResponse } from '@/lib/auth-helpers';
import { logActivity } from '@/lib/audit';

export const GET = withAuthSupabase(async (request, { params }, { profile, supabase }) => {
  try {
    const { id } = await params;
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error || !product) return errorResponse('Produk tidak ditemukan.', 'NOT_FOUND', 404);
    return successResponse(product);
  } catch (error) {
    console.error('[GET /products/:id]', error);
    return errorResponse('Gagal memuat data produk.', 'SERVER_ERROR', 500);
  }
});

export const PUT = withBossOnly(async (request, { params }, { user, profile, supabase }) => {
  try {
    const { id } = await params;
    const body = await request.json();

    // Cek produk ada dan milik shop ini (RLS juga enforce ini)
    const { data: existing } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (!existing) return errorResponse('Produk tidak ditemukan.', 'NOT_FOUND', 404);

    const updateData = {};
    if (body.nama !== undefined) updateData.nama = body.nama.trim();
    if (body.tipe !== undefined) updateData.tipe = body.tipe.toUpperCase();
    if (body.barcode !== undefined) updateData.barcode = body.barcode?.trim() || null;
    if (body.harga_modal !== undefined) updateData.harga_modal = parseInt(body.harga_modal, 10);
    if (body.harga_base !== undefined) updateData.harga_base = parseInt(body.harga_base, 10);
    if (body.stock !== undefined) updateData.stock = parseInt(body.stock, 10);
    if (body.reorder_threshold !== undefined) updateData.reorder_threshold = parseInt(body.reorder_threshold, 10);
    if (body.supplier_id !== undefined) updateData.supplier_id = body.supplier_id || null;
    updateData.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Audit log otomatis dibuat oleh PostgreSQL Trigger (audit_product_price)
    // untuk perubahan harga — kita log manual untuk perubahan nama/tipe
    if (body.nama !== undefined || body.tipe !== undefined || body.barcode !== undefined) {
      await logActivity(supabase, existing.shop_id, profile.username || user.email, 'Ubah Produk',
        `Mengubah produk "${existing.nama}" → "${updated.nama}"`);
    }

    return successResponse(updated);
  } catch (error) {
    console.error('[PUT /products/:id]', error);
    return errorResponse('Gagal mengubah data produk.', 'SERVER_ERROR', 500);
  }
});

export const DELETE = withBossOnly(async (request, { params }, { user, profile, supabase }) => {
  try {
    const { id } = await params;
    const { data: existing } = await supabase
      .from('products')
      .select('id, nama, tipe, shop_id')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (!existing) return errorResponse('Produk tidak ditemukan.', 'NOT_FOUND', 404);

    const { error } = await supabase
      .from('products')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    await logActivity(supabase, existing.shop_id, profile.username || user.email, 'Hapus Produk',
      `Menghapus produk "${existing.nama}" (${existing.tipe})`);

    return successResponse({ success: true });
  } catch (error) {
    console.error('[DELETE /products/:id]', error);
    return errorResponse('Gagal menghapus produk.', 'SERVER_ERROR', 500);
  }
});
