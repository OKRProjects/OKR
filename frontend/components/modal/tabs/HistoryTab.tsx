'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { api, type Objective, type WorkflowEvent } from '@/lib/api';
import { Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';

const EVENT_TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'in_review', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'draft', label: 'Back to draft' },
];

interface HistoryTabProps {
  objective: Objective;
  /** When provided, filter by workflow event type (toStatus) and persist to preferences */
  eventTypeFilter?: string;
  onEventTypeFilterChange?: (value: string) => void;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function displayActor(id: string) {
  if (!id) return '—';
  if (id.includes('|')) return id.split('|').pop() ?? id;
  return id;
}

export function HistoryTab({ objective, eventTypeFilter = 'all', onEventTypeFilterChange }: HistoryTabProps) {
  const objectiveId = objective._id;
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    if (!objectiveId) return;
    setLoading(true);
    api
      .getWorkflowHistory(objectiveId)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [objectiveId]);

  const filtered = events.filter((ev) => {
    if (eventTypeFilter && eventTypeFilter !== 'all' && ev.toStatus !== eventTypeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        ev.fromStatus?.toLowerCase().includes(q) ||
        ev.toStatus?.toLowerCase().includes(q) ||
        (ev.reason ?? '').toLowerCase().includes(q) ||
        (ev.actorId ?? '').toLowerCase().includes(q);
      if (!match) return false;
    }
    if (actorFilter.trim()) {
      if (!ev.actorId || !ev.actorId.toLowerCase().includes(actorFilter.toLowerCase()))
        return false;
    }
    if (fromDate) {
      if (new Date(ev.timestamp) < new Date(fromDate)) return false;
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      if (new Date(ev.timestamp) > to) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>History / Audit Trail</CardTitle>
          <p className="text-sm text-muted-foreground">
            Workflow status changes. Filter by event type, date range, or actor.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mobile: collapsible filters to reduce clutter */}
          <div className="md:hidden">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full min-h-[44px] justify-between touch-manipulation"
              onClick={() => setFiltersOpen((v) => !v)}
            >
              <span className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                {filtersOpen ? 'Hide filters' : 'Show filters'}
              </span>
              {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            {filtersOpen && (
              <div className="mt-3 space-y-3">
                {onEventTypeFilterChange && (
                  <Select value={eventTypeFilter || 'all'} onValueChange={onEventTypeFilterChange}>
                    <SelectTrigger className="w-full min-h-[44px]">
                      <SelectValue placeholder="Update type" />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search reason, status, actor..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 min-h-[44px]"
                  />
                </div>
                <Input
                  placeholder="Actor"
                  value={actorFilter}
                  onChange={(e) => setActorFilter(e.target.value)}
                  className="w-full min-h-[44px]"
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="flex-1 min-h-[44px]"
                  />
                  <span className="text-muted-foreground shrink-0">–</span>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="flex-1 min-h-[44px]"
                  />
                </div>
              </div>
            )}
          </div>
          {/* Desktop: always-visible filters */}
          <div className="hidden md:block">
            <div className="flex flex-wrap items-center gap-2">
              {onEventTypeFilterChange && (
                <Select value={eventTypeFilter || 'all'} onValueChange={onEventTypeFilterChange}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Update type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search reason, status, actor..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Input
                placeholder="Actor"
                value={actorFilter}
                onChange={(e) => setActorFilter(e.target.value)}
                className="w-[140px]"
              />
              <div className="flex items-center gap-1">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-[140px]"
                />
                <span className="text-muted-foreground">–</span>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-[140px]"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {events.length === 0
                ? 'No workflow history yet.'
                : 'No entries match the current filters.'}
            </p>
          ) : (
            <div className="overflow-x-auto -mx-2 px-2">
              <table className="w-full text-sm min-w-[320px]">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">When</th>
                    <th className="pb-2 pr-4 font-medium">From</th>
                    <th className="pb-2 pr-4 font-medium">To</th>
                    <th className="pb-2 pr-4 font-medium">Actor</th>
                    <th className="pb-2 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((ev) => (
                    <tr key={ev._id} className="border-b last:border-0">
                      <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground">
                        {formatDateTime(ev.timestamp)}
                      </td>
                      <td className="py-3 pr-4 capitalize">{ev.fromStatus}</td>
                      <td className="py-3 pr-4 capitalize">{ev.toStatus}</td>
                      <td className="py-3 pr-4 font-mono text-xs">{displayActor(ev.actorId ?? '')}</td>
                      <td className="py-3">{ev.reason ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
