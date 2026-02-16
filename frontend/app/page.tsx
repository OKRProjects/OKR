'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser, login, User } from '@/lib/auth';
import Link from 'next/link';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
    
    // Check for error in URL params
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const errorParam = params.get('error');
      if (errorParam) {
        setError(errorParam);
        // Clear error from URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      // User not logged in is not an error
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      setError(null);
      await login();
    } catch (error: any) {
      const errorMessage = error?.message || 'Login failed';
      setError(errorMessage);
      console.error('Login error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Hackathon Template
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Full-stack template with Next.js, Flask, Auth0, and MongoDB Atlas
        </p>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
            {error === 'auth0_not_configured' || error.includes('Auth0 not configured')
              ? 'Auth0 is not configured. Please set AUTH0_DOMAIN, AUTH0_CLIENT_ID, and AUTH0_CLIENT_SECRET in backend .env file.'
              : `Error: ${error}`}
          </div>
        )}
        
        {isLoading ? (
          <div className="text-gray-500">Loading...</div>
        ) : user ? (
          <div className="space-y-4">
            <p className="text-gray-700">
              Welcome, <span className="font-semibold">{user.name || user.email}</span>!
            </p>
            <div className="flex space-x-4 justify-center">
              <Link
                href="/dashboard"
                className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                Go to Dashboard
              </Link>
              <Link
                href="/profile"
                className="inline-block border-2 border-indigo-600 text-indigo-600 px-6 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
              >
                View Profile
              </Link>
            </div>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            Login with Google
          </button>
        )}
      </div>
    </div>
  );
}
