// GET /api/v1/shifts/current — Mengambil shift kasir aktif saat ini
// PROTOKOL TRUE BLIND CLOSING: Field expected_cash dan angka omzet kas DILARANG dikirim ke role CASHIER!

import { withAuthSupabase, errorResponse, successResponse } from '@/lib/auth-helpers';

export const GET = withAuthSupabase(async (request, context, { user, profile, supabase }) => {
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

    const { data: activeShift, error: shiftErr } = await supabase
      .from('cashier_shifts')
      .select('*, cashier:profiles!cashier_id(id, username, role)')
      .eq('shop_id', shopId)
      .eq('status', 'OPEN')
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (shiftErr) throw shiftErr;

    if (!activeShift) {
      return successResponse({ active_shift: null });
    }

    // Ambil mutasi kas laci operasional untuk shift ini
    const { data: movements, error: movErr } = await supabase
      .from('cash_drawer_movements')
      .select('id, movement_type, category, amount, notes, created_at, created_by:profiles!created_by(id, username)')
      .eq('shift_id', activeShift.id)
      .order('created_at', { ascending: false });

    if (movErr) console.warn('Warning loading shift movements:', movErr.message);

    // Salinan data shift yang aman
    const safeShift = {
      id: activeShift.id,
      shop_id: activeShift.shop_id,
      cashier_id: activeShift.cashier_id,
      cashier: activeShift.cashier,
      shift_number: activeShift.shift_number,
      start_time: activeShift.start_time,
      starting_cash: Number(activeShift.starting_cash || 0),
      status: activeShift.status,
      notes: activeShift.notes,
      movements: movements || [],
    };

    // ── PROTOKOL TRUE BLIND CLOSING ──
    // Hanya Owner/Boss/Admin yang boleh melihat angka kas berjalan & expected_cash
    if (profile.role === 'BOSS' || profile.role === 'ADMIN') {
      // Hitung akumulasi kas berjalan untuk Boss
      const { data: txs } = await supabase
        .from('transactions')
        .select('omzet_total, status')
        .eq('shop_id', shopId)
        .gte('created_at', activeShift.start_time);

      const cashSales = (txs || [])
        .filter(t => t.status === 'Lunas')
        .reduce((sum, t) => sum + Number(t.omzet_total || 0), 0);

      const drawerIn = (movements || [])
        .filter(m => m.movement_type === 'CASH_IN')
        .reduce((sum, m) => sum + Number(m.amount || 0), 0);

      const drawerOut = (movements || [])
        .filter(m => m.movement_type === 'CASH_OUT')
        .reduce((sum, m) => sum + Number(m.amount || 0), 0);

      safeShift.boss_preview = {
        cash_sales: cashSales,
        drawer_in: drawerIn,
        drawer_out: drawerOut,
        current_expected_cash: safeShift.starting_cash + cashSales + drawerIn - drawerOut,
      };
    }

    return successResponse({ active_shift: safeShift });
  } catch (err) {
    console.error('Error GET /api/v1/shifts/current:', err);
    return errorResponse('Gagal memuat shift aktif: ' + err.message, 'INTERNAL_ERROR', 500);
  }
});
