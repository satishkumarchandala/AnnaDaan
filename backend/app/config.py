import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/annadaan")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET", "annadaan_secret")
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "flask_secret")
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
    GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")
    
    # Mail
    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.getenv("MAIL_PORT", 587))
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", "")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
    
    # JWT
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24 hours
    
    # Platform Config
    DEFAULT_RADIUS_KM = 25
    URGENT_EXPIRY_HOURS = 2
    REMATCHING_MINUTES = 30
    LOW_ACCEPTANCE_RATE_THRESHOLD = 0.4
