'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScoreRing, getScoreStatusLabel } from '@/components/shared/ScoreRing';
import { StatusPill } from '@/components/shared/StatusPill';
import { Building2, User } from 'lucide-react';
import type { Objective } from '@/lib/api';

interface OKRCardProps {
  objective: Objective;
  averageScore: number | null;
  /** When set, clicking the card opens the modal instead of navigating. */
  onOpenModal?: (objectiveId: string) => void;
  onClick?: () => void;
  className?: string;
}

export function OKRCard({ objective, averageScore, onOpenModal, onClick, className }: OKRCardProps) {
  const score = averageScore != null ? averageScore : 0;
  const progressPct = Math.round((score ?? 0) * 100);
  const statusLabel = getScoreStatusLabel(score);
  const handleClick = () => {
    if (onOpenModal && objective._id) {
      onOpenModal(objective._id);
      return;
    }
    onClick?.();
  };

  const content = (
    <Card
      className={`cursor-pointer transition-shadow hover:shadow-md ${className ?? ''}`}
      onClick={handleClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <ScoreRing score={score} size={44} strokeWidth={4} showLabel />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <StatusPill status={objective.status ?? 'draft'} />
              <span className="text-xs text-muted-foreground capitalize">
                {objective.level}
              </span>
              {objective.division && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {objective.division}
                </span>
              )}
            </div>
            <h3 className="font-semibold text-base leading-tight truncate" title={objective.title}>
              {objective.title}
            </h3>
            {objective.ownerId && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <User className="h-3 w-3" />
                {objective.ownerId}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-medium text-muted-foreground">{statusLabel}</span>
          <span className="text-xs font-semibold">{progressPct}%</span>
        </div>
        <Progress value={progressPct} className="h-2" />
      </CardContent>
    </Card>
  );

  if (objective._id && !onOpenModal && !onClick) {
    return <Link href={`/okrs/${objective._id}`}>{content}</Link>;
  }
  return content;
}
