from flask import Blueprint, request, jsonify
from app.db.mongodb import get_db
from app.routes.auth_backend import require_auth
from datetime import datetime
from bson import ObjectId
from bson.errors import InvalidId

bp = Blueprint('okrs', __name__)


def _serialize_doc(doc, date_fields=None):
    """Convert MongoDB doc to JSON-serializable dict (ObjectId and datetime to string)."""
    if doc is None:
        return None
    date_fields = date_fields or ['createdAt', 'updatedAt', 'lastUpdatedAt']
    out = dict(doc)
    if '_id' in out:
        out['_id'] = str(out['_id'])
    for k in list(out.keys()):
        if k == 'parentObjectiveId' and out.get(k) is not None:
            out[k] = str(out[k])
        elif k == 'objectiveId' and out.get(k) is not None:
            out[k] = str(out[k])
        elif k in date_fields and out.get(k) is not None and isinstance(out[k], datetime):
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
    """Get a single objective by ID."""
    try:
        oid = _parse_object_id(objective_id)
        if oid is None:
            return jsonify({'error': 'Invalid objective ID'}), 400
        db = get_db()
        doc = db.objectives.find_one({'_id': oid})
        if not doc:
            return jsonify({'error': 'Objective not found'}), 404
        return jsonify(_serialize_doc(doc)), 200
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
            'createdAt': now,
            'updatedAt': now,
        }
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

        update = {'updatedAt': datetime.utcnow()}
        for key in ('title', 'description', 'ownerId', 'level', 'timeline', 'fiscalYear', 'quarter', 'division'):
            if key in data:
                update[key] = data[key]
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
        db.key_results.delete_many({'objectiveId': oid})
        db.objectives.delete_one({'_id': oid})
        return jsonify({'message': 'Objective deleted'}), 200
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
        now = datetime.utcnow()
        doc = {
            'objectiveId': oid,
            'title': title,
            'target': data.get('target'),
            'currentValue': data.get('currentValue'),
            'unit': data.get('unit', ''),
            'score': data.get('score'),
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
    """Update a key result (including progress: currentValue, score, notes)."""
    try:
        kid = _parse_object_id(kr_id)
        if kid is None:
            return jsonify({'error': 'Invalid key result ID'}), 400
        data = request.get_json() or {}
        db = get_db()
        existing = db.key_results.find_one({'_id': kid})
        if not existing:
            return jsonify({'error': 'Key result not found'}), 404
        update = {'lastUpdatedAt': datetime.utcnow()}
        for key in ('title', 'target', 'currentValue', 'unit', 'score', 'notes'):
            if key in data:
                update[key] = data[key]
        db.key_results.update_one({'_id': kid}, {'$set': update})
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
