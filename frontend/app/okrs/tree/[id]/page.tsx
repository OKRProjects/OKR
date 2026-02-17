'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser, login, User } from '@/lib/auth';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ObjectiveTreeView from '@/components/ObjectiveTreeView';
import { api, ObjectiveTree } from '@/lib/api';
import Link from 'next/link';

export default function ObjectiveTreePage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tree, setTree] = useState<ObjectiveTree | null>(null);
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user && id) loadTree();
  }, [user, id]);

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

  const loadTree = async () => {
    try {
      const data = await api.getObjectiveTree(id);
      setTree(data);
    } catch (err) {
      console.error('Failed to load tree:', err);
      router.push('/okrs');
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

  if (!tree) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/okrs" className="text-slate-700 hover:underline font-medium">OKRs</Link>
          <span>/</span>
          <span>Roll-up</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Roll-up: {tree.title}</h1>
        <p className="text-slate-600 mb-6">
          Cascading view from this objective down to tactical OKRs and key results.
        </p>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <ObjectiveTreeView node={tree} />
        </div>
      </div>
    </div>
  );
}
