# Database Schema — MongoDB Collections

## Overview

AnnaDaan uses MongoDB as its primary database. The database is named `annadaan`. All collections use auto-generated MongoDB `ObjectId` as the `_id` field.

---

## Collection: `users`

Central identity store for all roles.

```json
{
  "_id": "ObjectId",
  "name": "string — full name or org name",
  "email": "string — lowercase unique",
  "password_hash": "string — bcrypt hash",
  "role": "donor | ngo | admin",
  "phone": "string",
  "status": "verified | suspended | pending",
  "created_at": "datetime"
}
```

**Indexes**: unique on `email`

---

## Collection: `donor_profiles`

Extended profile for donor users.

```json
{
  "_id": "ObjectId",
  "user_id": "string — references users._id",
  "organization_name": "string",
  "organization_type": "individual | restaurant | hotel | canteen | other",
  "address": "string",
  "coordinates": { "lat": 28.6139, "lng": 77.2090 },
  "fssai_license": "string",
  "total_donations": "integer",
  "total_kg_donated": "float",
  "total_meals_served": "integer"
}
```

**Indexes**: 2dsphere on `coordinates`

---

## Collection: `ngo_profiles`

Extended profile for NGO users.

```json
{
  "_id": "ObjectId",
  "user_id": "string — references users._id",
  "organization_name": "string",
  "registration_number": "string",
  "address": "string",
  "coordinates": { "lat": 17.385, "lng": 78.486 },
  "capacity_kg": "float — max food quantity NGO can handle",
  "food_preferences": ["cooked_meals", "packaged_food"],
  "accepted_count": "integer",
  "declined_count": "integer"
}
```

**Indexes**: 2dsphere on `coordinates`

---

## Collection: `donations`

Core donation records.

```json
{
  "_id": "ObjectId",
  "donor_id": "string — references users._id",
  "donor_name": "string — denormalized for display",
  "food_type": "cooked_meals | raw_produce | packaged_food | beverages | bakery | dairy | other",
  "food_name": "string",
  "description": "string",
  "quantity": "float",
  "unit": "kg | servings | boxes | liters | portions | packets",
  "preparation_time": "datetime",
  "expiry_window_hours": "float",
  "expiry_timestamp": "datetime",
  "storage_required": "boolean",
  "pickup_type": "ngo_pickup | donor_drop",
  "location": {
    "type": "Point",
    "coordinates": ["float — longitude", "float — latitude"]
  },
  "location_address": "string",
  "photo_url": "string",
  "urgency_score": "integer 0-100",
  "safety_status": "safe | flagged | pending",
  "safety_message": "string",
  "tags": ["URGENT", "BULK", "SAFETY_FLAG", "REFRIGERATION_NEEDED"],
  "status": "pending | matched | in_transit | delivered",
  "matched_ngo_id": "string | null",
  "submitted_at": "datetime",
  "updated_at": "datetime"
}
```

**Indexes**: 2dsphere on `location` (for geospatial queries)

**Important**: GeoJSON coordinates are stored as `[longitude, latitude]` (longitude first) per GeoJSON spec, but all API responses and frontend use `{lat, lng}` objects.

---

## Collection: `deliveries`

Tracks the physical delivery of a donation from donor to NGO.

```json
{
  "_id": "ObjectId",
  "donation_id": "string — references donations._id",
  "ngo_id": "string — references users._id",
  "ngo_name": "string — denormalized",
  "donor_name": "string — denormalized",
  "status": "accepted | in_transit | delivered",
  "estimated_time": "integer — minutes",
  "route_data": {
    "donor_location": { "lat": 0.0, "lng": 0.0 },
    "ngo_location": { "lat": 0.0, "lng": 0.0 },
    "distance_km": "float",
    "estimated_minutes": "integer",
    "route_type": "direct",
    "waypoints": [],
    "ai_recommendation": "string (Gemini routing advice)",
    "priority_tips": ["string"]
  },
  "live_location": {
    "lat": "float",
    "lng": "float",
    "updated_at": "datetime",
    "pushed_by": "user_id"
  },
  "created_at": "datetime",
  "delivered_at": "datetime | null"
}
```

---

## Collection: `matches`

Records AI matching decisions for audit purposes.

```json
{
  "_id": "ObjectId",
  "donation_id": "string",
  "ngo_id": "string",
  "match_score": "integer 0-100",
  "reasoning": "string — Gemini's explanation",
  "rank": "integer 1-3",
  "matched_at": "datetime",
  "accepted_at": "datetime | null",
  "declined_at": "datetime | null"
}
```

---

## Collection: `agent_logs`

Audit trail for every AI agent action.

```json
{
  "_id": "ObjectId",
  "agent_name": "InputAgent | MatchingAgent | NotificationAgent | RoutingAgent | Orchestrator | AdminDispatch | AdminOverride | Logistics Agent",
  "action": "string — e.g., process_complete, gemini_match, route_computed, dispatch_all",
  "input_summary": "string",
  "output_summary": "string",
  "timestamp": "datetime",
  "donation_id": "string | null"
}
```

**Indexes**: on `timestamp` (for time-ordered queries)

---

## Collection: `notifications`

In-app notifications for all users.

```json
{
  "_id": "ObjectId",
  "user_id": "string — references users._id",
  "type": "matched | delivered | delivery_confirmed | dispatch_complete | new_donation | accepted | declined",
  "message": "string — human-readable notification text",
  "read": "boolean",
  "created_at": "datetime"
}
```

**Indexes**: compound on `(user_id, read)` for fast unread count queries

---

## Collection: `ngo_requests`

Food requests raised by NGOs when they need specific food types.

```json
{
  "_id": "ObjectId",
  "ngo_id": "string",
  "ngo_name": "string",
  "food_type_needed": "string",
  "quantity_needed": "float",
  "unit": "string",
  "urgency": "immediate | within_24h | within_week",
  "description": "string",
  "status": "open | fulfilled | cancelled",
  "created_at": "datetime"
}
```

---

## MongoDB Indexes Summary

| Collection | Index | Type |
|---|---|---|
| `users` | `email` | Unique |
| `donations` | `location` | 2dsphere |
| `ngo_profiles` | `coordinates` | 2dsphere |
| `donor_profiles` | `coordinates` | 2dsphere |
| `agent_logs` | `timestamp` | Ascending |
| `notifications` | `(user_id, read)` | Compound |

---

## Geospatial Notes

- The `donations` collection uses GeoJSON format: `{ type: "Point", coordinates: [lng, lat] }` (longitude FIRST)
- The `ngo_profiles` and `donor_profiles` use a simple `{ lat, lng }` object (NOT GeoJSON)
- Distance calculations use Geopy's `geodesic` function (accounts for Earth's curvature)
- MongoDB `$geoNear` queries use the 2dsphere index on `donations.location`
- Default coordinates (when none provided): New Delhi — lat: 28.6139, lng: 77.2090
