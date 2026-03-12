'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Link2, HelpCircle, MoreHorizontal, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, type Objective, type KeyResult } from '@/lib/api';
import { OKRDetailView } from './OKRDetailView';
import { WorkflowActions } from './WorkflowActions';
import { ShortcutHelp } from '@/components/shared/ShortcutHelp';
import { ErrorMessage } from '@/components/shared/ErrorMessage';
import { cn } from '@/components/ui/utils';
import { useViewRole } from '@/lib/ViewRoleContext';
import { getOKRPermissions } from '@/lib/permissions';
import {
  getStatusIcon,
  getStatusLabel,
  getStatusTooltip,
  getStatusBadgeClass,
  WORKFLOW_STEPS,
  getCurrentStepIndex,
} from '@/lib/workflowStatus';

const VIEW_HEARTBEAT_MS = 28000;
const LIVE_POLL_MS = 15000;

interface OKRModalProps {
  objectiveId: string;
  onClose: () => void;
  className?: string;
}

export function OKRModal({ objectiveId, onClose, className }: OKRModalProps) {
  const { effectiveRole, userForPermissions } = useViewRole();
  const [objective, setObjective] = useState<Objective | null>(null);
  const [keyResults, setKeyResults] = useState<KeyResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [externalUpdateBanner, setExternalUpdateBanner] = useState(false);
  const loadingRef = useRef(false);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

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
        setExternalUpdateBanner(true);
      } catch {
        // ignore poll errors
      }
    }, LIVE_POLL_MS);
    return () => clearInterval(interval);
  }, [objectiveId, objective?.updatedAt]);

  // Focus trap: save previous focus on open, focus first focusable, trap Tab, restore on close
  useEffect(() => {
    previousActiveElementRef.current = document.activeElement as HTMLElement | null;
    const el = modalContentRef.current;
    if (!el) return;
    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex^="-"])';
    const focusables = el.querySelectorAll<HTMLElement>(focusableSelector);
    const first = focusables[0];
    if (first) {
      requestAnimationFrame(() => first.focus());
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const list = Array.from(el.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (node) => node.offsetParent != null
      );
      if (list.length === 0) return;
      const i = list.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey) {
        if (i <= 0) {
          e.preventDefault();
          list[list.length - 1].focus();
        }
      } else {
        if (i === -1 || i >= list.length - 1) {
          e.preventDefault();
          list[0].focus();
        }
      }
    };
    el.addEventListener('keydown', onKeyDown);
    return () => {
      el.removeEventListener('keydown', onKeyDown);
      previousActiveElementRef.current?.focus?.();
    };
  }, [objectiveId]);

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
        ref={modalContentRef}
        className={cn(
          'bg-card border rounded-t-xl sm:rounded-xl shadow-xl w-full max-w-3xl flex flex-col',
          'h-[100dvh] sm:h-auto sm:max-h-[90vh]',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b">
          <div className="flex items-center justify-between px-3 sm:px-4 py-3 gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h2 id="okr-modal-title" className="text-base sm:text-lg font-semibold truncate">
                {objective?.title ?? 'OKR'}
              </h2>
              {objective && (
                <span
                  className={cn(
                    'shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
                    getStatusBadgeClass(objective.status)
                  )}
                  title={getStatusTooltip(objective.status)}
                >
                  {(() => {
                    const Icon = getStatusIcon(objective.status);
                    return <Icon className="w-3.5 h-3.5" />;
                  })()}
                  {getStatusLabel(objective.status)}
                </span>
              )}
              {viewerCount > 1 && (
                <span className="shrink-0 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {viewerCount - 1} other{viewerCount - 1 !== 1 ? 's' : ''} viewing
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0 relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setExternalUpdateBanner(false);
                  load(false);
                }}
                aria-label="Refresh"
                title="Refresh"
                className="min-h-[44px] min-w-[44px]"
              >
                <RefreshCw className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMoreOpen((o) => !o)}
              aria-label="More actions"
              aria-expanded={moreOpen}
              aria-haspopup="true"
              title="More"
              className="min-h-[44px] min-w-[44px]"
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
            {moreOpen && (
              <>
                <div
                  className="fixed inset-0 z-0"
                  aria-hidden="true"
                  onClick={() => setMoreOpen(false)}
                />
                <div
                  className="absolute right-0 top-full mt-1 z-10 min-w-[180px] rounded-md border bg-popover py-1 shadow-md"
                  role="menu"
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                    onClick={() => {
                      const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/okrs/${objectiveId}`;
                      navigator.clipboard.writeText(url).then(() => setMoreOpen(false)).catch(() => {});
                    }}
                    role="menuitem"
                  >
                    <Link2 className="h-4 w-4" />
                    Copy link
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                    onClick={() => {
                      setShortcutHelpOpen(true);
                      setMoreOpen(false);
                    }}
                    role="menuitem"
                  >
                    <HelpCircle className="h-4 w-4" />
                    Keyboard shortcuts
                  </button>
                </div>
              </>
            )}
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
          {objective && (objective.status ?? '').toString().toLowerCase() !== 'rejected' && (
            <div className="flex items-center gap-2 px-3 sm:px-4 pb-3">
              {WORKFLOW_STEPS.map((step, index) => {
                const currentIdx = getCurrentStepIndex(objective.status);
                const isCompleted = index < currentIdx;
                const isCurrent = index === currentIdx;
                return (
                  <div key={step.status} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-colors',
                          isCompleted && 'bg-green-100 text-green-700 border-green-500 dark:bg-green-900/50 dark:border-green-600',
                          isCurrent && 'bg-blue-100 text-blue-700 border-blue-500 dark:bg-blue-900/50 dark:border-blue-600',
                          !isCompleted && !isCurrent && 'bg-muted text-muted-foreground border-border'
                        )}
                      >
                        {isCompleted ? '✓' : index + 1}
                      </div>
                      <span className={cn('text-xs mt-1', isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                        {step.label}
                      </span>
                    </div>
                    {index < WORKFLOW_STEPS.length - 1 && (
                      <div className={cn('w-8 h-0.5 mx-1 mb-5', isCompleted ? 'bg-green-500' : 'bg-border')} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {externalUpdateBanner && (
          <div className="shrink-0 px-3 sm:px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-sm text-amber-800 dark:text-amber-200 flex items-center justify-between gap-2">
            <span>This OKR was updated by someone else.</span>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => {
                setExternalUpdateBanner(false);
                load(false);
              }}
            >
              Refresh
            </Button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 min-h-0">
          {loading && (
            <div className="space-y-4 animate-pulse">
              <div className="h-8 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-5/6" />
              <div className="flex gap-4 mt-6">
                <div className="h-20 flex-1 bg-muted rounded" />
                <div className="h-20 flex-1 bg-muted rounded" />
                <div className="h-20 flex-1 bg-muted rounded" />
              </div>
              <div className="h-32 bg-muted rounded mt-4" />
            </div>
          )}
          {error && (
            <div className="p-4">
              <ErrorMessage message={error} learnMoreHref="/docs" />
              <Button variant="outline" size="sm" className="mt-3 min-h-[44px] min-w-[44px] touch-manipulation" onClick={() => load()}>
                Retry
              </Button>
            </div>
          )}
          {!loading && !error && objective && (
            <>
              <OKRDetailView
                objective={objective}
                keyResults={keyResults}
                onObjectiveUpdate={(updated) => setObjective(updated)}
                onKeyResultsUpdate={() => load(false)}
                user={userForPermissions}
                effectiveRole={effectiveRole}
                viewerCount={viewerCount}
              />
            </>
          )}
        </div>
        {!loading && !error && objective && effectiveRole !== 'view_only' && (
          <div className="shrink-0 px-3 sm:px-4 py-4 border-t bg-muted/30">
            <WorkflowActions
              objective={objective}
              onUpdate={(updated) => setObjective(updated)}
              onError={(msg) => console.error(msg)}
              canSubmit={getOKRPermissions(userForPermissions, objective, keyResults).canSubmit}
              canApproveReject={getOKRPermissions(userForPermissions, objective, keyResults).canApproveReject}
              canResubmit={getOKRPermissions(userForPermissions, objective, keyResults).canResubmit}
              canReopen={getOKRPermissions(userForPermissions, objective, keyResults).canReopen}
            />
          </div>
        )}
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
