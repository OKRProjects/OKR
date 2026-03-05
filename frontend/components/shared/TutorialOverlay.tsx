'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { TutorialStep } from '@/lib/tutorial';

export interface TutorialOverlayProps {
  steps: TutorialStep[];
  onDismiss: () => void;
  /** e.g. "Dashboard" or "New OKR" */
  contextName: string;
}

export function TutorialOverlay({ steps, onDismiss, contextName }: TutorialOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      onDismiss();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const handleSkip = () => {
    onDismiss();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
      aria-describedby="tutorial-body"
    >
      <div className="relative max-w-md rounded-lg border bg-card p-5 shadow-lg">
        <button
          type="button"
          onClick={handleSkip}
          className="absolute right-3 top-3 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Skip tutorial"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="pr-8">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{contextName} · Step {stepIndex + 1} of {steps.length}</p>
          <h2 id="tutorial-title" className="mt-1 text-lg font-semibold">{step.title}</h2>
          <p id="tutorial-body" className="mt-2 text-sm text-muted-foreground">{step.body}</p>
        </div>
        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Skip tutorial
          </button>
          <Button onClick={handleNext}>
            {isLast ? 'Got it' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
