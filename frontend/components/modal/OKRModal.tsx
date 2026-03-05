'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Link2, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, type Objective, type KeyResult } from '@/lib/api';
import { OKRDetailView } from './OKRDetailView';
import { ShortcutHelp } from '@/components/shared/ShortcutHelp';
import { cn } from '@/components/ui/utils';

const VIEW_HEARTBEAT_MS = 28000;
const LIVE_POLL_MS = 15000;

interface OKRModalProps {
  objectiveId: string;
  onClose: () => void;
  className?: string;
}

export function OKRModal({ objectiveId, onClose, className }: OKRModalProps) {
  const [objective, setObjective] = useState<Objective | null>(null);
  const [keyResults, setKeyResults] = useState<KeyResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | undefined>(undefined);
  const [viewerCount, setViewerCount] = useState(0);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const loadingRef = useRef(false);

  const load = useCallback(async (showLoading = true) => {
    if (loadingRef.current) return;
    if (showLoading) setLoading(true);
    setError(null);
    loadingRef.current = true;
    try {
      const [obj, krs] = await Promise.all([
        api.getObjective(objectiveId),
        api.getKeyResults(objectiveId),
      ]);
      if (obj && typeof obj === 'object' && 'unchanged' in obj && obj.unchanged) {
        // leave objective and key results unchanged
      } else {
        setObjective(obj as Objective);
        setKeyResults(krs);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [objectiveId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.getCurrentUser().then((u) => setUserRole(u?.role)).catch(() => setUserRole(undefined));
  }, []);

  // Presence: register view on mount, heartbeat, leave on unmount
  useEffect(() => {
    if (!objectiveId) return;
    let mounted = true;
    const tick = async () => {
      try {
        const user = await api.getCurrentUser();
        const res = await api.postView(objectiveId, { userName: user?.name || user?.email || undefined });
        if (mounted) setViewerCount(res.count);
      } catch {
        if (mounted) setViewerCount(0);
      }
    };
    tick();
    const heartbeat = setInterval(tick, VIEW_HEARTBEAT_MS);
    return () => {
      mounted = false;
      clearInterval(heartbeat);
      api.leaveView(objectiveId).catch(() => {});
    };
  }, [objectiveId]);

  // Live polling: refetch objective + key results every 15s (skip if load in progress)
  useEffect(() => {
    if (!objectiveId || !objective) return;
    const since = objective.updatedAt ?? undefined;
    const interval = setInterval(async () => {
      if (loadingRef.current) return;
      try {
        const objResult = await api.getObjective(objectiveId, since ? { since } : undefined);
        if (objResult && typeof objResult === 'object' && 'unchanged' in objResult && objResult.unchanged) return;
        const obj = objResult as Objective;
        const krs = await api.getKeyResults(objectiveId);
        setObjective(obj);
        setKeyResults(krs);
      } catch {
        // ignore poll errors
      }
    }, LIVE_POLL_MS);
    return () => clearInterval(interval);
  }, [objectiveId, objective?.updatedAt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (shortcutHelpOpen) setShortcutHelpOpen(false);
        else onClose();
      }
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setShortcutHelpOpen((open) => !open);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, shortcutHelpOpen]);

  const content = (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="okr-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={cn(
          'bg-card border rounded-t-xl sm:rounded-xl shadow-xl w-full max-w-3xl flex flex-col',
          'h-[100dvh] sm:h-auto sm:max-h-[90vh]',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between shrink-0 px-3 sm:px-4 py-3 border-b gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <h2 id="okr-modal-title" className="text-base sm:text-lg font-semibold truncate">
              {objective?.title ?? 'OKR'}
            </h2>
            {viewerCount > 1 && (
              <span className="shrink-0 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {viewerCount - 1} other{viewerCount - 1 !== 1 ? 's' : ''} viewing
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/okrs/${objectiveId}`;
                navigator.clipboard.writeText(url).then(() => {}).catch(() => {});
              }}
              aria-label="Copy link"
              title="Copy link"
              className="min-h-[44px] min-w-[44px]"
            >
              <Link2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShortcutHelpOpen(true)}
              aria-label="Keyboard shortcuts"
              title="Shortcuts (?)"
              className="min-h-[44px] min-w-[44px]"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close"
              className="min-h-[44px] min-w-[44px] shrink-0"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4">
          {loading && (
            <div className="text-center text-muted-foreground py-8">
              Loading…
            </div>
          )}
          {error && (
            <div className="text-center text-destructive py-8">
              {error}
              <Button variant="outline" size="sm" className="mt-2" onClick={load}>
                Retry
              </Button>
            </div>
          )}
          {!loading && !error && objective && (
            <OKRDetailView
              objective={objective}
              keyResults={keyResults}
              onObjectiveUpdate={(updated) => setObjective(updated)}
              onKeyResultsUpdate={() => load(false)}
              userRole={userRole}
              viewerCount={viewerCount}
            />
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(
    <>
      {content}
      <ShortcutHelp open={shortcutHelpOpen} onClose={() => setShortcutHelpOpen(false)} />
    </>,
    document.body
  );
}
