'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';

export interface DashboardFilters {
  search: string;
  tier: string;
  division: string;
  status: string;
  scoreRange: string;
}

const defaultFilters: DashboardFilters = {
  search: '',
  tier: 'all',
  division: 'all',
  status: 'all',
  scoreRange: 'all',
};

interface FilterBarProps {
  filters: DashboardFilters;
  onFiltersChange: (f: DashboardFilters) => void;
  divisions: string[];
}

export function FilterBar({ filters, onFiltersChange, divisions }: FilterBarProps) {
  const set = (key: keyof DashboardFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center flex-wrap">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search objectives..."
          value={filters.search}
          onChange={(e) => set('search', e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        <Select value={filters.tier} onValueChange={(v) => set('tier', v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="strategic">Strategic</SelectItem>
            <SelectItem value="functional">Functional</SelectItem>
            <SelectItem value="tactical">Tactical</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.division} onValueChange={(v) => set('division', v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {divisions.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.status} onValueChange={(v) => set('status', v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.scoreRange} onValueChange={(v) => set('scoreRange', v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Score" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Scores</SelectItem>
            <SelectItem value="on_track">On Track (70%+)</SelectItem>
            <SelectItem value="at_risk">At Risk (40–69%)</SelectItem>
            <SelectItem value="off_track">Off Track (&lt;40%)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export { defaultFilters };
