from flask import Blueprint, request, jsonify
from app.db.mongodb import get_db
from app.models.item import Item
from app.routes.auth import require_auth
from datetime import datetime
from bson import ObjectId
from bson.errors import InvalidId

bp = Blueprint('items', __name__)

@bp.route('/items', methods=['GET'])
@require_auth
def get_items(user_id):
    """Get all items for the authenticated user"""
    try:
        db = get_db()
        items_collection = db.items
        
        # Find all items for this user
        items = list(items_collection.find({'userId': user_id}))
        
        # Convert ObjectId to string and format dates
        result = []
        for item in items:
            item['_id'] = str(item['_id'])
            if 'createdAt' in item and isinstance(item['createdAt'], datetime):
                item['createdAt'] = item['createdAt'].isoformat()
            if 'updatedAt' in item and isinstance(item['updatedAt'], datetime):
                item['updatedAt'] = item['updatedAt'].isoformat()
            result.append(item)
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/items/<item_id>', methods=['GET'])
@require_auth
def get_item(item_id, user_id):
    """Get a single item by ID"""
    try:
        db = get_db()
        items_collection = db.items
        
        # Validate ObjectId
        try:
            object_id = ObjectId(item_id)
        except InvalidId:
            return jsonify({'error': 'Invalid item ID'}), 400
        
        # Find item
        item = items_collection.find_one({'_id': object_id, 'userId': user_id})
        
        if not item:
            return jsonify({'error': 'Item not found'}), 404
        
        # Convert ObjectId to string and format dates
        item['_id'] = str(item['_id'])
        if 'createdAt' in item and isinstance(item['createdAt'], datetime):
            item['createdAt'] = item['createdAt'].isoformat()
        if 'updatedAt' in item and isinstance(item['updatedAt'], datetime):
            item['updatedAt'] = item['updatedAt'].isoformat()
        
        return jsonify(item), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/items', methods=['POST'])
@require_auth
def create_item(user_id):
    """Create a new item"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        title = data.get('title')
        description = data.get('description')
        
        if not title or not description:
            return jsonify({'error': 'Title and description are required'}), 400
        
        db = get_db()
        items_collection = db.items
        
        # Create new item
        now = datetime.utcnow()
        new_item = {
            'userId': user_id,
            'title': title,
            'description': description,
            'createdAt': now,
            'updatedAt': now
        }
        
        result = items_collection.insert_one(new_item)
        new_item['_id'] = str(result.inserted_id)
        new_item['createdAt'] = new_item['createdAt'].isoformat()
        new_item['updatedAt'] = new_item['updatedAt'].isoformat()
        
        return jsonify(new_item), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/items/<item_id>', methods=['PUT'])
@require_auth
def update_item(item_id, user_id):
    """Update an existing item"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        db = get_db()
        items_collection = db.items
        
        # Validate ObjectId
        try:
            object_id = ObjectId(item_id)
        except InvalidId:
            return jsonify({'error': 'Invalid item ID'}), 400
        
        # Check if item exists and belongs to user
        existing_item = items_collection.find_one({'_id': object_id, 'userId': user_id})
        if not existing_item:
            return jsonify({'error': 'Item not found'}), 404
        
        # Prepare update data
        update_data = {'updatedAt': datetime.utcnow()}
        if 'title' in data:
            update_data['title'] = data['title']
        if 'description' in data:
            update_data['description'] = data['description']
        
        # Update item
        items_collection.update_one(
            {'_id': object_id, 'userId': user_id},
            {'$set': update_data}
        )
        
        # Fetch updated item
        updated_item = items_collection.find_one({'_id': object_id})
        updated_item['_id'] = str(updated_item['_id'])
        if 'createdAt' in updated_item and isinstance(updated_item['createdAt'], datetime):
            updated_item['createdAt'] = updated_item['createdAt'].isoformat()
        if 'updatedAt' in updated_item and isinstance(updated_item['updatedAt'], datetime):
            updated_item['updatedAt'] = updated_item['updatedAt'].isoformat()
        
        return jsonify(updated_item), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/items/<item_id>', methods=['DELETE'])
@require_auth
def delete_item(item_id, user_id):
    """Delete an item"""
    try:
        db = get_db()
        items_collection = db.items
        
        # Validate ObjectId
        try:
            object_id = ObjectId(item_id)
        except InvalidId:
            return jsonify({'error': 'Invalid item ID'}), 400
        
        # Check if item exists and belongs to user
        item = items_collection.find_one({'_id': object_id, 'userId': user_id})
        if not item:
            return jsonify({'error': 'Item not found'}), 404
        
        # Delete item
        items_collection.delete_one({'_id': object_id, 'userId': user_id})
        
        return jsonify({'message': 'Item deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
