'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getCurrentUser, login, User } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import { api, Objective } from '@/lib/api';
import Link from 'next/link';

export default function OKRsPage() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [divisionFilter, setDivisionFilter] = useState('');

  useEffect(() => {
    const level = searchParams.get('level');
    if (level && ['strategic', 'functional', 'tactical'].includes(level)) {
      setLevelFilter(level);
    }
  }, [searchParams]);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) loadObjectives();
  }, [user, fiscalYear, levelFilter, divisionFilter]);

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
      const params: { fiscalYear: number; level?: string; division?: string } = { fiscalYear };
      if (levelFilter) params.level = levelFilter;
      if (divisionFilter) params.division = divisionFilter;
      const data = await api.getObjectives(params);
      setObjectives(data);
    } catch (err) {
      console.error('Failed to load objectives:', err);
      setObjectives([]);
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

  const strategic = objectives.filter((o) => o.level === 'strategic');
  const functional = objectives.filter((o) => o.level === 'functional');
  const tactical = objectives.filter((o) => o.level === 'tactical');

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Objectives & Key Results</h1>
          <p className="mt-1 text-slate-600">Strategic, functional, and tactical OKRs for the year.</p>
        </div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/okrs/roll-up"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Roll-up view
            </Link>
            <Link
              href="/okrs/new"
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
            >
              + New objective
            </Link>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <label className="block text-xs font-medium text-slate-500">Fiscal year</label>
            <select
              value={fiscalYear}
              onChange={(e) => setFiscalYear(Number(e.target.value))}
              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Level</label>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="strategic">Strategic</option>
              <option value="functional">Functional</option>
              <option value="tactical">Tactical</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Division</label>
            <input
              type="text"
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              placeholder="e.g. AI, Data"
              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="space-y-6">
          {strategic.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Strategic (Annual)</h2>
              <ul className="space-y-2">
                {strategic.map((o) => (
                  <li key={o._id}>
                    <Link
                      href={`/okrs/${o._id}`}
                      className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 hover:shadow"
                    >
                      <span className="font-medium text-slate-900">{o.title}</span>
                      {o.description && <p className="mt-1 text-sm text-slate-600">{o.description}</p>}
                      <div className="mt-2 flex gap-2 text-xs text-slate-500">
                        <span>FY{o.fiscalYear}</span>
                        <Link href={`/okrs/tree/${o._id}`} className="text-slate-700 hover:underline font-medium">
                          View roll-up
                        </Link>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {functional.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Functional (Annual)</h2>
              <ul className="space-y-2">
                {functional.map((o) => (
                  <li key={o._id}>
                    <Link
                      href={`/okrs/${o._id}`}
                      className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 hover:shadow"
                    >
                      <span className="font-medium text-slate-900">{o.title}</span>
                      {o.division && <span className="ml-2 text-xs text-slate-500">{o.division}</span>}
                      {o.description && <p className="mt-1 text-sm text-slate-600">{o.description}</p>}
                      <div className="mt-2 text-xs text-slate-500">FY{o.fiscalYear}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {tactical.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Tactical (Quarterly)</h2>
              <ul className="space-y-2">
                {tactical.map((o) => (
                  <li key={o._id}>
                    <Link
                      href={`/okrs/${o._id}`}
                      className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 hover:shadow"
                    >
                      <span className="font-medium text-slate-900">{o.title}</span>
                      {o.quarter && <span className="ml-2 text-xs text-slate-500">{o.quarter}</span>}
                      {o.description && <p className="mt-1 text-sm text-slate-600">{o.description}</p>}
                      <div className="mt-2 text-xs text-slate-500">FY{o.fiscalYear} {o.quarter}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {objectives.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
              No objectives match the filters. Create one with &quot;New objective&quot; or adjust filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
