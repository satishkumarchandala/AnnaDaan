import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Sidebar } from '@/components/shared/Sidebar'
import { StatusBadge, Countdown, LoadingSpinner, EmptyState } from '@/components/shared/UiKit'
import api from '@/api/client'

// ── Leaflet icon fix ────────────────────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const donorNav = [
  { icon: 'dashboard',    label: 'Dashboard',       path: '/donor' },
  { icon: 'restaurant',   label: 'Donate Food',     path: '/donor/donate' },
  { icon: 'history',      label: 'My Donations',    path: '/donor/history' },
  { icon: 'location_on',  label: 'Live Tracking',   path: '/donor/tracking' },
]

const STAGE_STEPS = [
  { key: 'pending',    label: 'Submitted',   icon: 'volunteer_activism', color: '#0d631b' },
  { key: 'matched',    label: 'NGO Matched', icon: 'handshake',          color: '#1565C0' },
  { key: 'in_transit', label: 'In Transit',  icon: 'local_shipping',     color: '#9e4200' },
  { key: 'delivered',  label: 'Delivered',   icon: 'check_circle',       color: '#2E7D32' },
]

// ── OSRM route fetch ────────────────────────────────────────────
interface LatLng { lat: number; lng: number }
interface RouteResult {
  coords: [number, number][]
  steps: { instruction: string; distance: number; duration: number; name: string }[]
  totalDistance: number
  totalDuration: number
}

async function fetchOSRM(from: LatLng, to: LatLng): Promise<RouteResult | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/` +
      `${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    if (data.code !== 'Ok' || !data.routes?.length) return null
    const route = data.routes[0]
    const coords: [number, number][] = route.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng]
    )
    const steps: RouteResult['steps'] = []
    for (const leg of route.legs) {
      for (const step of leg.steps) {
        steps.push({
          instruction: formatInstruction(step.maneuver?.type, step.maneuver?.modifier, step.name),
          distance: step.distance,
          duration: step.duration,
          name: step.name || '',
        })
      }
    }
    return { coords, steps: steps.slice(0, 10), totalDistance: route.distance, totalDuration: route.duration }
  } catch { return null }
}

function formatInstruction(type: string, modifier: string, name: string): string {
  const road = name ? ` onto ${name}` : ''
  const map: Record<string, string> = {
    turn: modifier ? `Turn ${modifier}${road}` : `Turn${road}`,
    'new name': `Continue${road}`, depart: `Start${road}`, arrive: 'Arrive at destination',
    merge: `Merge${road}`, 'on ramp': `Take ramp${road}`, 'off ramp': `Exit${road}`,
    fork: `Keep ${modifier || 'straight'}${road}`, roundabout: 'Enter roundabout',
    continue: `Continue${road}`,
  }
  return map[type] || `Continue${road}`
}

