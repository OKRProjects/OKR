'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScoreSlider } from '@/components/shared/ScoreSlider';
import { ScoreRing, getScoreStatusLabel } from '@/components/shared/ScoreRing';
import { api, ApiConflictError, type Objective, type KeyResult, type ScoreHistoryEntry } from '@/lib/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown, AlertTriangle, Pencil } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { InlineHelp } from '@/components/shared/InlineHelp';
import { EmptyState } from '@/components/shared/EmptyState';
import { toast } from 'sonner';

interface ProgressTabProps {
  objective: Objective;
  keyResults: KeyResult[];
  onKeyResultsUpdate?: () => void;
  readOnly?: boolean;
  /** When provided, per-KR edit permission (overrides readOnly for each KR). */
  canEditKr?: (kr: KeyResult) => boolean;
}

function KRProgressRow({
  kr,
  onUpdate,
  readOnly,
  index = 0,
  totalCount = 1,
  onFocusRow = () => {},
  focusedIndex = 0,
  objectiveUpdatedAt,
  rowButtonRef,
}: {
  kr: KeyResult;
  onUpdate: () => void;
  readOnly?: boolean;
  index?: number;
  totalCount?: number;
  onFocusRow?: (i: number) => void;
  focusedIndex?: number;
  objectiveUpdatedAt?: string;
  /** Parent registers row button for arrow-key focus management */
  rowButtonRef?: (el: HTMLButtonElement | null) => void;
}) {
  const rowRef = useRef<HTMLButtonElement | null>(null);
  const sliderContainerRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [score, setScore] = useState(kr.score ?? 0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ScoreHistoryEntry[]>([]);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<{ score: number; notes?: KeyResult['notes'] } | null>(null);

  useEffect(() => {
    setScore(kr.score ?? 0);
  }, [kr.score]);

  useEffect(() => {
    if (!kr._id || !expanded) return;
    api.getKeyResultHistory(kr._id).then(setHistory).catch(() => setHistory([]));
  }, [kr._id, expanded]);

  const buildPayload = (): { score: number; notes?: KeyResult['notes']; lastUpdatedAt?: string } => {
    const payload: { score: number; notes?: KeyResult['notes']; lastUpdatedAt?: string } = { score };
    if (notes.trim()) {
      const newNote = { text: notes.trim(), createdAt: new Date().toISOString() };
      const existing = Array.isArray(kr.notes) ? kr.notes : [];
      payload.notes = [...existing, newNote];
    }
    if (kr.lastUpdatedAt) payload.lastUpdatedAt = kr.lastUpdatedAt;
    return payload;
  };

  const handleSave = async (forceOverwrite = false) => {
    if (!kr._id) return;
    setLoading(true);
    setConflictOpen(false);
    setPendingPayload(null);
    try {
      const payload = buildPayload();
      if (forceOverwrite) delete payload.lastUpdatedAt;
      await api.updateKeyResult(kr._id, payload);
      setNotes('');
      onUpdate();
      toast.success('Score updated', { description: `Key result score saved.` });
      if (expanded) {
        const next = await api.getKeyResultHistory(kr._id);
        setHistory(next);
      }
    } catch (e) {
      if (e instanceof ApiConflictError && e.status === 409) {
        const p = buildPayload();
        setPendingPayload({ score: p.score, notes: p.notes });
        setConflictOpen(true);
      } else {
        const msg = e instanceof Error ? e.message : 'Failed to save';
        toast.error('Update failed', { description: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConflictReload = () => {
    setConflictOpen(false);
    setPendingPayload(null);
    onUpdate();
  };

  const handleConflictOverwrite = () => {
    if (pendingPayload && kr._id) {
      const payload = { ...pendingPayload };
      setPendingPayload(null);
      setConflictOpen(false);
      (async () => {
        setLoading(true);
        try {
          await api.updateKeyResult(kr._id!, payload);
          setNotes('');
          onUpdate();
          toast.success('Score updated');
          if (expanded) {
            const next = await api.getKeyResultHistory(kr._id!);
            setHistory(next);
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Update failed');
        } finally {
          setLoading(false);
        }
      })();
    }
  };

  const prevScore = history.length >= 2 ? history[history.length - 2].score : null;
  const delta = prevScore != null ? score - prevScore : null;
  const daysInQuarter = 90;
  const quarterStart = objectiveUpdatedAt ? new Date(objectiveUpdatedAt) : new Date(new Date().getFullYear(), 0, 1);
  const daysPassed = Math.max(0, (Date.now() - quarterStart.getTime()) / (1000 * 60 * 60 * 24));
  const expectedProgress = Math.min(1, daysPassed / daysInQuarter);
  const isBehind = score < expectedProgress || score < 0.4;
  const statusLabel = getScoreStatusLabel(score);
  const velocity = history.length >= 2 && history[0].recordedAt && history[history.length - 1].recordedAt
    ? (history[history.length - 1].score - history[0].score) / (new Date(history[history.length - 1].recordedAt).getTime() - new Date(history[0].recordedAt).getTime()) * (1000 * 60 * 60 * 24 * 7)
    : null;

  const quarterStartMs = quarterStart.getTime();
  const quarterEndMs = quarterStartMs + daysInQuarter * 24 * 60 * 60 * 1000;
  const chartData = history
    .map((h) => {
      const t = h.recordedAt ? new Date(h.recordedAt).getTime() : 0;
      const expected = Math.min(1, Math.max(0, (t - quarterStartMs) / (quarterEndMs - quarterStartMs)));
      return {
        date: h.recordedAt ? new Date(h.recordedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '',
        score: h.score,
        expected,
        pct: Math.round(h.score * 100),
      };
    })
    .slice(-20);

  const handleQuickUpdate = () => {
    setExpanded(true);
  };

  const setRowButtonRef = useCallback(
    (el: HTMLButtonElement | null) => {
      rowRef.current = el;
      rowButtonRef?.(el);
    },
    [rowButtonRef]
  );

  return (
    <Card className="overflow-hidden">
      <div className="w-full flex items-center gap-2 px-4 py-3 min-h-[44px]">
        <button
          type="button"
          ref={setRowButtonRef}
          tabIndex={focusedIndex === index ? 0 : -1}
          className="flex items-center gap-2 flex-1 min-w-0 text-left hover:bg-muted/50 active:bg-muted/70 touch-manipulation rounded -m-2 p-2"
          onClick={() => setExpanded((e) => !e)}
          onFocus={() => onFocusRow(index)}
          aria-expanded={expanded}
        >
          {expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
          <ScoreRing score={score} size={28} strokeWidth={3} />
          <span className="font-medium flex-1 truncate">{kr.title}</span>
          <span className={cn(
            'text-sm font-medium',
            score >= 0.7 ? 'text-green-600' : score >= 0.4 ? 'text-amber-600' : 'text-red-600'
          )}>
            {statusLabel}
          </span>
          {delta !== null && (
            <span className={cn('flex items-center gap-0.5 text-sm', delta >= 0 ? 'text-green-600' : 'text-red-600')}>
              {delta >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {(delta >= 0 ? '+' : '') + (delta * 100).toFixed(0)}%
            </span>
          )}
        </button>
        {!readOnly && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={(e) => { e.stopPropagation(); handleQuickUpdate(); }}
            title="Quick Update (expand and edit score)"
          >
            <Pencil className="h-4 w-4 mr-1" />
            Quick Update
          </Button>
        )}
      </div>
      {expanded && (
        <CardContent className="pt-0 border-t space-y-4">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSave();
              }
            }}
          >
          {isBehind && (
            <div className="flex items-center gap-2 text-amber-700 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                {score < expectedProgress
                  ? `Behind schedule — current ${(score * 100).toFixed(0)}% vs expected ${(expectedProgress * 100).toFixed(0)}% at this point.`
                  : 'Behind schedule — consider updating target or scope.'}
              </span>
            </div>
          )}
          {velocity != null && expanded && (
            <p className="text-xs text-muted-foreground">
              Velocity: ~{(velocity * 100).toFixed(1)}% per week (from history).
            </p>
          )}
          {!readOnly && (
            <>
              <InlineHelp learnMoreHref="/docs#scoring" className="mb-3">
                Score is 0–100% of target achieved. Update regularly so roll-ups and dashboards stay accurate. Use 10% steps.
              </InlineHelp>
              <div className="flex flex-wrap items-end gap-4">
                <div ref={sliderContainerRef} className="min-w-0 flex-1">
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Score (0–100%)</label>
                  <ScoreSlider value={score} onChange={setScore} disabled={loading} />
                </div>
                <Button type="submit" size="sm" disabled={loading} className="min-h-[44px] min-w-[44px] touch-manipulation" title="Save (Ctrl+Enter or Enter)">
                  {loading ? 'Saving…' : 'Save'}
                </Button>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add progress note..."
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </>
          )}
          {chartData.length > 0 && (
            <div className="h-[160px] sm:h-[200px] w-full min-w-0 -mx-1 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v * 100}%`} width={28} />
                  <Tooltip formatter={(v: number) => `${(Number(v) * 100).toFixed(0)}%`} />
                  <Line type="monotone" dataKey="score" name="Actual" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="expected" name="Expected" stroke="var(--muted-foreground)" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
                  <Legend />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {history.length === 0 && (
            <p className="text-sm text-muted-foreground">No score history yet. Save a score to see the trend.</p>
          )}
          </form>
        </CardContent>
      )}
      {conflictOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="conflict-title">
          <div className="bg-card border rounded-lg shadow-lg p-4 max-w-sm w-full space-y-3">
            <h3 id="conflict-title" className="font-semibold">Update conflict</h3>
            <p className="text-sm text-muted-foreground">
              This key result was updated by someone else. Reload to see their changes, or overwrite with your version?
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={handleConflictReload}>
                Reload
              </Button>
              <Button size="sm" onClick={handleConflictOverwrite}>
                Overwrite
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export function ProgressTab({
  objective,
  keyResults,
  onKeyResultsUpdate,
  readOnly,
  canEditKr,
}: ProgressTabProps) {
  const refresh = onKeyResultsUpdate ?? (() => {});
  const [focusedIndex, setFocusedIndex] = useState(0);
  const progressNavRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    rowRefs.current.length = keyResults.length;
  }, [keyResults.length]);

  useEffect(() => {
    const root = progressNavRef.current;
    if (!root || keyResults.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      const t = e.target as HTMLElement | null;
      if (!t || !root.contains(t)) return;
      if (t.tagName === 'TEXTAREA') return;
      if (t.closest('form')) return;
      if (t.closest('[role="slider"]')) return;
      if (t.tagName === 'INPUT' && (t as HTMLInputElement).type === 'range') return;
      e.preventDefault();
      setFocusedIndex((prev) => {
        const next =
          e.key === 'ArrowDown'
            ? Math.min(prev + 1, keyResults.length - 1)
            : Math.max(0, prev - 1);
        requestAnimationFrame(() => rowRefs.current[next]?.focus());
        return next;
      });
    };
    root.addEventListener('keydown', onKey);
    return () => root.removeEventListener('keydown', onKey);
  }, [keyResults.length]);

  return (
    <div className="space-y-4" ref={progressNavRef}>
      <Card>
        <CardHeader>
          <CardTitle>Key result progress</CardTitle>
          <p className="text-sm text-muted-foreground">
            Update scores (0.0–1.0), add notes, and view history. Expand a row to see the trend chart and expected vs actual.
          </p>
        </CardHeader>
      </Card>
      {keyResults.length === 0 ? (
        <EmptyState
          icon="target"
          title="No key results yet"
          description="Add key results to this objective to track progress. Each key result can have a score and notes."
          secondaryLink={{ label: 'Learn how to write good key results', href: '/docs#okrs' }}
        />
      ) : (
        <div className="space-y-2">
          {keyResults.map((kr, index) => (
            <KRProgressRow
              key={kr._id}
              kr={kr}
              onUpdate={refresh}
              readOnly={readOnly || (canEditKr ? !canEditKr(kr) : false)}
              index={index}
              totalCount={keyResults.length}
              onFocusRow={setFocusedIndex}
              focusedIndex={focusedIndex}
              objectiveUpdatedAt={objective.updatedAt ?? undefined}
              rowButtonRef={(el) => {
                rowRefs.current[index] = el;
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
