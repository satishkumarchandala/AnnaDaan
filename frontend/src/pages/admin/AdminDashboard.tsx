import React, { useState, useEffect } from 'react'
import { Sidebar } from '@/components/shared/Sidebar'
import { StatCard, StatusBadge, AgentBadge, LoadingSpinner, EmptyState } from '@/components/shared/UiKit'
import { IndiaHeatMap } from '@/components/admin/IndiaHeatMap'
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

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null)
  const [donations, setDonations] = useState<any[]>([])
  const [urgentRequests, setUrgentRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dispatching, setDispatching] = useState(false)
  const [dispatchResult, setDispatchResult] = useState<{ success: boolean; message: string; dispatched?: number; failed?: number } | null>(null)

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/donations?per_page=5'),
      api.get('/admin/ngo-requests?status=open')
    ]).then(([s, d, r]) => {
      setStats(s.data)
      setDonations(d.data.donations)
      setUrgentRequests(r.data.slice(0, 3))
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const dispatchAll = async () => {
    setDispatching(true)
    setDispatchResult(null)
    try {
      const res = await api.post('/admin/dispatch-all')
      setDispatchResult({
        success: true,
        message: res.data.message,
        dispatched: res.data.dispatched,
        failed: res.data.failed,
      })
    } catch (e: any) {
      setDispatchResult({
        success: false,
        message: e?.response?.data?.error || 'Dispatch failed. Please try again.',
      })
    } finally {
      setDispatching(false)
      // auto-clear toast after 7s
      setTimeout(() => setDispatchResult(null), 7000)
    }
  }

  return (
    <div className="app-layout">
      <Sidebar navItems={adminNav} footerItems={[{ icon: 'settings', label: 'Settings', path: '/admin/settings' }]} />
      <main className="main-content">
        {/* Header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ marginBottom: '0.375rem' }}>Operational Dashboard</h2>
            <p style={{ color: 'var(--on-surface-variant)' }}>Real-time surveillance of national food redistribution networks and safety compliance.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>Compliance Level</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontFamily: 'var(--font-mono)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', display: 'inline-block' }} className="animate-pulse" />
                98.2% SECURE
              </div>
            </div>
          </div>
        </header>

        {loading ? <LoadingSpinner /> : (
          <>
            {/* Stats Bento Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div className="stat-card card" style={{ backgroundColor: 'var(--surface-container-lowest)' }}>
                <div className="stat-label">Daily Vol.</div>
                <div className="stat-value">{stats?.today_donations?.toLocaleString('en-IN') || 0}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>+12.5% ↑</div>
              </div>
              <div className="stat-card card">
                <div className="stat-label">Weekly Vol.</div>
                <div className="stat-value">{stats?.week_donations?.toLocaleString('en-IN') || 0}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>+4.2% ↑</div>
              </div>
              <div className="stat-card card">
                <div className="stat-label">Monthly Vol.</div>
                <div className="stat-value">{stats?.month_donations?.toLocaleString('en-IN') || 0}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--secondary)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>New</div>
              </div>
              <div className="stat-card card">
                <div className="stat-label">Saved (KG)</div>
                <div className="stat-value">{(stats?.total_kg_redistributed / 1000)?.toFixed(1) || 0}k</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>OPTIMAL</div>
              </div>
              <div className="stat-card card">
                <div className="stat-label">Active Donors</div>
                <div className="stat-value">{stats?.total_donors?.toLocaleString('en-IN') || 0}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>VERIFIED</div>
              </div>
              <div className="stat-card card">
                <div className="stat-label">Partner NGOs</div>
                <div className="stat-value">{stats?.total_ngos?.toLocaleString('en-IN') || 0}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>ONBOARDED</div>
              </div>
            </div>

            {/* Map Section — Real Leaflet Heatmap */}
            <div className="card" style={{ marginBottom: '2rem', overflow: 'hidden', borderRadius: 'var(--radius-3xl)' }}>
              <IndiaHeatMap stats={stats} />
            </div>

            {/* Tables */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
              {/* Recent Donations Table */}
              <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4>Recent Donations</h4>
                  <a href="/admin/donations" style={{ color: 'var(--admin-accent)', fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none' }}>View Ledger →</a>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Donor</th>
                        <th>Type</th>
                        <th>Qty</th>
                        <th>NGO Assigned</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {donations.map(d => (
                        <tr key={d._id}>
                          <td>{d.donor_name || 'Unknown'}</td>
                          <td style={{ color: 'var(--on-surface-variant)', fontWeight: 400 }}>{d.food_type?.replace('_', ' ')}</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{d.quantity} {d.unit}</td>
                          <td style={{ color: 'var(--on-surface-variant)', fontWeight: 400 }}>{d.matched_ngo_id ? 'Assigned' : '—'}</td>
                          <td><StatusBadge status={d.status} /></td>
                        </tr>
                      ))}
                      {donations.length === 0 && (
                        <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--on-surface-variant)' }}>No donations yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Urgent Requests */}
              <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4>Urgent Requests</h4>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--error)' }} className="animate-pulse" />
                </div>
                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {urgentRequests.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--on-surface-variant)' }}>No urgent requests</div>
                  ) : urgentRequests.map((req, i) => {
                    const styles = [
                      { border: 'var(--error)', bg: 'color-mix(in srgb, var(--error) 8%, transparent)', pill: { bg: 'var(--error)', text: 'white', label: 'Immediate' } },
                      { border: 'var(--secondary-container)', bg: 'color-mix(in srgb, var(--secondary-container) 8%, transparent)', pill: { bg: 'var(--secondary-container)', text: 'var(--on-secondary-container)', label: 'Scheduled' } },
                      { border: 'var(--admin-accent)', bg: 'color-mix(in srgb, var(--admin-accent) 8%, transparent)', pill: { bg: 'var(--admin-accent)', text: 'white', label: 'Standard' } },
                    ][i] || { border: 'var(--outline)', bg: 'transparent', pill: { bg: 'var(--outline)', text: 'white', label: req.urgency } }
                    return (
                      <div key={req._id} style={{ padding: '0.875rem', background: styles.bg, borderRadius: 'var(--radius-md)', borderLeft: `4px solid ${styles.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ padding: '0.125rem 0.5rem', background: styles.pill.bg, color: styles.pill.text, borderRadius: 4, fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{styles.pill.label}</span>
                          <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--on-surface-variant)' }}>
                            {new Date(req.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>{req.ngo_name}</div>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', lineHeight: 1.4 }}>
                          Required: {req.food_type_needed} — {req.quantity_needed} {req.unit}
                        </p>
                      </div>
                    )
                  })}
                  <button
                    id="dispatch-all-btn"
                    onClick={dispatchAll}
                    disabled={dispatching}
                    className="btn btn-ghost btn-full"
                    style={{ marginTop: '0.5rem', border: '1px solid var(--surface-container-high)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: dispatching ? 0.8 : 1 }}
                  >
                    {dispatching ? (
                      <>
                        <span style={{ width: 14, height: 14, border: '2px solid #999', borderTopColor: 'var(--primary)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                        Dispatching…
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>rocket_launch</span>
                        Dispatch All Logistics
                      </>
                    )}
                  </button>
                  {/* Result toast */}
                  {dispatchResult && (
                    <div style={{
                      marginTop: '0.625rem', padding: '0.75rem 0.875rem',
                      borderRadius: 'var(--radius-md)',
                      background: dispatchResult.success ? 'rgba(46,125,50,0.1)' : 'rgba(198,40,40,0.1)',
                      border: `1px solid ${dispatchResult.success ? 'rgba(46,125,50,0.3)' : 'rgba(198,40,40,0.3)'}`,
                      fontSize: '0.8rem', lineHeight: 1.45
                    }}>
                      <div style={{ fontWeight: 700, color: dispatchResult.success ? '#2E7D32' : '#C62828', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span className="material-symbols-outlined icon-filled" style={{ fontSize: 14 }}>{dispatchResult.success ? 'check_circle' : 'error'}</span>
                        {dispatchResult.success ? 'Dispatch Complete' : 'Dispatch Failed'}
                      </div>
                      <div style={{ color: 'var(--on-surface-variant)' }}>{dispatchResult.message}</div>
                      {dispatchResult.dispatched !== undefined && (
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', marginTop: 4, color: 'var(--on-surface-variant)', display: 'flex', gap: 10 }}>
                          <span style={{ color: '#2E7D32', fontWeight: 700 }}>✓ {dispatchResult.dispatched} matched</span>
                          {(dispatchResult.failed ?? 0) > 0 && <span style={{ color: '#9e4200', fontWeight: 700 }}>✗ {dispatchResult.failed} unmatched</span>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <nav className="mobile-nav">
        {adminNav.slice(0, 4).map(item => (
          <a key={item.path} href={item.path} className={`mobile-nav-item ${window.location.pathname === item.path ? 'active' : ''}`}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{item.icon}</span>
            <span>{item.label}</span>
          </a>
        ))}
      </nav>
    </div>
  )
}
