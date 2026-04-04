import os
import json
from datetime import datetime
from bson import ObjectId
import google.generativeai as genai
from ..utils.helpers import calculate_distance_km


class MatchingAgent:
    """Agent 2: Uses Gemini AI to match donations with the best NGOs."""

    def __init__(self, db, app):
        self.db = db
        self.app = app
        genai.configure(api_key=os.getenv('GOOGLE_GEMINI_API_KEY', ''))
        self.model = genai.GenerativeModel('gemini-flash-lite-latest')

    def match(self, donation_id: str) -> list:
        with self.app.app_context():
            donation = self.db.donations.find_one({'_id': ObjectId(donation_id)})
            if not donation:
                return []

            # Get active NGOs
            ngo_users = list(self.db.users.find({'role': 'ngo', 'status': 'verified'}))
            ngo_profiles = []
            for ngo_user in ngo_users:
                profile = self.db.ngo_profiles.find_one({'user_id': str(ngo_user['_id'])})
                if profile:
                    # Calculate distance
                    ngo_coords = profile.get('coordinates', {})
                    loc = donation.get('location', {}).get('coordinates', [77.209, 28.613])
                    donor_coords = {'lat': loc[1], 'lng': loc[0]}
                    distance = calculate_distance_km(ngo_coords, donor_coords) if ngo_coords else 9999

                    total_ops = profile.get('accepted_count', 0) + profile.get('declined_count', 0)
                    acceptance_rate = profile['accepted_count'] / total_ops if total_ops > 0 else 1.0

                    ngo_profiles.append({
                        'ngo_id': str(ngo_user['_id']),
                        'name': ngo_user['name'],
                        'organization_name': profile.get('organization_name', ngo_user['name']),
                        'capacity_kg': profile.get('capacity_kg', 100),
                        'food_preferences': profile.get('food_preferences', []),
                        'distance_km': round(distance, 2),
                        'acceptance_rate': round(acceptance_rate, 2),
                        'address': profile.get('address', '')
                    })

            # Filter within 25km radius default and not excluded
            eligible_ngos = [n for n in ngo_profiles if n['distance_km'] <= 25]

            if not eligible_ngos:
                # Widen radius to 50km
                eligible_ngos = [n for n in ngo_profiles if n['distance_km'] <= 50]

            if not eligible_ngos:
                self._log('MatchingAgent', 'no_ngos_found', donation_id,
                          f'No eligible NGOs within range', 'Match failed - no NGOs available')
                return []

            # Build Claude prompt
            donation_summary = (
                f"Food: {donation['food_name']} ({donation['food_type']})\n"
                f"Quantity: {donation['quantity']} {donation['unit']}\n"
                f"Urgency Score: {donation.get('urgency_score', 50)}/100\n"
                f"Expiry in: {donation.get('expiry_window_hours', 6)} hours\n"
                f"Storage Required: {donation.get('storage_required', False)}\n"
                f"Pickup Type: {donation.get('pickup_type', 'ngo_pickup')}\n"
                f"Safety Status: {donation.get('safety_status', 'safe')}\n"
                f"Tags: {', '.join(donation.get('tags', []))}"
            )

            ngo_list = "\n".join([
                f"- NGO_ID: {n['ngo_id']} | Name: {n['organization_name']} | "
                f"Distance: {n['distance_km']}km | Capacity: {n['capacity_kg']}kg | "
                f"Acceptance Rate: {n['acceptance_rate']*100:.0f}% | "
                f"Preferences: {', '.join(n['food_preferences']) or 'All types'}"
                for n in eligible_ngos[:10]  # limit to top 10 candidates
            ])

            prompt = f"""You are an AI coordinator for AnnaDaan, an FSSAI-governed food donation platform in India.

DONATION TO MATCH:
{donation_summary}

AVAILABLE NGOs (within range):
{ngo_list}

TASK: Rank the top 3 NGOs best suited to receive this donation. Consider:
1. Distance (closer = better, especially for perishable/urgent food)
2. NGO capacity vs donation quantity
3. NGO food preferences alignment
4. NGO acceptance rate (higher = more reliable)
5. Urgency (if urgency_score > 70, prioritize closest NGO)

Return ONLY valid JSON in this exact format:
{{
    "matches": [
        {{
            "ngo_id": "...",
            "rank": 1,
            "match_score": 85,
            "reasoning": "Short explanation why this NGO is the best match"
        }},
        {{
            "ngo_id": "...",
            "rank": 2,
            "match_score": 72,
            "reasoning": "..."
        }},
        {{
            "ngo_id": "...",
            "rank": 3,
            "match_score": 65,
            "reasoning": "..."
        }}
    ]
}}"""

            matches = []
            try:
                response = self.model.generate_content(prompt)
                result_text = response.text.strip()
                # Strip markdown code fences if present
                if '```json' in result_text:
                    result_text = result_text.split('```json')[1].split('```')[0].strip()
                elif '```' in result_text:
                    result_text = result_text.split('```')[1].split('```')[0].strip()

                result = json.loads(result_text)
                matches = result.get('matches', [])

                # Save matches to DB
                for match in matches:
                    self.db.matches.insert_one({
                        'donation_id': donation_id,
                        'ngo_id': match['ngo_id'],
                        'match_score': match.get('match_score', 0),
                        'reasoning': match.get('reasoning', ''),
                        'rank': match.get('rank', 0),
                        'matched_at': datetime.utcnow(),
                        'accepted_at': None,
                        'declined_at': None
                    })

                self._log('MatchingAgent', 'gemini_match', donation_id,
                          f'Eligible NGOs: {len(eligible_ngos)}, Donation: {donation["food_name"]}',
                          f'Top match: {matches[0]["ngo_id"] if matches else "none"}, score: {matches[0].get("match_score") if matches else 0}')

                # Update donation status to matched
                if matches:
                    self.db.donations.update_one(
                        {'_id': ObjectId(donation_id)},
                        {'$set': {'status': 'matched', 'matched_ngo_id': matches[0]['ngo_id'], 'updated_at': datetime.utcnow()}}
                    )

            except Exception as e:
                # Fallback: sort by distance and acceptance rate
                eligible_ngos.sort(key=lambda n: (n['distance_km'], -n['acceptance_rate']))
                matches = [
                    {'ngo_id': n['ngo_id'], 'rank': i+1, 'match_score': max(90 - i*15, 50),
                     'reasoning': f'Fallback match: {n["distance_km"]}km away, {n["acceptance_rate"]*100:.0f}% acceptance rate'}
                    for i, n in enumerate(eligible_ngos[:3])
                ]
                self._log('MatchingAgent', 'fallback_match', donation_id,
                          f'Gemini API error: {str(e)}',
                          f'Used distance-based fallback. Top match: {matches[0]["ngo_id"] if matches else "none"}')

                if matches:
                    for match in matches:
                        self.db.matches.insert_one({
                            'donation_id': donation_id,
                            'ngo_id': match['ngo_id'],
                            'match_score': match['match_score'],
                            'reasoning': match['reasoning'],
                            'rank': match['rank'],
                            'matched_at': datetime.utcnow(),
                            'accepted_at': None,
                            'declined_at': None
                        })
                    self.db.donations.update_one(
                        {'_id': ObjectId(donation_id)},
                        {'$set': {'status': 'matched', 'matched_ngo_id': matches[0]['ngo_id'], 'updated_at': datetime.utcnow()}}
                    )

            return matches

    def _log(self, agent, action, donation_id, input_summary, output_summary):
        self.db.agent_logs.insert_one({
            'agent_name': agent,
            'action': action,
            'input_summary': input_summary,
            'output_summary': output_summary,
            'timestamp': datetime.utcnow(),
            'donation_id': donation_id
        })
