// GET  /api/v1/consignments/vendors  — Daftar vendor konsinyasi
// POST /api/v1/consignments/vendors  — Tambah vendor konsinyasi (dengan tier gate)
import { withAuthSupabase, errorResponse, successResponse } from '@/lib/auth-helpers';
import { getTierConfig } from '@/config/tiers';
import { logActivity } from '@/lib/audit';

export const GET = withAuthSupabase(async (request, { params }, { user, profile, supabase }) => {
  try {
    let shopId = profile.shop_id;
    if (profile.role === 'BOSS') {
      const { data: userShop } = await supabase
        .from('user_shops').select('shop_id').eq('user_id', user.id).single();
      shopId = userShop?.shop_id || shopId;
    }

    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NO_SHOP', 400);

    const { data: vendors, error } = await supabase
      .from('consignment_vendors')
      .select('*, consignment_batches(id, status, total_payout)')
      .eq('shop_id', shopId)
      .eq('is_active', true)
      .order('nama_vendor', { ascending: true });

    if (error) throw error;

    // Hitung ringkasan per vendor
    const enriched = (vendors || []).map(v => {
      const activeBatches = (v.consignment_batches || []).filter(b => b.status === 'ACTIVE');
      const settledBatches = (v.consignment_batches || []).filter(b => b.status === 'SETTLED');
      const totalPayoutSettled = settledBatches.reduce((acc, b) => acc + Number(b.total_payout || 0), 0);
      return {
        ...v,
        active_batch_count: activeBatches.length,
        settled_batch_count: settledBatches.length,
        total_payout_settled: totalPayoutSettled,
      };
    });

    return successResponse(enriched);
  } catch (error) {
    console.error('[GET /consignments/vendors]', error);
    return errorResponse('Gagal memuat vendor konsinyasi.', 'SERVER_ERROR', 500);
  }
});

export const POST = withAuthSupabase(async (request, { params }, { user, profile, supabase }) => {
  try {
    let shopId = profile.shop_id;
    if (profile.role === 'BOSS') {
      const { data: userShop } = await supabase
        .from('user_shops').select('shop_id').eq('user_id', user.id).single();
      shopId = userShop?.shop_id || shopId;
    }

    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NO_SHOP', 400);

    const body = await request.json();
    const { nama_vendor, phone, alamat } = body;

    if (!nama_vendor || !nama_vendor.trim()) {
      return errorResponse('Nama vendor wajib diisi.', 'VALIDATION_ERROR', 422);
    }

    // ─── TIER QUOTA CHECK (Koreksi Kritis: SUPERVISOR max 3 vendors) ───────────
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('tier, status')
      .eq('shop_id', shopId)
      .maybeSingle();

    const currentTier = sub?.tier || 'MAGANG';
    const tierConfig = getTierConfig(currentTier);
    const maxVendors = tierConfig.maxConsignmentVendors !== undefined 
      ? tierConfig.maxConsignmentVendors 
      : 0;

    if (maxVendors <= 0) {
      return errorResponse(
        `Fitur Buku Konsinyasi memerlukan paket Supervisor atau Manajer. Paket Anda saat ini: ${tierConfig.name}.`,
        'TIER_LIMIT_REACHED',
        403
      );
    }

    const { count: currentVendorCount } = await supabase
      .from('consignment_vendors')
      .select('id', { count: 'exact', head: true })
      .eq('shop_id', shopId)
      .eq('is_active', true);

    if (maxVendors !== Infinity && (currentVendorCount || 0) >= maxVendors) {
      return errorResponse(
        `Batas maksimal vendor konsinyasi untuk paket ${tierConfig.name} (${maxVendors} vendor) telah tercapai. Upgrade ke Manajer untuk vendor tanpa batas.`,
        'TIER_LIMIT_REACHED',
        403
      );
    }

    const { data: newVendor, error: insertError } = await supabase
      .from('consignment_vendors')
      .insert({
        shop_id: shopId,
        nama_vendor: nama_vendor.trim(),
        phone: phone?.trim() || null,
        alamat: alamat?.trim() || null,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    await logActivity(
      supabase,
      shopId,
      profile.username || user.email,
      'Tambah Vendor Konsinyasi',
      `Menambahkan vendor titip jual "${newVendor.nama_vendor}"`
    );

    return successResponse(newVendor, 201);
  } catch (error) {
    console.error('[POST /consignments/vendors]', error);
    return errorResponse('Gagal menambahkan vendor konsinyasi.', 'SERVER_ERROR', 500);
  }
});
