// PUT    /api/v1/suppliers/[id]  — Update data agen / supplier
// DELETE /api/v1/suppliers/[id]  — Nonaktifkan supplier (soft delete)
import { withAuthSupabase, errorResponse, successResponse } from '@/lib/auth-helpers';
import { normalizeIndonesianPhone } from '@/lib/phone';
import { logActivity } from '@/lib/audit';

export const PUT = withAuthSupabase(async (request, { params }, { user, profile, shopId, supabase }) => {
  try {
    const { id } = await params;
    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NO_SHOP', 400);

    const body = await request.json();
    const { name, phone, contact_person, address, lead_time_days, notes, is_active } = body;

    const updatePayload = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) {
      if (!name.trim()) return errorResponse('Nama supplier tidak boleh kosong.', 'VALIDATION_ERROR', 422);
      updatePayload.name = name.trim();
    }
    if (phone !== undefined) {
      updatePayload.phone = normalizeIndonesianPhone(phone) || null;
    }
    if (contact_person !== undefined) {
      updatePayload.contact_person = contact_person?.trim() || null;
    }
    if (address !== undefined) {
      updatePayload.address = address?.trim() || null;
    }
    if (lead_time_days !== undefined) {
      updatePayload.lead_time_days = Math.max(1, parseInt(lead_time_days, 10) || 1);
    }
    if (notes !== undefined) {
      updatePayload.notes = notes?.trim() || null;
    }
    if (is_active !== undefined) {
      updatePayload.is_active = Boolean(is_active);
    }

    const { data: updated, error } = await supabase
      .from('suppliers')
      .update(updatePayload)
      .eq('id', id)
      .eq('shop_id', shopId)
      .select()
      .single();

    if (error) throw error;
    if (!updated) return errorResponse('Supplier tidak ditemukan.', 'NOT_FOUND', 404);

    await logActivity({
      shopId,
      operator: profile.username || user.email,
      action: 'UPDATE_SUPPLIER',
      details: `Memperbarui supplier: ${updated.name}`,
    });

    return successResponse(updated);
  } catch (error) {
    console.error('[PUT /suppliers/[id]]', error);
    return errorResponse('Gagal memperbarui data supplier.', 'SERVER_ERROR', 500);
  }
});

export const DELETE = withAuthSupabase(async (request, { params }, { user, profile, shopId, supabase }) => {
  try {
    const { id } = await params;
    if (!shopId) return errorResponse('Toko tidak ditemukan.', 'NO_SHOP', 400);

    const { data: supplier, error: fetchErr } = await supabase
      .from('suppliers')
      .select('name')
      .eq('id', id)
      .eq('shop_id', shopId)
      .single();

    if (fetchErr || !supplier) return errorResponse('Supplier tidak ditemukan.', 'NOT_FOUND', 404);

    const { error } = await supabase
      .from('suppliers')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('shop_id', shopId);

    if (error) throw error;

    await logActivity({
      shopId,
      operator: profile.username || user.email,
      action: 'DELETE_SUPPLIER',
      details: `Menonaktifkan supplier: ${supplier.name}`,
    });

    return successResponse({ message: 'Supplier berhasil dinonaktifkan.' });
  } catch (error) {
    console.error('[DELETE /suppliers/[id]]', error);
    return errorResponse('Gagal menghapus supplier.', 'SERVER_ERROR', 500);
  }
});
