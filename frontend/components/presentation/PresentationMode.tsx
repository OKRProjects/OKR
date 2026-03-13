'use client';

import { useEffect, useState } from 'react';
import { ScoreRing, getScoreStatusLabel } from '@/components/shared/ScoreRing';
import { StatusPill } from '@/components/shared/StatusPill';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, FileDown, Presentation as PresentationIcon, FileText } from 'lucide-react';
import type { Objective, KeyResult } from '@/lib/api';

/** Title slide (story opening) */
export interface TitleSlide {
  type: 'title';
  title: string;
  subtitle?: string;
}

/** Agenda slide listing objectives (stories to cover) */
export interface AgendaSlide {
  type: 'agenda';
  title: string;
  items: { title: string }[];
}

/** AI-generated narrative / script slide (shown when user chose "Generate with AI") */
export interface NarrativeSlide {
  type: 'narrative';
  content: string;
}

/** Single objective slide */
export interface ObjectiveSlide {
  type: 'objective';
  objective: Objective;
  score: number | null;
  keyResults: KeyResult[];
}

export type PresentationSlide = TitleSlide | AgendaSlide | NarrativeSlide | ObjectiveSlide;

export function isObjectiveSlide(s: PresentationSlide): s is ObjectiveSlide {
  return s.type === 'objective';
}

