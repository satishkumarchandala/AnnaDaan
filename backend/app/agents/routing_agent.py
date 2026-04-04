import os
import json
from datetime import datetime
from bson import ObjectId
import google.generativeai as genai
from ..utils.helpers import calculate_distance_km


class RoutingAgent:
    """Agent 4: Computes optimal pickup/delivery route using Gemini or Google Maps."""

    def __init__(self, db, app):
        self.db = db
        self.app = app
        genai.configure(api_key=os.getenv('GOOGLE_GEMINI_API_KEY', ''))
        self.model = genai.GenerativeModel('gemini-flash-lite-latest')

    def compute_route(self, donation_id: str, ngo_id: str) -> dict:
        with self.app.app_context():
            donation = self.db.donations.find_one({'_id': ObjectId(donation_id)})
            ngo_profile = self.db.ngo_profiles.find_one({'user_id': ngo_id})

            if not donation or not ngo_profile:
                return {}

            donor_loc = donation.get('location', {}).get('coordinates', [77.209, 28.613])
            donor_coords = {'lat': donor_loc[1], 'lng': donor_loc[0]}
            ngo_coords = ngo_profile.get('coordinates', {'lat': 28.613, 'lng': 77.209})

            distance_km = calculate_distance_km(ngo_coords, donor_coords)
            # Estimate: avg 20 km/h in Indian cities
            estimated_minutes = int((distance_km / 20) * 60) + 10

            route_data = {
                'donor_location': donor_coords,
                'ngo_location': ngo_coords,
                'distance_km': round(distance_km, 2),
                'estimated_minutes': estimated_minutes,
                'route_type': 'direct',
                'waypoints': []
            }

            # Try to get AI routing suggestion for complex cases
            if distance_km > 5:
                try:
                    prompt = f"""As a logistics AI for AnnaDaan food donation platform in India:

Donor at coordinates: {donor_coords}
NGO at coordinates: {ngo_coords}
Distance: {distance_km:.1f} km
Food: {donation['food_name']} ({donation.get('food_type', '')})
Urgency Score: {donation.get('urgency_score', 50)}/100
Expiry in: {donation.get('expiry_window_hours', 6)} hours
Storage needed: {donation.get('storage_required', False)}

Provide a brief routing recommendation and estimated delivery time.
Return JSON: {{"recommendation": "...", "priority_tips": ["tip1", "tip2"], "estimated_minutes": {estimated_minutes}}}"""

                    response = self.model.generate_content(prompt)
                    text = response.text.strip()
                    if '```json' in text:
                        text = text.split('```json')[1].split('```')[0].strip()
                    elif '```' in text:
                        text = text.split('```')[1].split('```')[0].strip()
                    ai_route = json.loads(text)
                    route_data['ai_recommendation'] = ai_route.get('recommendation', '')
                    route_data['priority_tips'] = ai_route.get('priority_tips', [])
                    if ai_route.get('estimated_minutes'):
                        route_data['estimated_minutes'] = ai_route['estimated_minutes']

                except Exception as e:
                    print(f"Routing AI error: {e}")

            # Update delivery record
            self.db.deliveries.update_one(
                {'donation_id': donation_id, 'ngo_id': ngo_id},
                {'$set': {'route_data': route_data, 'estimated_time': route_data['estimated_minutes']}}
            )

            # Emit route update
            try:
                from app import socketio
                socketio.emit('delivery:update', {
                    'donation_id': donation_id,
                    'route_data': route_data,
                    'status': 'in_transit'
                }, room=f'donor_{donation["donor_id"]}')
                socketio.emit('delivery:update', {
                    'donation_id': donation_id,
                    'route_data': route_data,
                    'status': 'in_transit'
                }, room=f'ngo_{ngo_id}')
            except Exception as e:
                print(f"Route socket error: {e}")

            self._log('RoutingAgent', 'route_computed', donation_id,
                      f'Distance: {distance_km:.1f}km, NGO: {ngo_id}',
                      f'ETA: {route_data["estimated_minutes"]} min')

            return route_data

    def _log(self, agent, action, donation_id, input_summary, output_summary):
        self.db.agent_logs.insert_one({
            'agent_name': agent,
            'action': action,
            'input_summary': input_summary,
            'output_summary': output_summary,
            'timestamp': datetime.utcnow(),
            'donation_id': donation_id
        })
