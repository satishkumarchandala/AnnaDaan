# User Roles and Authentication

## Role Types

AnnaDaan has exactly three roles. Every user belongs to exactly one role.

| Role | Value in DB | Who |
|---|---|---|
| Donor | `donor` | Food suppliers (restaurants, events, households) |
| NGO | `ngo` | Charitable organizations receiving food |
| Admin | `admin` | FSSAI authority / platform administrators |

---

## Registration

**Endpoint**: `POST /api/auth/register`

All users register with a shared form. Required fields:
- `name` — Full name or organization name
- `email` — Unique email (case-insensitive stored as lowercase)
- `password` — Plaintext (hashed with bcrypt on server)
- `role` — Must be `donor`, `ngo`, or `admin`
- `phone` — Contact number

Optional fields depending on role:
- `organization_name` — Company/NGO name
- `organization_type` — e.g., `individual`, `restaurant`, `hotel`
- `address` — Physical address
- `coordinates` — `{ lat, lng }` for geospatial matching (defaults to New Delhi: 28.6139, 77.2090)
- `fssai_license` — For donors
- `registration_number` — For NGOs
- `capacity_kg` — Max food quantity the NGO can handle (default 100kg)
- `food_preferences` — List of food types the NGO accepts

**On Registration:**
- A `users` document is created
- A role-specific profile document is created:
  - Donor → `donor_profiles` collection
  - NGO → `ngo_profiles` collection
- A JWT token is returned immediately (no email verification by default)
- All new accounts start with `status: "verified"`

---

## Login

**Endpoint**: `POST /api/auth/login`

Required: `email`, `password`

Returns: `{ token, user: { id, name, email, role, status } }`

The JWT token must be included in all subsequent requests as:
```
Authorization: Bearer <token>
```

Token is stored in `localStorage` under the key `annadaan_token`.

---

## Get Current User

**Endpoint**: `GET /api/auth/me`

Returns the current user's full profile including their role-specific profile data.

---

## Account Status

User accounts have a `status` field:
- `verified` — Active, can use platform (default for new registrations)
- `suspended` — Blocked by admin, cannot log in effectively
- `pending` — Reserved for future email-verification flow

Admins can change user status via `PATCH /api/admin/users/<uid>/status`.

---

## Frontend Auth Flow

1. User visits any protected route → redirected to `/auth`
2. On `/auth` page, user toggles between Login / Register
3. On success, JWT token stored in `localStorage`
4. User object stored in Zustand `authStore`
5. React Router redirects to the role-specific dashboard:
   - Donor → `/donor`
   - NGO → `/ngo`
   - Admin → `/admin`
6. On 401 response from any API call → auto-logout, redirect to `/auth`

---

## Notifications System

Every user receives in-app notifications for key events.

**Endpoints:**
- `GET /api/auth/notifications` — Fetch last 20 notifications
- `PATCH /api/auth/notifications/<id>/read` — Mark one as read
- `POST /api/auth/notifications/read-all` — Mark all as read
- `POST /api/auth/notifications/clear` — Delete all notifications

**Notification Types:**
- `matched` — NGO matched to donor's donation
- `delivered` — Donation confirmed delivered
- `delivery_confirmed` — Admin notification when NGO marks delivered
- `dispatch_complete` — Admin notification after batch dispatch
- `new_donation` — NGO gets notified when a matching donation is available
- `accepted` — Donor notified when NGO accepts their donation
- `declined` — Donor notified when NGO declines

Notifications are stored in the `notifications` MongoDB collection with fields: `user_id`, `type`, `message`, `read` (boolean), `created_at`.
