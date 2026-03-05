'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Target, TrendingUp, Calendar, AlertCircle } from 'lucide-react';

interface DashboardHeaderProps {
  totalObjectives: number;
  averageScore: number;
  onTrackPercent: number;
  daysLeftInQuarter: number;
}

export function DashboardHeader({
  totalObjectives,
  averageScore,
  onTrackPercent,
  daysLeftInQuarter,
}: DashboardHeaderProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Objectives</p>
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
              <p className="text-sm font-medium text-muted-foreground">Average Score</p>
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
              <p className="text-sm font-medium text-muted-foreground">On Track</p>
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
              <p className="text-sm font-medium text-muted-foreground">Days Left in Quarter</p>
              <p className="text-2xl font-bold">{daysLeftInQuarter}</p>
            </div>
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
