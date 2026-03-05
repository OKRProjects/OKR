/**
 * Mirror of backend app/services/permissions.py for UI gating.
 * Given current user and objective/keyResult, compute what actions are allowed.
 */

import type { User } from '@/lib/auth';
import type { Objective, KeyResult } from '@/lib/api';

export type OKRPermissions = {
  canEditObjective: boolean;
  canEditKr: (kr: KeyResult) => boolean;
  canSubmit: boolean;
  canApproveReject: boolean;
  canResubmit: boolean;
  canDelete: boolean;
  canCreateShareLink: boolean;
};

function strEq(a: string | undefined | null, b: string | undefined | null): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

export function getOKRPermissions(
  user: User | null,
  objective: Objective,
  keyResults: KeyResult[] = []
): OKRPermissions {
  const role = user?.role ?? 'developer';
  const userId = user?.sub ?? '';
  const userDept = user?.departmentId ?? null;
  const objDept = objective.departmentId ?? null;
  const ownerId = objective.ownerId ?? null;

  const canEditObjective =
    role === 'admin' ||
    (role !== 'view_only' && strEq(ownerId, userId)) ||
    (role === 'leader' && objDept && userDept && strEq(objDept, userDept));

  const canEditKr = (kr: KeyResult): boolean => {
    if (role === 'admin') return true;
    if (role === 'view_only') return false;
    if (strEq(kr.ownerId, userId)) return true;
    if (strEq(ownerId, userId)) return true;
    if (role === 'leader' && objDept && userDept && strEq(objDept, userDept)) return true;
    return false;
  };

  const canSubmit =
    role === 'admin' ||
    role === 'leader' ||
    (role !== 'view_only' && strEq(ownerId, userId));

  const canApproveReject =
    role === 'admin' || (role === 'leader' && objDept && userDept && strEq(objDept, userDept));

  const canResubmit = role === 'admin' || (role !== 'view_only' && strEq(ownerId, userId));

  const canDelete =
    role === 'admin' || (role === 'leader' && objDept && userDept && strEq(objDept, userDept));

  const canCreateShareLink =
    role !== 'view_only' &&
    (role === 'admin' ||
      strEq(ownerId, userId) ||
      (role === 'leader' && objDept && userDept && strEq(objDept, userDept)));

  return {
    canEditObjective,
    canEditKr,
    canSubmit,
    canApproveReject,
    canResubmit,
    canDelete,
    canCreateShareLink,
  };
}
