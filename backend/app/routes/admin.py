from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from bson import ObjectId
from ..utils.helpers import serialize_doc

admin_bp = Blueprint('admin', __name__)


def _require_admin(db, user_id):
    user = db.users.find_one({'_id': ObjectId(user_id)})
    if not user or user['role'] != 'admin':
        return None
    return user


@admin_bp.route('/stats', methods=['GET'])
@jwt_required()
def platform_stats():
    db = current_app.db
    user_id = get_jwt_identity()
    if not _require_admin(db, user_id):
        return jsonify({'error': 'Admin access required'}), 403

    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    month_start = today_start - timedelta(days=30)

    total_donors = db.users.count_documents({'role': 'donor'})
    total_ngos = db.users.count_documents({'role': 'ngo'})
    total_donations = db.donations.count_documents({})
    today_donations = db.donations.count_documents({'submitted_at': {'$gte': today_start}})
    week_donations = db.donations.count_documents({'submitted_at': {'$gte': week_start}})
    month_donations = db.donations.count_documents({'submitted_at': {'$gte': month_start}})
    active_deliveries = db.deliveries.count_documents({'status': 'in_transit'})
    delivered = db.deliveries.count_documents({'status': 'delivered'})

    # Total kg redistributed
    pipeline = [
        {'$match': {'status': 'delivered', 'unit': {'$in': ['kg', 'kgs']}}},
        {'$group': {'_id': None, 'total': {'$sum': '$quantity'}}}
    ]
    kg_result = list(db.donations.aggregate(pipeline))
    total_kg = round(kg_result[0]['total'], 2) if kg_result else 0

    urgent_flagged = db.donations.count_documents({
        'status': 'pending',
        'expiry_timestamp': {'$lt': now + timedelta(hours=2)}
    })

    return jsonify({
        'total_donors': total_donors,
        'total_ngos': total_ngos,
        'total_donations': total_donations,
        'today_donations': today_donations,
        'week_donations': week_donations,
        'month_donations': month_donations,
        'active_deliveries': active_deliveries,
        'total_delivered': delivered,
        'total_kg_redistributed': total_kg,
        'urgent_flagged': urgent_flagged,
        'meals_saved_estimate': int(total_kg * 4),
        'co2_saved_kg': round(total_kg * 2.5, 2)
    })


@admin_bp.route('/donations', methods=['GET'])
@jwt_required()
def all_donations():
    db = current_app.db
    user_id = get_jwt_identity()
    if not _require_admin(db, user_id):
        return jsonify({'error': 'Admin access required'}), 403

    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 20))
    status_filter = request.args.get('status', None)
    search = request.args.get('search', None)

    query = {}
    if status_filter:
        query['status'] = status_filter
    if search:
        query['$or'] = [
            {'food_name': {'$regex': search, '$options': 'i'}},
            {'donor_name': {'$regex': search, '$options': 'i'}}
        ]

    total = db.donations.count_documents(query)
    donations = list(db.donations.find(query).sort('submitted_at', -1).skip((page-1)*per_page).limit(per_page))

    return jsonify({
        'donations': serialize_doc(donations),
        'total': total,
        'page': page,
        'per_page': per_page,
        'pages': (total + per_page - 1) // per_page
    })


@admin_bp.route('/users', methods=['GET'])
@jwt_required()
def all_users():
    db = current_app.db
    user_id = get_jwt_identity()
    if not _require_admin(db, user_id):
        return jsonify({'error': 'Admin access required'}), 403

    role_filter = request.args.get('role', None)
    query = {}
    if role_filter:
        query['role'] = role_filter

    users = list(db.users.find(query, {'password_hash': 0}).sort('created_at', -1).limit(100))
    return jsonify(serialize_doc(users))


@admin_bp.route('/users/<uid>/status', methods=['PATCH'])
@jwt_required()
def update_user_status(uid):
    db = current_app.db
    user_id = get_jwt_identity()
    if not _require_admin(db, user_id):
        return jsonify({'error': 'Admin access required'}), 403

    data = request.get_json()
    new_status = data.get('status')
    if new_status not in ['verified', 'suspended', 'pending']:
        return jsonify({'error': 'Invalid status'}), 400

    db.users.update_one({'_id': ObjectId(uid)}, {'$set': {'status': new_status}})
    return jsonify({'success': True, 'new_status': new_status})


