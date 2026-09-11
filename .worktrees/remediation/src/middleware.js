import { NextResponse } from 'next/server';

async function verifyJwtEdge(token, secret) {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !signatureB64) return false;
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    const sigStr = atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/'));
    const sigBuf = new Uint8Array(sigStr.length);
    for (let i = 0; i < sigStr.length; i++) {
      sigBuf[i] = sigStr.charCodeAt(i);
    }
    
    const data = encoder.encode(headerB64 + '.' + payloadB64);
    const isValid = await crypto.subtle.verify('HMAC', key, sigBuf, data);
    if (!isValid) return false;
    
    const payloadStr = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadStr);
    if (payload.exp && Date.now() >= payload.exp * 1000) return false;
    
    return true;
  } catch (e) {
    return false;
  }
}

export async function middleware(request) {
  // Only intercept /api routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    const requestOrigin = request.headers.get('origin') || '';
    let allowedOrigin = '';

    const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '';
    if (process.env.NODE_ENV === 'development') {
      allowedOrigin = requestOrigin || '*';
    } else if (allowedOriginsEnv) {
      const whitelist = allowedOriginsEnv.split(',').map(o => o.trim().toLowerCase());
      if (whitelist.includes(requestOrigin.toLowerCase())) {
        allowedOrigin = requestOrigin;
      }
    }

    const isPreflight = request.method === 'OPTIONS';
    
    if (isPreflight && !allowedOrigin) {
      return new NextResponse('CORS Not Allowed', { status: 400 });
    }

    // JWT verification for non-auth endpoints
    if (!isPreflight && !request.nextUrl.pathname.startsWith('/api/v1/auth/login')) {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new NextResponse(JSON.stringify({ error: true, code: 'UNAUTHORIZED', message: 'Sesi tidak valid.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const token = authHeader.substring(7);
      const secret = process.env.JWT_SECRET;
      
      if (secret) {
        const isValid = await verifyJwtEdge(token, secret);
        if (!isValid) {
          return new NextResponse(JSON.stringify({ error: true, code: 'UNAUTHORIZED', message: 'Sesi expired atau tidak valid.' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }

    const response = isPreflight
      ? new NextResponse(null, { status: 204 })
      : NextResponse.next();

    if (allowedOrigin) {
      response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Vary', 'Origin');
    }

    return response;
  }
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};

