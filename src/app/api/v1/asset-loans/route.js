// GET  /api/v1/asset-loans — Riwayat pinjaman aset dan rekap saldo aktif
// POST /api/v1/asset-loans — Catat mutasi pinjam (LOAN) atau kembali (RETURN) tabung/galon

import { withAuthSupabase, errorResponse, successResponse, checkSubscriptionActive } from '@/lib/auth-helpers';
import { getTierConfig } from '@/config/tiers';
import { logActivity } from '@/lib/audit';

export const GET = withAuthSupabase(async (request, context, { user, profile, supabase }) => {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');
    const isSummary = searchParams.get('summary') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

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

    if (isSummary) {
      // Hitung agregasi seluruh tabung/galon yang sedang dipinjam di toko ini
      const { data: customers, error: custErr } = await supabase
        .from('customers')
        .select('id, nama, phone, loaned_assets')
        .eq('shop_id', shopId)
        .eq('is_deleted', false);

      if (custErr) throw custErr;

      const assetSummary = {};
      let totalActiveLoans = 0;
      const customersWithLoans = [];

      (customers || []).forEach(c => {
        const assets = c.loaned_assets || {};
        let hasActive = false;
        Object.entries(assets).forEach(([type, count]) => {
          const qty = parseInt(count, 10) || 0;
          if (qty > 0) {
            assetSummary[type] = (assetSummary[type] || 0) + qty;
            totalActiveLoans += qty;
            hasActive = true;
          }
        });
        if (hasActive) {
          customersWithLoans.push({
            id: c.id,
            nama: c.nama,
            phone: c.phone,
            loaned_assets: c.loaned_assets,
          });
        }
      });

      return successResponse({
        asset_summary: assetSummary,
        total_active_loans: totalActiveLoans,
        customers_with_loans: customersWithLoans,
      });
    }

    // List riwayat mutasi pinjaman
    let query = supabase
      .from('customer_asset_loans')
      .select('*, customers(id, nama, phone)')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data: loans, error } = await query;
    if (error) throw error;

    return successResponse(loans || []);
  } catch (error) {
    console.error('[GET /asset-loans]', error);
    return errorResponse('Gagal memuat data pinjaman aset.', 'SERVER_ERROR', 500);
  }
});

