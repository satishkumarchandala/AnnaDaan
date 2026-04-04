from datetime import datetime
from bson import ObjectId


class NotificationAgent:
    """Agent 3: Sends real-time Socket.io notifications and creates DB notifications."""

    def __init__(self, db, app):
        self.db = db
        self.app = app

    def notify_matches(self, donation_id: str, matches: list) -> None:
        with self.app.app_context():
            from app import socketio
            donation = self.db.donations.find_one({'_id': ObjectId(donation_id)})
            if not donation:
                return

            donor_id = donation['donor_id']
            food_name = donation['food_name']

            # Notify each matched NGO
            for match in matches:
                ngo_id = match.get('ngo_id')
                ngo_user = self.db.users.find_one({'_id': ObjectId(ngo_id)})
                if not ngo_user:
                    continue

                message = (
                    f"🍱 New donation available: {food_name} "
                    f"(Match Score: {match.get('match_score', 0)}/100)"
                )

                # Save to DB
                self.db.notifications.insert_one({
                    'user_id': ngo_id,
                    'type': 'donation:new',
                    'message': message,
                    'donation_id': donation_id,
                    'read': False,
                    'created_at': datetime.utcnow()
                })

                # Socket.io real-time event
                try:
                    socketio.emit('donation:new', {
                        'donation_id': donation_id,
                        'food_name': food_name,
                        'food_type': donation.get('food_type', ''),
                        'quantity': donation.get('quantity', 0),
                        'unit': donation.get('unit', ''),
                        'urgency_score': donation.get('urgency_score', 0),
                        'expiry_hours': donation.get('expiry_window_hours', 0),
                        'match_score': match.get('match_score', 0),
                        'reasoning': match.get('reasoning', ''),
                        'message': message
                    }, room=f'ngo_{ngo_id}')
                except Exception as e:
                    print(f"Socket emit error: {e}")

            # Notify donor that match was found
            donor_message = f"✅ Match found for your donation: {food_name}. Notifying nearby NGOs."
            self.db.notifications.insert_one({
                'user_id': donor_id,
                'type': 'match:found',
                'message': donor_message,
                'donation_id': donation_id,
                'read': False,
                'created_at': datetime.utcnow()
            })

            try:
                socketio.emit('match:found', {
                    'donation_id': donation_id,
                    'food_name': food_name,
                    'matches_count': len(matches),
                    'message': donor_message
                }, room=f'donor_{donor_id}')
            except Exception as e:
                print(f"Socket donor notify error: {e}")

            self._log('NotificationAgent', 'notifications_sent', donation_id,
                      f'Donation: {food_name}, Matches: {len(matches)}',
                      f'Notified {len(matches)} NGOs + donor via Socket.io and DB')

    def _log(self, agent, action, donation_id, input_summary, output_summary):
        self.db.agent_logs.insert_one({
            'agent_name': agent,
            'action': action,
            'input_summary': input_summary,
            'output_summary': output_summary,
            'timestamp': datetime.utcnow(),
            'donation_id': donation_id
        })
