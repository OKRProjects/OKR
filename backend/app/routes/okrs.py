from flask import Blueprint, request, jsonify
from app.db.mongodb import get_db
from app.routes.auth_backend import require_auth
from app.services.permissions import (
    get_user_role,
    can_submit_for_review,
    can_approve_reject,
    can_resubmit,
    can_edit_kr,
    can_edit_objective,
    can_delete_objective,
)
from datetime import datetime, timezone
from bson import ObjectId
from bson.errors import InvalidId

bp = Blueprint('okrs', __name__)


def _now():
    return datetime.now(timezone.utc)


def _serialize_doc(doc, date_fields=None):
    """Convert MongoDB doc to JSON-serializable dict (ObjectId and datetime to string)."""
    if doc is None:
        return None
    date_fields = date_fields or [
        'createdAt', 'updatedAt', 'lastUpdatedAt', 'timestamp', 'recordedAt', 'uploadedAt', 'deletedAt',
    ]
    out = dict(doc)
    if '_id' in out:
        out['_id'] = str(out['_id'])
    for k in list(out.keys()):
        if k in ('parentObjectiveId', 'objectiveId', 'departmentId', 'keyResultId') and out.get(k) is not None:
            out[k] = str(out[k])
        elif k == 'relatedObjectiveIds' and out.get(k) is not None:
            out[k] = [str(x) for x in out[k]]
        elif k in date_fields and out.get(k) is not None and hasattr(out[k], 'isoformat'):
            out[k] = out[k].isoformat()
    return out


def _parse_object_id(value, param_name='id'):
    try:
        return ObjectId(value)
    except InvalidId:
        return None


# ---- Objectives ----

@bp.route('/objectives', methods=['GET'])
@require_auth
def list_objectives(user_id):
    """List objectives with optional filters: fiscalYear, level, division, parentObjectiveId."""
    try:
        db = get_db()
        coll = db.objectives
        q = {}
        fiscal_year = request.args.get('fiscalYear', type=int)
        if fiscal_year is not None:
            q['fiscalYear'] = fiscal_year
        level = request.args.get('level')
        if level:
            q['level'] = level
        division = request.args.get('division')
        if division:
            q['division'] = division
        status = request.args.get('status')
        if status:
            q['status'] = status
        owner_id = request.args.get('ownerId')
        if owner_id:
            q['ownerId'] = owner_id
        parent_id = request.args.get('parentObjectiveId')
        if parent_id:
            oid = _parse_object_id(parent_id)
            if oid is None:
                return jsonify({'error': 'Invalid parentObjectiveId'}), 400
            q['parentObjectiveId'] = oid
        elif parent_id is not None and parent_id == '':
            q['$or'] = [{'parentObjectiveId': None}, {'parentObjectiveId': {'$exists': False}}]

        cursor = coll.find(q).sort('createdAt', -1)
        items = [_serialize_doc(d) for d in cursor]
        return jsonify(items), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/objectives/<objective_id>', methods=['GET'])
