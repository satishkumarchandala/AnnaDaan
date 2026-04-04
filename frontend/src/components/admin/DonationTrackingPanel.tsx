import React, { useState, useEffect, useRef, useCallback } from 'react'
import api from '@/api/client'

/* ─── Types ──────────────────────────────────────────────────── */
interface TimelineStage {
  stage: string
  label: string
  description: string
  completed: boolean
  timestamp: string | null
  icon: string
}

interface TrackingData {
  donation: any
  delivery: any | null
  ngo: any | null
  donor: any
  timeline: TimelineStage[]
  route_data: any
  agent_logs: any[]
  status: string
  live_location?: { lat: number; lng: number; updated_at: string } | null
}

interface Props {
  donationId: string
  donationLabel: string
  onClose: () => void
}

/* ─── Stage Config ───────────────────────────────────────────── */
const STAGE_CONFIG = [
  {
    key: 'donation_sent',
    label: 'Donation Sent',
    icon: 'volunteer_activism',
    color: '#0d631b',
    bgColor: 'rgba(13,99,27,0.12)',
  },
  {
    key: 'matched',
    label: 'NGO Accepted',
    icon: 'handshake',
    color: '#1565C0',
    bgColor: 'rgba(21,101,192,0.12)',
  },
  {
    key: 'picked_up',
    label: 'Picked Up',
    icon: 'local_shipping',
    color: '#9e4200',
    bgColor: 'rgba(158,66,0,0.12)',
  },
  {
    key: 'in_transit',
    label: 'In Transit',
    icon: 'directions_car',
    color: '#6A1B9A',
    bgColor: 'rgba(106,27,154,0.12)',
  },
  {
    key: 'delivered',
    label: 'Delivered',
    icon: 'check_circle',
    color: '#2E7D32',
    bgColor: 'rgba(46,125,50,0.12)',
  },
]

/* ─── Derive current step index from API timeline ────────────── */
function resolveActiveStep(timeline: TimelineStage[], status: string): number {
  if (status === 'delivered') return 4
  if (status === 'in_transit') return 3
  // check picked_up by index 2 in timeline
  if (timeline[2]?.completed) return 2
  if (status === 'matched') return 1
  return 0
}

