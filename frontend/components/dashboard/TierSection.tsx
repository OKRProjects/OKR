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

export function TierSection({
  title,
  objectives,
  scoreByObjectiveId,
  defaultExpanded = true,
  onOpenModal,
}: TierSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <section className="border rounded-lg overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center gap-2 px-4 py-3 bg-muted/50 hover:bg-muted/70 text-left font-semibold"
        onClick={() => setExpanded((e) => !e)}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <span>{title}</span>
        <span className="text-sm font-normal text-muted-foreground">
          ({objectives.length})
        </span>
      </button>
      {expanded && (
        <div className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
