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
      actual_cash,
      cash_drop_amount = 0,
      denominations = {},
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
    const countedActualCash = parseInt(actual_cash, 10);
    if (isNaN(countedActualCash) || countedActualCash < 0) {
      return errorResponse('Total kas fisik (actual_cash) wajib diisi dan harus >= 0.', 'INVALID_INPUT', 400);
    }

    const cashDropAmountVal = parseInt(cash_drop_amount || 0, 10);
    if (isNaN(cashDropAmountVal) || cashDropAmountVal < 0) {
      return errorResponse('Nominal setoran ke bos (cash_drop_amount) tidak valid.', 'INVALID_INPUT', 400);
    }

    if (cashDropAmountVal > countedActualCash) {
      return errorResponse('Nominal setoran ke brankas tidak boleh melebihi total uang fisik di laci.', 'INVALID_INPUT', 400);
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

    // 6. Update breakdown kalkulasi di cashier_shifts terlebih dahulu
    await supabase
      .from('cashier_shifts')
      .update({
        cash_sales_total: cashSalesTotal,
        cash_debt_payments_total: cashDebtPaymentsTotal,
        cash_savings_deposits_total: cashSavingsDepositsTotal,
        cash_consignment_payouts_total: cashConsignmentPayoutsTotal,
        cash_drawer_in_total: cashDrawerInTotal,
        cash_drawer_out_total: cashDrawerOutTotal,
        expected_cash: expectedCash,
        handover_to: handover_to,
      })
      .eq('id', shift.id);

    // 7. Eksekusi RPC close_cashier_shift_with_skim untuk rekonsiliasi kas skim & deteksi anomali
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('close_cashier_shift_with_skim', {
      p_shift_id: shift.id,
      p_shop_id: shopId,
      p_actual_cash: countedActualCash,
      p_cash_drop_amount: cashDropAmountVal,
      p_denominations: denominations || {},
      p_notes: notes?.trim() || null,
    });

    if (rpcErr) throw rpcErr;

    // 8. Jika ada uang disetor ke Bos / Brankas (Cash Drop), catat mutasi keluar laci
    if (cashDropAmountVal > 0) {
      await supabase
        .from('cash_drawer_movements')
        .insert({
          shop_id: shopId,
          shift_id: shift.id,
          movement_type: 'CASH_OUT',
          category: 'OWNER_DRAW',
          amount: cashDropAmountVal,
          notes: 'Setoran Kasir ke Bos / Brankas saat Tutup Shift',
          created_by: profile.id,
        });
    }

    // Ambil data shift yang telah ditutup
    const { data: closedShift, error: fetchClosedErr } = await supabase
      .from('cashier_shifts')
      .select('*, cashier:profiles!cashier_id(id, username, role)')
      .eq('id', shift.id)
      .single();

    if (fetchClosedErr) throw fetchClosedErr;

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
        debtPaymentsTotal: cashDebtPaymentsTotal,
        savingsDepositsTotal: cashSavingsDepositsTotal,
        consignmentPayoutsTotal: cashConsignmentPayoutsTotal,
        drawerInTotal: cashDrawerInTotal,
        drawerOutTotal: cashDrawerOutTotal,
        expectedCash,
        actualCash: countedActualCash,
        difference,
        handoverToName,
        notes: notes?.trim() || null,
      });
    }

    await logActivity(
      supabase,
      shopId,
      shift.cashier?.username || profile.username || user.email,
      'Tutup Shift Kasir',
      {
        shift_number: shift.shift_number,
        expected_cash: expectedCash,
        actual_cash: countedActualCash,
        difference: difference,
        status_selisih: difference === 0 ? 'PAS' : difference > 0 ? 'SURPLUS' : 'DEFISIT',
      }
    );

    return successResponse({
      shift: closedShift,
      leftover_cash: rpcRes?.leftover_cash ?? (countedActualCash - cashDropAmountVal),
      cash_drop_amount: cashDropAmountVal,
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
        difference: rpcRes?.difference ?? difference,
        reconciliation_status: rpcRes?.status || (difference === 0 ? 'PAS' : difference > 0 ? 'SURPLUS' : 'DEFISIT'),
      },
      wa_recap_text: waRecapText,
      print_slip: {
        shop_name: shop?.name || 'KlolaWarung',
        shift_number: shift.shift_number,
        cashier_name: shift.cashier?.username || profile.username || 'Kasir',
        start_time: startTime,
        end_time: endTime,
        actual_cash: countedActualCash,
        cash_drop_amount: cashDropAmountVal,
        leftover_cash: rpcRes?.leftover_cash ?? (countedActualCash - cashDropAmountVal),
      },
    });
  } catch (err) {
    console.error('Error POST /api/v1/shifts/close:', err);
    return errorResponse('Gagal menutup shift kasir: ' + err.message, 'INTERNAL_ERROR', 500);
  }
});