/* ─── Mini Map Component ─────────────────────────────────────── */
const MiniMap: React.FC<{
  donor: any
  ngo: any
  agentLoc: { lat: number; lng: number } | null
  status: string
}> = ({ donor, ngo, agentLoc, status }) => {
  // Positions on a 600x320 canvas (relative % approximation of India map)
  const toXY = (lat: number, lng: number) => ({
    x: ((lng - 68) / (98 - 68)) * 100,
    y: ((38 - lat) / (38 - 8)) * 100,
  })

  const donorCoord = donor?.coordinates || { lat: 19.076, lng: 72.877 }
  const ngoCoord = ngo?.coordinates || { lat: 18.52, lng: 73.856 }
  const agentCoord = agentLoc || (status === 'in_transit' ? { lat: 18.8, lng: 73.36 } : null)

  const dp = toXY(donorCoord.lat, donorCoord.lng)
  const np = toXY(ngoCoord.lat, ngoCoord.lng)
  const ap = agentCoord ? toXY(agentCoord.lat, agentCoord.lng) : null

  return (
    <div style={{ position: 'relative', width: '100%', height: 260, borderRadius: 'var(--radius-xl)', overflow: 'hidden', background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 40%, #dcedc8 100%)' }}>
      {/* Grid overlay */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(13,99,27,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(13,99,27,0.05) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

      {/* SVG route line */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Donor → Agent */}
        {ap && (
          <line
            x1={dp.x} y1={dp.y}
            x2={ap.x} y2={ap.y}
            stroke="#0d631b" strokeWidth="0.6" strokeDasharray="2,1.5"
            opacity="0.7"
          />
        )}
        {/* Agent → NGO */}
        {ap && (
          <line
            x1={ap.x} y1={ap.y}
            x2={np.x} y2={np.y}
            stroke="#1565C0" strokeWidth="0.6" strokeDasharray="2,1.5"
            opacity="0.5"
          />
        )}
        {/* Donor → NGO direct (when no agent) */}
        {!ap && (
          <line
            x1={dp.x} y1={dp.y}
            x2={np.x} y2={np.y}
            stroke="#0d631b" strokeWidth="0.6" strokeDasharray="2,1.5"
            opacity="0.5"
          />
        )}
      </svg>

      {/* Donor pin */}
      <div style={{ position: 'absolute', left: `${dp.x}%`, top: `${dp.y}%`, transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, zIndex: 3 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0d631b', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
          <span className="material-symbols-outlined icon-filled" style={{ fontSize: 13, color: 'white' }}>home</span>
        </div>
        <span style={{ background: 'rgba(255,255,255,0.92)', fontSize: '0.5rem', fontWeight: 700, padding: '1px 4px', borderRadius: 4, color: '#0d631b', whiteSpace: 'nowrap' }}>DONOR</span>
      </div>

      {/* NGO pin */}
      <div style={{ position: 'absolute', left: `${np.x}%`, top: `${np.y}%`, transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, zIndex: 3 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1565C0', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
          <span className="material-symbols-outlined icon-filled" style={{ fontSize: 13, color: 'white' }}>groups</span>
        </div>
        <span style={{ background: 'rgba(255,255,255,0.92)', fontSize: '0.5rem', fontWeight: 700, padding: '1px 4px', borderRadius: 4, color: '#1565C0', whiteSpace: 'nowrap' }}>NGO</span>
      </div>

      {/* Agent pin (animated) */}
      {ap && (
        <div style={{ position: 'absolute', left: `${ap.x}%`, top: `${ap.y}%`, transform: 'translate(-50%, -50%)', zIndex: 5 }}>
          <div style={{ position: 'relative' }}>
            <div className="tracking-pulse-ring" />
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#9e4200', border: '2.5px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 12px rgba(158,66,0,0.4)', position: 'relative', zIndex: 2 }}>
              <span className="material-symbols-outlined icon-filled" style={{ fontSize: 14, color: 'white' }}>local_shipping</span>
            </div>
          </div>
          <span style={{ display: 'block', background: '#9e4200', color: 'white', fontSize: '0.475rem', fontWeight: 700, padding: '1px 5px', borderRadius: 4, marginTop: 2, whiteSpace: 'nowrap', textAlign: 'center' }}>AGENT</span>
        </div>
      )}

      {/* Live badge */}
      <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', padding: '4px 10px', borderRadius: 'var(--radius-full)', border: '1px solid rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: 5, zIndex: 10 }}>
        <span className="live-dot" />
        <span style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.06em', color: '#0d631b' }}>LIVE TRACKING</span>
      </div>

      {/* ETA badge */}
      {status === 'in_transit' && (
        <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(21,101,192,0.9)', backdropFilter: 'blur(8px)', padding: '5px 12px', borderRadius: 'var(--radius-full)', zIndex: 10 }}>
          <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'white', letterSpacing: '0.04em' }}>ETA ~18 min</span>
        </div>
      )}
    </div>
  )
}

/* ─── Main Component ─────────────────────────────────────────── */
export const DonationTrackingPanel: React.FC<Props> = ({ donationId, donationLabel, onClose }) => {
  const [data, setData] = useState<TrackingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [pulse, setPulse] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchTracking = useCallback(async () => {
    try {
      const res = await api.get(`/admin/donations/${donationId}/tracking`)
      setData(res.data)
      setLastUpdated(new Date())
      setPulse(true)
      setTimeout(() => setPulse(false), 600)
      setError(null)
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load tracking data')
    } finally {
      setLoading(false)
    }
  }, [donationId])

  useEffect(() => {
    fetchTracking()
    pollRef.current = setInterval(fetchTracking, 6000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [fetchTracking])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const activeStep = data ? resolveActiveStep(data.timeline, data.status) : 0
  const progressPct = data ? Math.round(((activeStep + 1) / STAGE_CONFIG.length) * 100) : 0

  return (
    <>
      {/* Backdrop */}
      <div className="overlay-backdrop" onClick={onClose} />

      {/* Panel */}
      <div className="tracking-panel fade-in" role="dialog" aria-label="Donation Tracking">
        {/* ── Header ── */}
        <div className="tracking-panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--primary) 12%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined icon-filled" style={{ fontSize: 20, color: 'var(--primary)' }}>local_shipping</span>
            </div>
            <div>
              <h4 style={{ margin: 0, fontFamily: 'var(--font-headline)', fontSize: '1rem' }}>Real-Time Tracker</h4>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--on-surface-variant)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{donationLabel}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            {/* Live indicator */}
            <div className={`tracking-live-badge ${pulse ? 'tracking-pulse-flash' : ''}`}>
              <span className="live-dot" />
              <span>LIVE</span>
            </div>
            <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '0.375rem', borderRadius: 'var(--radius-md)' }} aria-label="Close">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="tracking-panel-body">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '1rem', padding: '3rem' }}>
              <div style={{ width: 40, height: 40, border: '3px solid var(--surface-container-high)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} className="animate-spin" />
              <span style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>Loading tracking data…</span>
            </div>
          ) : error ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--error)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40, display: 'block', marginBottom: '0.75rem' }}>error</span>
              <p>{error}</p>
            </div>
          ) : data ? (
            <>
              {/* ── Overall Progress Bar ── */}
              <div className="tracking-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--on-surface-variant)' }}>Delivery Progress</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)' }}>{progressPct}%</span>
                </div>
                <div style={{ height: 8, background: 'var(--surface-container-high)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${progressPct}%`,
                      borderRadius: 'var(--radius-full)',
                      background: data.status === 'delivered'
                        ? 'linear-gradient(90deg, #2E7D32, #66BB6A)'
                        : data.status === 'in_transit'
                        ? 'linear-gradient(90deg, #0d631b, #9e4200)'
                        : 'linear-gradient(90deg, var(--primary), var(--primary-container))',
                      transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 0 8px rgba(13,99,27,0.3)',
                    }}
                  />
                </div>

                {/* Step labels row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                  {STAGE_CONFIG.map((stage, i) => (
                    <div key={stage.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: 1 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: i <= activeStep ? stage.color : 'var(--surface-container-high)',
                        border: i === activeStep ? `2px solid ${stage.color}` : 'none',
                        boxShadow: i === activeStep ? `0 0 0 3px ${stage.bgColor}` : 'none',
                        transition: 'all 0.4s ease',
                      }} />
                      <span style={{ fontSize: '0.5rem', fontWeight: i === activeStep ? 700 : 500, color: i <= activeStep ? stage.color : 'var(--outline-variant)', textAlign: 'center', lineHeight: 1.2 }}>
                        {stage.label.split(' ').map((w, j) => <span key={j} style={{ display: 'block' }}>{w}</span>)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Timeline ── */}
              <div className="tracking-section" style={{ paddingBottom: 0 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '1rem' }}>Lifecycle Timeline</span>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {STAGE_CONFIG.map((stage, i) => {
                    const isActive = i === activeStep
                    const isDone = i < activeStep
                    const isPending = i > activeStep
                    const apiStage = data.timeline[i >= 3 ? i - 1 : i] // map our 5-stage to 4-stage API response

                    return (
                      <div key={stage.key} style={{ display: 'flex', gap: '0.875rem', position: 'relative' }}>
                        {/* Line */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                          {/* Circle */}
                          <div style={{
                            width: 36, height: 36,
                            borderRadius: '50%',
                            background: isDone ? stage.color : isActive ? stage.bgColor : 'var(--surface-container-high)',
                            border: isActive ? `2px solid ${stage.color}` : isDone ? `2px solid ${stage.color}` : '2px solid var(--outline-variant)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: isActive ? `0 0 0 4px ${stage.bgColor}` : isDone ? `0 2px 8px ${stage.bgColor}` : 'none',
                            transition: 'all 0.4s ease',
                            position: 'relative', zIndex: 2,
                          }}>
                            {isDone ? (
                              <span className="material-symbols-outlined icon-filled" style={{ fontSize: 16, color: 'white' }}>check</span>
                            ) : (
                              <span className={`material-symbols-outlined ${isActive ? 'icon-filled' : ''}`} style={{ fontSize: 16, color: isActive ? stage.color : 'var(--outline-variant)' }}>
                                {stage.icon}
                              </span>
                            )}
                            {isActive && <div className="tracking-active-pulse" style={{ '--pulse-color': stage.color } as any} />}
                          </div>
                          {/* Connector line */}
                          {i < STAGE_CONFIG.length - 1 && (
                            <div style={{
                              width: 2, height: 40,
                              background: isDone ? `linear-gradient(180deg, ${stage.color}, ${STAGE_CONFIG[i + 1].color})` : 'var(--surface-container-high)',
                              borderRadius: 2,
                              transition: 'background 0.4s ease',
                              flexShrink: 0,
                            }} />
                          )}
                        </div>

                        {/* Content */}
                        <div style={{ paddingBottom: i < STAGE_CONFIG.length - 1 ? '0.5rem' : 0, paddingTop: '0.25rem', flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.2rem' }}>
                            <span style={{
                              fontFamily: 'var(--font-headline)',
                              fontWeight: isActive ? 700 : isDone ? 600 : 500,
                              fontSize: '0.875rem',
                              color: isPending ? 'var(--outline)' : isActive ? stage.color : 'var(--on-surface)',
                            }}>{stage.label}</span>
                            {apiStage?.timestamp && (
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--on-surface-variant)', flexShrink: 0, marginLeft: 8 }}>
                                {new Date(apiStage.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: '0.78rem', color: isPending ? 'var(--outline-variant)' : 'var(--on-surface-variant)', margin: 0, lineHeight: 1.4 }}>
                            {isPending ? 'Awaiting previous step…' : apiStage?.description || stage.label}
                          </p>
                          {isActive && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: '0.375rem', background: stage.bgColor, padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: stage.color, animation: 'pulse 1.5s infinite' }} />
                              <span style={{ fontSize: '0.625rem', fontWeight: 700, color: stage.color, letterSpacing: '0.04em' }}>IN PROGRESS</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* ── Map ── */}
              <div className="tracking-section">
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.75rem' }}>Route Map</span>
                <MiniMap
                  donor={data.donor}
                  ngo={data.ngo}
                  agentLoc={data.live_location || null}
                  status={data.status}
                />
              </div>

              {/* ── Entities ── */}
              <div className="tracking-section">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {/* Donor card */}
                  <div className="tracking-entity-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'rgba(13,99,27,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-symbols-outlined icon-filled" style={{ fontSize: 14, color: '#0d631b' }}>person</span>
                      </div>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0d631b' }}>Donor</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.2rem' }}>{data.donor?.name || '—'}</div>
                    {data.donor?.organization && <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{data.donor.organization}</div>}
                    {data.donor?.address && <div style={{ fontSize: '0.7rem', color: 'var(--outline)', marginTop: 2 }}>{data.donor.address}</div>}
                  </div>

                  {/* NGO card */}
                  <div className="tracking-entity-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'rgba(21,101,192,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-symbols-outlined icon-filled" style={{ fontSize: 14, color: '#1565C0' }}>groups</span>
                      </div>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1565C0' }}>NGO</span>
                    </div>
                    {data.ngo ? (
                      <>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.2rem' }}>{data.ngo.name}</div>
                        {data.ngo.organization && <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{data.ngo.organization}</div>}
                        {data.ngo.phone && <div style={{ fontSize: '0.7rem', color: 'var(--outline)', marginTop: 2 }}>{data.ngo.phone}</div>}
                      </>
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: 'var(--outline-variant)', fontStyle: 'italic' }}>Matching in progress…</div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Donation Details ── */}
              <div className="tracking-section">
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.75rem' }}>Donation Details</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {[
                    { label: 'Food', value: data.donation?.food_name || '—', icon: 'restaurant' },
                    { label: 'Quantity', value: `${data.donation?.quantity || 0} ${data.donation?.unit || ''}`, icon: 'scale' },
                    { label: 'Urgency', value: data.donation?.urgency_score || 0, icon: 'speed' },
                  ].map(item => (
                    <div key={item.label} style={{ background: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', padding: '0.75rem', textAlign: 'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--primary)', display: 'block', marginBottom: 4 }}>{item.icon}</span>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', fontFamily: 'var(--font-headline)' }}>{item.value}</div>
                      <div style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)', marginTop: 2 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── AI Agent Logs ── */}
              {data.agent_logs?.length > 0 && (
                <div className="tracking-section" style={{ paddingBottom: '1.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.75rem' }}>AI Agent Activity</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {data.agent_logs.slice(-4).map((log: any, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start', padding: '0.625rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginTop: 5 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--admin-accent)', background: 'rgba(21,101,192,0.1)', padding: '1px 6px', borderRadius: 4 }}>{log.agent_name}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--outline)' }}>
                              {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', margin: 0, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {log.output_summary}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* ── Footer ── */}
        {data && (
          <div className="tracking-panel-footer">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--on-surface-variant)' }}>sync</span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}>
                Updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · Auto-refresh every 6s
              </span>
            </div>
            <button
              onClick={fetchTracking}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>refresh</span>
              Refresh
            </button>
          </div>
        )}
      </div>
    </>
  )
}
