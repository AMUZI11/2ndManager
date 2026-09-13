import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { errorResponse, successResponse } from '@/lib/auth-helpers';

async function checkAdminAuth(request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) {
    return { error: errorResponse('Sesi tidak valid.', 'UNAUTHORIZED', 401) };
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = 
    user.email === process.env.ADMIN_EMAIL || 
    profile?.role === 'SUPERADMIN' || 
    profile?.role === 'BOSS';

  if (!isAdmin) {
    return { error: errorResponse('Akses ditolak. Fitur ini khusus Administrator Platform.', 'FORBIDDEN', 403) };
  }

  return { user, profile };
}

export async function GET(request) {
  try {
    const auth = await checkAdminAuth(request);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const searchQuery = searchParams.get('search');

    let query = supabaseAdmin
      .from('payment_claims')
      .select(`
        *,
        organizations:organization_id (id, name, tier_id, has_fraud_history, require_manual_approval),
        promo_codes:promo_code_id (id, code, discount_type, discount_value)
      `)
      .order('created_at', { ascending: false });

    if (statusFilter && statusFilter !== 'ALL') {
      query = query.eq('status', statusFilter);
    }

    const { data: claims, error } = await query;
    if (error) throw error;

    // Filter pencarian nama organisasi jika query diisi
    let filteredClaims = claims || [];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filteredClaims = filteredClaims.filter(c => 
        c.organizations?.name?.toLowerCase().includes(q) ||
        c.sender_account_name?.toLowerCase().includes(q) ||
        c.sender_bank?.toLowerCase().includes(q) ||
        c.id?.toLowerCase().includes(q)
      );
    }

    // Generate signed URLs untuk gambar bukti di Supabase Storage
    const claimsWithUrls = await Promise.all(
      filteredClaims.map(async (claim) => {
        let signedUrl = null;
        if (claim.proof_image_url) {
          let bucket = 'payment_proofs';
          let path = claim.proof_image_url;

          if (path.startsWith('payment_proofs/')) {
            path = path.replace('payment_proofs/', '');
          } else if (path.startsWith('payment-proofs/')) {
            bucket = 'payment-proofs';
            path = path.replace('payment-proofs/', '');
          }

          const { data: urlData } = await supabaseAdmin.storage
            .from(bucket)
            .createSignedUrl(path, 3600); // 1 jam expiry

          signedUrl = urlData?.signedUrl || null;
        }
        return {
          ...claim,
          signed_proof_url: signedUrl,
        };
      })
    );

    return successResponse(claimsWithUrls);
  } catch (error) {
    console.error('[GET /api/v1/admin/claims]', error);
    return errorResponse('Gagal mengambil daftar klaim pembayaran.', 'SERVER_ERROR', 500);
  }
}

export async function PATCH(request) {
  try {
    const auth = await checkAdminAuth(request);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const { claimId, status } = body;

    if (!claimId || !status) {
      return errorResponse('claimId dan status wajib diisi.', 'VALIDATION_ERROR', 400);
    }

    const validStatuses = ['PROVISIONALLY_APPROVED', 'VERIFIED_SILENT'];
    if (!validStatuses.includes(status)) {
      return errorResponse('Status pembaruan tidak valid.', 'INVALID_STATUS', 400);
    }

    const { data: updated, error } = await supabaseAdmin
      .from('payment_claims')
      .update({ status })
      .eq('id', claimId)
      .select()
      .single();

    if (error) throw error;

    return successResponse({
      claim: updated,
      message: 'Status klaim pembayaran berhasil diperbarui menjadi valid.',
    });
  } catch (error) {
    console.error('[PATCH /api/v1/admin/claims]', error);
    return errorResponse('Gagal memperbarui status klaim.', 'SERVER_ERROR', 500);
  }
}
