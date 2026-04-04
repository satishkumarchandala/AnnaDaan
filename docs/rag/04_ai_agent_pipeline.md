# AI Agent Pipeline

## Overview

AnnaDaan's core intelligence is a 4-agent pipeline that runs automatically every time a donation is submitted. The pipeline is managed by a central Orchestrator.

```
Donation Submitted
       │
       ▼
  Orchestrator
       │
       ├──► Agent 1: InputAgent     [Validation + Urgency Scoring]
       │
       ├──► Agent 2: MatchingAgent  [Gemini AI NGO Matching]
       │
       ├──► Agent 3: NotificationAgent [Alert Donors + NGOs]
       │
       └──► Agent 4: RoutingAgent   [Route Computation on NGO Accept]
```

Every agent logs its actions to the `agent_logs` MongoDB collection, giving a complete audit trail visible in the Admin's AI Logs page.

---

## Orchestrator (`agents/orchestrator.py`)

**Function**: `run_orchestration(donation_id, db, app)`

The orchestrator coordinates all agents in the correct sequence:

1. **InputAgent.process(donation_id)** → validates and scores the donation
   - If error: logs failure, stops pipeline
   - If no matches: logs warning, TODO retry in 30 minutes
2. **MatchingAgent.match(donation_id)** → finds best NGO matches
   - If no matches found: logs and returns warning
3. **NotificationAgent.notify_matches(donation_id, matches)** → sends notifications

The orchestrator runs on a **background daemon thread** so the donor's API request returns immediately while processing happens asynchronously.

---

## Agent 1: InputAgent (`agents/input_agent.py`)

**Purpose**: Validate and enrich incoming donation data.

**Inputs**: `donation_id` (looks up donation from database)

**Processing**:

### Urgency Score Calculation
Formula starts at base 50 and adjusts:

| Condition | Score Change |
|---|---|
| Expiry ≤ 1 hour | +40 |
| Expiry ≤ 2 hours | +30 |
| Expiry ≤ 4 hours | +20 |
| Expiry ≤ 8 hours | +10 |
| Expiry > 24 hours | -10 |
| Quantity ≥ 100 units | +10 |
| Quantity ≥ 50 units | +5 |
| Food type is cooked/perishable | +10 |
| Refrigeration needed AND expiry ≤ 4h | +10 |
| Maximum cap | 100 |

Perishable food types: `cooked_meals`, `cooked meals`, `beverages`, `raw produce`

### FSSAI Food Safety Check
- Computes hours since food preparation
- If food is cooked AND not refrigerated AND older than 2 hours → `flagged`
- Otherwise → `safe`
- FSSAI guideline: cooked food must not be unrefrigerated for more than 2 hours

### Tags Assigned
- `URGENT` → urgency_score ≥ 80
- `SAFETY_FLAG` → food safety check failed
- `BULK` → quantity ≥ 50 units
- `REFRIGERATION_NEEDED` → `storage_required` is true

**Outputs** (stored to `donations` collection):
- `urgency_score`: integer 0–100
- `safety_status`: `"safe"` or `"flagged"`
- `safety_message`: human-readable explanation
- `tags`: array of string tags

---

## Agent 2: MatchingAgent (`agents/matching_agent.py`)

**Purpose**: Find and rank the best NGOs for a donation using Gemini AI.

**Inputs**: `donation_id`

**Processing**:

### Step 1: Fetch NGO Candidates
- Gets all `verified` users with role `ngo`
- For each NGO, fetches their `ngo_profiles` document
- Calculates geodesic distance from donor location to NGO location using Geopy
- Computes NGO's acceptance rate: `accepted_count / (accepted_count + declined_count)`

### Step 2: Filter by Radius
- Primary filter: NGOs within **25km**
- If no NGOs within 25km, expands to **50km**
- If still none, returns empty list (match fails)

### Step 3: Gemini AI Ranking
Sends up to 10 candidate NGOs to Gemini 1.5 Flash with this context:
- Donation details: food name, type, quantity, unit, urgency score, expiry hours, storage requirement, pickup type, safety status, tags
- NGO details: NGO ID, name, organization name, capacity (kg), food preferences, distance (km), acceptance rate (%), address

