"""Role-based permissions for OKR actions. User role from db.users (keyed by Auth0 sub).

Product model: OKR ownership starts at manager level; individual contributors are viewers by default.
Leadership roles can create objectives and act as department-scoped approvers where applicable.
"""
from typing import Optional

ROLE_ADMIN = 'admin'
ROLE_LEADER = 'leader'
ROLE_STANDARD = 'standard'
ROLE_VIEW_ONLY = 'view_only'
ROLE_DEVELOPER = 'developer'
# Leadership / OKR owner roles (lowest typical owner: manager)
ROLE_EXECUTIVE = 'executive'
ROLE_ORG_OWNER = 'org_owner'
ROLE_VP = 'vp'
ROLE_DIRECTOR = 'director'
ROLE_MANAGER = 'manager'

# Roles allowed to create new objectives (manager is the lowest tier that owns OKRs).
OKR_LEADERSHIP_ROLES = frozenset({
    ROLE_ADMIN,
    ROLE_LEADER,
    ROLE_EXECUTIVE,
    ROLE_ORG_OWNER,
    ROLE_VP,
    ROLE_DIRECTOR,
    ROLE_MANAGER,
})

# Roles that can approve/reject and edit objectives in their department (same rules as legacy "leader").
DEPT_SCOPED_LEADER_ROLES = frozenset({
    ROLE_LEADER,
    ROLE_MANAGER,
    ROLE_DIRECTOR,
    ROLE_VP,
    ROLE_EXECUTIVE,
    ROLE_ORG_OWNER,
})


def _is_dept_scoped_leader(role: str) -> bool:
    return role in DEPT_SCOPED_LEADER_ROLES


def get_user_role(db, user_id: str) -> str:
    """Get role for user_id (Auth0 sub). Returns developer if not in users collection or no role."""
    user = db.users.find_one({'_id': user_id})
    if not user:
        return ROLE_DEVELOPER
    return user.get('role', ROLE_DEVELOPER)


def get_user_department_id(db, user_id: str) -> Optional[str]:
    """Get departmentId for user (string)."""
    user = db.users.find_one({'_id': user_id})
    if not user or not user.get('departmentId'):
        return None
    return str(user['departmentId'])


def can_create_objective(db, user_id: str) -> bool:
    """True if user may create a new objective (leadership roles only; not viewer/IC/standard/developer)."""
    return get_user_role(db, user_id) in OKR_LEADERSHIP_ROLES


def can_edit_objective(db, user_id: str, objective: dict) -> bool:
    """True if user can edit this objective (and its KRs). Owner, dept-scoped leader of same dept, or admin."""
    role = get_user_role(db, user_id)
    if role == ROLE_ADMIN:
        return True
    if role == ROLE_VIEW_ONLY:
        return False
    if objective.get('ownerId') == user_id:
        return True
    if _is_dept_scoped_leader(role):
        obj_dept = objective.get('departmentId')
        user_dept = get_user_department_id(db, user_id)
        if obj_dept and user_dept and str(obj_dept) == user_dept:
            return True
    return False


def can_edit_kr(db, user_id: str, kr: dict, objective: Optional[dict] = None) -> bool:
    """True if user can edit this key result. KR owner, objective owner, dept leader in dept, or admin."""
    role = get_user_role(db, user_id)
    if role == ROLE_ADMIN:
        return True
    if role == ROLE_VIEW_ONLY:
        return False
    if kr.get('ownerId') == user_id:
        return True
    if objective and objective.get('ownerId') == user_id:
        return True
    if objective and _is_dept_scoped_leader(role):
        obj_dept = objective.get('departmentId')
        user_dept = get_user_department_id(db, user_id)
        if obj_dept and user_dept and str(obj_dept) == user_dept:
            return True
    return False


def can_submit_for_review(db, user_id: str, objective: dict) -> bool:
    """Submit for review: admin, any dept-scoped leader, or objective owner (if not view-only)."""
    role = get_user_role(db, user_id)
    if role == ROLE_ADMIN or _is_dept_scoped_leader(role):
        return True
    if role == ROLE_VIEW_ONLY:
        return False
    return objective.get('ownerId') == user_id


def can_approve_reject(db, user_id: str, objective: dict) -> bool:
    """Approve/reject/request changes: dept-scoped leader (same dept), admin."""
    role = get_user_role(db, user_id)
    if role == ROLE_ADMIN:
        return True
    if not _is_dept_scoped_leader(role):
        return False
    obj_dept = objective.get('departmentId')
    user_dept = get_user_department_id(db, user_id)
    return obj_dept and user_dept and str(obj_dept) == user_dept


def can_resubmit(db, user_id: str, objective: dict) -> bool:
    """Resubmit after reject: owner, admin."""
    role = get_user_role(db, user_id)
    if role == ROLE_ADMIN:
        return True
    if role == ROLE_VIEW_ONLY:
        return False
    return objective.get('ownerId') == user_id


def can_reopen(db, user_id: str, objective: dict) -> bool:
    """Reopen (approved/rejected -> draft): admin only."""
    role = get_user_role(db, user_id)
    if role != ROLE_ADMIN:
        return False
    status = (objective.get('status') or '').lower()
    return status in ('approved', 'rejected')


def can_delete_objective(db, user_id: str, objective: dict) -> bool:
    """Full control: admin or dept-scoped leader in dept."""
    role = get_user_role(db, user_id)
    if role == ROLE_ADMIN:
        return True
    if not _is_dept_scoped_leader(role):
        return False
    obj_dept = objective.get('departmentId')
    user_dept = get_user_department_id(db, user_id)
    return obj_dept and user_dept and str(obj_dept) == user_dept


USER_APP_ROLES = frozenset({
    ROLE_ADMIN,
    ROLE_LEADER,
    ROLE_STANDARD,
    ROLE_VIEW_ONLY,
    ROLE_DEVELOPER,
    ROLE_EXECUTIVE,
    ROLE_ORG_OWNER,
    ROLE_VP,
    ROLE_DIRECTOR,
    ROLE_MANAGER,
})


def can_create_share_link(db, user_id: str, objective: dict) -> bool:
    """True if user can create a share link for this objective. Not view_only; admin, owner, or dept leader in same dept."""
    role = get_user_role(db, user_id)
    if role == ROLE_VIEW_ONLY:
        return False
    if role == ROLE_ADMIN:
        return True
    if objective.get('ownerId') == user_id:
        return True
    if _is_dept_scoped_leader(role):
        obj_dept = objective.get('departmentId')
        user_dept = get_user_department_id(db, user_id)
        if obj_dept and user_dept and str(obj_dept) == user_dept:
            return True
    return False
