'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser, login, User } from '@/lib/auth';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import ObjectiveForm from '@/components/ObjectiveForm';
import KeyResultForm from '@/components/KeyResultForm';
import KeyResultProgress from '@/components/KeyResultProgress';
import { api, Objective, KeyResult } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
      <AppLayout title="Objective" description="View and manage objective details">
        <div className="text-center text-muted-foreground">Loading...</div>
      </AppLayout>
    );
  }

  if (!objective) return null;

  const levelLabel = objective.level.charAt(0).toUpperCase() + objective.level.slice(1);
  const timelineLabel = objective.timeline === 'quarterly' ? `${objective.quarter} ` : '';

  return (
    <AppLayout title={objective.title} description={`${levelLabel} objective for FY${objective.fiscalYear}`}>
      <div className="space-y-6">
        {editing ? (
          <Card>
            <CardHeader>
              <CardTitle>Edit Objective</CardTitle>
            </CardHeader>
            <CardContent>
              <ObjectiveForm
                objective={objective}
                parentOptions={parentOptions}
                onSuccess={() => {
                  setEditing(false);
                  loadObjective();
                  loadParents();
                }}
              />
              <Button variant="ghost" onClick={() => setEditing(false)} className="mt-4">
                Cancel edit
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge variant={objective.level === 'strategic' ? 'default' : objective.level === 'functional' ? 'secondary' : 'outline'}>
                      {levelLabel}
                    </Badge>
                    <Badge variant="outline">FY{objective.fiscalYear} {timelineLabel}</Badge>
                    {objective.division && <Badge variant="outline">{objective.division}</Badge>}
                  </div>
                  {objective.description && (
                    <p className="text-muted-foreground mt-2">{objective.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {objective.level === 'strategic' && (
                    <Button variant="outline" asChild>
                      <Link href={`/okrs/tree/${objective._id}`}>Roll-up view</Link>
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                  <Button variant="destructive" onClick={handleDelete}>
                    Delete
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Key results</CardTitle>
              <Button onClick={() => setAddingKr(!addingKr)}>
                {addingKr ? 'Cancel' : '+ Add key result'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
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
                <p className="text-muted-foreground">No key results yet. Add one to track progress.</p>
              )}
              {keyResults.map((kr) => (
                <div key={kr._id} className="flex flex-col gap-2">
                  <KeyResultProgress keyResult={kr} onUpdate={loadKeyResults} />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteKr(kr._id!)}
                    className="self-start text-destructive hover:text-destructive"
                  >
                    Delete key result
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
