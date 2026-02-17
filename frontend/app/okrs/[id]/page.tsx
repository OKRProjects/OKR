'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser, login, User } from '@/lib/auth';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ObjectiveForm from '@/components/ObjectiveForm';
import KeyResultForm from '@/components/KeyResultForm';
import KeyResultProgress from '@/components/KeyResultProgress';
import { api, Objective, KeyResult } from '@/lib/api';
import Link from 'next/link';

export default function ObjectiveDetailPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [objective, setObjective] = useState<Objective | null>(null);
  const [keyResults, setKeyResults] = useState<KeyResult[]>([]);
  const [parentOptions, setParentOptions] = useState<Objective[]>([]);
  const [editing, setEditing] = useState(false);
  const [addingKr, setAddingKr] = useState(false);
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user && id) {
      loadObjective();
      loadKeyResults();
    }
  }, [user, id]);

  useEffect(() => {
    if (objective) loadParents();
  }, [objective]);

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

  const loadObjective = async () => {
    try {
      const data = await api.getObjective(id);
      setObjective(data);
    } catch (err) {
      console.error('Failed to load objective:', err);
      router.push('/okrs');
    }
  };

  const loadKeyResults = async () => {
    try {
      const data = await api.getKeyResults(id);
      setKeyResults(data);
    } catch {
      setKeyResults([]);
    }
  };

  const loadParents = async () => {
    try {
      const year = objective?.fiscalYear ?? new Date().getFullYear();
      const all = await api.getObjectives({ fiscalYear: year });
      setParentOptions(all.filter((o) => o._id !== id));
    } catch {
      setParentOptions([]);
    }
  };

  const handleDelete = async () => {
    if (!objective?._id || !confirm('Delete this objective and all its key results?')) return;
    try {
      await api.deleteObjective(objective._id);
      router.push('/okrs');
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleDeleteKr = async (krId: string) => {
    if (!confirm('Delete this key result?')) return;
    try {
      await api.deleteKeyResult(krId);
      loadKeyResults();
    } catch (err) {
      console.error('Delete failed:', err);
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

  if (!objective) return null;

  const levelLabel = objective.level.charAt(0).toUpperCase() + objective.level.slice(1);
  const timelineLabel = objective.timeline === 'quarterly' ? `${objective.quarter} ` : '';

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/okrs" className="text-slate-700 hover:underline font-medium">OKRs</Link>
          <span>/</span>
          <span>{objective.title}</span>
        </div>

        {editing ? (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit Objective</h2>
            <ObjectiveForm
              objective={objective}
              parentOptions={parentOptions}
              onSuccess={() => {
                setEditing(false);
                loadObjective();
                loadParents();
              }}
            />
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="mt-4 text-sm text-slate-600 hover:text-slate-900"
            >
              Cancel edit
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{objective.title}</h1>
                <div className="mt-2 flex flex-wrap gap-2 text-sm">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700">{levelLabel}</span>
                  <span className="text-slate-500">FY{objective.fiscalYear} {timelineLabel}</span>
                  {objective.division && <span className="text-slate-500">{objective.division}</span>}
                </div>
                {objective.description && (
                  <p className="mt-3 text-slate-600">{objective.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                {objective.level === 'strategic' && (
                  <Link
                    href={`/okrs/tree/${objective._id}`}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Roll-up view
                  </Link>
                )}
                <button
                  onClick={() => setEditing(true)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Key results</h2>
            <button
              onClick={() => setAddingKr(!addingKr)}
              className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900"
            >
              {addingKr ? 'Cancel' : '+ Add key result'}
            </button>
          </div>
          {addingKr && (
            <div className="mb-6">
              <KeyResultForm
                objectiveId={id}
                onSuccess={() => {
                  setAddingKr(false);
                  loadKeyResults();
                }}
                onCancel={() => setAddingKr(false)}
              />
            </div>
          )}
          <div className="space-y-4">
            {keyResults.length === 0 && !addingKr && (
              <p className="text-slate-500">No key results yet. Add one to track progress.</p>
            )}
            {keyResults.map((kr) => (
              <div key={kr._id} className="flex flex-col gap-2">
                <KeyResultProgress keyResult={kr} onUpdate={loadKeyResults} />
                <button
                  onClick={() => handleDeleteKr(kr._id!)}
                  className="self-start text-sm text-red-600 hover:underline"
                >
                  Delete key result
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
