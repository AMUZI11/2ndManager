// GET  /api/v1/shifts/movements — List mutasi kas masuk/keluar laci
// POST /api/v1/shifts/movements — Catat kas masuk / kas keluar operasional laci kasir

import { withAuthSupabase, errorResponse, successResponse } from '@/lib/auth-helpers';
import { logActivity } from '@/lib/audit';

export const GET = withAuthSupabase(async (request, context, { user, profile, supabase }) => {
  try {
    const { searchParams } = new URL(request.url);
    const shiftIdParam = searchParams.get('shift_id');

    let shopId = profile.shop_id;
    if (!shopId && profile.role === 'BOSS') {
      const { data: userShop } = await supabase
        .from('user_shops')
        .select('shop_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      shopId = userShop?.shop_id;
    }

    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);

    let query = supabase
      .from('cash_drawer_movements')
      .select('*, created_by:profiles!created_by(id, nama, role)')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (shiftIdParam) {
      query = query.eq('shift_id', shiftIdParam);
    }

    const { data: movements, error } = await query;
    if (error) throw error;

    return successResponse(movements || []);
  } catch (err) {
    console.error('Error GET /api/v1/shifts/movements:', err);
    return errorResponse('Gagal memuat mutasi laci: ' + err.message, 'INTERNAL_ERROR', 500);
  }
});

export const POST = withAuthSupabase(async (request, context, { user, profile, supabase }) => {
  try {
    let shopId = profile.shop_id;
    if (!shopId && profile.role === 'BOSS') {
      const { data: userShop } = await supabase
        .from('user_shops')
        .select('shop_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      shopId = userShop?.shop_id;
    }

    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);

    const body = await request.json();
    const {
      shift_id,
      movement_type, // 'CASH_IN' | 'CASH_OUT'
      category = 'OPERATIONAL', // 'OPERATIONAL', 'EXPENSE', 'OWNER_DRAW', 'TOPUP', 'OTHER'
      amount,
      notes,
    } = body;

    if (!movement_type || !['CASH_IN', 'CASH_OUT'].includes(movement_type)) {
      return errorResponse('Jenis mutasi wajib berupa CASH_IN atau CASH_OUT.', 'INVALID_TYPE', 400);
    }

    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return errorResponse('Nominal mutasi kas harus berupa angka positif lebih dari 0.', 'INVALID_AMOUNT', 400);
    }

    if (!notes || typeof notes !== 'string' || !notes.trim()) {
      return errorResponse('Alasan / keterangan mutasi kas laci wajib diisi.', 'INVALID_NOTES', 400);
    }

    let activeShiftId = shift_id;
    if (!activeShiftId) {
      const { data: currentShift } = await supabase
        .from('cashier_shifts')
        .select('id')
        .eq('shop_id', shopId)
        .eq('status', 'OPEN')
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();
      activeShiftId = currentShift?.id || null;
    }

    const { data: movement, error: insertErr } = await supabase
      .from('cash_drawer_movements')
      .insert({
        shop_id: shopId,
        shift_id: activeShiftId,
        movement_type,
        category,
        amount: parsedAmount,
        notes: notes.trim(),
        created_by: profile.id,
      })
      .select('*, created_by:profiles!created_by(id, nama, role)')
      .single();

    if (insertErr) throw insertErr;

    await logActivity({
      user_id: user.id,
      action: 'CASH_DRAWER_MOVEMENT',
      entity: 'cash_drawer_movements',
      entity_id: movement.id,
      metadata: {
        movement_type,
        amount: parsedAmount,
        notes: notes.trim(),
        shift_id: activeShiftId,
      },
    });

    return successResponse(movement);
  } catch (err) {
    console.error('Error POST /api/v1/shifts/movements:', err);
    return errorResponse('Gagal mencatat mutasi laci: ' + err.message, 'INTERNAL_ERROR', 500);
  }
});
