'use client';

import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { ScoreRing, getScoreStatusLabel } from '@/components/shared/ScoreRing';
import { StatusPill } from '@/components/shared/StatusPill';
import { Building2, User, ChevronRight } from 'lucide-react';
import type { Objective } from '@/lib/api';

interface OKRCardProps {
  objective: Objective;
  averageScore: number | null;
  onOpenModal?: (objectiveId: string) => void;
  onClick?: () => void;
  className?: string;
}

export function OKRCard({ objective, averageScore, onOpenModal, onClick, className }: OKRCardProps) {
  const score = averageScore != null ? averageScore : 0;
  const progressPct = Math.round((score ?? 0) * 100);
  const statusLabel = getScoreStatusLabel(score);
  const borderColor = score >= 0.7 ? 'border-l-green-500' : score >= 0.4 ? 'border-l-amber-500' : 'border-l-red-500';

  const handleClick = () => {
    if (onOpenModal && objective._id) {
      onOpenModal(objective._id);
      return;
    }
    onClick?.();
  };

  const content = (
    <div
      className={`group flex cursor-pointer flex-col rounded-xl border border-border bg-card transition-all hover:border-muted-foreground/30 hover:shadow-sm ${borderColor} border-l-4 ${className ?? ''}`}
      onClick={handleClick}
    >
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <StatusPill status={objective.status ?? 'draft'} />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {objective.level}
              </span>
              {objective.division && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3 shrink-0" />
                  {objective.division}
                </span>
              )}
            </div>
            <h3 className="font-semibold text-[15px] leading-snug text-foreground truncate" title={objective.title}>
              {objective.title}
            </h3>
            {objective.ownerId && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <User className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{objective.ownerId}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ScoreRing score={score} size={44} strokeWidth={3} showLabel={false} />
            <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border/80">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className={`text-xs font-medium ${score >= 0.7 ? 'text-green-600 dark:text-green-400' : score >= 0.4 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
              {statusLabel}
            </span>
            <span className="text-sm font-semibold tabular-nums">{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-2 rounded-full" />
        </div>
      </div>
    </div>
  );

  if (objective._id && !onOpenModal && !onClick) {
    return <Link href={`/okrs/${objective._id}`} className="block">{content}</Link>;
  }
  return content;
}