**Gemini's Task**: Rank top 3 NGOs considering:
1. Distance (closer = better, especially for urgent/perishable food)
2. Capacity vs. donation quantity
3. Food preference alignment
4. Acceptance rate reliability
5. If urgency_score > 70 → prioritize closest NGO

**Gemini Response Format**:
```json
{
  "matches": [
    { "ngo_id": "...", "rank": 1, "match_score": 85, "reasoning": "..." },
    { "ngo_id": "...", "rank": 2, "match_score": 72, "reasoning": "..." },
    { "ngo_id": "...", "rank": 3, "match_score": 65, "reasoning": "..." }
  ]
}
```

### Step 4: Save and Update
- Saves all ranked matches to `matches` collection
- Updates donation: `status → "matched"`, `matched_ngo_id → matches[0].ngo_id`

### Fallback Logic
If Gemini API fails or returns invalid JSON:
- Sorts NGOs by `(distance_km ascending, acceptance_rate descending)`
- Takes top 3 as matches
- Uses fallback reasoning strings
- Still updates the donation and saves to `matches` collection

---

## Agent 3: NotificationAgent (`agents/notification_agent.py`)

**Purpose**: Notify relevant parties of the match result.

**Actions**:
- Sends in-app notification to the top matched NGO(s) about the available donation
- Sends notification to the donor confirming a match was found
- All notifications written to `notifications` collection

---

## Agent 4: RoutingAgent (`agents/routing_agent.py`)

**Purpose**: Compute the delivery route and ETA when an NGO accepts.

**Trigger**: Called when NGO accepts (not part of the initial orchestrator chain — triggered by the NGO accept endpoint).

**Processing**:

### Step 1: Extract Coordinates
- Donor coordinates: from `donation.location.coordinates` (GeoJSON: `[lng, lat]` → converted to `{lat, lng}`)
- NGO coordinates: from `ngo_profiles.coordinates` (stored as `{lat, lng}`)

### Step 2: Distance and ETA
- Distance: geodesic calculation using Geopy
- ETA formula: `(distance_km / 20) * 60 + 10` minutes
  - Assumes 20 km/h average speed in Indian cities
  - Adds 10-minute buffer for pickup

### Step 3: Gemini AI Routing Advice (for routes > 5km)
Sends a logistics prompt to Gemini with:
- Donor and NGO coordinates
- Distance
- Food details (name, type)
- Urgency score
- Expiry window
- Storage requirements

Gemini returns:
```json
{
  "recommendation": "Take the highway for faster delivery...",
  "priority_tips": ["Avoid peak traffic hours", "Call ahead to NGO"],
  "estimated_minutes": 35
}
```

### Step 4: Store Route Data
Updates `deliveries` document with:
- `route_data`: complete route object including coordinates, distance, ETA, AI recommendations
- `estimated_time`: ETA in minutes
- Delivery status → `in_transit`

### Step 5: Real-time Broadcast
Emits `delivery:update` WebSocket event to:
- `donor_<donor_id>` room — so donor's tracking page updates live
- `ngo_<ngo_id>` room — so NGO's tracking page updates live

---

## Agent Logs

Every agent action is stored in `agent_logs`:

```json
{
  "_id": "ObjectId",
  "agent_name": "InputAgent | MatchingAgent | NotificationAgent | RoutingAgent | Orchestrator | AdminDispatch",
  "action": "string (e.g., 'gemini_match', 'route_computed', 'dispatch_all')",
  "input_summary": "string",
  "output_summary": "string",
  "timestamp": "datetime",
  "donation_id": "string"
}
```

Viewable in Admin → AI Logs page (`/admin/logs`).

---

## Batch Dispatch (Admin Feature)

**Endpoint**: `POST /api/admin/dispatch-all`  
**Who**: Admin only

This endpoint allows FSSAI admins to manually trigger the orchestration pipeline for all unmatched pending donations at once. Use case: when the automatic trigger failed or when admin wants to force re-matching.

**Logic**:
1. Finds all `pending` donations with no `matched_ngo_id`
2. Finds `pending` donations with a stale match (matched_ngo_id set but still pending >30 minutes)
3. Deduplicates the list
4. If ≤10 donations: runs synchronously, returns full result
5. If >10 donations: runs in background thread with 25-second timeout
6. Returns `{ dispatched, failed, total, results[] }`
7. Creates agent log entry for the dispatch action
8. Notifies all admin users with dispatch summary notification
