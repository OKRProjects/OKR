'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { getCurrentUser, login, User } from '@/lib/auth';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { OKRDetailView } from '@/components/modal/OKRDetailView';
import { api, Objective, KeyResult } from '@/lib/api';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ObjectiveDetailPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [objective, setObjective] = useState<Objective | null>(null);
  const [keyResults, setKeyResults] = useState<KeyResult[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const loadingRef = useRef(false);
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  useEffect(() => {
    loadUser();
  }, []);

  const loadObjective = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const data = await api.getObjective(id);
      if (data && typeof data === 'object' && 'unchanged' in data) return;
      setObjective(data as Objective);
    } catch (err) {
      console.error('Failed to load objective:', err);
      router.push('/okrs');
    } finally {
      loadingRef.current = false;
    }
  }, [id, router]);

  const loadKeyResults = useCallback(async () => {
    try {
      const data = await api.getKeyResults(id);
      setKeyResults(data);
    } catch {
      setKeyResults([]);
    }
  }, [id]);

  useEffect(() => {
    if (user && id) {
      loadObjective();
      loadKeyResults();
    }
  }, [user, id, loadObjective, loadKeyResults]);

  // Presence: register view, heartbeat, leave on unmount
  useEffect(() => {
    if (!id || !user) return;
    let mounted = true;
    const tick = async () => {
      try {
        const res = await api.postView(id, { userName: user.name || user.email || undefined });
        if (mounted) setViewerCount(res.count);
      } catch {
        if (mounted) setViewerCount(0);
      }
    };
    tick();
    const heartbeat = setInterval(tick, 28000);
    return () => {
      mounted = false;
      clearInterval(heartbeat);
      api.leaveView(id).catch(() => {});
    };
  }, [id, user]);

  // Live polling
  useEffect(() => {
    if (!id || !objective) return;
    const since = objective.updatedAt ?? undefined;
    const interval = setInterval(async () => {
      if (loadingRef.current) return;
      try {
        const objResult = await api.getObjective(id, since ? { since } : undefined);
        if (objResult && typeof objResult === 'object' && 'unchanged' in objResult) return;
        const obj = objResult as Objective;
        const krs = await api.getKeyResults(id);
        setObjective(obj);
        setKeyResults(krs);
      } catch {
        // ignore
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [id, objective?.updatedAt]);

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

  if (isLoading || !user) {
    return (
      <AppLayout title="Objective" description="View and manage objective details">
        <div className="text-center text-muted-foreground">Loading...</div>
      </AppLayout>
    );
  }

  if (!objective) return null;

  return (
    <AppLayout
      title={objective.title}
      description={`${objective.level} objective`}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/okrs">Back to OKRs</Link>
          </Button>
          {objective.level === 'strategic' && objective._id && (
            <Button variant="outline" asChild>
              <Link href={`/okrs/tree/${objective._id}`}>Roll-up view</Link>
            </Button>
          )}
          {viewerCount > 1 && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              {viewerCount - 1} other{viewerCount - 1 !== 1 ? 's' : ''} viewing
            </span>
          )}
        </div>
        <OKRDetailView
          objective={objective}
          keyResults={keyResults}
          onObjectiveUpdate={setObjective}
          onKeyResultsUpdate={() => {
            loadKeyResults();
          }}
          userRole={user?.role}
          viewerCount={viewerCount}
        />
      </div>
    </AppLayout>
  );
}
