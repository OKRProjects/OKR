'use client';

import { PresentationMode } from '@/components/presentation/PresentationMode';
import { PresentationChoiceDialog } from '@/components/presentation/PresentationChoiceDialog';
import { DashboardHeader } from './DashboardHeader';
import { ExportDropdown } from './ExportDropdown';
import { FilterBar } from './FilterBar';
import { TierSection } from './TierSection';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/UserMenu';
import { HelpCircle, ClipboardCheck, Users } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/shared/EmptyState';
import { TutorialOverlay } from '@/components/shared/TutorialOverlay';
import { getDashboardTutorialSteps } from '@/lib/tutorial';
import type { DashboardViewProps } from './dashboardShared';

export function FullDashboardView(props: DashboardViewProps) {
  const {
    role,
    filteredAndSorted,
    objectives,
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
    presentationChoiceOpen = false,
    onClosePresentationChoice,
    onSelectInfoOnly,
    onStartWithNarrative,
    generatePresentationStory,
    presentationNarrative = null,
    setPresentationNarrative,
    needsReviewObjectives = [],
    myWorkObjectives = [],
    onExportPresentationPowerPoint,
    onExportPresentationGoogleSlides,
    onPresentationMode,
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
    currentUserName,
  } = props;

  const quarterLabel = `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`;

  return (
    <div className="min-h-full bg-gray-50">
      {presentationChoiceOpen && onSelectInfoOnly && onStartWithNarrative && generatePresentationStory && (
        <PresentationChoiceDialog
          open={presentationChoiceOpen}
          onClose={onClosePresentationChoice ?? (() => {})}
          objectiveIds={presentationSlides
            .filter((s): s is { type: 'objective'; objective: { _id?: string } } => s.type === 'objective')
            .map((s) => s.objective._id)
            .filter((id): id is string => Boolean(id))}
          onInfoOnly={onSelectInfoOnly}
          onStartWithNarrative={onStartWithNarrative}
          generateStory={generatePresentationStory}
          disabled={presentationSlides.length === 0}
        />
      )}
      {presentationActive && presentationSlides.length > 0 && (
        <PresentationMode
          slides={presentationSlides}
          currentIndex={Math.min(presentationIndex, presentationSlides.length - 1)}
          onClose={() => {
            setPresentationActive(false);
            setPresentationIndex(0);
            setPresentationNarrative?.(null);
          }}
          onPrev={() => setPresentationIndex((i) => Math.max(0, i - 1))}
          onNext={() =>
            setPresentationIndex((i) => Math.min(presentationSlides.length - 1, i + 1))
          }
          onGoToSlide={setPresentationIndex}
          onExportPowerPoint={onExportPresentationPowerPoint}
          onExportGoogleSlides={onExportPresentationGoogleSlides}
          narrative={presentationNarrative ?? undefined}
        />
      )}

      {/* Reference-style header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">OKR Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">{quarterLabel} • {currentUserName ?? 'User'}</p>
            </div>
            <div className="flex items-center gap-2">
              {role === 'admin' && (
                <Link
                  href="/admin/users"
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                >
                  <Users className="h-4 w-4" />
                  User management
                </Link>
              )}
              {onShowTutorial && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTutorial?.(true) ?? onShowTutorial()}
                  className="h-9 text-gray-600 hover:text-gray-900"
                >
                  <HelpCircle className="mr-1.5 h-4 w-4" />
                  Tour
                </Button>
              )}
              {onExport && (
                <ExportDropdown
                  onExport={onExport}
                  onExportGoogleSlides={onExportGoogleSlides}
                  onPresentationMode={onPresentationMode ?? (() => { setPresentationIndex(0); setPresentationActive(true); })}
                  exporting={exporting}
                  exportingSlides={exportingSlides}
                  disabled={filteredAndSorted.length === 0}
                />
              )}
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <DashboardHeader
          variant="reference"
          role={role}
          totalObjectives={stats.totalObjectives}
          averageScore={stats.averageScore}
          onTrackPercent={stats.onTrackPercent}
          daysLeftInQuarter={stats.daysLeftInQuarter}
        />
        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          divisions={divisions}
          departments={departments}
          viewPreferences={viewPreferences}
          variant="reference"
        />
        <div className="space-y-6 mt-6">
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
                variant="reference"
              />
            </div>
          )}
          {myWorkObjectives.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">My work</h2>
              <TierSection
                title="Objectives you own"
                objectives={myWorkObjectives}
                scoreByObjectiveId={scoreByObjectiveId}
                defaultExpanded
                variant="reference"
              />
            </div>
          )}
          <TierSection
            title="Objectives"
            objectives={filteredAndSorted}
            scoreByObjectiveId={scoreByObjectiveId}
            keyResultsByObjective={keyResultsByObjective}
            departments={departments}
            userNames={userNames}
            defaultExpanded
            variant="reference"
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
          action={objectives.length === 0 ? { label: 'Create objective', onClick: () => (window.location.href = '/okrs/new') } : undefined}
          secondaryLink={objectives.length === 0 ? { label: 'Learn more about OKRs', href: '/docs#okrs' } : undefined}
        />
      )}
      {((showTutorial ?? false) || (shouldShowTutorial && filteredAndSorted.length > 0)) && onDismissTutorial && (
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
    </div>
  );
}
