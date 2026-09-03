import { withBossOnly, errorResponse, successResponse, checkSubscriptionActive } from '@/lib/auth-helpers';
import { checkQuotaLimit } from '@/lib/subscription';

export const GET = withBossOnly(async (request, context, { user, supabase }) => {
  try {
    const { data: branches, error } = await supabase
      .from('shops')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return successResponse(branches || []);
  } catch (error) {
    console.error('[GET /branches]', error);
    return errorResponse(`Gagal mengambil data cabang: ${error.message}`, 'SERVER_ERROR', 500);
  }
});

export const POST = withBossOnly(async (request, context, { user, supabase }) => {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || name.trim().length === 0) {
      return errorResponse('Nama cabang wajib diisi.', 'VALIDATION_ERROR', 422);
    }

    // Get main shop owned by user
    const { data: mainShop } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', user.id)
      .is('parent_shop_id', null)
      .single();

    const mainShopId = mainShop ? mainShop.id : user.id;

    // Check max_branches limit
    const { plan } = await checkSubscriptionActive(supabase, mainShopId);

    // Count existing branches owned by this boss
    const { count } = await supabase
      .from('shops')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id);

    const currentCount = (count || 0) + 1;
    const quotaCheck = checkQuotaLimit(plan, currentCount, 'max_branches');

    if (!quotaCheck.allowed) {
      return errorResponse(quotaCheck.message, 'LIMIT_EXCEEDED', 403);
    }

    // Create branch shop
    const { data: newBranch, error: createErr } = await supabase
      .from('shops')
      .insert({
        name: name.trim(),
        owner_id: user.id,
        parent_shop_id: mainShopId,
      })
      .select()
      .single();

    if (createErr) throw createErr;

    // Add boss to user_shops for this branch
    await supabase.from('user_shops').insert({
      user_id: user.id,
      shop_id: newBranch.id,
    });

    return successResponse(newBranch, 201);
  } catch (error) {
    console.error('[POST /branches]', error);
    return errorResponse(`Gagal membuat cabang baru: ${error.message}`, 'SERVER_ERROR', 500);
  }
});
