from datetime import datetime
from bson import ObjectId
from .input_agent import InputAgent
from .matching_agent import MatchingAgent
from .notification_agent import NotificationAgent


def run_orchestration(donation_id: str, db, app) -> dict:
    """Master orchestration pipeline: Input → Matching → Notification."""
    print(f"[Orchestrator] Starting pipeline for donation: {donation_id}")

    try:
        # Agent 1: Input Processing
        print(f"[Orchestrator] Running InputAgent...")
        input_result = InputAgent(db, app).process(donation_id)
        print(f"[Orchestrator] Input result: {input_result}")

        if input_result.get('error'):
            _log_orchestrator(db, 'orchestrator_error', donation_id,
                              'Pipeline failed at InputAgent', input_result['error'])
            return {'error': input_result['error']}

        # Agent 2: Matching
        print(f"[Orchestrator] Running MatchingAgent...")
        matches = MatchingAgent(db, app).match(donation_id)
        print(f"[Orchestrator] Matches found: {len(matches)}")

        if not matches:
            _log_orchestrator(db, 'no_matches', donation_id,
                              'MatchingAgent found no eligible NGOs',
                              'Will retry with wider radius in 30 minutes')
            # TODO: schedule retry
            return {'warning': 'No NGOs available in range'}

        # Agent 3: Notification
        print(f"[Orchestrator] Running NotificationAgent...")
        NotificationAgent(db, app).notify_matches(donation_id, matches)

        _log_orchestrator(db, 'pipeline_complete', donation_id,
                          f'Full pipeline completed for: {donation_id}',
                          f'urgency={input_result.get("urgency_score")}, '
                          f'matches={len(matches)}, top_ngo={matches[0]["ngo_id"] if matches else "none"}')

        return {
            'donation_id': donation_id,
            'urgency_score': input_result.get('urgency_score'),
            'safety_status': input_result.get('safety_status'),
            'matches_count': len(matches),
            'top_match': matches[0] if matches else None
        }

    except Exception as e:
        print(f"[Orchestrator] ERROR: {e}")
        _log_orchestrator(db, 'pipeline_exception', donation_id,
                          f'Exception in orchestration pipeline',
                          str(e))
        return {'error': str(e)}


def _log_orchestrator(db, action: str, donation_id: str, input_summary: str, output_summary: str):
    db.agent_logs.insert_one({
        'agent_name': 'Orchestrator',
        'action': action,
        'input_summary': input_summary,
        'output_summary': output_summary,
        'timestamp': datetime.utcnow(),
        'donation_id': donation_id
    })
