// POST /api/v1/shifts/close — Tutup Shift Kasir (True Blind Closing & Rekonsiliasi Kas Komprehensif)

import { withAuthSupabase, errorResponse, successResponse } from '@/lib/auth-helpers';
import { getTierConfig } from '@/config/tiers';
import { logActivity } from '@/lib/audit';

function calculateDenominationsTotal(denominations = {}) {
  const d100k = (parseInt(denominations['100k'], 10) || 0) * 100000;
  const d50k = (parseInt(denominations['50k'], 10) || 0) * 50000;
  const d20k = (parseInt(denominations['20k'], 10) || 0) * 20000;
  const d10k = (parseInt(denominations['10k'], 10) || 0) * 10000;
  const d5k = (parseInt(denominations['5k'], 10) || 0) * 5000;
  const d2k = (parseInt(denominations['2k'], 10) || 0) * 2000;
  const d1k = (parseInt(denominations['1k'], 10) || 0) * 1000;
  const coins = parseInt(denominations['coins'], 10) || 0;

  return d100k + d50k + d20k + d10k + d5k + d2k + d1k + coins;
}

function generateShiftRecapWhatsAppMessage({
  shopName,
  shiftNumber,
  cashierName,
  startTime,
  endTime,
  startingCash,
  cashSalesTotal,
  debtPaymentsTotal,
  savingsDepositsTotal,
  consignmentPayoutsTotal,
  drawerInTotal,
  drawerOutTotal,
  expectedCash,
  actualCash,
  difference,
  handoverToName,
  notes,
}) {
  const fmt = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
  const diffLabel =
    difference === 0
      ? '✅ PAS (Sempurna)'
      : difference > 0
      ? `🟢 SURPLUS (+${fmt(difference)})`
      : `🔴 DEFISIT / KURANG (${fmt(difference)})`;

  return `📊 *REKAP TUTUP SHIFT KASIR*
🏬 *${shopName || 'KlolaWarung'}*
🔢 *Shift #${shiftNumber}*
👤 *Kasir:* ${cashierName || '-'}
⏰ *Periode:* ${new Date(startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - ${new Date(endTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB

━━━━━━━━━━━━━━━━━━━━
💵 *Modal Awal Laci:* ${fmt(startingCash)}
🛒 *Penjualan Tunai POS:* +${fmt(cashSalesTotal)}
📝 *Pelunasan Kasbon Tunai:* +${fmt(debtPaymentsTotal)}
🪙 *Deposit Celengan:* +${fmt(savingsDepositsTotal)}
📥 *Kas Masuk Laci Tambahan:* +${fmt(drawerInTotal)}
📤 *Pengeluaran Laci:* -${fmt(drawerOutTotal)}
🤝 *Bayar Konsinyasi Tunai:* -${fmt(consignmentPayoutsTotal)}
━━━━━━━━━━━━━━━━━━━━
🎯 *Total Kas Harusnya (Expected):* ${fmt(expectedCash)}
💰 *Uang Fisik Dihitung (Actual):* ${fmt(actualCash)}
⚖️ *Status Selisih:* *${diffLabel}*
${handoverToName ? `🔄 *Diserah-terimakan ke:* ${handoverToName}\n` : ''}${notes ? `💬 *Catatan:* ${notes}\n` : ''}
_Laporan otomatis sistem KlolaWarung OS._`;
}

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
      denominations = {},
      actual_cash,
      handover_to = null,
      notes = '',
    } = body;

    // 1. Dapatkan shift yang akan ditutup
    let shift = null;
    if (shift_id) {
      const { data: s } = await supabase
        .from('cashier_shifts')
        .select('*, cashier:profiles!cashier_id(id, username, role)')
        .eq('id', shift_id)
        .eq('shop_id', shopId)
        .eq('status', 'OPEN')
        .single();
      shift = s;
    } else {
      const { data: s } = await supabase
        .from('cashier_shifts')
        .select('*, cashier:profiles!cashier_id(id, username, role)')
        .eq('shop_id', shopId)
        .eq('status', 'OPEN')
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();
      shift = s;
    }

    if (!shift) {
      return errorResponse('Tidak ada shift kasir aktif yang siap ditutup.', 'NOT_FOUND', 404);
    }

    const { data: shop } = await supabase
      .from('shops')
      .select('id, name, subscription_tier')
      .eq('id', shopId)
      .single();

    const tierConfig = getTierConfig(shop?.subscription_tier || 'MAGANG');

    // 2. Validasi & Hitung Total Uang Fisik dari Pecahan Lembaran & Koin
    const calculatedFromDenominations = calculateDenominationsTotal(denominations);
    const countedActualCash =
      actual_cash !== undefined && actual_cash !== null && !isNaN(Number(actual_cash))
        ? Number(actual_cash)
        : calculatedFromDenominations;

    if (countedActualCash < 0) {
      return errorResponse('Jumlah uang fisik kas laci tidak boleh negatif.', 'INVALID_ACTUAL_CASH', 400);
    }

    const endTime = new Date().toISOString();
    const startTime = shift.start_time;

    // 3. FORMULA KAS LACI RIIL (ARUS KAS KOMPREHENSIF)
    // A. Penjualan POS Tunai (Status Lunas) yang dibuat dalam periode shift
    const { data: posTransactions } = await supabase
      .from('transactions')
      .select('id, omzet_total, status, created_at, tanggal_lunas')
      .eq('shop_id', shopId)
      .gte('created_at', startTime)
      .lte('created_at', endTime);

    const cashSalesTotal = (posTransactions || [])
      .filter((t) => t.status === 'Lunas')
      .reduce((sum, t) => sum + Number(t.omzet_total || 0), 0);

    // B. Pelunasan Kasbon Tunai: Transaksi yang dibuat sebelum shift tapi dilunasi pada shift ini
    const { data: settledDebts } = await supabase
      .from('transactions')
      .select('id, omzet_total, amount_owed, updated_at, tanggal_lunas')
      .eq('shop_id', shopId)
      .eq('status', 'Lunas')
      .lt('created_at', startTime)
      .gte('updated_at', startTime)
      .lte('updated_at', endTime);

    const cashDebtPaymentsTotal = (settledDebts || []).reduce(
      (sum, t) => sum + Number(t.amount_owed || t.omzet_total || 0),
      0
    );

    // C. Deposit Celengan Tunai (Smart Change / Topup Saldo Tunai)
    const { data: savingsMutations } = await supabase
      .from('customer_balance_mutations')
      .select('amount, mutation_type, created_at')
      .eq('shop_id', shopId)
      .gte('created_at', startTime)
      .lte('created_at', endTime);

    const cashSavingsDepositsTotal = (savingsMutations || [])
      .filter((m) => ['SMART_CHANGE_DEPOSIT', 'TOPUP', 'CASH_DEPOSIT'].includes(m.mutation_type))
      .reduce((sum, m) => sum + Math.max(0, Number(m.amount || 0)), 0);

    // D. Mutasi Kas Masuk / Keluar Operasional Laci (cash_drawer_movements)
    const { data: drawerMovements } = await supabase
      .from('cash_drawer_movements')
      .select('movement_type, category, amount')
      .eq('shop_id', shopId)
      .or(`shift_id.eq.${shift.id},and(created_at.gte.${startTime},created_at.lte.${endTime})`);

    let cashDrawerInTotal = 0;
    let cashDrawerOutTotal = 0;
    let cashConsignmentPayoutsTotal = 0;

    (drawerMovements || []).forEach((m) => {
      const amt = Number(m.amount || 0);
      if (m.category === 'CONSIGNMENT_PAYOUT') {
        cashConsignmentPayoutsTotal += amt;
      } else if (m.movement_type === 'CASH_IN') {
        cashDrawerInTotal += amt;
      } else if (m.movement_type === 'CASH_OUT') {
        cashDrawerOutTotal += amt;
      }
    });

    // Cek juga jika ada settlement konsinyasi yang belum masuk drawer_movements
    const { data: settledBatches } = await supabase
      .from('consignment_batches')
      .select('total_payout, settled_at')
      .eq('shop_id', shopId)
      .eq('status', 'SETTLED')
      .gte('settled_at', startTime)
      .lte('settled_at', endTime);

    const consignmentBatchTotal = (settledBatches || []).reduce(
      (sum, b) => sum + Number(b.total_payout || 0),
      0
    );
    // Hindari double-count jika sudah dicatat di cash_drawer_movements
    if (cashConsignmentPayoutsTotal === 0 && consignmentBatchTotal > 0) {
      cashConsignmentPayoutsTotal = consignmentBatchTotal;
    }

    // 4. Hitung Expected Cash & Difference
    const startingCash = Number(shift.starting_cash || 0);
    const expectedCash =
      startingCash +
      cashSalesTotal +
      cashDebtPaymentsTotal +
      cashSavingsDepositsTotal +
      cashDrawerInTotal -
      cashDrawerOutTotal -
      cashConsignmentPayoutsTotal;

    const difference = countedActualCash - expectedCash;

    // 5. Verifikasi nama kasir penerima (handover_to) jika ada
    let handoverToName = null;
    if (handover_to) {
      const { data: nextCashier } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('id', handover_to)
        .maybeSingle();
      handoverToName = nextCashier?.username || null;
    }

    // 6. Update Shift menjadi CLOSED dengan hasil audit rekonsiliasi
    const { data: closedShift, error: closeErr } = await supabase
      .from('cashier_shifts')
      .update({
        end_time: endTime,
        cash_sales_total: cashSalesTotal,
        cash_debt_payments_total: cashDebtPaymentsTotal,
        cash_savings_deposits_total: cashSavingsDepositsTotal,
        cash_consignment_payouts_total: cashConsignmentPayoutsTotal,
        cash_drawer_in_total: cashDrawerInTotal,
        cash_drawer_out_total: cashDrawerOutTotal,
        expected_cash: expectedCash,
        actual_cash: countedActualCash,
        difference: difference,
        denominations: denominations,
        handover_to: handover_to,
        notes: notes?.trim() || shift.notes,
        status: 'CLOSED',
        updated_at: endTime,
      })
      .eq('id', shift.id)
      .select('*, cashier:profiles!cashier_id(id, username, role)')
      .single();

    if (closeErr) throw closeErr;

    // 7. Generate Rekap WhatsApp jika tier mengizinkan
    let waRecapText = null;
    if (tierConfig.features?.wa_shift_recap) {
      waRecapText = generateShiftRecapWhatsAppMessage({
        shopName: shop?.name,
        shiftNumber: shift.shift_number,
        cashierName: shift.cashier?.username || profile.username || 'Kasir',
        startTime,
        endTime,
        startingCash,
        cashSalesTotal,
        debtPaymentsTotal,
        savingsDepositsTotal,
        consignmentPayoutsTotal,
        drawerInTotal,
        drawerOutTotal,
        expectedCash,
        actualCash: countedActualCash,
        difference,
        handoverToName,
        notes: notes?.trim() || null,
      });
    }

    await logActivity({
      user_id: user.id,
      action: 'CLOSE_CASHIER_SHIFT',
      entity: 'cashier_shifts',
      entity_id: shift.id,
      metadata: {
        shift_number: shift.shift_number,
        expected_cash: expectedCash,
        actual_cash: countedActualCash,
        difference: difference,
        status_selisih: difference === 0 ? 'PAS' : difference > 0 ? 'SURPLUS' : 'DEFISIT',
      },
    });

    return successResponse({
      shift: closedShift,
      reconciliation: {
        starting_cash: startingCash,
        cash_sales_total: cashSalesTotal,
        cash_debt_payments_total: cashDebtPaymentsTotal,
        cash_savings_deposits_total: cashSavingsDepositsTotal,
        cash_drawer_in_total: cashDrawerInTotal,
        cash_drawer_out_total: cashDrawerOutTotal,
        cash_consignment_payouts_total: cashConsignmentPayoutsTotal,
        expected_cash: expectedCash,
        actual_cash: countedActualCash,
        difference: difference,
        reconciliation_status: difference === 0 ? 'PAS' : difference > 0 ? 'SURPLUS' : 'DEFISIT',
      },
      wa_recap_text: waRecapText,
    });
  } catch (err) {
    console.error('Error POST /api/v1/shifts/close:', err);
    return errorResponse('Gagal menutup shift kasir: ' + err.message, 'INTERNAL_ERROR', 500);
  }
});
