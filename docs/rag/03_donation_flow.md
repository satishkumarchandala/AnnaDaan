# Donation Flow — End to End

## Step 1: Donor Submits a Donation

**Endpoint**: `POST /api/donations`  
**Who**: Authenticated donor

The donor fills out the Donation Form (`/donor/donate`) with the following fields:

| Field | Type | Description |
|---|---|---|
| `food_type` | string | Category: `cooked_meals`, `raw_produce`, `packaged_food`, `beverages`, `bakery`, `dairy`, `other` |
| `food_name` | string | Specific name (e.g., "Dal Makhani", "Bread rolls") |
| `quantity` | number | Amount of food |
| `unit` | string | `kg`, `servings`, `boxes`, `liters`, `portions`, `packets` |
| `preparation_time` | ISO datetime | When the food was prepared |
| `expiry_window_hours` | number | Hours until food expires from preparation time |
| `description` | string | Optional additional details |
| `storage_required` | boolean | Does food need refrigeration? |
| `pickup_type` | string | `ngo_pickup` (NGO collects) or `donor_drop` (Donor delivers) |
| `location` | `{ lat, lng }` | Pickup location coordinates |
| `location_address` | string | Human-readable address |
| `photo_url` | string | Optional photo of the food |

**What happens on submission:**
1. Donation document created in `donations` collection with `status: "pending"`
2. `donor_profiles.total_donations` incremented by 1
3. The AI Orchestration Pipeline is launched on a background thread instantly
4. Response returned: `{ donation_id, status: "pending", message }`

---

## Step 2: AI Pipeline Runs Automatically

As soon as a donation is submitted, the orchestrator runs three agents in sequence:

### Agent 1: InputAgent
- Calculates the **urgency score** (0–100) based on expiry time, food type, quantity, storage needs
- Runs **FSSAI food safety check** — flags cooked food unrefrigerated for >2 hours
- Assigns **tags**: `URGENT`, `SAFETY_FLAG`, `BULK`, `REFRIGERATION_NEEDED`
- Updates donation with `urgency_score`, `safety_status`, `safety_message`, `tags`

**Urgency Score Formula:**
- Base: 50 points
- Expiry ≤1h → +40, ≤2h → +30, ≤4h → +20, ≤8h → +10, >24h → -10
- Quantity ≥100 → +10, ≥50 → +5
- Cooked/perishable food type → +10
- Refrigeration + expiry ≤4h → +10
- Maximum: 100, Minimum: 0

### Agent 2: MatchingAgent
- Fetches all verified NGOs from `ngo_profiles`
- Calculates geodesic distance from donor to each NGO using the Geopy library
- Filters NGOs within 25km radius (expands to 50km if none found)
- Sends a structured prompt to **Google Gemini 1.5 Flash** asking it to rank the top 3 NGOs considering:
  - Distance (closer = better, especially for urgent food)
  - NGO capacity vs. donation quantity
  - NGO food preferences
  - NGO acceptance rate (accepted_count / total operations)
  - Urgency (if urgency_score > 70, heavily prioritize closest NGO)
- Gemini returns JSON with ranked NGO matches, scores, and reasoning
- All matches saved to `matches` collection
- Donation status updated to `matched`, `matched_ngo_id` set to top NGO
- **Fallback**: If Gemini fails, sorts NGOs by distance + acceptance rate

### Agent 3: NotificationAgent
- Sends in-app notifications to the top matched NGOs informing them of the available donation
- Sends confirmation notification to the donor that an NGO has been matched
- Logs all actions to `agent_logs` collection

---

## Step 3: NGO Accepts or Declines

NGOs see incoming donation offers in their "Available Donations" feed (`/ngo/donations`).

**Accept**: `POST /api/ngo/deliveries/<donation_id>/accept`  
**Decline**: `POST /api/ngo/deliveries/<donation_id>/decline`

