from datetime import datetime
from bson import ObjectId
from ..utils.helpers import calculate_urgency_score, check_food_safety


class InputAgent:
    """Agent 1: Processes and validates incoming donation data, assigns urgency score."""

    def __init__(self, db, app):
        self.db = db
        self.app = app

    def process(self, donation_id: str) -> dict:
        with self.app.app_context():
            donation = self.db.donations.find_one({'_id': ObjectId(donation_id)})
            if not donation:
                return {'error': 'Donation not found'}

            self._log('InputAgent', 'process_start', donation_id,
                      f'Processing donation: {donation["food_name"]} ({donation["quantity"]} {donation["unit"]})',
                      'Running input validation and urgency scoring')

            # Calculate urgency score
            expiry_hours = donation.get('expiry_window_hours', 6)
            urgency_score = calculate_urgency_score(
                expiry_hours,
                donation.get('quantity', 0),
                donation.get('food_type', ''),
                donation.get('storage_required', False)
            )

            # Food safety check
            prep_time = donation.get('preparation_time', datetime.utcnow())
            safety = check_food_safety(prep_time, donation.get('storage_required', False), donation.get('food_type', ''))

            # Tags
            tags = []
            if urgency_score >= 80:
                tags.append('URGENT')
            if not safety['safe']:
                tags.append('SAFETY_FLAG')
            if donation.get('quantity', 0) >= 50:
                tags.append('BULK')
            if donation.get('storage_required', False):
                tags.append('REFRIGERATION_NEEDED')

            # Update donation
            self.db.donations.update_one(
                {'_id': ObjectId(donation_id)},
                {'$set': {
                    'urgency_score': urgency_score,
                    'safety_status': safety['status'],
                    'safety_message': safety['message'],
                    'tags': tags,
                    'updated_at': datetime.utcnow()
                }}
            )

            self._log('InputAgent', 'process_complete', donation_id,
                      f'Food: {donation["food_name"]}, Expiry: {expiry_hours}h',
                      f'urgency_score={urgency_score}, safety={safety["status"]}, tags={tags}')

            return {
                'donation_id': donation_id,
                'urgency_score': urgency_score,
                'safety_status': safety['status'],
                'safety_message': safety['message'],
                'tags': tags
            }

    def _log(self, agent: str, action: str, donation_id: str, input_summary: str, output_summary: str):
        self.db.agent_logs.insert_one({
            'agent_name': agent,
            'action': action,
            'input_summary': input_summary,
            'output_summary': output_summary,
            'timestamp': datetime.utcnow(),
            'donation_id': donation_id
        })