interface PresentationModeProps {
  slides: PresentationSlide[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onGoToSlide?: (index: number) => void;
  /** Export current presentation to PowerPoint (objectives in slides). */
  onExportPowerPoint?: () => Promise<void>;
  /** Export current presentation to Google Slides. */
  onExportGoogleSlides?: () => Promise<void>;
  /** Optional AI-generated narrative; when set, show a "Story" button that opens a popout. */
  narrative?: string | null;
}

export function PresentationMode({
  slides,
  currentIndex,
  onClose,
  onPrev,
  onNext,
  onGoToSlide,
  onExportPowerPoint,
  onExportGoogleSlides,
  narrative,
}: PresentationModeProps) {
  const [exportingPptx, setExportingPptx] = useState(false);
  const [exportingSlides, setExportingSlides] = useState(false);
  const [storyPopoutOpen, setStoryPopoutOpen] = useState(false);
  const slide = slides[currentIndex];
  const total = slides.length;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < total - 1;
  const objectiveIds = slides.filter(isObjectiveSlide).map((s) => s.objective._id).filter(Boolean) as string[];
  const canExport = objectiveIds.length > 0;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (storyPopoutOpen) setStoryPopoutOpen(false);
        else onClose();
      }
      if (e.key === 'ArrowLeft') hasPrev && onPrev();
      if (e.key === 'ArrowRight') hasNext && onNext();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, onPrev, onNext, hasPrev, hasNext, storyPopoutOpen]);

  if (total === 0) return null;

  const handleExportPptx = async () => {
    if (!onExportPowerPoint || !canExport) return;
    setExportingPptx(true);
    try {
      await onExportPowerPoint();
    } finally {
      setExportingPptx(false);
    }
  };

  const handleExportGoogle = async () => {
    if (!onExportGoogleSlides || !canExport) return;
    setExportingSlides(true);
    try {
      await onExportGoogleSlides();
    } finally {
      setExportingSlides(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-background flex flex-col"
      role="presentation"
      aria-label="Executive presentation mode"
    >
      <div className="flex items-center justify-between shrink-0 px-6 py-3 border-b flex-wrap gap-2">
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Exit presentation">
          <X className="h-5 w-5" />
        </Button>
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} / {total}
        </span>
        <div className="flex items-center gap-2">
          {narrative && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStoryPopoutOpen(true)}
              className="gap-1.5"
              aria-label="Show narrative story"
            >
              <FileText className="h-4 w-4" />
              Story
            </Button>
          )}
          {onExportPowerPoint && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPptx}
              disabled={!canExport || exportingPptx}
              className="gap-1.5"
            >
              <FileDown className="h-4 w-4" />
              {exportingPptx ? 'Exporting…' : 'PowerPoint'}
            </Button>
          )}
          {onExportGoogleSlides && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportGoogle}
              disabled={!canExport || exportingSlides}
              className="gap-1.5"
            >
              <PresentationIcon className="h-4 w-4" />
              {exportingSlides ? 'Exporting…' : 'Google Slides'}
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={onPrev}
            disabled={!hasPrev}
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onNext}
            disabled={!hasNext}
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center overflow-auto">
        {slide.type === 'title' && (
          <div className="max-w-2xl w-full space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">{slide.title}</h1>
            {slide.subtitle && (
              <p className="text-xl text-muted-foreground">{slide.subtitle}</p>
            )}
          </div>
        )}

        {slide.type === 'agenda' && (
          <div className="max-w-2xl w-full space-y-6">
            <h2 className="text-2xl font-semibold text-muted-foreground">Today&apos;s stories</h2>
            <h1 className="text-3xl md:text-4xl font-bold">{slide.title}</h1>
            <ul className="text-left space-y-3 list-disc list-inside">
              {slide.items.map((item, i) => (
                <li key={i} className="text-lg">
                  {item.title}
                </li>
              ))}
            </ul>
          </div>
        )}

        {slide.type === 'narrative' && (
          <div className="max-w-3xl w-full text-left space-y-4">
            <h2 className="text-xl font-semibold text-muted-foreground">Presentation script</h2>
            <div className="text-lg leading-relaxed whitespace-pre-wrap text-gray-800 dark:text-gray-200">
              {slide.content}
            </div>
          </div>
        )}

        {slide.type === 'objective' && (() => {
          const score = slide.score ?? 0;
          const isAtRisk = score < 0.7 && score >= 0.4;
          const isOffTrack = score < 0.4;
          const statusLabel = getScoreStatusLabel(score);
          return (
            <div
              className="max-w-2xl w-full space-y-6"
              style={{
                ...(isAtRisk && { borderLeft: '4px solid rgb(245 158 11)' }),
                ...(isOffTrack && { borderLeft: '4px solid rgb(239 68 68)' }),
              }}
            >
              <div className="flex flex-wrap items-center justify-center gap-3">
                <StatusPill status={slide.objective.status ?? 'draft'} />
                <span className="text-sm text-muted-foreground capitalize">
                  {slide.objective.level}
                </span>
                {slide.objective.division && (
                  <span className="text-sm text-muted-foreground">
                    {slide.objective.division}
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold">
                {slide.objective.title}
              </h1>
              {slide.objective.ownerId && (
                <p className="text-muted-foreground">Owner: {slide.objective.ownerId}</p>
              )}

              <div className="flex justify-center">
                <ScoreRing score={score} size={120} strokeWidth={8} showLabel />
              </div>
              <p
                className={`text-lg font-semibold ${
                  score >= 0.7 ? 'text-green-600' : score >= 0.4 ? 'text-amber-600' : 'text-red-600'
                }`}
              >
                {statusLabel}
              </p>
              {slide.objective.quarter && (
                <p className="text-sm text-muted-foreground">
                  {slide.objective.quarter} · FY{slide.objective.fiscalYear}
                </p>
              )}

              {slide.keyResults.length > 0 && (
                <div className="mt-8 text-left space-y-4">
                  <h2 className="text-lg font-semibold text-center">Key results</h2>
                  <ul className="space-y-3">
                    {slide.keyResults.map((kr) => {
                      const krScore = kr.score ?? 0;
                      const pct = Math.round(krScore * 100);
                      const krAtRisk = krScore < 0.7;
                      return (
                        <li
                          key={kr._id}
                          className={`p-3 rounded-lg border ${
                            krAtRisk ? 'border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-medium text-sm">{kr.title}</span>
                            <span className="text-sm font-semibold">{pct}%</span>
                          </div>
                          <Progress value={pct} className="h-2" />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {storyPopoutOpen && narrative && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-label="Presentation narrative"
          onClick={() => setStoryPopoutOpen(false)}
        >
          <div
            className="relative z-10 max-w-2xl w-full max-h-[80vh] overflow-hidden rounded-xl border bg-white dark:bg-gray-900 shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between shrink-0 px-4 py-3 border-b">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">OKR narrative</h3>
              <Button variant="ghost" size="icon" onClick={() => setStoryPopoutOpen(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 text-gray-800 dark:text-gray-200 whitespace-pre-wrap text-sm leading-relaxed">
              {narrative}
            </div>
          </div>
        </div>
      )}

      <div className="shrink-0 px-6 py-2 border-t flex justify-center gap-2 flex-wrap">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onGoToSlide?.(i)}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === currentIndex ? 'bg-primary' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
