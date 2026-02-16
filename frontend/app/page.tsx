'use client';

import Link from 'next/link';
import { useUser } from '@auth0/nextjs-auth0/client';

export default function Home() {
  const { user, isLoading } = useUser();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Hackathon Template
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Full-stack template with Next.js, Flask, Auth0, and MongoDB Atlas
        </p>
        
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
          <a
            href="/api/auth/login"
            className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            Login with Google
          </a>
        )}
      </div>
    </div>
  );
}
