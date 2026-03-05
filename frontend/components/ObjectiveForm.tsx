'use client';

import { useState, useEffect, FormEvent } from 'react';
import { api, Objective, ObjectiveLevel, ObjectiveTimeline } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FieldLabel } from '@/components/shared/FieldLabel';
import { ErrorMessage } from '@/components/shared/ErrorMessage';

interface ObjectiveFormProps {
  objective?: Objective;
  parentOptions?: Objective[];
  onSuccess?: () => void;
}

const LEVELS: { value: ObjectiveLevel; label: string }[] = [
  { value: 'strategic', label: 'Strategic (Annual)' },
  { value: 'functional', label: 'Functional (Annual)' },
  { value: 'tactical', label: 'Tactical (Quarterly)' },
];

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function ObjectiveForm({ objective, parentOptions = [], onSuccess }: ObjectiveFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(objective?.title ?? '');
  const [description, setDescription] = useState(objective?.description ?? '');
  const [level, setLevel] = useState<ObjectiveLevel>(objective?.level ?? 'strategic');
  const [timeline, setTimeline] = useState<ObjectiveTimeline>(objective?.timeline ?? 'annual');
  const [fiscalYear, setFiscalYear] = useState(objective?.fiscalYear ?? new Date().getFullYear());
  const [quarter, setQuarter] = useState(objective?.quarter ?? 'Q1');
  const [division, setDivision] = useState(objective?.division ?? '');
  const [parentObjectiveId, setParentObjectiveId] = useState<string | ''>(objective?.parentObjectiveId ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (level === 'tactical') setTimeline('quarterly');
    else setTimeline('annual');
  }, [level]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload: Partial<Objective> & { title: string; fiscalYear: number } = {
        title,
        description,
        level,
        timeline,
        fiscalYear,
        division: division || undefined,
        parentObjectiveId: parentObjectiveId || undefined,
      };
      if (timeline === 'quarterly') payload.quarter = quarter;
      if (objective?._id) {
        await api.updateObjective(objective._id, payload);
        onSuccess?.();
        router.push(`/okrs/${objective._id}`);
      } else {
        const created = await api.createObjective(payload);
        onSuccess?.();
        router.push(`/okrs/${created._id}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save objective');
    } finally {
      setLoading(false);
    }
  };

  const showParent = level === 'functional' || level === 'tactical';
  const strategicParents = parentOptions.filter((o) => o.level === 'strategic');
  const functionalParents = parentOptions.filter((o) => o.level === 'functional');

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <ErrorMessage message={error} className="mb-4" />}
      <div>
        <FieldLabel htmlFor="objective-title" tooltip="A clear, outcome-focused statement of what you want to achieve." learnMoreHref="/docs#okrs" required>
          Title
        </FieldLabel>
        <input
          id="objective-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-slate-500 focus:ring-slate-500"
        />
      </div>
      <div>
        <FieldLabel htmlFor="objective-description" tooltip="Optional context or success criteria for this objective.">
          Description
        </FieldLabel>
        <textarea
          id="objective-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-slate-500 focus:ring-slate-500"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel tooltip="Strategic = annual org-wide; Functional = annual division; Tactical = quarterly team." learnMoreHref="/docs#okrs">
            Level
          </FieldLabel>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as ObjectiveLevel)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-slate-500 focus:ring-slate-500"
          >
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel tooltip="The fiscal year this objective applies to (e.g. 2025)." required>
            Fiscal Year
          </FieldLabel>
          <input
            type="number"
            min={2020}
            max={2030}
            value={fiscalYear}
            onChange={(e) => setFiscalYear(Number(e.target.value))}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-slate-500 focus:ring-slate-500"
          />
        </div>
      </div>
      {timeline === 'quarterly' && (
        <div>
          <FieldLabel tooltip="Quarter (Q1–Q4) for this tactical objective.">
            Quarter
          </FieldLabel>
          <select
            value={quarter}
            onChange={(e) => setQuarter(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-slate-500 focus:ring-slate-500"
          >
            {QUARTERS.map((q) => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </div>
      )}
      {(level === 'functional' || level === 'tactical') && (
        <div>
          <FieldLabel tooltip="Division or department (e.g. AI, Data, Ops) for roll-up and filtering.">
            Division
          </FieldLabel>
          <input
            type="text"
            value={division}
            onChange={(e) => setDivision(e.target.value)}
            placeholder="e.g. AI, Data, Ops"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-slate-500 focus:ring-slate-500"
          />
        </div>
      )}
      {showParent && (
        <div>
          <FieldLabel tooltip="Link this objective to a parent for hierarchy and roll-up views.">
            Parent Objective {level === 'functional' ? '(Strategic)' : '(Functional)'}
          </FieldLabel>
          <select
            value={parentObjectiveId}
            onChange={(e) => setParentObjectiveId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-slate-500 focus:ring-slate-500"
          >
            <option value="">— Select parent —</option>
            {(level === 'functional' ? strategicParents : functionalParents).map((o) => (
              <option key={o._id} value={o._id}>{o.title}</option>
            ))}
          </select>
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
        >
          {loading ? 'Saving...' : objective ? 'Update objective' : 'Create objective'}
        </button>
        <Link
          href={objective ? `/okrs/${objective._id}` : '/okrs'}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