function fmtDist(m: number) { return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m` }
function fmtDur(s: number)  { const m = Math.round(s / 60); return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m` }
function pinIcon(color: string, emoji: string, size = 38) {
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;background:${color};
      border:3px solid white;box-shadow:0 3px 14px rgba(0,0,0,0.32);display:flex;align-items:center;
      justify-content:center;font-size:${Math.round(size*.43)}px;transform:rotate(-45deg)">
      <span style="transform:rotate(45deg)">${emoji}</span></div>`,
    iconSize: [size, size], iconAnchor: [size / 2, size], popupAnchor: [0, -size],
  })
}

// ── Inline map component ────────────────────────────────────────
const DeliveryMap: React.FC<{
  donor: LatLng; ngo: LatLng
  donorName: string; ngoName: string; foodName?: string
  status: string
}> = ({ donor, ngo, donorName, ngoName, foodName, status }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<L.Map | null>(null)
  const [route, setRoute]           = useState<RouteResult | null>(null)
  const [loading, setLoading]       = useState(true)
  const [mapStyle, setMapStyle]     = useState<'streets' | 'satellite'>('streets')
  const [activeTab, setActiveTab]   = useState<'map' | 'steps'>('map')

  // Fetch route
  useEffect(() => {
    setLoading(true)
    setRoute(null)
    fetchOSRM(donor, ngo).then(r => { setRoute(r); setLoading(false) })
  }, [donor.lat, donor.lng, ngo.lat, ngo.lng])

  // Build map
  useEffect(() => {
    if (!containerRef.current || activeTab !== 'map') return
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }

    const midLat = (donor.lat + ngo.lat) / 2
    const midLng = (donor.lng + ngo.lng) / 2
    const map = L.map(containerRef.current, { center: [midLat, midLng], zoom: 11, zoomControl: false, scrollWheelZoom: true })
    mapRef.current = map

    const TILES = {
      streets:   'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    }
    L.tileLayer(TILES[mapStyle], { maxZoom: 19 }).addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    if (route?.coords.length) {
      // Solid route line
      const poly = L.polyline(route.coords, { color: '#1565C0', weight: 6, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }).addTo(map)
      // Animated dash overlay
      L.polyline(route.coords, { color: 'white', weight: 2.5, opacity: 0.55, dashArray: '10,14' }).addTo(map)
      map.fitBounds(poly.getBounds(), { padding: [50, 50] })
    } else {
      const line = L.polyline([[donor.lat, donor.lng], [ngo.lat, ngo.lng]], { color: '#1565C0', weight: 4, dashArray: '12,9', opacity: 0.7 }).addTo(map)
      map.fitBounds(line.getBounds(), { padding: [60, 60] })
    }

    // Donor marker
    L.marker([donor.lat, donor.lng], { icon: pinIcon('#0d631b', '🏠') }).addTo(map)
      .bindPopup(`<div style="font-family:system-ui;min-width:140px"><b style="color:#0d631b">📦 Pickup — ${donorName}</b>${foodName ? `<br><span style="font-size:12px;color:#666">${foodName}</span>` : ''}</div>`)

    // NGO marker
    L.marker([ngo.lat, ngo.lng], { icon: pinIcon('#1565C0', '🏛️') }).addTo(map)
      .bindPopup(`<div style="font-family:system-ui;min-width:140px"><b style="color:#1565C0">🏛️ Delivery — ${ngoName}</b></div>`)

    // Animated truck for in_transit
    if (status === 'in_transit' && route?.coords.length) {
      const mid = route.coords[Math.floor(route.coords.length * 0.42)]
      L.marker(mid, {
        icon: L.divIcon({
          className: '',
          html: `<div style="background:#9e4200;color:white;border:3px solid white;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:0 3px 14px rgba(158,66,0,0.5);animation:pulse 1.5s infinite">🚚</div>`,
          iconSize: [36, 36], iconAnchor: [18, 18],
        }), interactive: false,
      }).addTo(map).bindTooltip('En Route', { permanent: true, direction: 'top', offset: [0, -20], className: 'donor-map-tooltip' })
    }

    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null } }
  }, [activeTab, route, mapStyle, donor.lat, donor.lng, ngo.lat, ngo.lng, donorName, ngoName, foodName, status])

  const dist = route?.totalDistance ?? null
  const dur  = route?.totalDuration ?? null

  return (
    <div style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '1px solid color-mix(in srgb, var(--outline-variant) 40%, transparent)', boxShadow: 'var(--shadow-md)' }}>

      {/* Map header */}
      <div style={{ padding: '0.875rem 1.25rem', background: 'linear-gradient(135deg, #1565C0 0%, #0d631b 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span className="material-symbols-outlined icon-filled" style={{ fontSize: 22, color: 'white' }}>alt_route</span>
          <div>
            <div style={{ fontWeight: 800, color: 'white', fontSize: '0.9375rem', fontFamily: 'var(--font-headline)' }}>Live Route</div>
            <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.72)' }}>{donorName} → {ngoName}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {dist && <Pill icon="straighten">{fmtDist(dist)}</Pill>}
          {dur  && <Pill icon="schedule">~{fmtDur(dur)}</Pill>}
          {status === 'in_transit' && (
            <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 'var(--radius-full)', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#69f0ae', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'white', letterSpacing: '0.04em' }}>LIVE</span>
            </div>
          )}
          {status === 'delivered' && (
            <div style={{ background: 'rgba(105,240,174,0.22)', borderRadius: 'var(--radius-full)', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span className="material-symbols-outlined icon-filled" style={{ fontSize: 13, color: '#69f0ae' }}>check_circle</span>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#69f0ae' }}>DELIVERED</span>
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--outline-variant)', background: 'var(--surface-container-low)' }}>
        {([['map', 'map', 'Map View'], ['steps', 'format_list_numbered', 'Turn-by-Turn']] as const).map(([key, icon, label]) => (
          <button key={key} onClick={() => setActiveTab(key as 'map' | 'steps')} style={{
            flex: 1, padding: '0.5rem 1rem', border: 'none',
            background: activeTab === key ? 'white' : 'transparent',
            color: activeTab === key ? 'var(--primary)' : 'var(--on-surface-variant)',
            fontWeight: activeTab === key ? 700 : 500, fontSize: '0.8125rem', cursor: 'pointer',
            borderBottom: activeTab === key ? '2px solid var(--primary)' : '2px solid transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
            transition: 'all 0.15s', fontFamily: 'var(--font-headline)'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{icon}</span>
            {label}
            {key === 'steps' && route && (
              <span style={{ background: 'var(--primary)', color: 'white', borderRadius: 10, fontSize: '0.5625rem', padding: '1px 5px', fontWeight: 700 }}>{route.steps.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Map */}
      {activeTab === 'map' && (
        <div style={{ position: 'relative' }}>
          {loading && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 9, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(4px)', gap: '0.75rem' }}>
              <div style={{ width: 36, height: 36, border: '3px solid #e0e0e0', borderTopColor: '#1565C0', borderRadius: '50%' }} className="animate-spin" />
              <span style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>Calculating road route…</span>
            </div>
          )}
          {/* Map style switcher */}
          <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 800, display: 'flex', gap: 2, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', borderRadius: 'var(--radius-md)', padding: '3px', boxShadow: '0 2px 10px rgba(0,0,0,0.12)' }}>
            {(['streets', 'satellite'] as const).map(s => (
              <button key={s} onClick={() => setMapStyle(s)} style={{ padding: '3px 9px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.6rem', fontWeight: 700, background: mapStyle === s ? '#1565C0' : 'transparent', color: mapStyle === s ? 'white' : '#666', transition: 'all 0.15s' }}>
                {s === 'streets' ? '🗺 Streets' : '🛰 Satellite'}
              </button>
            ))}
          </div>
          <div ref={containerRef} className="map-container" style={{ height: 380, width: '100%' }} />
        </div>
      )}

      {/* Turn-by-turn steps */}
      {activeTab === 'steps' && (
        <div style={{ maxHeight: 380, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '0.75rem' }}>
              <div style={{ width: 28, height: 28, border: '3px solid #e0e0e0', borderTopColor: '#1565C0', borderRadius: '50%' }} className="animate-spin" />
              <span style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem' }}>Loading directions…</span>
            </div>
          ) : !route?.steps.length ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--outline-variant)', display: 'block', marginBottom: '0.5rem' }}>map_search</span>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', margin: 0 }}>Turn-by-turn directions unavailable for this route.</p>
            </div>
          ) : (
            <div>
              {/* Origin */}
              <div style={{ display:'flex', gap:'0.75rem', alignItems:'center', padding:'0.75rem 1.25rem', background:'linear-gradient(135deg,rgba(13,99,27,0.07),rgba(13,99,27,0.02))', borderBottom:'1px solid var(--outline-variant)' }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'#0d631b', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 2px 8px rgba(13,99,27,0.3)' }}>
                  <span className="material-symbols-outlined icon-filled" style={{ fontSize:16, color:'white' }}>home</span>
                </div>
                <div>
                  <div style={{ fontSize:'0.625rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'#0d631b' }}>Pickup · Donor</div>
                  <div style={{ fontWeight:600, fontSize:'0.875rem' }}>{donorName}</div>
                </div>
              </div>
              {route.steps.map((step, i) => (
                <div key={i} style={{ display:'flex', gap:'0.75rem', padding:'0.625rem 1.25rem', borderBottom:'1px solid var(--surface-container-high)', alignItems:'flex-start' }}
                  onMouseEnter={e => (e.currentTarget.style.background='var(--surface-container-low)')}
                  onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
                  <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, background:'color-mix(in srgb,#1565C0 12%,transparent)', border:'1.5px solid rgba(21,101,192,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize:15, color:'#1565C0' }}>
                      {step.instruction.toLowerCase().includes('left') ? 'turn_left' : step.instruction.toLowerCase().includes('right') ? 'turn_right' : step.instruction.toLowerCase().includes('arrive') ? 'flag' : 'straight'}
                    </span>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:'0.8125rem', lineHeight:1.35 }}>{step.instruction}</div>
                    {step.name && step.name !== step.instruction && <div style={{ fontSize:'0.75rem', color:'var(--on-surface-variant)' }}>{step.name}</div>}
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:'0.75rem', color:'#1565C0' }}>{fmtDist(step.distance)}</div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.625rem', color:'var(--on-surface-variant)' }}>{fmtDur(step.duration)}</div>
                  </div>
                </div>
              ))}
              {/* Destination */}
              <div style={{ display:'flex', gap:'0.75rem', alignItems:'center', padding:'0.75rem 1.25rem', background:'linear-gradient(135deg,rgba(21,101,192,0.07),rgba(21,101,192,0.02))', borderTop:'1px solid var(--outline-variant)' }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'#1565C0', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 2px 8px rgba(21,101,192,0.3)' }}>
                  <span className="material-symbols-outlined icon-filled" style={{ fontSize:16, color:'white' }}>flag</span>
                </div>
                <div>
                  <div style={{ fontSize:'0.625rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'#1565C0' }}>Delivery · NGO</div>
                  <div style={{ fontWeight:600, fontSize:'0.875rem' }}>{ngoName}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ padding:'0.625rem 1.25rem', borderTop:'1px solid var(--outline-variant)', background:'var(--surface-container-low)', display:'flex', gap:'0.5rem', flexWrap:'wrap', alignItems:'center' }}>
        <span style={{ fontSize:'0.6875rem', fontWeight:600, color:'var(--on-surface-variant)', marginRight:2 }}>Open in:</span>
        <a href={`https://www.google.com/maps/dir/${donor.lat},${donor.lng}/${ngo.lat},${ngo.lng}`} target="_blank" rel="noopener noreferrer"
          style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:'var(--radius-full)', border:'1px solid var(--outline-variant)', textDecoration:'none', fontSize:'0.6875rem', fontWeight:600, color:'#1a73e8', background:'white' }}>
          🗺 Google Maps
        </a>
        <a href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${donor.lat},${donor.lng};${ngo.lat},${ngo.lng}`} target="_blank" rel="noopener noreferrer"
          style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:'var(--radius-full)', border:'1px solid var(--outline-variant)', textDecoration:'none', fontSize:'0.6875rem', fontWeight:600, color:'#0d631b', background:'white' }}>
          🌍 OpenStreetMap
        </a>
      </div>

      <style>{`.donor-map-tooltip{background:#9e4200!important;color:white!important;border:none!important;font-weight:700;font-size:11px!important;border-radius:6px!important;padding:3px 8px!important;}.donor-map-tooltip::before{display:none!important}`}</style>
    </div>
  )
}

