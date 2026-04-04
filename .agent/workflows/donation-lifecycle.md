---
description: End-to-end donation lifecycle — from submission to delivered tag
---

# 🍱 AnnaDaan Donation Lifecycle Workflow

This document describes the complete journey of a food donation from the moment a
donor submits it, through NGO matching and acceptance, physical delivery, and the
final "delivered" confirmation tag.

---

## Phase 1 — Donor Submits a Donation

**Who:** Donor (logged-in user with role `donor`)

**Frontend entry point:** `pages/donor/DonationForm.tsx`  
**API endpoint:** `POST /api/donor/donations`  
**Handler:** `backend/app/routes/donor.py` → `submit_donation()`

### Steps

1. Donor fills in the donation form:
   - `food_type`, `food_name`, `quantity`, `unit`
   - `preparation_time`, `expiry_window_hours`
   - Optional: `description`, `storage_required`, `pickup_type`, `location`, `photo_url`

2. Backend creates a `donation` document in MongoDB (`db.donations`) with:
   ```
   status        = "pending"
   safety_status = "pending"
   urgency_score = 50 (default)
   matched_ngo_id = None
   ```

3. `donor_profiles.total_donations` is incremented by 1.

4. **Orchestrator is triggered in a background thread:**
   ```
   backend/app/agents/orchestrator.py → run_orchestration(donation_id, db, app)
   ```
   This runs the AI agent pipeline:
   - **Input Agent** (`input_agent.py`) — validates food details, re-scores urgency
   - **Matching Agent** (`matching_agent.py`) — finds the best NGO using Gemini AI  
     Sets `status = "matched"` and `matched_ngo_id` when a match is found
   - **Notification Agent** (`notification_agent.py`) — notifies matched NGO

5. API returns `{ donation_id, status: "pending", message: "AI matching in progress." }`.

**Donor can track progress at:** `pages/donor/DonorTrackingPage.tsx`  
**API:** `GET /api/donor/donations/<donation_id>/tracking`

---

## Phase 2 — NGO Views & Accepts the Donation

**Who:** NGO user (logged-in user with role `ngo`)

**Frontend entry point:** `pages/ngo/NgoAvailableDonations.tsx`  
**API endpoint (list):** `GET /api/ngo/donations/available`  
**API endpoint (accept):** `POST /api/ngo/donations/<donation_id>/accept`  
**Handler:** `backend/app/routes/ngo.py` → `accept_donation()`

### Steps

