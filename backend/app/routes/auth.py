from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import datetime
import bcrypt
from bson import ObjectId
from ..utils.helpers import serialize_doc

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    db = current_app.db
    data = request.get_json()

    required = ['name', 'email', 'password', 'role', 'phone']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400

    role = data['role']
    if role not in ['donor', 'ngo', 'admin']:
        return jsonify({'error': 'Invalid role. Must be donor, ngo, or admin'}), 400

    # Check existing email
    if db.users.find_one({'email': data['email'].lower()}):
        return jsonify({'error': 'Email already registered'}), 409

    # Hash password
    pw_hash = bcrypt.hashpw(data['password'].encode(), bcrypt.gensalt()).decode()

    user = {
        'name': data['name'],
        'email': data['email'].lower(),
        'password_hash': pw_hash,
        'role': role,
        'phone': data['phone'],
        'created_at': datetime.utcnow(),
        'status': 'verified'
    }

    result = db.users.insert_one(user)
    user_id = str(result.inserted_id)

    # Create role profile
    if role == 'donor':
        db.donor_profiles.insert_one({
            'user_id': user_id,
            'organization_name': data.get('organization_name', data['name']),
            'organization_type': data.get('organization_type', 'individual'),
            'address': data.get('address', ''),
            'coordinates': data.get('coordinates', {'lat': 28.6139, 'lng': 77.2090}),
            'fssai_license': data.get('fssai_license', ''),
            'total_donations': 0,
            'total_kg_donated': 0,
            'total_meals_served': 0
        })
    elif role == 'ngo':
        db.ngo_profiles.insert_one({
            'user_id': user_id,
            'organization_name': data.get('organization_name', data['name']),
            'registration_number': data.get('registration_number', ''),
            'address': data.get('address', ''),
            'coordinates': data.get('coordinates', {'lat': 28.6139, 'lng': 77.2090}),
            'capacity_kg': float(data.get('capacity_kg', 100)),
            'food_preferences': data.get('food_preferences', []),
            'accepted_count': 0,
            'declined_count': 0
        })

    token = create_access_token(identity=user_id)
    return jsonify({
        'token': token,
        'user': {
            'id': user_id,
            'name': user['name'],
            'email': user['email'],
            'role': user['role'],
            'status': user['status']
        }
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    db = current_app.db
    data = request.get_json()

    if not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password required'}), 400

    user = db.users.find_one({'email': data['email'].lower()})
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    if not bcrypt.checkpw(data['password'].encode(), user['password_hash'].encode()):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    # Assert role matches if role was provided in login
    if data.get('role') and user.get('role') != data.get('role'):
        return jsonify({'error': f"Account found, but registered as a different role ({user.get('role')}). Please select the correct role tab."}), 401

    token = create_access_token(identity=str(user['_id']))
    return jsonify({
        'token': token,
        'user': {
            'id': str(user['_id']),
            'name': user['name'],
            'email': user['email'],
            'role': user['role'],
            'status': user['status']
        }
    })


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    db = current_app.db
    user_id = get_jwt_identity()
    user = db.users.find_one({'_id': ObjectId(user_id)})
    if not user:
        return jsonify({'error': 'User not found'}), 404

    profile = None
    if user['role'] == 'donor':
        profile = serialize_doc(db.donor_profiles.find_one({'user_id': user_id}))
    elif user['role'] == 'ngo':
        profile = serialize_doc(db.ngo_profiles.find_one({'user_id': user_id}))

    return jsonify({
        'id': str(user['_id']),
        'name': user['name'],
        'email': user['email'],
        'role': user['role'],
        'phone': user['phone'],
        'status': user['status'],
        'created_at': user['created_at'].isoformat(),
        'profile': profile
    })


@auth_bp.route('/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    db = current_app.db
    user_id = get_jwt_identity()
    notifs = list(db.notifications.find({'user_id': user_id}).sort('created_at', -1).limit(20))
    return jsonify(serialize_doc(notifs))


@auth_bp.route('/notifications/<notif_id>/read', methods=['PATCH'])
@jwt_required()
def mark_read(notif_id):
    db = current_app.db
    db.notifications.update_one({'_id': ObjectId(notif_id)}, {'$set': {'read': True}})
    return jsonify({'success': True})


@auth_bp.route('/notifications/read-all', methods=['POST'])
@jwt_required()
def mark_all_read():
    db = current_app.db
    user_id = get_jwt_identity()
    db.notifications.update_many({'user_id': user_id, 'read': False}, {'$set': {'read': True}})
    return jsonify({'success': True})


@auth_bp.route('/notifications/clear', methods=['POST'])
@jwt_required()
def clear_notifications():
    db = current_app.db
    user_id = get_jwt_identity()
    db.notifications.delete_many({'user_id': user_id})
    return jsonify({'success': True})