export const POST = withAuthSupabase(async (request, context, { user, profile, supabase }) => {
  try {
    const body = await request.json();
    const { 
      customer_id, 
      asset_type, 
      mutation_type, 
      quantity, 
      transaction_id, 
      product_id,
      deposit_amount_per_unit = 0,
      is_deposit_waived = false,
      notes 
    } = body;

    if (!customer_id) return errorResponse('ID pelanggan wajib diisi.', 'VALIDATION_ERROR', 422);
    if (!asset_type?.trim()) return errorResponse('Tipe aset (Gas/Galon) wajib diisi.', 'VALIDATION_ERROR', 422);
    
    const typeUpper = mutation_type?.toUpperCase();
    if (typeUpper !== 'LOAN' && typeUpper !== 'RETURN') {
      return errorResponse('Jenis mutasi harus berupa LOAN (Pinjam) atau RETURN (Kembali).', 'VALIDATION_ERROR', 422);
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return errorResponse('Jumlah unit harus berupa angka bulat lebih dari 0.', 'VALIDATION_ERROR', 422);
    }

    const depositPerUnit = Math.max(0, Number(deposit_amount_per_unit) || 0);
    const isWaived = Boolean(is_deposit_waived);
    const totalDeposit = isWaived ? 0 : depositPerUnit * qty;

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

    // Ambil data pelanggan saat ini
    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .select('id, nama, loaned_assets')
      .eq('id', customer_id)
      .eq('shop_id', shopId)
      .single();

    if (custErr || !customer) {
      return errorResponse('Pelanggan tidak ditemukan.', 'NOT_FOUND', 404);
    }

    // Cek tier subscription
    const { plan } = await checkSubscriptionActive(supabase, shopId);
    const tierConfig = getTierConfig(plan);

    // Guardrail Tier: Fitur asset_tracker
    if (!tierConfig.features.asset_tracker) {
      return errorResponse(
        'Paket Kontrak Magang tidak mendukung pelacakan tabung gas & galon pinjaman. Silakan upgrade ke Supervisor Shift.',
        'FEATURE_LOCKED',
        403
      );
    }

    const currentAssets = customer.loaned_assets || {};
    const currentAssetQty = parseInt(currentAssets[asset_type] || 0, 10);

    // VALIDASI ANTI-SALDO MINUS (Patch Kritis #3)
    if (typeUpper === 'RETURN') {
      if (qty > currentAssetQty) {
        return errorResponse(
          `Pengembalian gagal: Pelanggan "${customer.nama}" hanya meminjam ${currentAssetQty} unit ${asset_type}, tidak bisa mengembalikan ${qty} unit.`,
          'INVALID_RETURN_QUANTITY',
          422
        );
      }
    }

    // Micro-Quota Check untuk LOAN: SUPERVISOR max 20 tabung aktif kumulatif
    if (typeUpper === 'LOAN' && tierConfig.maxActiveLoans !== Infinity) {
      // Hitung total tabung aktif di seluruh toko saat ini
      const { data: allCusts } = await supabase
        .from('customers')
        .select('loaned_assets')
        .eq('shop_id', shopId)
        .eq('is_deleted', false);

      let totalActive = 0;
      (allCusts || []).forEach(c => {
        Object.values(c.loaned_assets || {}).forEach(v => {
          totalActive += Math.max(0, parseInt(v, 10) || 0);
        });
      });

      if (totalActive + qty > tierConfig.maxActiveLoans) {
        return Response.json({
          error: `Batas kuota tabung/galon pinjaman aktif tercapai (${totalActive}/${tierConfig.maxActiveLoans} unit). Tingkatkan ke paket Manajer Operasional untuk pinjaman tanpa batas.`,
          code: 'UPGRADE_REQUIRED',
          limit: tierConfig.maxActiveLoans,
          current: totalActive,
          upgrade_required: true,
        }, { status: 402 });
      }
    }

    const delta = typeUpper === 'LOAN' ? qty : -qty;

    // Mutasi atomik JSONB via RPC
    const { data: updatedAssets, error: rpcErr } = await supabase.rpc('mutate_customer_loaned_assets', {
      p_customer_id: customer_id,
      p_asset_type: asset_type,
      p_delta: delta,
    });

    if (rpcErr) {
      console.error('[POST /asset-loans] RPC mutate_customer_loaned_assets error:', rpcErr);
      return errorResponse(`Gagal memperbarui saldo aset: ${rpcErr.message}`, 'SERVER_ERROR', 500);
    }

    // Catat ke immutable ledger customer_asset_loans
    const { data: loanRecord, error: loanErr } = await supabase
      .from('customer_asset_loans')
      .insert({
        shop_id: shopId,
        customer_id: customer_id,
        transaction_id: transaction_id || null,
        product_id: product_id || null,
        asset_type: asset_type,
        mutation_type: typeUpper,
        quantity: qty,
        deposit_amount_per_unit: depositPerUnit,
        is_deposit_waived: isWaived,
        status: typeUpper === 'LOAN' ? 'BORROWED' : 'RETURNED',
        notes: notes?.trim() || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (loanErr) {
      console.error('[POST /asset-loans] Insert ledger error:', loanErr);
      throw loanErr;
    }

    // Catat ke pos penampungan customer_asset_deposits jika ada dana jaminan
    let depositRecord = null;
    if (typeUpper === 'LOAN' && !isWaived && totalDeposit > 0) {
      const { data: depData, error: depErr } = await supabase
        .from('customer_asset_deposits')
        .insert({
          shop_id: shopId,
          customer_id: customer_id,
          loan_id: loanRecord.id,
          transaction_id: transaction_id || null,
          deposit_amount: totalDeposit,
          status: 'HELD',
          notes: `Titipan jaminan ${qty} unit ${asset_type} @ Rp ${depositPerUnit.toLocaleString('id-ID')}`,
        })
        .select()
        .single();

      if (depErr) console.warn('[POST /asset-loans] customer_asset_deposits insert warning:', depErr);
      else depositRecord = depData;
    }

    await logActivity(
      supabase,
      shopId,
      profile.username || user.email,
      typeUpper === 'LOAN' ? 'Pinjam Aset Fisik' : 'Kembali Aset Fisik',
      `${typeUpper === 'LOAN' ? 'Meminjamkan' : 'Menerima kembali'} ${qty} ${asset_type} untuk pelanggan "${customer.nama}"${totalDeposit > 0 ? ` (Jaminan Rp ${totalDeposit.toLocaleString('id-ID')})` : ''}`
    );

    return successResponse({
      loan: loanRecord,
      deposit: depositRecord,
      updated_loaned_assets: updatedAssets,
      customer_id: customer_id,
    }, 201);
  } catch (error) {
    console.error('[POST /asset-loans]', error);
    return errorResponse(`Gagal mencatat mutasi aset: ${error.message}`, 'SERVER_ERROR', 500);
  }
});
