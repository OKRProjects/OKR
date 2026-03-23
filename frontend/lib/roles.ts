/**
 * App roles aligned with backend app/services/permissions.py.
 * OKR creation is limited to leadership; viewers and IC-style roles do not create objectives by default.
 */

export const OKR_LEADERSHIP_ROLES = [
  'admin',
  'leader',
  'executive',
  'org_owner',
  'vp',
  'director',
  'manager',
] as const;

export type OKRLeadershipRole = (typeof OKR_LEADERSHIP_ROLES)[number];

export const DEPT_SCOPED_LEADER_ROLES = [
  'leader',
  'manager',
  'director',
  'vp',
  'executive',
  'org_owner',
] as const;

export function isOKRLeadershipRole(role: string | undefined | null): role is OKRLeadershipRole {
  if (!role) return false;
  return (OKR_LEADERSHIP_ROLES as readonly string[]).includes(role);
}

export function isDeptScopedLeaderRole(role: string | undefined | null): boolean {
  if (!role) return false;
  return (DEPT_SCOPED_LEADER_ROLES as readonly string[]).includes(role);
}

export function userCanCreateObjectives(role: string | undefined | null): boolean {
  return isOKRLeadershipRole(role);
}

/** All roles assignable in Admin → User management (must match backend USER_APP_ROLES). */
export const ASSIGNABLE_APP_ROLES = [
  'admin',
  'executive',
  'org_owner',
  'vp',
  'director',
  'manager',
  'leader',
  'standard',
  'view_only',
  'developer',
] as const;
