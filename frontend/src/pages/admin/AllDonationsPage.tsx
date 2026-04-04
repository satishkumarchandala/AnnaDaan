import React, { useState, useEffect } from 'react'
import { Sidebar } from '@/components/shared/Sidebar'
import { StatusBadge, LoadingSpinner, EmptyState } from '@/components/shared/UiKit'
import { DonationTrackingPanel } from '@/components/admin/DonationTrackingPanel'
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

export const AllDonationsPage: React.FC = () => {
  const [donations, setDonations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  // Tracking panel state
  const [trackingId, setTrackingId] = useState<string | null>(null)
  const [trackingLabel, setTrackingLabel] = useState<string>('')

  useEffect(() => {
    setLoading(true)
    api.get(`/admin/donations?page=${page}&per_page=15&status=${statusFilter}&search=${search}`)
      .then(r => { setDonations(r.data.donations); setTotal(r.data.total) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page, statusFilter, search])

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setSearch(searchInput); setPage(1) }

  const openTracking = (d: any) => {
    setTrackingId(d._id)
    setTrackingLabel(`${d.food_name} — ${d.quantity} ${d.unit} (${d.donor_name || 'Unknown'})`)
  }

  return (
    <div className="app-layout">
      <Sidebar navItems={adminNav} />
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ marginBottom: '0.25rem' }}>All Donations</h2>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem' }}>{total} total donations across the platform</p>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ border: '1px solid var(--outline-variant)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span> Export CSV
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: 200 }}>
            <div className="input-with-icon" style={{ flex: 1 }}>
              <span className="material-symbols-outlined input-icon">search</span>
              <input className="form-input" placeholder="Search donations or donors..." value={searchInput} onChange={e => setSearchInput(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary btn-sm">Search</button>
          </form>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {['', 'pending', 'matched', 'in_transit', 'delivered', 'expired'].map(s => (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }} style={{ padding: '0.375rem 0.75rem', borderRadius: 'var(--radius-full)', border: `1px solid ${statusFilter === s ? 'var(--primary)' : 'var(--outline-variant)'}`, background: statusFilter === s ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'white', color: statusFilter === s ? 'var(--primary)' : 'var(--on-surface-variant)', fontSize: '0.8125rem', fontWeight: statusFilter === s ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>
                {s === '' ? 'All' : s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? <LoadingSpinner /> : donations.length === 0 ? (
          <EmptyState icon="volunteer_activism" title="No donations found" description="Try adjusting your filters or search query." />
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Donor</th>
                    <th>Food</th>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Submitted</th>
                    <th>Urgency</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {donations.map(d => (
                    <tr key={d._id}>
                      <td>{d.donor_name || '—'}</td>
                      <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 400 }}>{d.food_name}</td>
                      <td style={{ color: 'var(--on-surface-variant)', fontWeight: 400 }}>{d.food_type?.replace('_', ' ')}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 400 }}>{d.quantity} {d.unit}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--on-surface-variant)', fontWeight: 400 }}>
                        {new Date(d.submitted_at).toLocaleDateString('en-IN', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <div style={{ width: 32, height: 4, borderRadius: 'var(--radius-full)', background: 'var(--surface-container-high)', overflow: 'hidden' }}>
                            <div style={{ width: `${d.urgency_score || 0}%`, height: '100%', background: (d.urgency_score || 0) > 70 ? 'var(--error)' : (d.urgency_score || 0) > 40 ? 'var(--secondary)' : 'var(--primary)', borderRadius: 'var(--radius-full)', transition: 'width 0.5s' }} />
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{d.urgency_score || 0}</span>
                        </div>
                      </td>
                      <td><StatusBadge status={d.status} /></td>
                      <td>
                        {/* ── Track Action Button ── */}
                        <button
                          id={`track-btn-${d._id}`}
                          onClick={() => openTracking(d)}
                          className="btn btn-sm"
                          title="Track Donation"
                          style={{
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.75rem',
                            background: 'linear-gradient(135deg, rgba(13,99,27,0.08), rgba(21,101,192,0.08))',
                            border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)',
                            color: 'var(--primary)',
                            borderRadius: 'var(--radius-md)',
                            gap: '0.35rem',
                            fontWeight: 600,
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => {
                            const el = e.currentTarget
                            el.style.background = 'linear-gradient(135deg, rgba(13,99,27,0.15), rgba(21,101,192,0.15))'
                            el.style.transform = 'translateY(-1px)'
                            el.style.boxShadow = '0 4px 12px rgba(13,99,27,0.15)'
                          }}
                          onMouseLeave={e => {
                            const el = e.currentTarget
                            el.style.background = 'linear-gradient(135deg, rgba(13,99,27,0.08), rgba(21,101,192,0.08))'
                            el.style.transform = 'none'
                            el.style.boxShadow = 'none'
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>my_location</span>
                          Track
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
            Showing {Math.min((page - 1) * 15 + 1, total)}–{Math.min(page * 15, total)} of {total}
          </span>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <button className="btn btn-ghost btn-sm" disabled={page * 15 >= total} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </div>
      </main>

      {/* ── Tracking Panel (slide-in drawer) ── */}
      {trackingId && (
        <DonationTrackingPanel
          donationId={trackingId}
          donationLabel={trackingLabel}
          onClose={() => setTrackingId(null)}
        />
      )}
    </div>
  )
}
