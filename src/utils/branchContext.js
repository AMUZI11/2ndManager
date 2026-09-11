/**
 * src/utils/branchContext.js
 * Resolver Konteks Cabang & Organisasi Runtime
 * Menyediakan pemetaan antara cabang aktif, organisasi, dan shop_id eksisting.
 */

import { getAssignedBranchId } from './branchDeviceGuard';

/**
 * Mengambil detail cabang aktif yang sedang terikat pada perangkat kasir.
 * @param {Object} supabase - Supabase client
 * @param {string} [overrideBranchId] - Opsi override ID cabang
 * @returns {Promise<Object|null>} Objek cabang lengkap dengan shop_id
 */
export async function getActiveBranch(supabase, overrideBranchId = null) {
  const branchId = overrideBranchId || getAssignedBranchId();
  if (!branchId || !supabase) return null;

  try {
    const { data, error } = await supabase
      .from('branches')
      .select('id, organization_id, shop_id, branch_name, branch_code, is_main_branch, address, is_active')
      .eq('id', branchId)
      .single();

    if (error) throw error;
    return data || null;
  } catch (err) {
    console.error('[branchContext] Gagal mengambil detail cabang aktif:', err);
    return null;
  }
}

/**
 * Mengambil seluruh cabang aktif di bawah organisasi pemilik toko.
 * @param {Object} supabase - Supabase client
 * @param {string} organizationId - UUID Organisasi
 * @returns {Promise<Array>} Daftar cabang
 */
export async function getOrganizationBranches(supabase, organizationId) {
  if (!supabase || !organizationId) return [];

  try {
    const { data, error } = await supabase
      .from('branches')
      .select('id, organization_id, shop_id, branch_name, branch_code, is_main_branch, address, phone_number, is_active')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('is_main_branch', { ascending: false })
      .order('branch_code', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[branchContext] Gagal mengambil daftar cabang organisasi:', err);
    return [];
  }
}

/**
 * Mengambil organisasi milik owner saat ini.
 * @param {Object} supabase - Supabase client
 * @param {string} ownerId - UUID Owner akun
 * @returns {Promise<Object|null>}
 */
export async function getOwnerOrganization(supabase, ownerId) {
  if (!supabase || !ownerId) return null;

  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (error) throw error;
    return data || null;
  } catch (err) {
    console.error('[branchContext] Gagal mengambil organisasi owner:', err);
    return null;
  }
}
