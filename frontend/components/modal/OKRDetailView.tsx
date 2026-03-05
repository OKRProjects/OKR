'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OverviewTab } from './tabs/OverviewTab';
import { ProgressTab } from './tabs/ProgressTab';
import { UpdatesTab } from './tabs/UpdatesTab';
import { HistoryTab } from './tabs/HistoryTab';
import { DependenciesTab } from './tabs/DependenciesTab';
import { FilesTab } from './tabs/FilesTab';
import { useViewPreferences } from '@/lib/useViewPreferences';
import { getOKRPermissions, type OKRPermissions } from '@/lib/permissions';
import type { User } from '@/lib/auth';
import type { Objective, KeyResult } from '@/lib/api';

const TAB_IDS = ['overview', 'progress', 'updates', 'history', 'dependencies', 'files'] as const;
const TAB_LABELS: Record<(typeof TAB_IDS)[number], string> = {
  overview: 'Overview',
  progress: 'Progress',
  updates: 'Updates',
  history: 'History',
  dependencies: 'Dependencies',
  files: 'Files',
};

interface OKRDetailViewProps {
  objective: Objective;
  keyResults: KeyResult[];
  onObjectiveUpdate: (updated: Objective) => void;
  onKeyResultsUpdate?: () => void;
  /** Current user (for permission gating). */
  user?: User | null;
  /** effectiveRole from ViewRoleContext (view_only vs developer) for read-only override. */
  effectiveRole?: string;
  /** Number of current viewers (for presence). Show "N others viewing" when > 1. */
  viewerCount?: number;
}

export function OKRDetailView({
  objective,
  keyResults,
  onObjectiveUpdate,
  onKeyResultsUpdate,
  user,
  effectiveRole,
  viewerCount,
}: OKRDetailViewProps) {
  const isViewOnly = effectiveRole === 'view_only';
  const permissions: OKRPermissions = getOKRPermissions(user ?? null, objective, keyResults);
  const { preferences, updatePreferences } = useViewPreferences();
  const visibleTabIds = TAB_IDS.filter((id) => preferences.visibleTabs[id] !== false);
  const defaultTab = visibleTabIds.includes(preferences.lastDetailTab as (typeof TAB_IDS)[number])
    ? preferences.lastDetailTab
    : visibleTabIds[0] ?? 'overview';
  const [activeTab, setActiveTab] = useState<(typeof TAB_IDS)[number]>(defaultTab as (typeof TAB_IDS)[number]);
  const touchStartX = useRef<number | null>(null);

  // When visible tabs change and current tab is hidden, switch to first visible
  useEffect(() => {
    if (visibleTabIds.length && !visibleTabIds.includes(activeTab)) {
      setActiveTab((visibleTabIds[0] ?? 'overview') as (typeof TAB_IDS)[number]);
    }
  }, [visibleTabIds.join(','), activeTab]);

  // Restore last-selected tab from preferences when they first load (run once when defaultTab becomes available)
  const appliedDefaultRef = useRef(false);
  useEffect(() => {
    if (appliedDefaultRef.current || !defaultTab || !visibleTabIds.includes(defaultTab as (typeof TAB_IDS)[number])) return;
    appliedDefaultRef.current = true;
    setActiveTab(defaultTab as (typeof TAB_IDS)[number]);
  }, [defaultTab, visibleTabIds]);

  const handleTabChange = useCallback(
    (value: string) => {
      const tab = value as (typeof TAB_IDS)[number];
      setActiveTab(tab);
      updatePreferences({ lastDetailTab: tab });
    },
    [updatePreferences]
  );

  const goToTab = useCallback(
    (dir: 1 | -1) => {
      setActiveTab((current) => {
        const idx = visibleTabIds.indexOf(current);
        const next = Math.max(0, Math.min(visibleTabIds.length - 1, idx + dir));
        const nextTab = visibleTabIds[next];
        if (nextTab) updatePreferences({ lastDetailTab: nextTab });
        return nextTab ?? current;
      });
    },
    [visibleTabIds, updatePreferences]
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current == null) return;
      const endX = e.changedTouches[0].clientX;
      const delta = touchStartX.current - endX;
      touchStartX.current = null;
      const threshold = 50;
      if (delta > threshold) goToTab(1);
      else if (delta < -threshold) goToTab(-1);
    },
    [goToTab]
  );

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Mobile: dropdown tab selector (44px touch target) */}
        <div className="md:hidden mb-3 flex-1 min-w-0">
          <Select value={activeTab} onValueChange={handleTabChange}>
            <SelectTrigger className="w-full min-h-[44px] text-base" aria-label="Select tab">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {visibleTabIds.map((id) => (
                <SelectItem key={id} value={id} className="min-h-[44px] flex items-center">
                  {TAB_LABELS[id]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Desktop: horizontal tabs */}
        <TabsList className="hidden md:flex flex-wrap h-auto gap-1 min-h-[44px] [&>button]:min-h-[44px] [&>button]:px-3 flex-1">
          {visibleTabIds.map((id) => (
            <TabsTrigger key={id} value={id} className="min-h-[44px]">
              {TAB_LABELS[id]}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {/* Swipeable content area for mobile */}
      <div
        className="mt-4 touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'pan-y' }}
      >
        {visibleTabIds.includes('overview') && (
          <TabsContent value="overview" className="mt-0">
            <OverviewTab
              objective={objective}
              keyResults={keyResults}
              onObjectiveUpdate={onObjectiveUpdate}
              readOnly={isViewOnly}
              canSubmit={permissions.canSubmit}
              canApproveReject={permissions.canApproveReject}
              canResubmit={permissions.canResubmit}
            />
          </TabsContent>
        )}
        {visibleTabIds.includes('progress') && (
          <TabsContent value="progress" className="mt-0">
            <ProgressTab
              objective={objective}
              keyResults={keyResults}
              onKeyResultsUpdate={onKeyResultsUpdate}
              readOnly={isViewOnly}
              canEditKr={permissions.canEditKr}
            />
          </TabsContent>
        )}
        {visibleTabIds.includes('updates') && (
          <TabsContent value="updates" className="mt-0">
            <UpdatesTab objective={objective} readOnly={isViewOnly || !permissions.canEditObjective} />
          </TabsContent>
        )}
        {visibleTabIds.includes('history') && (
          <TabsContent value="history" className="mt-0">
            <HistoryTab
            objective={objective}
            eventTypeFilter={preferences.historyEventTypeFilter}
            onEventTypeFilterChange={(v) => updatePreferences({ historyEventTypeFilter: v })}
          />
          </TabsContent>
        )}
        {visibleTabIds.includes('dependencies') && (
          <TabsContent value="dependencies" className="mt-0">
            <DependenciesTab
              objective={objective}
              onObjectiveUpdate={onObjectiveUpdate}
              readOnly={isViewOnly || !permissions.canEditObjective}
            />
          </TabsContent>
        )}
        {visibleTabIds.includes('files') && (
          <TabsContent value="files" className="mt-0">
            <FilesTab
              objective={objective}
              keyResults={keyResults}
              readOnly={isViewOnly || !permissions.canEditObjective}
            />
          </TabsContent>
        )}
      </div>
    </Tabs>
  );
}