**On Accept:**
1. A `deliveries` document created with `status: "accepted"`
2. NGO's `accepted_count` incremented
3. RoutingAgent computes the route:
   - Calculates geodesic distance between donor and NGO coordinates
   - Estimates ETA: `(distance_km / 20) * 60 + 10` minutes (assumes 20 km/h average speed)
   - For routes >5km: sends a Gemini AI prompt to get routing recommendations and priority tips
   - Route data stored in `deliveries.route_data`
4. Delivery status changes to `in_transit`
5. Donation status updated to `in_transit`
6. Donor and NGO both receive real-time WebSocket update via SocketIO
7. Donor notified: "Your donation has been accepted and is in transit!"

**On Decline:**
1. NGO's `declined_count` incremented
2. The next ranked NGO is notified (if available)

---

## Step 4: Food In Transit

During transit, the route map is visible to both donor and NGO showing:
- Real road route via OSRM (OpenStreetMap Routing Machine)
- Donor pickup pin (green house icon)
- NGO drop-off pin (blue flag icon)
- Moving truck icon at route midpoint
- Turn-by-turn directions
- Distance and ETA

The delivery status is `in_transit`.

---

## Step 5: NGO Confirms Delivery

When the food physically arrives, the NGO clicks "Food Received / Delivered" on their tracking page.

**Endpoint**: `POST /api/deliveries/<delivery_id>/deliver`

**What happens:**
1. Delivery status → `delivered`, `delivered_at` timestamp set
2. Donation status → `delivered`
3. Donor's stats updated:
   - `total_meals_served` += estimated meals (calculated from quantity and unit)
   - `total_kg_donated` += kg quantity
4. Donor receives notification: "Your donation has been successfully delivered!"
5. All FSSAI admins notified: "Delivery Confirmed: [food] from [donor] reached [NGO]"
6. Agent log created: "Logistics Agent — Delivery verification: NGO confirmed receipt"

---

## Donation Data Model (`donations` collection)

```json
{
  "_id": "ObjectId",
  "donor_id": "user_id string",
  "donor_name": "string",
  "food_type": "cooked_meals | raw_produce | packaged_food | beverages | bakery | dairy | other",
  "food_name": "string",
  "description": "string",
  "quantity": "number",
  "unit": "kg | servings | boxes | liters | portions | packets",
  "preparation_time": "datetime",
  "expiry_window_hours": "number",
  "expiry_timestamp": "datetime (prep_time + expiry_hours)",
  "storage_required": "boolean",
  "pickup_type": "ngo_pickup | donor_drop",
  "location": { "type": "Point", "coordinates": [lng, lat] },
  "location_address": "string",
  "photo_url": "string",
  "urgency_score": "0-100 integer",
  "safety_status": "safe | flagged | pending",
  "safety_message": "string",
  "tags": ["URGENT", "BULK", "SAFETY_FLAG", "REFRIGERATION_NEEDED"],
  "status": "pending | matched | in_transit | delivered",
  "matched_ngo_id": "user_id string or null",
  "submitted_at": "datetime",
  "updated_at": "datetime"
}
```

---

## Delivery Data Model (`deliveries` collection)

```json
{
  "_id": "ObjectId",
  "donation_id": "string",
  "ngo_id": "string",
  "ngo_name": "string",
  "donor_name": "string",
  "status": "accepted | in_transit | delivered",
  "estimated_time": "number (minutes)",
  "route_data": {
    "donor_location": { "lat": 0, "lng": 0 },
    "ngo_location": { "lat": 0, "lng": 0 },
    "distance_km": "number",
    "estimated_minutes": "number",
    "route_type": "direct",
    "ai_recommendation": "string (Gemini insight)",
    "priority_tips": ["tip1", "tip2"]
  },
  "live_location": { "lat": 0, "lng": 0, "updated_at": "datetime" },
  "created_at": "datetime",
  "delivered_at": "datetime or null"
}
```