// Small pill helper
const Pill: React.FC<{ icon: string; children: React.ReactNode }> = ({ icon, children }) => (
  <div style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(4px)', borderRadius: 'var(--radius-full)', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
    <span className="material-symbols-outlined" style={{ fontSize: 13, color: 'white' }}>{icon}</span>
    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'white' }}>{children}</span>
  </div>
)

// ── Main page ───────────────────────────────────────────────────
export const DonorTrackingPage: React.FC = () => {
  const navigate = useNavigate()
  const [donations, setDonations]   = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState<any | null>(null)
  const [trackData, setTrackData]   = useState<any | null>(null)
  const [trackLoading, setTrackLoading] = useState(false)
  const [lastUpdated, setLastUpdated]   = useState<Date | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    api.get('/donations/my')
      .then(r => {
        const all = r.data
        setDonations(all)
        const active = all.find((d: any) => ['pending', 'matched', 'in_transit'].includes(d.status))
        if (active) setSelected(active)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const fetchTracking = useCallback(async (donationId: string) => {
    if (!donationId) return
    setTrackLoading(true)
    try {
      const res = await api.get(`/donations/${donationId}/tracking`)
      setTrackData(res.data)
      setLastUpdated(new Date())
    } catch { setTrackData(null) }
    finally { setTrackLoading(false) }
  }, [])

  useEffect(() => {
    if (!selected?._id) return
    fetchTracking(selected._id)
    pollRef.current = setInterval(() => fetchTracking(selected._id), 7000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [selected?._id, fetchTracking])

  const getActiveStep = (tl: any[]) => {
    if (!tl) return 0; let last = 0
    tl.forEach((s, i) => { if (s.completed) last = i }); return last
  }

  const activeStep  = trackData ? getActiveStep(trackData.timeline) : 0
  const progressPct = trackData?.status === 'delivered' ? 100 : Math.round(((activeStep + 1) / 4) * 100)
  const activeDonations = donations.filter(d => ['pending', 'matched', 'in_transit', 'delivered'].includes(d.status))

  // Resolve coords
  const donorCoords = trackData?.donor_coordinates ?? trackData?.delivery?.route_data?.donor_location ?? null
  const ngoCoords   = trackData?.ngo_coordinates   ?? trackData?.delivery?.route_data?.ngo_location   ?? null
  const hasMap      = donorCoords && ngoCoords && ['matched', 'in_transit', 'delivered'].includes(trackData?.status)

  return (
    <div className="app-layout">
      <Sidebar navItems={donorNav} ctaLabel="+ Donate Food" ctaAction={() => navigate('/donor/donate')} footerItems={[{ icon: 'settings', label: 'Settings', path: '/donor/settings' }]} />
      <main className="main-content">

        {/* Page header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ marginBottom: '0.2rem' }}>Live Tracking</h2>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem' }}>Real-time route & delivery status for your food donations</p>
          </div>
          {trackData && lastUpdated && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'color-mix(in srgb, var(--primary) 8%, transparent)', padding: '0.375rem 0.875rem', borderRadius: 'var(--radius-full)', border: '1px solid color-mix(in srgb, var(--primary) 20%, transparent)' }}>
              <span className="live-dot" />
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--primary)' }}>
                LIVE · {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          )}
        </div>

        {loading ? <LoadingSpinner /> : activeDonations.length === 0 ? (
          <EmptyState icon="local_shipping" title="No active donations to track"
            description="Donate food to start tracking. All active donations appear here with real-time status."
            action={<Link to="/donor/donate" className="btn btn-primary">Donate Food Now</Link>} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.25rem', alignItems: 'start' }}>

            {/* ── Left rail: donation list ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)', padding: '0 0.25rem', marginBottom: '0.125rem' }}>
                Your Donations
              </div>
              {activeDonations.map(d => {
                const isSel  = selected?._id === d._id
                const isDone = d.status === 'delivered'
                return (
                  <div key={d._id} onClick={() => setSelected(d)} className="card"
                    style={{ padding: '0.75rem 0.875rem', cursor: 'pointer', borderLeft: `3px solid ${isSel ? 'var(--primary)' : isDone ? '#2E7D32' : 'transparent'}`, background: isSel ? 'color-mix(in srgb, var(--primary) 5%, white)' : isDone ? 'rgba(46,125,50,0.04)' : undefined, transition: 'all 0.15s' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem', overflow: 'hidden' }}>
                      {isDone && <span className="material-symbols-outlined icon-filled" style={{ fontSize: 13, color: '#2E7D32', flexShrink: 0 }}>check_circle</span>}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.food_name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <StatusBadge status={d.status} />
                      {d.expiry_timestamp && !isDone && <Countdown expiryTimestamp={d.expiry_timestamp} />}
                    </div>
                  </div>
                )
              })}
              <Link to="/donor/history" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--on-surface-variant)', textDecoration: 'none', border: '1px solid var(--outline-variant)', justifyContent: 'center', marginTop: '0.25rem', transition: 'all 0.15s' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>history</span>Full History
              </Link>
            </div>

            {/* ── Right panel: map + progress ── */}
            <div>
              {!selected ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 48, display: 'block', marginBottom: '0.75rem', color: 'var(--outline-variant)' }}>my_location</span>
                  <p>Select a donation on the left to view live tracking</p>
                </div>
              ) : trackLoading && !trackData ? (
                <LoadingSpinner />
              ) : trackData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                  {/* Delivered banner */}
                  {trackData.status === 'delivered' && (
                    <div style={{ background: 'linear-gradient(135deg,rgba(46,125,50,0.10),rgba(102,187,106,0.07))', border: '1px solid rgba(46,125,50,0.25)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem', display: 'flex', gap: '0.875rem', alignItems: 'center' }}>
                      <span className="material-symbols-outlined icon-filled" style={{ fontSize: 34, color: '#2E7D32', flexShrink: 0 }}>celebration</span>
                      <div>
                        <div style={{ fontWeight: 800, color: '#2E7D32', fontSize: '1rem', marginBottom: '0.2rem', fontFamily: 'var(--font-headline)' }}>Food Successfully Delivered! 🎉</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
                          Your donation of <strong>{trackData.donation?.food_name}</strong> was confirmed received by <strong>{trackData.ngo_name || 'the NGO'}</strong>. Thank you!
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Delivery Route Map ── */}
                  {hasMap ? (
                    <DeliveryMap
                      donor={donorCoords!} ngo={ngoCoords!}
                      donorName={trackData.donation?.donor_name || 'Donor'}
                      ngoName={trackData.ngo_name || 'NGO'}
                      foodName={trackData.donation?.food_name}
                      status={trackData.status}
                    />
                  ) : ['pending'].includes(trackData.status) && (
                    <div className="card" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', background: 'color-mix(in srgb, #1565C0 5%, transparent)', border: '1px solid color-mix(in srgb, #1565C0 15%, transparent)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 38, color: '#1565C0', flexShrink: 0 }}>search</span>
                      <div>
                        <div style={{ fontWeight: 700, color: '#1565C0', fontSize: '0.9375rem', marginBottom: '0.25rem' }}>Finding Your NGO Match…</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>Our AI is matching this donation to the best-suited NGO in your area. The live route map will appear once a match is confirmed.</div>
                      </div>
                    </div>
                  )}

                  {/* ── Delivery Progress ── */}
                  <div className="card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <h4 style={{ margin: 0 }}>{trackData.donation?.food_name || 'Delivery Progress'}</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {trackData.status === 'in_transit' && <span className="live-dot" />}
                        <StatusBadge status={trackData.status} />
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{ height: 8, background: 'var(--surface-container-high)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: '1.25rem' }}>
                      <div style={{
                        height: '100%', width: `${progressPct}%`,
                        background: trackData.status === 'delivered' ? 'linear-gradient(90deg,#2E7D32,#66BB6A)' : 'linear-gradient(90deg,var(--primary),#9e4200)',
                        borderRadius: 'var(--radius-full)', transition: 'width 0.8s ease',
                        boxShadow: '0 0 8px rgba(13,99,27,0.25)'
                      }} />
                    </div>

                    {/* Step bubbles */}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      {STAGE_STEPS.map((stage, i) => {
                        const tl     = trackData.timeline?.[i]
                        const done   = tl?.completed && i < activeStep
                        const active = i === activeStep
                        return (
                          <div key={stage.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
                            <div style={{
                              width: 44, height: 44, borderRadius: '50%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: done ? stage.color : active ? `color-mix(in srgb, ${stage.color} 15%, transparent)` : 'var(--surface-container-high)',
                              border: (active || done) ? `2px solid ${stage.color}` : '2px solid var(--outline-variant)',
                              boxShadow: active ? `0 0 0 5px color-mix(in srgb, ${stage.color} 14%, transparent)` : 'none',
                              transition: 'all 0.4s',
                            }}>
                              {done
                                ? <span className="material-symbols-outlined icon-filled" style={{ fontSize: 20, color: 'white' }}>check</span>
                                : <span className={`material-symbols-outlined ${active ? 'icon-filled' : ''}`} style={{ fontSize: 20, color: active ? stage.color : 'var(--outline-variant)' }}>{stage.icon}</span>
                              }
                            </div>
                            <span style={{ fontSize: '0.625rem', fontWeight: active ? 700 : 500, color: active ? stage.color : done ? 'var(--on-surface)' : 'var(--outline-variant)', textAlign: 'center', lineHeight: 1.2 }}>{stage.label}</span>
                            {tl?.timestamp && (
                              <span style={{ fontSize: '0.5rem', fontFamily: 'var(--font-mono)', color: 'var(--outline)', textAlign: 'center' }}>
                                {new Date(tl.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* ── Info cards row ── */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem' }}>
                    {[
                      { label: 'Quantity', value: `${trackData.donation?.quantity} ${trackData.donation?.unit}`, icon: 'scale', color: 'var(--primary)' },
                      { label: 'NGO', value: trackData.ngo_name || (trackData.status === 'pending' ? 'Matching…' : 'Assigned'), icon: 'groups', color: '#1565C0' },
                      { label: 'Progress', value: `${progressPct}%`, icon: 'speed', color: '#9e4200' },
                    ].map(item => (
                      <div key={item.label} className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 22, color: item.color, display: 'block', marginBottom: '0.375rem' }}>{item.icon}</span>
                        <div style={{ fontWeight: 700, fontSize: '0.9375rem', fontFamily: 'var(--font-headline)' }}>{item.value}</div>
                        <div style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--on-surface-variant)', marginTop: 3 }}>{item.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* ── Timeline ── */}
                  <div className="card" style={{ padding: '1.25rem' }}>
                    <h4 style={{ marginBottom: '1rem' }}>Lifecycle Timeline</h4>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {(trackData.timeline || []).map((stage: any, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: '0.875rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                            <div style={{
                              width: 30, height: 30, borderRadius: '50%',
                              background: stage.completed ? STAGE_STEPS[i]?.color || 'var(--primary)' : 'var(--surface-container-high)',
                              border: `2px solid ${stage.completed ? STAGE_STEPS[i]?.color || 'var(--primary)' : 'var(--outline-variant)'}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              boxShadow: stage.completed ? `0 2px 8px color-mix(in srgb, ${STAGE_STEPS[i]?.color || 'var(--primary)'} 30%, transparent)` : 'none',
                            }}>
                              {stage.completed
                                ? <span className="material-symbols-outlined icon-filled" style={{ fontSize: 13, color: 'white' }}>check</span>
                                : <span className="material-symbols-outlined" style={{ fontSize: 13, color: 'var(--outline-variant)' }}>{stage.icon}</span>}
                            </div>
                            {i < (trackData.timeline.length - 1) && (
                              <div style={{ width: 2, height: 32, background: stage.completed ? STAGE_STEPS[i]?.color || 'var(--primary)' : 'var(--surface-container-high)' }} />
                            )}
                          </div>
                          <div style={{ paddingBottom: i < trackData.timeline.length - 1 ? '0.25rem' : 0, paddingTop: '0.25rem' }}>
                            <div style={{ fontWeight: stage.completed ? 600 : 500, fontSize: '0.875rem', color: stage.completed ? 'var(--on-surface)' : 'var(--outline)' }}>{stage.label}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: 2 }}>{stage.description}</div>
                            {stage.timestamp && (
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--outline)', marginTop: 2 }}>
                                {new Date(stage.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* footer */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}>Auto-refreshes every 7s</span>
                    <button onClick={() => fetchTracking(selected._id)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>refresh</span> Refresh
                    </button>
                  </div>
                </div>
              ) : (
                <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                  <p>Could not load tracking data for this donation.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
