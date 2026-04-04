from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from ..utils.helpers import serialize_doc

orchestrator_bp = Blueprint('orchestrator', __name__)


@orchestrator_bp.route('/run', methods=['POST'])
@jwt_required()
def trigger_orchestration():
    db = current_app.db
    data = request.get_json()
    donation_id = data.get('donation_id')
    if not donation_id:
        return jsonify({'error': 'donation_id required'}), 400

    donation = db.donations.find_one({'_id': ObjectId(donation_id)})
    if not donation:
        return jsonify({'error': 'Donation not found'}), 404

    try:
        from ..agents.orchestrator import run_orchestration
        import threading
        thread = threading.Thread(
            target=run_orchestration,
            args=(donation_id, db, current_app._get_current_object())
        )
        thread.daemon = True
        thread.start()
        return jsonify({'success': True, 'message': 'Orchestration triggered'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@orchestrator_bp.route('/logs', methods=['GET'])
@jwt_required()
def orchestrator_logs():
    db = current_app.db
    page = int(request.args.get('page', 1))
    per_page = 30
    logs = list(db.agent_logs.find().sort('timestamp', -1).skip((page-1)*per_page).limit(per_page))
    total = db.agent_logs.count_documents({})
    return jsonify({'logs': serialize_doc(logs), 'total': total})


# Routes package init
