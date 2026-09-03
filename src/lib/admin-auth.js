// src/lib/admin-auth.js — Server-side Admin Auth Guard & Immutable Audit Logger
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { errorResponse } from '@/lib/auth-helpers';

/**
 * Validasi apakah email terdaftar dalam SUPERADMIN_EMAILS
 */
export function isSuperadminEmail(email) {
  if (!email) return false;
  const emails = (process.env.SUPERADMIN_EMAILS || process.env.ADMIN_EMAIL || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return emails.includes(email.toLowerCase());
}

/**
 * Catat aksi admin ke tabel admin_audit_logs secara permanen (append-only)
 */
export async function logAdminAudit({
  adminId,
  adminEmail,
  actionType,
  targetShopId = null,
  reason,
  metadata = {},
  ipAddress = '127.0.0.1',
  userAgent = 'Unknown',
}) {
  try {
    const { data, error } = await supabaseAdmin.from('admin_audit_logs').insert({
      admin_id: adminId,
      admin_email: adminEmail,
      action_type: actionType,
      target_shop_id: targetShopId,
      reason: reason || 'Aksi operasional platform',
      metadata,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
    if (error) {
      console.error('[logAdminAudit Error]', error);
    }
    return data;
  } catch (err) {
    console.error('[logAdminAudit Exception]', err);
  }
}

/**
 * Higher-Order Function untuk Route Handlers /api/v1/admin/*
 */
export function withAdminAuth(
  handler,
  { allowedRoles = ['SUPERADMIN', 'SUPPORT_AGENT', 'BILLING_SPECIALIST'] } = {}
) {
  return async function (request, context) {
    try {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();

      if (authErr || !user) {
        return errorResponse('Sesi admin tidak valid.', 'UNAUTHORIZED', 401);
      }

      const isSuperadmin = isSuperadminEmail(user.email);
      let role = isSuperadmin ? 'SUPERADMIN' : null;

      if (!isSuperadmin) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        role = profile?.role;
      }

      if (!role || !allowedRoles.includes(role)) {
        return errorResponse('Akses ditolak. Wewenang peran admin tidak memadai.', 'FORBIDDEN', 403);
      }

      // Metadata klien untuk audit trail
      const forwardedFor = request.headers.get('x-forwarded-for');
      const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';
      const userAgent = request.headers.get('user-agent') || 'Unknown';

      const adminContext = {
        user,
        adminId: user.id,
        adminEmail: user.email,
        role,
        isSuperadmin,
        ipAddress,
        userAgent,
        supabase,
        supabaseAdmin,
      };

      return handler(request, context, adminContext);
    } catch (err) {
      console.error('[withAdminAuth Error]', err);
      return errorResponse('Terjadi kesalahan internal otorisasi admin.', 'INTERNAL_ERROR', 500);
    }
  };
}
