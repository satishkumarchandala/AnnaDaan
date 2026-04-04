import React, { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/* ── Types ─────────────────────────────────────────────────────────── */
interface LatLng { lat: number; lng: number }
interface RouteStep {
  instruction: string
  distance: number   // metres
  duration: number   // seconds
  name: string
}
interface RouteResult {
  coords: [number, number][]   // polyline points [lat, lng]
  steps: RouteStep[]
  totalDistance: number        // metres
  totalDuration: number        // seconds
}

export interface RouteNavigationMapProps {
  donorLocation: LatLng
  ngoLocation: LatLng
  donorName?: string
  ngoName?: string
  foodName?: string
  estimatedMinutes?: number
  distanceKm?: number
  status?: string              // 'in_transit' | 'delivered' | etc.
  height?: number
}

/* ── OSRM Public API Fetch ──────────────────────────────────────── */
async function fetchOSRMRoute(from: LatLng, to: LatLng): Promise<RouteResult | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/` +
      `${from.lng},${from.lat};${to.lng},${to.lat}` +
      `?overview=full&geometries=geojson&steps=true&annotations=false`
    const res = await fetch(url)
    if (!res.ok) throw new Error('OSRM error')
    const data = await res.json()
    if (data.code !== 'Ok' || !data.routes?.length) return null

    const route = data.routes[0]
    const coords: [number, number][] = route.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng]
    )

    const steps: RouteStep[] = []
    for (const leg of route.legs) {
      for (const step of leg.steps) {
        if (step.maneuver?.type !== 'depart' || steps.length === 0) {
          steps.push({
            instruction: formatInstruction(step.maneuver?.type, step.maneuver?.modifier, step.name),
            distance: step.distance,
            duration: step.duration,
            name: step.name || '',
          })
        }
      }
    }

    return {
      coords,
      steps: steps.slice(0, 12),   // cap at 12 steps
      totalDistance: route.distance,
      totalDuration: route.duration,
    }
  } catch {
    return null
  }
}

function formatInstruction(type: string, modifier: string, name: string): string {
  const road = name ? ` onto ${name}` : ''
  const map: Record<string, string> = {
    turn: modifier ? `Turn ${modifier}${road}` : `Turn${road}`,
    'new name': `Continue${road}`,
    depart: `Start${road}`,
    arrive: 'Arrive at destination',
    merge: `Merge${road}`,
    'on ramp': `Take ramp${road}`,
    'off ramp': `Exit${road}`,
    fork: `Keep ${modifier || 'straight'}${road}`,
    'end of road': `Turn ${modifier || 'right'} at end of road`,
    roundabout: `Enter roundabout`,
    rotary: `Enter rotary`,
    continue: `Continue${road}`,
  }
  return map[type] || `Continue${road}`
}

function fmtDist(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`
}
function fmtDur(s: number): string {
  const m = Math.round(s / 60)
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`
}
function stepIcon(instruction: string): string {
  const i = instruction.toLowerCase()
  if (i.includes('left'))    return 'turn_left'
  if (i.includes('right'))   return 'turn_right'
  if (i.includes('arrive'))  return 'flag'
  if (i.includes('start'))   return 'my_location'
  if (i.includes('roundab')) return 'roundabout_right'
  if (i.includes('merge'))   return 'merge'
  return 'straight'
}

/* ── Custom Marker Icons ──────────────────────────────────────── */
function makeIcon(color: string, emoji: string, size = 36) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;
      background:${color};border:3px solid white;
      box-shadow:0 3px 12px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;
      font-size:${Math.round(size * 0.45)}px;
      transform:rotate(-45deg);
    "><span style="transform:rotate(45deg)">${emoji}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  })
}

/* ── Main Component ───────────────────────────────────────────── */
export const RouteNavigationMap: React.FC<RouteNavigationMapProps> = ({
  donorLocation, ngoLocation,
  donorName = 'Donor', ngoName = 'NGO',
  foodName, estimatedMinutes, distanceKm,
  status = 'in_transit', height = 420,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const routeLayerRef = useRef<L.Polyline | null>(null)

  const [route, setRoute] = useState<RouteResult | null>(null)
  const [routeLoading, setRouteLoading] = useState(true)
  const [routeError, setRouteError] = useState(false)
  const [tab, setTab] = useState<'map' | 'steps'>('map')
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite'>('streets')

  // Tile layers
  const TILES = {
    streets: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  }
  const ATTRIB = {
    streets: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
    satellite: 'Tiles © Esri',
  }

  // Fetch OSRM route once
  const loadRoute = useCallback(async () => {
    setRouteLoading(true)
    setRouteError(false)
    const result = await fetchOSRMRoute(donorLocation, ngoLocation)
    if (result) setRoute(result)
    else setRouteError(true)
    setRouteLoading(false)
  }, [donorLocation.lat, donorLocation.lng, ngoLocation.lat, ngoLocation.lng])

  useEffect(() => { loadRoute() }, [loadRoute])

  // Build / rebuild Leaflet map
  useEffect(() => {
    if (!containerRef.current || tab !== 'map') return
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }

    const midLat = (donorLocation.lat + ngoLocation.lat) / 2
    const midLng = (donorLocation.lng + ngoLocation.lng) / 2

    const map = L.map(containerRef.current, {
      center: [midLat, midLng],
      zoom: 12,
      zoomControl: false,
      scrollWheelZoom: true,
    })
    mapRef.current = map

    // Tile layer
    L.tileLayer(TILES[mapStyle], { attribution: ATTRIB[mapStyle], maxZoom: 19 }).addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // Route polyline
    if (route?.coords.length) {
      const polyline = L.polyline(route.coords, {
        color: '#1565C0',
        weight: 5,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map)

      // Animated dashed overlay
      L.polyline(route.coords, {
        color: 'white',
        weight: 2,
        opacity: 0.6,
        dashArray: '8, 12',
      }).addTo(map)

      routeLayerRef.current = polyline
      map.fitBounds(polyline.getBounds(), { padding: [40, 40] })
    } else {
      // Fallback: straight line if no OSRM route
      const line = L.polyline([[donorLocation.lat, donorLocation.lng], [ngoLocation.lat, ngoLocation.lng]], {
        color: '#1565C0', weight: 4, dashArray: '10,8', opacity: 0.6
      }).addTo(map)
      map.fitBounds(line.getBounds(), { padding: [50, 50] })
    }

    // Donor marker
    L.marker([donorLocation.lat, donorLocation.lng], { icon: makeIcon('#0d631b', '🏠') })
      .addTo(map)
      .bindPopup(`
        <div style="font-family:system-ui;min-width:140px">
          <div style="font-weight:800;color:#0d631b;margin-bottom:4px">📦 Pickup Point</div>
          <div style="font-weight:600">${donorName}</div>
          ${foodName ? `<div style="font-size:12px;color:#666;margin-top:2px">${foodName}</div>` : ''}
          <div style="font-size:11px;color:#999;margin-top:4px">
            ${donorLocation.lat.toFixed(5)}, ${donorLocation.lng.toFixed(5)}
          </div>
        </div>`, { maxWidth: 200 })

    // NGO marker
    L.marker([ngoLocation.lat, ngoLocation.lng], { icon: makeIcon('#1565C0', '🏛️') })
      .addTo(map)
      .bindPopup(`
        <div style="font-family:system-ui;min-width:140px">
          <div style="font-weight:800;color:#1565C0;margin-bottom:4px">🏛️ Delivery Point</div>
          <div style="font-weight:600">${ngoName}</div>
          <div style="font-size:11px;color:#999;margin-top:4px">
            ${ngoLocation.lat.toFixed(5)}, ${ngoLocation.lng.toFixed(5)}
          </div>
        </div>`, { maxWidth: 200 })

    // Animated "in transit" vehicle marker (midpoint of route)
    if (status === 'in_transit' && route?.coords.length) {
      const mid = route.coords[Math.floor(route.coords.length * 0.45)]
      L.marker(mid, {
        icon: L.divIcon({
          className: '',
          html: `<div style="
            background:#9e4200;color:white;border:3px solid white;
            width:34px;height:34px;border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            font-size:16px;
            box-shadow:0 3px 12px rgba(158,66,0,0.5);
            animation:pulse 1.5s infinite;
          ">🚚</div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        }),
        interactive: false,
      }).addTo(map).bindTooltip('En Route', { permanent: false, direction: 'top', offset: [0, -18] })
    }

    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null } }
  }, [tab, route, mapStyle, donorLocation.lat, donorLocation.lng, ngoLocation.lat, ngoLocation.lng, donorName, ngoName, foodName, status])

  const totalDist = route ? route.totalDistance : (distanceKm ? distanceKm * 1000 : null)
  const totalDur  = route ? route.totalDuration : (estimatedMinutes ? estimatedMinutes * 60 : null)

  const googleMapsUrl = `https://www.google.com/maps/dir/${donorLocation.lat},${donorLocation.lng}/${ngoLocation.lat},${ngoLocation.lng}`
  const osmUrl = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${donorLocation.lat},${donorLocation.lng};${ngoLocation.lat},${ngoLocation.lng}`

  return (
    <div className="card" style={{ overflow: 'hidden', borderRadius: 'var(--radius-xl)' }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{
        padding: '1rem 1.25rem', background: 'linear-gradient(135deg, #1565C0 0%, #0d631b 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.625rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span className="material-symbols-outlined icon-filled" style={{ fontSize: 22, color: 'white' }}>
            alt_route
          </span>
          <div>
            <div style={{ fontWeight: 800, color: 'white', fontSize: '0.9375rem', fontFamily: 'var(--font-headline)' }}>
              Route Navigation
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.75)' }}>
              {donorName} → {ngoName}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Stats pills */}
          {totalDist && (
            <div style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(4px)', borderRadius: 'var(--radius-full)', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'white' }}>straighten</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>{fmtDist(totalDist)}</span>
            </div>
          )}
          {totalDur && (
            <div style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(4px)', borderRadius: 'var(--radius-full)', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'white' }}>schedule</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>~{fmtDur(totalDur)}</span>
            </div>
          )}
          {status === 'in_transit' && (
            <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 'var(--radius-full)', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#69f0ae', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'white', letterSpacing: '0.04em' }}>LIVE</span>
            </div>
          )}
          {status === 'delivered' && (
            <div style={{ background: 'rgba(105,240,174,0.25)', borderRadius: 'var(--radius-full)', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span className="material-symbols-outlined icon-filled" style={{ fontSize: 14, color: '#69f0ae' }}>check_circle</span>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#69f0ae' }}>DELIVERED</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--outline-variant)',
        background: 'var(--surface-container-low)'
      }}>
        {([['map', 'map', 'Map View'], ['steps', 'format_list_numbered', 'Turn-by-Turn']] as const).map(([key, icon, label]) => (
          <button key={key} onClick={() => setTab(key as 'map' | 'steps')} style={{
            flex: 1, padding: '0.625rem 1rem', border: 'none',
            background: tab === key ? 'white' : 'transparent',
            color: tab === key ? 'var(--primary)' : 'var(--on-surface-variant)',
            fontWeight: tab === key ? 700 : 500, fontSize: '0.875rem', cursor: 'pointer',
            borderBottom: tab === key ? '2px solid var(--primary)' : '2px solid transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
            transition: 'all 0.15s'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{icon}</span>
            {label}
            {key === 'steps' && route && (
              <span style={{ background: 'var(--primary)', color: 'white', borderRadius: 10, fontSize: '0.625rem', padding: '1px 6px', fontWeight: 700 }}>
                {route.steps.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Map Tab ──────────────────────────────────────────────── */}
      {tab === 'map' && (
        <div style={{ position: 'relative' }}>
          {routeLoading && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 9, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(4px)', gap: '0.75rem'
            }}>
              <div style={{ width: 36, height: 36, border: '3px solid #e0e0e0', borderTopColor: '#1565C0', borderRadius: '50%' }} className="animate-spin" />
              <span style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>
                Calculating road route via OSRM…
              </span>
            </div>
          )}

          {/* Map style switcher */}
          <div style={{
            position: 'absolute', top: 12, right: 12, zIndex: 800,
            background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(8px)',
            borderRadius: 'var(--radius-md)', padding: '4px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.14)', display: 'flex', gap: 2
          }}>
            {(['streets', 'satellite'] as const).map(s => (
              <button key={s} onClick={() => setMapStyle(s)} style={{
                padding: '3px 9px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: '0.625rem', fontWeight: 700, textTransform: 'capitalize',
                background: mapStyle === s ? '#1565C0' : 'transparent',
                color: mapStyle === s ? 'white' : '#666', transition: 'all 0.15s'
              }}>{s === 'streets' ? '🗺 Streets' : '🛰 Satellite'}</button>
            ))}
          </div>

          <div ref={containerRef} style={{ height, width: '100%' }} />
        </div>
      )}

      {/* ── Turn-by-Turn Steps Tab ────────────────────────────────── */}
      {tab === 'steps' && (
        <div style={{ maxHeight: height, overflowY: 'auto' }}>
          {routeLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '0.75rem' }}>
              <div style={{ width: 28, height: 28, border: '3px solid #e0e0e0', borderTopColor: '#1565C0', borderRadius: '50%' }} className="animate-spin" />
              <span style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem' }}>Loading directions…</span>
            </div>
          ) : routeError || !route?.steps.length ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--outline-variant)', display: 'block', marginBottom: '0.5rem' }}>map_search</span>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', margin: 0 }}>
                Could not load turn-by-turn directions. The route may be across too large a distance for the OSRM demo server.
              </p>
            </div>
          ) : (
            <div>
              {/* Origin */}
              <div style={{
                display: 'flex', gap: '0.875rem', alignItems: 'center',
                padding: '0.875rem 1.25rem',
                background: 'linear-gradient(135deg, rgba(13,99,27,0.06), rgba(13,99,27,0.02))',
                borderBottom: '1px solid var(--outline-variant)'
              }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#0d631b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(13,99,27,0.3)' }}>
                  <span className="material-symbols-outlined icon-filled" style={{ fontSize: 18, color: 'white' }}>home</span>
                </div>
                <div>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#0d631b' }}>Pickup (Donor)</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{donorName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontFamily: 'monospace' }}>
                    {donorLocation.lat.toFixed(5)}, {donorLocation.lng.toFixed(5)}
                  </div>
                </div>
              </div>

              {/* Steps */}
              <div>
                {route.steps.map((step, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: '0.75rem', padding: '0.75rem 1.25rem',
                    borderBottom: '1px solid var(--surface-container-high)',
                    alignItems: 'flex-start', transition: 'background 0.1s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-container-low)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Step icon */}
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                      background: `color-mix(in srgb, #1565C0 12%, transparent)`,
                      border: '1.5px solid rgba(21,101,192,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#1565C0' }}>
                        {stepIcon(step.instruction)}
                      </span>
                    </div>

                    {/* Instruction */}
                    <div style={{ flex: 1, paddingTop: '0.125rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.35 }}>{step.instruction}</div>
                      {step.name && step.name !== step.instruction && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: 1 }}>{step.name}</div>
                      )}
                    </div>

                    {/* Distance + duration */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8125rem', color: '#1565C0' }}>
                        {fmtDist(step.distance)}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--on-surface-variant)' }}>
                        {fmtDur(step.duration)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Destination */}
              <div style={{
                display: 'flex', gap: '0.875rem', alignItems: 'center',
                padding: '0.875rem 1.25rem',
                background: 'linear-gradient(135deg, rgba(21,101,192,0.06), rgba(21,101,192,0.02))',
                borderTop: '1px solid var(--outline-variant)'
              }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#1565C0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(21,101,192,0.3)' }}>
                  <span className="material-symbols-outlined icon-filled" style={{ fontSize: 18, color: 'white' }}>flag</span>
                </div>
                <div>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#1565C0' }}>Delivery Point (NGO)</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{ngoName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontFamily: 'monospace' }}>
                    {ngoLocation.lat.toFixed(5)}, {ngoLocation.lng.toFixed(5)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Footer: Open In App buttons ─────────────────────────── */}
      <div style={{
        padding: '0.75rem 1.25rem',
        borderTop: '1px solid var(--outline-variant)',
        background: 'var(--surface-container-low)',
        display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--on-surface-variant)', marginRight: 4 }}>
          Open in:
        </span>
        <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
            borderRadius: 'var(--radius-full)', border: '1px solid var(--outline-variant)',
            textDecoration: 'none', fontSize: '0.75rem', fontWeight: 600,
            color: '#1a73e8', background: 'white', transition: 'all 0.15s'
          }}>
          <span style={{ fontSize: 14 }}>🗺</span> Google Maps
        </a>
        <a href={osmUrl} target="_blank" rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
            borderRadius: 'var(--radius-full)', border: '1px solid var(--outline-variant)',
            textDecoration: 'none', fontSize: '0.75rem', fontWeight: 600,
            color: '#0d631b', background: 'white', transition: 'all 0.15s'
          }}>
          <span style={{ fontSize: 14 }}>🌍</span> OpenStreetMap
        </a>
        <button
          onClick={loadRoute}
          style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4,
            padding: '5px 10px', borderRadius: 'var(--radius-full)',
            border: '1px solid var(--outline-variant)', background: 'transparent',
            fontSize: '0.75rem', fontWeight: 600, color: 'var(--on-surface-variant)',
            cursor: 'pointer', transition: 'all 0.15s'
          }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>refresh</span>
          Recalculate
        </button>
      </div>
    </div>
  )
}
