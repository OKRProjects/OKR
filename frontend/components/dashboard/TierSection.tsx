'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { OKRCard } from './OKRCard';
import type { Objective } from '@/lib/api';
import type { DepartmentInfo, UserNameInfo } from './dashboardShared';

interface TierSectionProps {
  title: string;
  objectives: Objective[];
  scoreByObjectiveId: Record<string, number>;
  keyResultsByObjective?: Record<string, { _id?: string }[]>;
  departments?: DepartmentInfo[];
  userNames?: UserNameInfo[];
  defaultExpanded?: boolean;
  onOpenModal?: (objectiveId: string) => void;
  /** Reference design: white card, gray-50 header, grid md:grid-cols-2 */
  variant?: 'default' | 'reference';
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
  keyResultsByObjective,
  departments,
  userNames,
  defaultExpanded = true,
  onOpenModal,
  variant = 'default',
}: TierSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const tierStyle = variant === 'reference' ? '' : (TIER_STYLES[title] ?? 'border-border bg-muted/30');
  const isReference = variant === 'reference';

  const getOwnerName = (ownerId: string | undefined) =>
    ownerId ? (userNames?.find((u) => u._id === ownerId)?.name ?? ownerId) : '';
  const getDepartment = (departmentId: string | null | undefined) => {
    if (!departmentId || !departments?.length) return null;
    return departments.find((d) => d._id === departmentId) ?? null;
  };

  return (
    <section className={isReference ? 'bg-white rounded-lg border border-gray-200 overflow-hidden' : `rounded-xl border overflow-hidden ${tierStyle}`}>
      <button
        type="button"
        className={
          isReference
            ? 'w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors text-left'
            : 'flex w-full items-center gap-2 px-4 py-3.5 text-left font-semibold transition-colors hover:opacity-90'
        }
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className={isReference ? 'w-5 h-5 text-gray-600' : 'h-4 w-4 shrink-0 text-muted-foreground'} />
          ) : (
            <ChevronRight className={isReference ? 'w-5 h-5 text-gray-600' : 'h-4 w-4 shrink-0 text-muted-foreground'} />
          )}
          <h2 className={isReference ? 'text-lg font-semibold text-gray-900' : 'text-[15px]'}>{title}</h2>
          <span className={isReference ? 'px-2.5 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs font-medium' : 'rounded-full bg-muted-foreground/15 px-2 py-0.5 text-xs font-medium text-muted-foreground'}>
            {objectives.length}
          </span>
        </div>
      </button>
      {expanded && (
        <div className={isReference ? 'p-6 grid grid-cols-1 md:grid-cols-2 gap-4' : 'border-t border-border/60 p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'}>
          {objectives.map((obj) => {
            const dept = getDepartment(obj.departmentId);
            const ownerName = getOwnerName(obj.ownerId);
            const krCount = obj._id && keyResultsByObjective ? (keyResultsByObjective[obj._id]?.length ?? 0) : 0;
            return (
              <OKRCard
                key={obj._id}
                objective={obj}
                averageScore={obj._id ? scoreByObjectiveId[obj._id] ?? null : null}
                onOpenModal={onOpenModal}
                ownerName={ownerName || undefined}
                departmentName={dept?.name}
                departmentColor={dept?.color}
                krCount={krCount}
                variant={isReference ? 'reference' : 'default'}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
