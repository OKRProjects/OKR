'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api, type Objective, type WorkflowEvent } from '@/lib/api';
import { Search, Filter } from 'lucide-react';

interface HistoryTabProps {
  objective: Objective;
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

export function HistoryTab({ objective }: HistoryTabProps) {
  const objectiveId = objective._id;
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

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
          <div className="flex flex-wrap items-center gap-2">
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
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
