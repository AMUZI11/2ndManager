import { withBossOnly, errorResponse, successResponse, resolveOrganization } from '@/lib/auth-helpers';

export const POST = withBossOnly(async (request, context, { user, profile, supabase }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const branchName = body.branch_name || body.name;
    const address = body.address || null;
    const phone = body.phone || body.phone_number || null;

    if (!branchName || branchName.trim().length === 0) {
      return errorResponse('Nama cabang wajib diisi.', 'VALIDATION_ERROR', 422);
    }

    // Resolusi organisasi aktif milik owner
    let org = await resolveOrganization(supabase, user, profile);

    if (!org?.id) {
      return errorResponse('Organisasi bisnis tidak ditemukan. Pastikan Toko Utama telah terdaftar.', 'ORGANIZATION_NOT_FOUND', 404);
    }

    // Panggil RPC create_child_branch
    const { data: rpcResult, error: rpcError } = await supabase.rpc('create_child_branch', {
      p_org_id: org.id,
      p_branch_name: branchName.trim(),
      p_address: address ? address.trim() : null,
      p_phone: phone ? phone.trim() : null,
    });

    if (rpcError) {
      console.error('[POST /api/v1/branches/create] RPC Error:', rpcError);
      return errorResponse(rpcError.message || 'Gagal menambahkan cabang anak.', 'BRANCH_CREATION_ERROR', 400);
    }

    return successResponse(rpcResult, 201);
  } catch (error) {
    console.error('[POST /api/v1/branches/create]', error);
    return errorResponse(`Gagal memproses pembuatan cabang: ${error.message}`, 'SERVER_ERROR', 500);
  }
});
