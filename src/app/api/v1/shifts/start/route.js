// POST /api/v1/shifts/start — Buka sesi shift kasir baru dengan modal awal (starting_cash)

import { withAuthSupabase, errorResponse, successResponse } from '@/lib/auth-helpers';
import { logActivity } from '@/lib/audit';

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
    const { starting_cash = 0, notes } = body;

    const initialCash = parseInt(starting_cash, 10);
    if (isNaN(initialCash) || initialCash < 0) {
      return errorResponse('Modal awal laci kasir (starting_cash) tidak valid.', 'INVALID_INPUT', 400);
    }

    // Periksa apakah sudah ada shift yang berstatus 'OPEN' untuk toko ini
    const { data: existingShift, error: checkErr } = await supabase
      .from('cashier_shifts')
      .select('id, shift_number, cashier_id, start_time, starting_cash')
      .eq('shop_id', shopId)
      .eq('status', 'OPEN')
      .maybeSingle();

    if (checkErr) throw checkErr;

    if (existingShift) {
      return errorResponse(
        `Masih ada shift kasir yang aktif (Shift #${existingShift.shift_number}). Tutup shift sebelumnya terlebih dahulu.`,
        'ACTIVE_SHIFT_EXISTS',
        400,
        { active_shift: existingShift }
      );
    }

    // Hitung nomor urut shift hari ini
    const todayStr = new Date().toISOString().split('T')[0];
    const { count } = await supabase
      .from('cashier_shifts')
      .select('*', { count: 'exact', head: true })
      .eq('shop_id', shopId)
      .gte('start_time', `${todayStr}T00:00:00.000Z`);

    const shiftNumber = (count || 0) + 1;

    // Buat row shift baru
    const { data: newShift, error: insertErr } = await supabase
      .from('cashier_shifts')
      .insert({
        shop_id: shopId,
        cashier_id: profile.id,
        shift_number: shiftNumber,
        starting_cash: initialCash,
        status: 'OPEN',
        notes: notes?.trim() || null,
        start_time: new Date().toISOString(),
      })
      .select('*, cashier:profiles!cashier_id(id, nama, role)')
      .single();

    if (insertErr) throw insertErr;

    await logActivity({
      user_id: user.id,
      action: 'START_CASHIER_SHIFT',
      entity: 'cashier_shifts',
      entity_id: newShift.id,
      metadata: { shift_number: shiftNumber, starting_cash: initialCash },
    });

    return successResponse(newShift);
  } catch (err) {
    console.error('Error POST /api/v1/shifts/start:', err);
    return errorResponse('Gagal memulai shift kasir: ' + err.message, 'INTERNAL_ERROR', 500);
  }
});
