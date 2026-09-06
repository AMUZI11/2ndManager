import { withBossOnly, errorResponse, successResponse, resolveShopId } from '@/lib/auth-helpers';

export const DEFAULT_PRESET_CATEGORIES = [
  { code: 'SBK', name: 'Sembako & Bahan Pokok' },
  { code: 'MNM', name: 'Minuman & Kopi' },
  { code: 'RKK', name: 'Rokok & Tembakau' },
  { code: 'SNK', name: 'Snack & Makanan Ringan' },
  { code: 'BMB', name: 'Bumbu & Bahan Dapur' },
  { code: 'SBN', name: 'Sabun & Kebersihan Rumah' },
  { code: 'PRW', name: 'Perawatan Diri & Mandi' },
  { code: 'OBT', name: 'Obat-obatan & Farmasi' },
  { code: 'GAS', name: 'Gas LPG & Galon Air' },
  { code: 'PLS', name: 'Pulsa, Token & Tagihan' },
  { code: 'ATK', name: 'Alat Tulis & Perlengkapan' },
];

async function getShopId(user, profile, supabase) {
  return profile.shop_id || (await resolveShopId(supabase, user, profile));
}

export const POST = withBossOnly(async (request, context, { user, profile, supabase }) => {
  try {
    const shopId = await getShopId(user, profile, supabase);
    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);

    // Ambil kategori yang sudah ada di toko ini
    const { data: existingCategories, error: fetchErr } = await supabase
      .from('product_categories')
      .select('code')
      .eq('shop_id', shopId);

    if (fetchErr) throw fetchErr;

    const existingCodes = new Set((existingCategories || []).map(c => c.code));

    // Filter kategori standar yang belum ada
    const toInsert = DEFAULT_PRESET_CATEGORIES
      .filter(preset => !existingCodes.has(preset.code))
      .map(preset => ({
        shop_id: shopId,
        code: preset.code,
        name: preset.name,
      }));

    if (toInsert.length > 0) {
      const { error: insertErr } = await supabase
        .from('product_categories')
        .insert(toInsert);

      if (insertErr) throw insertErr;
    }

    // Ambil daftar lengkap kategori setelah seeding
    const { data: allCategories, error: listErr } = await supabase
      .from('product_categories')
      .select('id, code, name, created_at, updated_at')
      .eq('shop_id', shopId)
      .order('code', { ascending: true });

    if (listErr) throw listErr;

    return successResponse({
      seeded_count: toInsert.length,
      categories: allCategories,
    });
  } catch (error) {
    console.error('[POST /categories/seed-defaults]', error);
    return errorResponse('Gagal memuat kategori standar.', 'SERVER_ERROR', 500);
  }
});
