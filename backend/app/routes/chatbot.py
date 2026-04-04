"""
Flask route: POST /api/chatbot/ask
             POST /api/chatbot/reindex   (admin only)
             GET  /api/chatbot/status
"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId

chatbot_bp = Blueprint('chatbot', __name__)


@chatbot_bp.route('/ask', methods=['POST'])
def chatbot_ask():
    """Public RAG endpoint — no auth required so users can ask before logging in."""
    data     = request.get_json() or {}
    question = (data.get('question') or '').strip()
    history  = data.get('history', [])

    if not question:
        return jsonify({'error': 'question is required'}), 400
    if len(question) > 1000:
        return jsonify({'error': 'Question too long (max 1000 characters)'}), 400

    from ..rag.chatbot import ask
    result = ask(question, top_k=5, chat_history=history)

    return jsonify(result)


@chatbot_bp.route('/reindex', methods=['POST'])
@jwt_required()
def reindex():
    """Admin-only: rebuild the ChromaDB vector index from docs."""
    db      = current_app.db
    user_id = get_jwt_identity()
    user    = db.users.find_one({'_id': ObjectId(user_id)})
    if not user or user['role'] != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    try:
        from ..rag.indexer import build_index
        col = build_index(force_rebuild=True)
        return jsonify({'success': True, 'chunks_indexed': col.count()})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@chatbot_bp.route('/status', methods=['GET'])
def chatbot_status():
    """Check if the knowledge base is ready."""
    try:
        from ..rag.indexer import get_collection
        col = get_collection()
        return jsonify({'ready': True, 'chunks': col.count()})
    except Exception as e:
        return jsonify({'ready': False, 'error': str(e)}), 200
