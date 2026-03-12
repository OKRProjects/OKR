'use client';

import { OKRModal } from '@/components/modal/OKRModal';
import { PresentationMode } from '@/components/presentation/PresentationMode';
import { DashboardHeader } from './DashboardHeader';
import { FilterBar } from './FilterBar';
import { TierSection } from './TierSection';
import { Button } from '@/components/ui/button';
import { Presentation, HelpCircle, Download } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { TutorialOverlay } from '@/components/shared/TutorialOverlay';
import { getDashboardTutorialSteps } from '@/lib/tutorial';
import type { DashboardViewProps } from './dashboardShared';

export function StandardDashboardView(props: DashboardViewProps) {
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
    myObjectivesCount,
    myWorkObjectives = [],
    viewPreferences,
    onExport,
    onExportGoogleSlides,
    exporting,
    exportingSlides,
    onShowTutorial,
    shouldShowTutorial,
    onDismissTutorial,
    showTutorial,
    setShowTutorial,
  } = props;

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
        role={role}
        totalObjectives={stats.totalObjectives}
        averageScore={stats.averageScore}
        onTrackPercent={stats.onTrackPercent}
        daysLeftInQuarter={stats.daysLeftInQuarter}
        myObjectivesCount={myObjectivesCount}
      />
      {myWorkObjectives.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold mb-3">My work</h2>
          <TierSection
            title="Objectives you own"
            objectives={myWorkObjectives}
            scoreByObjectiveId={scoreByObjectiveId}
            defaultExpanded
            onOpenModal={setModalObjectiveId}
          />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          divisions={divisions}
          viewPreferences={viewPreferences}
        />
        <div className="flex flex-wrap items-center gap-2">
          {onShowTutorial && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTutorial?.(true) ?? onShowTutorial()}
              className="h-9 text-muted-foreground hover:text-foreground"
            >
              <HelpCircle className="mr-1.5 h-4 w-4" />
              Tour
            </Button>
          )}
          {onExport && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport('json')}
                disabled={exporting || filteredAndSorted.length === 0}
                className="h-9 shrink-0"
                title="Download as JSON"
              >
                JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport('xlsx')}
                disabled={exporting || filteredAndSorted.length === 0}
                className="h-9 shrink-0"
                title="Download as Excel"
              >
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport('pdf')}
                disabled={exporting || filteredAndSorted.length === 0}
                className="h-9 shrink-0"
                title="Download as PDF"
              >
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onExportGoogleSlides}
                disabled={exportingSlides || filteredAndSorted.length === 0}
                className="h-9 shrink-0"
                title="Export to Google Slides"
              >
                Slides
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPresentationIndex(0);
              setPresentationActive(true);
            }}
            disabled={filteredAndSorted.length === 0}
            className="h-9 shrink-0"
          >
            <Presentation className="mr-1.5 h-4 w-4" />
            Present
          </Button>
        </div>
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
          description={
            objectives.length === 0
              ? 'Create your first objective to get started. Use the OKRs page to add strategic, divisional, or tactical objectives.'
              : 'Try changing or clearing filters to see more objectives.'
          }
          action={
            objectives.length === 0
              ? { label: 'Create objective', onClick: () => (window.location.href = '/okrs/new') }
              : undefined
          }
          secondaryLink={
            objectives.length === 0 ? { label: 'Learn more about OKRs', href: '/docs#okrs' } : undefined
          }
        />
      )}
      {((showTutorial ?? false) ||
        (shouldShowTutorial && !modalObjectiveId && filteredAndSorted.length > 0)) &&
        onDismissTutorial && (
          <TutorialOverlay
            steps={getDashboardTutorialSteps()}
            contextName="Dashboard"
            onDismiss={() => {
              setShowTutorial?.(false);
              onDismissTutorial();
            }}
          />
        )}
    </div>
  );
}
