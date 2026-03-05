import type { Objective } from '@/lib/api';
import type { DashboardFilters } from './FilterBar';
import type { DashboardRole } from './DashboardHeader';
import type { PresentationSlide } from '@/components/presentation/PresentationMode';

export function getDaysLeftInQuarter(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const q = Math.floor(month / 3) + 1;
  const quarterEnd = new Date(year, q * 3, 0);
  const diff = quarterEnd.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function filterObjective(
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

export interface DashboardStats {
  totalObjectives: number;
  averageScore: number;
  onTrackPercent: number;
  daysLeftInQuarter: number;
}

export interface DashboardViewProps {
  role: DashboardRole;
  objectives: Objective[];
  strategic: Objective[];
  divisional: Objective[];
  tactical: Objective[];
  filteredAndSorted: Objective[];
  scoreByObjectiveId: Record<string, number>;
  stats: DashboardStats;
  filters: DashboardFilters;
  setFilters: (f: DashboardFilters) => void;
  divisions: string[];
  modalObjectiveId: string | null;
  setModalObjectiveId: (id: string | null) => void;
  presentationSlides: PresentationSlide[];
  presentationActive: boolean;
  setPresentationActive: (v: boolean) => void;
  presentationIndex: number;
  setPresentationIndex: (value: number | ((prev: number) => number)) => void;
  /** Leader: objectives in_review in user's department */
  needsReviewObjectives?: Objective[];
  /** Standard: count of objectives owned by user */
  myObjectivesCount?: number;
  /** Standard: filtered objectives owned by user */
  myWorkObjectives?: Objective[];
  /** Leader: department count and on-track % */
  departmentStats?: { count: number; onTrackPercent: number };
  /** Full views only: sort/preferences and export */
  viewPreferences?: {
    sort: 'score' | 'owner' | 'updated';
    sortDirection: 'asc' | 'desc';
    onSortChange: (sort: 'score' | 'owner' | 'updated', direction: 'asc' | 'desc') => void;
    filterUpdateType: string;
    onFilterUpdateTypeChange: (value: string) => void;
    onResetToDefault: () => void;
  };
  onExport?: (format: 'json' | 'xlsx' | 'pdf') => Promise<void>;
  onExportGoogleSlides?: () => Promise<void>;
  exporting?: boolean;
  exportingSlides?: boolean;
  onShowTutorial?: () => void;
  shouldShowTutorial?: boolean;
  onDismissTutorial?: () => void;
  showTutorial?: boolean;
  setShowTutorial?: (v: boolean) => void;
}
