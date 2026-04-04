# FAQs — Common Questions and Answers

This document contains likely questions users, developers, and administrators may ask about the AnnaDaan platform, along with accurate answers.

---

## General Questions

**Q: What is AnnaDaan?**  
A: AnnaDaan is an AI-powered food donation platform governed by FSSAI (Food Safety and Standards Authority of India). It connects food donors (restaurants, hotels, households) with verified NGOs to redistribute surplus food, prevent waste, and feed communities in need.

**Q: What does "AnnaDaan" mean?**  
A: "AnnaDaan" is a Sanskrit term meaning "Donation of Food/Grain." Anna (अन्न) means food/grain, and Daan (दान) means donation or gift.

**Q: Is AnnaDaan only for India?**  
A: Yes. AnnaDaan is designed for the Indian context with FSSAI compliance, Indian city support in the heatmap, distance calculations optimized for Indian urban geography (20 km/h average city speed), and Indian regulatory standards baked into food safety checks.

**Q: Who governs the platform?**  
A: FSSAI (Food Safety and Standards Authority of India). Admin users on the platform represent FSSAI authority and have oversight over all donations, users, and deliveries.

---

## Donor Questions

**Q: How do I donate food?**  
A: Log in as a donor → click "Donate Food" in the sidebar → fill in the form (food type, quantity, expiry time, location) → submit. The AI pipeline will automatically find the best NGO within minutes.

**Q: What types of food can I donate?**  
A: Any of these types: Cooked Meals, Raw Produce, Packaged Food, Beverages, Bakery Items, Dairy Products, or Other.

**Q: How long does it take to find a matching NGO?**  
A: Usually within seconds to a minute. The AI matching pipeline runs immediately in the background after submission. If no NGOs are available in a 25km radius, it tries 50km.

**Q: Can I track my donation after submitting?**  
A: Yes. Go to Tracking in the sidebar, select your donation, and you'll see the full lifecycle (Submitted → Matched → In Transit → Delivered) with a real road map showing the route from your location to the NGO.

**Q: What is the urgency score?**  
A: A score from 0 to 100 that represents how urgently a donation needs to be picked up. It's calculated automatically based on how soon the food expires, the quantity, the food type (cooked food is more urgent), and whether refrigeration is required. Higher score = more urgent = priority matching.

**Q: What happens if my food is flagged for safety?**  
A: FSSAI safety standards require cooked food to not be unrefrigerated for more than 2 hours. If your food has been unrefrigerated for longer, it gets a SAFETY_FLAG tag and the admin is alerted. The donation may still proceed but is flagged for attention.

**Q: What does the BULK tag mean?**  
A: If your donation is 50 units or more (kg, servings, etc.), it is tagged as BULK so NGOs with sufficient capacity are prioritized in matching.

**Q: Do I need an FSSAI license to donate?**  
A: An FSSAI license field is available in the donor profile but is optional during registration. Institutional donors (restaurants, hotels) are encouraged to provide it.

**Q: How is CO2 savings calculated?**  
A: 2.5 kg of CO2 is saved for every 1 kg of food donated (based on standard food waste carbon footprint calculations). This represents the CO2 that would have been emitted during decomposition and transportation to landfill.

**Q: How are meals estimated?**  
A: 1 kg ≈ 4 meals; 1 serving = 1 meal; 1 box/pack ≈ 3 meals; 1 liter ≈ 3 meals.

---

## NGO Questions

**Q: How do I receive donations?**  
A: Log in as an NGO, go to "Available Donations" to see food available near you, and click Accept. Alternatively, the AI system will automatically notify you when a donation matches your preferences and location.

**Q: How are donations matched to my NGO?**  
A: Google Gemini AI ranks available donations against your profile (location, food preferences, capacity, acceptance history) and sends you the best matches. Distance is the primary factor, with urgency weighting for perishable food.

**Q: What is the search radius for donations?**  
A: NGOs are shown donations within 50km by default. The AI matching agent first searches 25km, then expands to 50km if needed.

**Q: What is an acceptance rate and why does it matter?**  
A: Acceptance rate = (accepted donations) / (total offered). The AI uses this to avoid sending donations to NGOs that frequently decline, improving platform efficiency. Higher acceptance rates get priority in matching.

**Q: How do I confirm I received the food?**  
A: Go to "Tracking" in the sidebar, select the active delivery, and click "Food Received / Delivered." This marks the delivery as complete and notifies the donor and FSSAI admin.

