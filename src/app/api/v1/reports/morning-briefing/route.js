// POST /api/v1/reports/morning-briefing
// Asisten Autopilot WhatsApp Pukul 06:00 Pagi (Tier 3 Eksekutif)
// Mendukung:
// 1. Dual-Engine WhatsApp: Client deep-link wa.me & Server-side Gateway/Webhook (WA_GATEWAY_URL)
// 2. Sanitasi nomor telepon Indonesia (normalizeIndonesianPhone)
// 3. Ringkasan Finansial Kemarin (Omzet, Laba, Status Laci Kasir, Kasbon, Celengan)
// 4. Radar Belanja Pasar Subuh (Total Modal Tunai & Top Kebutuhan Mendesak)
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { normalizeIndonesianPhone } from '@/lib/phone';
import { canAccessFeature } from '@/lib/subscription';
import { logActivity } from '@/lib/audit';

function formatRupiah(val) {
  return `Rp ${Number(val || 0).toLocaleString('id-ID')}`;
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const cronSecretHeader = request.headers.get('x-cron-secret') || '';
    const isCron = (
      (process.env.CRON_SECRET && cronSecretHeader === process.env.CRON_SECRET) ||
      (process.env.CRON_SECRET && authHeader.replace('Bearer ', '') === process.env.CRON_SECRET)
    );

    let body = {};
    try { body = await request.json(); } catch (e) {}

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    let shopId = body.shopId;
    let user = null;
    let profile = null;

    if (!isCron) {
      // Validasi autentikasi user
      const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authUser) {
        return NextResponse.json({ success: false, error: 'Tidak terautentikasi.' }, { status: 401 });
      }
      user = authUser;

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      profile = userProfile;

      if (profile?.role === 'BOSS') {
        const { data: userShop } = await supabase
          .from('user_shops').select('shop_id').eq('user_id', user.id).single();
        shopId = userShop?.shop_id || profile?.shop_id;
      } else {
        shopId = profile?.shop_id;
      }
    }

    if (!shopId) {
      return NextResponse.json({ success: false, error: 'shopId tidak ditemukan.' }, { status: 400 });
    }

    // ─── AMBIL DATA TOKO & TIER SUBSCRIPTION ─────────────────────────────────
    const { data: shop, error: shopErr } = await supabase
      .from('shops')
      .select('id, name, owner_whatsapp_phone, auto_briefing_enabled')
      .eq('id', shopId)
      .single();

    if (shopErr || !shop) {
      return NextResponse.json({ success: false, error: 'Toko tidak ditemukan.' }, { status: 404 });
    }

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('tier, status')
      .eq('shop_id', shopId)
      .maybeSingle();

    const currentTier = sub?.tier || 'MAGANG';

    // ─── TIER 3 GATE: EKSKLUSIF EKSEKUTIF ────────────────────────────────────
    if (!canAccessFeature(currentTier, 'auto_wa_report')) {
      return NextResponse.json({
        success: false,
        error: 'Auto-Report WhatsApp Pukul 06:00 Pagi adalah fitur eksklusif Paket Eksekutif (Tier 3). Nikmati kemudahan autopilot warung dengan upgrade paket.',
        code: 'TIER_LOCKED',
        tier_required: 'EKSEKUTIF',
      }, { status: 403 });
    }

    // Nomor tujuan: body.phone atau owner_whatsapp_phone toko
    const rawTargetPhone = body.phone || shop.owner_whatsapp_phone;
    const targetPhone = normalizeIndonesianPhone(rawTargetPhone);

    // ─── AGREGASI DATA KINERJA KEMARIN ───────────────────────────────────────
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const indonesianDateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Jakarta' };
    const dateFormatted = new Intl.DateTimeFormat('id-ID', indonesianDateOptions).format(yesterday);

    // 1. Transaksi Kemarin
    const { data: txsYesterday } = await supabase
      .from('transactions')
      .select('omzet_total, laba_total, status')
      .eq('shop_id', shopId)
      .eq('status', 'Lunas')
      .eq('tanggal', yesterdayStr);

    let omzetKemarin = 0;
    let labaKemarin = 0;
    const totalTransaksi = txsYesterday?.length || 0;

    for (const t of txsYesterday || []) {
      omzetKemarin += Number(t.omzet_total || 0);
      labaKemarin += Number(t.laba_total || 0);
    }

    // 2. Status Shift Kasir Terakhir Kemarin
    const { data: lastShift } = await supabase
      .from('cashier_shifts')
      .select('*')
      .eq('shop_id', shopId)
      .eq('status', 'CLOSED')
      .order('closed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let shiftStatusText = 'Belum Ada Shift Ditutup';
    if (lastShift) {
      const diff = Number(lastShift.discrepancy_amount || 0);
      const counted = Number(lastShift.physical_counted_amount || 0);
      if (diff === 0) {
        shiftStatusText = `✅ PAS (${formatRupiah(counted)})`;
      } else if (diff < 0) {
        shiftStatusText = `⚠️ SELISIH KURANG -${formatRupiah(Math.abs(diff))}`;
      } else {
        shiftStatusText = `📈 SURPLUS +${formatRupiah(diff)}`;
      }
    }

    // 3. Mutasi Celengan Kembalian & Kasbon Kemarin
    const { data: balanceMutations } = await supabase
      .from('customer_balance_mutations')
      .select('mutation_type, amount, created_at')
      .eq('shop_id', shopId)
      .gte('created_at', `${yesterdayStr}T00:00:00Z`)
      .lte('created_at', `${yesterdayStr}T23:59:59Z`);

    let celenganKemarin = 0;
    let pelunasanKasbonKemarin = 0;

    for (const m of balanceMutations || []) {
      if (m.mutation_type === 'DEPOSIT') celenganKemarin += Number(m.amount || 0);
      if (m.mutation_type === 'PAY_DEBT') pelunasanKasbonKemarin += Number(m.amount || 0);
    }

    // ─── AGREGASI RADAR BELANJA PASAR SUBUH HARI INI ─────────────────────────
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const [prodRes, txs7dRes] = await Promise.all([
      supabase
        .from('products')
        .select(`
          id, nama, stock, reorder_threshold, harga_modal, lead_time_days, target_stock_days,
          product_units (unit_name, multiplier_to_base, is_base_unit)
        `)
        .eq('shop_id', shopId)
        .eq('is_deleted', false)
        .eq('is_consignment', false)
        .eq('is_active', true),
      supabase
        .from('transactions')
        .select('tanggal, transaction_items(product_id, quantity, is_bonus_item)')
        .eq('shop_id', shopId)
        .eq('status', 'Lunas')
        .gte('tanggal', sevenDaysAgoStr),
    ]);

    const salesStats = {};
    for (const tx of txs7dRes.data || []) {
      const d = tx.tanggal;
      for (const item of tx.transaction_items || []) {
        if (item.is_bonus_item) continue;
        const pid = item.product_id;
        if (!salesStats[pid]) salesStats[pid] = { totalSold: 0, saleDays: new Set() };
        salesStats[pid].totalSold += Number(item.quantity || 0);
        if (d) salesStats[pid].saleDays.add(d);
      }
    }

    const urgentItems = [];
    let totalEstimatedMarketCash = 0;

    for (const p of prodRes.data || []) {
      const stats = salesStats[p.id] || { totalSold: 0, saleDays: new Set() };
      const currentStock = Number(p.stock || 0);
      const safetyStock = Math.max(0, Number(p.reorder_threshold ?? 5));
      const leadTime = Math.max(1, Number(p.lead_time_days || 1));
      const targetDays = Math.max(1, Number(p.target_stock_days || 7));
      const daysInStock = currentStock <= 0 ? Math.max(1, stats.saleDays.size) : Math.min(7, Math.max(1, stats.saleDays.size + 1));
      const dailyVelocity = stats.totalSold / daysInStock;
      const reorderPoint = Math.ceil((dailyVelocity * leadTime) + safetyStock);

      if (currentStock <= reorderPoint || currentStock <= safetyStock) {
        const rawNeeded = Math.max(Math.ceil(dailyVelocity * targetDays) + safetyStock - currentStock, 1);
        
        // Cek kemasan grosir
        const units = (p.product_units || []).sort((a, b) => Number(b.multiplier_to_base || 1) - Number(a.multiplier_to_base || 1));
        const wholesale = units.find(u => !u.is_base_unit && Number(u.multiplier_to_base || 1) > 1);

        let packName = 'Pcs';
        let packQty = rawNeeded;
        let totalBase = rawNeeded;

        if (wholesale) {
          const mult = Number(wholesale.multiplier_to_base);
          packName = wholesale.unit_name;
          packQty = Math.ceil(rawNeeded / mult);
          totalBase = packQty * mult;
        }

        const cost = totalBase * Number(p.harga_modal || 0);
        totalEstimatedMarketCash += cost;

        urgentItems.push({
          nama: p.nama,
          stock: currentStock,
          packQty,
          packName,
          cost,
          isZero: currentStock <= 0,
        });
      }
    }

    // Urutkan barang paling mendesak (stok 0 paling atas)
    urgentItems.sort((a, b) => {
      if (a.isZero && !b.isZero) return -1;
      if (!a.isZero && b.isZero) return 1;
      return a.stock - b.stock;
    });

    const topItems = urgentItems.slice(0, 5);

    // ─── SUSUN TEMPLATE PESAN WHATSAPP 06:00 PAGI ────────────────────────────
    let message = `🌅 *BRIEFING PAGI KLOLAWARUNG (06:00 WIB)*\n`;
    message += `Toko: *${shop.name}*\n`;
    message += `Hari: ${dateFormatted}\n`;
    message += `═══════════════════════\n\n`;

    message += `📊 *KINERJA TOKO KEMARIN:*\n`;
    message += `• Omzet Penjualan: *${formatRupiah(omzetKemarin)}*\n`;
    message += `• Estimasi Laba Bersih: *${formatRupiah(labaKemarin)}*\n`;
    message += `• Total Transaksi: *${totalTransaksi} Struk*\n`;
    message += `• Kas Fisik Laci: ${shiftStatusText}\n`;
    if (pelunasanKasbonKemarin > 0) {
      message += `• Pelunasan Kasbon Masuk: ${formatRupiah(pelunasanKasbonKemarin)}\n`;
    }
    if (celenganKemarin > 0) {
      message += `• Celengan Kembalian Warga: ${formatRupiah(celenganKemarin)}\n`;
    }

    message += `\n🛒 *RADAR BELANJA PASAR SUBUH:*\n`;
    message += `Ditemukan *${urgentItems.length} SKU* menipis / butuh kulakan!\n`;
    message += `*Estimasi Modal Tunai Dibawa: ${formatRupiah(totalEstimatedMarketCash)}*\n\n`;

    if (topItems.length > 0) {
      message += `Top Kebutuhan Mendesak Hari Ini:\n`;
      topItems.forEach((it, idx) => {
        const stockIcon = it.isZero ? '🔴' : '⚠️';
        message += `${idx + 1}. ${stockIcon} ${it.nama}: Sisa ${it.stock} | *Saran Beli: ${it.packQty} ${it.packName}* (~${formatRupiah(it.cost)})\n`;
      });
    } else {
      message += `✅ Stok barang aman. Tidak ada SKU di bawah batas kritis saat ini.\n`;
    }

    message += `\n📲 *Tinjau & Kirim PO Kulakan:* https://2ndmanager.id/reorder\n`;
    message += `_Pesan otomatis Asisten Autopilot KlolaWarung Eksekutif_`;

    const encodedText = encodeURIComponent(message);
    const whatsappUrl = targetPhone ? `https://wa.me/${targetPhone}?text=${encodedText}` : null;

    // ─── SERVER-SIDE GATEWAY WHATSAPP (Jika Dikonfigurasi Env) ───────────────
    let gatewayDispatched = false;
    if (process.env.WA_GATEWAY_URL && targetPhone && !body.testOnly) {
      try {
        const gwRes = await fetch(process.env.WA_GATEWAY_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.WA_GATEWAY_TOKEN ? { Authorization: `Bearer ${process.env.WA_GATEWAY_TOKEN}` } : {}),
          },
          body: JSON.stringify({
            phone: targetPhone,
            message: message,
          }),
        });
        gatewayDispatched = gwRes.ok;
      } catch (gwErr) {
        console.warn('[WA Gateway Error]', gwErr);
      }
    }

    await logActivity({
      shopId,
      operator: isCron ? 'SYSTEM_CRON_0600' : (profile?.username || user?.email || 'USER'),
      action: 'TRIGGER_MORNING_BRIEFING',
      details: `Briefing Pagi 06:00 dikirim ke ${targetPhone || 'Tanpa No WA'} (${urgentItems.length} SKU menipis, Tunai: ${formatRupiah(totalEstimatedMarketCash)})`,
    });

    return NextResponse.json({
      success: true,
      message,
      whatsapp_url: whatsappUrl,
      recipient_phone: targetPhone,
      gateway_dispatched: gatewayDispatched,
      metrics: {
        omzet_kemarin: omzetKemarin,
        laba_kemarin: labaKemarin,
        total_transaksi: totalTransaksi,
        shift_status: shiftStatusText,
        skus_needed: urgentItems.length,
        estimated_cash_needed: totalEstimatedMarketCash,
      },
    });
  } catch (error) {
    console.error('[POST /reports/morning-briefing]', error);
    return NextResponse.json({ success: false, error: 'Gagal menyusun Briefing Pagi WhatsApp.' }, { status: 500 });
  }
}
