'use client';

import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { ScoreRing, getScoreStatusLabel, getScoreBarColorHex } from '@/components/shared/ScoreRing';
import { StatusPill } from '@/components/shared/StatusPill';
import { Building2, User, ChevronRight } from 'lucide-react';
import type { Objective } from '@/lib/api';

function getStatusPillClass(status: string): string {
  switch (status) {
    case 'approved': return 'bg-green-100 text-green-800 border-green-200';
    case 'in_review': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function initials(name: string): string {
  return name.split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase() || '?';
}

interface OKRCardProps {
  objective: Objective;
  averageScore: number | null;
  onOpenModal?: (objectiveId: string) => void;
  onClick?: () => void;
  className?: string;
  ownerName?: string;
  departmentName?: string;
  departmentColor?: string;
  krCount?: number;
  variant?: 'default' | 'reference';
}

export function OKRCard({
  objective,
  averageScore,
  onOpenModal,
  onClick,
  className,
  ownerName,
  departmentName,
  departmentColor,
  krCount = 0,
  variant = 'default',
}: OKRCardProps) {
  const score = averageScore != null ? averageScore : 0;
  const progressPct = Math.round((score ?? 0) * 100);
  const statusLabel = getScoreStatusLabel(score);
  const borderColor = score >= 0.7 ? 'border-l-green-500' : score >= 0.4 ? 'border-l-amber-500' : 'border-l-red-500';
  const status = (objective.status ?? 'draft').toLowerCase().replace(' ', '_');

  const handleClick = () => {
    if (onOpenModal && objective._id) {
      onOpenModal(objective._id);
      return;
    }
    onClick?.();
  };

  if (variant === 'reference') {
    const progress = (score / 1.0) * 100;
    const displayName = ownerName || objective.ownerId || '—';
    const deptName = departmentName || objective.division || '—';
    const refContent = (
      <div
        className="bg-white rounded-lg border border-gray-200 p-5 cursor-pointer transition-all hover:shadow-md"
        onClick={handleClick}
      >
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <ScoreRing score={score} size={56} strokeWidth={4} showLabel />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{objective.title}</h3>
            <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-700">
                  {initials(displayName)}
                </div>
                <span>{displayName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: departmentColor || '#9ca3af' }}
                />
                <span>{deptName}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusPillClass(status)}`}>
                {(objective.status ?? 'draft').replace('_', ' ')}
              </span>
              <span className="text-xs text-gray-500">{krCount} KRs</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium">{statusLabel}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: getScoreBarColorHex(score),
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
    if (objective._id && !onOpenModal && !onClick) {
      return <Link href={`/okrs/${objective._id}`} className="block">{refContent}</Link>;
    }
    return refContent;
  }

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
              {(departmentName || objective.division) && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3 shrink-0" />
                  {departmentName ?? objective.division}
                </span>
              )}
            </div>
            <h3 className="font-semibold text-[15px] leading-snug text-foreground truncate" title={objective.title}>
              {objective.title}
            </h3>
            {(ownerName || objective.ownerId) && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <User className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{ownerName || objective.ownerId}</span>
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