@admin_bp.route('/agent-logs', methods=['GET'])
@jwt_required()
def agent_logs():
    db = current_app.db
    user_id = get_jwt_identity()
    if not _require_admin(db, user_id):
        return jsonify({'error': 'Admin access required'}), 403

    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 30))
    donation_id = request.args.get('donation_id', None)

    query = {}
    if donation_id:
        query['donation_id'] = donation_id

    total = db.agent_logs.count_documents(query)
    logs = list(db.agent_logs.find(query).sort('timestamp', -1).skip((page-1)*per_page).limit(per_page))

    return jsonify({
        'logs': serialize_doc(logs),
        'total': total,
        'page': page,
        'pages': (total + per_page - 1) // per_page
    })


@admin_bp.route('/ngo-requests', methods=['GET'])
@jwt_required()
def all_ngo_requests():
    db = current_app.db
    user_id = get_jwt_identity()
    if not _require_admin(db, user_id):
        return jsonify({'error': 'Admin access required'}), 403

    status_filter = request.args.get('status', None)
    query = {}
    if status_filter:
        query['status'] = status_filter

    requests_list = list(db.ngo_requests.find(query).sort('created_at', -1).limit(50))
    return jsonify(serialize_doc(requests_list))


@admin_bp.route('/donations/<donation_id>/assign', methods=['POST'])
@jwt_required()
def manual_assign(donation_id):
    db = current_app.db
    user_id = get_jwt_identity()
    if not _require_admin(db, user_id):
        return jsonify({'error': 'Admin access required'}), 403

    data = request.get_json()
    ngo_id = data.get('ngo_id')
    if not ngo_id:
        return jsonify({'error': 'ngo_id required'}), 400

    now = datetime.utcnow()
    db.donations.update_one(
        {'_id': ObjectId(donation_id)},
        {'$set': {'status': 'matched', 'matched_ngo_id': ngo_id, 'updated_at': now}}
    )
    db.agent_logs.insert_one({
        'agent_name': 'AdminOverride',
        'action': 'manual_assign',
        'input_summary': f'Admin {user_id} manually assigned donation {donation_id} to NGO {ngo_id}',
        'output_summary': 'Assignment overridden by FSSAI Admin',
        'timestamp': now,
        'donation_id': donation_id
    })
    return jsonify({'success': True, 'message': 'Donation manually assigned'})


@admin_bp.route('/alerts', methods=['GET'])
@jwt_required()
def get_alerts():
    db = current_app.db
    user_id = get_jwt_identity()
    if not _require_admin(db, user_id):
        return jsonify({'error': 'Admin access required'}), 403

    now = datetime.utcnow()

    # Near-expiry with no taker
    urgent_no_taker = list(db.donations.find({
        'status': 'pending',
        'expiry_timestamp': {'$lt': now + timedelta(hours=2)}
    }).limit(20))

    # Flagged safety
    flagged = list(db.donations.find({'safety_status': 'flagged'}).limit(20))

    # Low acceptance NGOs
    low_acceptance_ngos = list(db.ngo_profiles.aggregate([
        {'$match': {'accepted_count': {'$gt': 0}}},
        {'$addFields': {'total': {'$add': ['$accepted_count', {'$ifNull': ['$declined_count', 0]}]}}},
        {'$addFields': {'acceptance_rate': {'$divide': ['$accepted_count', '$total']}}},
        {'$match': {'acceptance_rate': {'$lt': 0.4}}},
        {'$limit': 10}
    ]))

    return jsonify({
        'urgent_no_taker': serialize_doc(urgent_no_taker),
        'flagged_safety': serialize_doc(flagged),
        'low_acceptance_ngos': serialize_doc(low_acceptance_ngos)
    })


