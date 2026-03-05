'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusPill } from '@/components/shared/StatusPill';
import { ScoreRing } from '@/components/shared/ScoreRing';
import { api, type Objective } from '@/lib/api';
import { Link2, Trash2, Search } from 'lucide-react';

interface DependenciesTabProps {
  objective: Objective;
  onObjectiveUpdate?: (updated: Objective) => void;
  readOnly?: boolean;
}

export function DependenciesTab({
  objective,
  onObjectiveUpdate,
  readOnly,
}: DependenciesTabProps) {
  const objectiveId = objective._id;
  const [upstream, setUpstream] = useState<Objective[]>([]);
  const [downstream, setDownstream] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [candidates, setCandidates] = useState<Objective[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const fiscalYear = objective.fiscalYear ?? new Date().getFullYear();

  const load = async () => {
    if (!objectiveId) return;
    setLoading(true);
    try {
      const { upstream: u, downstream: d } = await api.getDependencies(objectiveId);
      setUpstream(u);
      setDownstream(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [objectiveId]);

  const loadCandidates = async () => {
    try {
      const all = await api.getObjectives({ fiscalYear });
      const currentIds = new Set([
        objectiveId,
        ...(objective.relatedObjectiveIds ?? []),
        ...upstream.map((o) => o._id),
      ].filter(Boolean));
      setCandidates(all.filter((o) => o._id && !currentIds.has(o._id)));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddLink = async (id: string) => {
    if (!objectiveId || readOnly) return;
    const current = objective.relatedObjectiveIds ?? [];
    if (current.includes(id)) return;
    try {
      const updated = await api.updateObjective(objectiveId, {
        relatedObjectiveIds: [...current, id],
      });
      onObjectiveUpdate?.(updated);
      await load();
      setSearchOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveLink = async (id: string) => {
    if (!objectiveId || readOnly) return;
    const current = objective.relatedObjectiveIds ?? [];
    try {
      const updated = await api.updateObjective(objectiveId, {
        relatedObjectiveIds: current.filter((x) => x !== id),
      });
      onObjectiveUpdate?.(updated);
      await load();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredCandidates = searchQuery.trim()
    ? candidates.filter(
        (o) =>
          o.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.division?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : candidates;

  const DepCard = ({ dep, direction }: { dep: Objective; direction: 'upstream' | 'downstream' }) => {
    const score = dep.averageScore ?? null;
    const atRisk = score != null && score < 0.4;
    return (
      <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <ScoreRing score={score} size={28} strokeWidth={3} />
            {dep._id && (
              <a
                href={`/okrs/${dep._id}`}
                className="font-medium truncate hover:underline"
              >
                {dep.title}
              </a>
            )}
            {!dep._id && <span className="font-medium truncate">{dep.title}</span>}
            {atRisk && (
              <span className="text-xs font-medium text-amber-600 shrink-0">At risk</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-1 text-sm text-muted-foreground">
            {dep.division && <span>{dep.division}</span>}
            {dep.ownerId && <span>{dep.ownerId}</span>}
            <StatusPill status={dep.status ?? 'draft'} />
          </div>
        </div>
        {!readOnly && dep._id && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive min-h-[44px] min-w-[44px] touch-manipulation"
            onClick={() => handleRemoveLink(dep._id!)}
            aria-label="Remove link"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dependencies</CardTitle>
          <p className="text-sm text-muted-foreground">
            Upstream: objectives this relates to. Downstream: objectives that depend on this one.
          </p>
        </CardHeader>
        <CardContent>
          {!readOnly && (
            <div className="mb-4">
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px] touch-manipulation"
                onClick={() => {
                  setSearchOpen((o) => !o);
                  if (!searchOpen) loadCandidates();
                }}
              >
                <Link2 className="h-4 w-4 mr-2" />
                Link objective
              </Button>
              {searchOpen && (
                <div className="mt-3 p-3 border rounded-lg space-y-2 max-h-60 overflow-auto">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by title or division..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  {filteredCandidates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No other objectives to link.</p>
                  ) : (
                    <ul className="space-y-1">
                      {filteredCandidates.slice(0, 20).map((o) => (
                        <li key={o._id}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-left min-h-[44px] touch-manipulation"
                            onClick={() => o._id && handleAddLink(o._id)}
                          >
                            {o.title} {o.division && `(${o.division})`}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Upstream (this relates to)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {upstream.length === 0 ? (
                <p className="text-sm text-muted-foreground">None linked.</p>
              ) : (
                upstream.map((dep) => <DepCard key={dep._id} dep={dep} direction="upstream" />)
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Downstream (depends on this)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {downstream.length === 0 ? (
                <p className="text-sm text-muted-foreground">None.</p>
              ) : (
                downstream.map((dep) => <DepCard key={dep._id} dep={dep} direction="downstream" />)
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
