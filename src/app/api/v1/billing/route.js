import { withBossOnly, errorResponse, successResponse } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const GET = withBossOnly(async (request, context, { user, profile, supabase }) => {
  try {
    const { data: userShop } = await supabase
      .from('user_shops')
      .select('shop_id, shops(id, name, subscription_tier, operational_status, cashier_limit)')
      .eq('user_id', user.id)
      .single();

    const shopId = userShop?.shop_id;
    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);

    const shop = userShop?.shops;
    const activeTier = shop?.subscription_tier && shop.subscription_tier !== 'TRIAL' ? shop.subscription_tier : 'MAGANG';

    // Ambil info subscription
    let { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('shop_id', shopId)
      .maybeSingle();

    if (!subscription) {
      subscription = {
        shop_id: shopId,
        plan: activeTier,
        max_cashiers: shop?.cashier_limit || 1,
        max_branches: 1,
        valid_until: null,
      };
    } else if (activeTier !== 'MAGANG' && (!subscription.plan || subscription.plan === 'FREE')) {
      subscription.plan = activeTier;
    }

    // Ambil riwayat pengajuan bukti pembayaran
    const { data: paymentProofs } = await supabase
      .from('payment_proofs')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    const activePlan = subscription?.plan || activeTier || 'MAGANG';

    return successResponse({
      shop_id: shopId,
      shop_name: shop?.name || 'Toko Saya',
      plan: activePlan,
      tier: activeTier,
      operational_status: shop?.operational_status || 'ACTIVE',
      cashier_limit: shop?.cashier_limit || 1,
      subscription,
      payment_proofs: paymentProofs || [],
    });
  } catch (error) {
    console.error('[GET /billing/status]', error);
    return errorResponse('Gagal mengambil data billing.', 'SERVER_ERROR', 500);
  }
});

export const POST = withBossOnly(async (request, context, { user, profile, supabase }) => {
  try {
    const formData = await request.formData();
    const planRequested = formData.get('plan_requested');
    const file = formData.get('file');

    if (!planRequested || !file) {
      return errorResponse('Pilihan paket dan file bukti pembayaran wajib diisi.', 'VALIDATION_ERROR', 422);
    }

    const { data: userShop } = await supabase
      .from('user_shops')
      .select('shop_id')
      .eq('user_id', user.id)
      .single();

    const shopId = userShop?.shop_id;
    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);

    // 1. Upload file ke Supabase Storage (bucket: payment-proofs) via supabaseAdmin
    const fileExt = file.name.split('.').pop() || 'png';
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let { data: storageData, error: storageErr } = await supabaseAdmin.storage
      .from('payment-proofs')
      .upload(filePath, buffer, {
        contentType: file.type || 'image/png',
        upsert: true,
      });

    // Auto-recovery jika bucket belum ada
    if (storageErr && storageErr.message?.toLowerCase().includes('bucket not found')) {
      await supabaseAdmin.storage.createBucket('payment-proofs', {
        public: true,
        fileSizeLimit: 10485760,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'],
      });

      const retry = await supabaseAdmin.storage
        .from('payment-proofs')
        .upload(filePath, buffer, {
          contentType: file.type || 'image/png',
          upsert: true,
        });

      storageData = retry.data;
      storageErr = retry.error;
    }

    if (storageErr) {
      console.error('[Storage Upload Error]', storageErr);
      return errorResponse(`Gagal mengunggah gambar ke storage: ${storageErr.message}`, 'STORAGE_ERROR', 500);
    }

    const { data: shopData } = await supabaseAdmin
      .from('shops')
      .select('name')
      .eq('id', shopId)
      .single();
    const shopName = shopData?.name || 'Toko Klien';

    // 2. Insert row ke tabel payment_proofs via supabaseAdmin
    const { data: proof, error: dbErr } = await supabaseAdmin
      .from('payment_proofs')
      .insert({
        shop_id: shopId,
        submitted_by: user.id,
        plan_requested: planRequested.toUpperCase(),
        storage_path: storageData.path,
        status: 'PENDING',
      })
      .select()
      .single();

    if (dbErr) throw dbErr;

    // 3. Realtime Broadcast ke Admin Platform Deck (platform_events)
    try {
      const channel = supabaseAdmin.channel('platform_events');
      await channel.send({
        type: 'broadcast',
        event: 'PAYMENT_PROOF_SUBMITTED',
        payload: {
          event: 'PAYMENT_PROOF_SUBMITTED',
          proof_id: proof.id,
          shop_id: shopId,
          shop_name: shopName,
          user_email: user.email,
          plan_requested: planRequested.toUpperCase(),
          timestamp: new Date().toISOString(),
        },
      });
    } catch (broadcastErr) {
      console.error('[Broadcast Payment Error]', broadcastErr);
    }

    return successResponse(proof, 201);
  } catch (error) {
    console.error('[POST /billing/upload]', error);
    return errorResponse('Gagal mengirimkan bukti pembayaran.', 'SERVER_ERROR', 500);
  }
});
