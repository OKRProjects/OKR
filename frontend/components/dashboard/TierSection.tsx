'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { OKRCard } from './OKRCard';
import type { Objective } from '@/lib/api';

interface TierSectionProps {
  title: string;
  objectives: Objective[];
  scoreByObjectiveId: Record<string, number>;
  defaultExpanded?: boolean;
  onOpenModal?: (objectiveId: string) => void;
}

const TIER_STYLES: Record<string, string> = {
  'Strategic (Annual)': 'border-violet-200/60 bg-violet-50/40 dark:border-violet-800/40 dark:bg-violet-950/20',
  'Divisional (Annual)': 'border-blue-200/60 bg-blue-50/40 dark:border-blue-800/40 dark:bg-blue-950/20',
  'Tactical (Quarterly)': 'border-emerald-200/60 bg-emerald-50/40 dark:border-emerald-800/40 dark:bg-emerald-950/20',
  'Objectives you own': 'border-primary/30 bg-primary/5',
};

export function TierSection({
  title,
  objectives,
  scoreByObjectiveId,
  defaultExpanded = true,
  onOpenModal,
}: TierSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const tierStyle = TIER_STYLES[title] ?? 'border-border bg-muted/30';

  return (
    <section className={`rounded-xl border overflow-hidden ${tierStyle}`}>
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-3.5 text-left font-semibold transition-colors hover:opacity-90"
        onClick={() => setExpanded((e) => !e)}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="text-[15px]">{title}</span>
        <span className="rounded-full bg-muted-foreground/15 px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {objectives.length}
        </span>
      </button>
      {expanded && (
        <div className="border-t border-border/60 p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {objectives.map((obj) => (
            <OKRCard
              key={obj._id}
              objective={obj}
              averageScore={obj._id ? scoreByObjectiveId[obj._id] ?? null : null}
              onOpenModal={onOpenModal}
            />
          ))}
        </div>
      )}
    </section>
  );
}
