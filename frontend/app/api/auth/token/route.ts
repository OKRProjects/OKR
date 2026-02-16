import { auth0 } from '@/lib/auth0';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // First check if user is authenticated
    const session = await auth0.getSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Get access token with audience - must match backend AUTH0_AUDIENCE
    // Default to API v2 audience if not specified
    const audience = process.env.AUTH0_AUDIENCE || 
                     (process.env.AUTH0_ISSUER_BASE_URL ? `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/` : '');
    
    if (!audience) {
      return NextResponse.json(
        { error: 'AUTH0_AUDIENCE not configured' },
        { status: 500 }
      );
    }
    
    const { accessToken } = await auth0.getAccessToken({
      authorizationParams: {
        audience: audience,
      },
    });
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token available' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({ accessToken });
  } catch (error) {
    console.error('Error getting access token:', error);
    return NextResponse.json(
      { error: 'Failed to get access token', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
