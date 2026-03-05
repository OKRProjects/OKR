'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api, type Objective } from '@/lib/api';

type Status = 'draft' | 'in_review' | 'approved' | 'rejected';

interface WorkflowActionsProps {
  objective: Objective;
  onUpdate: (updated: Objective) => void;
  onError?: (message: string) => void;
  /** When false, hide Submit for Review. Default true for backward compat. */
  canSubmit?: boolean;
  /** When false, hide Approve/Reject. Default true. */
  canApproveReject?: boolean;
  /** When false, hide Resubmit. Default true. */
  canResubmit?: boolean;
}

export function WorkflowActions({
  objective,
  onUpdate,
  onError,
  canSubmit = true,
  canApproveReject = true,
  canResubmit = true,
}: WorkflowActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const status = (objective.status as Status) ?? 'draft';

  const run = async (
    action: () => Promise<Objective>,
    label: string
  ) => {
    setLoading(label);
    try {
      const updated = await action();
      onUpdate(updated);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Action failed';
      onError?.(msg);
    } finally {
      setLoading(null);
    }
  };

  if (status === 'approved') {
    return (
      <span className="text-sm text-muted-foreground">Approved</span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === 'draft' && canSubmit && (
        <Button
          size="sm"
          disabled={!!loading}
          className="min-h-[44px] min-w-[44px] touch-manipulation"
          onClick={() =>
            objective._id && run(() => api.submitObjective(objective._id!), 'Submit')
          }
        >
          {loading === 'Submit' ? 'Submitting…' : 'Submit for Review'}
        </Button>
      )}
      {status === 'in_review' && canApproveReject && (
        <>
          <Button
            size="sm"
            disabled={!!loading}
            className="min-h-[44px] min-w-[44px] touch-manipulation"
            onClick={() =>
              objective._id && run(() => api.approveObjective(objective._id!), 'Approve')
            }
          >
            {loading === 'Approve' ? 'Approving…' : 'Approve'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!!loading}
            className="min-h-[44px] min-w-[44px] touch-manipulation"
            onClick={() =>
              objective._id &&
              run(
                () => api.rejectObjective(objective._id!, 'Requested changes'),
                'Reject'
              )
            }
          >
            {loading === 'Reject' ? 'Rejecting…' : 'Reject'}
          </Button>
        </>
      )}
      {status === 'rejected' && canResubmit && (
        <Button
          size="sm"
          disabled={!!loading}
          className="min-h-[44px] min-w-[44px] touch-manipulation"
          onClick={() =>
            objective._id && run(() => api.resubmitObjective(objective._id!), 'Resubmit')
          }
        >
          {loading === 'Resubmit' ? 'Resubmitting…' : 'Resubmit'}
        </Button>
      )}
    </div>
  );
}
