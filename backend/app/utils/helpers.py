from datetime import datetime, timedelta
from bson import ObjectId
import json
from geopy.distance import geodesic


class JSONEncoder(json.JSONEncoder):
    """Custom encoder for MongoDB ObjectId and datetime."""
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict."""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(d) for d in doc]
    result = {}
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, dict):
            result[key] = serialize_doc(value)
        elif isinstance(value, list):
            result[key] = [serialize_doc(v) if isinstance(v, dict) else (str(v) if isinstance(v, ObjectId) else v) for v in value]
        else:
            result[key] = value
    return result


def calculate_distance_km(coord1: dict, coord2: dict) -> float:
    """Calculate distance in km between two {lat, lng} dicts."""
    try:
        point1 = (coord1['lat'], coord1['lng'])
        point2 = (coord2['lat'], coord2['lng'])
        return geodesic(point1, point2).km
    except Exception:
        return 9999.0


def calculate_urgency_score(expiry_hours: float, quantity: float, food_type: str, storage_required: bool) -> int:
    """Calculate urgency score 0-100 for a donation."""
    score = 50

    # Expiry window factor (higher urgency = higher score)
    if expiry_hours <= 1:
        score += 40
    elif expiry_hours <= 2:
        score += 30
    elif expiry_hours <= 4:
        score += 20
    elif expiry_hours <= 8:
        score += 10
    elif expiry_hours > 24:
        score -= 10

    # Quantity factor
    if quantity >= 100:
        score += 10
    elif quantity >= 50:
        score += 5

    # Food type perishability
    perishable_types = ['cooked_meals', 'cooked meals', 'beverages', 'raw produce']
    if food_type.lower() in perishable_types:
        score += 10

    # Storage requirement
    if storage_required and expiry_hours <= 4:
        score += 10

    return min(100, max(0, score))


def check_food_safety(preparation_time: datetime, storage_required: bool, food_type: str) -> dict:
    """Check food safety flags based on preparation time and type."""
    now = datetime.utcnow()
    hours_since_prep = (now - preparation_time).total_seconds() / 3600

    cooked_types = ['cooked meals', 'cooked_meals', 'beverages']
    is_cooked = food_type.lower() in cooked_types

    if is_cooked and not storage_required and hours_since_prep > 2:
        return {
            "status": "flagged",
            "message": f"Cooked food has been unrefrigerated for {hours_since_prep:.1f} hours (max 2h recommended by FSSAI)",
            "safe": False
        }
    return {"status": "safe", "message": "Food meets FSSAI safety standards", "safe": True}


def calculate_co2_saved(quantity_kg: float) -> float:
    """Estimate CO2 saved in kg (avg 2.5 kg CO2 per kg food waste avoided)."""
    return round(quantity_kg * 2.5, 2)


def quantity_to_meals(quantity: float, unit: str) -> int:
    """Estimate number of meals from quantity."""
    if unit in ['kg', 'kgs', 'kilograms']:
        return int(quantity * 4)  # ~4 meals per kg
    elif unit in ['servings', 'portions']:
        return int(quantity)
    elif unit in ['boxes', 'packs', 'packets']:
        return int(quantity * 3)
    elif unit in ['liters', 'litres', 'l']:
        return int(quantity * 3)
    return int(quantity)
