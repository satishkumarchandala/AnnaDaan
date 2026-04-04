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

export const AdminNgosPage: React.FC = () => {
  const [ngos, setNgos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [selected, setSelected] = useState<any | null>(null)

  useEffect(() => {
    setLoading(true)
    api.get('/admin/users?role=ngo')
      .then(r => setNgos(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = ngos.filter(n =>
    !search ||
    n.name?.toLowerCase().includes(search.toLowerCase()) ||
    n.email?.toLowerCase().includes(search.toLowerCase())
  )

  const updateStatus = async (uid: string, status: string) => {
    setUpdating(uid)
    try {
      await api.patch(`/admin/users/${uid}/status`, { status })
      setNgos(prev => prev.map(n => n._id === uid ? { ...n, status } : n))
      if (selected?._id === uid) setSelected((s: any) => ({ ...s, status }))
    } catch (e) { console.error(e) }
    finally { setUpdating(null) }
  }

  return (
    <div className="app-layout">
      <Sidebar navItems={adminNav} />
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ marginBottom: '0.25rem' }}>NGO Partner Network</h2>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem' }}>
              {ngos.length} registered NGOs on the platform
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--admin-accent)' }}>
              {ngos.filter(n => n.status === 'verified').length} ACTIVE
            </span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total NGOs', value: ngos.length, color: 'var(--admin-accent)', icon: 'corporate_fare' },
            { label: 'Verified', value: ngos.filter(n => n.status === 'verified').length, color: '#2E7D32', icon: 'verified' },
            { label: 'Pending Review', value: ngos.filter(n => n.status === 'pending').length, color: '#9e4200', icon: 'hourglass_empty' },
            { label: 'Suspended', value: ngos.filter(n => n.status === 'suspended').length, color: '#ba1a1a', icon: 'block' },
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
              <input className="form-input" placeholder="Search NGOs by name or email…" value={searchInput} onChange={e => setSearchInput(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary btn-sm">Search</button>
            {search && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setSearchInput('') }}>Clear</button>}
          </form>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 340px' : '1fr', gap: '1.25rem', alignItems: 'start' }}>
          {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
            <EmptyState icon="group_off" title="No NGOs found" description="No NGOs match your search." />
          ) : (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Organization</th>
                      <th>Contact</th>
                      <th>Email</th>
                      <th>Joined</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(n => (
                      <tr key={n._id} style={{ cursor: 'pointer', background: selected?._id === n._id ? 'color-mix(in srgb, var(--admin-accent) 5%, transparent)' : undefined }} onClick={() => setSelected(selected?._id === n._id ? null : n)}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                            <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--admin-accent) 12%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--admin-accent)' }}>{n.name?.[0]?.toUpperCase() || 'N'}</span>
                            </div>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{n.name || '—'}</div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 400, fontSize: '0.875rem' }}>{n.name}</td>
                        <td style={{ fontWeight: 400, color: 'var(--on-surface-variant)', fontSize: '0.875rem' }}>{n.email}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--on-surface-variant)', fontWeight: 400 }}>
                          {n.created_at ? new Date(n.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                        </td>
                        <td><StatusBadge status={n.status || 'pending'} /></td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '0.375rem' }}>
                            {n.status !== 'verified' && (
                              <button className="btn btn-sm" disabled={updating === n._id} onClick={() => updateStatus(n._id, 'verified')}
                                style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem', background: 'rgba(46,125,50,0.1)', color: '#2E7D32', border: '1px solid rgba(46,125,50,0.25)', borderRadius: 'var(--radius-md)' }}>
                                {updating === n._id ? '…' : 'Verify'}
                              </button>
                            )}
                            {n.status !== 'suspended' && (
                              <button className="btn btn-sm" disabled={updating === n._id} onClick={() => updateStatus(n._id, 'suspended')}
                                style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem', background: 'rgba(186,26,26,0.1)', color: 'var(--error)', border: '1px solid rgba(186,26,26,0.25)', borderRadius: 'var(--radius-md)' }}>
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

          {/* Detail Panel */}
          {selected && (
            <div className="card fade-in" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0 }}>NGO Profile</h4>
                <button className="btn btn-ghost btn-sm" style={{ padding: '0.25rem' }} onClick={() => setSelected(null)}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.25rem', gap: '0.5rem' }}>
                <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-lg)', background: 'color-mix(in srgb, var(--admin-accent) 12%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined icon-filled" style={{ fontSize: 30, color: 'var(--admin-accent)' }}>corporate_fare</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '1rem', textAlign: 'center' }}>{selected.name}</div>
                <StatusBadge status={selected.status || 'pending'} />
              </div>
              {[
                { icon: 'mail', label: 'Email', value: selected.email },
                { icon: 'phone', label: 'Phone', value: selected.phone || 'Not provided' },
                { icon: 'calendar_today', label: 'Registered', value: selected.created_at ? new Date(selected.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—' },
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
                    ✓ Approve NGO
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
