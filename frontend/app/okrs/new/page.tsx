'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser, login, User } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import ObjectiveForm from '@/components/ObjectiveForm';
import { api, Objective } from '@/lib/api';

export default function NewObjectivePage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [parentOptions, setParentOptions] = useState<Objective[]>([]);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) loadParents();
  }, [user]);

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

  const loadParents = async () => {
    try {
      const year = new Date().getFullYear();
      const all = await api.getObjectives({ fiscalYear: year });
      setParentOptions(all);
    } catch {
      setParentOptions([]);
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
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Create objective</h1>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-2xl">
          <ObjectiveForm parentOptions={parentOptions} />
        </div>
      </div>
    </div>
  );
}
