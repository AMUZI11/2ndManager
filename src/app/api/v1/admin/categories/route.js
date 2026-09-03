import { withAdminAuth, logAdminAudit } from '@/lib/admin-auth';
import { successResponse, errorResponse } from '@/lib/auth-helpers';

export const GET = withAdminAuth(async (request, context, adminContext) => {
  const { supabaseAdmin } = adminContext;

  try {
    const { data, error } = await supabaseAdmin
      .from('global_category_templates')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return successResponse({ categories: data || [] });
  } catch (err) {
    console.error('[GET /api/v1/admin/categories]', err);
    return errorResponse('Gagal memuat master kategori global.', 'SERVER_ERROR', 500);
  }
});

export const POST = withAdminAuth(async (request, context, adminContext) => {
  const { supabaseAdmin, adminId, adminEmail, ipAddress, userAgent } = adminContext;

  try {
    const body = await request.json();
    const { category_code, category_name, description, icon_name, sort_order = 99 } = body;

    if (!category_code || !category_name) {
      return errorResponse('Kode kategori dan nama kategori wajib diisi.', 'VALIDATION_ERROR', 422);
    }

    const { data, error } = await supabaseAdmin
      .from('global_category_templates')
      .insert({
        category_code: category_code.trim().toUpperCase(),
        category_name: category_name.trim(),
        description: description?.trim() || '',
        icon_name: icon_name?.trim() || 'Package',
        sort_order: Number(sort_order),
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
