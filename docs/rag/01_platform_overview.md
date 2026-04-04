# AnnaDaan Platform — Complete Overview

## What is AnnaDaan?

AnnaDaan is an FSSAI-governed (Food Safety and Standards Authority of India) food donation coordination platform that connects surplus food donors with verified NGOs across India. The name "AnnaDaan" means "Donation of Food/Grain" in Sanskrit.

The platform uses a multi-agent AI pipeline powered by Google Gemini 1.5 Flash to automate donation intake, food safety validation, intelligent NGO matching, logistics routing, and real-time delivery tracking.

---

## Mission

To eliminate food waste by creating a zero-friction bridge between food surplus (donors) and food deficit (NGOs serving communities in need), while ensuring food safety compliance under FSSAI standards.

---

## Core Problem Solved

Every day, restaurants, hotels, event venues, and households discard large quantities of edible food. Simultaneously, NGOs struggle to find consistent food supply for the communities they serve. AnnaDaan solves this coordination problem by:

1. Making donation submission as simple as filling a form
2. Automatically matching donations to the nearest, most suitable NGO via AI
3. Tracking the entire chain of custody from kitchen to beneficiary
4. Providing analytics to FSSAI administrators for governance and oversight

---

## Who Uses AnnaDaan?

### Donors
- Restaurants, hotels, catering companies
- Corporate canteens and offices
- Event venues and wedding halls
- Individual households
- Supermarkets and grocery stores

Donors submit surplus food, get AI routing, and can track their donation until it is delivered.

### NGOs (Non-Governmental Organizations)
- Food banks and shelters
- Orphanages
- Old-age homes
- Community kitchens

NGOs receive AI-matched donation offers, accept or decline, raise food requests when they have specific needs, and confirm receipt of deliveries.

### FSSAI Admin (Authority)
- Food Safety and Standards Authority of India officials
- Platform administrators

Admins have a full governance dashboard: heatmaps, agent logs, alerts for expiring food, dispatch controls, user management, and platform-wide analytics.

---

## Technology Stack

### Backend
- **Framework**: Flask 3.0 (Python)
- **Database**: MongoDB (via PyMongo)
- **Authentication**: Flask-JWT-Extended (JWT Bearer tokens)
- **Real-time**: Flask-SocketIO + Eventlet (WebSockets)
- **AI Engine**: Google Gemini 1.5 Flash (via `google-generativeai`)
- **Geospatial**: Geopy (geodesic distance), MongoDB 2dsphere indexes
- **Email**: Flask-Mail
- **Password Hashing**: bcrypt

### Frontend
- **Framework**: React 18 + TypeScript (Vite)
- **Routing**: React Router v6
- **State Management**: Zustand (`authStore`)
- **HTTP Client**: Axios
- **Mapping**: Leaflet + react-leaflet, OSRM routing API, leaflet.heat
- **Icons**: Google Material Symbols
- **Styling**: Vanilla CSS (custom design system with CSS variables)

### Infrastructure
- Backend runs on http://localhost:5000
- Frontend runs on http://localhost:3000
- API base: http://localhost:5000/api

---

## Donation Lifecycle States

A donation moves through exactly four states in sequence:

```
pending → matched → in_transit → delivered
```

| State | Meaning |
|---|---|
| `pending` | Donation submitted, AI pipeline processing |
| `matched` | Best NGO identified and notified by AI |
| `in_transit` | NGO has accepted and marked pickup started |
| `delivered` | NGO confirmed receipt of the food |

---

## Platform Modules

1. **Authentication & Registration** — Role-based sign-up and login
2. **Donor Portal** — Donation submission, tracking, stats
3. **NGO Portal** — Available donations, acceptance, requests, tracking
4. **Admin Dashboard** — Platform oversight, dispatch, analytics, alerts
5. **AI Agent Pipeline** — Automated intake → matching → routing
6. **Live Tracking** — Real-time map with OSRM routing and progress steps
7. **Notification System** — In-app notifications for all events
8. **Agent Log Viewer** — Transparency into every AI decision
