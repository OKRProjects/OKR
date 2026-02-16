import { auth0 } from './lib/auth0';

export async function proxy(request: Request) {
  try {
    return await auth0.middleware(request);
  } catch (error) {
    console.error('Auth0 proxy error:', error);
    // Return a proper error response
    return new Response(JSON.stringify({ error: 'Authentication error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const config = {
  matcher: [
    '/api/auth/:path*',
    '/auth/:path*',
  ],
};
