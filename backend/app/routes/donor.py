from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from bson import ObjectId
from ..utils.helpers import serialize_doc, calculate_co2_saved, quantity_to_meals

donor_bp = Blueprint('donor', __name__)


@donor_bp.route('/donations', methods=['POST'])
@jwt_required()
def submit_donation():
    db = current_app.db
    user_id = get_jwt_identity()
    user = db.users.find_one({'_id': ObjectId(user_id)})
    if not user or user['role'] != 'donor':
        return jsonify({'error': 'Donor access required'}), 403

    data = request.get_json()
    required = ['food_type', 'food_name', 'quantity', 'unit', 'preparation_time', 'expiry_window_hours']
    for f in required:
        if f not in data:
            return jsonify({'error': f'{f} is required'}), 400

    prep_time = datetime.fromisoformat(data['preparation_time'])
    expiry_hours = float(data['expiry_window_hours'])
    expiry_ts = prep_time + timedelta(hours=expiry_hours)

    donation = {
        'donor_id': user_id,
        'donor_name': user['name'],
        'food_type': data['food_type'],
        'food_name': data['food_name'],
        'description': data.get('description', ''),
        'quantity': float(data['quantity']),
        'unit': data['unit'],
        'preparation_time': prep_time,
        'expiry_window_hours': expiry_hours,
        'expiry_timestamp': expiry_ts,
        'storage_required': data.get('storage_required', False),
        'pickup_type': data.get('pickup_type', 'ngo_pickup'),
        'location': {
            'type': 'Point',
            'coordinates': [
                data.get('location', {}).get('lng', 77.2090),
                data.get('location', {}).get('lat', 28.6139)
            ]
        },
        'location_address': data.get('location_address', ''),
        'photo_url': data.get('photo_url', ''),
        'urgency_score': 50,
        'safety_status': 'pending',
        'status': 'pending',
        'matched_ngo_id': None,
        'submitted_at': datetime.utcnow(),
        'updated_at': datetime.utcnow()
    }

    result = db.donations.insert_one(donation)
    donation_id = str(result.inserted_id)

    # Update donor stats
    db.donor_profiles.update_one(
        {'user_id': user_id},
        {'$inc': {'total_donations': 1}}
    )

    # Trigger orchestrator asynchronously
    try:
        from ..agents.orchestrator import run_orchestration
        import threading
        thread = threading.Thread(target=run_orchestration, args=(donation_id, db, current_app._get_current_object()))
        thread.daemon = True
        thread.start()
    except Exception as e:
        print(f"Orchestrator start error: {e}")

    return jsonify({'donation_id': donation_id, 'status': 'pending', 'message': 'Donation submitted. AI matching in progress.'}), 201


@donor_bp.route('/donations/image', methods=['POST'])
@jwt_required()
def fetch_donation_image():
    """Fetches an image via Gemini Search Grounding based on the food name, matching user request."""
    import os
    import re
    from google import genai
    from google.genai import types
    from dotenv import load_dotenv

    load_dotenv()
    data = request.get_json()
    food_name = data.get('food_name', '')
    if not food_name:
        return jsonify({'photo_url': ''})

    api_key = os.environ.get('GOOGLE_GEMINI_API_KEY')
    if not api_key:
        return jsonify({'photo_url': ''})

    try:
        client = genai.Client(api_key=api_key)
        # Use gemini-2.5-flash with search tool to fetch a real image URL quickly
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=f"Find exactly one public, highly representative, static image URL of '{food_name}' food. Return ONLY the raw https URL and nothing else. Ensure the URL ends in .jpg or .png and comes from a reliable source like wikimedia or flickr.",
            config=types.GenerateContentConfig(
                tools=[{'google_search': {}}]
            )
        )
        url = response.text.strip('\'" \n` \t')
        
        # Regex to extract the URL if Gemini wraps it in text
        match = re.search(r"(https?://[^\s\"'>]+)", url)
        if match:
             url = match.group(1)
             
        if not url.startswith('http'):
             raise ValueError("Not a valid URL")

        return jsonify({'photo_url': url})
    except Exception as e:
        print(f"Gemini image fetch failed: {e}")
        
    return jsonify({'photo_url': ''})


@donor_bp.route('/donations/my', methods=['GET'])
@jwt_required()
def my_donations():
    db = current_app.db
    user_id = get_jwt_identity()
    donations = list(db.donations.find({'donor_id': user_id}).sort('submitted_at', -1).limit(50))
    return jsonify(serialize_doc(donations))


@donor_bp.route('/donations/<donation_id>/status', methods=['GET'])
@jwt_required()
def donation_status(donation_id):
    db = current_app.db
    donation = db.donations.find_one({'_id': ObjectId(donation_id)})
    if not donation:
        return jsonify({'error': 'Donation not found'}), 404
    return jsonify(serialize_doc(donation))


