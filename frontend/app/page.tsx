'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser, login, loginEmailPassword, register, User } from '@/lib/auth';
import Link from 'next/link';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const loggedInUser = await loginEmailPassword(email, password);
      setUser(loggedInUser);
      // Redirect to Dashboard (primary destination)
      if (typeof window !== 'undefined') {
        window.location.href = '/my-okrs';
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Login failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const newUser = await register(email, password, name);
      setUser(newUser);
      // Redirect to Dashboard (primary destination)
      if (typeof window !== 'undefined') {
        window.location.href = '/my-okrs';
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Registration failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8 sm:p-10 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-3 tracking-tight">
          OKR Tracker
        </h1>
        <p className="text-lg text-slate-600 mb-8">
          Leadership-owned OKRs with org roll-up: managers and above create and own objectives; most people browse and
          follow progress across the company.
        </p>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
            {error === 'auth0_not_configured' || error.includes('Auth0 not configured')
              ? 'Auth0 is not configured. Without Auth0 credentials the app runs in demo mode (single demo user). Add AUTH0_ISSUER_BASE_URL, AUTH0_CLIENT_ID, and AUTH0_CLIENT_SECRET to enable login.'
              : `Error: ${error}`}
          </div>
        )}
        
        {isLoading ? (
          <div className="text-slate-500">Loading...</div>
        ) : user ? (
          <div className="space-y-5">
            <p className="text-slate-700">
              Welcome, <span className="font-semibold">{user.name || user.email}</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/my-okrs"
                className="inline-block bg-slate-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-slate-900 transition-colors"
              >
                Go to My OKRs
              </Link>
              <Link
                href="/profile"
                className="inline-block border border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
              >
                Profile
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {!showEmailLogin ? (
              <>
                <button
                  onClick={handleLogin}
                  className="w-full bg-slate-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-slate-900 transition-colors"
                >
                  Login with Google
                </button>
                <button
                  onClick={() => setShowEmailLogin(true)}
                  className="w-full border-2 border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
                >
                  Login with Email
                </button>
              </>
            ) : (
              <form onSubmit={isRegistering ? handleRegister : handleEmailPasswordLogin} className="space-y-4">
                {isRegistering && (
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Name (optional)
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Your name"
                    />
                  </div>
                )}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-slate-900 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Please wait...' : isRegistering ? 'Sign Up' : 'Login'}
                </button>
                <div className="flex justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegistering(!isRegistering);
                      setError(null);
                    }}
                    className="text-slate-600 hover:text-slate-900 font-medium"
                  >
                    {isRegistering ? 'Already have an account? Login' : "Don't have an account? Sign up"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmailLogin(false);
                      setError(null);
                      setEmail('');
                      setPassword('');
                      setName('');
                    }}
                    className="text-gray-600 hover:text-gray-700"
                  >
                    Back
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
