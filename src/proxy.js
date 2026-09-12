// src/proxy.js - Next.js 16 Edge Runtime Route Guard & RBAC for The Obsidian Terminal
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

function isAllowedOrigin(origin, request = null) {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    const host = url.hostname.toLowerCase();

    // 1. Same-origin request check (mencegah blokir request internal dari domain sendiri)
    if (request) {
      const reqHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl?.host;
      if (reqHost) {
        const cleanReqHost = reqHost.split(':')[0].toLowerCase();
        if (host === cleanReqHost) return true;
      }
    }

    // 2. Localhost & Loopback
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1') return true;

    // 3. Jaringan Lokal / LAN (akses perangkat kasir ponsel di jaringan toko)
    if (/^192\.168\./.test(host) || /^10\./.test(host) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return true;

    // 4. Domain Resmi Produksi & Staging
    if (host === '2ndmanager.com' || host.endsWith('.2ndmanager.com')) return true;

    // 5. Vercel Preview & Production Deployments
    if (host === 'vercel.app' || host.endsWith('.vercel.app')) return true;

    // 6. Environment VERCEL_URL
    if (process.env.VERCEL_URL) {
      const vHost = process.env.VERCEL_URL.toLowerCase();
      if (host === vHost || host.endsWith(vHost)) return true;
    }

    return false;
  } catch {
    return false;
  }
}

export async function proxy(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const { pathname } = request.nextUrl;

  // CORS guard for API routes
  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    const allowed = isAllowedOrigin(origin, request);
    if (origin && !allowed) {
      return NextResponse.json(
        { error: true, code: 'CORS_FORBIDDEN', message: 'Akses API ditolak: Domain origin tidak sah.' },
        { status: 403 }
      );
    }

    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin && allowed ? origin : 'https://2ndmanager.com',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (origin && allowed) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
  }

  // Bypass static files, favicon, robots, sitemap, and text discovery files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/llms.txt' ||
    pathname === '/manifest.webmanifest' ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$/.test(pathname)
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

  // Public marketing & legal pages
  const publicRoutes = ['/', '/login', '/pricing', '/features', '/privacy', '/terms', '/refund'];
  if (publicRoutes.includes(pathname) || pathname.startsWith('/api/')) {
    return response;
  }

  // Owner route alias: automatically redirect /owner to /dashboard
  if (pathname === '/owner' || pathname.startsWith('/owner/')) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = '/dashboard';
    return NextResponse.redirect(dashboardUrl);
  }

  // User Side Protected Routes: Check for Supabase auth cookie
  const protectedPrefixes = [
    '/admin',
    '/dashboard',
    '/owner',
    '/radar',
    '/reporting',
    '/help',
    '/pos',
    '/products',
    '/reorder',
    '/consignments',
    '/customers',
    '/settings',
    '/billing',
    '/panic-dispatch',
    '/superadmin',
    '/transactions',
  ];

  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  );

  if (isProtected) {
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
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

export default proxy;
