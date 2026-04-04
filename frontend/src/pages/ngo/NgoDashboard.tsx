import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/components/shared/Sidebar'
import { StatusBadge, LoadingSpinner } from '@/components/shared/UiKit'
import { RouteNavigationMap } from '@/components/shared/RouteNavigationMap'
import { useAuthStore } from '@/store/authStore'
import api from '@/api/client'

const ngoNav = [
  { icon: 'dashboard', label: 'Dashboard', path: '/ngo' },
  { icon: 'fastfood', label: 'Available Donations', path: '/ngo/donations' },
  { icon: 'pending_actions', label: 'My Requests', path: '/ngo/requests' },
  { icon: 'task_alt', label: 'Accepted', path: '/ngo/accepted' },
  { icon: 'local_shipping', label: 'Tracking', path: '/ngo/tracking' },
]

/* ── Route Modal ───────────────────────────────────────────────────────── */
interface RouteModalProps {
  delivery: any
  trackData: any | null
  loadingTrack: boolean
  onClose: () => void
}

const RouteModal: React.FC<RouteModalProps> = ({ delivery, trackData, loadingTrack, onClose }) => {
  // Derive coordinates
  const routeData = trackData?.delivery?.route_data
  const donorCoords = trackData?.donor_coordinates ?? routeData?.donor_location ?? null
  const ngoCoords   = trackData?.ngo_coordinates   ?? routeData?.ngo_location   ?? null
  const hasRoute    = donorCoords && ngoCoords

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', animation: 'fadeIn 0.2s ease'
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      <div style={{
        width: '100%', maxWidth: 860, maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
        borderRadius: 'var(--radius-3xl)', overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
        animation: 'slideUp 0.25s ease',
      }}>

        {/* Modal header */}
        <div style={{
          background: 'linear-gradient(135deg, #0d631b 0%, #1565C0 100%)',
          padding: '1rem 1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%',
              background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(4px)',
              border: '1.5px solid rgba(255,255,255,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <span className="material-symbols-outlined icon-filled" style={{ fontSize: 22, color: 'white' }}>alt_route</span>
            </div>
            <div>
              <div style={{ fontWeight: 800, color: 'white', fontSize: '1rem', fontFamily: 'var(--font-headline)' }}>
                Delivery Route
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.78)', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span>🏠 {delivery.donor_name || 'Donor'}</span>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>→</span>
                <span>🏛️ {delivery.ngo_name || 'NGO'}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            {/* Status badge */}
            <div style={{
              background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(4px)',
              padding: '4px 14px', borderRadius: 'var(--radius-full)',
              fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', color: 'white',
              textTransform: 'uppercase'
            }}>
              {delivery.status?.replace('_', ' ')}
            </div>

            {/* Delivery info pills */}
            {delivery.estimated_time && delivery.status === 'in_transit' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.15)', borderRadius: 'var(--radius-full)', padding: '4px 10px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 13, color: 'white' }}>timer</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>~{delivery.estimated_time} min</span>
              </div>
            )}

            {/* Close */}
            <button onClick={onClose} style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)',
              color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s'
            }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
               onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-container-lowest)' }}>
          {loadingTrack ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem' }}>
              <div style={{ width: 40, height: 40, border: '3px solid #e0e0e0', borderTopColor: '#1565C0', borderRadius: '50%' }} className="animate-spin" />
              <span style={{ color: 'var(--on-surface-variant)', fontSize: '0.9rem' }}>Loading route data…</span>
            </div>
          ) : !hasRoute ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 52, color: 'var(--outline-variant)', display: 'block', marginBottom: '1rem' }}>map_search</span>
              <h4 style={{ margin: '0 0 0.5rem', color: 'var(--on-surface)' }}>Route Not Available Yet</h4>
              <p style={{ margin: 0, color: 'var(--on-surface-variant)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                The route will be calculated once the NGO accepts the donation.<br />
                Current status: <strong>{delivery.status}</strong>
              </p>
            </div>
          ) : (
            <div style={{ padding: '1.25rem' }}>

              {/* Delivery summary bar */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '0.75rem', marginBottom: '1.25rem'
              }}>
                {[
                  {
                    label: 'Pickup',
                    value: delivery.donor_name || 'Donor',
                    icon: 'home',
                    color: '#0d631b',
                    bg: 'rgba(13,99,27,0.08)'
                  },
                  {
                    label: 'Drop-off',
                    value: delivery.ngo_name || 'NGO',
                    icon: 'flag',
                    color: '#1565C0',
                    bg: 'rgba(21,101,192,0.08)'
                  },
                  {
                    label: 'Distance',
                    value: routeData?.distance_km ? `${routeData.distance_km} km` : 'Calculating…',
                    icon: 'straighten',
                    color: '#9e4200',
                    bg: 'rgba(158,66,0,0.08)'
                  },
                  {
                    label: 'ETA',
                    value: delivery.estimated_time ? `~${delivery.estimated_time} min` : trackData?.delivery?.estimated_time ? `~${trackData.delivery.estimated_time} min` : '—',
                    icon: 'schedule',
                    color: '#2E7D32',
                    bg: 'rgba(46,125,50,0.08)'
                  },
                ].map(item => (
                  <div key={item.label} style={{
                    background: item.bg, borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.625rem',
                    border: `1px solid color-mix(in srgb, ${item.color} 20%, transparent)`
                  }}>
                    <span className="material-symbols-outlined icon-filled" style={{ fontSize: 20, color: item.color, flexShrink: 0 }}>
                      {item.icon}
                    </span>
                    <div>
                      <div style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: item.color }}>
                        {item.label}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Delivery Progress ── */}
              {(() => {
                const STAGES = [
                  { key: 'pending',    label: 'Submitted',  icon: 'volunteer_activism', color: '#0d631b' },
                  { key: 'matched',    label: 'Matched',    icon: 'handshake',          color: '#1565C0' },
                  { key: 'in_transit', label: 'In Transit', icon: 'local_shipping',     color: '#9e4200' },
                  { key: 'delivered',  label: 'Delivered',  icon: 'check_circle',       color: '#2E7D32' },
                ]
                const STATUS_ORDER: Record<string, number> = { pending: 0, matched: 1, in_transit: 2, delivered: 3 }
                const currentStatus = trackData?.status ?? delivery.status ?? 'pending'
                const activeStep    = STATUS_ORDER[currentStatus] ?? 0
                const progressPct   = Math.round(((activeStep + 1) / 4) * 100)
                const isDelivered   = currentStatus === 'delivered'

                return (
                  <div style={{
                    background: 'var(--surface-container-lowest)',
                    border: '1px solid var(--outline-variant)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '1.125rem 1.375rem',
                    marginBottom: '1.25rem',
                  }}>
                    {/* Header row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="material-symbols-outlined icon-filled" style={{ fontSize: 18, color: 'var(--primary)' }}>timeline</span>
                        <span style={{ fontWeight: 700, fontSize: '0.9375rem', fontFamily: 'var(--font-headline)' }}>Delivery Progress</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {!isDelivered && currentStatus === 'in_transit' && (
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#9e4200', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                        )}
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 800,
                          color: isDelivered ? '#2E7D32' : 'var(--primary)'
                        }}>{progressPct}%</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{ height: 8, background: 'var(--surface-container-high)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: '1.125rem' }}>
                      <div style={{
                        height: '100%',
                        width: `${progressPct}%`,
                        background: isDelivered
                          ? 'linear-gradient(90deg, #2E7D32, #66BB6A)'
                          : 'linear-gradient(90deg, #0d631b, #9e4200)',
                        borderRadius: 'var(--radius-full)',
                        transition: 'width 0.9s cubic-bezier(0.34,1.56,0.64,1)',
                        boxShadow: '0 0 10px rgba(13,99,27,0.35)',
                      }} />
                    </div>

                    {/* Stage steps */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                      {/* Connector line */}
                      <div style={{
                        position: 'absolute', top: 18, left: '12%', right: '12%', height: 2,
                        background: 'var(--surface-container-high)', zIndex: 0
                      }} />

                      {STAGES.map((stage, i) => {
                        const done   = i < activeStep
                        const active = i === activeStep
                        return (
                          <div key={stage.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1, position: 'relative', zIndex: 1 }}>
                            {/* Circle */}
                            <div style={{
                              width: 38, height: 38, borderRadius: '50%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: done
                                ? stage.color
                                : active
                                  ? `color-mix(in srgb, ${stage.color} 14%, white)`
                                  : 'var(--surface-container-high)',
                              border: active
                                ? `2.5px solid ${stage.color}`
                                : done
                                  ? `2.5px solid ${stage.color}`
                                  : '2.5px solid var(--outline-variant)',
                              boxShadow: active ? `0 0 0 5px color-mix(in srgb, ${stage.color} 15%, transparent)` : 'none',
                              transition: 'all 0.4s',
                            }}>
                              {done ? (
                                <span className="material-symbols-outlined icon-filled" style={{ fontSize: 17, color: 'white' }}>check</span>
                              ) : (
                                <span className={`material-symbols-outlined ${active ? 'icon-filled' : ''}`}
                                  style={{ fontSize: 17, color: active ? stage.color : 'var(--outline-variant)' }}>
                                  {stage.icon}
                                </span>
                              )}
                            </div>
                            {/* Label */}
                            <span style={{
                              fontSize: '0.6875rem', fontWeight: active ? 800 : done ? 600 : 500,
                              color: active ? stage.color : done ? 'var(--on-surface)' : 'var(--outline)',
                              textAlign: 'center', whiteSpace: 'nowrap'
                            }}>{stage.label}</span>

                            {/* Timestamp from timeline */}
                            {(() => {
                              const entry = (trackData?.timeline ?? [])[i]
                              if (!entry?.timestamp) return null
                              return (
                                <span style={{ fontSize: '0.5625rem', color: 'var(--on-surface-variant)', fontFamily: 'monospace' }}>
                                  {new Date(entry.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )
                            })()}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              {/* Route Map */}
              <RouteNavigationMap
                donorLocation={donorCoords}
                ngoLocation={ngoCoords}
                donorName={delivery.donor_name || 'Donor'}
                ngoName={delivery.ngo_name || 'NGO'}
                estimatedMinutes={delivery.estimated_time ?? trackData?.delivery?.estimated_time}
                distanceKm={routeData?.distance_km}
                status={delivery.status}
                height={380}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '0.875rem 1.5rem', background: 'var(--surface-container-low)',
          borderTop: '1px solid var(--outline-variant)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0, flexWrap: 'wrap', gap: '0.5rem'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>info</span>
            Route powered by OpenStreetMap · OSRM
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ border: '1px solid var(--outline-variant)' }}>
              Close
            </button>
            {hasRoute && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&origin=${donorCoords.lat},${donorCoords.lng}&destination=${ngoCoords.lat},${ngoCoords.lng}&travelmode=driving`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0 1rem', borderRadius: 'var(--radius-md)', height: '36px',
                  background: '#1a73e8', color: 'white', fontWeight: 700,
                  fontSize: '0.875rem', textDecoration: 'none', border: 'none',
                  boxShadow: '0 2px 8px rgba(26,115,232,0.35)',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1557b0')}
                onMouseLeave={e => (e.currentTarget.style.background = '#1a73e8')}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                Open in Google Maps
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Main Dashboard ────────────────────────────────────────────────────── */
export const NgoDashboard: React.FC = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [available, setAvailable] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Route modal state
  const [modalDelivery, setModalDelivery] = useState<any | null>(null)
  const [trackData, setTrackData] = useState<any | null>(null)
  const [trackLoading, setTrackLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/ngo/deliveries').catch(() => ({ data: [] })),
      api.get('/donations/available?radius=50&sort=urgency').catch(() => ({ data: [] })),
      api.get('/ngo/requests/my').catch(() => ({ data: [] })),
    ]).then(([d, a, r]) => {
      setDeliveries(d.data)
      setAvailable(a.data)
      setRequests(r.data)
    }).finally(() => setLoading(false))
  }, [])

  const openRouteModal = async (delivery: any) => {
    setModalDelivery(delivery)
    setTrackData(null)
    setTrackLoading(true)
    try {
      const res = await api.get(`/donations/${delivery.donation_id}/tracking`)
      setTrackData(res.data)
    } catch {
      setTrackData(null)
    } finally {
      setTrackLoading(false)
    }
  }

  const accepted  = deliveries.filter(d => d.status !== 'delivered')
  const delivered = deliveries.filter(d => d.status === 'delivered')
  const inTransit = deliveries.filter(d => d.status === 'in_transit')
  const openReq   = requests.filter(r => r.status === 'open')

  const stats = [
    { label: 'Available Now', value: available.length, icon: 'fastfood',       color: 'var(--primary)',      bg: 'rgba(13,99,27,0.1)',   action: () => navigate('/ngo/donations') },
    { label: 'In Transit',    value: inTransit.length, icon: 'local_shipping',  color: '#9e4200',             bg: 'rgba(158,66,0,0.1)',   action: () => navigate('/ngo/tracking') },
    { label: 'Delivered',     value: delivered.length, icon: 'check_circle',    color: '#2E7D32',             bg: 'rgba(46,125,50,0.1)',  action: () => navigate('/ngo/accepted') },
    { label: 'Open Requests', value: openReq.length,   icon: 'pending_actions', color: 'var(--admin-accent)', bg: 'rgba(21,101,192,0.1)', action: () => navigate('/ngo/requests') },
  ]

  return (
    <div className="app-layout">
      {/* Route Modal */}
      {modalDelivery && (
        <RouteModal
          delivery={modalDelivery}
          trackData={trackData}
          loadingTrack={trackLoading}
          onClose={() => { setModalDelivery(null); setTrackData(null) }}
        />
      )}

      <Sidebar navItems={ngoNav} ctaLabel="⬆ Raise Request" ctaAction={() => navigate('/ngo/requests')} footerItems={[{ icon: 'settings', label: 'Settings', path: '/ngo/settings' }]} />
      <main className="main-content">

        {/* Header */}
        <header style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ marginBottom: '0.375rem' }}>Welcome back, {user?.name?.split(' ')[0]} 👋</h2>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem' }}>
                Here's your NGO activity overview for today
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => navigate('/ngo/donations')} style={{ gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>fastfood</span>
              Browse Donations
            </button>
          </div>
        </header>

        {loading ? <LoadingSpinner /> : (
          <>
            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {stats.map(s => (
                <div key={s.label} onClick={s.action} className="card" style={{ padding: '1.25rem', cursor: 'pointer', transition: 'all 0.2s', borderLeft: `4px solid ${s.color}` }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'none')}>
                  <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                    <span className="material-symbols-outlined icon-filled" style={{ fontSize: 20, color: s.color }}>{s.icon}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.75rem', color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.25rem', alignItems: 'start' }}>
              {/* Recent Deliveries table */}
              <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0 }}>Recent Deliveries</h4>
                    <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                      Click any row to view route map
                    </p>
                  </div>
                  <button onClick={() => navigate('/ngo/accepted')} className="btn btn-ghost btn-sm" style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 700 }}>View All →</button>
                </div>
                {deliveries.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 40, display: 'block', marginBottom: '0.5rem', color: 'var(--outline-variant)' }}>inbox</span>
                    <p style={{ margin: 0 }}>No deliveries yet — accept a donation to get started</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Donor</th>
                          <th>NGO</th>
                          <th>Status</th>
                          <th>Date</th>
                          <th style={{ textAlign: 'center' }}>Route</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deliveries.slice(0, 6).map(d => (
                          <tr
                            key={d._id}
                            onClick={() => openRouteModal(d)}
                            style={{ cursor: 'pointer', transition: 'background 0.12s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-container-low)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <td style={{ fontWeight: 600 }}>{d.donor_name || '—'}</td>
                            <td style={{ fontWeight: 400, color: 'var(--on-surface-variant)' }}>{d.ngo_name || '—'}</td>
                            <td><StatusBadge status={d.status} /></td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--on-surface-variant)', fontWeight: 400 }}>
                              {d.created_at ? new Date(d.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 3,
                                padding: '3px 10px', borderRadius: 'var(--radius-full)',
                                border: '1px solid var(--outline-variant)',
                                fontSize: '0.6875rem', fontWeight: 700,
                                color: 'var(--primary)', background: 'color-mix(in srgb, var(--primary) 6%, transparent)',
                                transition: 'all 0.15s'
                              }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>alt_route</span>
                                Map
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Quick actions + open requests */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Quick actions */}
                <div className="card" style={{ padding: '1.25rem' }}>
                  <h4 style={{ marginBottom: '1rem' }}>Quick Actions</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[
                      { icon: 'fastfood',   label: 'Browse Available Donations', path: '/ngo/donations', color: 'var(--primary)',      bg: 'rgba(13,99,27,0.08)' },
                      { icon: 'add_circle', label: 'Raise Food Request',          path: '/ngo/requests',  color: 'var(--admin-accent)', bg: 'rgba(21,101,192,0.08)' },
                      { icon: 'task_alt',   label: 'View Accepted Donations',     path: '/ngo/accepted',  color: '#2E7D32',             bg: 'rgba(46,125,50,0.08)' },
                    ].map(a => (
                      <button key={a.path} onClick={() => navigate(a.path)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: a.bg, border: `1px solid color-mix(in srgb, ${a.color} 20%, transparent)`, cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(0.95)')}
                        onMouseLeave={e => (e.currentTarget.style.filter = 'none')}>
                        <span className="material-symbols-outlined icon-filled" style={{ fontSize: 20, color: a.color }}>{a.icon}</span>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: a.color }}>{a.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Open food requests */}
                <div className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
                    <h4 style={{ margin: 0 }}>My Open Requests</h4>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: openReq.length > 0 ? 'var(--admin-accent)' : 'var(--on-surface-variant)' }}>{openReq.length} open</span>
                  </div>
                  {openReq.length === 0 ? (
                    <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', textAlign: 'center', padding: '0.5rem 0' }}>No open requests</p>
                  ) : openReq.slice(0, 3).map((r: any) => (
                    <div key={r._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--surface-container)' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{r.food_type_needed}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{r.quantity_needed} {r.unit}</div>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  ))}
                  {openReq.length > 0 && (
                    <button onClick={() => navigate('/ngo/requests')} className="btn btn-ghost btn-sm btn-full" style={{ marginTop: '0.75rem', border: '1px solid var(--outline-variant)' }}>
                      Manage Requests →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
