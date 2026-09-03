// src/proxy.js — Next.js 16 Edge Runtime Route Guard & RBAC for The Obsidian Terminal
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function proxy(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const { pathname } = request.nextUrl;

  // Bypass static files and favicon
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname === '/favicon.ico' ||
    /\.(svg|png|jpg|jpeg|gif|webp)$/.test(pathname)
  ) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const isAdminPage = pathname.startsWith('/admin');
  const isAdminApi = pathname.startsWith('/api/v1/admin');

  // Protect Admin Deck Routes (/admin and /api/v1/admin)
  if (isAdminPage || isAdminApi) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      if (isAdminApi) {
        return NextResponse.json(
          { error: true, code: 'UNAUTHORIZED', message: 'Sesi admin tidak valid. Silakan login kembali.' },
          { status: 401 }
        );
      }
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('redirectTo', pathname);
      loginUrl.searchParams.set('error', 'admin_required');
      return NextResponse.redirect(loginUrl);
    }

    // RBAC: Verifikasi daftar email Superadmin dari process.env.SUPERADMIN_EMAILS
    const superadminEmails = (process.env.SUPERADMIN_EMAILS || process.env.ADMIN_EMAIL || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const isSuperadmin = superadminEmails.includes(user.email?.toLowerCase());
    let isAuthorized = isSuperadmin;

    if (!isAuthorized) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const staffRoles = ['SUPERADMIN', 'SUPPORT_AGENT', 'BILLING_SPECIALIST'];
      if (profile && staffRoles.includes(profile.role)) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      if (isAdminApi) {
        return NextResponse.json(
          { error: true, code: 'FORBIDDEN', message: 'Akses ditolak. Memerlukan wewenang Platform Admin.' },
          { status: 403 }
        );
      }
      const forbiddenUrl = request.nextUrl.clone();
      forbiddenUrl.pathname = '/dashboard';
      forbiddenUrl.searchParams.set('error', 'forbidden_admin');
      return NextResponse.redirect(forbiddenUrl);
    }

    return response;
  }

  // Public pages
  if (pathname === '/' || pathname === '/login' || pathname.startsWith('/api/')) {
    return response;
  }

  // User Side Protected Routes: Check for Supabase auth cookie
  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some(
    (c) => c.name.startsWith('sb-') && (c.name.includes('-auth-token') || c.name.includes('access-token'))
  );

  if (!hasAuthCookie) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

export default proxy;