@require_auth
def get_objective(objective_id, user_id):
    """Get a single objective by ID. Optional ?since=ISO8601 returns 304-style unchanged if no updates."""
    try:
        oid = _parse_object_id(objective_id)
        if oid is None:
            return jsonify({'error': 'Invalid objective ID'}), 400
        db = get_db()
        doc = db.objectives.find_one({'_id': oid})
        if not doc:
            return jsonify({'error': 'Objective not found'}), 404
        since = request.args.get('since')
        if since:
            try:
                since_dt = datetime.fromisoformat(since.replace('Z', '+00:00'))
                if since_dt.tzinfo is None:
                    since_dt = since_dt.replace(tzinfo=timezone.utc)
            except (ValueError, TypeError):
                since_dt = None
            if since_dt:
                def _as_utc(d):
                    if d is None or not hasattr(d, 'replace'):
                        return None
                    return d.replace(tzinfo=timezone.utc) if d.tzinfo is None else d
                obj_updated = _as_utc(doc.get('updatedAt'))
                latest = obj_updated
                for kr in db.key_results.find({'objectiveId': oid}, {'lastUpdatedAt': 1}):
                    lu = _as_utc(kr.get('lastUpdatedAt'))
                    if lu and (latest is None or lu > latest):
                        latest = lu
                if latest is not None and latest <= since_dt:
                    return jsonify({'unchanged': True}), 200
        return jsonify(_serialize_doc(doc)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ---- Presence (viewers) ----
PRESENCE_TTL_SECONDS = 60


def _get_recent_viewers(db, objective_oid):
    """Return list of presence docs for objective with lastSeenAt within PRESENCE_TTL_SECONDS."""
    from datetime import timedelta
    cutoff = _now() - timedelta(seconds=PRESENCE_TTL_SECONDS)
    cursor = db.presence.find({'objectiveId': objective_oid, 'lastSeenAt': {'$gte': cutoff}})
    return list(cursor)


@bp.route('/objectives/<objective_id>/view', methods=['POST'])
@require_auth
def post_view(objective_id, user_id):
    """Register or refresh presence for this user viewing this objective. Returns current viewers."""
    try:
        oid = _parse_object_id(objective_id)
        if oid is None:
            return jsonify({'error': 'Invalid objective ID'}), 400
        db = get_db()
        if not db.objectives.find_one({'_id': oid}):
            return jsonify({'error': 'Objective not found'}), 404
        data = request.get_json() or {}
        user_name = data.get('userName') or user_id
        now = _now()
        db.presence.update_one(
            {'objectiveId': oid, 'userId': user_id},
            {'$set': {'objectiveId': oid, 'userId': user_id, 'userName': user_name, 'lastSeenAt': now}},
            upsert=True
        )
        viewers = _get_recent_viewers(db, oid)
        out = [
            {'userId': v['userId'], 'userName': v.get('userName') or v['userId']}
            for v in viewers
        ]
        return jsonify({'viewers': out, 'count': len(out)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/objectives/<objective_id>/leave', methods=['POST'])
@require_auth
def post_leave(objective_id, user_id):
    """Remove this user's presence for this objective."""
    try:
        oid = _parse_object_id(objective_id)
        if oid is None:
            return jsonify({'error': 'Invalid objective ID'}), 400
        db = get_db()
        db.presence.delete_one({'objectiveId': oid, 'userId': user_id})
        return jsonify({'message': 'Left'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/objectives', methods=['POST'])
@require_auth
def create_objective(user_id):
    """Create a new objective."""
    try:
        data = request.get_json() or {}
        title = data.get('title')
        if not title:
            return jsonify({'error': 'Title is required'}), 400
        level = data.get('level', 'strategic')
        timeline = data.get('timeline', 'annual')
        fiscal_year = data.get('fiscalYear')
        if fiscal_year is None:
            return jsonify({'error': 'fiscalYear is required'}), 400

        parent_id = data.get('parentObjectiveId')
        parent_oid = None
        if parent_id:
            parent_oid = _parse_object_id(parent_id)
            if parent_oid is None:
                return jsonify({'error': 'Invalid parentObjectiveId'}), 400

        now = datetime.utcnow()
        doc = {
            'title': title,
            'description': data.get('description', ''),
            'ownerId': data.get('ownerId', user_id),
            'level': level,
            'timeline': timeline,
            'fiscalYear': fiscal_year,
            'quarter': data.get('quarter'),
            'parentObjectiveId': parent_oid,
            'division': data.get('division'),
            'status': data.get('status', 'draft'),
            'departmentId': data.get('departmentId'),
            'relatedObjectiveIds': [],
            'createdAt': now,
            'updatedAt': now,
        }
        if data.get('relatedObjectiveIds'):
            oids = [_parse_object_id(x) for x in data['relatedObjectiveIds'] if _parse_object_id(x)]
            doc['relatedObjectiveIds'] = oids
        db = get_db()
        result = db.objectives.insert_one(doc)
        doc['_id'] = result.inserted_id
        return jsonify(_serialize_doc(doc)), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/objectives/<objective_id>', methods=['PUT'])
@require_auth
def update_objective(objective_id, user_id):
    """Update an existing objective."""
    try:
        oid = _parse_object_id(objective_id)
        if oid is None:
            return jsonify({'error': 'Invalid objective ID'}), 400
        data = request.get_json() or {}
        db = get_db()
        existing = db.objectives.find_one({'_id': oid})
        if not existing:
            return jsonify({'error': 'Objective not found'}), 404
        if get_user_role(db, user_id) == 'view_only' or not can_edit_objective(db, user_id, existing):
            return jsonify({'error': 'Not allowed to edit this objective'}), 403

        update = {'updatedAt': _now()}
        for key in ('title', 'description', 'ownerId', 'level', 'timeline', 'fiscalYear', 'quarter', 'division', 'status', 'departmentId'):
            if key in data:
                update[key] = data[key]
        if 'relatedObjectiveIds' in data:
            ids = data['relatedObjectiveIds']
            if isinstance(ids, list):
                update['relatedObjectiveIds'] = [_parse_object_id(x) for x in ids if _parse_object_id(x)]
            else:
                update['relatedObjectiveIds'] = []
        if 'parentObjectiveId' in data:
            if data['parentObjectiveId'] is None or data['parentObjectiveId'] == '':
                update['parentObjectiveId'] = None
            else:
                poid = _parse_object_id(data['parentObjectiveId'])
                if poid is None:
                    return jsonify({'error': 'Invalid parentObjectiveId'}), 400
                update['parentObjectiveId'] = poid

        db.objectives.update_one({'_id': oid}, {'$set': update})
        updated = db.objectives.find_one({'_id': oid})
        return jsonify(_serialize_doc(updated)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/objectives/<objective_id>', methods=['DELETE'])
@require_auth
def delete_objective(objective_id, user_id):
    """Delete an objective and its key results."""
    try:
        oid = _parse_object_id(objective_id)
        if oid is None:
            return jsonify({'error': 'Invalid objective ID'}), 400
        db = get_db()
        existing = db.objectives.find_one({'_id': oid})
        if not existing:
            return jsonify({'error': 'Objective not found'}), 404
        if not can_delete_objective(db, user_id, existing):
            return jsonify({'error': 'Not allowed to delete this objective'}), 403
        db.key_results.delete_many({'objectiveId': oid})
        db.objectives.delete_one({'_id': oid})
        return jsonify({'message': 'Objective deleted'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/objectives/<objective_id>/workflow-history', methods=['GET'])
@require_auth
def get_workflow_history(objective_id, user_id):
    """List workflow events for an objective (audit trail)."""
    try:
        oid = _parse_object_id(objective_id)
        if oid is None:
            return jsonify({'error': 'Invalid objective ID'}), 400
        db = get_db()
        if not db.objectives.find_one({'_id': oid}):
            return jsonify({'error': 'Objective not found'}), 404
        cursor = db.workflow_events.find({'objectiveId': oid}).sort('timestamp', -1)
        items = [_serialize_doc(d) for d in cursor]
        return jsonify(items), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def _objective_with_score(db, doc):
    """Return serialized objective with averageScore from key results."""
    out = _serialize_doc(doc)
    krs = list(db.key_results.find({'objectiveId': doc['_id']}))
    scores = [kr.get('score') for kr in krs if kr.get('score') is not None]
    out['averageScore'] = round(sum(scores) / len(scores), 2) if scores else None
    return out


@bp.route('/objectives/<objective_id>/dependencies', methods=['GET'])
@require_auth
def get_dependencies(objective_id, user_id):
    """Return upstream (this relates to) and downstream (what depends on this) objectives."""
    try:
        oid = _parse_object_id(objective_id)
        if oid is None:
            return jsonify({'error': 'Invalid objective ID'}), 400
        db = get_db()
        obj = db.objectives.find_one({'_id': oid})
        if not obj:
            return jsonify({'error': 'Objective not found'}), 404
        related_ids = obj.get('relatedObjectiveIds') or []
        upstream = []
        for rid in related_ids:
            doc = db.objectives.find_one({'_id': rid})
            if doc:
                upstream.append(_objective_with_score(db, doc))
        downstream_docs = list(db.objectives.find({'relatedObjectiveIds': oid}))
        downstream = [_objective_with_score(db, d) for d in downstream_docs]
        return jsonify({'upstream': upstream, 'downstream': downstream}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def _workflow_transition(objective_id, user_id, from_status, to_status, reason=None):
    """Update objective status and log WorkflowEvent. Returns (response, status_code) or (None, None) on success."""
    oid = _parse_object_id(objective_id)
    if oid is None:
        return jsonify({'error': 'Invalid objective ID'}), 400
    db = get_db()
    obj = db.objectives.find_one({'_id': oid})
    if not obj:
        return jsonify({'error': 'Objective not found'}), 404
    current = obj.get('status', 'draft')
    if current != from_status:
        return jsonify({'error': f'Objective is not in {from_status} state'}), 400
    now = _now()
    db.workflow_events.insert_one({
        'objectiveId': oid,
        'fromStatus': from_status,
        'toStatus': to_status,
        'actorId': user_id,
        'reason': reason,
        'timestamp': now,
    })
    db.objectives.update_one({'_id': oid}, {'$set': {'status': to_status, 'updatedAt': now}})
    updated = db.objectives.find_one({'_id': oid})
    return jsonify(_serialize_doc(updated)), 200


@bp.route('/objectives/<objective_id>/submit', methods=['POST'])
@require_auth
def submit_objective(objective_id, user_id):
    """DRAFT -> IN_REVIEW. Allowed: owner, leader, admin."""
    try:
        oid = _parse_object_id(objective_id)
        if oid is None:
            return jsonify({'error': 'Invalid objective ID'}), 400
        db = get_db()
        obj = db.objectives.find_one({'_id': oid})
        if not obj:
            return jsonify({'error': 'Objective not found'}), 404
        if obj.get('status') != 'draft':
            return jsonify({'error': 'Objective is not in draft state'}), 400
        if not can_submit_for_review(db, user_id, obj):
            return jsonify({'error': 'Not allowed to submit for review'}), 403
        return _workflow_transition(objective_id, user_id, 'draft', 'in_review')
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/objectives/<objective_id>/approve', methods=['POST'])
@require_auth
def approve_objective(objective_id, user_id):
    """IN_REVIEW -> APPROVED. Allowed: leader (same dept), admin."""
    try:
        oid = _parse_object_id(objective_id)
        if oid is None:
            return jsonify({'error': 'Invalid objective ID'}), 400
        db = get_db()
        obj = db.objectives.find_one({'_id': oid})
        if not obj:
            return jsonify({'error': 'Objective not found'}), 404
        if obj.get('status') != 'in_review':
            return jsonify({'error': 'Objective is not in review'}), 400
        if not can_approve_reject(db, user_id, obj):
            return jsonify({'error': 'Not allowed to approve'}), 403
        return _workflow_transition(objective_id, user_id, 'in_review', 'approved')
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/objectives/<objective_id>/reject', methods=['POST'])
@require_auth
def reject_objective(objective_id, user_id):
    """IN_REVIEW -> REJECTED. Allowed: leader (same dept), admin. Body: { reason? }."""
    try:
        oid = _parse_object_id(objective_id)
        if oid is None:
            return jsonify({'error': 'Invalid objective ID'}), 400
        db = get_db()
        obj = db.objectives.find_one({'_id': oid})
        if not obj:
            return jsonify({'error': 'Objective not found'}), 404
        if obj.get('status') != 'in_review':
            return jsonify({'error': 'Objective is not in review'}), 400
        if not can_approve_reject(db, user_id, obj):
            return jsonify({'error': 'Not allowed to reject'}), 403
        data = request.get_json() or {}
        reason = data.get('reason', '')
        return _workflow_transition(objective_id, user_id, 'in_review', 'rejected', reason=reason)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/objectives/<objective_id>/resubmit', methods=['POST'])
@require_auth
def resubmit_objective(objective_id, user_id):
    """REJECTED -> IN_REVIEW. Allowed: owner, admin."""
    try:
        oid = _parse_object_id(objective_id)
        if oid is None:
            return jsonify({'error': 'Invalid objective ID'}), 400
        db = get_db()
        obj = db.objectives.find_one({'_id': oid})
        if not obj:
            return jsonify({'error': 'Objective not found'}), 404
        if obj.get('status') != 'rejected':
            return jsonify({'error': 'Objective is not rejected'}), 400
        if not can_resubmit(db, user_id, obj):
            return jsonify({'error': 'Not allowed to resubmit'}), 403
        return _workflow_transition(objective_id, user_id, 'rejected', 'in_review')
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/objectives/<objective_id>/tree', methods=['GET'])
@require_auth
def get_objective_tree(objective_id, user_id):
    """Get objective with full tree of children (recursive) and key results. Roll-up view."""
    try:
        oid = _parse_object_id(objective_id)
        if oid is None:
            return jsonify({'error': 'Invalid objective ID'}), 400
        db = get_db()
        root = db.objectives.find_one({'_id': oid})
        if not root:
            return jsonify({'error': 'Objective not found'}), 404

        def build_node(obj_doc):
            node = _serialize_doc(obj_doc)
            node_id = obj_doc['_id']
            children = list(db.objectives.find({'parentObjectiveId': node_id}))
            node['children'] = [build_node(c) for c in children]
            krs = list(db.key_results.find({'objectiveId': node_id}))
            node['keyResults'] = [_serialize_doc(kr) for kr in krs]
            scores = [kr.get('score') for kr in krs if kr.get('score') is not None]
            node['averageScore'] = round(sum(scores) / len(scores), 1) if scores else None
            return node

        tree = build_node(root)
        return jsonify(tree), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ---- Key Results ----

@bp.route('/key-results', methods=['GET'])
@require_auth
def list_key_results(user_id):
    """List key results, optionally filtered by objectiveId."""
    try:
        objective_id = request.args.get('objectiveId')
        if not objective_id:
            return jsonify({'error': 'objectiveId query param is required'}), 400
        oid = _parse_object_id(objective_id)
        if oid is None:
            return jsonify({'error': 'Invalid objectiveId'}), 400
        db = get_db()
        cursor = db.key_results.find({'objectiveId': oid})
        items = [_serialize_doc(d) for d in cursor]
        return jsonify(items), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/key-results/<kr_id>', methods=['GET'])
@require_auth
def get_key_result(kr_id, user_id):
    """Get a single key result by ID."""
    try:
        kid = _parse_object_id(kr_id)
        if kid is None:
            return jsonify({'error': 'Invalid key result ID'}), 400
        db = get_db()
        doc = db.key_results.find_one({'_id': kid})
        if not doc:
            return jsonify({'error': 'Key result not found'}), 404
        return jsonify(_serialize_doc(doc)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/key-results/<kr_id>/history', methods=['GET'])
@require_auth
def get_key_result_history(kr_id, user_id):
    """List score history for a key result (for trend charts)."""
    try:
        kid = _parse_object_id(kr_id)
        if kid is None:
            return jsonify({'error': 'Invalid key result ID'}), 400
        db = get_db()
        if not db.key_results.find_one({'_id': kid}):
            return jsonify({'error': 'Key result not found'}), 404
        cursor = db.score_history.find({'keyResultId': kid}).sort('recordedAt', 1)
        items = [_serialize_doc(d) for d in cursor]
        return jsonify(items), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/key-results', methods=['POST'])
@require_auth
def create_key_result(user_id):
    """Create a new key result."""
    try:
        data = request.get_json() or {}
        objective_id = data.get('objectiveId')
        title = data.get('title')
        if not objective_id or not title:
            return jsonify({'error': 'objectiveId and title are required'}), 400
        oid = _parse_object_id(objective_id)
        if oid is None:
            return jsonify({'error': 'Invalid objectiveId'}), 400
        db = get_db()
        if not db.objectives.find_one({'_id': oid}):
            return jsonify({'error': 'Objective not found'}), 404
        now = _now()
        doc = {
            'objectiveId': oid,
            'title': title,
            'target': data.get('target'),
            'currentValue': data.get('currentValue'),
            'unit': data.get('unit', ''),
            'score': data.get('score'),
            'targetScore': data.get('targetScore', 1.0),
            'ownerId': data.get('ownerId', user_id),
            'notes': data.get('notes', []),
            'createdAt': now,
            'lastUpdatedAt': now,
        }
        result = db.key_results.insert_one(doc)
        doc['_id'] = result.inserted_id
        return jsonify(_serialize_doc(doc)), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/key-results/<kr_id>', methods=['PUT'])
@require_auth
def update_key_result(kr_id, user_id):
    """Update a key result (including progress: currentValue, score, notes). Appends to score_history when score/notes change.
    Optional body field lastUpdatedAt: if sent and server has a newer lastUpdatedAt, returns 409 Conflict."""
    try:
        kid = _parse_object_id(kr_id)
        if kid is None:
            return jsonify({'error': 'Invalid key result ID'}), 400
        data = request.get_json() or {}
        db = get_db()
        existing = db.key_results.find_one({'_id': kid})
        if not existing:
            return jsonify({'error': 'Key result not found'}), 404
        objective = db.objectives.find_one({'_id': existing['objectiveId']}) if existing.get('objectiveId') else None
        if get_user_role(db, user_id) == 'view_only' or not can_edit_kr(db, user_id, existing, objective):
            return jsonify({'error': 'Not allowed to edit this key result'}), 403
        client_last = data.get('lastUpdatedAt')
        if client_last:
            try:
                client_dt = datetime.fromisoformat(client_last.replace('Z', '+00:00'))
                if client_dt.tzinfo is None:
                    client_dt = client_dt.replace(tzinfo=timezone.utc)
            except (ValueError, TypeError):
                client_dt = None
            server_last = existing.get('lastUpdatedAt')
            if server_last and client_dt:
                server_dt = server_last.replace(tzinfo=timezone.utc) if getattr(server_last, 'tzinfo', None) is None else server_last
                if server_dt > client_dt:
                    return jsonify({
                        'error': 'conflict',
                        'message': 'This key result was updated by someone else. Reload to see their changes.',
                        'current': _serialize_doc(existing),
                    }), 409
        now = _now()
        update = {'lastUpdatedAt': now}
        for key in ('title', 'target', 'currentValue', 'unit', 'score', 'targetScore', 'ownerId', 'notes'):
            if key in data:
                update[key] = data[key]
        db.key_results.update_one({'_id': kid}, {'$set': update})
        if 'score' in data or 'notes' in data:
            score = update.get('score', existing.get('score'))
            if score is not None:
                notes_snippet = None
                if 'notes' in update and update['notes']:
                    notes_snippet = update['notes'][-1].get('text', '')[:500] if isinstance(update['notes'][-1], dict) else str(update['notes'][-1])[:500]
                db.score_history.insert_one({
                    'keyResultId': kid,
                    'score': float(score),
                    'notes': notes_snippet,
                    'recordedBy': user_id,
                    'recordedAt': now,
                })
        updated = db.key_results.find_one({'_id': kid})
        return jsonify(_serialize_doc(updated)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/key-results/<kr_id>', methods=['DELETE'])
@require_auth
def delete_key_result(kr_id, user_id):
    """Delete a key result."""
    try:
        kid = _parse_object_id(kr_id)
        if kid is None:
            return jsonify({'error': 'Invalid key result ID'}), 400
        db = get_db()
        existing = db.key_results.find_one({'_id': kid})
        if not existing:
            return jsonify({'error': 'Key result not found'}), 404
        db.key_results.delete_one({'_id': kid})
        return jsonify({'message': 'Key result deleted'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ---- Comments ----

@bp.route('/objectives/<objective_id>/comments', methods=['GET'])
@require_auth
def list_comments(objective_id, user_id):
    """List comments for an objective."""
    try:
        oid = _parse_object_id(objective_id)
        if oid is None:
            return jsonify({'error': 'Invalid objective ID'}), 400
        db = get_db()
        if not db.objectives.find_one({'_id': oid}):
            return jsonify({'error': 'Objective not found'}), 404
        cursor = db.comments.find({'objectiveId': oid}).sort('createdAt', 1)
        items = [_serialize_doc(d) for d in cursor]
        return jsonify(items), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/objectives/<objective_id>/comments', methods=['POST'])
@require_auth
def create_comment(objective_id, user_id):
    """Add a comment. Body: { body }."""
    try:
        oid = _parse_object_id(objective_id)
        if oid is None:
            return jsonify({'error': 'Invalid objective ID'}), 400
        data = request.get_json() or {}
        body = data.get('body', '').strip()
        if not body:
            return jsonify({'error': 'body is required'}), 400
        db = get_db()
        if not db.objectives.find_one({'_id': oid}):
            return jsonify({'error': 'Objective not found'}), 404
        if get_user_role(db, user_id) == 'view_only':
            return jsonify({'error': 'Not allowed to comment'}), 403
        now = _now()
        doc = {
            'objectiveId': oid,
            'authorId': user_id,
            'body': body,
            'createdAt': now,
        }
        result = db.comments.insert_one(doc)
        doc['_id'] = result.inserted_id
        return jsonify(_serialize_doc(doc)), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ---- Attachments ----

@bp.route('/objectives/<objective_id>/attachments', methods=['GET'])
@require_auth
def list_attachments(objective_id, user_id):
    """List attachments for an objective (exclude soft-deleted)."""
    try:
        oid = _parse_object_id(objective_id)
        if oid is None:
            return jsonify({'error': 'Invalid objective ID'}), 400
        db = get_db()
        if not db.objectives.find_one({'_id': oid}):
            return jsonify({'error': 'Objective not found'}), 404
        cursor = db.attachments.find({'objectiveId': oid, 'deletedAt': None})
        items = [_serialize_doc(d) for d in cursor]
        return jsonify(items), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/attachments', methods=['POST'])
@require_auth
def create_attachment(user_id):
    """Create attachment: JSON { objectiveId, keyResultId?, fileName, fileSize, fileType, url } or multipart with file + objectiveId + keyResultId?."""
    try:
        db = get_db()
        url = None
        file_name = None
        file_size = 0
        file_type = ''

        if request.content_type and 'multipart/form-data' in request.content_type:
            objective_id = request.form.get('objectiveId')
            key_result_id = request.form.get('keyResultId') or None
            file = request.files.get('file')
            if not objective_id or not file:
                return jsonify({'error': 'objectiveId and file are required'}), 400
            oid = _parse_object_id(objective_id)
            if oid is None:
                return jsonify({'error': 'Invalid objectiveId'}), 400
            if not db.objectives.find_one({'_id': oid}):
                return jsonify({'error': 'Objective not found'}), 404
            if get_user_role(db, user_id) == 'view_only':
                return jsonify({'error': 'Not allowed to upload'}), 403
            try:
                from app.config.cloudinary_config import upload_file as cloudinary_upload
                result = cloudinary_upload(file, folder='okr_attachments')
                url = result.get('secure_url')
                file_name = file.filename or 'upload'
                file_size = result.get('bytes') or 0
                file_type = (file.content_type or 'application/octet-stream')
            except Exception as e:
                return jsonify({'error': f'Upload failed: {str(e)}'}), 500
            kr_oid = _parse_object_id(key_result_id) if key_result_id else None
        else:
            data = request.get_json() or {}
            objective_id = data.get('objectiveId')
            if not objective_id:
                return jsonify({'error': 'objectiveId is required'}), 400
            oid = _parse_object_id(objective_id)
            if oid is None:
                return jsonify({'error': 'Invalid objectiveId'}), 400
            if not db.objectives.find_one({'_id': oid}):
                return jsonify({'error': 'Objective not found'}), 404
            if get_user_role(db, user_id) == 'view_only':
                return jsonify({'error': 'Not allowed to upload'}), 403
            url = data.get('url')
            file_name = data.get('fileName', '')
            file_size = data.get('fileSize', 0) or 0
            file_type = data.get('fileType', '') or 'application/octet-stream'
            key_result_id = data.get('keyResultId')
            kr_oid = _parse_object_id(key_result_id) if key_result_id else None
            if not url or not file_name:
                return jsonify({'error': 'url and fileName are required'}), 400

        now = _now()
        doc = {
            'objectiveId': oid,
            'keyResultId': kr_oid,
            'fileName': file_name,
            'fileSize': file_size,
            'fileType': file_type,
            'url': url,
            'uploadedBy': user_id,
            'uploadedAt': now,
            'deletedAt': None,
        }
        result = db.attachments.insert_one(doc)
        doc['_id'] = result.inserted_id
        return jsonify(_serialize_doc(doc)), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/attachments/<attachment_id>', methods=['DELETE'])
@require_auth
def delete_attachment(attachment_id, user_id):
    """Soft-delete an attachment (set deletedAt)."""
    try:
        aid = _parse_object_id(attachment_id)
        if aid is None:
            return jsonify({'error': 'Invalid attachment ID'}), 400
        db = get_db()
        existing = db.attachments.find_one({'_id': aid})
        if not existing:
            return jsonify({'error': 'Attachment not found'}), 404
        if existing.get('deletedAt'):
            return jsonify({'message': 'Attachment already deleted'}), 200
        obj = db.objectives.find_one({'_id': existing['objectiveId']}) if existing.get('objectiveId') else None
        if not can_edit_objective(db, user_id, obj) and get_user_role(db, user_id) != 'admin':
            return jsonify({'error': 'Not allowed to delete this attachment'}), 403
        now = _now()
        db.attachments.update_one({'_id': aid}, {'$set': {'deletedAt': now}})
        return jsonify({'message': 'Attachment deleted'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
