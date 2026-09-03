import { withAdminAuth, logAdminAudit } from '@/lib/admin-auth';
import { successResponse, errorResponse } from '@/lib/auth-helpers';

export const POST = withAdminAuth(async (request, context, adminContext) => {
  const { supabaseAdmin, adminId, adminEmail, ipAddress, userAgent } = adminContext;

  try {
    const body = await request.json();
    const { target_shop_id } = body;

    if (!target_shop_id) {
      return errorResponse('Target toko (target_shop_id) wajib diisi.', 'VALIDATION_ERROR', 422);
    }

    // 1. Fetch 11 Global Categories
    const { data: templates, error: tmplErr } = await supabaseAdmin
      .from('global_category_templates')
      .select('*')
      .order('sort_order', { ascending: true });

    if (tmplErr || !templates?.length) {
      return errorResponse('Template kategori global belum tersedia.', 'NOT_FOUND', 404);
    }

    // 2. Fetch existing shop categories to avoid duplicates
    const { data: existingCats } = await supabaseAdmin
      .from('categories')
      .select('name')
      .eq('shop_id', target_shop_id);

    const existingNames = new Set((existingCats || []).map((c) => c.name.toLowerCase()));

    // 3. Prepare categories to insert
    const toInsert = templates
      .filter((t) => !existingNames.has(t.category_name.toLowerCase()))
      .map((t) => ({
        shop_id: target_shop_id,
        name: t.category_name,
        description: t.description,
      }));

    if (toInsert.length === 0) {
      return successResponse({
        message: 'Seluruh 11 kategori standar sudah terpasang di toko ini.',
        insertedCount: 0,
      });
    }

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('categories')
      .insert(toInsert)
      .select();

    if (insertErr) throw insertErr;

    // 4. Log Audit
    await logAdminAudit({
      adminId,
      adminEmail,
      actionType: 'CATEGORY_TEMPLATES_SEEDED',
      targetShopId: target_shop_id,
      reason: `Menyuntikkan ${inserted.length} kategori ritel standar ke toko`,
      metadata: { inserted_count: inserted.length, target_shop_id },
      ipAddress,
      userAgent,
    });

    return successResponse({
      message: `Berhasil memasang ${inserted.length} kategori ritel standar ke toko target.`,
      insertedCount: inserted.length,
    });
  } catch (err) {
    console.error('[POST /api/v1/admin/categories/seed]', err);
    return errorResponse('Gagal menyuntikkan template kategori ke toko.', 'SERVER_ERROR', 500);
  }
});
