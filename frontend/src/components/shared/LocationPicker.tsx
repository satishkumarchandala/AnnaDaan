import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default marker icon in Vite/Webpack builds
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Vivid primary-coloured marker
const primaryIcon = new L.Icon({
  iconUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 48" width="36" height="48">
      <defs>
        <radialGradient id="g" cx="50%" cy="35%" r="60%">
          <stop offset="0%" stop-color="#26a335"/>
          <stop offset="100%" stop-color="#0d631b"/>
        </radialGradient>
      </defs>
      <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30S36 31.5 36 18C36 8.06 27.94 0 18 0z" fill="url(#g)"/>
      <circle cx="18" cy="18" r="7" fill="white" opacity="0.92"/>
    </svg>
  `)}`,
  iconSize: [36, 48],
  iconAnchor: [18, 48],
  popupAnchor: [0, -48],
})

interface Coords { lat: number; lng: number }

interface LocationPickerProps {
  value: { coords: Coords; address: string }
  onChange: (coords: Coords, address: string) => void
}

// ── Nominatim helpers ──────────────────────────────────────────────────────────
const NOMINATIM = 'https://nominatim.openstreetmap.org'

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const res = await fetch(
    `${NOMINATIM}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
    { headers: { 'Accept-Language': 'en' } }
  )
  const data = await res.json()
  return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

async function searchAddress(query: string): Promise<Array<{ display_name: string; lat: string; lon: string }>> {
  if (query.length < 3) return []
  const res = await fetch(
    `${NOMINATIM}/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1&countrycodes=in`,
    { headers: { 'Accept-Language': 'en' } }
  )
  return res.json()
}

// ── Map interaction hook ───────────────────────────────────────────────────────
function MapClickHandler({ onMapClick }: { onMapClick: (coords: Coords) => void }) {
  useMapEvents({
    click(e) { onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng }) },
  })
  return null
}

function MapFlyTo({ coords }: { coords: Coords }) {
  const map = useMap()
  useEffect(() => { map.flyTo([coords.lat, coords.lng], 15, { duration: 1.2 }) }, [coords, map])
  return null
}

// ── Main component ─────────────────────────────────────────────────────────────
export const LocationPicker: React.FC<LocationPickerProps> = ({ value, onChange }) => {
  const [coords, setCoords]         = useState<Coords>(value.coords)
  const [address, setAddress]       = useState(value.address)
  const [searchQuery, setSearchQuery] = useState(value.address)
  const [suggestions, setSuggestions] = useState<Array<{ display_name: string; lat: string; lon: string }>>([])
  const [loadingGps, setLoadingGps] = useState(false)
  const [loadingRev, setLoadingRev] = useState(false)
  const [loadingSug, setLoadingSug] = useState(false)
  const [gpsError, setGpsError]     = useState('')
  const [confirmed, setConfirmed]   = useState(false)
  const [editMode, setEditMode]     = useState(true)
  const [flyTarget, setFlyTarget]   = useState<Coords>(value.coords)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suggestRef  = useRef<HTMLDivElement>(null)

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setSuggestions([])
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const applyCoords = useCallback(async (c: Coords) => {
    setCoords(c)
    setFlyTarget(c)
    setLoadingRev(true)
    try {
      const addr = await reverseGeocode(c.lat, c.lng)
      setAddress(addr)
      setSearchQuery(addr)
      onChange(c, addr)
    } finally {
      setLoadingRev(false)
    }
  }, [onChange])

  // GPS
  const handleGps = () => {
    if (!navigator.geolocation) { setGpsError('Geolocation not supported by your browser.'); return }
    setLoadingGps(true); setGpsError('')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLoadingGps(false)
        applyCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      err => {
        setLoadingGps(false)
        setGpsError(
          err.code === 1 ? 'Location access denied. Please allow location in your browser.' :
          err.code === 2 ? 'Location unavailable. Try again.' :
          'Location request timed out.'
        )
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Search input debounce
  const handleSearchInput = (q: string) => {
    setSearchQuery(q)
    setConfirmed(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoadingSug(true)
      const results = await searchAddress(q)
      setSuggestions(results)
      setLoadingSug(false)
    }, 400)
  }

  const selectSuggestion = (item: { display_name: string; lat: string; lon: string }) => {
    const c: Coords = { lat: parseFloat(item.lat), lng: parseFloat(item.lon) }
    setCoords(c); setFlyTarget(c)
    setAddress(item.display_name)
    setSearchQuery(item.display_name)
    setSuggestions([])
    onChange(c, item.display_name)
  }

  const handleMapPinDrop = (c: Coords) => { applyCoords(c) }

  const handleConfirm = () => {
    setConfirmed(true)
    setEditMode(false)
    onChange(coords, address)
  }

  const handleEdit = () => {
    setConfirmed(false)
    setEditMode(true)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* ── Header row ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label className="form-label" style={{ margin: 0 }}>
          Pickup Location
        </label>
        {confirmed && (
          <button
            type="button"
            onClick={handleEdit}
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--primary)', padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
            Edit
          </button>
        )}
      </div>

      {/* ── Confirmed state ── */}
      {confirmed ? (
        <div style={{
          background: 'color-mix(in srgb, var(--primary) 8%, transparent)',
          border: '1.5px solid color-mix(in srgb, var(--primary) 30%, transparent)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.25rem',
          display: 'flex', alignItems: 'flex-start', gap: '0.75rem'
        }}>
          <span className="material-symbols-outlined icon-filled" style={{ color: 'var(--primary)', fontSize: 22, flexShrink: 0, marginTop: 2 }}>
            location_on
          </span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--on-surface)', marginBottom: '0.25rem' }}>
              Location Confirmed ✓
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
              {address}
            </div>
            <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--outline)', marginTop: '0.375rem' }}>
              {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

          {/* ── GPS button ── */}
          <button
            id="use-current-location-btn"
            type="button"
            onClick={handleGps}
            disabled={loadingGps}
            className="btn btn-outline"
            style={{
              width: '100%',
              background: loadingGps
                ? 'color-mix(in srgb, var(--primary) 6%, transparent)'
                : 'color-mix(in srgb, var(--primary) 4%, transparent)',
              justifyContent: 'center',
              gap: '0.625rem',
              padding: '0.875rem',
            }}
          >
            {loadingGps ? (
              <>
                <div style={{ width: 18, height: 18, border: '2.5px solid color-mix(in srgb, var(--primary) 30%, transparent)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} className="animate-spin" />
                Detecting your location…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined icon-filled" style={{ fontSize: 20, color: 'var(--primary)' }}>
                  my_location
                </span>
                Use Current Location
              </>
            )}
          </button>

          {gpsError && (
            <div style={{
              background: 'var(--error-container)', color: 'var(--on-error-container)',
              padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem',
              display: 'flex', alignItems: 'flex-start', gap: '0.5rem'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>error</span>
              {gpsError}
            </div>
          )}

          {/* ── Divider ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--on-surface-variant)', fontSize: '0.75rem' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--surface-container-high)' }} />
            or search manually
            <div style={{ flex: 1, height: 1, background: 'var(--surface-container-high)' }} />
          </div>

          {/* ── Search box with autocomplete ── */}
          <div ref={suggestRef} style={{ position: 'relative' }}>
            <div className="input-with-icon">
              <span className="material-symbols-outlined input-icon">search</span>
              <input
                id="location-search-input"
                className="form-input"
                placeholder="Search address, landmark, city…"
                value={searchQuery}
                onChange={e => handleSearchInput(e.target.value)}
                autoComplete="off"
                style={{ paddingRight: loadingSug ? '2.75rem' : '1rem' }}
              />
              {loadingSug && (
                <div style={{
                  position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                  width: 18, height: 18, border: '2px solid var(--outline-variant)', borderTopColor: 'var(--primary)',
                  borderRadius: '50%'
                }} className="animate-spin" />
              )}
            </div>

            {/* Suggestion drop-down */}
            {suggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 500,
                background: 'var(--surface-container-lowest)',
                border: '1px solid color-mix(in srgb, var(--outline-variant) 60%, transparent)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-md)',
                overflow: 'hidden'
              }}>
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectSuggestion(s)}
                    style={{
                      width: '100%', textAlign: 'left', background: 'none', border: 'none',
                      padding: '0.75rem 1rem',
                      display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
                      cursor: 'pointer', borderBottom: i < suggestions.length - 1 ? '1px solid var(--surface-container)' : 'none',
                      transition: 'background var(--transition-fast)'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-container-low)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--primary)', flexShrink: 0, marginTop: 2 }}>
                      location_on
                    </span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface)', lineHeight: 1.5 }}>
                      {s.display_name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Map ── */}
          <div style={{ position: 'relative' }}>
            {/* Map hint badge */}
            <div style={{
              position: 'absolute', top: '0.75rem', left: '50%', transform: 'translateX(-50%)',
              zIndex: 400, background: 'rgba(252,249,243,0.92)', backdropFilter: 'blur(10px)',
              padding: '0.375rem 0.875rem', borderRadius: 'var(--radius-full)',
              border: '1px solid rgba(255,255,255,0.7)',
              fontSize: '0.7rem', fontWeight: 600, color: 'var(--on-surface-variant)',
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              pointerEvents: 'none', boxShadow: 'var(--shadow-sm)',
              whiteSpace: 'nowrap'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--primary)' }}>touch_app</span>
              Tap anywhere on the map to drop a pin
            </div>

            <div className="map-container" style={{ height: 320, borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
              <MapContainer
                center={[coords.lat, coords.lng]}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
                attributionControl={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="© OpenStreetMap contributors"
                />
                <Marker position={[coords.lat, coords.lng]} icon={primaryIcon} />
                <MapClickHandler onMapClick={handleMapPinDrop} />
                <MapFlyTo coords={flyTarget} />
              </MapContainer>
            </div>

            {/* Reverse geocode loader overlay */}
            {loadingRev && (
              <div style={{
                position: 'absolute', bottom: '0.75rem', left: '50%', transform: 'translateX(-50%)',
                zIndex: 400, background: 'rgba(252,249,243,0.95)', backdropFilter: 'blur(10px)',
                padding: '0.375rem 1rem', borderRadius: 'var(--radius-full)',
                border: '1px solid rgba(255,255,255,0.7)',
                fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div style={{ width: 14, height: 14, border: '2px solid color-mix(in srgb, var(--primary) 30%, transparent)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} className="animate-spin" />
                Reading address…
              </div>
            )}
          </div>

          {/* ── Resolved address preview ── */}
          {address && (
            <div style={{
              background: 'var(--surface-container-low)',
              borderRadius: 'var(--radius-md)',
              padding: '0.875rem 1rem',
              display: 'flex', alignItems: 'flex-start', gap: '0.625rem'
            }}>
              <span className="material-symbols-outlined icon-filled" style={{ fontSize: 18, color: 'var(--primary)', flexShrink: 0, marginTop: 2 }}>
                pin_drop
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>
                  Selected Address
                </div>
                {/* Editable address field */}
                <input
                  id="location-address-edit"
                  className="form-input"
                  value={address}
                  onChange={e => { setAddress(e.target.value); onChange(coords, e.target.value) }}
                  style={{
                    background: 'transparent', border: '1px dashed color-mix(in srgb, var(--outline-variant) 60%, transparent)',
                    padding: '0.375rem 0.5rem', fontSize: '0.8125rem', borderRadius: 'var(--radius-sm)'
                  }}
                />
                <div style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', color: 'var(--outline)', marginTop: '0.25rem' }}>
                  {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                </div>
              </div>
            </div>
          )}

          {/* ── Confirm button ── */}
          <button
            id="confirm-location-btn"
            type="button"
            onClick={handleConfirm}
            disabled={!address}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', gap: '0.625rem' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>check_circle</span>
            Confirm This Location
          </button>
        </div>
      )}
    </div>
  )
}
