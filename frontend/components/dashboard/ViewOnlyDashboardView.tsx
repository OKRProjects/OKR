'use client';

import { OKRModal } from '@/components/modal/OKRModal';
import { PresentationMode } from '@/components/presentation/PresentationMode';
import { DashboardHeader } from './DashboardHeader';
import { FilterBar } from './FilterBar';
import { TierSection } from './TierSection';
import { Button } from '@/components/ui/button';
import { Presentation } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import type { DashboardViewProps } from './dashboardShared';

export function ViewOnlyDashboardView(props: DashboardViewProps) {
  const {
    role,
    strategic,
    divisional,
    tactical,
    filteredAndSorted,
    objectives,
    scoreByObjectiveId,
    stats,
    filters,
    setFilters,
    divisions,
    modalObjectiveId,
    setModalObjectiveId,
    presentationSlides,
    presentationActive,
    setPresentationActive,
    presentationIndex,
    setPresentationIndex,
  } = props;

  return (
    <div className="space-y-6">
      {modalObjectiveId && (
        <OKRModal objectiveId={modalObjectiveId} onClose={() => setModalObjectiveId(null)} />
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
        role={role}
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
          minimal
        />
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
          title={
            objectives.length === 0 ? 'No objectives yet' : 'No objectives match your filters'
          }
          description={
            objectives.length === 0
              ? 'Create your first objective to get started. Use the OKRs page to add strategic, divisional, or tactical objectives.'
              : 'Try changing or clearing filters to see more objectives.'
          }
          secondaryLink={
            objectives.length === 0
              ? { label: 'Learn more about OKRs', href: '/docs#okrs' }
              : undefined
          }
        />
      )}
    </div>
  );
}
