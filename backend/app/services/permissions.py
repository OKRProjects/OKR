"""Role-based permissions for OKR actions. User role from db.users (keyed by Auth0 sub)."""
from typing import Optional

ROLE_ADMIN = 'admin'
ROLE_LEADER = 'leader'
ROLE_STANDARD = 'standard'
ROLE_VIEW_ONLY = 'view_only'


def get_user_role(db, user_id: str) -> str:
    """Get role for user_id (Auth0 sub). Returns view_only if not in users collection."""
    user = db.users.find_one({'_id': user_id})
    if not user:
        return ROLE_VIEW_ONLY
    return user.get('role', ROLE_STANDARD)


def get_user_department_id(db, user_id: str) -> Optional[str]:
    """Get departmentId for user (string)."""
    user = db.users.find_one({'_id': user_id})
    if not user or not user.get('departmentId'):
        return None
    return str(user['departmentId'])


def can_edit_objective(db, user_id: str, objective: dict) -> bool:
    """True if user can edit this objective (and its KRs). Owner, leader of same dept, or admin."""
    role = get_user_role(db, user_id)
    if role == ROLE_ADMIN:
        return True
    if role == ROLE_VIEW_ONLY:
        return False
    if objective.get('ownerId') == user_id:
        return True
    if role == ROLE_LEADER:
        obj_dept = objective.get('departmentId')
        user_dept = get_user_department_id(db, user_id)
        if obj_dept and user_dept and str(obj_dept) == user_dept:
            return True
    return False


def can_edit_kr(db, user_id: str, kr: dict, objective: Optional[dict] = None) -> bool:
    """True if user can edit this key result. KR owner, objective owner, leader in dept, or admin."""
    role = get_user_role(db, user_id)
    if role == ROLE_ADMIN:
        return True
    if role == ROLE_VIEW_ONLY:
        return False
    if kr.get('ownerId') == user_id:
        return True
    if objective and objective.get('ownerId') == user_id:
        return True
    if role == ROLE_LEADER and objective:
        obj_dept = objective.get('departmentId')
        user_dept = get_user_department_id(db, user_id)
        if obj_dept and user_dept and str(obj_dept) == user_dept:
            return True
    return False


def can_submit_for_review(db, user_id: str, objective: dict) -> bool:
    """Submit for review: owner, leader, admin."""
    role = get_user_role(db, user_id)
    if role in (ROLE_ADMIN, ROLE_LEADER):
        return True
    if role == ROLE_VIEW_ONLY:
        return False
    return objective.get('ownerId') == user_id


def can_approve_reject(db, user_id: str, objective: dict) -> bool:
    """Approve/reject/request changes: leader (same dept), admin."""
    role = get_user_role(db, user_id)
    if role == ROLE_ADMIN:
        return True
    if role != ROLE_LEADER:
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


def can_delete_objective(db, user_id: str, objective: dict) -> bool:
    """Full control: admin or leader in dept."""
    role = get_user_role(db, user_id)
    if role == ROLE_ADMIN:
        return True
    if role != ROLE_LEADER:
        return False
    obj_dept = objective.get('departmentId')
    user_dept = get_user_department_id(db, user_id)
    return obj_dept and user_dept and str(obj_dept) == user_dept
