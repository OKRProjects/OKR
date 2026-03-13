'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { api, Objective, KeyResult } from '@/lib/api';
import { type PresentationSlide, type ObjectiveSlide, type NarrativeSlide } from '@/components/presentation/PresentationMode';
import { defaultFilters, type DashboardFilters } from './FilterBar';
import { useFirstTimeTutorial } from '@/lib/tutorial';
import { useViewPreferences } from '@/lib/useViewPreferences';
import { useViewRole } from '@/lib/ViewRoleContext';
import { filterObjective, getDaysLeftInQuarter, getVisibleObjectivesByRole, type DashboardViewProps } from './dashboardShared';
import { FullDashboardView } from './FullDashboardView';

export function OKRDashboard() {
  const { userForPermissions } = useViewRole();
  const user = userForPermissions;
  const role = user?.role;
  const fiscalYear = new Date().getFullYear();
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [keyResultsByObjective, setKeyResultsByObjective] = useState<Record<string, KeyResult[]>>({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters);
  const [presentationActive, setPresentationActive] = useState(false);
  const [presentationIndex, setPresentationIndex] = useState(0);
  const [presentationChoiceOpen, setPresentationChoiceOpen] = useState(false);
  const [presentationNarrative, setPresentationNarrative] = useState<string | null>(null);
  const { preferences, updatePreferences, resetToDefault } = useViewPreferences();
  const { shouldShowTutorial, dismissTutorial } = useFirstTimeTutorial('dashboard');
  const [showTutorial, setShowTutorial] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingSlides, setExportingSlides] = useState(false);
  const [departments, setDepartments] = useState<{ _id: string; name: string; color?: string }[]>([]);
  const [userNames, setUserNames] = useState<{ _id: string; name: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getDepartments().catch(() => []), api.getUserNames().catch(() => [])]).then(
      ([depts, names]) => {
        if (!cancelled) {
          setDepartments(depts);
          setUserNames(names);
        }
      }
    );
    return () => { cancelled = true; };
  }, []);

  // Fetch objectives scoped by role/team: leader and view_only with departmentId see only their department
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const isScopedByDept =
          (role === 'leader' || role === 'view_only') && user?.departmentId;
        const objs = await api.getObjectives({
          fiscalYear,
          ...(isScopedByDept ? { departmentId: user!.departmentId! } : {}),
        });
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
  }, [fiscalYear, role, user?.departmentId]);

  const scoreByObjectiveId = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [oid, krs] of Object.entries(keyResultsByObjective)) {
      if (krs.length === 0) continue;
      const sum = krs.reduce((s, kr) => s + (kr.score ?? 0), 0);
      out[oid] = sum / krs.length;
    }
    return out;
  }, [keyResultsByObjective]);

  const visibleObjectives = useMemo(
    () =>
      getVisibleObjectivesByRole(objectives, keyResultsByObjective, user, role ?? ''),
    [objectives, keyResultsByObjective, user, role]
  );

  const filtered = useMemo(() => {
    return visibleObjectives.filter((o) => filterObjective(o, scoreByObjectiveId, filters));
  }, [visibleObjectives, scoreByObjectiveId, filters]);

  const filteredAndSorted = useMemo(() => {
    let list = [...filtered];
    const sort = preferences.dashboardSort;
    const dir = preferences.dashboardSortDirection;
    const cutoff =
      preferences.dashboardFilterUpdateType === 'recent'
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
  }, [
    filtered,
    preferences.dashboardSort,
    preferences.dashboardSortDirection,
    preferences.dashboardFilterUpdateType,
    scoreByObjectiveId,
  ]);

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

  const needsReviewObjectives = useMemo(() => {
    if (role !== 'leader' || !user?.departmentId) return [];
    return visibleObjectives.filter(
      (o) =>
        (o.status ?? 'draft') === 'in_review' &&
        (o.departmentId === user.departmentId || String(o.departmentId) === user.departmentId)
    );
  }, [visibleObjectives, role, user?.departmentId]);

  const myObjectivesCount = useMemo(() => {
    if (!user?.sub) return 0;
    return visibleObjectives.filter((o) => o.ownerId === user.sub).length;
  }, [visibleObjectives, user?.sub]);

  const myWorkObjectives = useMemo(() => {
    if (role !== 'standard' && role !== 'developer') return [];
    if (!user?.sub) return [];
    return filteredAndSorted.filter((o) => o.ownerId === user.sub);
  }, [role, user?.sub, filteredAndSorted]);

  const departmentStats = useMemo(() => {
    if (role !== 'leader' || !user?.departmentId) return null;
    const dept = visibleObjectives.filter(
      (o) =>
        o.departmentId === user.departmentId || String(o.departmentId) === user.departmentId
    );
    const withScores = dept.filter((o) => o._id && scoreByObjectiveId[o._id] !== undefined);
    const onTrack = withScores.filter(
      (o) => o._id && (scoreByObjectiveId[o._id] ?? 0) >= 0.7
    ).length;
    const onTrackPct = withScores.length > 0 ? (onTrack / withScores.length) * 100 : 0;
    return { count: dept.length, onTrackPercent: onTrackPct };
  }, [visibleObjectives, role, user?.departmentId, scoreByObjectiveId]);

  const handleSortChange = useCallback(
    (sort: 'score' | 'owner' | 'updated', direction: 'asc' | 'desc') => {
      updatePreferences({ dashboardSort: sort, dashboardSortDirection: direction });
    },
    [updatePreferences]
  );

  const presentationSlides = useMemo<PresentationSlide[]>(() => {
    const list = [...strategic, ...divisional, ...tactical];
    const quarter = Math.ceil((new Date().getMonth() + 1) / 3);
    const year = new Date().getFullYear();
    const titleSlide: PresentationSlide = {
      type: 'title',
      title: 'OKR Presentation',
      subtitle: `Q${quarter} ${year} • ${list.length} objective${list.length !== 1 ? 's' : ''}`,
    };
    const agendaSlide: PresentationSlide = {
      type: 'agenda',
      title: 'Stories we\'ll cover',
      items: list.map((o) => ({ title: o.title ?? 'Untitled' })),
    };
    const objectiveSlides: PresentationSlide[] = list.map((objective) => ({
      type: 'objective' as const,
      objective,
      score: objective._id ? (scoreByObjectiveId[objective._id] ?? null) : null,
      keyResults: objective._id ? (keyResultsByObjective[objective._id] ?? []) : [],
    }));
    const narrativeSlide: NarrativeSlide | null =
      presentationNarrative?.trim() ? { type: 'narrative', content: presentationNarrative.trim() } : null;
    return narrativeSlide
      ? [titleSlide, agendaSlide, narrativeSlide, ...objectiveSlides]
      : [titleSlide, agendaSlide, ...objectiveSlides];
  }, [strategic, divisional, tactical, scoreByObjectiveId, keyResultsByObjective, presentationNarrative]);

  const handleExport = useCallback(
    async (format: 'json' | 'xlsx' | 'pdf') => {
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
    },
    [fiscalYear, filters]
  );

  const handleExportGoogleSlides = useCallback(async () => {
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
  }, [filteredAndSorted]);

  const objectiveIdsFromPresentation = useMemo(() => {
    return presentationSlides.filter((s): s is ObjectiveSlide => s.type === 'objective').map((s) => s.objective._id).filter(Boolean) as string[];
  }, [presentationSlides]);

  const handleOpenPresentationChoice = useCallback(() => {
    setPresentationIndex(0);
    setPresentationChoiceOpen(true);
  }, []);

  const handlePresentationInfoOnly = useCallback(() => {
    setPresentationNarrative(null);
    setPresentationIndex(0);
    setPresentationActive(true);
    setPresentationChoiceOpen(false);
  }, []);

  const handleStartWithNarrative = useCallback((story: string) => {
    setPresentationNarrative(story);
    setPresentationIndex(0);
    setPresentationActive(true);
    setPresentationChoiceOpen(false);
  }, []);

  const generatePresentationStory = useCallback(async () => {
    const { api } = await import('@/lib/api');
    const res = await api.generatePresentationStory(objectiveIdsFromPresentation);
    return res.story ?? '';
  }, [objectiveIdsFromPresentation]);

  const handleExportPresentationPowerPoint = useCallback(async () => {
    if (objectiveIdsFromPresentation.length === 0) return;
    try {
      await api.exportToPowerPoint(objectiveIdsFromPresentation, presentationNarrative);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'PowerPoint export failed');
    }
  }, [objectiveIdsFromPresentation, presentationNarrative]);

  const handleExportPresentationGoogleSlides = useCallback(async () => {
    if (objectiveIdsFromPresentation.length === 0) return;
    try {
      const result = await api.exportToGoogleSlides({ objectiveIds: objectiveIdsFromPresentation });
      if (result?.link) window.open(result.link, '_blank');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Export failed';
      if (msg.includes('not connected') || msg.includes('not configured')) {
        alert('Connect your Google account in Integrations first.');
        window.location.href = '/integrations';
      } else {
        alert(msg);
      }
    }
  }, [objectiveIdsFromPresentation]);

  const divisions = useMemo(() => {
    const set = new Set<string>();
    visibleObjectives.forEach((o) => {
      if (o.division) set.add(o.division);
    });
    return Array.from(set).sort();
  }, [visibleObjectives]);

  const stats = useMemo(() => {
    const total = visibleObjectives.length;
    const allScores = visibleObjectives
      .map((o) => (o._id ? scoreByObjectiveId[o._id] : undefined))
      .filter((s): s is number => s !== undefined);
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
  }, [visibleObjectives, scoreByObjectiveId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  const viewPreferences: DashboardViewProps['viewPreferences'] =
    role === 'view_only'
      ? undefined
      : {
          sort: preferences.dashboardSort,
          sortDirection: preferences.dashboardSortDirection,
          onSortChange: handleSortChange,
          filterUpdateType: preferences.dashboardFilterUpdateType,
          onFilterUpdateTypeChange: (v) => updatePreferences({ dashboardFilterUpdateType: v }),
          onResetToDefault: resetToDefault,
        };

  const baseProps: DashboardViewProps = {
    role: role as DashboardViewProps['role'],
    objectives: visibleObjectives,
    strategic,
    divisional,
    tactical,
    filteredAndSorted,
    scoreByObjectiveId,
    keyResultsByObjective,
    stats,
    filters,
    setFilters,
    divisions,
    departments,
    userNames,
    presentationSlides,
    presentationActive,
    setPresentationActive,
    presentationIndex,
    setPresentationIndex,
    presentationChoiceOpen,
    onClosePresentationChoice: () => setPresentationChoiceOpen(false),
    onSelectInfoOnly: handlePresentationInfoOnly,
    onStartWithNarrative: handleStartWithNarrative,
    generatePresentationStory,
    presentationNarrative,
    setPresentationNarrative,
    needsReviewObjectives: role === 'leader' ? needsReviewObjectives : undefined,
    myObjectivesCount: role === 'standard' ? myObjectivesCount : undefined,
    myWorkObjectives: role === 'standard' ? myWorkObjectives : undefined,
    departmentStats: departmentStats ?? undefined,
    viewPreferences,
    onExport: role !== 'view_only' ? handleExport : undefined,
    onExportGoogleSlides: role !== 'view_only' ? handleExportGoogleSlides : undefined,
    onExportPresentationPowerPoint: role !== 'view_only' ? handleExportPresentationPowerPoint : undefined,
    onExportPresentationGoogleSlides: role !== 'view_only' ? handleExportPresentationGoogleSlides : undefined,
    onPresentationMode: handleOpenPresentationChoice,
    exporting,
    exportingSlides,
    onShowTutorial: role !== 'view_only' ? () => {} : undefined,
    shouldShowTutorial,
    onDismissTutorial: dismissTutorial,
    showTutorial,
    setShowTutorial,
    currentUserName: user?.name ?? user?.email ?? 'User',
  };

  // Use admin (FullDashboardView) layout for all roles so design is consistent; filtering handles role-specific data.
  return <FullDashboardView {...baseProps} />;
}
