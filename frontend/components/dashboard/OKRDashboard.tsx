'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { api, Objective, KeyResult } from '@/lib/api';
import { OKRModal } from '@/components/modal/OKRModal';
import { PresentationMode, type PresentationSlide } from '@/components/presentation/PresentationMode';
import { DashboardHeader } from './DashboardHeader';
import { FilterBar, defaultFilters, type DashboardFilters } from './FilterBar';
import { TierSection } from './TierSection';
import { Button } from '@/components/ui/button';
import { Presentation, HelpCircle, Download } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { TutorialOverlay } from '@/components/shared/TutorialOverlay';
import { useFirstTimeTutorial, getDashboardTutorialSteps } from '@/lib/tutorial';
import { useViewPreferences } from '@/lib/useViewPreferences';

function getDaysLeftInQuarter(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const q = Math.floor(month / 3) + 1;
  const quarterEnd = new Date(year, q * 3, 0);
  const diff = quarterEnd.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function filterObjective(
  obj: Objective,
  scoreMap: Record<string, number>,
  filters: DashboardFilters
): boolean {
  if (filters.search) {
    const q = filters.search.toLowerCase();
    if (
      !obj.title?.toLowerCase().includes(q) &&
      !obj.description?.toLowerCase().includes(q) &&
      !obj.division?.toLowerCase().includes(q)
    ) {
      return false;
    }
  }
  if (filters.tier !== 'all' && obj.level !== filters.tier) return false;
  if (filters.division !== 'all' && obj.division !== filters.division) return false;
  if (filters.status !== 'all' && (obj.status ?? 'draft') !== filters.status) return false;
  if (filters.scoreRange !== 'all' && obj._id) {
    const s = scoreMap[obj._id] ?? 0;
    if (filters.scoreRange === 'on_track' && s < 0.7) return false;
    if (filters.scoreRange === 'at_risk' && (s < 0.4 || s >= 0.7)) return false;
    if (filters.scoreRange === 'off_track' && s >= 0.4) return false;
  }
  return true;
}

export function OKRDashboard() {
  const fiscalYear = new Date().getFullYear();
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [keyResultsByObjective, setKeyResultsByObjective] = useState<Record<string, KeyResult[]>>({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters);
  const [modalObjectiveId, setModalObjectiveId] = useState<string | null>(null);
  const [presentationActive, setPresentationActive] = useState(false);
  const [presentationIndex, setPresentationIndex] = useState(0);
  const { preferences, updatePreferences, resetToDefault } = useViewPreferences();
  const { shouldShowTutorial, dismissTutorial } = useFirstTimeTutorial('dashboard');
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const objs = await api.getObjectives({ fiscalYear });
        if (cancelled) return;
        setObjectives(objs);
        const krMap: Record<string, KeyResult[]> = {};
        await Promise.all(
          objs.map(async (o) => {
            if (!o._id) return;
            try {
              const krs = await api.getKeyResults(o._id);
              if (!cancelled) krMap[o._id] = krs;
            } catch {
              // ignore
            }
          })
        );
        if (!cancelled) setKeyResultsByObjective(krMap);
      } catch (e) {
        console.error('Failed to load dashboard data', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    setLoading(true);
    load();
    return () => {
      cancelled = true;
    };
  }, [fiscalYear]);

  const scoreByObjectiveId = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [oid, krs] of Object.entries(keyResultsByObjective)) {
      if (krs.length === 0) continue;
      const sum = krs.reduce((s, kr) => s + (kr.score ?? 0), 0);
      out[oid] = sum / krs.length;
    }
    return out;
  }, [keyResultsByObjective]);

  const filtered = useMemo(() => {
    return objectives.filter((o) => filterObjective(o, scoreByObjectiveId, filters));
  }, [objectives, scoreByObjectiveId, filters]);

  const filteredAndSorted = useMemo(() => {
    let list = [...filtered];
    const sort = preferences.dashboardSort;
    const dir = preferences.dashboardSortDirection;
    const cutoff = preferences.dashboardFilterUpdateType === 'recent'
      ? Date.now() - 7 * 24 * 60 * 60 * 1000
      : 0;
    if (cutoff > 0) {
      list = list.filter((o) => {
        const u = o.updatedAt ? new Date(o.updatedAt).getTime() : 0;
        return u >= cutoff;
      });
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sort === 'score') {
        const sa = a._id ? (scoreByObjectiveId[a._id] ?? 0) : 0;
        const sb = b._id ? (scoreByObjectiveId[b._id] ?? 0) : 0;
        cmp = sa - sb;
      } else if (sort === 'owner') {
        const oa = (a.ownerId ?? '').toLowerCase();
        const ob = (b.ownerId ?? '').toLowerCase();
        cmp = oa.localeCompare(ob);
      } else {
        const ua = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const ub = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        cmp = ua - ub;
      }
      return dir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filtered, preferences.dashboardSort, preferences.dashboardSortDirection, preferences.dashboardFilterUpdateType, scoreByObjectiveId]);

  const strategic = useMemo(
    () => filteredAndSorted.filter((o) => o.level === 'strategic' && !o.parentObjectiveId),
    [filteredAndSorted]
  );
  const divisional = useMemo(
    () => filteredAndSorted.filter((o) => o.level === 'functional'),
    [filteredAndSorted]
  );
  const tactical = useMemo(
    () => filteredAndSorted.filter((o) => o.level === 'tactical'),
    [filteredAndSorted]
  );

  const handleSortChange = useCallback(
    (sort: 'score' | 'owner' | 'updated', direction: 'asc' | 'desc') => {
      updatePreferences({ dashboardSort: sort, dashboardSortDirection: direction });
    },
    [updatePreferences]
  );

  const presentationSlides = useMemo<PresentationSlide[]>(() => {
    const list = [...strategic, ...divisional, ...tactical];
    return list.map((objective) => ({
      objective,
      score: objective._id ? (scoreByObjectiveId[objective._id] ?? null) : null,
      keyResults: objective._id ? (keyResultsByObjective[objective._id] ?? []) : [],
    }));
  }, [strategic, divisional, tactical, scoreByObjectiveId, keyResultsByObjective]);

  const [exporting, setExporting] = useState(false);
  const [exportingSlides, setExportingSlides] = useState(false);
  const handleExport = async (format: 'json' | 'xlsx' | 'pdf') => {
    setExporting(true);
    try {
      await api.exportObjectivesDownload({
        format,
        fiscalYear,
        level: filters.tier !== 'all' ? filters.tier : undefined,
        division: filters.division !== 'all' ? filters.division : undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        tree: format === 'json',
      });
    } catch (e) {
      console.error('Export failed', e);
      alert(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleExportGoogleSlides = async () => {
    const ids = filteredAndSorted.map((o) => o._id).filter(Boolean) as string[];
    if (ids.length === 0) {
      alert('No objectives to export.');
      return;
    }
    setExportingSlides(true);
    try {
      const result = await api.exportToGoogleSlides({ objectiveIds: ids });
      if (result?.link) window.open(result.link, '_blank');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Export failed';
      if (msg.includes('not connected') || msg.includes('not configured')) {
        alert('Connect your Google account in Integrations first.');
        window.location.href = '/integrations';
      } else {
        alert(msg);
      }
    } finally {
      setExportingSlides(false);
    }
  };

  const divisions = useMemo(() => {
    const set = new Set<string>();
    objectives.forEach((o) => {
      if (o.division) set.add(o.division);
    });
    return Array.from(set).sort();
  }, [objectives]);

  const stats = useMemo(() => {
    const allScores = Object.values(scoreByObjectiveId);
    const total = objectives.length;
    const avg =
      allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;
    const onTrackCount = allScores.filter((s) => s >= 0.7).length;
    const onTrackPct = allScores.length > 0 ? (onTrackCount / allScores.length) * 100 : 0;
    return {
      totalObjectives: total,
      averageScore: avg,
      onTrackPercent: onTrackPct,
      daysLeftInQuarter: getDaysLeftInQuarter(),
    };
  }, [objectives.length, scoreByObjectiveId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {modalObjectiveId && (
        <OKRModal
          objectiveId={modalObjectiveId}
          onClose={() => setModalObjectiveId(null)}
        />
      )}
      {presentationActive && presentationSlides.length > 0 && (
        <PresentationMode
          slides={presentationSlides}
          currentIndex={Math.min(presentationIndex, presentationSlides.length - 1)}
          onClose={() => {
            setPresentationActive(false);
            setPresentationIndex(0);
          }}
          onPrev={() => setPresentationIndex((i) => Math.max(0, i - 1))}
          onNext={() =>
            setPresentationIndex((i) => Math.min(presentationSlides.length - 1, i + 1))
          }
          onGoToSlide={setPresentationIndex}
        />
      )}
      <DashboardHeader
        totalObjectives={stats.totalObjectives}
        averageScore={stats.averageScore}
        onTrackPercent={stats.onTrackPercent}
        daysLeftInQuarter={stats.daysLeftInQuarter}
      />
      <div className="flex flex-wrap items-center gap-4">
        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          divisions={divisions}
          viewPreferences={{
            sort: preferences.dashboardSort,
            sortDirection: preferences.dashboardSortDirection,
            onSortChange: handleSortChange,
            filterUpdateType: preferences.dashboardFilterUpdateType,
            onFilterUpdateTypeChange: (v) => updatePreferences({ dashboardFilterUpdateType: v }),
            onResetToDefault: resetToDefault,
          }}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowTutorial(true)}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <HelpCircle className="mr-2 h-4 w-4" />
          Take the tour
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleExport('json')}
          disabled={exporting || filteredAndSorted.length === 0}
          className="shrink-0"
          title="Download as JSON (API dump)"
        >
          <Download className="mr-2 h-4 w-4" />
          JSON
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleExport('xlsx')}
          disabled={exporting || filteredAndSorted.length === 0}
          className="shrink-0"
          title="Download as Excel"
        >
          Excel
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleExport('pdf')}
          disabled={exporting || filteredAndSorted.length === 0}
          className="shrink-0"
          title="Download as PDF"
        >
          PDF
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportGoogleSlides}
          disabled={exportingSlides || filteredAndSorted.length === 0}
          className="shrink-0"
          title="Export to Google Slides"
        >
          Google Slides
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setPresentationIndex(0);
            setPresentationActive(true);
          }}
          disabled={filteredAndSorted.length === 0}
          className="shrink-0"
        >
          <Presentation className="mr-2 h-4 w-4" />
          Present
        </Button>
      </div>
      <div className="space-y-4">
        <TierSection
          title="Strategic (Annual)"
          objectives={strategic}
          scoreByObjectiveId={scoreByObjectiveId}
          defaultExpanded
          onOpenModal={setModalObjectiveId}
        />
        <TierSection
          title="Divisional (Annual)"
          objectives={divisional}
          scoreByObjectiveId={scoreByObjectiveId}
          defaultExpanded
          onOpenModal={setModalObjectiveId}
        />
        <TierSection
          title="Tactical (Quarterly)"
          objectives={tactical}
          scoreByObjectiveId={scoreByObjectiveId}
          defaultExpanded
          onOpenModal={setModalObjectiveId}
        />
      </div>
      {filteredAndSorted.length === 0 && (
        <EmptyState
          icon={objectives.length === 0 ? 'target' : 'filter'}
          title={objectives.length === 0 ? 'No objectives yet' : 'No objectives match your filters'}
          description={objectives.length === 0
            ? 'Create your first objective to get started. Use the OKRs page to add strategic, divisional, or tactical objectives.'
            : 'Try changing or clearing filters to see more objectives.'}
          action={objectives.length === 0 ? { label: 'Create objective', onClick: () => window.location.href = '/okrs/new' } : undefined}
          secondaryLink={objectives.length === 0 ? { label: 'Learn more about OKRs', href: '/docs#okrs' } : undefined}
        />
      )}
      {(showTutorial || (shouldShowTutorial && !modalObjectiveId && filteredAndSorted.length > 0)) && (
        <TutorialOverlay
          steps={getDashboardTutorialSteps()}
          contextName="Dashboard"
          onDismiss={() => { setShowTutorial(false); dismissTutorial(); }}
        />
      )}
    </div>
  );
}
