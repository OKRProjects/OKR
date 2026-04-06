'use client';

import { useState, useEffect, FormEvent } from 'react';
import { api, Objective, ObjectiveLevel, ObjectiveTimeline } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, Layers, Link2, Target } from 'lucide-react';
import { FieldLabel } from '@/components/shared/FieldLabel';
import { ErrorMessage } from '@/components/shared/ErrorMessage';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/utils';

interface ObjectiveFormProps {
  objective?: Objective;
  parentOptions?: Objective[];
  /** Pre-select department (e.g. current user’s department from profile). */
  defaultDepartmentId?: string | null;
  onSuccess?: () => void;
}

const LEVELS: { value: ObjectiveLevel; label: string; hint: string }[] = [
  { value: 'strategic', label: 'Strategic (Annual)', hint: 'Org-wide outcomes, reviewed annually.' },
  { value: 'functional', label: 'Functional (Annual)', hint: 'Division or function; rolls up to strategic.' },
  { value: 'tactical', label: 'Tactical (Quarterly)', hint: 'Team execution; quarterly cadence.' },
];

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

const inputClass =
  'flex h-9 w-full min-w-0 rounded-md border border-input bg-input-background px-3 py-1 text-base transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:opacity-50 md:text-sm';

export default function ObjectiveForm({
  objective,
  parentOptions = [],
  defaultDepartmentId,
  onSuccess,
}: ObjectiveFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(objective?.title ?? '');
  const [description, setDescription] = useState(objective?.description ?? '');
  const [level, setLevel] = useState<ObjectiveLevel>(objective?.level ?? 'strategic');
  const [timeline, setTimeline] = useState<ObjectiveTimeline>(objective?.timeline ?? 'annual');
  const [fiscalYear, setFiscalYear] = useState(objective?.fiscalYear ?? new Date().getFullYear());
  const [quarter, setQuarter] = useState(objective?.quarter ?? 'Q1');
  const [division, setDivision] = useState(objective?.division ?? '');
  const [parentObjectiveId, setParentObjectiveId] = useState<string | ''>(objective?.parentObjectiveId ?? '');
  const [departmentId, setDepartmentId] = useState<string>(
    objective?.departmentId ?? defaultDepartmentId ?? ''
  );
  const [departments, setDepartments] = useState<{ _id: string; name: string; color?: string }[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.getDepartments();
        if (!cancelled) setDepartments(list);
      } catch {
        if (!cancelled) setDepartments([]);
      } finally {
        if (!cancelled) setDepartmentsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (level === 'tactical') setTimeline('quarterly');
    else setTimeline('annual');
  }, [level]);

  useEffect(() => {
    if (objective?._id) return;
    if (defaultDepartmentId) {
      setDepartmentId((prev) => prev || defaultDepartmentId);
    }
  }, [defaultDepartmentId, objective?._id]);

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
        division: division.trim() || undefined,
        parentObjectiveId: parentObjectiveId || undefined,
        departmentId: departmentId.trim() || undefined,
      };
      if (timeline === 'quarterly') payload.quarter = quarter;
      if (objective?._id) {
        await api.updateObjective(objective._id, payload);
        onSuccess?.();
        router.push(`/okrs/${objective._id}`);
      } else {
        let orgId: string | undefined;
        try {
          const orgs = await api.getOrgs();
          orgId = orgs[0]?.id;
        } catch {
          // Backend can resolve org from membership / first org in DB.
        }
        const created = await api.createObjective({
          ...payload,
          ...(orgId ? { orgId } : {}),
        });
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
  const levelMeta = LEVELS.find((l) => l.value === level);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && <ErrorMessage message={error} learnMoreHref="/docs" className="mb-2" />}

      {/* What */}
      <section className="space-y-4" aria-labelledby="obj-section-what">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <Target className="h-4 w-4 text-primary" aria-hidden />
          <h3 id="obj-section-what" className="text-sm font-semibold tracking-tight">
            Objective
          </h3>
        </div>
        <p className="text-sm text-muted-foreground -mt-1">
          State the outcome you want. This text appears in lists, roll-up views, and reviews.
        </p>
        <div>
          <FieldLabel
            htmlFor="objective-title"
            tooltip="A clear, outcome-focused statement of what you want to achieve."
            learnMoreHref="/docs#okrs"
            required
          >
            Title
          </FieldLabel>
          <Input
            id="objective-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1.5"
            placeholder="e.g. Improve customer retention in EMEA"
          />
        </div>
        <div>
          <FieldLabel
            htmlFor="objective-description"
            tooltip="Context, success criteria, or links stakeholders should know."
          >
            Description
          </FieldLabel>
          <textarea
            id="objective-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className={cn(inputClass, 'mt-1.5 min-h-[100px] py-2')}
            placeholder="Optional: scope, dependencies, or how progress will be measured."
          />
        </div>
      </section>

      {/* Where */}
      <section className="space-y-4" aria-labelledby="obj-section-where">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <Building2 className="h-4 w-4 text-primary" aria-hidden />
          <h3 id="obj-section-where" className="text-sm font-semibold tracking-tight">
            Department & placement
          </h3>
        </div>
        <p className="text-sm text-muted-foreground -mt-1">
          Tie this objective to a <strong className="text-foreground font-medium">department</strong> so it is stored
          with the right team, filters, and reporting scope (Postgres <code className="text-xs">department_id</code>).
        </p>
        <div>
          <FieldLabel
            htmlFor="objective-department"
            tooltip="Stored on the objective so dashboards and leader views can filter by org structure."
            learnMoreHref="/docs#ownership"
          >
            Department
          </FieldLabel>
          <select
            id="objective-department"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            disabled={departmentsLoading}
            className={cn(inputClass, 'mt-1.5')}
          >
            <option value="">
              {departmentsLoading ? 'Loading departments…' : '— Org-wide / not tied to a single department —'}
            </option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>
          {!departmentsLoading && departments.length === 0 && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
              No departments in the directory yet. Add departments under Organization, or save without one for now.
            </p>
          )}
        </div>
      </section>

      {/* Classification */}
      <section className="space-y-4" aria-labelledby="obj-section-class">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <Layers className="h-4 w-4 text-primary" aria-hidden />
          <h3 id="obj-section-class" className="text-sm font-semibold tracking-tight">
            Level & period
          </h3>
        </div>
        <p className="text-sm text-muted-foreground -mt-1">{levelMeta?.hint}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel tooltip="Strategic = org-wide; Functional = division; Tactical = quarterly team." learnMoreHref="/docs#okrs">
              Level
            </FieldLabel>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as ObjectiveLevel)}
              className={cn(inputClass, 'mt-1.5')}
            >
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel tooltip="Fiscal year this objective belongs to." required>
              Fiscal year
            </FieldLabel>
            <Input
              type="number"
              min={2020}
              max={2035}
              value={fiscalYear}
              onChange={(e) => setFiscalYear(Number(e.target.value))}
              className="mt-1.5"
            />
          </div>
        </div>
        {timeline === 'quarterly' && (
          <div className="max-w-xs">
            <FieldLabel tooltip="Quarter for this tactical objective.">Quarter</FieldLabel>
            <select
              value={quarter}
              onChange={(e) => setQuarter(e.target.value)}
              className={cn(inputClass, 'mt-1.5')}
            >
              {QUARTERS.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      {/* Alignment */}
      <section className="space-y-4" aria-labelledby="obj-section-align">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <Link2 className="h-4 w-4 text-primary" aria-hidden />
          <h3 id="obj-section-align" className="text-sm font-semibold tracking-tight">
            Labels & hierarchy
          </h3>
        </div>
        <p className="text-sm text-muted-foreground -mt-1">
          Optional division label for reporting bands; link a parent when this objective rolls up under another.
        </p>
        {(level === 'functional' || level === 'tactical') && (
          <div>
            <FieldLabel tooltip="Short label (e.g. product line) — different from the department pick above.">
              Division label
            </FieldLabel>
            <Input
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              placeholder="e.g. Platform, Growth, Infra"
              className="mt-1.5"
            />
          </div>
        )}
        {showParent && (
          <div>
            <FieldLabel tooltip="Parent objective for hierarchy and roll-up views.">
              Parent objective {level === 'functional' ? '(strategic)' : '(functional)'}
            </FieldLabel>
            <select
              value={parentObjectiveId}
              onChange={(e) => setParentObjectiveId(e.target.value)}
              className={cn(inputClass, 'mt-1.5')}
            >
              <option value="">— None —</option>
              {(level === 'functional' ? strategicParents : functionalParents).map((o) => (
                <option key={o._id} value={o._id}>
                  {o.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-3 border-t border-border pt-6">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving…' : objective ? 'Update objective' : 'Create objective'}
        </Button>
        <Button variant="outline" asChild>
          <Link href={objective ? `/okrs/${objective._id}` : '/okrs'}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
