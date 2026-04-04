import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Augment L type for heatLayer
declare module 'leaflet' {
  function heatLayer(latlngs: [number, number, number][], options?: any): any
}

// Load leaflet.heat once via script tag (avoids Vite ESM/UMD issues)
function ensureHeatPlugin(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof (L as any).heatLayer === 'function') { resolve(); return }
    const existing = document.querySelector('#leaflet-heat-script')
    if (existing) { existing.addEventListener('load', () => resolve()); return }
    const s = document.createElement('script')
    s.id = 'leaflet-heat-script'
    s.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js'
    s.onload = () => resolve()
    document.head.appendChild(s)
  })
}

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

/* ── City Data ──────────────────────────────────────────────────────────── */
interface CityData {
  name: string
  state: string
  lat: number
  lng: number
  tons: number        // tons/month donated
  ngos: number
  donors: number
  rank: number
  trend: number       // % change
  intensity: number   // 0-1 for heatmap
}

const CITIES: CityData[] = [
  { name: 'Mumbai',    state: 'Maharashtra', lat: 19.076, lng: 72.877, tons: 12.4, ngos: 28, donors: 342, rank: 1, trend: 14.2, intensity: 1.0 },
  { name: 'Delhi NCR', state: 'Delhi',       lat: 28.704, lng: 77.102, tons: 10.8, ngos: 24, donors: 298, rank: 2, trend: 8.7,  intensity: 0.87 },
  { name: 'Bengaluru', state: 'Karnataka',   lat: 12.972, lng: 77.594, tons: 9.2,  ngos: 19, donors: 241, rank: 3, trend: 21.3, intensity: 0.74 },
  { name: 'Hyderabad', state: 'Telangana',   lat: 17.385, lng: 78.486, tons: 7.5,  ngos: 15, donors: 187, rank: 4, trend: -2.1, intensity: 0.60 },
  { name: 'Kolkata',   state: 'West Bengal', lat: 22.572, lng: 88.363, tons: 6.1,  ngos: 14, donors: 163, rank: 5, trend: 5.4,  intensity: 0.49 },
  { name: 'Chennai',   state: 'Tamil Nadu',  lat: 13.082, lng: 80.270, tons: 5.4,  ngos: 12, donors: 139, rank: 6, trend: 11.8, intensity: 0.44 },
  { name: 'Pune',      state: 'Maharashtra', lat: 18.520, lng: 73.856, tons: 4.8,  ngos: 10, donors: 121, rank: 7, trend: 7.3,  intensity: 0.39 },
  { name: 'Ahmedabad', state: 'Gujarat',     lat: 23.033, lng: 72.621, tons: 4.2,  ngos: 9,  donors: 108, rank: 8, trend: 3.9,  intensity: 0.34 },
  { name: 'Jaipur',    state: 'Rajasthan',   lat: 26.912, lng: 75.787, tons: 3.6,  ngos: 8,  donors: 91,  rank: 9, trend: 9.1,  intensity: 0.29 },
  { name: 'Lucknow',   state: 'Uttar Pradesh',lat: 26.850, lng: 80.946, tons: 3.1,ngos: 7,  donors: 78,  rank:10, trend: 6.5,  intensity: 0.25 },
  { name: 'Bhopal',    state: 'M.P.',        lat: 23.259, lng: 77.412, tons: 2.4,  ngos: 5,  donors: 61,  rank:11, trend: 14.7, intensity: 0.19 },
  { name: 'Indore',    state: 'M.P.',        lat: 22.719, lng: 75.857, tons: 2.1,  ngos: 5,  donors: 54,  rank:12, trend: 18.2, intensity: 0.17 },
  { name: 'Nagpur',    state: 'Maharashtra', lat: 21.146, lng: 79.088, tons: 1.9,  ngos: 4,  donors: 48,  rank:13, trend: 4.6,  intensity: 0.15 },
  { name: 'Patna',     state: 'Bihar',       lat: 25.594, lng: 85.137, tons: 1.6,  ngos: 4,  donors: 40,  rank:14, trend: 22.1, intensity: 0.13 },
  { name: 'Chandigarh',state: 'Punjab',      lat: 30.733, lng: 76.779, tons: 1.4,  ngos: 3,  donors: 35,  rank:15, trend: -0.8, intensity: 0.11 },
]

// Extra heatmap-only points to thicken distribution across India
const EXTRA_HEAT_POINTS: [number, number, number][] = [
  [21.1, 81.6, 0.22], [25.1, 85.3, 0.18], [26.2, 92.8, 0.14], [27.6, 74.9, 0.12],
  [23.8, 91.3, 0.11], [15.3, 75.1, 0.20], [11.9, 79.8, 0.16], [9.9,  76.3, 0.14],
  [20.3, 85.9, 0.13], [24.5, 87.1, 0.10], [29.8, 77.9, 0.15], [31.5, 74.3, 0.09],
  [17.7, 83.2, 0.17], [16.5, 80.6, 0.12], [19.9, 73.8, 0.20], [18.1, 74.5, 0.15],
]