@admin_bp.route('/donations/<donation_id>/tracking', methods=['GET'])
@jwt_required()
def donation_tracking(donation_id):
    db = current_app.db
    user_id = get_jwt_identity()
    if not _require_admin(db, user_id):
        return jsonify({'error': 'Admin access required'}), 403

    donation = db.donations.find_one({'_id': ObjectId(donation_id)})
    if not donation:
        return jsonify({'error': 'Donation not found'}), 404

    # Delivery record
    delivery = db.deliveries.find_one({'donation_id': donation_id})

    # Matched NGO info
    ngo_user = None
    ngo_profile = None
    if donation.get('matched_ngo_id'):
        try:
            ngo_user = db.users.find_one({'_id': ObjectId(donation['matched_ngo_id'])}, {'password_hash': 0})
            ngo_profile = db.ngo_profiles.find_one({'user_id': donation['matched_ngo_id']})
        except Exception:
            pass

    # Donor info
    donor_profile = db.donor_profiles.find_one({'user_id': donation.get('donor_id', '')})

    # Agent logs for this donation
    logs = list(db.agent_logs.find({'donation_id': donation_id}).sort('timestamp', 1).limit(20))

    # Build lifecycle timeline from actual data
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
            'description': ngo_user['name'] if ngo_user else ('AI matching in progress…' if status == 'pending' else 'NGO assigned'),
            'completed': current_order >= 1,
            'timestamp': updated_at.isoformat() if current_order >= 1 and updated_at else None,
            'icon': 'handshake'
        },
        {
            'stage': 'picked_up',
            'label': 'Pickup / In Transit',
            'description': delivery['route_data'].get('ai_recommendation', f"ETA: {delivery.get('estimated_time', '?')} min") if delivery and delivery.get('route_data') else ('Awaiting pickup confirmation' if current_order < 2 else 'En route'),
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

    # Route / map data
    route_data = delivery.get('route_data', {}) if delivery else {}
    live_location = delivery.get('live_location') if delivery else None

    return jsonify({
        'donation': serialize_doc(donation),
        'delivery': serialize_doc(delivery) if delivery else None,
        'ngo': {
            'name': ngo_user['name'] if ngo_user else None,
            'email': ngo_user.get('email') if ngo_user else None,
            'phone': ngo_user.get('phone') if ngo_user else None,
            'organization': ngo_profile.get('organization_name') if ngo_profile else None,
            'address': ngo_profile.get('address') if ngo_profile else None,
            'coordinates': ngo_profile.get('coordinates') if ngo_profile else None,
        } if ngo_user else None,
        'donor': {
            'name': donation.get('donor_name'),
            'organization': donor_profile.get('organization_name') if donor_profile else None,
            'address': donor_profile.get('address') if donor_profile else None,
            'coordinates': donor_profile.get('coordinates') if donor_profile else None,
        },
        'timeline': timeline,
        'route_data': serialize_doc(route_data),
        'agent_logs': serialize_doc(logs),
        'status': status,
        'live_location': serialize_doc(live_location) if live_location else None,
    })


@admin_bp.route('/donations/<donation_id>/live-location', methods=['POST'])
@jwt_required()
def update_live_location(donation_id):
    """Delivery agent pushes current GPS coordinates. Admin frontend polls /tracking to get it."""
    db = current_app.db
    user_id = get_jwt_identity()

    data = request.get_json() or {}
    lat = data.get('lat')
    lng = data.get('lng')
    if lat is None or lng is None:
        return jsonify({'error': 'lat and lng are required'}), 400

    now = datetime.utcnow()
    live_loc = {
        'lat': float(lat),
        'lng': float(lng),
        'updated_at': now,
        'pushed_by': user_id
    }

    db.deliveries.update_one(
        {'donation_id': donation_id},
        {'$set': {'live_location': live_loc}},
        upsert=True
    )

    # Broadcast via SocketIO so connected admins get instant update
    try:
        from .. import socketio
        socketio.emit(
            'location_update',
            {
                'donation_id': donation_id,
                'lat': float(lat),
                'lng': float(lng),
                'updated_at': now.isoformat()
            },
            room=f'track_{donation_id}'
        )
    except Exception:
        pass  # Polling fallback is always active

    return jsonify({'success': True, 'live_location': serialize_doc(live_loc)})


@admin_bp.route('/dispatch-all', methods=['POST'])
@jwt_required()
def dispatch_all_logistics():
    """
    Batch dispatch: find all pending/unmatched donations and run the full
    AI orchestration pipeline (Input → Matching → Notification) for each one.
    Also handles urgent NGO requests that have no matching donation yet.
    """
    db = current_app.db
    user_id = get_jwt_identity()
    if not _require_admin(db, user_id):
        return jsonify({'error': 'Admin access required'}), 403

    from ..agents.orchestrator import run_orchestration
    import threading

    now = datetime.utcnow()

    # ── 1. Find all pending donations with no NGO assignment ──────────────
    unmatched = list(db.donations.find({
        'status': 'pending',
        'matched_ngo_id': {'$exists': False}
    }).sort('submitted_at', 1).limit(50))   # oldest-first (FIFO)

    # ── 2. Find pending donations with failed/stale matching (matched_ngo set
    #       but still in 'pending' > 30 min) ─────────────────────────────────
    stale_cutoff = now - timedelta(minutes=30)
    stale = list(db.donations.find({
        'status': 'pending',
        'matched_ngo_id': {'$exists': True},
        'submitted_at': {'$lt': stale_cutoff}
    }).limit(20))

    targets = unmatched + stale
    donation_ids = list({str(d['_id']) for d in targets})   # deduplicate

    if not donation_ids:
        # Still log the dispatch attempt
        db.agent_logs.insert_one({
            'agent_name': 'AdminDispatch',
            'action': 'dispatch_all',
            'input_summary': f'FSSAI Admin {user_id} triggered Dispatch All Logistics',
            'output_summary': 'No pending/unmatched donations found at this time.',
            'timestamp': now,
            'donation_id': None
        })
        return jsonify({
            'success': True,
            'dispatched': 0,
            'skipped': 0,
            'message': 'No pending donations found to dispatch.',
            'results': []
        })

    # ── 3. Run orchestration for each donation in a background thread ─────
    results = []
    succeeded = 0
    failed = 0

    app = current_app._get_current_object()

    def run_all():
        nonlocal succeeded, failed
        with app.app_context():
            for did in donation_ids:
                try:
                    result = run_orchestration(did, db, app)
                    if result.get('error'):
                        results.append({'donation_id': did, 'status': 'failed', 'detail': result['error']})
                        failed += 1
                    elif result.get('warning'):
                        results.append({'donation_id': did, 'status': 'no_match', 'detail': result['warning']})
                        failed += 1
                    else:
                        results.append({
                            'donation_id': did,
                            'status': 'dispatched',
                            'matches': result.get('matches_count', 0),
                            'urgency': result.get('urgency_score')
                        })
                        succeeded += 1
                except Exception as e:
                    results.append({'donation_id': did, 'status': 'exception', 'detail': str(e)})
                    failed += 1

    # Run synchronously for small batches (≤10), background thread for larger
    if len(donation_ids) <= 10:
        run_all()
    else:
        t = threading.Thread(target=run_all, daemon=True)
        t.start()
        t.join(timeout=25)   # wait up to 25s then return partial

    # ── 4. Log to agent_logs ──────────────────────────────────────────────
    db.agent_logs.insert_one({
        'agent_name': 'AdminDispatch',
        'action': 'dispatch_all',
        'input_summary': (
            f'FSSAI Admin {user_id} triggered Dispatch All Logistics. '
            f'Found {len(donation_ids)} pending donations.'
        ),
        'output_summary': (
            f'Dispatched: {succeeded}, Failed/No-match: {failed}. '
            f'Donation IDs: {", ".join(donation_ids[:10])}{"…" if len(donation_ids) > 10 else ""}'
        ),
        'timestamp': now,
        'donation_id': donation_ids[0] if donation_ids else None
    })

    # ── 5. Notify all admins ──────────────────────────────────────────────
    admins = db.users.find({'role': 'admin'})
    for admin in admins:
        db.notifications.insert_one({
            'user_id': str(admin['_id']),
            'type': 'dispatch_complete',
            'message': (
                f'🚀 Dispatch All completed: {succeeded} donation(s) matched & notified, '
                f'{failed} could not be matched. Total processed: {len(donation_ids)}.'
            ),
            'read': False,
            'created_at': now
        })

    return jsonify({
        'success': True,
        'dispatched': succeeded,
        'failed': failed,
        'total': len(donation_ids),
        'message': (
            f'Dispatch complete: {succeeded} donation(s) matched and NGOs notified.'
            if succeeded > 0
            else f'Processed {len(donation_ids)} donation(s) but no NGO matches found in range.'
        ),
        'results': results
    })

