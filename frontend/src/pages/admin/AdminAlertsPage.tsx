import React, { useState, useEffect } from 'react'
import { Sidebar } from '@/components/shared/Sidebar'
import { LoadingSpinner, EmptyState } from '@/components/shared/UiKit'
import api from '@/api/client'

const adminNav = [
  { icon: 'dashboard', label: 'Overview', path: '/admin' },
  { icon: 'volunteer_activism', label: 'All Donations', path: '/admin/donations' },
  { icon: 'person', label: 'Donors', path: '/admin/donors' },
  { icon: 'groups', label: 'NGOs', path: '/admin/ngos' },
  { icon: 'restaurant', label: 'Food Requests', path: '/admin/requests' },
  { icon: 'terminal', label: 'AI Logs', path: '/admin/logs' },
  { icon: 'warning', label: 'Alerts', path: '/admin/alerts' },
]

export const AdminAlertsPage: React.FC = () => {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.get('/admin/alerts')
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    const iv = setInterval(load, 30000)
    return () => clearInterval(iv)
  }, [])

  const urgentCount  = data?.urgent_no_taker?.length || 0
  const flaggedCount = data?.flagged_safety?.length || 0
  const lowCount     = data?.low_acceptance_ngos?.length || 0
  const totalAlerts  = urgentCount + flaggedCount + lowCount

  return (
    <div className="app-layout">
      <Sidebar navItems={adminNav} />
      <main className="main-content">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <h2 style={{ margin: 0 }}>System Alerts</h2>
              {totalAlerts > 0 && (
                <span style={{ background: 'var(--error)', color: 'white', borderRadius: 'var(--radius-full)', padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)', animation: 'pulse 2s infinite' }}>
                  {totalAlerts} ACTIVE
                </span>
              )}
            </div>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem' }}>
              Real-time FSSAI compliance &amp; operational alerts — auto-refreshes every 30s
            </p>
          </div>
          <button onClick={load} className="btn btn-ghost btn-sm" style={{ border: '1px solid var(--outline-variant)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span> Refresh
          </button>
        </div>

        {/* Summary bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.75rem' }}>
          {[
            { label: 'Near-Expiry / No Taker', value: urgentCount, color: 'var(--error)', icon: 'alarm', desc: 'Expiring < 2h' },
            { label: 'Safety Flagged', value: flaggedCount, color: '#9e4200', icon: 'report', desc: 'FSSAI safety risk' },
            { label: 'Low-Acceptance NGOs', value: lowCount, color: 'var(--admin-accent)', icon: 'trending_down', desc: '< 40% accept rate' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '1rem', borderLeft: `4px solid ${s.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: `color-mix(in srgb, ${s.color} 12%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: s.color }}>{s.icon}</span>
                </div>
                {s.value > 0 && <span className="live-dot" />}
              </div>
              <div style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.5rem', color: s.value > 0 ? s.color : 'var(--on-surface)' }}>{s.value}</div>
              <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{s.label}</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)' }}>{s.desc}</div>
            </div>
          ))}
        </div>

        {loading ? <LoadingSpinner /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* ── Near-Expiry / No Taker ── */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.875rem' }}>
                <span className="material-symbols-outlined icon-filled" style={{ fontSize: 20, color: 'var(--error)' }}>alarm</span>
                <h4 style={{ margin: 0, color: 'var(--error)' }}>Near-Expiry — No Taker</h4>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--error)', background: 'rgba(186,26,26,0.1)', padding: '1px 8px', borderRadius: 'var(--radius-full)' }}>{urgentCount}</span>
              </div>
              {urgentCount === 0 ? (
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--primary)' }}>
                  <span className="material-symbols-outlined icon-filled" style={{ fontSize: 36, display: 'block', marginBottom: '0.5rem' }}>check_circle</span>
                  <p style={{ margin: 0, fontWeight: 600 }}>All donations have NGOs assigned ✓</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {data.urgent_no_taker.map((d: any) => (
                    <div key={d._id} className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid var(--error)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>{d.food_name}</div>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>Donor: {d.donor_name || '—'}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{d.quantity} {d.unit}</span>
                          {d.expiry_timestamp && (
                            <span style={{ fontSize: '0.8125rem', color: 'var(--error)', fontWeight: 600 }}>
                              Expires: {new Date(d.expiry_timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                        <span style={{ padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'rgba(186,26,26,0.1)', color: 'var(--error)', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' }}>
                          Urgency {d.urgency_score || '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Safety Flagged ── */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.875rem' }}>
                <span className="material-symbols-outlined icon-filled" style={{ fontSize: 20, color: '#9e4200' }}>report</span>
                <h4 style={{ margin: 0, color: '#9e4200' }}>FSSAI Safety Flags</h4>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: '#9e4200', background: 'rgba(158,66,0,0.1)', padding: '1px 8px', borderRadius: 'var(--radius-full)' }}>{flaggedCount}</span>
              </div>
              {flaggedCount === 0 ? (
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--primary)' }}>
                  <span className="material-symbols-outlined icon-filled" style={{ fontSize: 36, display: 'block', marginBottom: '0.5rem' }}>verified_user</span>
                  <p style={{ margin: 0, fontWeight: 600 }}>No safety violations detected ✓</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {data.flagged_safety.map((d: any) => (
                    <div key={d._id} className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #9e4200' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>{d.food_name}</div>
                          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>Donor: {d.donor_name || '—'}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{d.quantity} {d.unit}</span>
                          </div>
                          {d.safety_message && (
                            <p style={{ fontSize: '0.8125rem', color: '#9e4200', marginTop: '0.375rem', fontWeight: 500 }}>⚠ {d.safety_message}</p>
                          )}
                        </div>
                        <span style={{ padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'rgba(158,66,0,0.1)', color: '#9e4200', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', flexShrink: 0 }}>FLAGGED</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Low Acceptance NGOs ── */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.875rem' }}>
                <span className="material-symbols-outlined icon-filled" style={{ fontSize: 20, color: 'var(--admin-accent)' }}>trending_down</span>
                <h4 style={{ margin: 0, color: 'var(--admin-accent)' }}>Low-Acceptance NGOs</h4>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--admin-accent)', background: 'rgba(21,101,192,0.1)', padding: '1px 8px', borderRadius: 'var(--radius-full)' }}>{lowCount}</span>
              </div>
              {lowCount === 0 ? (
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--primary)' }}>
                  <span className="material-symbols-outlined icon-filled" style={{ fontSize: 36, display: 'block', marginBottom: '0.5rem' }}>groups</span>
                  <p style={{ margin: 0, fontWeight: 600 }}>All NGOs maintaining healthy acceptance rates ✓</p>
                </div>
              ) : (
                <div className="card" style={{ overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>NGO</th>
                          <th>Accepted</th>
                          <th>Declined</th>
                          <th>Accept Rate</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.low_acceptance_ngos.map((n: any) => {
                          const total = (n.accepted_count || 0) + (n.declined_count || 0)
                          const rate = total > 0 ? Math.round((n.accepted_count / total) * 100) : 0
                          return (
                            <tr key={n._id}>
                              <td style={{ fontWeight: 600 }}>{n.user_id || '—'}</td>
                              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 400, color: '#2E7D32' }}>{n.accepted_count || 0}</td>
                              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 400, color: 'var(--error)' }}>{n.declined_count || 0}</td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <div style={{ flex: 1, height: 6, background: 'var(--surface-container-high)', borderRadius: 'var(--radius-full)', overflow: 'hidden', maxWidth: 80 }}>
                                    <div style={{ width: `${rate}%`, height: '100%', background: rate < 30 ? 'var(--error)' : 'var(--admin-accent)', borderRadius: 'var(--radius-full)' }} />
                                  </div>
                                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: 700, color: rate < 30 ? 'var(--error)' : 'var(--admin-accent)' }}>{rate}%</span>
                                </div>
                              </td>
                              <td>
                                <span style={{ padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'rgba(21,101,192,0.1)', color: 'var(--admin-accent)', fontSize: '0.6875rem', fontWeight: 700, cursor: 'default' }}>
                                  REVIEW
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>

            {totalAlerts === 0 && !loading && (
              <EmptyState icon="check_circle" title="All Systems Normal" description="No active alerts. The platform is running smoothly." />
            )}
          </div>
        )}
      </main>
    </div>
  )
}
