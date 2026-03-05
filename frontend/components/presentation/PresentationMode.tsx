'use client';

import { useEffect } from 'react';
import { ScoreRing, getScoreStatusLabel } from '@/components/shared/ScoreRing';
import { StatusPill } from '@/components/shared/StatusPill';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { Objective, KeyResult } from '@/lib/api';

export interface PresentationSlide {
  objective: Objective;
  score: number | null;
  keyResults: KeyResult[];
}

interface PresentationModeProps {
  slides: PresentationSlide[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onGoToSlide?: (index: number) => void;
}

export function PresentationMode({
  slides,
  currentIndex,
  onClose,
  onPrev,
  onNext,
  onGoToSlide,
}: PresentationModeProps) {
  const slide = slides[currentIndex];
  const total = slides.length;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < total - 1;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') hasPrev && onPrev();
      if (e.key === 'ArrowRight') hasNext && onNext();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  if (total === 0) return null;

  const score = slide.score ?? 0;
  const isAtRisk = score < 0.7 && score >= 0.4;
  const isOffTrack = score < 0.4;
  const statusLabel = getScoreStatusLabel(score);

  return (
    <div
      className="fixed inset-0 z-50 bg-background flex flex-col"
      role="presentation"
      aria-label="Executive presentation mode"
    >
      <div className="flex items-center justify-between shrink-0 px-6 py-3 border-b">
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Exit presentation">
          <X className="h-5 w-5" />
        </Button>
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} / {total}
        </span>
        <div className="flex gap-2">
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

      <div
        className="flex-1 flex flex-col items-center justify-center p-8 text-center"
        style={{
          ...(isAtRisk && { borderLeft: '4px solid rgb(245 158 11)' }),
          ...(isOffTrack && { borderLeft: '4px solid rgb(239 68 68)' }),
        }}
      >
        <div className="max-w-2xl w-full space-y-6">
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
      </div>

      <div className="shrink-0 px-6 py-2 border-t flex justify-center gap-2">
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
