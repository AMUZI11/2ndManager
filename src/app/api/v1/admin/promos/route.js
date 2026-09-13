import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { errorResponse, successResponse } from '@/lib/auth-helpers';

async function checkAdminAuth(request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) {
    return { error: errorResponse('Sesi tidak valid.', 'UNAUTHORIZED', 401) };
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = 
    user.email === process.env.ADMIN_EMAIL || 
    profile?.role === 'SUPERADMIN' || 
    profile?.role === 'BOSS';

  if (!isAdmin) {
    return { error: errorResponse('Akses ditolak. Fitur ini khusus Administrator Platform.', 'FORBIDDEN', 403) };
  }

  return { user, profile };
}

export async function GET(request) {
  try {
    const auth = await checkAdminAuth(request);
    if (auth.error) return auth.error;

    const { data: promos, error } = await supabaseAdmin
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return successResponse(promos || []);
  } catch (error) {
    console.error('[GET /api/v1/admin/promos]', error);
    return errorResponse('Gagal mengambil daftar kode promo.', 'SERVER_ERROR', 500);
  }
}

export async function POST(request) {
  try {
    const auth = await checkAdminAuth(request);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const {
      code,
      description,
      discount_type,
      discount_value,
      target_tier,
      min_spend = 0,
      max_uses = 100,
      max_uses_per_org = 1,
      expires_at = null,
      is_active = true,
    } = body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      return errorResponse('Kode promo (code) wajib diisi.', 'VALIDATION_ERROR', 400);
    }

    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    const validTypes = ['PERCENTAGE', 'FIXED_AMOUNT', 'BONUS_DAYS', 'TIER_OVERRIDE'];

    if (!validTypes.includes(discount_type)) {
      return errorResponse(
        `discount_type harus salah satu dari: ${validTypes.join(', ')}`,
        'VALIDATION_ERROR',
        400
      );
    }

    const val = parseFloat(discount_value);
    if (isNaN(val) || val < 0) {
      return errorResponse('Nilai diskon (discount_value) harus berupa angka positif.', 'VALIDATION_ERROR', 400);
    }

    const { data: created, error } = await supabaseAdmin
      .from('promo_codes')
      .insert({
        code: cleanCode,
        description: description ? description.trim() : null,
        discount_type,
        discount_value: val,
        target_tier: target_tier ? target_tier.toUpperCase() : null,
        min_spend: parseFloat(min_spend) || 0,
        max_uses: parseInt(max_uses) || 100,
        max_uses_per_org: parseInt(max_uses_per_org) || 1,
        expires_at: expires_at ? new Date(expires_at).toISOString() : null,
        is_active: Boolean(is_active),
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return errorResponse(`Kode promo '${cleanCode}' sudah digunakan sebelumnya.`, 'DUPLICATE_CODE', 409);
      }
      throw error;
    }

    return successResponse(created, 201);
  } catch (error) {
    console.error('[POST /api/v1/admin/promos]', error);
    return errorResponse('Gagal membuat kode promo baru.', 'SERVER_ERROR', 500);
  }
}

export async function PATCH(request) {
  try {
    const auth = await checkAdminAuth(request);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const { id, is_active, max_uses, expires_at } = body;

    if (!id) {
      return errorResponse('ID kode promo wajib disertakan.', 'VALIDATION_ERROR', 400);
    }

    const updatePayload = {};
    if (typeof is_active === 'boolean') updatePayload.is_active = is_active;
    if (max_uses !== undefined) updatePayload.max_uses = parseInt(max_uses);
    if (expires_at !== undefined) {
      updatePayload.expires_at = expires_at ? new Date(expires_at).toISOString() : null;
    }

    if (Object.keys(updatePayload).length === 0) {
      return errorResponse('Tidak ada data perubahan yang dikirim.', 'VALIDATION_ERROR', 400);
    }

    const { data: updated, error } = await supabaseAdmin
      .from('promo_codes')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return successResponse(updated);
  } catch (error) {
    console.error('[PATCH /api/v1/admin/promos]', error);
    return errorResponse('Gagal memperbarui status kode promo.', 'SERVER_ERROR', 500);
  }
}
