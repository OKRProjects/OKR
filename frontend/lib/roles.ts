/**
 * App roles aligned with backend app/services/permissions.py.
 * Any role may create objectives unless an admin sets ``okrCreateDisabled`` on the user (User management).
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

function normalizeAppRole(role: string | undefined | null): string {
  return (role ?? '').trim().toLowerCase();
}

/** True when the signed-in account is **admin** from `/auth/me` (not “Switch role” preview). */
export function isAdminAccount(u: { role?: string } | null | undefined): boolean {
  return normalizeAppRole(u?.role) === 'admin';
}

/**
 * User management / admin-only nav: real admin from API, and not previewing a non-admin role.
 * (Admins who use “Test role → View only” should not see User management until they pick Actual.)
 */
export function shouldShowUserManagementNav(
  user: { role?: string } | null | undefined,
  rolePreview: string | null | undefined
): boolean {
  if (!isAdminAccount(user)) return false;
  if (rolePreview == null) return true;
  return normalizeAppRole(rolePreview) === 'admin';
}

/** True if this account may create objectives. Admins always can; others blocked when ``okrCreateDisabled``. */
export function userCanCreateObjectives(
  u: { role?: string; okrCreateDisabled?: boolean } | null | undefined
): boolean {
  if (!u) return false;
  if (isAdminAccount(u)) return true;
  if (u.okrCreateDisabled === true) return false;
  return true;
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
