import { NextResponse } from 'next/server';
import { auth0 } from './lib/auth0';

function backendBase(): string {
  const raw =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    '';
  return raw.replace(/\/$/, '');
}

/**
 * Next 16 proxy (replaces middleware.ts for this app).
 *
 * 1) `/api/*` → Flask at **runtime** (reads BACKEND_URL). Avoids next.config rewrites baking
 *    http://127.0.0.1:5001 during `npm run build` when env is missing (Render ECONNREFUSED).
 * 2) `/auth/*` → Auth0 SDK (not `/api/auth/*` — those are Flask-backed route handlers).
 */
export async function proxy(request: Request) {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) {
    const base = backendBase();
    if (base) {
      return NextResponse.rewrite(
        new URL(`${base}${url.pathname}${url.search}`)
      );
    }
    return NextResponse.next();
  }

  try {
    return await auth0.middleware(request);
  } catch (error) {
    console.error('Auth0 proxy error:', error);
    return new Response(JSON.stringify({ error: 'Authentication error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const config = {
  matcher: ['/api/:path*', '/auth/:path*'],
};