/* ── Helpers ────────────────────────────────────────────────────────────── */
function interpolate(a: number, b: number, t: number) { return a + (b - a) * t }

function cityColor(intensity: number) {
  // green → amber → red based on donation volume
  if (intensity > 0.7) return '#0d631b'
  if (intensity > 0.4) return '#9e4200'
  return '#1565C0'
}

function miniBar(intensity: number) {
  const w = Math.round(intensity * 100)
  return `<div style="height:4px;background:#e0e0e0;border-radius:2px;margin-top:4px">
    <div style="height:4px;width:${w}%;background:${cityColor(intensity)};border-radius:2px;transition:width 0.4s"></div>
  </div>`
}

/* ── Component ──────────────────────────────────────────────────────────── */
interface Props {
  stats?: any
}

export const IndiaHeatMap: React.FC<Props> = ({ stats }) => {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const heatLayerRef = useRef<any>(null)

  const [selectedCity, setSelectedCity] = useState<CityData | null>(null)
  const [hoveredCity, setHoveredCity] = useState<string | null>(null)
  const [mapLayer, setMapLayer] = useState<'light' | 'dark' | 'satellite'>('light')
  const [showHeat, setShowHeat] = useState(true)
  const [liveTime, setLiveTime] = useState(new Date())

  // Tick live clock
  useEffect(() => {
    const t = setInterval(() => setLiveTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Build / rebuild map
  useEffect(() => {
    if (!containerRef.current) return
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }

    /* Tile layers */
    const TILES: Record<string, L.TileLayer> = {
      light: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CartoCDN',
        subdomains: 'abcd', maxZoom: 19
      }),
      dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CartoCDN',
        subdomains: 'abcd', maxZoom: 19
      }),
      satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles © Esri', maxZoom: 19
      }),
    }

    const map = L.map(containerRef.current!, {
      center: [22, 82],
      zoom: 5,
      minZoom: 4,
      maxZoom: 12,
      zoomControl: false,
      scrollWheelZoom: true,
    })
    mapRef.current = map

    TILES[mapLayer].addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    /* ── Heatmap ── */
    const heatPoints: [number, number, number][] = [
      ...CITIES.map(c => [c.lat, c.lng, c.intensity] as [number, number, number]),
      ...EXTRA_HEAT_POINTS,
    ]
    if (showHeat) {
      ensureHeatPlugin().then(() => {
        if (!mapRef.current) return
        const heat = (L as any).heatLayer(heatPoints, {
          radius: 55,
          blur: 40,
          maxZoom: 10,
          max: 1.0,
          gradient: {
            0.00: '#1565C0',
            0.25: '#2E7D32',
            0.50: '#7CB342',
            0.70: '#F9A825',
            0.85: '#E65100',
            1.00: '#B71C1C',
          },
        })
        heat.addTo(mapRef.current)
        heatLayerRef.current = heat
      })
    }

    /* ── City Markers ── */
    CITIES.forEach(city => {
      const size = 8 + city.intensity * 18
      const color = cityColor(city.intensity)
      const icon = L.divIcon({
        className: '',
        html: `
          <div style="
            width:${size}px;height:${size}px;
            background:${color};
            border:2.5px solid white;
            border-radius:50%;
            box-shadow:0 0 0 ${Math.round(city.intensity * 8)}px ${color}33,
                       0 2px 8px rgba(0,0,0,0.28);
            cursor:pointer;
            transition:transform 0.2s;
          "></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      })

      const marker = L.marker([city.lat, city.lng], { icon })
        .addTo(map)
        .bindTooltip(`
          <div style="font-family:system-ui;min-width:180px">
            <div style="font-weight:800;font-size:13px;margin-bottom:4px;color:${color}">
              ${city.name} <span style="font-weight:400;color:#666">${city.state}</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:11px">
              <span>🍛 <b>${city.tons} T/mo</b></span>
              <span>🏠 <b>${city.ngos} NGOs</b></span>
              <span>🙋 <b>${city.donors} donors</b></span>
              <span>${city.trend >= 0 ? '📈' : '📉'} <b style="color:${city.trend >= 0 ? '#2E7D32' : '#C62828'}">${city.trend > 0 ? '+' : ''}${city.trend}%</b></span>
            </div>
            ${miniBar(city.intensity)}
          </div>`, {
          className: 'city-tooltip',
          direction: 'top',
          offset: [0, -size / 2 - 2],
          opacity: 1,
        })
        .on('click', () => setSelectedCity(city))

      marker.on('mouseover', () => setHoveredCity(city.name))
      marker.on('mouseout', () => setHoveredCity(null))
    })



    /* ── State boundary labels (text markers) ── */
    const regionLabels: { lat: number; lng: number; text: string }[] = [
      { lat: 24.5, lng: 73.7, text: 'Rajasthan' },
      { lat: 20.5, lng: 78.5, text: 'Maharashtra' },
      { lat: 15.0, lng: 76.0, text: 'Karnataka' },
      { lat: 25.0, lng: 83.0, text: 'UP / Bihar' },
      { lat: 21.0, lng: 86.0, text: 'Odisha' },
    ]
    regionLabels.forEach(r => {
      L.marker([r.lat, r.lng], {
        icon: L.divIcon({
          className: '',
          html: `<span style="font-size:9px;font-weight:700;color:rgba(0,0,0,0.28);letter-spacing:.08em;white-space:nowrap;pointer-events:none">${r.text.toUpperCase()}</span>`,
          iconSize: [80, 14],
          iconAnchor: [40, 7],
        }),
        interactive: false,
        keyboard: false,
      }).addTo(map)
    })

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLayer, showHeat])

  const topCities = [...CITIES].sort((a, b) => b.tons - a.tons).slice(0, 5)

  return (
    <div style={{ display: 'flex', height: 440, borderRadius: 'var(--radius-3xl)', overflow: 'hidden', position: 'relative' }}>

      {/* ── Map Container ── */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

        {/* Top-left: live badge */}
        <div style={{
          position: 'absolute', top: 14, left: 14, zIndex: 900,
          background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(10px)',
          borderRadius: 'var(--radius-full)', padding: '6px 14px',
          border: '1px solid rgba(255,255,255,0.7)',
          display: 'flex', alignItems: 'center', gap: 7,
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)'
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', background: '#2E7D32',
            display: 'inline-block', animation: 'pulse 1.5s infinite'
          }} />
          <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', color: '#2E7D32' }}>
            LIVE · National Redistribution Network
          </span>
          <span style={{ fontSize: '0.6rem', fontFamily: 'monospace', color: '#999', marginLeft: 4 }}>
            {liveTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        {/* Layer controls */}
        <div style={{
          position: 'absolute', top: 14, right: 14, zIndex: 900,
          display: 'flex', flexDirection: 'column', gap: 6
        }}>
          {/* Tile switcher */}
          <div style={{ background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(10px)', borderRadius: 'var(--radius-md)', padding: '4px', boxShadow: '0 2px 12px rgba(0,0,0,0.12)', display: 'flex', gap: 2 }}>
            {(['light', 'dark', 'satellite'] as const).map(l => (
              <button key={l} onClick={() => setMapLayer(l)} style={{
                padding: '3px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.625rem', fontWeight: 700,
                background: mapLayer === l ? '#2E7D32' : 'transparent',
                color: mapLayer === l ? 'white' : '#666',
                transition: 'all 0.15s', textTransform: 'capitalize'
              }}>{l}</button>
            ))}
          </div>
          {/* Heatmap toggle only */}
          <div style={{ background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(10px)', borderRadius: 'var(--radius-md)', padding: '6px 10px', boxShadow: '0 2px 12px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.6875rem', fontWeight: 600, color: '#444', userSelect: 'none' }}>
              <span style={{
                width: 28, height: 15, borderRadius: 8, background: showHeat ? '#E65100' : '#ccc',
                display: 'inline-flex', alignItems: 'center', padding: '0 2px', transition: 'background 0.2s',
                position: 'relative', flexShrink: 0,
              }} onClick={() => setShowHeat(v => !v)}>
                <span style={{
                  width: 11, height: 11, borderRadius: '50%', background: 'white',
                  marginLeft: showHeat ? 'auto' : 0, transition: 'margin 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
              </span>
              Heatmap
            </label>
          </div>
        </div>

        {/* Legend */}
        <div style={{
          position: 'absolute', bottom: 14, left: 14, zIndex: 900,
          background: 'rgba(255,255,255,0.93)', backdropFilter: 'blur(10px)',
          borderRadius: 'var(--radius-md)', padding: '8px 12px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)', fontSize: '0.625rem', fontWeight: 600, color: '#555'
        }}>
          <div style={{ marginBottom: 5, fontWeight: 700, color: '#333', fontSize: '0.6875rem' }}>Donation Intensity</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span>Low</span>
            <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', width: 100, margin: '0 4px' }}>
              {['#1565C0','#2E7D32','#7CB342','#F9A825','#E65100','#B71C1C'].map((c, i) => (
                <div key={i} style={{ flex: 1, background: c }} />
              ))}
            </div>
            <span>High</span>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ fontSize: 11 }}>🟢</span> Active Donor
            </span>
          </div>
        </div>

        {/* City detail popup (when clicked) */}
        {selectedCity && (
          <div style={{
            position: 'absolute', bottom: 14, right: 14, zIndex: 1000,
            background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)',
            borderRadius: 'var(--radius-xl)', padding: '1rem 1.125rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            width: 220, borderTop: `4px solid ${cityColor(selectedCity.intensity)}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: cityColor(selectedCity.intensity) }}>{selectedCity.name}</div>
                <div style={{ fontSize: '0.6875rem', color: '#888' }}>{selectedCity.state} · Rank #{selectedCity.rank}</div>
              </div>
              <button onClick={() => setSelectedCity(null)} style={{
                border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: '#999', lineHeight: 1, padding: 2
              }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', fontSize: '0.8rem' }}>
              {[
                { label: 'Monthly', value: `${selectedCity.tons} T/mo`, icon: '🍛' },
                { label: 'Trend', value: `${selectedCity.trend > 0 ? '+' : ''}${selectedCity.trend}%`, icon: selectedCity.trend >= 0 ? '📈' : '📉', color: selectedCity.trend >= 0 ? '#2E7D32' : '#C62828' },
                { label: 'NGOs', value: selectedCity.ngos, icon: '🏠' },
                { label: 'Donors', value: selectedCity.donors, icon: '🙋' },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: '0.625rem', color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>{item.label}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: (item as any).color || '#222' }}>{item.icon} {item.value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, height: 6, background: '#eee', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.round(selectedCity.intensity * 100)}%`, background: cityColor(selectedCity.intensity), borderRadius: 3 }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Right Stats Panel ── */}
      <div style={{
        width: 272, padding: '1.25rem 1rem', background: 'var(--surface-container-low)',
        borderLeft: '1px solid var(--surface-container-high)',
        display: 'flex', flexDirection: 'column', gap: '0.875rem', overflowY: 'auto'
      }}>
        <div>
          <h4 style={{ fontFamily: 'var(--font-headline)', margin: '0 0 2px', fontSize: '0.9375rem' }}>Regional Density</h4>
          <div style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)' }}>Top donation clusters · Click map markers for details</div>
        </div>

        {/* Ranked list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {topCities.map(city => {
            const color = cityColor(city.intensity)
            const isHovered = hoveredCity === city.name
            const isSelected = selectedCity?.name === city.name
            return (
              <div key={city.name} style={{
                display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0.625rem',
                borderRadius: 'var(--radius-md)', cursor: 'pointer',
                background: isSelected ? `color-mix(in srgb, ${color} 10%, transparent)` : isHovered ? 'var(--surface-container)' : 'transparent',
                border: isSelected ? `1px solid color-mix(in srgb, ${color} 25%, transparent)` : '1px solid transparent',
                transition: 'all 0.15s'
              }}
              onClick={() => setSelectedCity(city)}>
                <div style={{ width: 4, height: 36, background: color, borderRadius: 'var(--radius-full)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{city.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--primary)', flexShrink: 0, marginLeft: 4 }}>#{city.rank}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{city.tons} Tons / Mo</span>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: city.trend >= 0 ? '#2E7D32' : '#C62828' }}>
                      {city.trend > 0 ? '↑' : '↓'} {Math.abs(city.trend)}%
                    </span>
                  </div>
                  {/* Mini progress bar */}
                  <div style={{ height: 3, background: 'var(--surface-container-high)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.round(city.intensity * 100)}%`, background: color, borderRadius: 2, transition: 'width 0.5s' }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* AI Insight */}
        <div style={{ marginTop: 'auto', background: 'color-mix(in srgb, var(--primary) 8%, transparent)', padding: '0.75rem 0.875rem', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>🤖 AI Insight</div>
          <p style={{ fontSize: '0.75rem', color: 'color-mix(in srgb, var(--primary) 70%, transparent)', fontStyle: 'italic', lineHeight: 1.4, margin: 0 }}>
            "West Bengal cluster showing high surplus; consider redistributing to Odisha border zones. Mumbai NGOs at 94% capacity."
          </p>
        </div>
      </div>

      {/* Tooltip CSS injection */}
      <style>{`
        .city-tooltip {
          background: rgba(255,255,255,0.97) !important;
          border: 1px solid rgba(0,0,0,0.1) !important;
          border-radius: 10px !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
          padding: 10px 12px !important;
          font-size: 12px !important;
          pointer-events: none !important;
        }
        .city-tooltip::before { display:none !important; }
        .leaflet-tooltip-top.city-tooltip::before { display:none !important; }
      `}</style>
    </div>
  )
}
