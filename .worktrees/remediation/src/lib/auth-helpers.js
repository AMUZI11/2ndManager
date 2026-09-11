import { createClient } from '@/lib/supabase';

export function errorResponse(message, code = 'ERROR', status = 400, details = null) {
  return Response.json(
    { error: true, code, message, ...(details && { details }) },
    { status }
  );
}

export function successResponse(data, message = 'Success', status = 200) {
  return Response.json(
    { error: false, message, data },
    { status }
  );
}

export function withAuth(handler) {
  return async function (request, context) {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return errorResponse('Sesi tidak valid. Silakan masuk kembali.', 'UNAUTHORIZED', 401);
    }
    return handler(request, context, user);
  };
}

/**
 * Checks if the user's subscription tier meets or exceeds the required tier.
 * Extracts the tier from Supabase JWT metadata (user_metadata or app_metadata).
 */
export function checkSubscription(user, requiredTier) {
  const userTier = user?.user_metadata?.subscription_tier || user?.app_metadata?.subscription_tier || 'FREE';
  const tierLevels = {
    'FREE': 0,
    'STARTER': 1,
    'PLUS': 2,
    'PRO': 3
  };
  const currentLevel = tierLevels[userTier.toUpperCase()] || 0;
  const requiredLevel = tierLevels[requiredTier.toUpperCase()] || 0;
  return currentLevel >= requiredLevel;
}

/**
 * Middleware that allows only users with the BOSS role.
 * Checks the Supabase JWT for the 'BOSS' role in user_metadata or app_metadata.
 */
export function withBossOnly(handler) {
  return withAuth(async (request, context, user) => {
    const role = user?.user_metadata?.role || user?.app_metadata?.role || 'CASHIER';
    
    if (role !== 'BOSS') {
      return errorResponse('Akses ditolak. Hanya Boss yang diizinkan.', 'FORBIDDEN', 403);
    }
    
    return handler(request, context, user);
  });
}

/**
 * Middleware that allows only users with the SUPERADMIN role.
 */
export function withSuperAdminOnly(handler) {
  return withAuth(async (request, context, user) => {
    const role = user?.user_metadata?.role || user?.app_metadata?.role || 'CASHIER';
    
    if (role !== 'SUPERADMIN') {
      return errorResponse('Akses ditolak. Hanya Superadmin yang diizinkan.', 'FORBIDDEN', 403);
    }
    
    return handler(request, context, user);
  });
}

// Dummy exports to prevent build from breaking on legacy API routes
export async function comparePassword() { return false; }
export async function hashPassword() { return ''; }
export async function signToken() { return ''; }
