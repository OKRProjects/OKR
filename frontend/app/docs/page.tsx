'use client';

import { AppLayout } from '@/components/AppLayout';
import Link from 'next/link';

const sections = [
  {
    id: 'okrs',
    title: 'OKRs overview',
    href: '/docs#okrs',
    summary: 'Objectives and Key Results: hierarchy, levels, and workflow.',
  },
  {
    id: 'scoring',
    title: 'Scoring key results',
    href: '/docs#scoring',
    summary: 'How scores work (0–100%), when to update, and roll-up to objectives.',
  },
  {
    id: 'workflow',
    title: 'Workflow and status',
    href: '/docs#workflow',
    summary: 'Draft → In Review → Approved or Rejected, and who can transition.',
  },
  {
    id: 'dependencies',
    title: 'Dependencies and roll-up',
    href: '/docs#dependencies',
    summary: 'Linking objectives and viewing roll-up views by fiscal year.',
  },
];

export default function DocsPage() {
  return (
    <AppLayout title="Documentation" description="Help and guidance for the OKR platform">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Documentation</h1>
          <p className="mt-2 text-muted-foreground">
            Guides and reference for using the OKR platform. Use the links below or the &quot;Learn more&quot; links
            throughout the app.
          </p>
        </div>

        <nav className="space-y-4" aria-label="Documentation sections">
          {sections.map((s) => (
            <Link
              key={s.id}
              href={s.href}
              className="block rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
            >
              <h2 className="font-semibold text-foreground">{s.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{s.summary}</p>
            </Link>
          ))}
        </nav>

        <div className="space-y-8 border-t pt-8">
          <section id="okrs" className="scroll-mt-4">
            <h2 className="text-xl font-semibold">OKRs overview</h2>
            <p className="mt-2 text-muted-foreground">
              The platform uses a 3-tier hierarchy: <strong>Strategic</strong> (annual, IT Leadership),{' '}
              <strong>Functional/Divisional</strong> (annual, Division Heads), and <strong>Tactical</strong> (quarterly,
              Managers). Each objective can have parent/child links and multiple key results. Key results are
              measurable outcomes with a target and current value; their scores roll up to the objective.
            </p>
          </section>

          <section id="scoring" className="scroll-mt-4">
            <h2 className="text-xl font-semibold">Scoring key results</h2>
            <p className="mt-2 text-muted-foreground">
              Each key result has a <strong>score from 0 to 100%</strong> (stored as 0.0–1.0). Update scores regularly
              so roll-up views and dashboards stay accurate. Use the Progress tab to set the score, add notes, and view
              history. Scores are stepped in 10% increments. &quot;On track&quot; is typically ≥70%, &quot;at risk&quot;
              &lt;70% and ≥40%, and &quot;off track&quot; &lt;40%.
            </p>
          </section>

          <section id="workflow" className="scroll-mt-4">
            <h2 className="text-xl font-semibold">Workflow and status</h2>
            <p className="mt-2 text-muted-foreground">
              Objectives move through: <strong>Draft</strong> → <strong>In Review</strong> → <strong>Approved</strong> or{' '}
              <strong>Rejected</strong>. Role-based permissions control who can submit for review, approve, or reject.
              Use the workflow actions in the OKR detail view to change status; a reason may be required. Rejected
              items can be edited and resubmitted.
            </p>
          </section>

          <section id="dependencies" className="scroll-mt-4">
            <h2 className="text-xl font-semibold">Dependencies and roll-up</h2>
            <p className="mt-2 text-muted-foreground">
              Link related objectives in the Dependencies tab. The roll-up view shows objectives by fiscal year and
              quarter so you can see progress across the organization. Use the tree view to see the full hierarchy for
              an objective.
            </p>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
