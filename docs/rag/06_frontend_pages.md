# Frontend Pages and Navigation

## Application Structure

The frontend is a single-page React application with route-based code splitting. Each user role has its own set of pages and a dedicated sidebar navigation.

**Base URL**: http://localhost:3000

---

## Public Routes

| Path | Component | Description |
|---|---|---|
| `/auth` | `AuthPage` | Login and registration page |

---

## Donor Routes (`/donor/*`)

| Path | Component | Description |
|---|---|---|
| `/donor` | `DonorDashboard` | Overview: stats, recent donations, quick actions |
| `/donor/donate` | `DonationForm` | Submit a new food donation |
| `/donor/history` | `DonationHistory` | All past donations with status filters |
| `/donor/tracking` | `DonorTrackingPage` | Select donation → see live route map + progress |
| `/donor/settings` | `SettingsPage` | Profile and account settings |

### Donor Sidebar Navigation
1. Dashboard
2. Donate Food
3. My Donations
4. Tracking
5. (Footer) Settings

---

## NGO Routes (`/ngo/*`)

| Path | Component | Description |
|---|---|---|
| `/ngo` | `NgoDashboard` | Overview: stats, recent deliveries with clickable route maps, quick actions |
| `/ngo/donations` | `NgoAvailableDonations` | Browse and accept available donations |
| `/ngo/requests` | `FoodRequestForm + NgoRequestList` | Submit and manage food requests |
| `/ngo/accepted` | `NgoAcceptedPage` | View accepted/delivered donations |
| `/ngo/tracking` | `NgoTrackingPage` | Select delivery → see live route map + progress + confirm delivery |
| `/ngo/settings` | `SettingsPage` | Profile and account settings |

### NGO Sidebar Navigation
1. Dashboard
2. Available Donations
3. My Requests
4. Accepted
5. Tracking
6. (Footer) Settings

### NGO Dashboard Features
- **Stat Cards**: Available Now, In Transit, Delivered, Open Requests — all clickable for navigation
- **Recent Deliveries Table**: Click any row → opens route modal with:
  - Delivery Progress bar (Submitted → Matched → In Transit → Delivered)
  - 4-stage step indicator with timestamps from the timeline API
  - Full OSRM route map (real road geometry, not straight-line)
  - Summary cards: Pickup, Drop-off, Distance, ETA
  - "Open in Google Maps" button → opens navigation from donor to NGO
  - Close button or Escape key to dismiss
- **Quick Actions**: Browse Donations, Raise Food Request, View Accepted Donations

---

## Admin Routes (`/admin/*`)

| Path | Component | Description |
|---|---|---|
| `/admin` | `AdminDashboard` | Platform overview with heatmap, stats, urgent requests, dispatch |
| `/admin/donations` | `AllDonationsPage` | All donations with search, filter, tracking |
| `/admin/users` | `AdminUsersPage` | User management with status control |
| `/admin/tracking` | `DonationTrackingPanel` | Track any delivery with agent logs |
| `/admin/logs` | `AgentLogPage` | Full AI agent log viewer |
| `/admin/alerts` | `AdminAlertsPage` | Expiring food alerts, safety flags |
| `/admin/ngo-requests` | `AdminFoodRequestsPage` | All NGO food requests |
| `/admin/donors` | `AdminDonorsPage` | Donor profiles and stats |
| `/admin/settings` | `SettingsPage` | Admin settings |

### Admin Dashboard Features
- **Platform Stats**: Total donors, NGOs, donations, active deliveries, kg redistributed, CO2 saved, meals saved
- **India Heatmap**: Leaflet map with `leaflet.heat` overlay showing donation density across Indian cities; city markers with donation counts; regional density panel with AI insights
- **Recent Deliveries Table**: Latest 10 deliveries with status
- **Urgent Requests Panel**: NGO food requests marked IMMEDIATE; "Dispatch All Logistics" button
- **Dispatch All Logistics**: Batch triggers AI pipeline for all unmatched pending donations; shows loading spinner during dispatch, green/red result toast with dispatched/failed counts; auto-clears after 7 seconds

