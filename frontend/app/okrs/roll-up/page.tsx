'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser, login, User } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import { api, Objective } from '@/lib/api';
import Link from 'next/link';

export default function RollUpPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [strategic, setStrategic] = useState<Objective[]>([]);
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) loadStrategic();
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

  const loadStrategic = async () => {
    try {
      const data = await api.getObjectives({ fiscalYear, level: 'strategic' });
      setStrategic(data);
    } catch {
      setStrategic([]);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-slate-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-slate-900">Roll-up view</h1>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">Fiscal Year</label>
            <select
              value={fiscalYear}
              onChange={(e) => setFiscalYear(Number(e.target.value))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <Link
              href="/okrs"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back to OKRs
            </Link>
          </div>
        </div>
        <p className="mb-6 text-slate-600">
          Choose a strategic objective to see how it cascades to divisional and tactical OKRs.
        </p>
        {strategic.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            No strategic objectives for FY{fiscalYear}. Create one from the OKRs list.
          </div>
        ) : (
          <ul className="space-y-3">
            {strategic.map((o) => (
              <li key={o._id}>
                <Link
                  href={`/okrs/tree/${o._id}`}
                  className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 hover:shadow"
                >
                  <span className="font-medium text-slate-900">{o.title}</span>
                  {o.description && <p className="mt-1 text-sm text-slate-600">{o.description}</p>}
                  <span className="mt-2 inline-block text-sm text-slate-700 font-medium">View roll-up →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
