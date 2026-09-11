// GET /api/v1/radar/overview — Pusat Komando Radar Keamanan Pemilik Warung
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

    if (!shopId) {
      return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);
    }

    // 1. Ambil daftar terminal kasir (registers)
    let { data: registers, error: regErr } = await supabase
      .from('registers')
      .select('*')
      .eq('shop_id', shopId)
      .order('register_code', { ascending: true });

    if (regErr || !registers || registers.length === 0) {
      // Inisialisasi REGISTER_MAIN jika belum ada
      const { data: newReg } = await supabase
        .from('registers')
        .upsert({
          shop_id: shopId,
          register_code: 'REGISTER_MAIN',
          name: 'Terminal Kasir Utama',
          is_frozen: false,
        }, { onConflict: 'shop_id,register_code' })
        .select();

      registers = newReg || [{
        register_code: 'REGISTER_MAIN',
        name: 'Terminal Kasir Utama',
        is_frozen: false,
      }];
    }

    // 2. Ambil shift yang saat ini sedang AKTIF (OPEN)
    const { data: activeShifts, error: shiftErr } = await supabase
      .from('cashier_shifts')
      .select(`
        id,
        register_id,
        shift_number,
        starting_cash,
        start_time,
        status,
        cashier:profiles!cashier_id (
          id,
          username,
          full_name,
          role
        )
      `)
      .eq('shop_id', shopId)
      .eq('status', 'OPEN')
      .order('start_time', { ascending: false });

    if (shiftErr) {
      console.warn('[Radar active shifts query error]', shiftErr);
    }

    // 3. Ambil 30 rekaman anomali keamanan terbaru
    const { data: recentAnomalies, error: anomErr } = await supabase
      .from('security_anomaly_events')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (anomErr) {
      console.warn('[Radar anomalies query error]', anomErr);
    }

    // 4. Hitung statistik laci & transaksi per register aktif
    const activeRegistersData = registers.map((reg) => {
      const shift = activeShifts?.find((s) => (s.register_id || 'REGISTER_MAIN') === reg.register_code);
      return {
        id: reg.id,
        register_code: reg.register_code,
        name: reg.name,
        is_frozen: Boolean(reg.is_frozen),
        frozen_reason: reg.frozen_reason,
        frozen_at: reg.frozen_at,
        active_shift: shift || null,
      };
    });

    return successResponse({
      shop_id: shopId,
      registers: activeRegistersData,
      active_shifts_count: activeShifts?.length || 0,
      recent_anomalies: recentAnomalies || [],
      server_timestamp: Date.now(),
    });
  } catch (err) {
    console.error('[GET /api/v1/radar/overview Error]', err);
    return errorResponse('Gagal memuat overview radar keamanan.', 'INTERNAL_ERROR', 500);
  }
});
