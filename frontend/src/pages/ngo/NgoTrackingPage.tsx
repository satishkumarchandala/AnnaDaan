import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/components/shared/Sidebar'
import { StatusBadge, LoadingSpinner, EmptyState } from '@/components/shared/UiKit'
import { RouteNavigationMap } from '@/components/shared/RouteNavigationMap'
import api from '@/api/client'


const ngoNav = [
  { icon: 'dashboard', label: 'Dashboard', path: '/ngo' },
  { icon: 'fastfood', label: 'Available Donations', path: '/ngo/donations' },
  { icon: 'pending_actions', label: 'My Requests', path: '/ngo/requests' },
  { icon: 'task_alt', label: 'Accepted', path: '/ngo/accepted' },
  { icon: 'local_shipping', label: 'Tracking', path: '/ngo/tracking' },
]

const STAGE_STEPS = [
  { key: 'pending',    label: 'Submitted',   icon: 'volunteer_activism', color: '#0d631b' },
  { key: 'matched',   label: 'Matched',      icon: 'handshake',          color: '#1565C0' },
  { key: 'in_transit',label: 'In Transit',   icon: 'local_shipping',     color: '#9e4200' },
  { key: 'delivered', label: 'Delivered',    icon: 'check_circle',       color: '#2E7D32' },
]

const STATUS_ORDER: Record<string, number> = { pending: 0, matched: 1, in_transit: 2, delivered: 3 }