**Q: Can I decline a donation offer?**  
A: Yes. Go to Available Donations and click Decline. Your declined_count increases, which may lower your acceptance rate over time.

**Q: What is a Food Request?**  
A: NGOs can proactively request specific food types from the platform. Go to "My Requests" and submit a request specifying what food is needed, quantity, and urgency (Immediate, Within 24h, Within a Week). FSSAI admins can see all open requests in their dashboard.

**Q: Can I see the route from the donor to my NGO?**  
A: Yes. On the Tracking page (and on the NGO Dashboard's Recent Deliveries), click on a delivery to see a full OpenStreetMap route with actual road geometry, distance, ETA, and turn-by-turn directions.

---

## Admin Questions

**Q: What can FSSAI admins do?**  
A: Admins have full platform visibility: view all donations, track any delivery, see AI agent logs, manage user accounts, dispatch unmatched donations, view urgent alerts, and monitor platform-wide analytics (heatmap, stats, CO2, meals).

**Q: What is the heatmap on the Admin Dashboard?**  
A: A Leaflet-based interactive map showing donation density across India using a heat gradient. Cities with more active donations appear as brighter/hotter on the map.

**Q: What is "Dispatch All Logistics"?**  
A: A batch action that finds all pending donations with no NGO match and re-runs the complete AI pipeline (InputAgent → MatchingAgent → NotificationAgent) for each one. Useful when automatic matching failed or for bulk re-processing. Results show in a toast with matched/failed counts.

**Q: What are the Alert types?**  
A: Three alert categories:
1. **Urgent No Taker** — Pending donations expiring within 2 hours with no NGO match
2. **Flagged Safety** — Donations that failed the FSSAI food safety check
3. **Low Acceptance NGOs** — NGOs with acceptance rate below 40%

**Q: Can admins manually assign a donation to a specific NGO?**  
A: Yes. POST `/api/admin/donations/<id>/assign` with `{ ngo_id }` overrides AI matching and directly assigns the donation to the specified NGO.

**Q: Where can I see AI decisions?**  
A: Admin → Agent Logs (or `/admin/logs`). Every InputAgent, MatchingAgent, RoutingAgent, NotificationAgent action is logged with input summary, output summary, and timestamp.

---

## Technical Questions

**Q: What AI model does AnnaDaan use?**  
A: Google Gemini 1.5 Flash via the `google-generativeai` Python SDK. It's used for NGO matching (ranking candidates), logistics routing (delivery recommendations), and regional demand insights in the heatmap.

**Q: What happens if Gemini AI is unavailable?**  
A: The MatchingAgent has a fallback: it sorts NGOs by distance and acceptance rate and picks the top 3. A fallback_match log entry is created. The RoutingAgent gracefully continues without AI tips.

**Q: How is real-time tracking implemented?**  
A: Flask-SocketIO with Eventlet handles WebSocket connections. Delivery agents can push GPS coordinates to `POST /api/admin/donations/<id>/live-location`. The server emits `location_update` and `delivery:update` events to rooms named `track_<donation_id>`, `donor_<donor_id>`, and `ngo_<ngo_id>`.

**Q: What routing API is used for maps?**  
A: The OSRM (OpenStreetMap Routing Machine) public API at `https://router.project-osrm.org`. No API key required. It returns actual road geometry that is displayed as a blue polyline on Leaflet maps.

**Q: What map tiles are used?**  
A: Default view: OpenStreetMap tiles. Satellite view: ESRI World Imagery tiles. Both available in the RouteNavigationMap component without API keys.

**Q: Is there any user data geo-stored?**  
A: Yes. Donor pickup locations are stored as GeoJSON Points with a 2dsphere index. NGO and Donor profile coordinates are stored as `{lat, lng}` objects also with 2dsphere indexes, enabling fast geospatial radius queries.

**Q: How are all distances calculated?**  
A: Using Geopy's `geodesic` function, which calculates the shortest distance over the Earth's surface (accounting for the ellipsoidal shape of Earth). This is more accurate than simple Euclidean distance.

**Q: What is the JWT token expiry?**  
A: Default Flask-JWT-Extended token expiry (typically 1 hour unless configured otherwise). On 401 response, the frontend auto-clears the token and redirects to `/auth`.

**Q: What does the CORS fix do?**  
A: An `@app.after_request` hook in `__init__.py` always injects `Access-Control-Allow-Origin: *` headers. A `@app.errorhandler(500)` also returns CORS headers on errors, so the browser always sees the real error rather than a misleading CORS block message.