@donor_bp.route('/donor/stats', methods=['GET'])
@jwt_required()
def donor_stats():
    db = current_app.db
    user_id = get_jwt_identity()
    profile = db.donor_profiles.find_one({'user_id': user_id})
    if not profile:
        return jsonify({'error': 'Profile not found'}), 404

    donations = list(db.donations.find({'donor_id': user_id}))
    total_kg = sum(d.get('quantity', 0) if d.get('unit', '').startswith('kg') else 0 for d in donations)
    total_meals = sum(quantity_to_meals(d.get('quantity', 0), d.get('unit', 'servings')) for d in donations if d['status'] == 'delivered')
    co2_saved = calculate_co2_saved(total_kg)

    by_status = {}
    for d in donations:
        s = d.get('status', 'pending')
        by_status[s] = by_status.get(s, 0) + 1

    return jsonify({
        'total_donations': len(donations),
        'total_kg_donated': round(total_kg, 2),
        'total_meals_served': total_meals,
        'co2_saved_kg': co2_saved,
        'by_status': by_status,
        'profile': serialize_doc(profile)
    })


@donor_bp.route('/donations/<donation_id>/tracking', methods=['GET'])
@jwt_required()
def donation_tracking(donation_id):
    """Donor (or any auth'd user) tracking view for a specific donation."""
    db = current_app.db
    user_id = get_jwt_identity()

    donation = db.donations.find_one({'_id': ObjectId(donation_id)})
    if not donation:
        return jsonify({'error': 'Donation not found'}), 404

    # Only the donor or admin can view donor tracking
    user = db.users.find_one({'_id': ObjectId(user_id)})
    if donation.get('donor_id') != user_id and user.get('role') not in ['admin', 'ngo']:
        return jsonify({'error': 'Access denied'}), 403

    delivery = db.deliveries.find_one({'donation_id': donation_id})

    ngo_user = None
    if donation.get('matched_ngo_id'):
        try:
            ngo_user = db.users.find_one({'_id': ObjectId(donation['matched_ngo_id'])}, {'password_hash': 0})
        except Exception:
            pass

    status = donation.get('status', 'pending')
    submitted_at = donation.get('submitted_at')
    updated_at = donation.get('updated_at')
    STAGES = ['pending', 'matched', 'in_transit', 'delivered']
    status_order = {s: i for i, s in enumerate(STAGES)}
    current_order = status_order.get(status, 0)

    timeline = [
        {
            'stage': 'donation_sent',
            'label': 'Donation Submitted',
            'description': f'{donation.get("food_name")} — {donation.get("quantity")} {donation.get("unit")}',
            'completed': True,
            'timestamp': submitted_at.isoformat() if submitted_at else None,
            'icon': 'volunteer_activism'
        },
        {
            'stage': 'matched',
            'label': 'NGO Matched',
            'description': ngo_user['name'] if ngo_user else 'AI matching in progress…',
            'completed': current_order >= 1,
            'timestamp': updated_at.isoformat() if current_order >= 1 and updated_at else None,
            'icon': 'handshake'
        },
        {
            'stage': 'picked_up',
            'label': 'Picked Up / In Transit',
            'description': 'En route to NGO' if current_order >= 2 else 'Awaiting pickup',
            'completed': current_order >= 2,
            'timestamp': delivery['created_at'].isoformat() if delivery and current_order >= 2 else None,
            'icon': 'local_shipping'
        },
        {
            'stage': 'delivered',
            'label': 'Delivered',
            'description': 'Food successfully delivered to NGO',
            'completed': status == 'delivered',
            'timestamp': delivery['delivered_at'].isoformat() if delivery and delivery.get('delivered_at') else None,
            'icon': 'check_circle'
        }
    ]

    live_location = delivery.get('live_location') if delivery else None

    # Extract donor coordinates from donation
    donor_loc = donation.get('location', {}).get('coordinates', [77.209, 28.613])
    donor_coordinates = {'lat': donor_loc[1], 'lng': donor_loc[0]}

    # Extract NGO coordinates from delivery route_data or ngo_profile
    ngo_coordinates = None
    if delivery and delivery.get('route_data'):
        ngo_coordinates = delivery['route_data'].get('ngo_location')
    if not ngo_coordinates and donation.get('matched_ngo_id'):
        try:
            ngo_profile = db.ngo_profiles.find_one({'user_id': donation['matched_ngo_id']})
            if ngo_profile and ngo_profile.get('coordinates'):
                ngo_coordinates = ngo_profile['coordinates']
        except Exception:
            pass

    return jsonify({
        'donation': serialize_doc(donation),
        'delivery': serialize_doc(delivery) if delivery else None,
        'ngo_name': ngo_user['name'] if ngo_user else None,
        'timeline': timeline,
        'status': status,
        'live_location': serialize_doc(live_location) if live_location else None,
        'donor_coordinates': donor_coordinates,
        'ngo_coordinates': ngo_coordinates,
    })
