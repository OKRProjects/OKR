'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser, login, User } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import ItemList from '@/components/ItemList';
import ProfileCard from '@/components/ProfileCard';
import { api, Objective } from '@/lib/api';
import Link from 'next/link';

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [fiscalYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) loadObjectives();
  }, [user, fiscalYear]);

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        await login();
        return;
      }
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user:', error);
      await login();
    } finally {
      setIsLoading(false);
    }
  };

  const loadObjectives = async () => {
    try {
      const data = await api.getObjectives({ fiscalYear });
      setObjectives(data);
    } catch {
      setObjectives([]);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-slate-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const strategic = objectives.filter((o) => o.level === 'strategic');
  const functional = objectives.filter((o) => o.level === 'functional');
  const tactical = objectives.filter((o) => o.level === 'tactical');

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-1">
            Dashboard
          </h1>
          <p className="text-slate-600">
            Overview of your OKRs and quick actions.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main: OKRs first */}
          <div className="lg:col-span-2 space-y-6">
            {/* OKR summary */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold text-slate-900">Objectives & Key Results</h2>
                  <div className="flex gap-2">
                    <Link
                      href="/okrs/roll-up"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Roll-up
                    </Link>
                    <Link
                      href="/okrs/new"
                      className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900"
                    >
                      + New Objective
                    </Link>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <Link href="/okrs?level=strategic" className="rounded-lg bg-slate-50 border border-slate-100 p-4 hover:border-slate-200 hover:bg-slate-100 transition-colors">
                    <p className="text-2xl font-bold text-slate-900">{strategic.length}</p>
                    <p className="text-sm font-medium text-slate-600">Strategic</p>
                    <p className="text-xs text-slate-500 mt-0.5">Annual</p>
                  </Link>
                  <Link href="/okrs?level=functional" className="rounded-lg bg-slate-50 border border-slate-100 p-4 hover:border-slate-200 hover:bg-slate-100 transition-colors">
                    <p className="text-2xl font-bold text-slate-900">{functional.length}</p>
                    <p className="text-sm font-medium text-slate-600">Functional</p>
                    <p className="text-xs text-slate-500 mt-0.5">Annual</p>
                  </Link>
                  <Link href="/okrs?level=tactical" className="rounded-lg bg-slate-50 border border-slate-100 p-4 hover:border-slate-200 hover:bg-slate-100 transition-colors">
                    <p className="text-2xl font-bold text-slate-900">{tactical.length}</p>
                    <p className="text-sm font-medium text-slate-600">Tactical</p>
                    <p className="text-xs text-slate-500 mt-0.5">Quarterly</p>
                  </Link>
                </div>
                <Link
                  href="/okrs"
                  className="inline-flex items-center text-slate-700 font-medium hover:text-slate-900"
                >
                  View all OKRs
                  <span className="ml-1">→</span>
                </Link>
              </div>
            </div>

            {/* Items (secondary) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-900">Items</h2>
                <Link
                  href="/items/new"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  + New Item
                </Link>
              </div>
              <ItemList />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <ProfileCard />
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Quick actions</h3>
              <div className="space-y-1">
                <Link href="/okrs" className="block px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium">
                  OKRs
                </Link>
                <Link href="/okrs/new" className="block px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium">
                  New objective
                </Link>
                <Link href="/okrs/roll-up" className="block px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium">
                  Roll-up view
                </Link>
                <Link href="/items/new" className="block px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium">
                  New item
                </Link>
                <Link href="/profile" className="block px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium">
                  Profile
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