### Admin Sidebar Navigation
1. Dashboard
2. All Donations
3. Users
4. Tracking
5. Agent Logs
6. Alerts
7. NGO Requests
8. Donors
9. (Footer) Settings

---

## Shared Components

### Sidebar (`components/shared/Sidebar.tsx`)
- Collapsible navigation with role-specific items
- Active state highlighting
- CTA button (e.g., "Donate Food" for donors, "Raise Request" for NGOs)
- Footer items (Settings)

### StatusBadge (`components/shared/UiKit.tsx`)
Displays color-coded status chips:
- `pending` → grey
- `matched` → blue
- `in_transit` → amber/orange
- `delivered` → green

### LoadingSpinner
Full-page centered spinner for async content.

### EmptyState
Illustrated empty placeholder with icon, heading, and message.

### Countdown
Live countdown timer for expiring donations.

---

## RouteNavigationMap Component (`components/shared/RouteNavigationMap.tsx`)

Reusable Leaflet map component for showing OSRM routing between donor and NGO.

**Props**:
- `donorLocation: { lat, lng }` — Pickup pin location
- `ngoLocation: { lat, lng }` — Drop-off pin location
- `donorName: string` — Label for donor pin
- `ngoName: string` — Label for NGO pin
- `foodName?: string` — Food being transported
- `estimatedMinutes?: number` — ETA display
- `distanceKm?: number` — Distance display
- `status: string` — Controls LIVE badge and truck visibility
- `height?: number` — Map height in pixels (default 400)

**Features**:
- Real road geometry from OSRM public API
- Blue polyline route with animated white dash overlay
- Custom house pin (green, donor) and flag pin (blue, NGO)
- Animated truck marker at midpoint when `in_transit`
- Map style toggle: Streets (OSM) ↔ Satellite (ESRI)
- Turn-by-turn directions tab
- Step list with direction icons, distance, duration per step
- Open in Google Maps / OpenStreetMap deep-links
- Recalculate route button
- LIVE badge pulses when in_transit; shows ✅ DELIVERED when done

---

## IndiaHeatMap Component (`components/admin/IndiaHeatMap.tsx`)

Admin-only Leaflet heatmap for donation density visualization.

**Features**:
- `leaflet.heat` intensity gradient over India
- City-specific donation markers with counts
- Regional density stats panel (North, South, East, West, Central)
- Interactive city popups showing donation count
- Live delivery route simulation
- AI insights for regional patterns

---

## Design System

The app uses a custom CSS design system defined in `src/index.css`:

**CSS Variables**:
- `--primary` → `#0d631b` (AnnaDaan green)
- `--admin-accent` → `#1565C0` (admin blue)
- `--font-headline` → serif display font
- `--font-mono` → monospace for numbers/codes
- `--radius-md`, `--radius-xl`, `--radius-full` → border radius scale
- `--surface-container`, `--surface-container-low`, `--surface-container-high` → card backgrounds
- `--on-surface`, `--on-surface-variant` → text colors
- `--outline-variant` → border color

**Key CSS Classes**:
- `.app-layout` → two-column flex layout (sidebar + main)
- `.main-content` → main area with padding and scroll
- `.card` → elevated surface with border-radius and shadow
- `.card-header` → card top section with border-bottom
- `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-sm`, `.btn-full` → button variants
- `.data-table` → styled table with hover rows
- `.animate-spin` → spinning animation (loading indicators)
- `.animate-pulse` → pulsing animation (live indicators)

**Animations**:
- `@keyframes fadeIn` → modal backdrop fade in
- `@keyframes slideUp` → modal content slide up from below
- `@keyframes spin` → spinner rotation
- `@keyframes pulse` → live indicator pulsing