1. NGO browses available donations filtered by:
   - Distance radius (default 50 km from NGO's saved coordinates)
   - Food type (optional)
   - Expiry — expired donations are excluded automatically
   - Sort by urgency score, expiry, or distance

2. NGO clicks **"Accept"** on a donation with `status = "pending"` or `status = "matched"`.

3. Backend performs:
   ```
   db.donations.update → status = "in_transit", matched_ngo_id = ngo_user_id
   db.matches.upsert   → accepted_at = now
   db.deliveries.insert_one → status = "in_transit", delivered_at = None
   db.ngo_profiles.update  → accepted_count += 1
   ```

4. A **notification is sent to the donor**:
   > 🎉 `{NGO name}` has accepted your donation of `{food_name}`!

5. **Routing Agent is triggered** in a background thread  
   (`backend/app/agents/routing_agent.py` → `RoutingAgent.compute_route()`)
   - Calculates distance between donor and NGO coordinates
   - Estimates pickup time at avg 20 km/h city speed
   - If `distance > 5 km`, calls Gemini AI for routing recommendation
   - Updates `db.deliveries` with `route_data` and `estimated_time`
   - Emits Socket.IO events to both donor and NGO rooms:
     ```
     delivery:update  →  room: donor_{donor_id}
     delivery:update  →  room: ngo_{ngo_id}
     ```

**NGO accepted deliveries page:** `pages/ngo/NgoAcceptedPage.tsx`

---

## Phase 3 — Food is Picked Up & In Transit

**Who:** NGO volunteer performing the physical pickup

**Status during this phase:** `status = "in_transit"` (set at acceptance)

### What happens

- Delivery record exists:
  ```
  {
    donation_id, ngo_id, ngo_name,
    donor_id, donor_name,
    route_data: { distance_km, estimated_minutes, ai_recommendation, ... },
    status: "in_transit",
    created_at: <acceptance timestamp>,
    delivered_at: null
  }
  ```

- **Donor sees live tracking timeline** on `DonorTrackingPage.tsx`:
  | Step | Label | Completed |
  |------|-------|-----------|
  | 1 | Donation Submitted | ✅ always |
  | 2 | NGO Matched | ✅ when `matched_ngo_id` is set |
  | 3 | Picked Up / In Transit | ✅ when `status = "in_transit"` |
  | 4 | Delivered | ❌ pending |

- **NGO sees real-time route** on `pages/ngo/NgoTrackingPage.tsx`.

- Live location can optionally be streamed via `delivery.live_location` field  
  (updated via Socket.IO `delivery:update` events).

---

## Phase 4 — NGO Marks as Delivered (Final Tag)

**Who:** NGO user

**Frontend entry point:** `pages/ngo/NgoAcceptedPage.tsx` — "Mark Delivered" button  
**API endpoint:** `POST /api/ngo/deliveries/<delivery_id>/deliver`  
**Handler:** `backend/app/routes/ngo.py` → `mark_delivered()`

### Steps

1. NGO clicks **"Mark as Delivered"** after physically handing over the food.

2. Backend updates:
   ```
   db.deliveries.update → status = "delivered", delivered_at = now
   db.donations.update  → status = "delivered", updated_at = now
   ```

3. **Donor stats are updated:**
   ```
   donor_profiles.total_meals_served += calculated_meals
   donor_profiles.total_kg_donated   += donation_quantity_in_kg
   ```

4. **Notifications sent:**
   - To **Donor**:
     > ✅ Your donation of `{food_name}` has been successfully delivered and confirmed by the NGO!
   - To **all FSSAI Admins**:
     > 📦 Delivery Confirmed: `{food_name}` from `{donor_name}` has reached NGO `{ngo_name}`.

5. An **agent audit log** is written to `db.agent_logs`:
   ```
   {
     agent_type: "Logistics Agent",
     action:     "Delivery verification",
     details:    "NGO {name} confirmed physical receipt of {food_name}. Chain of custody verified.",
     donation_id, timestamp
   }
   ```

6. Donor's tracking timeline now shows **all 4 stages complete** ✅.

---

## Status State Machine

```
pending ──[Orchestrator]──► matched ──[NGO Accepts]──► in_transit ──[NGO Confirms]──► delivered
   │                                                                                        │
   └── (expired / no match) ──► expired                       (admin can also cancel) ──► cancelled
```

| `status`     | Meaning |
|--------------|---------|
| `pending`    | Submitted, awaiting AI matching |
| `matched`    | AI matched an NGO, waiting for NGO to accept |
| `in_transit` | NGO accepted, food being picked up / en route |
| `delivered`  | NGO confirmed physical receipt — **final tag** |
| `expired`    | Expiry time passed before pickup |
| `cancelled`  | Admin or donor cancelled |

---

## Key Collections (MongoDB)

| Collection | Purpose |
|---|---|
| `db.donations` | Main donation record with status |
| `db.deliveries` | Delivery/logistics record with route_data |
| `db.matches` | NGO match records (accepted/declined) |
| `db.ngo_requests` | NGO food requests submitted to FSSAI |
| `db.notifications` | In-app notifications for donor/ngo/admin |
| `db.agent_logs` | AI agent execution audit trail |
| `db.donor_profiles` | Donor stats (meals, CO2, kg donated) |
| `db.ngo_profiles` | NGO location + accepted/declined count |

---

## AI Agent Pipeline (Background)

```
submit_donation()
    └──► orchestrator.run_orchestration()
             ├── InputAgent.process()         → validates, scores urgency
             ├── MatchingAgent.match()        → Gemini AI finds best NGO
             └── NotificationAgent.notify()  → alerts NGO

accept_donation()
    └──► RoutingAgent.compute_route()
             ├── Haversine distance calculation
             ├── Gemini AI routing recommendation (if > 5 km)
             └── Socket.IO real-time update to donor + NGO rooms
```

---

## Quick API Reference

| Action | Method | Endpoint | Role |
|---|---|---|---|
| Submit donation | POST | `/api/donor/donations` | Donor |
| My donations list | GET | `/api/donor/donations/my` | Donor |
| Track donation | GET | `/api/donor/donations/<id>/tracking` | Donor/NGO/Admin |
| Donor stats | GET | `/api/donor/donor/stats` | Donor |
| Available donations | GET | `/api/ngo/donations/available` | NGO |
| Accept donation | POST | `/api/ngo/donations/<id>/accept` | NGO |
| Decline donation | POST | `/api/ngo/donations/<id>/decline` | NGO |
| My deliveries | GET | `/api/ngo/ngo/deliveries` | NGO |
| Mark delivered | POST | `/api/ngo/deliveries/<id>/deliver` | NGO |
| Create food request | POST | `/api/ngo/ngo/requests` | NGO |
