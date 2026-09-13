import { withAdminAuth, logAdminAudit } from '@/lib/admin-auth';
import { successResponse, errorResponse } from '@/lib/auth-helpers';

export const GET = withAdminAuth(async (request, context, adminContext) => {
  const { supabaseAdmin } = adminContext;

  try {
    const { data, error } = await supabaseAdmin
      .from('global_category_templates')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;

    const categories = (data || []).map((c) => ({
      ...c,
      category_code: c.code || c.category_code,
      category_name: c.name || c.category_name,
      description: c.example_items || c.description,
      sort_order: c.display_order ?? c.sort_order ?? 1,
    }));

    return successResponse({ categories });
  } catch (err) {
    console.error('[GET /api/v1/admin/categories]', err);
    return errorResponse('Gagal memuat master kategori global.', 'SERVER_ERROR', 500);
  }
});

export const POST = withAdminAuth(async (request, context, adminContext) => {
  const { supabaseAdmin, adminId, adminEmail, ipAddress, userAgent } = adminContext;

  try {
    const body = await request.json();
    const { category_code, category_name, description, sort_order = 99 } = body;

    if (!category_code || !category_name) {
      return errorResponse('Kode kategori dan nama kategori wajib diisi.', 'VALIDATION_ERROR', 422);
    }

    const { data, error } = await supabaseAdmin
      .from('global_category_templates')
      .insert({
        code: category_code.trim().toUpperCase(),
        name: category_name.trim(),
        example_items: description?.trim() || '',
        display_order: Number(sort_order),
      })
      .select()
      .single();

    if (error) throw error;

    await logAdminAudit({
      adminId,
      adminEmail,
      actionType: 'GLOBAL_CATEGORY_CREATED',
      reason: `Menambahkan master kategori global: ${category_name}`,
      metadata: { category_code, category_name },
      ipAddress,
      userAgent,
    });

    return successResponse(data, 201);
  } catch (err) {
    console.error('[POST /api/v1/admin/categories]', err);
    return errorResponse('Gagal membuat kategori global.', 'SERVER_ERROR', 500);
  }
});
