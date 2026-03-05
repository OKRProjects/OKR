'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Target, TrendingUp, Calendar, AlertCircle, Users, Briefcase } from 'lucide-react';

export type DashboardRole = 'view_only' | 'standard' | 'leader' | 'admin' | 'developer' | undefined;

interface DashboardHeaderProps {
  totalObjectives: number;
  averageScore: number;
  onTrackPercent: number;
  daysLeftInQuarter: number;
  /** Role-based title and layout */
  role?: DashboardRole;
  /** For Standard: count of objectives owned by the user */
  myObjectivesCount?: number;
  /** For Leader: count and on-track % for user's department */
  departmentStats?: { count: number; onTrackPercent: number };
}

const ROLE_CONFIG: Record<string, { title: string; subtitle: string }> = {
  view_only: {
    title: 'Org overview',
    subtitle: 'Read-only view of objectives and progress',
  },
  standard: {
    title: 'Your dashboard',
    subtitle: 'Your objectives and key results',
  },
  leader: {
    title: 'Department & review',
    subtitle: 'Items needing your review and department OKRs',
  },
  admin: {
    title: 'OKR dashboard',
    subtitle: 'Full view — all tiers and system',
  },
  developer: {
    title: 'OKR dashboard',
    subtitle: '3-tier hierarchy and progress',
  },
};

export function DashboardHeader({
  totalObjectives,
  averageScore,
  onTrackPercent,
  daysLeftInQuarter,
  role,
  myObjectivesCount,
  departmentStats,
}: DashboardHeaderProps) {
  const config = ROLE_CONFIG[role ?? 'developer'] ?? ROLE_CONFIG.developer;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{config.title}</h2>
        <p className="text-sm text-muted-foreground">{config.subtitle}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {role === 'standard' && myObjectivesCount !== undefined && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">My objectives</p>
                  <p className="text-2xl font-bold">{myObjectivesCount}</p>
                </div>
                <Briefcase className="h-8 w-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>
        )}
        {role === 'leader' && departmentStats && (
          <Card className="border-amber-200/50 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Your department</p>
                  <p className="text-2xl font-bold">{departmentStats.count} objectives</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{Math.round(departmentStats.onTrackPercent)}% on track</p>
                </div>
                <Target className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total objectives</p>
                <p className="text-2xl font-bold">{totalObjectives}</p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average score</p>
                <p className="text-2xl font-bold">{Math.round(averageScore * 100)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">On track</p>
                <p className="text-2xl font-bold">{Math.round(onTrackPercent)}%</p>
              </div>
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Days left in quarter</p>
                <p className="text-2xl font-bold">{daysLeftInQuarter}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        {role === 'admin' && (
          <Card className="border-muted">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Admin</p>
                  <a href="/admin/users" className="text-sm font-semibold text-primary hover:underline">
                    User management →
                  </a>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
