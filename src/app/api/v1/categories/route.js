// GET  /api/v1/categories   — daftar semua kategori produk toko ini
// POST /api/v1/categories   — tambah kategori produk baru (BOSS only)
import { withAuthSupabase, withBossOnly, errorResponse, successResponse, resolveShopId } from '@/lib/auth-helpers';

async function getShopId(user, profile, supabase) {
  return profile.shop_id || (await resolveShopId(supabase, user, profile));
}

export const GET = withAuthSupabase(async (request, context, { user, profile, supabase }) => {
  try {
    const shopId = await getShopId(user, profile, supabase);
    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);

    const { data: categories, error } = await supabase
      .from('product_categories')
      .select('id, code, name, created_at, updated_at')
      .eq('shop_id', shopId)
      .order('code', { ascending: true });

    if (error) throw error;
    return successResponse(categories);
  } catch (error) {
    console.error('[GET /categories]', error);
    return errorResponse('Gagal memuat daftar kategori.', 'SERVER_ERROR', 500);
  }
});

export const POST = withBossOnly(async (request, context, { user, profile, supabase }) => {
  try {
    const body = await request.json();
    const code = body.code?.toUpperCase().trim();
    const name = body.name?.trim();

    if (!code || !name) {
      return errorResponse('Kode dan nama kategori wajib diisi.', 'VALIDATION_ERROR', 422);
    }

    const shopId = await getShopId(user, profile, supabase);
    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);

    // Cek duplikat kode dalam toko ini
    const { data: existing } = await supabase
      .from('product_categories')
      .select('id')
      .eq('shop_id', shopId)
      .eq('code', code)
      .single();

    if (existing) {
      return errorResponse(`Kode kategori "${code}" sudah ada.`, 'CONFLICT', 409);
    }

    const { data: category, error } = await supabase
      .from('product_categories')
      .insert({ shop_id: shopId, code, name })
      .select()
      .single();

    if (error) throw error;
    return successResponse(category, 201);
  } catch (error) {
    console.error('[POST /categories]', error);
    return errorResponse('Gagal menambahkan kategori.', 'SERVER_ERROR', 500);
  }
});
