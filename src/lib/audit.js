// src/lib/audit.js — Supabase-based audit logger
// Menggantikan Prisma-based logActivity lama

/**
 * Log aktivitas operator ke tabel audit_logs (append-only, immutable)
 * Hanya berhasil jika shop_id sudah ada di context (Supabase RLS akan enforce ini)
 *
 * @param {object} supabase - Supabase server client (dari createServerSupabaseClient)
 * @param {string} shopId   - UUID toko
 * @param {string} operator - Nama/email operator
 * @param {string} action   - Aksi yang dilakukan
 * @param {string|object} details - Detail tambahan
 */
export async function logActivity(supabaseOrObj, shopId, operator, action, details) {
  try {
    if (supabaseOrObj && typeof supabaseOrObj.from === 'function') {
      await supabaseOrObj.from('audit_logs').insert({
        shop_id: shopId,
        operator,
        action,
        details: typeof details === 'object' ? JSON.stringify(details) : String(details),
      });
    } else if (supabaseOrObj && typeof supabaseOrObj === 'object') {
      // Legacy signature: logActivity({ user_id, action, entity, entity_id, metadata })
      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      const obj = supabaseOrObj;
      await supabaseAdmin.from('audit_logs').insert({
        shop_id: obj.shop_id || null,
        operator: obj.operator || obj.user_id || 'system',
        action: obj.action || 'ACTIVITY',
        details: JSON.stringify(obj.metadata || obj.details || obj),
      });
    }
  } catch (err) {
    // Log gagal TIDAK boleh crash aplikasi — hanya console.error
    console.error('[logActivity] Failed to log activity:', err);
  }
}
