'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle2,
  Target,
  BarChart3,
  Award
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line
} from 'recharts';
import { api, Objective, KeyResult } from '@/lib/api';
import { ChartAccessible } from '@/components/shared/ChartAccessible';

interface KeyResultStatus {
  id: string;
  title: string;
  objective: string;
  level: string;
  score: number;
  target: number;
  current: number;
  unit: string;
  status: 'on-track' | 'at-risk' | 'behind' | 'completed';
}

export function AnalyticsView() {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [keyResults, setKeyResults] = useState<KeyResult[]>([]);
  const [loading, setLoading] = useState(true);
  const fiscalYear = new Date().getFullYear();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const objs = await api.getObjectives({ fiscalYear });
      setObjectives(objs);
      
      // Load key results for all objectives
      const allKRs: KeyResult[] = [];
      for (const obj of objs) {
        if (obj._id) {
          try {
            const krs = await api.getKeyResults(obj._id);
            allKRs.push(...krs);
          } catch {
            // Ignore errors
          }
        }
      }
      setKeyResults(allKRs);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Transform key results to KeyResultStatus format
  const keyResultsStatus: KeyResultStatus[] = keyResults.map(kr => {
    const obj = objectives.find(o => o._id === kr.objectiveId);
    const score = kr.score || 0;
    const target = parseFloat(kr.target || '0');
    const current = parseFloat(kr.currentValue || '0');
    
    let status: 'on-track' | 'at-risk' | 'behind' | 'completed';
    if (score === 100) {
      status = 'completed';
    } else if (score >= 80) {
      status = 'on-track';
    } else if (score >= 60) {
      status = 'at-risk';
    } else {
      status = 'behind';
    }
    
    return {
      id: kr._id || '',
      title: kr.title,
      objective: obj?.title || 'Unknown',
      level: obj?.level || 'unknown',
      score,
      target,
      current,
      unit: kr.unit || '',
      status
    };
  });

  // Mock data for charts (would need historical data for real implementation)
  const weeklyProgressData = [
    { week: 'Week 1', completed: 2, inProgress: 5, planned: 4 },
    { week: 'Week 2', completed: 3, inProgress: 5, planned: 3 },
    { week: 'Week 3', completed: 4, inProgress: 4, planned: 3 },
    { week: 'Week 4', completed: keyResultsStatus.filter(kr => kr.status === 'completed').length, inProgress: keyResultsStatus.filter(kr => kr.status === 'on-track').length, planned: keyResultsStatus.filter(kr => kr.status === 'at-risk' || kr.status === 'behind').length },
  ];

  const velocityData = [
    { month: 'Jan', planned: 10, actual: 8, velocity: 80 },
    { month: 'Feb', planned: 12, actual: 11, velocity: 92 },
    { month: 'Mar', planned: 15, actual: 13, velocity: 87 },
    { month: 'Apr', planned: keyResultsStatus.length, actual: keyResultsStatus.filter(kr => kr.status === 'completed' || kr.status === 'on-track').length, velocity: Math.round((keyResultsStatus.filter(kr => kr.status === 'completed' || kr.status === 'on-track').length / keyResultsStatus.length) * 100) },
  ];
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'on-track': return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'at-risk': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'behind': return <TrendingDown className="h-5 w-5 text-red-600" />;
      default: return <Target className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-green-100 text-green-800 border-green-200',
      'on-track': 'bg-green-100 text-green-800 border-green-200',
      'at-risk': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      behind: 'bg-red-100 text-red-800 border-red-200'
    };
    return styles[status as keyof typeof styles] || styles['on-track'];
  };

  const getLevelBadgeVariant = (level: string): "default" | "secondary" | "outline" => {
    switch (level) {
      case 'strategic': return 'default';
      case 'functional': return 'secondary';
      case 'tactical': return 'outline';
      default: return 'default';
    }
  };

  const completedKRs = keyResultsStatus.filter(kr => kr.status === 'completed').length;
  const onTrackKRs = keyResultsStatus.filter(kr => kr.status === 'on-track').length;
  const atRiskKRs = keyResultsStatus.filter(kr => kr.status === 'at-risk').length;
  const behindKRs = keyResultsStatus.filter(kr => kr.status === 'behind').length;
  const totalKRs = keyResultsStatus.length;
  const avgScore = totalKRs > 0
    ? Math.round(keyResultsStatus.reduce((sum, kr) => sum + kr.score, 0) / totalKRs)
    : 0;

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading...</div>;
  }

  const renderKeyResultsList = (filteredKRs: KeyResultStatus[]) => (
    <div className="space-y-3">
      {filteredKRs.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No key results found</p>
      ) : (
        filteredKRs.map((kr) => (
          <Card key={kr.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(kr.status)}
                    <Badge className={getStatusBadge(kr.status)}>
                      {kr.status.replace('-', ' ')}
                    </Badge>
                    <Badge variant={getLevelBadgeVariant(kr.level)}>
                      {kr.level}
                    </Badge>
                  </div>
                  <CardTitle className="text-base">{kr.title}</CardTitle>
                  <CardDescription className="mt-1">{kr.objective}</CardDescription>
                </div>
                <div className="text-right ml-4">
                  <div className="text-2xl font-bold">{kr.score}%</div>
                  <div className="text-xs text-muted-foreground">Score</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {kr.current} / {kr.target} {kr.unit}
                  </span>
                </div>
                <Progress value={(kr.current / kr.target) * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total KRs</CardDescription>
            <CardTitle className="text-3xl">{totalKRs}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              <span>{avgScore}% avg</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-3xl text-green-700">{completedKRs}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>{Math.round((completedKRs / totalKRs) * 100)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardDescription>On Track</CardDescription>
            <CardTitle className="text-3xl text-blue-700">{onTrackKRs}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <TrendingUp className="h-4 w-4" />
              <span>{Math.round((onTrackKRs / totalKRs) * 100)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-3">
            <CardDescription>At Risk</CardDescription>
            <CardTitle className="text-3xl text-yellow-700">{atRiskKRs}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              <span>{Math.round((atRiskKRs / totalKRs) * 100)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <CardDescription>Behind</CardDescription>
            <CardTitle className="text-3xl text-red-700">{behindKRs}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-red-600">
              <TrendingDown className="h-4 w-4" />
              <span>{Math.round((behindKRs / totalKRs) * 100)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Weekly Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Progress</CardTitle>
            <CardDescription>Key results status over the past 4 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartAccessible
              summary={`Stacked bar chart of key results by week: ${weeklyProgressData.map((w) => `${w.week}: ${w.completed} completed, ${w.inProgress} in progress, ${w.planned} planned`).join('; ')}.`}
            >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyProgressData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="week" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" stackId="a" fill="#22c55e" name="Completed" />
                <Bar dataKey="inProgress" stackId="a" fill="#3b82f6" name="In Progress" />
                <Bar dataKey="planned" stackId="a" fill="#94a3b8" name="Planned" />
              </BarChart>
            </ResponsiveContainer>
            </ChartAccessible>
          </CardContent>
        </Card>

        {/* Velocity Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Delivery Velocity</CardTitle>
            <CardDescription>Planned vs actual completion rate</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartAccessible
              summary={`Delivery velocity chart by month: ${velocityData.map((v) => `${v.month} planned ${v.planned}, actual ${v.actual}, velocity ${v.velocity}%`).join('; ')}.`}
            >
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={velocityData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis yAxisId="left" className="text-xs" />
                <YAxis yAxisId="right" orientation="right" className="text-xs" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="planned" fill="#94a3b8" name="Planned" />
                <Bar yAxisId="left" dataKey="actual" fill="#3b82f6" name="Actual" />
                <Line yAxisId="right" type="monotone" dataKey="velocity" stroke="#22c55e" strokeWidth={2} name="Velocity %" />
              </ComposedChart>
            </ResponsiveContainer>
            </ChartAccessible>
          </CardContent>
        </Card>
      </div>

      {/* Key Results by Status */}
      <Card>
        <CardHeader>
          <CardTitle>Key Results Detailed View</CardTitle>
          <CardDescription>
            Filter and review all key results across objectives
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">
                All ({totalKRs})
              </TabsTrigger>
              <TabsTrigger value="completed">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Completed ({completedKRs})
              </TabsTrigger>
              <TabsTrigger value="on-track">
                <TrendingUp className="h-4 w-4 mr-2" />
                On Track ({onTrackKRs})
              </TabsTrigger>
              <TabsTrigger value="at-risk">
                <AlertTriangle className="h-4 w-4 mr-2" />
                At Risk ({atRiskKRs})
              </TabsTrigger>
              <TabsTrigger value="behind">
                <TrendingDown className="h-4 w-4 mr-2" />
                Behind ({behindKRs})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {renderKeyResultsList(keyResultsStatus)}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {renderKeyResultsList(keyResultsStatus.filter(kr => kr.status === 'completed'))}
            </TabsContent>

            <TabsContent value="on-track" className="space-y-4">
              {renderKeyResultsList(keyResultsStatus.filter(kr => kr.status === 'on-track'))}
            </TabsContent>

            <TabsContent value="at-risk" className="space-y-4">
              {renderKeyResultsList(keyResultsStatus.filter(kr => kr.status === 'at-risk'))}
            </TabsContent>

            <TabsContent value="behind" className="space-y-4">
              {renderKeyResultsList(keyResultsStatus.filter(kr => kr.status === 'behind'))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-600" />
            Top Performing Key Results
          </CardTitle>
          <CardDescription>Key results exceeding targets or completed ahead of schedule</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {keyResultsStatus
              .filter(kr => kr.score >= 80)
              .sort((a, b) => b.score - a.score)
              .map((kr) => (
                <div key={kr.id} className="flex items-center justify-between border-l-4 border-l-green-500 bg-green-50 p-4 rounded-r-lg">
                  <div className="flex-1">
                    <p className="font-medium">{kr.title}</p>
                    <p className="text-sm text-muted-foreground">{kr.objective}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="border-green-500 text-green-700">
                      <Award className="h-3 w-3 mr-1" />
                      {kr.score === 100 ? 'Completed' : 'Excellent'}
                    </Badge>
                    <span className="text-lg font-bold text-green-600">{kr.score}%</span>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
