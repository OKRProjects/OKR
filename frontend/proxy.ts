import { auth0 } from './lib/auth0';

/**
 * Do **not** match `/api/auth/*` here. Those routes are handled by Next route handlers that
 * proxy to Flask (`/api/auth/login`, `/token`, `/logout`, `/profile`, and rewrites to `/me`).
 * Running `auth0.middleware()` on them conflicts with that flow and throws → 500
 * `{ error: "Authentication error" }`.
 *
 * Keep `/auth/*` for routes that use `@auth0/nextjs-auth0` directly (e.g. `app/auth/profile`).
 */
export async function proxy(request: Request) {
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
  matcher: ['/auth/:path*'],
};
