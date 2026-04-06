'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Calendar,
  Github,
  Kanban,
  MessageCircle,
  NotepadText,
  Radio,
  Sparkles,
  Zap,
} from 'lucide-react';

/** Static demo rows for the profile integrations preview (not persisted). */
const DEMO_CATALOG: {
  id: string;
  name: string;
  description: string;
  icon: typeof NotepadText;
  state: 'connected' | 'coming_soon' | 'beta';
  detail?: string;
}[] = [
  {
    id: 'notion',
    name: 'Notion',
    description: 'Mirror objectives and key results into a linked database.',
    icon: NotepadText,
    state: 'connected',
    detail: 'Workspace “Acme OKRs” · last sync 12 min ago',
  },
  {
    id: 'jira',
    name: 'Jira Cloud',
    description: 'Link epics and stories to tactical OKRs for traceability.',
    icon: Kanban,
    state: 'beta',
    detail: 'Project OKR-2026 · 4 issues linked',
  },
  {
    id: 'linear',
    name: 'Linear',
    description: 'Import cycles and team velocity into progress comments.',
    icon: Zap,
    state: 'coming_soon',
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Optional bot to announce approvals in a server channel.',
    icon: MessageCircle,
    state: 'connected',
    detail: 'Server “Leadership” · #okr-feed',
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Attach release milestones and PR throughput to key results.',
    icon: Github,
    state: 'beta',
    detail: 'Org acme-corp · 2 repos',
  },
  {
    id: 'calendar',
    name: 'Google Calendar',
    description: 'Block review windows and next review dates on your calendar.',
    icon: Calendar,
    state: 'connected',
    detail: 'Primary calendar · 3 OKR reviews this week',
  },
  {
    id: 'zapier',
    name: 'Zapier / Make',
    description: 'Extra automations beyond the built-in incoming webhook.',
    icon: Radio,
    state: 'coming_soon',
  },
];

const DEMO_ACTIVITY: { at: string; source: string; summary: string }[] = [
  { at: '2026-04-06T09:12:00', source: 'Notion', summary: 'Pushed “Q2 Growth” objective block to page /OKRs/2026' },
  { at: '2026-04-05T16:40:00', source: 'Slack', summary: 'Test webhook delivered to #okr-updates' },
  { at: '2026-04-05T11:03:00', source: 'GitHub', summary: 'Linked KR “Reduce churn” → milestone v2.4' },
  { at: '2026-04-04T08:55:00', source: 'Google Calendar', summary: 'Scheduled leadership review · Apr 18' },
  { at: '2026-04-03T19:22:00', source: 'Discord', summary: 'Bot posted approval for “Platform reliability”' },
  { at: '2026-04-02T14:10:00', source: 'Jira', summary: 'Synced 2 new stories under tactical objective T-14' },
];

function stateBadge(state: (typeof DEMO_CATALOG)[number]['state']) {
  switch (state) {
    case 'connected':
      return <Badge className="bg-emerald-600 hover:bg-emerald-600">Connected</Badge>;
    case 'beta':
      return <Badge variant="secondary">Beta</Badge>;
    default:
      return <Badge variant="outline">Coming soon</Badge>;
  }
}

export function ProfileIntegrationsDemo() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">More integrations</h2>
        <Badge variant="outline" className="gap-1 font-normal">
          <Sparkles className="h-3 w-3" />
          Demo data
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        Preview of additional connectors and sample activity. These rows are illustrative until wired to the backend.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {DEMO_CATALOG.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="rounded-md bg-muted p-2">
                      <Icon className="h-4 w-4 shrink-0" />
                    </div>
                    <CardTitle className="text-base leading-tight">{item.name}</CardTitle>
                  </div>
                  {stateBadge(item.state)}
                </div>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              {item.detail && (
                <CardContent className="pt-0 text-xs text-muted-foreground">{item.detail}</CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent integration activity</CardTitle>
          <CardDescription>Sample timeline (demo only).</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {DEMO_ACTIVITY.map((row, i) => (
              <li
                key={i}
                className="flex flex-col gap-0.5 border-b border-border/60 pb-3 last:border-0 last:pb-0"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">{row.source}</span>
                  <time className="text-xs text-muted-foreground tabular-nums" dateTime={row.at}>
                    {new Date(row.at).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </time>
                </div>
                <p className="text-sm text-muted-foreground">{row.summary}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
