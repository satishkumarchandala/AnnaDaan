from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from bson import ObjectId
from ..utils.helpers import serialize_doc, calculate_distance_km

ngo_bp = Blueprint('ngo', __name__)


@ngo_bp.route('/donations/available', methods=['GET'])
@jwt_required()
def available_donations():
    db = current_app.db
    user_id = get_jwt_identity()
    user = db.users.find_one({'_id': ObjectId(user_id)})
    if not user or user['role'] != 'ngo':
        return jsonify({'error': 'NGO access required'}), 403

    # Get NGO profile for location
    ngo_profile = db.ngo_profiles.find_one({'user_id': user_id})
    radius_km = float(request.args.get('radius', 50))
    food_type = request.args.get('food_type', None)
    sort_by = request.args.get('sort', 'urgency')

    # Base query: all pending donations (not yet matched or accepted)
    query = {'status': {'$in': ['pending', 'matched']}}
    if food_type:
        query['food_type'] = {'$regex': food_type, '$options': 'i'}

    # Fetch up to 200 recent pending donations
    donations = list(db.donations.find(query).sort('submitted_at', -1).limit(200))

    # Filter out truly expired donations (use expiry_timestamp if set, else skip)
    now = datetime.utcnow()
    non_expired = []
    for d in donations:
        exp = d.get('expiry_timestamp')
        if exp is None:
            # No expiry stored — include it
            non_expired.append(d)
        elif exp > now:
            non_expired.append(d)
    donations = non_expired

    # Distance filtering — only if NGO has valid coordinates
    has_location = (
        ngo_profile and
        ngo_profile.get('coordinates') and
        ngo_profile['coordinates'].get('lat') and
        ngo_profile['coordinates'].get('lng')
    )

    if has_location:
        ngo_coords = ngo_profile['coordinates']
        filtered = []
        for d in donations:
            loc = d.get('location', {})
            coords = loc.get('coordinates') if isinstance(loc, dict) else None
            if coords and len(coords) == 2:
                donor_coords = {'lat': coords[1], 'lng': coords[0]}
                dist = calculate_distance_km(ngo_coords, donor_coords)
                d['distance_km'] = round(dist, 2)
                if dist <= radius_km:
                    filtered.append(d)
            else:
                # No location stored on donation — include without distance
                d['distance_km'] = None
                filtered.append(d)

        # If filtering by location removes everything, return all (safety net)
        donations = filtered if filtered else donations
    else:
        # No NGO location profile — return all pending donations
        for d in donations:
            d['distance_km'] = None

    # Sort
    if sort_by == 'urgency':
        donations.sort(key=lambda x: x.get('urgency_score', 0), reverse=True)
    elif sort_by == 'expiry':
        donations.sort(key=lambda x: x.get('expiry_timestamp') or datetime.max)
    elif sort_by == 'distance':
        donations.sort(key=lambda x: (x.get('distance_km') is None, x.get('distance_km') or 9999))

    return jsonify(serialize_doc(donations))



@ngo_bp.route('/donations/<donation_id>/accept', methods=['POST'])
@jwt_required()
def accept_donation(donation_id):
    db = current_app.db
    user_id = get_jwt_identity()
    user = db.users.find_one({'_id': ObjectId(user_id)})
    if not user or user['role'] != 'ngo':
        return jsonify({'error': 'NGO access required'}), 403

    donation = db.donations.find_one({'_id': ObjectId(donation_id)})
    if not donation:
        return jsonify({'error': 'Donation not found'}), 404
    if donation['status'] not in ['pending', 'matched']:
        return jsonify({'error': f'Donation is {donation["status"]} and cannot be accepted'}), 400

    now = datetime.utcnow()
    db.donations.update_one(
        {'_id': ObjectId(donation_id)},
        {'$set': {'status': 'in_transit', 'matched_ngo_id': user_id, 'updated_at': now}}
    )

    # Update match record
    db.matches.update_one(
        {'donation_id': donation_id, 'ngo_id': user_id},
        {'$set': {'accepted_at': now}},
        upsert=True
    )

    # Create delivery record
    ngo_profile = db.ngo_profiles.find_one({'user_id': user_id})
    donor_profile = db.donor_profiles.find_one({'user_id': donation['donor_id']})
    db.deliveries.insert_one({
        'donation_id': donation_id,
        'ngo_id': user_id,
        'ngo_name': user['name'],
        'donor_id': donation['donor_id'],
        'donor_name': donation.get('donor_name', ''),
        'route_data': {},
        'estimated_time': 45,
        'status': 'in_transit',
        'created_at': now,
        'delivered_at': None
    })

    # Update NGO stats
    db.ngo_profiles.update_one({'user_id': user_id}, {'$inc': {'accepted_count': 1}})

    # Notify donor
    _create_notification(db, donation['donor_id'], 'match_accepted',
                         f'🎉 {user["name"]} has accepted your donation of {donation["food_name"]}!')

    # Trigger routing agent
    try:
        from ..agents.routing_agent import RoutingAgent
        import threading
        agent = RoutingAgent(db, current_app._get_current_object())
        thread = threading.Thread(target=agent.compute_route, args=(donation_id, user_id))
        thread.daemon = True
        thread.start()
    except Exception as e:
        print(f"Routing agent error: {e}")

    return jsonify({'success': True, 'message': 'Donation accepted! Route being calculated.'})


