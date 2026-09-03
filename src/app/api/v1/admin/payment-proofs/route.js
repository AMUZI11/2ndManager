// GET /api/v1/admin/payment-proofs — (Superadmin only) Ambil seluruh bukti pembayaran
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { errorResponse, successResponse } from '@/lib/auth-helpers';

export async function GET(request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return errorResponse('Sesi tidak valid.', 'UNAUTHORIZED', 401);
    }

    // Cek apakah email user = ADMIN_EMAIL
    if (user.email !== process.env.ADMIN_EMAIL) {
      return errorResponse('Akses ditolak. Fitur ini hanya untuk Superadmin.', 'FORBIDDEN', 403);
    }

    // Gunakan supabaseAdmin (Service Role) untuk mengambil seluruh payment proofs
    const { data: proofs, error } = await supabaseAdmin
      .from('payment_proofs')
      .select('*, shops(name, owner_id)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Generate signed URLs untuk gambar di Supabase Storage
    const proofsWithUrls = await Promise.all(
      (proofs || []).map(async (p) => {
        let signedUrl = null;
        if (p.storage_path) {
          const { data: urlData } = await supabaseAdmin.storage
            .from('payment-proofs')
            .createSignedUrl(p.storage_path, 3600); // 1 jam expiry
          signedUrl = urlData?.signedUrl || null;
        }
        return { ...p, signed_url: signedUrl };
      })
    );

    return successResponse(proofsWithUrls);
  } catch (error) {
    console.error('[GET /admin/payment-proofs]', error);
    return errorResponse('Gagal mengambil daftar bukti pembayaran.', 'SERVER_ERROR', 500);
  }
}
