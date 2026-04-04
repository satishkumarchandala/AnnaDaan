import React, { useState, useEffect } from 'react'
import { Sidebar } from '@/components/shared/Sidebar'
import { StatusBadge, LoadingSpinner, EmptyState } from '@/components/shared/UiKit'
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

const STATUS_COLORS: Record<string, string> = {
  verified: '#2E7D32',
  pending: '#9e4200',
  suspended: '#ba1a1a',
}

export const AdminDonorsPage: React.FC = () => {
  const [donors, setDonors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [selected, setSelected] = useState<any | null>(null)

  const load = () => {
    setLoading(true)
    api.get('/admin/users?role=donor')
      .then(r => setDonors(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = donors.filter(d =>
    !search ||
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.email?.toLowerCase().includes(search.toLowerCase())
  )

  const updateStatus = async (uid: string, status: string) => {
    setUpdating(uid)
    try {
      await api.patch(`/admin/users/${uid}/status`, { status })
      setDonors(prev => prev.map(d => d._id === uid ? { ...d, status } : d))
      if (selected?._id === uid) setSelected((s: any) => ({ ...s, status }))
    } catch (e) { console.error(e) }
    finally { setUpdating(null) }
  }

  return (
    <div className="app-layout">
      <Sidebar navItems={adminNav} />
      <main className="main-content">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ marginBottom: '0.25rem' }}>Donor Registry</h2>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem' }}>
              {donors.length} registered donors on the platform
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)' }} className="animate-pulse" />
            <span style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              {donors.filter(d => d.status === 'verified').length} VERIFIED
            </span>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total', value: donors.length, color: 'var(--primary)', icon: 'people' },
            { label: 'Verified', value: donors.filter(d => d.status === 'verified').length, color: '#2E7D32', icon: 'verified' },
            { label: 'Pending', value: donors.filter(d => d.status === 'pending').length, color: '#9e4200', icon: 'pending' },
            { label: 'Suspended', value: donors.filter(d => d.status === 'suspended').length, color: '#ba1a1a', icon: 'block' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: `color-mix(in srgb, ${s.color} 12%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: s.color }}>{s.icon}</span>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.25rem' }}>{s.value}</div>
                <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--on-surface-variant)' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ marginBottom: '1rem' }}>
          <form onSubmit={e => { e.preventDefault(); setSearch(searchInput) }} style={{ display: 'flex', gap: '0.5rem', maxWidth: 400 }}>
            <div className="input-with-icon" style={{ flex: 1 }}>
              <span className="material-symbols-outlined input-icon">search</span>
              <input className="form-input" placeholder="Search donors by name or email…" value={searchInput} onChange={e => setSearchInput(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary btn-sm">Search</button>
            {search && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setSearchInput('') }}>Clear</button>}
          </form>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 340px' : '1fr', gap: '1.25rem', alignItems: 'start' }}>
          {/* Table */}
          {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
            <EmptyState icon="person_off" title="No donors found" description="Try a different search term." />
          ) : (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Joined</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(d => (
                      <tr key={d._id} style={{ cursor: 'pointer', background: selected?._id === d._id ? 'color-mix(in srgb, var(--primary) 5%, transparent)' : undefined }} onClick={() => setSelected(selected?._id === d._id ? null : d)}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: `color-mix(in srgb, var(--primary) 15%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)' }}>{d.name?.[0]?.toUpperCase() || '?'}</span>
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{d.name || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 400, color: 'var(--on-surface-variant)', fontSize: '0.875rem' }}>{d.email}</td>
                        <td style={{ fontWeight: 400, fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{d.phone || '—'}</td>
                        <td style={{ fontWeight: 400, fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                          {d.created_at ? new Date(d.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                        </td>
                        <td><StatusBadge status={d.status || 'pending'} /></td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '0.375rem' }}>
                            {d.status !== 'verified' && (
                              <button
                                className="btn btn-sm"
                                disabled={updating === d._id}
                                onClick={() => updateStatus(d._id, 'verified')}
                                style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem', background: 'rgba(46,125,50,0.1)', color: '#2E7D32', border: '1px solid rgba(46,125,50,0.25)', borderRadius: 'var(--radius-md)' }}
                              >
                                {updating === d._id ? '…' : 'Verify'}
                              </button>
                            )}
                            {d.status !== 'suspended' && (
                              <button
                                className="btn btn-sm"
                                disabled={updating === d._id}
                                onClick={() => updateStatus(d._id, 'suspended')}
                                style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem', background: 'rgba(186,26,26,0.1)', color: 'var(--error)', border: '1px solid rgba(186,26,26,0.25)', borderRadius: 'var(--radius-md)' }}
                              >
                                Suspend
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Detail panel */}
          {selected && (
            <div className="card fade-in" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0 }}>Donor Profile</h4>
                <button className="btn btn-ghost btn-sm" style={{ padding: '0.25rem' }} onClick={() => setSelected(null)}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.25rem', gap: '0.5rem' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'color-mix(in srgb, var(--primary) 15%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{selected.name?.[0]?.toUpperCase() || '?'}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '1rem', textAlign: 'center' }}>{selected.name}</div>
                <StatusBadge status={selected.status || 'pending'} />
              </div>
              {[
                { icon: 'mail', label: 'Email', value: selected.email },
                { icon: 'phone', label: 'Phone', value: selected.phone || 'Not provided' },
                { icon: 'calendar_today', label: 'Joined', value: selected.created_at ? new Date(selected.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0', borderBottom: '1px solid var(--surface-container)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--on-surface-variant)' }}>{row.icon}</span>
                  <div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)' }}>{row.label}</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{row.value}</div>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                {selected.status !== 'verified' && (
                  <button className="btn btn-sm btn-full" disabled={updating === selected._id} onClick={() => updateStatus(selected._id, 'verified')}
                    style={{ background: 'rgba(46,125,50,0.12)', color: '#2E7D32', border: '1px solid rgba(46,125,50,0.3)' }}>
                    ✓ Verify Donor
                  </button>
                )}
                {selected.status !== 'suspended' && (
                  <button className="btn btn-sm btn-full btn-danger" disabled={updating === selected._id} onClick={() => updateStatus(selected._id, 'suspended')}>
                    Suspend
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