@ngo_bp.route('/donations/<donation_id>/decline', methods=['POST'])
@jwt_required()
def decline_donation(donation_id):
    db = current_app.db
    user_id = get_jwt_identity()
    now = datetime.utcnow()

    db.matches.update_one(
        {'donation_id': donation_id, 'ngo_id': user_id},
        {'$set': {'declined_at': now}},
        upsert=True
    )
    db.ngo_profiles.update_one({'user_id': user_id}, {'$inc': {'declined_count': 1}})

    return jsonify({'success': True, 'message': 'Donation declined'})


@ngo_bp.route('/ngo/requests', methods=['POST'])
@jwt_required()
def create_food_request():
    db = current_app.db
    user_id = get_jwt_identity()
    user = db.users.find_one({'_id': ObjectId(user_id)})
    if not user or user['role'] != 'ngo':
        return jsonify({'error': 'NGO access required'}), 403

    data = request.get_json()
    req = {
        'ngo_id': user_id,
        'ngo_name': user['name'],
        'food_type_needed': data.get('food_type_needed', ''),
        'quantity_needed': float(data.get('quantity_needed', 0)),
        'unit': data.get('unit', 'kg'),
        'urgency': data.get('urgency', 'medium'),
        'preferred_datetime': data.get('preferred_datetime', ''),
        'notes': data.get('notes', ''),
        'status': 'open',
        'created_at': datetime.utcnow()
    }
    result = db.ngo_requests.insert_one(req)
    return jsonify({'request_id': str(result.inserted_id), 'message': 'Food request submitted to FSSAI'}), 201


@ngo_bp.route('/ngo/requests/my', methods=['GET'])
@jwt_required()
def my_requests():
    db = current_app.db
    user_id = get_jwt_identity()
    requests_list = list(db.ngo_requests.find({'ngo_id': user_id}).sort('created_at', -1))
    return jsonify(serialize_doc(requests_list))


@ngo_bp.route('/ngo/deliveries', methods=['GET'])
@jwt_required()
def ngo_deliveries():
    db = current_app.db
    user_id = get_jwt_identity()
    deliveries = list(db.deliveries.find({'ngo_id': user_id}).sort('created_at', -1).limit(20))
    return jsonify(serialize_doc(deliveries))


@ngo_bp.route('/deliveries/<delivery_id>/deliver', methods=['POST'])
@jwt_required()
def mark_delivered(delivery_id):
    db = current_app.db
    now = datetime.utcnow()
    delivery = db.deliveries.find_one({'_id': ObjectId(delivery_id)})
    if not delivery:
        return jsonify({'error': 'Delivery not found'}), 404

    db.deliveries.update_one({'_id': ObjectId(delivery_id)}, {'$set': {'status': 'delivered', 'delivered_at': now}})
    db.donations.update_one({'_id': ObjectId(delivery['donation_id'])}, {'$set': {'status': 'delivered', 'updated_at': now}})

    # Update donor stats
    donation = db.donations.find_one({'_id': ObjectId(delivery['donation_id'])})
    if donation:
        from ..utils.helpers import quantity_to_meals, calculate_co2_saved
        meals = quantity_to_meals(donation.get('quantity', 0), donation.get('unit', 'servings'))
        kg = donation.get('quantity', 0) if donation.get('unit', '').startswith('kg') else 0
        db.donor_profiles.update_one(
            {'user_id': donation['donor_id']},
            {'$inc': {'total_meals_served': meals, 'total_kg_donated': kg}}
        )

        # ── Warm thank-you notification for the donor ──────────────
        ngo_name   = delivery.get('ngo_name', 'the NGO')
        food_name  = donation.get('food_name', 'your donation')
        qty        = donation.get('quantity', '')
        unit       = donation.get('unit', '')
        qty_str    = f'{qty} {unit}'.strip()

        if meals >= 1:
            impact_line = f'🍽️ Estimated {meals} meal{"s" if meals != 1 else ""} will be served today.'
        else:
            impact_line = f'Every bit of food saved makes a difference. 💚'

        thank_you_message = (
            f'🙏 Thank You for Your Generosity!\n\n'
            f'Your donation of {food_name}'
            f'{(" (" + qty_str + ")") if qty_str else ""} '
            f'has been safely delivered to {ngo_name} and confirmed received.\n\n'
            f'{impact_line}\n\n'
            f'You are making India hunger-free — one meal at a time. ❤️'
        )
        _create_notification(db, donation['donor_id'], 'thank_you', thank_you_message)

        # Notify FSSAI Authority (Admins)
        admins = db.users.find({'role': 'admin'})
        for admin in admins:
            _create_notification(db, str(admin['_id']), 'delivery_confirmed',
                                 f'📦 Delivery Confirmed: {food_name} from {donation.get("donor_name", "Donor")} has reached NGO {ngo_name}.')

        # Log to agent execution
        db.agent_logs.insert_one({
            'agent_type': 'Logistics Agent',
            'action': 'Delivery verification',
            'details': f'NGO {ngo_name} confirmed physical receipt of {food_name}. Chain of custody verified.',
            'donation_id': str(donation['_id']),
            'timestamp': now
        })

    return jsonify({'success': True})


def _create_notification(db, user_id: str, notif_type: str, message: str):
    db.notifications.insert_one({
        'user_id': user_id,
        'type': notif_type,
        'message': message,
        'read': False,
        'created_at': datetime.utcnow()
    })
