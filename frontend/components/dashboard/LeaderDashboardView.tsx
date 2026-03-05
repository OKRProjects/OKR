'use client';

import { OKRModal } from '@/components/modal/OKRModal';
import { PresentationMode } from '@/components/presentation/PresentationMode';
import { DashboardHeader } from './DashboardHeader';
import { FilterBar } from './FilterBar';
import { TierSection } from './TierSection';
import { Button } from '@/components/ui/button';
import { Presentation, HelpCircle, Download, ClipboardCheck } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { TutorialOverlay } from '@/components/shared/TutorialOverlay';
import { getDashboardTutorialSteps } from '@/lib/tutorial';
import type { DashboardViewProps } from './dashboardShared';

export function LeaderDashboardView(props: DashboardViewProps) {
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
    needsReviewObjectives = [],
    departmentStats,
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
        departmentStats={departmentStats}
      />
      {needsReviewObjectives.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200 mb-3">
            <ClipboardCheck className="h-4 w-4" />
            Needs your review
          </h2>
          <TierSection
            title="Pending review"
            objectives={needsReviewObjectives}
            scoreByObjectiveId={scoreByObjectiveId}
            defaultExpanded
            onOpenModal={setModalObjectiveId}
          />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          divisions={divisions}
          viewPreferences={viewPreferences}
        />
        {onShowTutorial && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTutorial?.(true) ?? onShowTutorial()}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <HelpCircle className="mr-2 h-4 w-4" />
            Take the tour
          </Button>
        )}
        {onExport && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport('json')}
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
              onClick={() => onExport('xlsx')}
              disabled={exporting || filteredAndSorted.length === 0}
              className="shrink-0"
              title="Download as Excel"
            >
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport('pdf')}
              disabled={exporting || filteredAndSorted.length === 0}
              className="shrink-0"
              title="Download as PDF"
            >
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onExportGoogleSlides}
              disabled={exportingSlides || filteredAndSorted.length === 0}
              className="shrink-0"
              title="Export to Google Slides"
            >
              Google Slides
            </Button>
          </>
        )}
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
          action={
            objectives.length === 0
              ? { label: 'Create objective', onClick: () => (window.location.href = '/okrs/new') }
              : undefined
          }
          secondaryLink={
            objectives.length === 0
              ? { label: 'Learn more about OKRs', href: '/docs#okrs' }
              : undefined
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
