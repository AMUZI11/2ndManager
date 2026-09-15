import { withAuthSupabase, errorResponse, successResponse, resolveOrganization } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limiter';
import { toDbTierKey } from '@/config/tierMapping';

export const POST = withAuthSupabase(async (request, context, { user, profile, supabase }) => {
  const rateLimit = checkRateLimit(request, { limit: 5, windowMs: 60 * 1000, identifier: 'billing-claim' });
  if (rateLimit.isRateLimited) {
    return createRateLimitResponse(rateLimit);
  }

  try {
    const formData = await request.formData();
    const rawTargetTier = (formData.get('targetTier') || formData.get('plan') || 'MANAJER').toString().toUpperCase();
    const targetTier = (rawTargetTier === 'ADDON' || rawTargetTier === 'ADD-ON') ? 'ADDON' : toDbTierKey(rawTargetTier);
    const durationMonths = parseInt(formData.get('durationMonths')) || 1;
    const basePrice = parseFloat(formData.get('basePrice')) || 0;
    const finalPrice = parseFloat(formData.get('finalPrice')) || 0;
    const promoCodeId = formData.get('promoCodeId') || null;
    const senderBank = formData.get('senderBank') || null;
    const senderAccountName = formData.get('senderAccountName') || null;
    const explicitOrgId = formData.get('orgId') || null;
    const file = formData.get('file');

    const addonBranches = parseInt(formData.get('addonBranches') || formData.get('additionalBranches') || '0', 10) || 0;
    const addonCashiers = parseInt(formData.get('addonCashiers') || formData.get('additionalCashiers') || '0', 10) || 0;
    const addonTotal = parseFloat(formData.get('addonTotal') || formData.get('addonTotalAmount') || '0') || 0;

    if (!file || typeof file === 'string') {
      return errorResponse('Berkas gambar bukti transfer wajib diunggah.', 'FILE_REQUIRED', 422);
    }

    // 1. Selesaikan organisasi juragan
    let org = null;
    if (explicitOrgId) {
      const { data: explicitOrg } = await supabaseAdmin
        .from('organizations')
        .select('id, name, owner_id')
        .eq('id', explicitOrgId)
        .maybeSingle();
      org = explicitOrg;
    }
    if (!org) {
      org = await resolveOrganization(supabase, user, profile);
    }

    // Fallback jika belum memiliki baris organisasi
    if (!org?.id) {
      const orgName = `Usaha ${profile?.username || 'Juragan'}`;
      const { data: newOrg, error: orgErr } = await supabaseAdmin
        .from('organizations')
        .insert({
          owner_id: user.id,
          name: orgName,
          tier_id: 'MAGANG',
        })
        .select()
        .single();

      if (orgErr || !newOrg) {
        return errorResponse('Gagal menyiapkan identitas organisasi.', 'ORG_INIT_ERROR', 500);
      }
      org = newOrg;
    }

    // 2. Unggah file ke Supabase Storage (bucket: payment_proofs / fallback payment-proofs)
    const originalName = file.name || 'proof.jpg';
    const ext = originalName.split('.').pop()?.toLowerCase() || 'jpg';
    const cleanFileName = `proof_${org.id}_${Date.now()}.${ext}`;
    const storagePath = `proofs/${org.id}/${cleanFileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    let bucketName = 'payment_proofs';
    let uploadRes = await supabaseAdmin.storage
      .from(bucketName)
      .upload(storagePath, fileBuffer, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
      });

    // Fallback ke payment-proofs jika bucket payment_proofs bermasalah
    if (uploadRes.error) {
      console.warn(`[Bucket ${bucketName} upload warning]`, uploadRes.error.message);
      bucketName = 'payment-proofs';
      uploadRes = await supabaseAdmin.storage
        .from(bucketName)
        .upload(storagePath, fileBuffer, {
          contentType: file.type || 'image/jpeg',
          upsert: true,
        });
    }

    if (uploadRes.error) {
      console.error('[Storage Upload Error]', uploadRes.error);
      return errorResponse(`Gagal mengunggah gambar bukti: ${uploadRes.error.message}`, 'STORAGE_ERROR', 500);
    }

    const proofImageUrl = `${bucketName}/${storagePath}`;

    // 3. Panggil Stored Procedure submit_optimistic_payment_claim dengan Add-on Support
    const { data: rpcResult, error: rpcErr } = await supabaseAdmin.rpc('submit_optimistic_payment_claim', {
      p_org_id: org.id,
      p_user_id: user.id,
      p_target_tier: targetTier,
      p_duration_months: durationMonths,
      p_base_price: basePrice,
      p_final_price: finalPrice,
      p_promo_code_id: promoCodeId || null,
      p_proof_url: proofImageUrl,
      p_bank: senderBank ? String(senderBank).trim() : null,
      p_acc_name: senderAccountName ? String(senderAccountName).trim() : null,
      p_addon_branches: addonBranches,
      p_addon_cashiers: addonCashiers,
      p_addon_total: addonTotal,
    });

    if (rpcErr) {
      console.error('[RPC submit_optimistic_payment_claim Error]', rpcErr);
      return errorResponse(rpcErr.message || 'Gagal memproses klaim pembayaran.', 'RPC_ERROR', 500);
    }

    // 4. Realtime Broadcast notifikasi ke Admin Platform Deck
    try {
      const channel = supabaseAdmin.channel('platform_events');
      await channel.send({
        type: 'broadcast',
        event: 'PAYMENT_PROOF_SUBMITTED',
        payload: {
          event: 'PAYMENT_PROOF_SUBMITTED',
          claim_id: rpcResult?.claim_id,
          org_id: org.id,
          org_name: org.name,
          target_tier: targetTier,
          final_price: finalPrice,
          addon_branches: addonBranches,
          addon_cashiers: addonCashiers,
          addon_total: addonTotal,
          status: rpcResult?.status,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (e) {}

    return successResponse({
      ...rpcResult,
      organization_name: org.name,
      proof_image_url: proofImageUrl,
    }, 201);
  } catch (error) {
    console.error('[POST /api/v1/billing/claim]', error);
    return errorResponse('Gagal mengajukan klaim pembayaran.', 'SERVER_ERROR', 500);
  }
});