export const NgoTrackingPage: React.FC = () => {
  const navigate = useNavigate()
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any | null>(null)
  const [trackData, setTrackData] = useState<any | null>(null)
  const [trackLoading, setTrackLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [marking, setMarking] = useState(false)
  const [justDelivered, setJustDelivered] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    api.get('/ngo/deliveries')
      .then(r => {
        const active = r.data.filter((d: any) => d.status !== 'delivered')
        setDeliveries(r.data)
        if (active.length > 0 && !selected) setSelected(active[0])
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
    } catch {
      setTrackData(null)
    } finally {
      setTrackLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!selected?.donation_id) return
    setJustDelivered(false)
    fetchTracking(selected.donation_id)
    pollRef.current = setInterval(() => fetchTracking(selected.donation_id), 8000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [selected?.donation_id, fetchTracking])

  const confirmDelivery = async () => {
    if (!selected?._id) return
    setMarking(true)
    try {
      await api.post(`/deliveries/${selected._id}/deliver`)
      // Update local delivery list
      setDeliveries(prev => prev.map(d =>
        d._id === selected._id ? { ...d, status: 'delivered', delivered_at: new Date().toISOString() } : d
      ))
      setSelected((prev: any) => prev ? { ...prev, status: 'delivered', delivered_at: new Date().toISOString() } : prev)
      // Force refresh tracking data
      await fetchTracking(selected.donation_id)
      setJustDelivered(true)
      setShowConfirm(false)
      // stop polling
      if (pollRef.current) clearInterval(pollRef.current)
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to confirm delivery')
    } finally {
      setMarking(false)
    }
  }

  const activeStep = trackData ? STATUS_ORDER[trackData.status] ?? 0 : 0
  const progressPct = Math.round(((activeStep + 1) / 4) * 100)

  return (
    <div className="app-layout">
      {/* Confirm delivery dialog */}
      {showConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: 420, width: '100%', padding: '2rem', borderTop: '4px solid #2E7D32' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', margin: '0 auto 0.75rem',
                background: 'linear-gradient(135deg, rgba(46,125,50,0.15), rgba(102,187,106,0.2))',
                border: '2px solid rgba(46,125,50,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <span className="material-symbols-outlined icon-filled" style={{ fontSize: 32, color: '#2E7D32' }}>verified</span>
              </div>
              <h3 style={{ margin: '0 0 0.375rem', fontFamily: 'var(--font-headline)', fontSize: '1.125rem' }}>Confirm Food Received</h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
                Confirm you have physically received the food donation from <strong>{selected?.donor_name || 'the donor'}</strong>.
                The donor and FSSAI will be notified immediately.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.625rem' }}>
              <button onClick={() => setShowConfirm(false)} disabled={marking}
                className="btn btn-ghost" style={{ flex: 1, border: '1px solid var(--outline-variant)' }}>Cancel</button>
              <button onClick={confirmDelivery} disabled={marking}
                className="btn" id="confirm-delivered-tracking-btn"
                style={{ flex: 2, background: 'linear-gradient(135deg, #2E7D32, #388E3C)', color: 'white',
                  fontWeight: 700, gap: '0.5rem', border: 'none', boxShadow: '0 4px 16px rgba(46,125,50,0.35)' }}>
                <span className="material-symbols-outlined icon-filled" style={{ fontSize: 18 }}>
                  {marking ? 'hourglass_empty' : 'check_circle'}
                </span>
                {marking ? 'Confirming…' : 'Yes, Food Received!'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Sidebar navItems={ngoNav} ctaLabel="⬆ Raise Request" ctaAction={() => navigate('/ngo/requests')} footerItems={[{ icon: 'settings', label: 'Settings', path: '/ngo/settings' }]} />
      <main className="main-content">
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ marginBottom: '0.25rem' }}>Live Tracking</h2>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem' }}>Monitor active donation deliveries in real time</p>
        </div>

        {loading ? <LoadingSpinner /> : deliveries.length === 0 ? (
          <EmptyState icon="local_shipping" title="No active deliveries" description="You haven't accepted any donations yet. Browse and accept a donation to track it here." action={
            <button className="btn btn-primary" onClick={() => navigate('/ngo/donations')}>Browse Donations</button>
          } />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.25rem', alignItems: 'start' }}>
            {/* Delivery list sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)', padding: '0 0.25rem', marginBottom: '0.25rem' }}>
                Your Deliveries
              </div>
              {deliveries.map(d => {
                const isActive = selected?._id === d._id
                const isInTransit = d.status === 'in_transit'
                return (
                  <div key={d._id} onClick={() => setSelected(d)} className="card"
                    style={{ padding: '0.875rem 1rem', cursor: 'pointer', borderLeft: `3px solid ${isActive ? 'var(--primary)' : 'transparent'}`, background: isActive ? 'color-mix(in srgb, var(--primary) 5%, white)' : undefined, transition: 'all 0.15s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{d.donor_name || 'Unknown'}</span>
                      {isInTransit && <span className="live-dot" />}
                    </div>
                    <StatusBadge status={d.status} />
                    {d.created_at && (
                      <div style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)', marginTop: '0.375rem' }}>
                        {new Date(d.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Tracking panel */}
            <div>
              {!selected ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 48, display: 'block', marginBottom: '0.75rem', color: 'var(--outline-variant)' }}>local_shipping</span>
                  <p>Select a delivery on the left to view its tracking details</p>
                </div>
              ) : trackLoading && !trackData ? (
                <LoadingSpinner />
              ) : trackData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Delivered celebration banner */}
                  {justDelivered && (
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(46,125,50,0.12), rgba(102,187,106,0.08))',
                      border: '1px solid rgba(46,125,50,0.3)', borderRadius: 'var(--radius-md)',
                      padding: '1rem 1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'center',
                      marginBottom: '0.25rem'
                    }}>
                      <span className="material-symbols-outlined icon-filled" style={{ fontSize: 28, color: '#2E7D32', flexShrink: 0 }}>celebration</span>
                      <div>
                        <div style={{ fontWeight: 700, color: '#2E7D32', fontSize: '0.9375rem', marginBottom: '0.125rem' }}>Food Delivered & Confirmed! 🎉</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>The donor and FSSAI have been notified. Delivery chain of custody recorded.</div>
                      </div>
                    </div>
                  )}

                  {/* Progress */}
                  <div className="card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <h4 style={{ margin: 0 }}>Delivery Progress</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        {trackData.status === 'in_transit' && <span className="live-dot" />}
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)' }}>{progressPct}%</span>
                      </div>
                    </div>
                    <div style={{ height: 8, background: 'var(--surface-container-high)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: '1rem' }}>
                      <div style={{ height: '100%', width: `${progressPct}%`, background: trackData.status === 'delivered' ? 'linear-gradient(90deg,#2E7D32,#66BB6A)' : 'linear-gradient(90deg,var(--primary),#9e4200)', borderRadius: 'var(--radius-full)', transition: 'width 0.8s ease', boxShadow: '0 0 8px rgba(13,99,27,0.3)' }} />
                    </div>
                    {/* Steps */}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      {STAGE_STEPS.map((stage, i) => {
                        const done   = i < activeStep
                        const active = i === activeStep
                        return (
                          <div key={stage.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? stage.color : active ? `color-mix(in srgb, ${stage.color} 15%, transparent)` : 'var(--surface-container-high)', border: active ? `2px solid ${stage.color}` : done ? `2px solid ${stage.color}` : '2px solid var(--outline-variant)', boxShadow: active ? `0 0 0 4px color-mix(in srgb, ${stage.color} 15%, transparent)` : 'none', transition: 'all 0.4s' }}>
                              {done ? (
                                <span className="material-symbols-outlined icon-filled" style={{ fontSize: 16, color: 'white' }}>check</span>
                              ) : (
                                <span className={`material-symbols-outlined ${active ? 'icon-filled' : ''}`} style={{ fontSize: 16, color: active ? stage.color : 'var(--outline-variant)' }}>{stage.icon}</span>
                              )}
                            </div>
                            <span style={{ fontSize: '0.625rem', fontWeight: active ? 700 : 500, color: active ? stage.color : done ? 'var(--on-surface)' : 'var(--outline-variant)', textAlign: 'center' }}>{stage.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Info row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="card" style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#0d631b', marginBottom: '0.5rem' }}>Donor</div>
                      <div style={{ fontWeight: 600 }}>{trackData.donor?.name || '—'}</div>
                      {trackData.donor?.address && <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginTop: 2 }}>{trackData.donor.address}</div>}
                    </div>
                    <div className="card" style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#1565C0', marginBottom: '0.5rem' }}>Donation</div>
                      <div style={{ fontWeight: 600 }}>{trackData.donation?.food_name || '—'}</div>
                      {trackData.donation && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginTop: 2 }}>{trackData.donation.quantity} {trackData.donation.unit}</div>}
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="card" style={{ padding: '1.25rem' }}>
                    <h4 style={{ marginBottom: '1rem' }}>Timeline</h4>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {(trackData.timeline || []).map((stage: any, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: stage.completed ? 'var(--primary)' : 'var(--surface-container-high)', border: `2px solid ${stage.completed ? 'var(--primary)' : 'var(--outline-variant)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {stage.completed
                                ? <span className="material-symbols-outlined icon-filled" style={{ fontSize: 13, color: 'white' }}>check</span>
                                : <span className="material-symbols-outlined" style={{ fontSize: 13, color: 'var(--outline-variant)' }}>{stage.icon}</span>}
                            </div>
                            {i < (trackData.timeline.length - 1) && <div style={{ width: 2, height: 32, background: stage.completed ? 'var(--primary)' : 'var(--surface-container-high)' }} />}
                          </div>
                          <div style={{ paddingBottom: i < trackData.timeline.length - 1 ? '0.25rem' : 0, paddingTop: '0.125rem' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: stage.completed ? 'var(--on-surface)' : 'var(--outline)' }}>{stage.label}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: 1 }}>{stage.description}</div>
                            {stage.timestamp && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--outline)', marginTop: 2 }}>{new Date(stage.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Route Navigation Map ── */}
                  {(() => {
                    const routeData = trackData.delivery?.route_data
                    const donorCoords = trackData.donor_coordinates ||
                      (routeData?.donor_location) ||
                      { lat: 28.6139, lng: 77.2090 }
                    const ngoCoords = trackData.ngo_coordinates ||
                      (routeData?.ngo_location) ||
                      null
                    if (!ngoCoords) return null
                    return (
                      <RouteNavigationMap
                        donorLocation={donorCoords}
                        ngoLocation={ngoCoords}
                        donorName={trackData.donation?.donor_name || selected?.donor_name || 'Donor'}
                        ngoName={selected?.ngo_name || 'NGO'}
                        foodName={trackData.donation?.food_name}
                        estimatedMinutes={trackData.delivery?.estimated_time}
                        distanceKm={routeData?.distance_km}
                        status={trackData.status}
                        height={380}
                      />
                    )
                  })()}

                  {/* Confirm delivery action — only shown when in_transit */}
                  {trackData.status === 'in_transit' && (
                    <div className="card" style={{
                      padding: '1.25rem', background: 'linear-gradient(135deg, rgba(46,125,50,0.05), rgba(102,187,106,0.03))',
                      border: '1px solid rgba(46,125,50,0.2)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#2E7D32', marginBottom: '0.25rem' }}>
                            Have you received the food?
                          </div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                            Click below once the food is physically at your NGO.
                          </div>
                        </div>
                        <button
                          id="tracking-food-received-btn"
                          onClick={() => setShowConfirm(true)}
                          className="btn"
                          style={{
                            background: 'linear-gradient(135deg, #2E7D32, #388E3C)',
                            color: 'white', fontWeight: 700, gap: '0.625rem',
                            border: 'none', boxShadow: '0 4px 18px rgba(46,125,50,0.4)',
                            padding: '0.625rem 1.375rem', borderRadius: 'var(--radius-md)',
                            fontSize: '0.9375rem', flexShrink: 0
                          }}
                        >
                          <span className="material-symbols-outlined icon-filled" style={{ fontSize: 20 }}>inventory_2</span>
                          Food Received at NGO
                        </button>
                      </div>
                    </div>
                  )}

                  <div style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {trackData.status === 'in_transit' ? 'Auto-refreshes every 8s' : 'Delivery complete'}
                  </div>
                </div>
              ) : (
                <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                  <p>Could not load tracking data. The donation may not have a delivery record yet.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
