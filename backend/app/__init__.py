from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from pymongo import MongoClient
from .config import Config

socketio = SocketIO(cors_allowed_origins="*")
jwt = JWTManager()
mail = Mail()
db = None

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Extensions
    CORS(app, origins="*", supports_credentials=True)
    socketio.init_app(app, cors_allowed_origins="*", async_mode='eventlet')
    jwt.init_app(app)
    mail.init_app(app)
    
    # MongoDB
    global db
    client = MongoClient(app.config['MONGO_URI'])
    db = client.annadaan
    app.db = db
    
    # Blueprints
    from .routes.auth import auth_bp
    from .routes.donor import donor_bp
    from .routes.ngo import ngo_bp
    from .routes.admin import admin_bp
    from .routes.orchestrator import orchestrator_bp
    from .routes.chatbot import chatbot_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(donor_bp, url_prefix='/api')
    app.register_blueprint(ngo_bp, url_prefix='/api')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(orchestrator_bp, url_prefix='/api/orchestrator')
    app.register_blueprint(chatbot_bp, url_prefix='/api/chatbot')

    # ── Always inject CORS headers — even on 500 errors ──────────────────
    @app.after_request
    def inject_cors_headers(response):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
        return response

    @app.errorhandler(500)
    def handle_500(e):
        from flask import jsonify as _j
        response = _j({'error': 'Internal server error', 'detail': str(e)})
        response.status_code = 500
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response

    # ── Build RAG index on first startup ─────────────────────────────────
    def _build_rag():
        with app.app_context():
            try:
                from .rag.indexer import build_index
                build_index()
            except Exception as ex:
                print(f'[RAG] Index build error: {ex}')

    import threading
    threading.Thread(target=_build_rag, daemon=True).start()

    # Create indexes
    _create_indexes(db)

    return app

def _create_indexes(db):
    try:
        db.users.create_index("email", unique=True)
        db.donations.create_index([("location", "2dsphere")])
        db.ngo_profiles.create_index([("coordinates", "2dsphere")])
        db.donor_profiles.create_index([("coordinates", "2dsphere")])
        db.agent_logs.create_index("timestamp")
        db.notifications.create_index([("user_id", 1), ("read", 1)])
    except Exception as e:
        print(f"Index creation warning: {e}")
