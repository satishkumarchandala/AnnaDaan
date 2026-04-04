# API Reference — All Endpoints

## Base URL
All endpoints are prefixed with: `http://localhost:5000/api`

All protected endpoints require the header:
```
Authorization: Bearer <jwt_token>
```

---

## Auth Endpoints (`/api/auth/`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | ❌ | Register new user (donor/ngo/admin) |
| POST | `/auth/login` | ❌ | Login, returns JWT token |
| GET | `/auth/me` | ✅ | Get current user profile |
| GET | `/auth/notifications` | ✅ | Get last 20 notifications |
| PATCH | `/auth/notifications/<id>/read` | ✅ | Mark one notification as read |
| POST | `/auth/notifications/read-all` | ✅ | Mark all notifications as read |
| POST | `/auth/notifications/clear` | ✅ | Delete all notifications |

---

## Donor Endpoints (`/api/`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/donations` | ✅ Donor | Submit a new food donation |
| GET | `/donations/my` | ✅ Donor | List all my donations |
| GET | `/donations/<id>/status` | ✅ | Get single donation status |
| GET | `/donations/<id>/tracking` | ✅ | Full tracking view (timeline, route, coordinates) |
| GET | `/donor/stats` | ✅ Donor | Donor impact stats (meals, kg, CO2) |

---

## NGO Endpoints (`/api/`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/donations/available` | ✅ NGO | List available donations near NGO |
| POST | `/ngo/deliveries/<donation_id>/accept` | ✅ NGO | Accept a donation offer |
| POST | `/ngo/deliveries/<donation_id>/decline` | ✅ NGO | Decline a donation offer |
| GET | `/donations/<id>/tracking` | ✅ | Tracking view (same as donor tracking) |
| POST | `/ngo/requests` | ✅ NGO | Submit a food request |
| GET | `/ngo/requests/my` | ✅ NGO | List my food requests |
| GET | `/ngo/deliveries` | ✅ NGO | List my accepted deliveries |
| POST | `/deliveries/<delivery_id>/deliver` | ✅ NGO | Confirm food received/delivered |

### Available Donations Query Parameters
`GET /donations/available?radius=50&sort=urgency`
- `radius` — Search radius in km (default 50)
- `sort` — Sort by `urgency` (urgency_score desc) or `time` (submitted_at desc)

---

## Admin Endpoints (`/api/admin/`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/admin/stats` | ✅ Admin | Platform-wide statistics |
| GET | `/admin/donations` | ✅ Admin | All donations with pagination and filters |
| GET | `/admin/users` | ✅ Admin | All users (filterable by role) |
| PATCH | `/admin/users/<uid>/status` | ✅ Admin | Update user status (verified/suspended) |
| GET | `/admin/agent-logs` | ✅ Admin | AI agent logs with pagination |
| GET | `/admin/ngo-requests` | ✅ Admin | All NGO food requests |
| POST | `/admin/donations/<id>/assign` | ✅ Admin | Manually assign donation to specific NGO |
| GET | `/admin/alerts` | ✅ Admin | Alerts: near-expiry, flagged, low-acceptance NGOs |
| GET | `/admin/donations/<id>/tracking` | ✅ Admin | Full admin tracking view with agent logs |
| POST | `/admin/donations/<id>/live-location` | ✅ | Push delivery GPS coordinates |
| POST | `/admin/dispatch-all` | ✅ Admin | Batch trigger AI pipeline for all unmatched donations |

### Stats Response Fields
```json
{
  "total_donors": 0,
  "total_ngos": 0,
  "total_donations": 0,
  "today_donations": 0,
  "week_donations": 0,
  "month_donations": 0,
  "active_deliveries": 0,
  "total_delivered": 0,
  "total_kg_redistributed": 0,
  "urgent_flagged": 0,
  "meals_saved_estimate": 0,
  "co2_saved_kg": 0
}
```

### Alerts Response Fields
```json
{
  "urgent_no_taker": [...],   // pending donations expiring in <2h
  "flagged_safety": [...],    // donations with safety_status: flagged
  "low_acceptance_ngos": [...] // NGOs with acceptance_rate < 40%
}
```

---

## Orchestrator Endpoints (`/api/orchestrator/`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/orchestrator/run` | ✅ | Manually trigger orchestration for a donation_id |
| GET | `/orchestrator/logs` | ✅ | List all agent logs (paginated) |

---

## Tracking API Response (Donor View)

`GET /api/donations/<donation_id>/tracking`

```json
{
  "donation": { ...full donation object... },
  "delivery": { ...delivery object or null... },
  "ngo_name": "string or null",
  "timeline": [
    {
      "stage": "donation_sent",
      "label": "Donation Submitted",
      "description": "Dal Makhani — 20 kg",
      "completed": true,
      "timestamp": "2026-04-03T10:00:00",
      "icon": "volunteer_activism"
    },
    { "stage": "matched", "label": "NGO Matched", ... },
    { "stage": "picked_up", "label": "Picked Up / In Transit", ... },
    { "stage": "delivered", "label": "Delivered", ... }
  ],
  "status": "pending | matched | in_transit | delivered",
  "live_location": { "lat": 0, "lng": 0, "updated_at": "..." },
  "donor_coordinates": { "lat": 0, "lng": 0 },
  "ngo_coordinates": { "lat": 0, "lng": 0 }
}
```

---

## Error Responses

All errors follow this format:
```json
{ "error": "Human readable error message" }
```

Common HTTP status codes:
- `400` — Bad request (missing required field)
- `401` — Unauthorized (invalid or missing JWT token)
- `403` — Forbidden (wrong role for this endpoint)
- `404` — Resource not found
- `409` — Conflict (email already registered)
- `500` — Internal server error (with CORS headers guaranteed)
